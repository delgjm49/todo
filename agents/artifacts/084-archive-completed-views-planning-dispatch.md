# Dispatch: Archive/Completed Views Planning

## What
Create a reviewed planning/audit artifact that defines row lifecycle semantics before any archive/completed-view implementation. This dispatch should decide whether a first archive/completed view slice is safe and valuable, and if so describe the narrowest implementable scope, data model implications, tests, risks, and acceptance criteria.

## Why
Post-MVP planning identified archive/completed views as useful but higher-risk than read-only/search and date/time picker polish because the app currently has checkbox-derived completion behavior, not a universal row lifecycle model. Before implementing hiding/restoring/archive features, the project needs a grounded decision about what “completed” means today, how it differs from “archived,” and whether persisted archive state is needed.

## Scope
- Audit current row completion behavior, especially checkbox-derived completion via strikeout-enabled checkbox columns and move-checked-to-bottom automation.
- Determine how completion should differ from archive state:
  - completed as a derived visual/behavioral state from checked checkbox cells;
  - archived as an explicit persisted row lifecycle state, if recommended;
  - or an alternative first slice that avoids persistence/schema risk.
- Define what future views/filters would show, hide, restore, or leave untouched.
- Identify storage/schema implications, migration risk, undo/autosave/history interactions, search/sort/alert/clipboard implications, and test impact.
- Recommend or reject a first implementation slice for a future dispatch, with concrete files/tests/acceptance criteria.

**Out of scope:**
- Product implementation in this dispatch.
- Schema migration or source/test changes, except artifact/session/channel docs required by the workflow.
- Data-destructive behavior or any change that hides rows without a clear restore path.
- Full task-management lifecycle overhaul beyond the first safe slice recommendation.

## Related Spec Sections
- `agents/artifacts/073-post-mvp-backlog-planning-plan.md` — archive/completed views candidate comparison
- `docs/SESSIONS.md` — current post-MVP status
- Likely source/tests to inspect:
  - `src/domain/rows/applyCheckboxRules.ts`
  - `src/components/row/RowView.tsx`
  - `src/components/cell/CheckboxCell.tsx`
  - `src/components/block/ColumnContextMenu.tsx`
  - `src/components/layout/TypeSpecificColumnSettings.tsx`
  - `src/stores/documentStore.ts`
  - `src/services/storage/storageSchemas.ts`
  - `src/types/row.ts`, `src/types/block.ts`, `src/types/column.ts`
  - `src/domain/search/searchDocuments.ts`
  - `src/domain/sorting/compareValues.ts`
  - `src/domain/alerts/evaluateRow.ts`
  - `src/domain/clipboard/rowClipboardTypes.ts`
  - tests including `checkboxAutomation.test.ts`, `rowEditing.test.tsx`, `documentStore.test.ts`, `rowCellEditing.integration.test.ts`, `saveLoadRoundtrip.integration.test.ts`, `searchDocuments.test.ts`, `alertEvaluation.test.ts`, and `rowClipboard.test.ts`

## Constraints
- This is a Plan → Dev → Review planning/audit dispatch, not product implementation.
- Plan must include verified current-state facts grounded in current files/tests.
- Dev should produce a planning/audit complete artifact with a recommendation for a future implementation dispatch, not modify product source.
- If a schema change is recommended, the artifact must explain why a read-only/filter-only first slice is insufficient and outline migration/recovery risk.
- Review should verify the recommendation is grounded, non-destructive, and concrete enough for a future dispatch.
- Queue mode is pre-authorized for auto-close after Review passes.

## Acceptance Criteria
- [ ] Current checkbox-derived completion behavior is verified from disk, including strikeout and move-checked-to-bottom settings.
- [ ] The artifact clearly distinguishes completed, archived, hidden, restored, and deleted semantics.
- [ ] The artifact recommends or rejects a first archive/completed-view implementation slice with rationale.
- [ ] Data-model/storage/schema implications and migration risks are explicitly identified.
- [ ] Impacts on alerts, sorting, search, clipboard, undo/history, autosave, and tests are addressed.
- [ ] No product source implementation is performed in dispatch 084.
- [ ] Review confirms the output is sufficiently concrete and safe for future implementation scoping.
