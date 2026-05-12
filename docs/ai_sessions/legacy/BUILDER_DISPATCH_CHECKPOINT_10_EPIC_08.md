# Builder Dispatch: Checkpoint 10 / EPIC-08 Selection Model Entry

## Objective

Implement the next constrained checkpoint immediately after the accepted column-mutation pass.

This checkpoint is limited to:

- `TICKET-039` implement selection model across block/column/row/cell

Stop at the checkpoint boundary.

Do not start:

- `TICKET-040` formatting merge/resolution helpers
- `TICKET-041` inspector shell and target summary work
- formatting controls or persistence
- sorting
- clipboard
- alerts
- column resize polish

## Current Repo State

Checkpoint 9 is accepted and closed.

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
- pure column helpers
- pure row helpers
- display-only column header row
- base and advanced typed cell renderers
- persisted text/checkbox/date/time/dropdown cell mutations through `documentStore`
- row add / insert / delete UI flows
- row drag reorder with transient drag state reset discipline

Current constraints that must remain true:

- persistence stays routed through `documentStore`
- business logic stays out of React components where practical
- transaction/history/autosave behavior must not regress
- block, column, and row menu dismissal behavior must not regress
- block/row/typed-cell editing behavior must not regress

## Required Read Order

Read before changing code:

1. `docs/ai_sessions/HANDOFF.md`
2. `docs/ai_sessions/STATUS.md`
3. `docs/TODO_APP_PLAN.md`
4. `docs/TODO_APP_TECH_SPEC.md`
5. `docs/TODO_APP_UI_SPEC.md`
6. `docs/TODO_APP_IMPLEMENTATION_BACKLOG.md`

Then inspect the current implementation in:

- `src/stores/uiStore.ts`
- `src/types/ui.ts`
- `src/components/layout/MainPane.tsx`
- `src/components/block/BlockCard.tsx`
- `src/components/block/BlockColumnHeaderRow.tsx`
- `src/components/row/RowView.tsx`
- `src/components/cell/CellRenderer.tsx`
- `src/components/layout/InspectorShell.tsx`
- `src/tests/unit/uiStore.test.ts`
- `src/tests/unit/blockGridRender.test.tsx`
- `src/tests/unit/rowEditing.test.tsx`

## Scope Details

### TICKET-039: Selection model across block/column/row/cell

Add the first coherent selection model for the editable grid and block surface.

Required selection entities:

- block
- column
- row
- cell

Acceptance target for this checkpoint:

- one active inspector target is always determinable from UI state

That means the store should be able to answer, at minimum:

- selection kind
- owning workspace id where relevant
- block id where relevant
- row id where relevant
- column id where relevant

Suggested files:

- `src/types/ui.ts`
- `src/stores/uiStore.ts`
- `src/components/layout/MainPane.tsx`
- `src/components/block/BlockCard.tsx`
- `src/components/block/BlockColumnHeaderRow.tsx`
- `src/components/row/RowView.tsx`
- `src/components/cell/CellRenderer.tsx`

### UI expectations

This checkpoint should add visible but restrained selection treatment.

Expected visual behavior:

- block selection: subtle outline or header emphasis
- column selection: header emphasis
- row selection: row background emphasis
- cell selection: strongest focus ring or border treatment

Rules:

- only one active inspector target at a time
- selecting a more specific entity replaces a broader one
- selection should be obvious without looking decorative
- selection should survive routine clicks within the same target, but it does not need advanced keyboard navigation yet

### Inspector boundary

Do not turn this checkpoint into inspector work.

Allowed:

- minimal wiring so the current UI state can determine the active target cleanly
- a tiny placeholder/readout if absolutely necessary to prove state wiring

Not allowed:

- real inspector target summary UI from `TICKET-041`
- formatting controls
- formatting persistence

### Interaction boundary

Keep this checkpoint intentionally narrow.

In scope:

- selecting block chrome
- selecting column headers
- selecting row surfaces
- selecting cells
- clearing or replacing selection when the user chooses a different target

Out of scope:

- keyboard selection navigation
- multi-select
- range selection
- clipboard integration
- selection-driven formatting actions
- alert-target highlight behavior

### Store guidance

This checkpoint should primarily expand `uiStore`.

Requirements:

- selection state remains ephemeral in `uiStore`
- durable document data stays out of `uiStore`
- selection changes must not create document history entries
- selection state should reset safely on settings navigation where appropriate
- menu-opening behavior should remain coherent with selection behavior

## Tests Required

Add or update tests alongside the implementation.

Required coverage:

- `uiStore` selection-state transitions
- active target replacement rules
- settings-screen reset behavior if selection is cleared there
- UI coverage for visible selection treatment where practical

At minimum, verify:

- selecting a block sets block selection state
- selecting a column replaces block selection with column selection
- selecting a row replaces broader selection with row selection
- selecting a cell replaces broader selection with cell selection
- selection styling appears on the active target
- menu and drag behavior still work after selection state is introduced

Suggested test files:

- `src/tests/unit/uiStore.test.ts`
- `src/tests/unit/blockGridRender.test.tsx`
- `src/tests/unit/rowEditing.test.tsx`
- add a focused new test file if selection interaction coverage becomes awkward inside existing tests

## Verification Commands

Run all of these before handing back:

- `npm run typecheck`
- `npm run test`
- `npm run build`
- `npm run lint`

Use the actual local shell available in the environment. In this repo that normally means PowerShell.

If `npm run build` hits the known sandbox `spawn EPERM` restriction, rerun it through the approved escalation path before deciding it failed.

## Non-Negotiable Guardrails

- keep work inside `TICKET-039`
- do not start formatting helpers or formatting persistence
- do not start inspector target-summary work beyond minimal state proofing if strictly necessary
- do not start sorting, clipboard, or alerts
- do not regress accepted block, row, column, or typed-cell behavior
- do not move durable state into `uiStore`
- do not create history/autosave entries from selection-only changes

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
