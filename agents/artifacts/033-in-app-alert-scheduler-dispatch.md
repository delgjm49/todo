# Dispatch: In-App Alert Scheduler

## What
Build a lightweight in-app alert scheduler that periodically evaluates all workspaces for active alerts and updates the workspace index with computed `WorkspaceAlertSummary` values. The scheduler makes the alert evaluation logic from TICKET-053 "live" — alert counts update automatically while the app is open without requiring manual refresh.

## Why
TICKET-053 created the pure domain evaluation layer (`evaluateRow`, `evaluateWorkspace`) and confirmed it works correctly. But nothing currently calls these functions automatically. The dock badge UI (`WorkspaceCard` reading `alertSummary?.count`) and the column alert toggles already exist, but the alert counts are always zero/null because no scheduler runs the evaluation. This ticket bridges that gap.

## Scope

### In scope
- **Scheduler hook/service**: a React hook or lightweight service (e.g., `useAlertScheduler` or `alertScheduler.ts`) mounted in the app shell
- **Startup scan**: evaluate all workspaces on app startup and populate alert summaries
- **Interval polling**: re-evaluate all workspaces every 30–60 seconds while the app is open
- **Edit-triggered scan**: re-evaluate the affected workspace when a date/time cell value changes (via `updateDateCellValue` / `updateTimeCellValue`)
- **Store integration**: update `alertSummary` on the corresponding `WorkspaceIndexEntry` in `documentStore` when evaluation produces a new summary
- **Cleanup**: clear interval on unmount; avoid memory leaks
- **Unit/integration tests** covering: startup scan, interval firing, edit-triggered re-evaluation, cleanup on unmount, no-op when no alert-enabled columns exist

### Out of scope
- Dock indicator rendering changes (TICKET-055 — `WorkspaceCard` already reads `alertSummary`; this ticket provides the data)
- Alert navigation and flash highlight (TICKET-056)
- Flash animation deduplication across repeated evaluations
- Closed-app notifications or system tray alerts
- macOS notification center integration
- Push/webhook notifications
- Alert history or "snooze" behavior

## Related Spec Sections
- docs/TODO_APP_TECH_SPEC.md §Alert Scheduler Design (polling strategy, trigger events)
- docs/TODO_APP_IMPLEMENTATION_BACKLOG.md TICKET-054

## Data Model Context
- `evaluateWorkspace(workspaceDocument, columns, now)` from `src/domain/alerts/` (TICKET-053) produces `WorkspaceAlertSummary | null`
- `WorkspaceIndexEntry.alertSummary?: WorkspaceAlertSummary | null` — lives in `documentStore.workspaceIndex`
- `WorkspaceCard` already renders `entry.alertSummary?.count` as a badge
- Date/time cell edits go through `documentStore.updateDateCellValue()` and `updateTimeCellValue()`
- No store action currently exists for updating `alertSummary` on a workspace index entry

## Constraints
- Keep the scheduler lightweight — avoid heavy computation on every render
- Use `setInterval` or `requestAnimationFrame`-based polling (not a background worker) for v1
- The scheduler should be idempotent: re-running evaluation on the same unchanged data produces the same summary
- Follow existing patterns: hooks live in `src/hooks/`, services in `src/services/`
- Store integration should follow existing Zustand patterns (direct `getState()` / `setState()` or action-based updates)
- Add tests alongside implementation
- `npm run test` must pass
- `npm run lint` must pass

## Acceptance Criteria
- [ ] A scheduler hook/service exists and is mounted in the app (e.g., in `AppShell` or equivalent)
- [ ] On app startup, all workspaces are evaluated and their `alertSummary` fields are populated
- [ ] Workspaces are re-evaluated on a configurable interval (30–60 seconds) while the app is open
- [ ] When a date or time cell value is edited, the affected workspace is re-evaluated promptly
- [ ] The computed `WorkspaceAlertSummary` is stored on the corresponding `WorkspaceIndexEntry` in `documentStore`
- [ ] If a workspace has no active alerts, its `alertSummary` is set to `null` (so the dock badge disappears)
- [ ] Interval is cleaned up on component unmount (no memory leaks)
- [ ] Unit/integration tests cover: startup scan, interval behavior, edit-triggered re-evaluation, cleanup, workspace with no alerts
- [ ] `npm run test` passes (including new tests)
- [ ] `npm run lint` passes
