# Builder Dispatch: Checkpoint 12 / EPIC-08 Inspector Shell and Target Summary

## Objective

Implement the next constrained checkpoint immediately after the accepted formatting-helper pass.

This checkpoint is limited to:

- `TICKET-041` build inspector shell and target summary

Stop at the checkpoint boundary.

Do not start:

- `TICKET-042` text formatting controls
- `TICKET-043` border formatting controls
- `TICKET-044` formatting persistence
- checkbox automation behavior
- sorting
- clipboard
- alerts

## Current Repo State

Checkpoint 11 is accepted and closed.

Implemented and accepted already:

- app shell
- settings shell
- workspace CRUD, styling, and reorder
- block templates
- add-block flows
- block cards and headers
- block title inline editing
- block collapse / expand
- block reorder within workspace
- move block to another workspace
- block context menu
- column context menu and mutation flows
- selection model across block/column/row/cell
- pure formatting resolution helpers
- base and advanced typed cell renderers
- persisted text/checkbox/date/time/dropdown cell mutations through `documentStore`
- row add / insert / delete UI flows
- row drag reorder with transient drag state reset discipline

Current constraints that must remain true:

- persistence stays routed through `documentStore`
- business logic stays out of React components where practical
- transaction/history/autosave behavior must not regress
- current selection, menu, drag, and edit behavior must not regress
- formatting helper logic should remain the source of truth rather than duplicated in the inspector

## Required Read Order

Read before changing code:

1. `docs/ai_sessions/HANDOFF.md`
2. `docs/ai_sessions/STATUS.md`
3. `docs/TODO_APP_PLAN.md`
4. `docs/TODO_APP_TECH_SPEC.md`
5. `docs/TODO_APP_UI_SPEC.md`
6. `docs/TODO_APP_IMPLEMENTATION_BACKLOG.md`

Then inspect the current implementation in:

- `src/components/layout/InspectorShell.tsx`
- `src/components/layout/AppShell.tsx`
- `src/components/layout/MainPane.tsx`
- `src/stores/uiStore.ts`
- `src/types/ui.ts`
- `src/domain/formatting/resolveCellFormatting.ts`
- `src/domain/formatting/resolveRowStyle.ts`
- `src/tests/unit/selectionModel.test.tsx`
- `src/tests/unit/`

## Scope Details

### TICKET-041: Build inspector shell and target summary

Turn the current placeholder inspector into a proper context-sensitive shell.

Required scope:

- collapsible panel behavior remains intact
- target summary reflects current selection type
- no-selection state is intentional and informative

Acceptance target for this checkpoint:

- inspector opens and reflects current selection type

Expected target kinds:

- none
- block
- column
- row
- cell

Suggested files:

- `src/components/layout/InspectorShell.tsx`
- `src/stores/uiStore.ts` only if a small helper/selectable summary field is truly needed
- `src/types/ui.ts` only if a small helper type is truly needed
- `src/tests/unit/inspectorShell.test.tsx` (new)

### UI expectations

The inspector should become clearly context-sensitive without turning into the formatting-controls checkpoint.

Expected shell behavior:

- a visible target summary card
- useful label text such as current target kind and name/context where available
- no-selection state with clear guidance
- existing workspace styling controls may remain visible if they do not muddy the target-summary behavior

Do not overbuild:

- no full formatting control matrix
- no persistence mutations for block/column/row/cell formatting
- no type-specific inspector settings expansion

### Data and resolution guidance

Use the current document state and selection state to derive inspector summary content.

Acceptable examples:

- `Block: Today`
- `Column: Due Date`
- `Row: 3`
- `Cell: Row 3 / Due Date`

If helpful, you may also show a small effective-format preview/readout using the new formatting helpers, but only if it stays lightweight and does not expand into full controls.

### Scope boundary

Allowed:

- refactoring `InspectorShell` into smaller display components
- read-only derivation of target labels/details from current state
- minimal tests proving the shell reflects selection changes

Not allowed:

- editable formatting controls
- persistence mutations for formatting
- large design-system or layout refactors unrelated to the inspector shell

## Tests Required

Add or update tests alongside the implementation.

Required coverage:

- no-selection state
- block target summary
- column target summary
- row target summary
- cell target summary
- inspector toggle/open behavior if touched by this checkpoint

At minimum, verify:

- inspector content changes when selection changes
- no-selection state is not blank
- target summary text is stable and understandable
- pre-existing workspace styling controls still render or are intentionally replaced in a scoped way

Suggested test files:

- `src/tests/unit/inspectorShell.test.tsx` (new)
- update an existing selection-model test only if it keeps the coverage clearer

## Verification Commands

Run all of these before handing back:

- `npm run typecheck`
- `npm run test`
- `npm run build`
- `npm run lint`

Use the actual local shell available in the environment. In this repo that normally means PowerShell.

If `npm run build` hits the known sandbox `spawn EPERM` restriction, rerun it through the approved escalation path before deciding it failed.

## Non-Negotiable Guardrails

- keep work inside `TICKET-041`
- do not start formatting controls or persistence
- do not start checkbox automation behavior
- do not start sorting, clipboard, or alerts
- do not regress accepted selection, menu, drag, typed-cell, or workspace styling behavior
- keep the inspector primarily a read-only shell in this checkpoint

## Dev Handoff Requirements

When handing off to Review:

- update the linked dispatch-channel artifact
- report completed tickets
- list exact files changed
- list store/api changes
- list tests added or updated
- list commands run and pass/fail status
- list known gaps or residual risks
- list everything intentionally deferred beyond this checkpoint
- produce a copy/paste prompt for the Review agent that references:
  - this dispatch artifact
  - the linked dispatch-channel artifact
