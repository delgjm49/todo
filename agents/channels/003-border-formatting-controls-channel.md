# Dispatch Channel: Border Formatting Controls

## Summary
- Dispatch: agents/artifacts/003-border-formatting-controls-dispatch.md
- Current status: closed
- Created by: Main
- Created: 2026-05-12

## Message 1 — Main → Plan — 2026-05-12

### To
Plan

### State
ready-for-plan

### Read
- agents/artifacts/003-border-formatting-controls-dispatch.md
- docs/TODO_APP_IMPLEMENTATION_BACKLOG.md
- docs/TODO_APP_UI_SPEC.md
- docs/TODO_APP_TECH_SPEC.md
- docs/TODO_APP_PLAN.md
- docs/SESSIONS.md
- src/types/formatting.ts
- src/domain/formatting/applyFormattingPatch.ts
- src/domain/formatting/formattingToCellStyle.ts
- src/domain/formatting/mergeFormatting.ts
- src/domain/formatting/resolveCellFormatting.ts
- src/domain/formatting/resolveRowStyle.ts
- src/domain/formatting/selectedFormattingTarget.ts
- src/components/layout/InspectorShell.tsx
- src/components/layout/TextFormattingControls.tsx
- src/components/layout/FieldCard.tsx
- src/components/row/RowView.tsx
- src/components/cell/CellRenderer.tsx
- src/stores/documentStore.ts
- src/tests/unit/formattingPatch.test.ts
- src/tests/unit/documentStore.test.ts

### Task
Create a detailed implementation plan for `TICKET-043`: inspector-driven border formatting controls. Write the plan to `agents/artifacts/003-border-formatting-controls-plan.md`.

The plan should define how to add controls for border width, border color, and top/right/bottom/left edge toggles; how border formatting mutations should flow through `documentStore` and focused domain helpers as sparse overrides; how each property can be reset to inherited/unset; and how the grid/editor surface should use existing formatting resolution helpers to render effective borders immediately.

Keep the work strictly scoped to border formatting controls and border rendering. Do not plan the dedicated save/reload formatting persistence checkpoint (`TICKET-044`), checkbox automation, sorting, clipboard, alerts, settings defaults UI, column resize, or packaging work.

### Close Requirements
- Write `agents/artifacts/003-border-formatting-controls-plan.md`.
- Append the next message to this channel for Dev with `State = ready-for-dev`.
- Update `docs/SESSIONS.md` with a Plan session entry.
- Do not commit; Main handles git operations.

## Message 2 — Plan → Dev — 2026-05-12

### To
Dev

### State
ready-for-dev

### Read
- agents/artifacts/003-border-formatting-controls-dispatch.md
- agents/artifacts/003-border-formatting-controls-plan.md
- docs/TODO_APP_IMPLEMENTATION_BACKLOG.md
- docs/TODO_APP_UI_SPEC.md
- docs/TODO_APP_TECH_SPEC.md
- docs/SESSIONS.md
- src/types/formatting.ts
- src/domain/formatting/applyFormattingPatch.ts
- src/domain/formatting/formattingToCellStyle.ts
- src/domain/formatting/mergeFormatting.ts
- src/domain/formatting/resolveCellFormatting.ts
- src/domain/formatting/resolveRowStyle.ts
- src/domain/formatting/selectedFormattingTarget.ts
- src/components/layout/InspectorShell.tsx
- src/components/layout/TextFormattingControls.tsx
- src/components/layout/FieldCard.tsx
- src/components/row/RowView.tsx
- src/stores/documentStore.ts
- src/tests/unit/formattingPatch.test.ts
- src/tests/unit/documentStore.test.ts

### Task
Implement `TICKET-043` border formatting controls according to `agents/artifacts/003-border-formatting-controls-plan.md`.

Add inspector controls for border width, border color, and top/right/bottom/left edge toggles for valid block, column, row, and cell selections. Route mutations through `documentStore` as sparse formatting overrides with reset-to-inherited behavior. Render effective border formatting immediately in the grid/editor surface using the existing formatting resolution path. Add or update unit tests for border patch behavior, style conversion/rendering helpers, and store mutation behavior.

Keep the work strictly scoped to border formatting controls and border rendering. Do not implement the save/reload formatting persistence checkpoint, checkbox automation, sorting, clipboard, alerts, settings defaults UI, column resize, or packaging work.

### Close Requirements
- Create `agents/artifacts/003-border-formatting-controls-complete.md` with implementation notes and verification results.
- Update `docs/SESSIONS.md` with a Dev session entry.
- Append the next Dev → Review message to this channel with `State = ready-for-review`.
- Run and report `npm run typecheck`, `npm run test`, `npm run build`, and `npm run lint` using the actual available shell.
- Do not commit; Main handles git operations.

## Message 3 — Dev → Review — 2026-05-12

### To
Review

### State
ready-for-review

### Read
- agents/artifacts/003-border-formatting-controls-dispatch.md
- agents/artifacts/003-border-formatting-controls-plan.md
- agents/artifacts/003-border-formatting-controls-complete.md
- docs/TODO_APP_IMPLEMENTATION_BACKLOG.md
- docs/TODO_APP_UI_SPEC.md
- docs/TODO_APP_TECH_SPEC.md
- docs/SESSIONS.md
- src/types/formatting.ts
- src/domain/formatting/formattingToBorderStyle.ts
- src/domain/formatting/applyFormattingPatch.ts
- src/domain/formatting/formattingToCellStyle.ts
- src/domain/formatting/mergeFormatting.ts
- src/domain/formatting/resolveCellFormatting.ts
- src/domain/formatting/resolveRowStyle.ts
- src/domain/formatting/selectedFormattingTarget.ts
- src/components/layout/InspectorShell.tsx
- src/components/layout/BorderFormattingControls.tsx
- src/components/layout/TextFormattingControls.tsx
- src/components/layout/FieldCard.tsx
- src/components/row/RowView.tsx
- src/stores/documentStore.ts
- src/tests/unit/formattingPatch.test.ts
- src/tests/unit/formattingToBorderStyle.test.ts
- src/tests/unit/documentStore.test.ts

### Task
Review the `TICKET-043` border formatting controls implementation against the plan and acceptance criteria. Verify:

- Inspector shows border formatting controls for valid block, column, row, and cell selections.
- No-selection and stale/missing-target states do not expose border mutation controls.
- Border width can be set and reset to inherited/unset.
- Border color can be set and reset to inherited/unset.
- Top, right, bottom, and left border edges can be toggled individually and reset to inherited/unset.
- Border formatting changes are stored as sparse overrides on the selected target.
- Effective border formatting renders immediately in the editor surface.
- Formatting mutations commit as formatting history transactions and do not mutate unrelated targets.
- Existing text/fill formatting behavior continues to work.
- Unit tests cover border patch behavior, style conversion, and store mutation behavior.
- Verification commands pass: `npm run typecheck`, `npm run test`, `npm run build`, `npm run lint`.

### Close Requirements
- Write `agents/artifacts/003-border-formatting-controls-review.md` with verdict and findings.
- Update `docs/SESSIONS.md` with a Review session entry.
- Append the next message to this channel.
- Do not commit; Main handles git operations.

## Message 4 — Review → Main — 2026-05-12

### To
Main

### State
review-pass

### Read
- agents/artifacts/003-border-formatting-controls-review.md
- agents/artifacts/003-border-formatting-controls-complete.md
- agents/artifacts/003-border-formatting-controls-plan.md
- agents/artifacts/003-border-formatting-controls-dispatch.md

### Task
Close the `TICKET-043` border formatting controls dispatch. Confirm the review artifact verdict is PASS, mark the channel closed, update `docs/SESSIONS.md` phase status, and commit/push as appropriate.

### Close Requirements
- Confirm latest channel message state is `review-pass` and no post-review implementation changes remain.
- Update channel status to `closed`.
- Commit and push. Main handles git operations.
