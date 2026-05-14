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
import { Type } from "typebox";

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
	modelPreset?: string;   // key into cfg.modelPresets — resolved to args, prepended before extraArgs
}

interface OrchestrationConfig {
	channelGlob?: string;
	timeoutMinutes?: number; // root-level override of default subprocess timeout
	defaultPiProvider?: string; // value substituted for $defaultPiProvider tokens in presets (e.g., "opencode-go")
	modelPresets?: Record<string, string[]>; // named arg arrays; tokens like $defaultPiProvider are expanded at launch time
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

function deepMerge<T>(base: T, over: unknown): T {
	if (over === undefined) return base;
	if (Array.isArray(over)) return over as unknown as T; // arrays replace, don't concat
	if (typeof over !== "object" || over === null) return over as T;
	if (typeof base !== "object" || base === null || Array.isArray(base)) return over as T;
	const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
	for (const k of Object.keys(over as Record<string, unknown>)) {
		out[k] = deepMerge((base as Record<string, unknown>)[k], (over as Record<string, unknown>)[k]);
	}
	return out as T;
}

function loadConfig(cwd: string): OrchestrationConfig | null {
	const basePath = path.join(cwd, "agents", "orchestration.json");
	if (!fs.existsSync(basePath)) return null;
	let base: OrchestrationConfig;
	try {
		base = JSON.parse(fs.readFileSync(basePath, "utf8"));
	} catch {
		return null;
	}
	// Per-machine override: agents/orchestration.local.json (gitignored). Deep-merges
	// over the committed baseline so a single repo can support multiple machines with
	// different Pi profiles / Claude accounts / model preferences. Arrays replace
	// wholesale (e.g., overriding extraArgs); objects merge field-by-field.
	const localPath = path.join(cwd, "agents", "orchestration.local.json");
	if (fs.existsSync(localPath)) {
		try {
			const local = JSON.parse(fs.readFileSync(localPath, "utf8"));
			return deepMerge(base, local);
		} catch {
			// malformed local file: fall back to base, don't crash
		}
	}
	return base;
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

function resolveChannel(cwd: string, cfg: OrchestrationConfig, explicitPath?: string): { channelFile?: string; error?: string } {
	const trimmed = explicitPath?.trim();
	if (trimmed) {
		const resolved = path.resolve(cwd, trimmed.replace(/^@/, ""));
		const cwdResolved = path.resolve(cwd);
		if (resolved !== cwdResolved && !resolved.startsWith(cwdResolved + path.sep)) {
			return { error: `channel path is outside repo: ${trimmed}` };
		}
		if (!fs.existsSync(resolved)) return { error: `channel does not exist: ${trimmed}` };
		if (!fs.statSync(resolved).isFile()) return { error: `channel is not a file: ${trimmed}` };
		return { channelFile: resolved };
	}

	const glob = cfg.channelGlob ?? CHANNEL_GLOB_DEFAULT;
	const latest = findLatestChannel(cwd, glob);
	if (!latest) return { error: `no dispatch channels found for ${glob}` };
	return { channelFile: latest };
}

function validateRetryChannel(channel: ParsedChannel | null): string | null {
	if (!channel) return "channel is unparseable";
	if (!channel.lastMessage) return "channel has no messages";
	if (isTerminal(channel)) return `channel is terminal (status=${channel.status || "none"}, latest-to=${channel.lastMessage.to})`;
	return null;
}

function summarizeFinal(cwd: string, channelFile: string): string {
	const final = parseChannel(channelFile);
	const rel = path.relative(cwd, channelFile);
	if (!final?.lastMessage) return `Dispatch chain finished for \`${rel}\`, but the channel could not be parsed.`;
	return (
		`Dispatch chain finished for \`${rel}\`.\n\n` +
		`Channel status: **${final.status || "(none)"}**\n` +
		`Latest message: **${final.lastMessage.from} → ${final.lastMessage.to}** (state: \`${final.lastMessage.state}\`)`
	);
}

interface RetryRequest {
	channel?: string;
	reason?: string;
	requestedBy?: string;
	createdAt?: string;
}

function retryRequestDir(cwd: string): string {
	return path.join(cwd, "agents", "channels", ".sessions", "retry-requests");
}

function enqueueRetryRequest(cwd: string, request: RetryRequest): string {
	const dir = retryRequestDir(cwd);
	fs.mkdirSync(dir, { recursive: true });
	const stamp = new Date().toISOString().replace(/[:.]/g, "-");
	const filePath = path.join(dir, `${stamp}-${randomUUID()}.json`);
	fs.writeFileSync(filePath, JSON.stringify({ ...request, createdAt: new Date().toISOString() }, null, 2) + "\n");
	logEvent(cwd, `manual-retry queued request=${path.basename(filePath)} channel=${JSON.stringify(request.channel ?? "latest")} reason=${JSON.stringify(request.reason ?? "")}`);
	return filePath;
}

function consumeNextRetryRequest(cwd: string): { request?: RetryRequest; filePath?: string; error?: string } {
	const dir = retryRequestDir(cwd);
	if (!fs.existsSync(dir)) return {};
	const files = fs.readdirSync(dir)
		.filter((f) => f.endsWith(".json"))
		.map((f) => path.join(dir, f))
		.sort();
	if (files.length === 0) return {};
	const filePath = files[0];
	try {
		const request = JSON.parse(fs.readFileSync(filePath, "utf8")) as RetryRequest;
		fs.unlinkSync(filePath);
		return { request, filePath };
	} catch (err) {
		try { fs.renameSync(filePath, `${filePath}.bad`); } catch {}
		return { error: `invalid retry request ${path.basename(filePath)}: ${(err as Error).message}`, filePath };
	}
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

	// Model preset resolution: look up the named preset in cfg.modelPresets, expand
	// $defaultPiProvider tokens, and push the resulting args before extraArgs.
	// extraArgs comes after so per-role one-offs can override the preset (most
	// CLIs treat last-occurrence wins for repeated options like --model).
	if (override.modelPreset && cfg.modelPresets?.[override.modelPreset]) {
		const provider = cfg.defaultPiProvider ?? "opencode-go";
		for (const a of cfg.modelPresets[override.modelPreset]) {
			args.push(a.replace(/\$defaultPiProvider/g, provider));
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
	const safeArgs = plan.args.slice(0, -1); // omit pickup prompt; keep model/session args for diagnostics
	logEvent(cwd, `spawn role=${role} binary=${plan.cmd} resume=${resumed ? "yes" : "fresh"} timeoutMs=${timeoutMs} channel=${path.basename(channelFile)} args=${JSON.stringify(safeArgs)}`);

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

interface ChainResult {
	ok: boolean;
	reason: string;
}

async function runChain(cwd: string, cfg: OrchestrationConfig, channelFile: string, setStatus: (s: string | undefined) => void, reason = "auto"): Promise<ChainResult> {
	let safety = 20; // hard cap on links per chain run to prevent runaway loops

	while (safety-- > 0) {
		// Channel pinned for the chain's duration: avoids mtime-pivot if any
		// process touches an older channel mid-chain (editor save, git, lint).
		const parsed = parseChannel(channelFile);
		if (!parsed || !parsed.lastMessage) {
			const stopReason = `unparseable channel ${path.basename(channelFile)}`;
			logEvent(cwd, `chain stop: ${stopReason}`);
			setStatus(undefined);
			return { ok: false, reason: stopReason };
		}
		if (isTerminal(parsed)) {
			const stopReason = `terminal channel=${path.basename(channelFile)} status=${parsed.status} last-to=${parsed.lastMessage.to}`;
			logEvent(cwd, `chain stop: ${stopReason}`);
			notify("Dispatch chain complete", `${path.basename(channelFile)} → ${parsed.lastMessage.to} (${parsed.lastMessage.state})`);
			setStatus(undefined);
			return { ok: true, reason: stopReason };
		}

		const role = parsed.lastMessage.to;
		setStatus(`${reason === "manual-retry" ? "retrying" : "running"} ${role} (msg ${parsed.lastMessage.number + 1})`);
		const { exitCode } = await runRoleTurn(cwd, role, cfg, channelFile);

		if (exitCode !== 0) {
			const stopReason = `${role} exited non-zero (code=${exitCode})`;
			logEvent(cwd, `chain stop: ${stopReason}`);
			notify("Dispatch chain stopped", `${role} exited with code ${exitCode}. See .dispatch-auto.log.`);
			setStatus("error");
			return { ok: false, reason: stopReason };
		}

		// Re-poll the channel to detect what the just-run role wrote.
		const after = parseChannel(channelFile);
		if (!after || !after.lastMessage || after.lastMessage.number <= parsed.lastMessage.number) {
			const stopReason = `${role} ran but did not append a new message`;
			logEvent(cwd, `chain stop: ${stopReason}`);
			notify("Dispatch chain stalled", `${role} ran but channel didn't advance. See .dispatch-auto.log.`);
			setStatus("error");
			return { ok: false, reason: stopReason };
		}
		// Loop: parse will pick up the new latest message and decide next.
	}
	logEvent(cwd, "chain stop: safety cap reached");
	notify("Dispatch chain stopped", "Safety cap (20 links) reached. See .dispatch-auto.log.");
	setStatus("error");
	return { ok: false, reason: "safety cap reached" };
}

export default function (pi: ExtensionAPI) {
	if (isSubprocess() || isPrintMode()) return; // worker mode: dormant

	let running = false;
	let sessionStartMs = 0;
	let retryToolRegistered = false;
	// Tracks the latest (channel-file, message-number, mtime) we've attempted.
	// We compare both message number and file mtime so a user/Main can retry the
	// same message after a failure by touching or appending to the channel without
	// needing /reload. A stale unmodified channel still won't re-fire forever.
	const acted = new Map<string, { number: number; mtimeMs: number }>();

	const sendMainSummary = (cwd: string, channelFile: string, chainResult: ChainResult) => {
		const final = parseChannel(channelFile);
		if (!final?.lastMessage) return;
		const rel = path.relative(cwd, channelFile);
		const summary =
			`[dispatch-auto] The Plan → Dev → Review chain just ${chainResult.ok ? "finished" : "stopped"} for \`${rel}\`.\n\n` +
			`Result: **${chainResult.ok ? "ok" : "needs attention"}** — ${chainResult.reason}\n` +
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
	};

	const requestRetry = async (
		cwd: string,
		cfg: OrchestrationConfig,
		channelArg: string | undefined,
		reason: string | undefined,
		setStatus: (s: string | undefined) => void,
	): Promise<{ ok: boolean; message: string; channelFile?: string; chainResult?: ChainResult }> => {
		if (running) return { ok: false, message: "dispatch chain is already running" };
		const resolved = resolveChannel(cwd, cfg, channelArg);
		if (!resolved.channelFile) {
			logEvent(cwd, `manual-retry rejected reason=${JSON.stringify(resolved.error)}`);
			return { ok: false, message: resolved.error ?? "could not resolve channel" };
		}
		const channelFile = resolved.channelFile;
		const parsed = parseChannel(channelFile);
		const invalid = validateRetryChannel(parsed);
		if (invalid) {
			logEvent(cwd, `manual-retry rejected reason=${JSON.stringify(invalid)} channel=${path.basename(channelFile)}`);
			return { ok: false, message: invalid, channelFile };
		}

		const channelKey = normalizeKey(channelFile);
		let startMtime = 0;
		try { startMtime = fs.statSync(channelFile).mtimeMs; } catch {}
		logEvent(cwd, `manual-retry requested channel=${path.basename(channelFile)} msg=${parsed!.lastMessage!.number} reason=${JSON.stringify(reason ?? "")}`);

		running = true;
		acted.set(channelKey, { number: parsed!.lastMessage!.number, mtimeMs: startMtime });
		try {
			const chainResult = await runChain(cwd, cfg, channelFile, setStatus, "manual-retry");
			logEvent(cwd, `manual-retry finished channel=${path.basename(channelFile)} ok=${chainResult.ok} reason=${JSON.stringify(chainResult.reason)}`);
			const summary = `${chainResult.ok ? "Dispatch retry finished" : "Dispatch retry stopped"}: ${chainResult.reason}\n\n${summarizeFinal(cwd, channelFile)}`;
			return { ok: chainResult.ok, message: summary, channelFile, chainResult };
		} finally {
			running = false;
			const final = parseChannel(channelFile);
			if (final?.lastMessage) {
				let finalMtime = startMtime;
				try { finalMtime = fs.statSync(channelFile).mtimeMs; } catch {}
				acted.set(channelKey, { number: final.lastMessage.number, mtimeMs: finalMtime });
			}
		}
	};

	pi.registerCommand("dispatch", {
		description: "Dispatch-auto controls: /dispatch retry [channel-path]",
		handler: async (args, ctx) => {
			const cwd = ctx.cwd ?? process.cwd();
			const cfg = loadConfig(cwd);
			if (!cfg) {
				ctx.ui.notify("dispatch-auto is not enabled in this repo", "warning");
				return;
			}
			const parts = args.trim().split(/\s+/).filter(Boolean);
			if (parts[0] !== "retry") {
				ctx.ui.notify("Usage: /dispatch retry [channel-path]", "info");
				return;
			}
			const channelArg = parts.slice(1).join(" ") || undefined;
			const result = await requestRetry(cwd, cfg, channelArg, "slash command", (s) => ctx.ui.setStatus("dispatch-auto", s));
			ctx.ui.notify(result.ok ? "Dispatch retry finished" : `Dispatch retry rejected: ${result.message}`, result.ok ? "info" : "warning");
		},
	});

	pi.on("session_start", async (_event, ctx) => {
		const cwd = ctx.cwd ?? process.cwd();
		const cfg = loadConfig(cwd);
		if (!cfg) return;
		sessionStartMs = Date.now();
		if (!retryToolRegistered) {
			retryToolRegistered = true;
			pi.registerTool({
				name: "dispatch_auto_retry",
				label: "Dispatch Retry",
				description: "Request a one-shot retry of the latest or specified dispatch-auto channel after explicit user approval.",
				promptSnippet: "Request a guarded one-shot dispatch-auto retry after the user explicitly approves retrying a failed dispatch.",
				promptGuidelines: [
					"Use dispatch_auto_retry only after the user explicitly approves retrying a failed or stalled dispatch-auto chain.",
					"Do not use dispatch_auto_retry for terminal channels addressed to Main, closed channels, or speculative retries without user approval.",
				],
				parameters: Type.Object({
					channel: Type.Optional(Type.String({ description: "Optional channel path. If omitted, retry the latest configured dispatch channel." })),
					reason: Type.Optional(Type.String({ description: "Brief reason and user approval context for the retry." })),
				}),
				async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
					const cwd = ctx.cwd ?? process.cwd();
					const cfg = loadConfig(cwd);
					if (!cfg) throw new Error("dispatch-auto is not enabled in this repo");
					const requestPath = enqueueRetryRequest(cwd, {
						channel: params.channel,
						reason: params.reason,
						requestedBy: "Main/model via dispatch_auto_retry",
					});
					const rel = path.relative(cwd, requestPath);
					return {
						content: [{ type: "text", text: `Queued a one-shot dispatch retry request at ${rel}. It will be consumed when this turn ends.` }],
						details: { request: rel, channel: params.channel, reason: params.reason },
					};
				},
			});
		}
		// Intentionally do NOT pre-populate `acted` with existing channels.
		// The mtime gate is what filters stale state from prior sessions —
		// a channel only matters here once its mtime advances past our session
		// start. If Main re-uses a stale channel and overwrites Message 1 with
		// the same number, that still counts as "fresh this session" and fires.
		// `acted` is populated only when we actually spawn a chain, so it
		// strictly tracks within-session "already handled" — never conflates
		// pre-existing state with handled state.
		// Intentionally do NOT set an "armed" status here — the extension's
		// presence is implicit, and an always-on "armed" indicator just
		// clutters the footer when nothing is happening. We only publish
		// status while a chain is actively running or has errored.
	});

	pi.on("agent_end", async (_event, ctx) => {
		const cwd = ctx.cwd ?? process.cwd();
		const cfg = loadConfig(cwd);
		if (!cfg) return;
		if (running) return;

		const retryRequest = consumeNextRetryRequest(cwd);
		if (retryRequest.error) {
			logEvent(cwd, `manual-retry rejected reason=${JSON.stringify(retryRequest.error)}`);
			ctx.ui.setStatus("dispatch-auto", "error");
			return;
		}
		if (retryRequest.request) {
			const setStatus = (s: string | undefined) => ctx.ui.setStatus("dispatch-auto", s);
			const result = await requestRetry(cwd, cfg, retryRequest.request.channel, retryRequest.request.reason ?? "queued retry request", setStatus);
			if (result.channelFile && result.chainResult) sendMainSummary(cwd, result.channelFile, result.chainResult);
			else logEvent(cwd, `manual-retry rejected reason=${JSON.stringify(result.message)}`);
			return;
		}

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

		// Gate 2: don't re-fire on a message+mtime we've already attempted this
		// session. If Main touches/appends the same latest message after a worker
		// failure, the mtime advances and this gate allows a retry.
		const lastActed = acted.get(channelKey);
		if (
			lastActed !== undefined &&
			parsed.lastMessage.number <= lastActed.number &&
			channelMtime <= lastActed.mtimeMs
		) return;

		if (isTerminal(parsed)) {
			acted.set(channelKey, { number: parsed.lastMessage.number, mtimeMs: channelMtime });
			return;
		}

		running = true;
		acted.set(channelKey, { number: parsed.lastMessage.number, mtimeMs: channelMtime });
		const setStatus = (s: string | undefined) => ctx.ui.setStatus("dispatch-auto", s);
		try {
			const chainResult = await runChain(cwd, cfg, channelFile, setStatus);
			// Wake Main with a summary message so it can describe what just happened
			// and offer next steps (close, commit, push). We never auto-commit — Main
			// must wait for user confirmation. Use setTimeout so the agent_end handler
			// fully unwinds before we trigger a new turn.
			sendMainSummary(cwd, channelFile, chainResult);
		} finally {
			running = false;
			const final = parseChannel(channelFile);
			if (final?.lastMessage) {
				let finalMtime = channelMtime;
				try { finalMtime = fs.statSync(channelFile).mtimeMs; } catch {}
				acted.set(channelKey, { number: final.lastMessage.number, mtimeMs: finalMtime });
			}
		}
	});
}
