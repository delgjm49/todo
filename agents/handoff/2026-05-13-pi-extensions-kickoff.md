# Kickoff — Pi Extensions / Tools (Roadmap Item #2)

**Read this first to pick up where the previous session left off.** Once you've read this plus the linked files, you should have everything you need to start.

## Where we are in the roadmap

The user has a 4-item meta-workflow roadmap. Status as of 2026-05-13:

| # | Item | Status |
|---|---|---|
| 1 | Dispatch system fully working | ✅ Done. Real cycles 005/006/008/009 all completed end-to-end via dispatch-auto. Windows verification still pending (checklist at `agents/workflows/windows-test-plan.md`). |
| 4 | Pi profile consolidation | ✅ Done. Vanilla `pi` is now the unified profile (`~/.pi/agent/`); `pi-multicodex` (ewgdg fork) handles two Codex OAuth accounts inside one profile. Aliases `pi-main` / `pi-alt` / etc. removed. |
| **2** | **Pi extensions / tools (THIS SESSION)** | ⏳ In progress. Task list/context observability installed; minimal web search/fetch next; model default audit next. |
| 3 | Meta agent layer above Main | ⏳ After #2. Capture as explicit backlog item; it sits above Main/Plan/Dev/Review and should likely coordinate/choose work across repos/workflows. |

## Scope of this session (item #2)

The user wants to extend Pi with extra **tools** (capabilities the agent invokes during a turn, like `Read`/`Edit`/`Bash`) and possibly other extension types (lifecycle hooks, slash commands, footer/UI additions). The starter example they gave is a **WebFetch tool** — fetch a URL, return content, optionally summarized. Doesn't currently appear in Pi's built-in tools.

The user said: "I have other ideas and when we actually work on this item, I want to dive in deeper." So this session is discussion-heavy. Start by asking them for their full wishlist before jumping into implementation.

## What I would have asked next (handing off to you)

Prompt the user for their wishlist across these four categories:

1. **Tools** — autonomous agent capabilities. What does Pi feel like it's missing that you'd want it to reach for? (WebFetch is the example.)
2. **Slash commands** — user-facing shortcuts like `/multicodex` or `/model`.
3. **Lifecycle hooks** — background behaviors firing on events, like dispatch-auto firing on `agent_end`.
4. **UI/UX** — footer additions, notifications, status integrations (like multicodex's quota line we just added).

For each item the user shares: ask whether they've seen something similar in the Pi extension registry vs. wanting to build from scratch.

## Existing extension setup on this machine

User's `~/.pi/agent/extensions/`:

- `repo-statusline.ts` — custom footer (location/git-diff/model/context/tokens on line 1, extension statuses on line 2). Canonical source: `.pi/install/repo-statusline.ts` in this repo.
- `dispatch-auto.ts` — auto-orchestrates Main → Plan → Dev → Review chain by spawning Pi/Claude subprocesses. Canonical source: `.pi/install/dispatch-auto.ts`. Config: `agents/orchestration.json` (committed baseline) + `agents/orchestration.local.json` (gitignored per-machine).
- `cmux-session.ts` — cmux integration (sends notifications and status to cmux's app).
- `joe-workflow/` — workflow helpers (mostly the now-vestigial `pi-aliases.sh` which only carries Claude Code aliases since the Pi consolidation).
- `sticky-model.ts` — keeps Pi's session model sticky (so model selections persist across resumes).
- `tauri-mcp.ts` — Tauri MCP server integration (for testing the Tauri app from inside Pi).

User packages (from `~/.pi/agent/settings.json`):

- `git:github.com/ewgdg/pi-multicodex` — multi-Codex account routing inside one Pi profile. Provides `/multicodex` commands and a footer-status that integrates with `repo-statusline.ts` (via `setStatus`/`getExtensionStatuses` cooperation pattern).

Pi version: `0.74.0` from `@earendil-works/pi-coding-agent`. Note: the Pi org was renamed from `@mariozechner/*` to `@earendil-works/*` recently — keep this in mind when reading extension package.json files in the wild.

## How Pi's extension API works (high-level reminders)

From the Pi help (`pi --help`) and code we've read:

- **Tools** (autonomous agent capabilities): registered via `pi.registerTool(...)` (verify exact signature — we haven't used this surface yet).
- **Slash commands**: `pi.registerCommand(name, { description, handler })`.
- **Providers**: `pi.registerProvider(...)` — what pi-multicodex uses to wrap `openai-codex`.
- **Lifecycle events**: `pi.on("session_start" | "agent_end" | "turn_end" | "model_select" | "session_shutdown" | "before_agent_start", handler)`.
- **UI surface from `ctx.ui`**: `setStatus(key, text|undefined)`, `setFooter(callback)`, `notify(msg, severity)`, `theme.fg(color, text)`.
- **Session interaction**: `pi.sendMessage({ customType, content, display }, { triggerTurn, deliverAs })` — used by dispatch-auto to wake Main after chain completion.

Pi auto-discovers `.ts` files in `~/.pi/agent/extensions/` AND items listed in `settings.json`'s `extensions:` and `packages:` arrays.

## Collaboration preferences (carry forward from this and prior sessions)

- **Discuss before action.** Even on small things, talk through the approach before writing code.
- **No commits without explicit user approval.** You may run `git add`/`git diff`/`git status` freely, but `git commit` requires the user to say "go" or equivalent.
- **Explicit thinking level always.** Don't rely on Pi's default thinking level — it can fall back to the last-used level from another session.
- **Cross-machine awareness.** Primary shipping target is Windows 11 (work). Home machine is macOS M1 (where this session ran). When the user says "do X," they may mean "design for Windows but execute on Mac." Match.
- **Memory hygiene.** User has auto-memory enabled. Use it for stable preferences and project-context that isn't derivable from the codebase. Don't memory ephemeral state, file paths, or anything in `git log`.

## Recent relevant commits (look at git log if you need detail)

- `9de750b` — fix(statusline+dispatch-auto): extension statuses on a 2nd line, silence "armed"
- `1e2a479` — fix(statusline): keep extension statuses (multicodex quota) over diff/token-extras
- `08ba001` — fix(agents): mandate reading role prompt template at session start
- `7608c9e` — feat(dispatch-protocol): [dispatch-auto] tag distinguishes machine vs human pickup
- `8a0a670` — feat(dispatch-auto): per-machine config layer + model presets

## Key files to skim if relevant comes up

- `AGENTS.md` (project root) — auto-loaded by Pi as context.
- `agents/prompts/main.md` — Main orchestrator prompt template.
- `agents/workflows/dispatch-channel-protocol.md` — pickup/role-resolution rules including the `[dispatch-auto]` tag distinction.
- `agents/orchestration.json` — dispatch-auto's committed baseline (presets, defaultPiProvider, role-preset mapping).
- `.pi/install/dispatch-auto.ts` — orchestrator source.
- `.pi/install/repo-statusline.ts` — footer source.

## In-flight work as of handoff

- TICKET-049 (internal row clipboard serialization) was dispatched, reviewed `review-pass`, and just committed/pushed by the previous Main agent. So the working tree should be clean when you start. Verify with `git status -s`.

## Pi extension wishlist captured after kickoff

The user is interested in evaluating these extension/tool categories before installing or building anything:

1. **Web fetch / web search**
   - Question: is a dedicated tool even needed, since Pi agents have already reconciled web pages successfully using `bash`/curl-style approaches?
   - Possible value: save tokens with cleaned/truncated extraction, give the model a clearer tool affordance, avoid shelling out for URLs, add search, handle difficult pages better.
   - Concern: there are many options; choose based on actual needs rather than installing the largest package.
   - Candidate packages/sources mentioned or found during initial survey:
     - `pi-mono-web-search` from `emanuelcasco/pi-mono-extensions`: `web_search` + `web_read`, DuckDuckGo + Mozilla Readability, no external system tools, blocks private/internal addresses.
     - `pi-web-access`: broad web/search/fetch/GitHub/PDF/YouTube/video package with fallback chains; likely powerful but larger surface area.
     - `pi-smart-fetch`: robust fetch-focused package with browser-like TLS, Defuddle extraction, downloads, batch fetch, multiple formats.
     - `@juicesharp/rpiv-web-tools`: Brave Search API-backed `web_search` + `web_fetch`, large-page spillover.
     - `@ollama/pi-web-search`: depends on local Ollama web search/fetch APIs.

2. **Task lists / todo tool**
   - User likes Claude Code-style task tracking.
   - Candidate packages:
     - `@tintinweb/pi-tasks`: Claude-style task tools (`TaskCreate`, `TaskList`, `TaskGet`, `TaskUpdate`, etc.), persistent widget, dependencies, shared task lists, optional subagent integration; early release and relatively feature-heavy.
     - `@juicesharp/rpiv-todo`: simpler `todo` tool + `/todos` command + live overlay; survives `/reload` and compaction; likely closer to a lightweight Claude TodoWrite-style experience.
   - Need evaluate whether this complements or conflicts with the repo's existing dispatch artifacts/channel workflow.

3. **Context management / context bloat/search**
   - User sees many tools claiming context savings/search improvements and specifically mentioned `context-mode` from Pi's package listing.
   - Candidate categories:
     - Observability-only: `pi-mono-context` adds `/context` display-only context usage breakdown; likely low risk.
     - Guardrails/intervention: `pi-mono-context-guard` auto-limits `read`, deduplicates repeated reads, and bounds raw `rg`; useful but may conflict with workflows requiring complete doc reads.
     - External retrieval/MCP: `context-mode` claims large context-window savings with sandboxed code execution, FTS5 knowledge base, and intent-driven search; broader and more invasive, Elastic-2.0 license.
     - Session search/memory: `@kaiserlich-dev/pi-session-search` and `pi-hermes-memory` could help search past Pi sessions, but may overlap with auto-memory and require privacy/secret-handling review.

Initial recommendation to revisit: prefer temporary trials (`pi -e ...`) or source audits before global installs. Keep package count small because each active tool/command can add system-prompt/tool schema overhead and change model behavior.

4. **OpenPets**
   - User asked to look at <https://github.com/alvinunreal/openpets>.
   - Summary from source audit: OpenPets is a tray-first Electron desktop companion for coding agents, with MCP/Claude/OpenCode integrations and an experimental Pi extension package at `@open-pets/pi`.
   - Pi extension behavior from `packages/pi/src/runtime.ts`: subscribes to Pi lifecycle/tool events (`session_start`, `agent_start`, `turn_start`, `tool_execution_start`, `tool_execution_end`, `agent_end`, etc.), sends local best-effort reactions through `@open-pets/client`, and registers `/openpets status|test|react|say`.
   - Privacy posture: automatic events do not forward prompts, assistant text, tool output, file contents, paths, URLs, or secrets; command text is bounded and only used to classify test-like shell commands.
   - Important caveat as of this audit: `npm view @open-pets/pi` returned 404 even though the package exists in the repo at version `2.0.6`; README says Pi install validation is still required before marking support fully supported. Treat this as experimental/source-install only unless npm publishing is confirmed later.
   - Possible fit: UI/UX/status companion, not a core workflow tool. Fun/low-stakes if installed, but requires running the OpenPets desktop app and potentially package/source installation.

Initial selected trials discussed with user:

- Task list: installed globally with `pi install npm:@juicesharp/rpiv-todo`; package now appears in `~/.pi/agent/settings.json`.
- Context observability: installed globally with `pi install npm:pi-mono-context`; package now appears in `~/.pi/agent/settings.json`.
- Minimal web search/fetch: attempted `pi install npm:pi-mono-web-search`, but install failed. `npm` failed while installing transitive `koffi` (`Cannot find module .../node_modules/koffi/src/cnoke/cnoke.js`). Settings were unchanged; `pi-mono-web-search` was not added. Package metadata also looks suspect because it declares dependency `pi-common@0.1.1`, and `npm view pi-common` returned 404. Candidate next alternatives: `pi-smart-fetch` for fetch-only robust extraction, or `@juicesharp/rpiv-web-tools` for Brave-backed search/fetch if user wants to provide an API key.

Follow-up findings after reload:

- `/context` reported about `68k/272k` current context usage, while `repo-statusline.ts` showed `Context: 17.6% (48.0k / 272.0k)` and token totals `↑in:212.0k ↓out:12.0k`.
- Root cause: the custom repo statusline's “Context” segment is currently computed from cumulative assistant usage (`sum(input + output)` over the session branch), not from current prompt/context occupancy. That means it behaves like “cumulative charged token budget remaining” and can diverge sharply from Pi's actual current context, especially after many turns/cache reuse. `pi-mono-context` uses `ctx.getContextUsage()` for the current context window and is likely the better source for actual remaining context.
- Fix applied: canonical `.pi/install/repo-statusline.ts` and installed `~/.pi/agent/extensions/repo-statusline.ts` now use `ctx.getContextUsage()` for the Context segment while keeping the cumulative `Tokens:` segment unchanged. Verification: `npm run typecheck` passed.

5. **Retire/reconcile old workflow commands**
   - User noticed `/context` still lists `orch` and `orch-watch` commands.
   - Source audit: these are registered unconditionally by the global `~/.pi/agent/extensions/joe-workflow/index.ts` extension, alongside `agent`, `profile`, `tool-profile`, `godot`, and `mcp`.
   - User suspects `orch` / `orch-watch` may no longer be needed for Todo because this repo now uses dispatch-auto channels/artifacts instead. They may still be used by `gumball-factory`, but goal is likely to retire that path when revisiting that repo and porting the Todo strategy.
   - Do not remove globally yet without checking cross-repo usage. Candidate future fix: add config-gated command registration or split legacy orchestration commands into a separate extension/package so Todo/Blancetrack can run without them while Gumball retains them temporarily.

## Broader meta-workflow backlog additions captured after kickoff

The user paused before the Pi extensions wishlist to add a few broader todos, in case the session is lost:

1. **Pi default model selection audit**
   - Examine how Pi chooses the default model for a fresh session.
   - Examine how `/new` chooses or inherits a model.
   - Revisit prior customization, especially the installed `sticky-model.ts` extension, because it may have helped but did not fully solve the behavior.
   - Goal: make default/new-session model behavior predictable and document the actual resolution order.
   - User's #1 preference: when the user enters `/new`, the replacement session should preserve the current session's exact active provider/model/thinking level, e.g. `gpt-5.5 - high (openai-codex)`. It should not simply read the global “last used” model, because another terminal may have selected a different model.
   - Audit finding: Pi core already persists model changes to global settings in `AgentSession.setModel()` / model cycling (`settingsManager.setDefaultModelAndProvider`) and persists thinking changes in `setThinkingLevel()` (`settingsManager.setDefaultThinkingLevel`). `/new` tears down the old runtime and creates a blank session, so initial model selection is resolved from the current global settings before extensions see the new session. The current `sticky-model.ts` also reads global settings on `session_start` and applies them, which reinforces the cross-terminal problem.
   - Fix applied: replaced installed `~/.pi/agent/extensions/sticky-model.ts` and added canonical `.pi/install/sticky-model.ts`. The new version only handles `/new`: on `session_shutdown` with `reason === "new"`, it snapshots the current session's `ctx.model` plus `pi.getThinkingLevel()`, temporarily writes those values into settings so Pi core initializes the new session correctly, then on `session_start` with `reason === "new"`, restores the prior settings fields if they still match the temporary values. It does not listen to `model_select` or apply global settings on every `session_start`; everything else is Pi defaults. Verification: TypeScript transpile check for `.pi/install/sticky-model.ts` passed; `npm run typecheck` passed.

2. **Retire or reconcile `codex-switch`**
   - Audit whether a `codex-switch` application/config is still installed or active.
   - Determine whether it is now obsolete because vanilla `pi` plus `pi-multicodex` can route both Codex OAuth accounts inside one Pi profile.
   - Check for interplay with `ai-usage`; this may need adjustment if `codex-switch` is removed or bypassed.
   - Do not remove anything until dependencies and current usage are understood.
   - Audit findings on Mac:
     - `codex-switch` is still installed via Homebrew (`xjoker/tap/codex-switch` 0.0.13) at `/opt/homebrew/bin/codex-switch`.
     - `~/.codex-switch/` is active and contains two profiles: `one` = `delgjm49@gmail.com`, `two` = `delgjm.49@gmail.com`; `two` is current.
     - Direct OpenAI Codex CLI is installed (`codex` from npm) and uses `~/.codex/auth.json`; `codex-switch` appears to manage/swap that direct Codex CLI auth, not Pi's `~/.pi/agent/auth.json` directly.
     - `ai-usage` is an alias to `~/.local/bin/ai-usage.sh`, which calls `~/Developer/.cmux/scripts/ai_usage_snapshot.py`.
     - `ai_usage_snapshot.py` currently shells out to `codex-switch list --json` and normalizes the two timed Codex quota records as `codex-main-timed` / `codex-alt-timed`; the dashboard footer still advertises `codex-switch tui` and `codex-switch use <name>`.
     - Current `~/.pi/agent/codex-accounts.json` for `pi-multicodex` exists but contains only one managed account (`codex-alt` / the second Codex account). So Pi-multicodex may be capable of both accounts, but this machine's current managed pool is not yet a complete replacement for `codex-switch`.
   - Follow-up correction: Pi-multicodex does effectively have both accounts on this machine, but one is a managed account from `~/.pi/agent/codex-accounts.json` (`delgjm.49@gmail.com`, displayed as `codex-alt`) and the other is Pi's imported `~/.pi/agent/auth.json` `openai-codex` OAuth account (`delgjm49@gmail.com`, displayed as `codex-main`). The imported Pi auth account is memory-only/ephemeral by Pi-multicodex design and is not persisted in `codex-accounts.json`, which is why the storage file looked like only one account.
   - Step #2 completed outside this repo: updated `~/Developer/.cmux/scripts/ai_usage_snapshot.py` to prefer Pi-multicodex/Pi auth storage over `codex-switch`. It now reads managed accounts from `~/.pi/agent/codex-accounts.json`, reads the imported Pi Codex auth from `~/.pi/agent/auth.json`, calls `https://chatgpt.com/backend-api/wham/usage` directly for each account, and only falls back to `codex-switch` on machines where Pi-multicodex account data is unavailable. Updated `~/.local/bin/ai-usage.sh` labels from “Codex CLI” to “Codex Accounts” and replaced codex-switch command hints with `/multicodex` guidance.
   - Verification: `python3 -m py_compile ~/Developer/.cmux/scripts/ai_usage_snapshot.py`, `bash -n ~/.local/bin/ai-usage.sh`, and `AI_USAGE_BYPASS_CACHE=1 ~/.local/bin/ai-usage.sh` all passed. The dashboard now shows `codex-main` from `pi-auth` and `codex-alt` from `pi-multicodex` without needing `codex-switch` in the normal path. Follow-up: removed the old `*` active-account marker from the Codex section because it no longer maps cleanly to codex-switch; `bash -n ~/.local/bin/ai-usage.sh` and `AI_USAGE_BYPASS_CACHE=1 ~/.local/bin/ai-usage.sh` passed after that change.
   - Remaining cleanup: after a little soak time, `codex-switch` can likely be uninstalled (`brew uninstall codex-switch`) and `~/.codex-switch` archived/removed, since the user reports they no longer use the direct Codex harness and only uses both Codex accounts through Pi Agent.
   - Future `ai-usage` todo: make Claude Code account usage refresh more self-sufficient. Today Claude Code usage only reports after each account has been used/logged in recently enough; if a Claude account has been idle for too many hours, usage may not report until a quick login/warmup happens. Desired future behavior: `ai-usage` should be able to refresh/warm Claude Code accounts on its own when needed, without sending an actual prompt/message if possible.

3. **Replicate the Todo workflow to other repos**
   - First target: `blancetrack`, replicating the improved dispatch/orchestration/statusline/workflow pieces from this repo as appropriate.
   - Longer-term target: `gumball-factory`, likely harder because that repo has additional repo-specific complexity, including Terra.
   - Prefer a migration checklist and repo-specific reconciliation over blind copy/paste.

Suggested categorization:

- Items 1 and 2 fit the Pi tooling/extensions cleanup lane and may be investigated alongside extension work.
- Item 3 is a separate workflow-portability lane after the Todo workflow stabilizes further.

## First message to send the user

After reading this, your first turn should be something like: "Ready to start on Pi extensions. To shape the wishlist, what comes to mind across these four buckets — tools, slash commands, lifecycle hooks, UI/UX? Webfetch is on the list already." Then wait for their list before brainstorming.
