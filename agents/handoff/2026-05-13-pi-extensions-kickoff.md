# Kickoff — Pi Extensions / Tools (Roadmap Item #2)

**Read this first to pick up where the previous session left off.** Once you've read this plus the linked files, you should have everything you need to start.

## Where we are in the roadmap

The user has a 4-item meta-workflow roadmap. Status as of 2026-05-13:

| # | Item | Status |
|---|---|---|
| 1 | Dispatch system fully working | ✅ Done. Real cycles 005/006/008/009 all completed end-to-end via dispatch-auto. Windows verification still pending (checklist at `agents/workflows/windows-test-plan.md`). |
| 4 | Pi profile consolidation | ✅ Done. Vanilla `pi` is now the unified profile (`~/.pi/agent/`); `pi-multicodex` (ewgdg fork) handles two Codex OAuth accounts inside one profile. Aliases `pi-main` / `pi-alt` / etc. removed. |
| **2** | **Pi extensions / tools (THIS SESSION)** | ⏳ Starting now. |
| 3 | Meta agent layer above Main | ⏳ After #2. |

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

## First message to send the user

After reading this, your first turn should be something like: "Ready to start on Pi extensions. To shape the wishlist, what comes to mind across these four buckets — tools, slash commands, lifecycle hooks, UI/UX? Webfetch is on the list already." Then wait for their list before brainstorming.
