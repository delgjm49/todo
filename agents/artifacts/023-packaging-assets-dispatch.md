# Dispatch: Packaging Assets and Windows Build Config (TICKET-064)

## What

Add static packaging assets (app icon) and fill in Tauri window/build metadata so the app can produce a properly identified Windows build. This is an EPIC-11 config/assets-only task — no source code in `src/` is touched.

## Why

`TICKET-064` is a P1 MVP requirement. Without an app icon, proper window metadata, and packaging identity, we cannot produce a shippable Windows build. The scaffold has been in place since TICKET-001; this ticket fills in the remaining config gaps.

## Scope

1. **App icon** — Generate a simple placeholder app icon in the `src-tauri/icons/` directory covering the sizes Tauri expects. Tauri v2 expects at least `icon.png` (1024×1024) and will generate platform-specific sizes from it, plus `.ico` for Windows. A simple colored-square SVG or generated PNG is sufficient for v1.

2. **Window metadata** — Set in `src-tauri/tauri.conf.json` under `app.windows[0]`:
   - `title`: meaningful app window title
   - `width` / `height`: sensible default dimensions
   - `minWidth` / `minHeight`: prevent degenerate window sizes
   - `center`: true (center on launch)
   - `decorations`: true (native OS chrome)

3. **Packaging/bundle metadata** — Set in `src-tauri/tauri.conf.json` under `app` / `bundle`:
   - `identifier`: reverse-domain (e.g. `com.todoapp.desktop`)
   - `publisher`: publisher name
   - `copyright`: copyright string
   - `icon`: reference the generated icon asset

4. **Build verification** — Confirm:
   - `npm run typecheck` passes (no source changes)
   - `npm run build` succeeds
   - `npm run tauri build -- --bundles none` validates config without producing a full package (or equivalent config-only validation)

## Explicitly OUT of Scope

- Custom/artistic icon design beyond a simple generated placeholder
- NSIS/MSI installer configuration customization
- Code signing setup or certificates
- App cast / update configuration
- Windows Store packaging metadata
- Linux or macOS packaging config beyond what Tauri requires for build validation
- Any changes to `src/`, app behavior, tests, or storage

## Related Spec Sections

- `docs/TODO_APP_IMPLEMENTATION_BACKLOG.md` TICKET-064
- `src-tauri/tauri.conf.json` existing window and bundle stubs
- Tauri v2 configuration reference: https://v2.tauri.app/reference/config/

## Constraints

- Must not break `npm run typecheck`, `npm run build`, or `npm run tauri build` validation.
- Must not modify any file under `src/` or `src-tauri/src/`.
- Icon must be a valid PNG or ICO that Tauri's build tooling can process without errors.
- All changes must be to `src-tauri/tauri.conf.json` and `src-tauri/icons/` only (plus the dispatch's own agent artifacts).

## Acceptance Criteria

- [ ] `src-tauri/icons/` contains at minimum a valid `icon.png` (1024×1024) that Tauri build tooling accepts.
- [ ] `tauri.conf.json > app.windows[0]` has `title`, `width`, `height`, `minWidth`, `minHeight`, `center`, and `decorations` set appropriately.
- [ ] `tauri.conf.json > app > identifier` is a valid reverse-domain string.
- [ ] `tauri.conf.json > bundle` has `publisher`, `copyright`, and `icon` referencing the generated assets.
- [ ] `npm run typecheck` passes without changes to `src/`.
- [ ] `npm run build` succeeds.
- [ ] `npm run tauri build -- --bundles none` (or equivalent) validates the configuration without errors.
