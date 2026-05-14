# Pi Setup

Per-machine setup for the [Pi coding agent](https://earendil.works) when working in this repo.

## Canonical source

The canonical source for shared/global Pi workflow extensions now lives in:

```text
~/Developer/meta-workflow/pi/extensions/
```

Canonical files:

- `repo-statusline.ts` — custom Pi footer/statusline.
- `dispatch-auto.ts` — auto-orchestrates Main → Plan → Dev → Review dispatch chains.
- `sticky-model.ts` — small `/new` model handoff extension that preserves the current session's provider/model/thinking level across `/new` without imposing an extra global last-used-model policy.

This repo's `.pi/install/` directory is now a **repo-local mirror/bootstrap copy**, not the long-term source of truth. It remains useful when a machine has `todo` but has not yet cloned `meta-workflow` — for example the Windows work PC.

Long-term, other repos such as `balancetrack` and `gumball-factory` should also point back to `meta-workflow` for shared Pi workflow artifacts instead of carrying independent canonical copies.

## Why `install` Instead Of `.pi/extensions/`

Pi auto-loads extensions from `.pi/extensions/` in the project directory. If these files lived there, they would double-load on machines that also have them installed globally. The mirror copy is kept here as a reference/bootstrap source; each machine installs the extensions once to its global Pi config.

## One-Time Install On A New Machine

Preferred if `meta-workflow` is available:

```bash
mkdir -p ~/.pi/agent/extensions
cp ~/Developer/meta-workflow/pi/extensions/repo-statusline.ts ~/.pi/agent/extensions/repo-statusline.ts
cp ~/Developer/meta-workflow/pi/extensions/sticky-model.ts ~/.pi/agent/extensions/sticky-model.ts
cp ~/Developer/meta-workflow/pi/extensions/dispatch-auto.ts ~/.pi/agent/extensions/dispatch-auto.ts
```

Fallback if only `todo` is available:

```bash
mkdir -p ~/.pi/agent/extensions
cp .pi/install/repo-statusline.ts ~/.pi/agent/extensions/repo-statusline.ts
cp .pi/install/sticky-model.ts ~/.pi/agent/extensions/sticky-model.ts
cp .pi/install/dispatch-auto.ts ~/.pi/agent/extensions/dispatch-auto.ts
```

Pi auto-discovers extensions from `~/.pi/agent/extensions/`, so no `settings.json` edit is required for these globally installed extensions. After the next Pi session restart, they apply to every repo on that machine, not just this one.

If you do edit `~/.pi/agent/settings.json` for other reasons, save it as UTF-8 **without BOM**. Pi parses JSON with `JSON.parse`, and a leading BOM can cause startup warnings like `Unexpected token '﻿'`.

## Per-Machine Settings

`.pi/settings.json` is gitignored — each machine maintains its own when needed.

On Windows, there are two valid ways to make Pi's `BASH` tool work:

- add PortableGit's `bin` directory to the user's `PATH`, so `bash` resolves without a repo-local override
- or set `shellPath` in `.pi/settings.json`

Typical Windows fallback contents if `bash` is not already on `PATH`:

```json
{
  "shellPath": "C:\\Users\\<user>\\Documents\\PortableGit\\bin\\bash.exe"
}
```

On the Mac home machine, usually nothing project-specific is needed; rely on global `~/.pi/agent/settings.json`.

If `bash --version` already works in a fresh terminal on a machine, `.pi/settings.json` is usually unnecessary there.

If you ever need to seed a fresh machine, copy from another machine only as a local fallback — there is no canonical version of this file.

## Keeping Installed Extensions In Sync

When canonical sources change in `~/Developer/meta-workflow/pi/extensions/`, refresh the globally installed copy on each machine:

```bash
cp ~/Developer/meta-workflow/pi/extensions/repo-statusline.ts ~/.pi/agent/extensions/repo-statusline.ts
cp ~/Developer/meta-workflow/pi/extensions/sticky-model.ts ~/.pi/agent/extensions/sticky-model.ts
cp ~/Developer/meta-workflow/pi/extensions/dispatch-auto.ts ~/.pi/agent/extensions/dispatch-auto.ts
```

If `meta-workflow` is unavailable on a machine, use this repo's `.pi/install/` mirror as a fallback until the canonical repo can be cloned or synced.

## Dispatch Auto-Orchestrator

`dispatch-auto.ts` is the Pi extension that auto-runs the Main → Plan → Dev → Review chain. When Main writes a worker-addressed channel message, the extension spawns `pi --print` or configured worker subprocesses sequentially through Plan/Dev/Review until the chain returns to Main. You only interact with Main; you never copy/paste pickup prompts between sessions.

### How it activates

Opt-in per repo: the extension is dormant unless `agents/orchestration.json` exists in the cwd. Safe to install globally.

It also self-disables when:

- Invoked as a subprocess by another instance of itself (`DISPATCH_AUTO_SUBPROCESS=1` env var)
- Pi is running with `--print` / `-p` (the orchestrator only fires from interactive Main sessions)

### How to use it

1. `cd` into the repo and run `pi`.
2. Tell Main what to work on. Main writes the dispatch artifact, creates the channel, and appends the first `Main → Plan` message — same flow as before.
3. When Main's turn ends, the extension detects the fresh worker-addressed message and runs the chain. You'll see a status footer like `dispatch-auto: running Plan (msg 2)`.
4. The chain runs Plan → Dev → Review and any Review → Dev → Review revision loops automatically. Each subprocess's stdout/stderr streams to `.dispatch-auto.log` in repo root.
5. When the chain hits a message addressed to Main, or the channel status reaches `closed`, it stops. You get a macOS / Windows toast notification.
6. Switch back to your Main session to review the channel + review artifact, then close the dispatch. Do not commit until the user explicitly approves.

### Session continuity within a cycle

For Dev's fix turns after Review, the extension reuses Dev's prior session via `pi --resume <id>`. Session IDs are captured from Pi's stdout and stored per-channel-per-role at `agents/channels/.sessions/<channel>-<role>.id` (gitignored). New channel = new session IDs, so context never bleeds across dispatches.

### Configuring non-Pi workers

By default all worker roles run as `pi --print`. Override per role in `agents/orchestration.json` only on machines where that worker binary is available.

Example Claude Code override:

```jsonc
{
  "roles": {
    "Plan": { "binary": "claude", "configDir": "~/.claude-acct1" },
    "Review": { "binary": "claude", "configDir": "~/.claude-acct2" }
  }
}
```

The Windows work PC currently has Pi but not Claude Code, so use all-Pi workers there unless Claude Code is installed later.

`configDir` sets `CLAUDE_CONFIG_DIR` or `PI_CODING_AGENT_DIR` so multi-account setups work cleanly. Main is always the host Pi session you're sitting in.

### Stopping / recovering

- **Abort mid-chain**: Ctrl-C the subprocess; it'll bubble up to the chain loop which logs a non-zero exit and stops.
- **Resume manually**: if the chain stops, the channel file is still source of truth. Switch any Pi session into the repo and type `pickup agents/channels/<channel>.md` to take the next turn manually.
- **Clear session state**: `rm -rf agents/channels/.sessions/` to force fresh sessions on the next chain run.
- **Inspect**: `tail -f .dispatch-auto.log` while the chain runs.
