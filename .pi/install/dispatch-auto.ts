/**
 * Dispatch Auto-Orchestrator
 *
 * When Main writes a fresh worker-addressed message into the active dispatch
 * channel, this extension automatically runs Plan/Dev/Review as `pi --print`
 * (or `claude -p`) subprocesses, sequentially, until the chain reaches a
 * terminal state (channel state = closed, OR latest message addressed to Main).
 *
 * Opt-in: presence of `agents/orchestration.json` in cwd enables the extension.
 * Otherwise it's dormant. Safe to install globally.
 *
 * Within-cycle context (e.g., Dev's fix turn after Review) is preserved via
 * Pi's --resume <session-id>. Session IDs are persisted per-channel-per-role
 * under `agents/channels/.sessions/`. A new channel means new session IDs,
 * which gives the "fresh between dispatches" property automatically.
 *
 * Recursion guard: subprocesses are spawned with DISPATCH_AUTO_SUBPROCESS=1,
 * which makes this extension dormant in the child. --print mode is also a no-op.
 */

import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

const STOP_ROLE = "Main";
const TERMINAL_STATES = new Set(["closed"]);
const CHANNEL_GLOB_DEFAULT = "agents/channels/*-channel.md";
const PICKUP_PREFIX = "pickup ";
const DEFAULT_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes per role turn (override via env / config)

interface RoleOverride {
	binary?: string;        // default: "pi"
	configDir?: string;     // e.g., "~/.claude-acct1" for claude roles
	extraArgs?: string[];   // appended to the launch command before the prompt
	timeoutMinutes?: number; // per-role override of subprocess wall-clock timeout
}

interface OrchestrationConfig {
	channelGlob?: string;
	timeoutMinutes?: number; // root-level override of default subprocess timeout
	roles?: Record<string, RoleOverride>;
}

interface ParsedMessage {
	number: number;
	from: string;
	to: string;
	state: string;
}

interface ParsedChannel {
	filePath: string;
	status: string;
	lastMessage: ParsedMessage | null;
}

function expandHome(p: string): string {
	if (p.startsWith("~/")) return path.join(process.env.HOME ?? "", p.slice(2));
	return p;
}

function normalizeKey(p: string): string {
	const r = path.resolve(p);
	return process.platform === "win32" ? r.toLowerCase() : r;
}

function resolveTimeoutMs(role: string, cfg: OrchestrationConfig): number {
	const envVal = process.env.DISPATCH_AUTO_TIMEOUT_MS;
	if (envVal && Number.isFinite(parseInt(envVal, 10))) return parseInt(envVal, 10);
	const roleMin = cfg.roles?.[role]?.timeoutMinutes;
	if (typeof roleMin === "number" && Number.isFinite(roleMin)) return roleMin * 60 * 1000;
	if (typeof cfg.timeoutMinutes === "number" && Number.isFinite(cfg.timeoutMinutes)) return cfg.timeoutMinutes * 60 * 1000;
	return DEFAULT_TIMEOUT_MS;
}

function psEscape(s: string): string {
	// In a PowerShell double-quoted string, the escape character is the backtick.
	// Order matters: escape backtick first so we don't double-escape the ones we add.
	return s.replace(/`/g, "``").replace(/"/g, '`"').replace(/\$/g, "`$");
}

function isSubprocess(): boolean {
	return process.env.DISPATCH_AUTO_SUBPROCESS === "1";
}

function isPrintMode(): boolean {
	const argv = process.argv ?? [];
	return argv.some((a) => a === "--print" || a === "-p");
}

function loadConfig(cwd: string): OrchestrationConfig | null {
	const configPath = path.join(cwd, "agents", "orchestration.json");
	if (!fs.existsSync(configPath)) return null;
	try {
		return JSON.parse(fs.readFileSync(configPath, "utf8"));
	} catch {
		return null;
	}
}

function listChannels(cwd: string, glob: string): string[] {
	// Minimal glob: supports "<dir>/<prefix>*<suffix>" with prefix possibly empty.
	const m = glob.match(/^(.+)\/([^/]*)\*([^/]+)$/);
	if (!m) return [];
	const [, dir, prefix, suffix] = m;
	const fullDir = path.join(cwd, dir);
	if (!fs.existsSync(fullDir)) return [];
	return fs.readdirSync(fullDir)
		.filter((f) => f.startsWith(prefix) && f.endsWith(suffix))
		.map((f) => path.join(fullDir, f));
}

function findLatestChannel(cwd: string, glob: string): string | null {
	const files = listChannels(cwd, glob);
	if (files.length === 0) return null;
	return files
		.map((f) => ({ f, mtime: fs.statSync(f).mtimeMs }))
		.sort((a, b) => b.mtime - a.mtime)[0].f;
}

function stripFencedBlocks(text: string): string {
	// Replace fenced code blocks (``` ... ```) with blank lines of the same length
	// so heading regex doesn't match inline example messages. Preserves line offsets.
	return text.replace(/```[\s\S]*?```/g, (block) => block.replace(/[^\n]/g, " "));
}

function parseChannel(filePath: string): ParsedChannel | null {
	let raw: string;
	try {
		raw = fs.readFileSync(filePath, "utf8");
	} catch {
		return null;
	}
	const text = stripFencedBlocks(raw);

	const statusMatch = text.match(/^\s*-\s*Current status:\s*([^\n]+?)\s*$/im);
	const status = statusMatch ? statusMatch[1].trim().toLowerCase() : "";

	// Find all message headings. Em dash or hyphen tolerated.
	const headingRe = /^##\s+Message\s+(\d+)\s+[—-]\s+(\w+)\s+[→]\s+(\w+)\s+[—-]\s+([^\n]+)$/gm;
	const headings: { idx: number; number: number; from: string; to: string }[] = [];
	let m: RegExpExecArray | null;
	while ((m = headingRe.exec(text))) {
		headings.push({
			idx: m.index,
			number: parseInt(m[1], 10),
			from: m[2],
			to: m[3],
		});
	}
	if (headings.length === 0) return { filePath, status, lastMessage: null };

	headings.sort((a, b) => a.number - b.number);
	const last = headings[headings.length - 1];
	const nextHeading = headings.find((h) => h.idx > last.idx);
	const block = text.slice(last.idx, nextHeading ? nextHeading.idx : text.length);

	const stateMatch = block.match(/###\s+State\s*\n\s*([^\n]+)/i);
	const state = stateMatch ? stateMatch[1].trim().toLowerCase() : "";

	return {
		filePath,
		status,
		lastMessage: { number: last.number, from: last.from, to: last.to, state },
	};
}

function isTerminal(channel: ParsedChannel): boolean {
	if (TERMINAL_STATES.has(channel.status)) return true;
	if (!channel.lastMessage) return false;
	if (channel.lastMessage.to === STOP_ROLE) return true;
	return false;
}

function sessionDirFor(cwd: string, channelFile: string, role: string): string {
	const base = path.basename(channelFile, ".md");
	const dir = path.join(cwd, "agents", "channels", ".sessions", `${base}-${role}`);
	fs.mkdirSync(dir, { recursive: true });
	return dir;
}

function logEvent(cwd: string, line: string): void {
	const stamp = new Date().toISOString();
	try {
		fs.appendFileSync(path.join(cwd, ".dispatch-auto.log"), `${stamp}  ${line}\n`);
	} catch {}
}

function notify(title: string, body: string): void {
	if (process.platform === "darwin") {
		spawn("osascript", ["-e", `display notification "${body.replace(/"/g, '\\"')}" with title "${title.replace(/"/g, '\\"')}"`], { stdio: "ignore", detached: true }).unref();
	} else if (process.platform === "win32") {
		const t = psEscape(title);
		const b = psEscape(body);
		const ps = `[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType=WindowsRuntime] > $null; $t = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02); ($t.SelectSingleNode("//text[@id='1']")).InnerText = "${t}"; ($t.SelectSingleNode("//text[@id='2']")).InnerText = "${b}"; [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier("dispatch-auto").Show([Windows.UI.Notifications.ToastNotification]::new($t))`;
		spawn("powershell", ["-NoProfile", "-Command", ps], { stdio: "ignore", detached: true }).unref();
	}
}

interface LaunchPlan {
	cmd: string;
	args: string[];
	env: NodeJS.ProcessEnv;
	claudeUuidPath?: string;  // present iff binary === "claude"; set so callers can invalidate on resume failure
	resumedClaude?: boolean;  // true when we passed --resume to claude (vs. --session-id)
}

function buildLaunchCommand(role: string, cfg: OrchestrationConfig, channelRel: string, sessionDir: string): LaunchPlan {
	const override = cfg.roles?.[role] ?? {};
	const binary = override.binary ?? "pi";
	const env: NodeJS.ProcessEnv = { ...process.env, DISPATCH_AUTO_SUBPROCESS: "1" };
	if (override.configDir) {
		if (binary === "claude") env.CLAUDE_CONFIG_DIR = expandHome(override.configDir);
		if (binary === "pi") env.PI_CODING_AGENT_DIR = expandHome(override.configDir);
	}

	// [dispatch-auto] prefix marks this prompt as orchestrator-invoked. Workers
	// resolve their active role from the channel's To field only when this tag
	// is present; user-interactive pickup (no tag) defaults to Main. See
	// agents/workflows/dispatch-channel-protocol.md for the role-resolution rules.
	const prompt = `[dispatch-auto] ${PICKUP_PREFIX}${channelRel}`;
	const args: string[] = ["--print"];
	const plan: LaunchPlan = { cmd: binary, args, env };

	// Within-cycle session continuity. Both binaries get isolation per (channel, role):
	//   pi → --session-dir <dir> --continue   (Pi handles create-or-resume internally)
	//   claude → --session-id <uuid> on first call; --resume <uuid> thereafter.
	// Between dispatches, channel name changes → sessionDir changes → fresh session.
	if (binary === "pi") {
		args.push("--session-dir", sessionDir, "--continue");
	} else if (binary === "claude") {
		// Non-interactive worker: there's no human to approve a Bash prompt,
		// so any Read/Edit/Bash gate would silently stall the turn (claude exits
		// 0 after asking for approval). Workers run under the trust model of the
		// dispatch (orchestrator-spawned, on a prompt the user already approved).
		// Users can override via roles.<Role>.extraArgs if they want stricter.
		args.push("--permission-mode", "bypassPermissions");
		const uuidPath = path.join(sessionDir, "claude-session.uuid");
		plan.claudeUuidPath = uuidPath;
		if (fs.existsSync(uuidPath)) {
			const uuid = fs.readFileSync(uuidPath, "utf8").trim();
			args.push("--resume", uuid);
			plan.resumedClaude = true;
		} else {
			const uuid = randomUUID();
			fs.writeFileSync(uuidPath, uuid);
			args.push("--session-id", uuid);
		}
	}

	if (override.extraArgs) args.push(...override.extraArgs);
	args.push(prompt);
	return plan;
}

async function spawnOnce(cwd: string, role: string, plan: LaunchPlan, timeoutMs: number): Promise<{ exitCode: number; stderrTail: string }> {
	const { cmd, args, env } = plan;
	return new Promise((resolve) => {
		const logStream = fs.createWriteStream(path.join(cwd, ".dispatch-auto.log"), { flags: "a" });
		const child = spawn(cmd, args, { cwd, env, stdio: ["ignore", "pipe", "pipe"] });
		const timeout = setTimeout(() => {
			logEvent(cwd, `timeout role=${role} after ${timeoutMs}ms — killing`);
			child.kill("SIGTERM");
		}, timeoutMs);

		let stderrTail = "";
		child.stdout.on("data", (chunk) => logStream.write(`[${role}/stdout] ${chunk}`));
		child.stderr.on("data", (chunk) => {
			logStream.write(`[${role}/stderr] ${chunk}`);
			stderrTail = (stderrTail + chunk.toString()).slice(-2048);
		});

		child.on("close", (code) => {
			clearTimeout(timeout);
			logStream.end();
			logEvent(cwd, `exit role=${role} code=${code ?? "null"}`);
			resolve({ exitCode: code ?? -1, stderrTail });
		});
		child.on("error", (err) => {
			clearTimeout(timeout);
			logStream.end();
			logEvent(cwd, `spawn-error role=${role} err=${err.message}`);
			resolve({ exitCode: -1, stderrTail });
		});
	});
}

async function runRoleTurn(cwd: string, role: string, cfg: OrchestrationConfig, channelFile: string): Promise<{ exitCode: number }> {
	const channelRel = path.relative(cwd, channelFile);
	const sessionDir = sessionDirFor(cwd, channelFile, role);
	const plan = buildLaunchCommand(role, cfg, channelRel, sessionDir);
	const timeoutMs = resolveTimeoutMs(role, cfg);
	// For Claude, buildLaunchCommand writes the UUID file before we read the dir,
	// so directory-emptiness isn't a reliable signal. Use plan.resumedClaude instead.
	const resumed = plan.cmd === "claude"
		? !!plan.resumedClaude
		: fs.readdirSync(sessionDir).length > 0;
	logEvent(cwd, `spawn role=${role} binary=${plan.cmd} resume=${resumed ? "yes" : "fresh"} timeoutMs=${timeoutMs} channel=${path.basename(channelFile)}`);

	const first = await spawnOnce(cwd, role, plan, timeoutMs);

	// Claude resume-failure recovery: if --resume <uuid> hit a session-not-found error
	// (most often: user wiped ~/.claude or the session store rotated), drop the stale
	// UUID file and retry once with --session-id + a fresh UUID. We only do this when
	// resume is the failure mode; a real worker failure should propagate.
	if (
		first.exitCode !== 0 &&
		plan.resumedClaude &&
		plan.claudeUuidPath &&
		/No conversation found with session ID/i.test(first.stderrTail)
	) {
		logEvent(cwd, `claude resume failed for role=${role} — wiping uuid file and retrying with fresh session`);
		try { fs.unlinkSync(plan.claudeUuidPath); } catch {}
		const fresh = buildLaunchCommand(role, cfg, channelRel, sessionDir);
		const second = await spawnOnce(cwd, role, fresh, timeoutMs);
		return { exitCode: second.exitCode };
	}

	return { exitCode: first.exitCode };
}

async function runChain(cwd: string, cfg: OrchestrationConfig, channelFile: string, setStatus: (s: string) => void): Promise<void> {
	let safety = 20; // hard cap on links per chain run to prevent runaway loops

	while (safety-- > 0) {
		// Channel pinned for the chain's duration: avoids mtime-pivot if any
		// process touches an older channel mid-chain (editor save, git, lint).
		const parsed = parseChannel(channelFile);
		if (!parsed || !parsed.lastMessage) {
			logEvent(cwd, `chain stop: unparseable channel ${path.basename(channelFile)}`);
			setStatus("idle");
			return;
		}
		if (isTerminal(parsed)) {
			logEvent(cwd, `chain stop: terminal channel=${path.basename(channelFile)} status=${parsed.status} last-to=${parsed.lastMessage.to}`);
			notify("Dispatch chain complete", `${path.basename(channelFile)} → ${parsed.lastMessage.to} (${parsed.lastMessage.state})`);
			setStatus("idle");
			return;
		}

		const role = parsed.lastMessage.to;
		setStatus(`running ${role} (msg ${parsed.lastMessage.number + 1})`);
		const { exitCode } = await runRoleTurn(cwd, role, cfg, channelFile);

		if (exitCode !== 0) {
			logEvent(cwd, `chain stop: ${role} exited non-zero (code=${exitCode})`);
			notify("Dispatch chain stopped", `${role} exited with code ${exitCode}. See .dispatch-auto.log.`);
			setStatus("error");
			return;
		}

		// Re-poll the channel to detect what the just-run role wrote.
		const after = parseChannel(channelFile);
		if (!after || !after.lastMessage || after.lastMessage.number <= parsed.lastMessage.number) {
			logEvent(cwd, `chain stop: ${role} ran but did not append a new message`);
			notify("Dispatch chain stalled", `${role} ran but channel didn't advance. See .dispatch-auto.log.`);
			setStatus("error");
			return;
		}
		// Loop: parse will pick up the new latest message and decide next.
	}
	logEvent(cwd, "chain stop: safety cap reached");
	notify("Dispatch chain stopped", "Safety cap (20 links) reached. See .dispatch-auto.log.");
	setStatus("error");
}

export default function (pi: ExtensionAPI) {
	if (isSubprocess() || isPrintMode()) return; // worker mode: dormant

	let running = false;
	let sessionStartMs = 0;
	// Tracks the highest (channel-file, message-number) we've already acted on
	// so we don't re-fire on the same message after a chain completes.
	const acted = new Map<string, number>();

	pi.on("session_start", async (_event, ctx) => {
		const cwd = ctx.cwd ?? process.cwd();
		const cfg = loadConfig(cwd);
		if (!cfg) return;
		sessionStartMs = Date.now();
		// Intentionally do NOT pre-populate `acted` with existing channels.
		// The mtime gate is what filters stale state from prior sessions —
		// a channel only matters here once its mtime advances past our session
		// start. If Main re-uses a stale channel and overwrites Message 1 with
		// the same number, that still counts as "fresh this session" and fires.
		// `acted` is populated only when we actually spawn a chain, so it
		// strictly tracks within-session "already handled" — never conflates
		// pre-existing state with handled state.
		ctx.ui.setStatus("dispatch-auto", "armed");
	});

	pi.on("agent_end", async (_event, ctx) => {
		const cwd = ctx.cwd ?? process.cwd();
		const cfg = loadConfig(cwd);
		if (!cfg) return;
		if (running) return;

		const glob = cfg.channelGlob ?? CHANNEL_GLOB_DEFAULT;
		const channelFile = findLatestChannel(cwd, glob);
		if (!channelFile) return;
		const channelKey = normalizeKey(channelFile);

		// Gate 1: channel must have been modified during this session. Robust to
		// stale leftover channels with the same message number — if Main writes
		// (or rewrites) the file this session, mtime advances and we fire.
		let channelMtime = 0;
		try { channelMtime = fs.statSync(channelFile).mtimeMs; } catch { return; }
		if (channelMtime < sessionStartMs) return;

		const parsed = parseChannel(channelFile);
		if (!parsed?.lastMessage) return;

		// Gate 2: don't re-fire on a message we've already acted on this session.
		const lastActed = acted.get(channelKey);
		if (lastActed !== undefined && parsed.lastMessage.number <= lastActed) return;

		if (isTerminal(parsed)) {
			acted.set(channelKey, parsed.lastMessage.number);
			return;
		}

		running = true;
		acted.set(channelKey, parsed.lastMessage.number);
		const setStatus = (s: string) => ctx.ui.setStatus("dispatch-auto", s);
		try {
			await runChain(cwd, cfg, channelFile, setStatus);
			// Wake Main with a summary message so it can describe what just happened
			// and offer next steps (close, commit, push). We never auto-commit — Main
			// must wait for user confirmation. Use setTimeout so the agent_end handler
			// fully unwinds before we trigger a new turn.
			const final = parseChannel(channelFile);
			if (final?.lastMessage) {
				const rel = path.relative(cwd, channelFile);
				const summary =
					`[dispatch-auto] The Plan → Dev → Review chain just finished for \`${rel}\`.\n\n` +
					`Channel status: **${final.status || "(none)"}**\n` +
					`Latest message: **${final.lastMessage.from} → ${final.lastMessage.to}** (state: \`${final.lastMessage.state}\`)\n\n` +
					`Please:\n` +
					`1. Read the channel and the review artifact for this dispatch.\n` +
					`2. Skim \`git status\` to see what changed.\n` +
					`3. Briefly summarize the result (what shipped, any concerns).\n` +
					`4. **Offer** to update \`docs/SESSIONS.md\` with a Main close-session entry, mark the channel closed, commit, and push.\n\n` +
					`**Do not commit yet** — wait for my explicit go-ahead.`;
				setTimeout(() => {
					try {
						pi.sendMessage(
							{ customType: "dispatch-auto-summary", content: summary, display: true },
							{ triggerTurn: true, deliverAs: "followUp" }
						);
					} catch (err) {
						logEvent(cwd, `notify-main failed: ${(err as Error).message}`);
					}
				}, 250);
			}
		} finally {
			running = false;
			const final = parseChannel(channelFile);
			if (final?.lastMessage) acted.set(channelKey, final.lastMessage.number);
		}
	});
}
