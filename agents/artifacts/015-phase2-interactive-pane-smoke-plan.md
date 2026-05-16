# Plan: Phase 2 Interactive Pane Smoke

## Overview
Run a tiny artifact-only smoke test for dispatch-auto Phase 2 interactive Pi worker panes. Dev should create one disposable marker artifact and one complete artifact, then route to Review; no application, test, config, product-doc, orchestration, dispatch-auto, or external script files should change.

## Prerequisites
- Continue from `agents/channels/015-phase2-interactive-pane-smoke-channel.md` using the simple route `Main → Plan → Dev → Review → Main`.
- Preserve dispatch channel history; only append the next sequential message and update the Summary current-status metadata line.
- Do not commit; Main handles git operations.

## Files to Create/Modify
| Action | Path | Description |
|--------|------|-------------|
| Create | `agents/artifacts/015-phase2-interactive-pane-smoke-marker.md` | Disposable Dev marker. Must include the exact line `phase2-interactive-smoke: dev-complete`. |
| Create | `agents/artifacts/015-phase2-interactive-pane-smoke-complete.md` | Complete artifact documenting files changed and lightweight verification results. |
| Modify | `docs/SESSIONS.md` | Append a Dev session entry at close. |
| Modify | `agents/channels/015-phase2-interactive-pane-smoke-channel.md` | Update `Current status` to `ready-for-review` and append the next `Dev → Review` message. |

## Implementation Steps

### Step 1: Create the disposable marker artifact
- Create `agents/artifacts/015-phase2-interactive-pane-smoke-marker.md`.
- Include the exact line `phase2-interactive-smoke: dev-complete`.
- Add only a short note that the file is a disposable smoke-test marker; do not add source code or product documentation.
- **Verify**: Confirm the marker file exists and contains the exact required line.

### Step 2: Create the complete artifact
- Create `agents/artifacts/015-phase2-interactive-pane-smoke-complete.md` using the Complete artifact structure from `agents/ARTIFACTS.md`.
- List the marker and complete artifact as created files, plus workflow-only updates to `docs/SESSIONS.md` and the dispatch channel.
- Record deviations as `(None)`, open questions as `(None)`, and known issues as `(None)` unless something unexpected occurs.
- Include verification reports in the `agents/CLOSING.md` command-result format.
- **Verify**: Confirm the complete artifact exists and references the marker path.

### Step 3: Run lightweight artifact-only verification
- Run only lightweight checks, such as:
  - verifying `agents/artifacts/015-phase2-interactive-pane-smoke-marker.md` contains `phase2-interactive-smoke: dev-complete`;
  - verifying `agents/artifacts/015-phase2-interactive-pane-smoke-complete.md` exists;
  - `git diff --check` for whitespace/conflict-marker issues.
- Do not run the full app test suite unless an unexpected artifact-edit issue requires it.
- Do not modify app source, app tests, package/Tauri config, product docs, orchestration config, dispatch-auto code, or external scripts.
- **Verify**: Record each command in the complete artifact with command, shell, result, failure surface if any, scope, and whether it used the actual shell provided by the environment.

### Step 4: Close Dev workflow
- Append a Dev session entry to `docs/SESSIONS.md`.
- Update `agents/channels/015-phase2-interactive-pane-smoke-channel.md` Summary `Current status` to `ready-for-review`.
- Append exactly one new `## Message 3 — Dev → Review — 2026-05-16` block to the dispatch channel, preserving all prior channel history.
- The Review message should ask Review to confirm the marker/artifacts and verify that no app source, app tests, package/Tauri config, product docs, orchestration config, dispatch-auto code, or external script changes were introduced.
- **Verify**: Confirm the channel now routes to Review and has no rewritten prior messages.

## Data / Storage Changes
None. This dispatch creates only disposable workflow artifacts and session/channel bookkeeping.

## UI Specifications
None. No application UI changes are in scope.

## Acceptance Criteria
- [ ] Dev creates `agents/artifacts/015-phase2-interactive-pane-smoke-marker.md` with the exact line `phase2-interactive-smoke: dev-complete`.
- [ ] Dev creates `agents/artifacts/015-phase2-interactive-pane-smoke-complete.md` with lightweight verification results.
- [ ] Dev updates `docs/SESSIONS.md` and appends a `Dev → Review` channel message without rewriting channel history.
- [ ] No app source, app tests, package/Tauri config, product docs, orchestration config, dispatch-auto code, or external script files are changed.
- [ ] The route remains `Main → Plan → Dev → Review → Main` unless documented recovery is required.

## Dependencies or Prerequisites
- `agents/artifacts/015-phase2-interactive-pane-smoke-dispatch.md`
- `agents/ARTIFACTS.md`
- `agents/CLOSING.md`
- `agents/workflows/dispatch-channel-protocol.md`

## Estimated Complexity
- Small
- Expected file count: 4 touched by Dev (`marker`, `complete`, `docs/SESSIONS.md`, channel)
