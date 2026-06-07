# Dispatch: Hide-completed rows implementation

## What
Implement the reviewed recommendation from dispatch 084: add a derived hide-completed-rows filter on blocks, persisted as the backward-compatible `Block.hideCompletedRows: boolean` preference. No persisted row archive state or destructive behavior.

## Why
Completes the archive/completed-views planning work. Gives users a non-destructive way to hide completed checklist rows while preserving all existing data and behavior.

## Scope
- Add `hideCompletedRows` boolean preference to the Block model (default false for backward compatibility)
- Implement derived filtering in the row list / block view layer
- Wire the preference into the existing workspace/block settings UI (or a minimal toggle if no existing surface)
- Persist the preference via the normal block storage path
- Update relevant unit and integration tests
- No changes to row storage, no archive lifecycle, no new data model

Out of scope: explicit archive state, row deletion lifecycle, search integration, any UI beyond the minimal toggle.

## Related Spec Sections
- docs/TODO_APP_TECH_SPEC.md (Block model, derived state, preferences)
- docs/TODO_APP_UI_SPEC.md (block settings, row list behavior)
- Dispatch 084 planning artifact (reviewed recommendation)

## Constraints
- Must remain fully backward-compatible (`hideCompletedRows` absent or false → all rows visible)
- Use existing Zustand stores and JSON storage patterns
- Add or update tests (Vitest + Playwright) for the filter behavior
- No new dependencies

## Acceptance Criteria
- [ ] `Block.hideCompletedRows` preference exists, defaults to false, persists correctly
- [ ] When true, completed rows are filtered out of the visible list (derived, non-destructive)
- [ ] When false (or unset), all rows including completed ones remain visible
- [ ] Preference toggle is accessible from block/workspace settings
- [ ] Existing clipboard, sort, alert, and search behavior unaffected
- [ ] Relevant tests pass
- [ ] No unrelated files modified at close

## Dispatch Metadata
- Number: 086
- Type: Main → Plan
- Auto-close authorized: yes
- Follows dispatch 084 planning artifact (reviewed)