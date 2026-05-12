# Dispatch: Inspector Shell and Target Summary

## What
Build the next constrained UI checkpoint: a proper read-only inspector shell that reflects the current selection target. The inspector should replace the current placeholder target readout with an intentional context-sensitive summary for no selection, block, column, row, and cell targets.

## Why
The selection model and formatting resolution helpers are already implemented and reviewed. A stronger inspector shell is the next dependency boundary before adding editable text formatting controls, border controls, and formatting persistence.

## Scope
- Implement `TICKET-041`: inspector shell and target summary.
- Preserve existing collapsible inspector behavior from the top bar.
- Derive useful target labels/details from current document state plus `uiStore.selection`.
- Add an intentional no-selection state with clear guidance.
- Add test coverage for no-selection, block, column, row, and cell summaries.
- Explicitly out of scope: text formatting controls (`TICKET-042`).
- Explicitly out of scope: border formatting controls (`TICKET-043`).
- Explicitly out of scope: formatting persistence (`TICKET-044`).
- Explicitly out of scope: checkbox automation, sorting, clipboard, alerts, or packaging work.

## Related Spec Sections
- `docs/TODO_APP_IMPLEMENTATION_BACKLOG.md` — `TICKET-041: Build inspector shell and target summary`
- `docs/TODO_APP_UI_SPEC.md` — Region 4: Right Inspector; Selection Model
- `docs/TODO_APP_TECH_SPEC.md` — Component Responsibilities: `FormatInspector`; Formatting Resolution
- `docs/TODO_APP_PLAN.md` — Formatting Model; Main Window Layout

## Current State Context
Implemented and reviewed already:

- app shell, top bar, settings shell, workspace dock
- workspace CRUD, styling, and reorder
- block templates, add-block flows, block cards and headers
- block title editing, collapse/expand, reorder, move, and context menu
- row/column domain helpers, typed cells, row add/insert/delete/reorder
- column context menu and mutation flows
- selection model across block/column/row/cell
- pure formatting merge/resolution helpers

Useful current files to inspect:

- `src/components/layout/InspectorShell.tsx`
- `src/components/layout/AppShell.tsx`
- `src/components/layout/MainPane.tsx`
- `src/stores/uiStore.ts`
- `src/stores/documentStore.ts`
- `src/types/ui.ts`
- `src/domain/formatting/resolveCellFormatting.ts`
- `src/domain/formatting/resolveRowStyle.ts`
- `src/tests/unit/selectionModel.test.tsx`

Legacy checkpoint notes may be useful for background only:

- `docs/ai_sessions/legacy/STATUS.md`
- `docs/ai_sessions/legacy/HANDOFF.md`
- `docs/ai_sessions/legacy/BUILDER_DISPATCH_CHECKPOINT_12_EPIC_08.md`

## Constraints
- Keep work inside `TICKET-041`.
- The inspector should remain read-only in this checkpoint.
- Do not add formatting mutation APIs or persistence writes.
- Do not duplicate formatting-resolution business rules in React components if using formatting data; route through existing helper functions.
- Do not regress accepted selection, menu, drag, typed-cell, row, block, or workspace behavior.
- Keep durable document mutations routed through `documentStore`; this checkpoint should not need new document mutations.
- Use the actual shell provided by the environment for verification.

## Acceptance Criteria
- [ ] Inspector has a visible target summary card or equivalent shell section.
- [ ] No-selection state is intentional, useful, and non-blank.
- [ ] Block selection shows a block summary, preferably including the block title.
- [ ] Column selection shows a column summary, preferably including the column label/type.
- [ ] Row selection shows a row summary, preferably including the row position/context.
- [ ] Cell selection shows a cell summary, preferably including row position and column label/type.
- [ ] Existing inspector toggle/open behavior remains intact.
- [ ] Existing workspace styling controls either still render or are intentionally replaced in a scoped, documented way.
- [ ] Unit tests cover no-selection, block, column, row, and cell summary behavior.
- [ ] `npm run typecheck`, `npm run test`, `npm run build`, and `npm run lint` are run and reported using the required verification format.
