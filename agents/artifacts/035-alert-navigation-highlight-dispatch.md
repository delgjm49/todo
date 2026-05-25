# Dispatch: Alert Navigation and Highlight

## What
Build alert navigation and highlight behavior so that when a user selects a workspace that has active alerts, the app automatically navigates to the alert target (block/row), scrolls it into view, and applies a brief visual flash to draw attention. This completes the alerts epic user journey: alerts are evaluated (053), scheduled (054), shown in the dock (055), and now actionable (056).

## Why
The alerts epic currently shows alert counts in the dock, but clicking a workspace with alerts only opens the workspace — the user still has to manually hunt for the alerted row. This ticket makes alerts actionable by bringing the user directly to the relevant item with a visible highlight.

## Scope

### In scope
- **Alert target selection**: when a workspace is selected and its `alertSummary` contains `blockId`/`rowId`/`columnId`, set the UI selection to that target row/cell
- **Scroll into view**: scroll the target block/row into the visible viewport. Use `scrollIntoView` or equivalent; handle both the block-level scroll (within MainPane) and row-level scroll (within BlockCard)
- **Flash highlight**: apply a temporary CSS highlight class (e.g., `ring-2 ring-warning` or `bg-warning/10` pulse) to the target row for 2–3 seconds, then remove it
- **Session deduplication**: track flashed targets in a session-level Set so the same unresolved alert is not re-flashed on repeated workspace selections or scheduler re-evaluations
- **Edge case handling**: 
  - If the alert target no longer exists (row deleted, block removed), silently clear the alert summary and do nothing
  - If the workspace has alerts but no `blockId`/`rowId` (count-only summary), just open the workspace without scrolling/flashing
  - If the target is already visible in the viewport, still flash it
- **Tests** covering: alert target navigation, scroll behavior, flash application/removal, deduplication, missing target handling

### Out of scope
- Closed-app notifications or system alerts
- Sound or haptic feedback
- Persistent "seen" state across app restarts
- Clicking the dock badge directly (the workspace card itself handles selection)
- Multi-alert navigation (cycling through multiple alerts in one workspace)
- Alert dismissal or "mark as read" behavior

## Related Spec Sections
- docs/TODO_APP_TECH_SPEC.md §Alert Scheduler Design (flash animation deduplication note)
- docs/TODO_APP_IMPLEMENTATION_BACKLOG.md TICKET-056

## Data Model Context
- `WorkspaceAlertSummary` contains: `{ count: number; note?: string; blockId?: string; rowId?: string; columnId?: string }`
- The primary alert target is the `blockId`/`rowId`/`columnId` in the summary
- `documentStore` holds `activeWorkspaceId` and workspace documents
- `uiStore` holds `selection` state (`kind: "none" | "block" | "column" | "row"` with corresponding IDs)
- No scroll infrastructure currently exists in the codebase

## Constraints
- Use existing store patterns (Zustand, `getState()` / `setState()`)
- Flash animation should use CSS transitions or Tailwind `animate-*` utilities, not JS animation libraries
- Scroll behavior should be smooth (`behavior: "smooth"` or equivalent)
- The deduplication Set should live in module-level state or a ref (not persisted to storage)
- Follow existing component patterns for adding `data-*` attributes for DOM targeting if needed
- Add tests alongside implementation
- `npm run test` must pass
- `npm run lint` must pass

## Acceptance Criteria
- [ ] When a workspace with alerts is selected, the UI selection is set to the alert target row (and optionally column)
- [ ] The target block/row is scrolled into the visible viewport
- [ ] The target row receives a temporary visual flash/highlight that fades after 2–3 seconds
- [ ] The same unresolved alert target is not re-flashed during the same app session
- [ ] If the alert target no longer exists, the alert summary is cleared and no error occurs
- [ ] If the alert summary has no `blockId`/`rowId`, the workspace opens normally without scroll/flash
- [ ] Tests cover: navigation to target, scroll behavior, flash application/removal, deduplication, missing target
- [ ] `npm run test` passes (including new tests)
- [ ] `npm run lint` passes
