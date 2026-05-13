/**
 * Repo Statusline (Footer)
 *
 * Global Pi extension that replaces the default footer with a colorful,
 * labeled, easy-to-scan statusline. Activates in every Pi session
 * (originally written as a project-local extension for the Todo app;
 * generalized for use across all repos).
 *
 * Features:
 *   - Location: repo name + git branch, or truncated directory path
 *   - Git diff: +additions / -deletions with colored counters
 *   - Tokens section: labeled "Tokens:" with input, output, reasoning, cost
 *   - Context section: labeled "Context:" showing remaining % (green→red)
 *     with absolute remaining/total values
 *   - Progressive truncation: drops less important items first as terminal narrows
 *
 * Performance note: all external I/O (git diff) happens async on a background
 * timer. render() is pure synchronous reads so the TUI never stalls.
 */

import { exec } from "child_process";
import { existsSync, readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import type { AssistantMessage } from "@earendil-works/pi-ai";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";

const DIFF_POLL_MS = 5000; // async background poll — never blocks the TUI

function resolveGit(): string {
	const portable = "C:/Users/jdelgro2/Documents/PortableGit/bin/git.exe";
	try {
		if (existsSync(portable)) return portable;
	} catch { /* ignore */ }
	return "git";
}

const GIT_EXE = resolveGit();

/* ── helpers ─────────────────────────────────────────────── */

function fmtNum(n: number): string {
	return n < 1000 ? `${n}` : `${(n / 1000).toFixed(1)}k`;
}

function hexFg(hex: string, text: string): string {
	const r = parseInt(hex.slice(1, 3), 16);
	const g = parseInt(hex.slice(3, 5), 16);
	const b = parseInt(hex.slice(5, 7), 16);
	return `\x1b[38;2;${r};${g};${b}m${text}\x1b[39m`;
}

function interpolateHex(a: string, b: string, t: number): string {
	const ar = parseInt(a.slice(1, 3), 16);
	const ag = parseInt(a.slice(3, 5), 16);
	const ab = parseInt(a.slice(5, 7), 16);
	const br = parseInt(b.slice(1, 3), 16);
	const bg = parseInt(b.slice(3, 5), 16);
	const bb = parseInt(b.slice(5, 7), 16);
	const r = Math.round(ar + (br - ar) * t);
	const g = Math.round(ag + (bg - ag) * t);
	const b_ = Math.round(ab + (bb - ab) * t);
	return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b_.toString(16).padStart(2, "0")}`;
}

function ctxHexColor(pct: number): string {
	const clamped = Math.max(0, Math.min(100, pct));
	if (clamped >= 50) {
		return interpolateHex("#41D241", "#FFF550", (100 - clamped) / 50);
	}
	return interpolateHex("#FFF550", "#FF0000", (50 - clamped) / 50);
}

function getInitialThinkingLevel(): string {
	try {
		const project = JSON.parse(readFileSync(join(process.cwd(), ".pi", "settings.json"), "utf-8"));
		if (project.defaultThinkingLevel) return project.defaultThinkingLevel;
	} catch { /* no project settings */ }
	try {
		const global = JSON.parse(readFileSync(join(homedir(), ".pi", "agent", "settings.json"), "utf-8"));
		if (global.defaultThinkingLevel) return global.defaultThinkingLevel;
	} catch { /* no global settings */ }
	return "";
}

/* ── extension ───────────────────────────────────────────── */

export default function (pi: ExtensionAPI) {
	// Track thinking level across the extension lifetime
	let currentThinkingLevel = getInitialThinkingLevel();

	pi.on("thinking_level_select", async (event) => {
		currentThinkingLevel = event.level;
	});

	pi.on("session_start", async (_event, ctx) => {
		ctx.ui.setFooter((tui, theme, footerData) => {
			/* ── Git diff: async background cache ──
			 * render() never touches git — it only reads lastDiff.
			 */
			let lastDiff = { added: 0, deleted: 0 };
			let lastDiffKey = "0,0";

			function parseGitDiff(stdout: string): { added: number; deleted: number } {
				let added = 0;
				let deleted = 0;
				for (const line of stdout.split("\n")) {
					const trimmed = line.trim();
					if (!trimmed) continue;
					const [a, d] = trimmed.split(/\s+/);
					if (a && d && a !== "-" && d !== "-") {
						added += parseInt(a, 10) || 0;
						deleted += parseInt(d, 10) || 0;
					}
				}
				return { added, deleted };
			}

			function pollDiff() {
				let unstagedOut = "";
				let stagedOut = "";
				let pending = 2;

				function done() {
					pending--;
					if (pending > 0) return;
					const stats = parseGitDiff(unstagedOut + "\n" + stagedOut);
					const key = `${stats.added},${stats.deleted}`;
					if (key !== lastDiffKey) {
						lastDiff = stats;
						lastDiffKey = key;
						tui.requestRender();
					}
				}

				exec(
					`"${GIT_EXE}" diff --numstat`,
					{ cwd: process.cwd(), timeout: 5000 },
					(err, stdout) => {
						if (!err) unstagedOut = stdout;
						done();
					}
				);
				exec(
					`"${GIT_EXE}" diff --cached --numstat`,
					{ cwd: process.cwd(), timeout: 5000 },
					(err, stdout) => {
						if (!err) stagedOut = stdout;
						done();
					}
				);
			}

			pollDiff();
			const diffInterval = setInterval(pollDiff, DIFF_POLL_MS);
			const unsubBranch = footerData.onBranchChange(() => tui.requestRender());

			return {
				dispose() {
					clearInterval(diffInterval);
					unsubBranch();
				},
				invalidate() {},

				render(width: number): string[] {
					const sep = theme.fg("dim", "  •  ");
					const tryLine = (left: string[], right: string) => {
						const leftStr = left.filter(Boolean).join(sep);
						if (!right) {
							return truncateToWidth(leftStr, width);
						}
						const pad = width - visibleWidth(leftStr) - visibleWidth(right);
						if (pad < 0) {
							return leftStr + right;
						}
						return leftStr + " ".repeat(pad) + right;
					};

					/* ── Location ── */
					const cwd = process.cwd();
					const repoName = cwd.split(/[\\/]/).pop() || cwd;
					const branch = footerData.getGitBranch();

					let location = "";
					if (branch) {
						location =
							theme.bold(hexFg("#ff8c00", repoName)) +
							theme.fg("accent", ` (${branch})`);
					} else {
						const parts = cwd.split(/[\\/]/).filter(Boolean);
						location =
							parts.length > 2
								? theme.fg("success", `…/${parts.slice(-2).join("/")}`)
								: theme.fg("success", parts.join("/"));
					}

					/* ── Git diff (reads cached value only) ── */
					const { added, deleted } = lastDiff;
					const diffSeg =
						added || deleted
							? theme.fg("success", `+${added}`) +
							  theme.fg("dim", " / ") +
							  theme.fg("error", `-${deleted}`)
							: "";

					const locationPart = [location, diffSeg]
						.filter(Boolean)
						.join(" ");

					/* ── Token stats ── */
					let input = 0;
					let output = 0;
					let reasoning = 0;
					let cost = 0;
					let totalTokens = 0;

					for (const entry of ctx.sessionManager.getBranch()) {
						if (
							entry.type === "message" &&
							entry.message.role === "assistant"
						) {
							const m = entry.message as AssistantMessage;
							input += m.usage?.input ?? 0;
							output += m.usage?.output ?? 0;
							cost += m.usage?.cost?.total ?? 0;
							reasoning += (m.usage as { reasoning?: number })?.reasoning ?? 0;
							totalTokens +=
								(m.usage?.input ?? 0) + (m.usage?.output ?? 0);
						}
					}

					const seg = (
						label: string,
						value: string,
						color:
							| "accent"
							| "success"
							| "warning"
							| "error"
							| "muted"
							| "dim"
					) => theme.fg("dim", label) + theme.fg(color, value);

					const inputSeg = seg("↑in:", fmtNum(input), "accent");
					const outputSeg = seg("↓out:", fmtNum(output), "success");
					const reasoningSeg =
						reasoning > 0
							? seg("Rrsn:", fmtNum(reasoning), "warning")
							: "";
					const costSeg = seg("$", cost.toFixed(3), "warning");

					const mkTokenPart = (metrics: string[]) =>
						metrics.length
							? theme.fg("text", "Tokens: ") +
							  metrics
									.filter(Boolean)
									.join(theme.fg("dim", "  "))
							: "";

					const tokenFull = mkTokenPart([
						inputSeg,
						outputSeg,
						reasoningSeg,
						costSeg,
					]);
					const tokenNoExtra = mkTokenPart([inputSeg, outputSeg]);
					const tokenInputOnly = mkTokenPart([inputSeg]);

					/* ── Context ── */
					const ctxWindow = (ctx.model as { contextWindow?: number })?.contextWindow ?? 0;
					let contextSeg = "";
					let contextPctOnly = "";

					if (ctxWindow > 0) {
						const remaining = Math.max(0, ctxWindow - totalTokens);
						const pct = Math.max(
							0,
							Math.min(100, (remaining / ctxWindow) * 100)
						);
						const color = ctxHexColor(pct);
						const pctStr = `${pct.toFixed(1)}%`;
						const absStr = `(${fmtNum(remaining)} / ${fmtNum(ctxWindow)})`;

						contextSeg =
							theme.fg("text", "Context: ") +
							hexFg(color, pctStr) +
							theme.fg("dim", ` ${absStr}`);

						contextPctOnly =
							theme.fg("text", "Context: ") +
							hexFg(color, pctStr);
					}

					/* ── Model ── */
					const statuses: string[] = [];
					for (const [, text] of footerData.getExtensionStatuses()) {
						if (text?.trim()) {
							statuses.push(theme.fg("muted", text.trim()));
						}
					}

					const modelName = ctx.model?.id ?? "no-model";
					const thinking = currentThinkingLevel;
					const provider = (ctx.model as { provider?: string })?.provider ?? "";
					const modelSeg = theme.fg("accent", theme.bold(modelName));
					const thinkingSeg = thinking
						? theme.fg("text", " - ") + `\x1b[95m${thinking}\x1b[0m`
						: "";
					const providerSeg = provider
						? theme.fg("dim", ` (${provider})`)
						: "";
					const modelLabel = theme.fg("text", "Model: ");
					const modelCore = modelLabel + modelSeg + thinkingSeg + providerSeg;

					/* ── Progressive truncation ──
					 * Drop order (least → most important):
					 *   reasoning+cost → diff → output → context abs
					 *   → context entirely → input → location
					 * Model name is never dropped. Extension statuses live on a
					 * separate line (below) so they no longer compete with the
					 * main line for width.
					 */
					const candidates = [
						() => tryLine([locationPart, modelCore, contextSeg], tokenFull),
						() => tryLine([locationPart, modelCore, contextSeg], tokenNoExtra),
						() => tryLine([location, modelCore, contextSeg], tokenNoExtra),
						() => tryLine([location, modelCore, contextSeg], tokenInputOnly),
						() => tryLine([location, modelCore, contextPctOnly], tokenInputOnly),
						() => tryLine([location, modelCore], tokenInputOnly),
						() => tryLine([location, modelCore], ""),
						() => tryLine([modelCore], ""),
					];

					let mainLine = truncateToWidth(modelCore, width);
					for (const candidate of candidates) {
						const line = candidate();
						if (visibleWidth(line) <= width) {
							mainLine = line;
							break;
						}
					}

					// Extension statuses (multicodex quota, etc.) on their own line.
					// Only shown when at least one extension has non-empty status.
					if (statuses.length > 0) {
						const sep = theme.fg("dim", "  ·  ");
						const statusLine = truncateToWidth(statuses.join(sep), width);
						return [mainLine, statusLine];
					}
					return [mainLine];
				},
			};
		});
	});
}
