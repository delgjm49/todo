# Dispatch: Text Formatting Controls

## What
Implement the next EPIC-08 checkpoint: inspector-driven text formatting controls for the active selection target. Users should be able to apply supported text formatting overrides to block, column, row, and cell selections and see the result immediately in the editor surface.

## Why
The selection model, formatting resolution helpers, and inspector target summary are now complete. Text formatting controls are the next MVP Core formatting layer before border controls, formatting reload verification, and checkbox automation.

## Scope
- Implement `TICKET-042`: text formatting controls.
- Add inspector controls for font family, font size, bold, italic, underline, text color, and fill/background color.
- Apply formatting at supported selected target levels: block, column, row, and cell.
- Use existing formatting types and resolution helpers rather than duplicating precedence logic.
- Render effective text/fill formatting in the block grid so changes are visible immediately.
- Add or update document-store actions/domain helpers as needed for sparse formatting overrides.
- Add tests for applying formatting to each supported target level and for visible/effective formatting behavior where practical.
- Explicitly out of scope: border controls (`TICKET-043`).
- Explicitly out of scope: dedicated persistence/reload verification for formatting (`TICKET-044`), except that in-memory document state should remain compatible with current JSON shapes/autosave.
- Explicitly out of scope: checkbox automation, sorting, clipboard, alerts, settings defaults UI, or packaging.

## Related Spec Sections
- `docs/TODO_APP_IMPLEMENTATION_BACKLOG.md` — `TICKET-042: Implement text formatting controls`
- `docs/TODO_APP_UI_SPEC.md` — Region 4: Right Inspector; Inspector sections; Selection Model; Cell Design
- `docs/TODO_APP_TECH_SPEC.md` — Formatting Resolution; Component Responsibilities: `FormatInspector`; `documentStore` actions
- `docs/TODO_APP_PLAN.md` — Formatting Model; Rich Text Scope Decision

## Current State Context
Implemented and reviewed already:

- `TICKET-039` selection model for block/column/row/cell
- `TICKET-040` pure formatting merge/resolution helpers
- `TICKET-041` read-only inspector target summary
- core row/cell editing and typed cell renderers
- column context menus and mutation flows

Useful current files to inspect:

- `src/components/layout/InspectorShell.tsx`
- `src/components/layout/inspectorTargetSummary.ts`
- `src/domain/formatting/mergeFormatting.ts`
- `src/domain/formatting/resolveCellFormatting.ts`
- `src/domain/formatting/resolveRowStyle.ts`
- `src/types/formatting.ts`
- `src/types/block.ts`
- `src/types/column.ts`
- `src/types/row.ts`
- `src/stores/documentStore.ts`
- `src/components/row/RowView.tsx`
- `src/components/cell/CellRenderer.tsx`
- `src/tests/unit/formattingHelpers.test.ts`
- `src/tests/unit/inspectorTargetSummary.test.ts`
- `src/tests/unit/documentStore.test.ts`

## Constraints
- Keep work inside `TICKET-042`.
- Do not implement border UI or border rendering in this dispatch.
- Do not implement a full formatting persistence/reload QA pass; that remains `TICKET-044`.
- Do not add inline partial rich text; v1 formatting applies to whole block/column/row/cell levels only.
- Store sparse overrides only; unset properties should inherit.
- Include a reset-to-inherited path for each editable text formatting property, or plan a clearly equivalent control behavior.
- Formatting mutations must flow through `documentStore`/domain helpers, not ad hoc component-local document edits.
- Preserve accepted selection, menu, drag, typed-cell, row, block, workspace, history, and autosave behavior.
- Use the actual shell provided by the environment for verification.

## Acceptance Criteria
- [ ] Inspector shows a text formatting section for block, column, row, and cell selections.
- [ ] No-selection state does not expose invalid target-specific mutation controls.
- [ ] Font family, font size, bold, italic, underline, text color, and fill/background color can be set for supported targets.
- [ ] Each editable text formatting property has a reset-to-inherited path or equivalent explicit unset behavior.
- [ ] Formatting overrides update the persistent document state in memory through store/domain actions.
- [ ] Effective formatting resolves through app → block → column → row → cell precedence using existing helpers.
- [ ] Block/row/cell grid rendering visibly reflects text/fill formatting changes immediately.
- [ ] Formatting controls do not mutate unrelated targets or corrupt selection state.
- [ ] Unit/UI tests cover formatting application for block, column, row, and cell targets.
- [ ] `npm run typecheck`, `npm run test`, `npm run build`, and `npm run lint` are run and reported using the required verification format.
