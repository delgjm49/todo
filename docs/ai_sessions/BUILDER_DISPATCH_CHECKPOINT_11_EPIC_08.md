# Builder Dispatch: Checkpoint 11 / EPIC-08 Formatting Resolution Helpers

## Objective

Implement the next constrained checkpoint immediately after the accepted selection-model pass.

This checkpoint is limited to:

- `TICKET-040` implement formatting merge/resolution helpers

Stop at the checkpoint boundary.

Do not start:

- `TICKET-041` inspector shell and target summary work
- `TICKET-042` text formatting controls
- `TICKET-043` border formatting controls
- `TICKET-044` formatting persistence
- checkbox automation behavior
- sorting
- clipboard
- alerts

## Current Repo State

Checkpoint 10 is accepted and closed.

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
- base and advanced typed cell renderers
- persisted text/checkbox/date/time/dropdown cell mutations through `documentStore`
- row add / insert / delete UI flows
- row drag reorder with transient drag state reset discipline

Current constraints that must remain true:

- persistence stays routed through `documentStore`
- business logic stays out of React components where practical
- transaction/history/autosave behavior must not regress
- current selection, menu, and drag behavior must not regress
- this checkpoint should remain mostly pure-domain helper work

## Required Read Order

Read before changing code:

1. `docs/ai_sessions/HANDOFF.md`
2. `docs/ai_sessions/STATUS.md`
3. `docs/TODO_APP_PLAN.md`
4. `docs/TODO_APP_TECH_SPEC.md`
5. `docs/TODO_APP_UI_SPEC.md`
6. `docs/TODO_APP_IMPLEMENTATION_BACKLOG.md`

Then inspect the current implementation in:

- `src/types/formatting.ts`
- `src/types/settings.ts`
- `src/types/block.ts`
- `src/types/column.ts`
- `src/types/row.ts`
- `src/components/cell/CellRenderer.tsx`
- `src/components/row/RowView.tsx`
- `src/components/block/BlockCard.tsx`
- `src/domain/formatting/` (currently empty placeholder area)
- `src/tests/unit/`

## Scope Details

### TICKET-040: Formatting merge/resolution helpers

Add the pure helpers the UI will later need to compute effective formatting from layered overrides.

Required helper coverage:

- merge formatting helper
- resolve cell formatting
- resolve row styling

Acceptance target for this checkpoint:

- the UI can compute effective formatting from layered overrides

This is primarily domain logic. The checkpoint does not need to expose inspector controls or durable formatting mutations yet.

Suggested files:

- `src/domain/formatting/mergeFormatting.ts`
- `src/domain/formatting/resolveCellFormatting.ts`
- `src/domain/formatting/resolveRowStyle.ts`
- `src/domain/formatting/formattingTypes.ts` only if an additional helper type is truly needed
- `src/tests/unit/formattingHelpers.test.ts` (new)

### Resolution order

Follow the accepted layered model from the planning docs:

1. app defaults
2. block format
3. column format
4. row format
5. cell format

The helpers should make that order explicit and testable.

### Output expectations

The helpers should:

- treat formatting overrides as sparse objects
- omit no-op layering behavior
- leave durable document shapes unchanged
- be deterministic and framework-agnostic

Prefer returning plain merged objects rather than entangling these helpers with React props or CSS classes.

### Scope boundary

Allowed:

- small, targeted read-only UI wiring if needed to prove helper outputs in an existing component
- helper exports and test coverage

Not allowed:

- inspector controls
- formatting persistence mutations
- large visual restyles across the grid
- checkbox automation behavior

If you touch existing components, keep the UI impact minimal and directly tied to helper verification.

## Tests Required

Add or update tests alongside the implementation.

Required coverage:

- merge behavior for text and border properties
- inheritance precedence across app/block/column/row/cell layers
- empty override behavior
- row-style resolution behavior
- cell-style resolution behavior

At minimum, verify:

- later layers override earlier layers
- omitted properties inherit correctly
- empty override objects do not erase inherited values
- text-bearing formatting fields and border fields both merge predictably
- helper outputs remain stable when some layers are absent

Suggested test files:

- `src/tests/unit/formattingHelpers.test.ts` (new)
- add a narrow existing test update only if a component readout is used to prove integration

## Verification Commands

Run all of these before handing back:

- `npm run typecheck`
- `npm run test`
- `npm run build`
- `npm run lint`

Use the actual local shell available in the environment. In this repo that normally means PowerShell.

If `npm run build` hits the known sandbox `spawn EPERM` restriction, rerun it through the approved escalation path before deciding it failed.

## Non-Negotiable Guardrails

- keep work inside `TICKET-040`
- do not start inspector UI work
- do not start formatting persistence
- do not start checkbox automation behavior
- do not start sorting, clipboard, or alerts
- do not regress accepted selection, menu, drag, or typed-cell behavior
- keep the logic pure and testable
- do not move durable document state into `uiStore`

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
