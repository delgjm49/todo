# Dispatch: TICKET-013 Store Selectors and Action Helpers

## What
Add a small selector/helper layer for common document and selection lookups so components and future features do not repeat ad hoc tree-walking through workspaces, blocks, columns, rows, and cells. Keep this as a focused utility/store-support ticket, not a UI feature.

## Why
`TICKET-013` is a small backlog item that reduces coupling before the next behavior-heavy work. The app already has `documentStore` and `uiStore`; this dispatch should make common reads and selection-derived lookups reusable and testable.

## Scope
- Create or extend a lightweight helper/selector module for common document lookups, such as active workspace, block by id, column by id, row by id, and cell/selection target resolution.
- Add selection helper(s) that convert the current `Selection` into a resolved target object or explicit missing/not-found result without throwing.
- Add focused unit tests for valid and stale/missing lookups.
- Keep existing component behavior unchanged except for safe internal adoption if it is trivial and localized.
- Explicitly out of scope: checkbox automation, formatting UI changes, storage/schema changes, autosave changes, history behavior changes, and broad component refactors.

## Related Spec Sections
- docs/TODO_APP_IMPLEMENTATION_BACKLOG.md `TICKET-013: Add store selectors and action helpers`

## Constraints
- Prefer pure functions that accept store/document state over hooks with hidden subscriptions, unless Plan identifies an existing project pattern that clearly fits better.
- Do not introduce new runtime dependencies.
- Do not change persisted JSON shapes.
- Preserve existing public store actions and behavior.
- Keep the implementation small; if a helper would require broad rewiring, leave it documented for later instead of expanding this ticket.

## Acceptance Criteria
- [ ] Components/future code can resolve common document entities through stable helper(s) instead of hand-rolled tree walking.
- [ ] Selection resolution handles `none`, block, column, row, cell, and stale/missing references gracefully.
- [ ] Unit coverage proves valid and stale/missing lookup behavior.
- [ ] Existing verification remains green: typecheck, unit tests, build, and lint.
