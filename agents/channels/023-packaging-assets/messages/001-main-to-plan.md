# Message 001 — Main → Plan — 2026-05-16

## From
Main

## To
Plan

## State
ready-for-plan

## Read
- agents/artifacts/023-packaging-assets-dispatch.md
- agents/workflows/dispatch-channel-protocol.md
- agents/ARTIFACTS.md
- agents/CLOSING.md
- agents/orchestration.json

## Task
Create the implementation plan for `TICKET-064 — Packaging Assets and Windows Build Config`. This is a real productive dispatch (not a smoke test) and the first Phase 3 spool-format dispatch for a genuine backlog ticket.

**Primary objective**: Add app icon assets and fill in Tauri window/bundle metadata so the app can produce a properly identified Windows build. All changes are limited to `src-tauri/icons/` and `src-tauri/tauri.conf.json`.

The plan must:

1. **Inspect the current state** — Read `src-tauri/tauri.conf.json`, check if `src-tauri/icons/` exists and what's in it, and verify `npm run typecheck && npm run build` baseline passes before making changes.

2. **Icon generation approach** — The simplest v1 approach is to generate a PNG icon programmatically (e.g., a small script or a base64-encoded minimal PNG written to disk). The icon must be a valid 1024×1024 PNG that Tauri's `icon` bundler can process. A quick check: Tauri v2 expects `src-tauri/icons/icon.png` (or the `.ico` format). The plan should specify the exact generation method (e.g., using `convert` from ImageMagick if available, or writing a minimal base64 PNG with Node.js, or using Tauri's built-in `tauri icon` CLI command if it can generate from nothing).

3. **Window config changes** — List the exact fields to add/set in `tauri.conf.json > app.windows[0]`:
   - `title`: `"Todo App"`
   - `width`: `1200`
   - `height`: `800`
   - `minWidth`: `800`
   - `minHeight`: `600`
   - `center`: `true`
   - `decorations`: `true`

4. **Bundle/config changes** — List the exact fields to add/set in `tauri.conf.json`:
   - `app > identifier`: `"com.todoapp.desktop"`
   - `bundle > publisher`: `"Todo App"`
   - `bundle > copyright`: `"Copyright (c) 2026. All rights reserved."`
   - `bundle > icon`: `["icons/icon.png"]`

5. **Verification** — After changes:
   - Confirm `npm run typecheck` still passes.
   - Confirm `npm run build` succeeds.
   - Run `npm run tauri build -- --bundles none` (or determine the correct Tauri v2 config validation command) to confirm config is valid.

6. **Spool-format guidance for workers** — Include the standard spool warnings from previous dispatches:
   - Messages are individual files in `agents/channels/023-packaging-assets/messages/`.
   - Pickup path is `agents/channels/023-packaging-assets/` (directory, trailing slash).
   - Each agent creates exactly one new message file with the next sequential number.
   - No agent may modify an existing message file.

7. **Route**: `Main → Plan → Dev → Review → Main` (single pass — no forced re-review loop since this is a real task, not a smoke test).

Write the plan to `agents/artifacts/023-packaging-assets-plan.md`.

### Close Requirements
- Append the next message file (`002-plan-to-dev.md`) to this channel's `messages/` directory.
- Update `docs/SESSIONS.md` with a Plan session entry.
- Do not commit; Main handles git.
