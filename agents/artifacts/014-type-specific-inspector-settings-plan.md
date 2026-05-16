# Plan: Type-Specific Inspector Settings (TICKET-046)

## Overview

Add a type-specific column settings panel to the inspector so users can edit
checkbox, dropdown, date, and time column settings from the inspector itself.
Selection resolves to a single editable column (column selection → that column,
cell selection → its owning column); unsupported selections render a quiet
no-controls state. Mutations route through the existing
`documentStore.updateColumnSettings` action and the existing
`ColumnContextMenu` settings fallback is left intact.

## Prerequisites

- TICKET-041 (Inspector shell) — landed
- TICKET-037 (Column settings persisted) — landed
- Existing `documentStore.updateColumnSettings` action — already wired
- Existing `ColumnContextMenu` settings UI — keep working as MVP fallback
- No schema or storage migration required

## Files to Create/Modify

| Action | Path | Description |
|--------|------|-------------|
| Create | `src/components/layout/columnSettingsTarget.ts` | Pure resolver from `Selection` + workspace document → `ColumnSettingsTarget \| null`. Mirrors `resolveSelectedFormattingTarget` structure. |
| Create | `src/components/layout/TypeSpecificColumnSettings.tsx` | New inspector section. Subscribes to active workspace, uses the resolver, dispatches `updateColumnSettings`. Renders per-type controls and an unsupported/empty state. Internally hosts the dropdown options editor. |
| Modify | `src/components/layout/InspectorShell.tsx` | Render `<TypeSpecificColumnSettings selection={selection} />` after `<BorderFormattingControls />`. No layout refactor beyond the new section. |
| Create | `src/tests/unit/columnSettingsTarget.test.ts` | Unit tests for the resolver: column→column, cell→column, none/block/row/missing/stale/hidden→null, supported vs unsupported column types. |
| Create | `src/tests/unit/typeSpecificColumnSettings.test.tsx` | jsdom render tests for checkbox toggles, date/time alerts toggle, dropdown add/rename/remove/validation, empty/unsupported states. Mirrors `contextMenuDismissal.test.tsx` setup style. |
| Modify | `src/tests/unit/documentStore.test.ts` | Add one focused case: `updateColumnSettings` persists a new `options` array on a dropdown column (existing checkbox case stays). Keeps store-level coverage for the new dropdown usage. |

## Implementation Steps

### Step 1: Add the column settings target resolver

- **File**: `src/components/layout/columnSettingsTarget.ts`
- Export `ColumnSettingsTarget` type:
  ```ts
  export type ColumnSettingsTarget = {
    workspaceId: WorkspaceId;
    blockId: BlockId;
    column: ColumnDefinition;
  };
  ```
- Export `resolveColumnSettingsTarget(selection, workspaceDocument): ColumnSettingsTarget | null`.
  - Return `null` for `selection.kind === "none"` or when `workspaceDocument` is `null`.
  - Look up the block from `workspaceDocument.blocks` by `selection.blockId`. Return `null` if missing.
  - For `selection.kind === "column"`: find the column in `block.columns` by `columnId`. Return `null` if missing or hidden (use `getVisibleColumnsInDisplayOrder` so hidden columns are excluded — matches the formatting resolver).
  - For `selection.kind === "cell"`: find the column the same way using `selection.columnId`. Ignore the row; we never edit row state from this panel. Return `null` if column missing or hidden.
  - For `selection.kind === "block"` or `"row"`: return `null` (these selections do not have a single column target).
- Do NOT filter by column type here. Returning a column lets the rendering component show a clean "no settings for this column type" state instead of disappearing entirely on text columns.
- **Verify**: `npm run typecheck`. Unit tests in Step 5 will exercise behavior.

### Step 2: Create `TypeSpecificColumnSettings.tsx` scaffold

- **File**: `src/components/layout/TypeSpecificColumnSettings.tsx`
- Component signature: `export function TypeSpecificColumnSettings({ selection }: { selection: Selection })`.
- Subscribe to the same store slices `TextFormattingControls` uses:
  - `workspaceIndex`, `workspacesById`, `activeWorkspaceId` from `useDocumentStore`.
  - `updateColumnSettings` action from `useDocumentStore`.
- Resolve `target = resolveColumnSettingsTarget(selection, workspaceDocument)`.
- Top-level structure (matches existing inspector card style):
  ```tsx
  <section className="mt-4 rounded-2xl border border-border bg-panelMuted/60 px-4 py-4">
    <div className="text-xs uppercase tracking-[0.24em] text-textMuted">Type-specific settings</div>
    <div className="mt-3">…body…</div>
  </section>
  ```
- Body cases:
  - **No target** (`target === null`): render a single `<p className="text-sm text-textMuted">` saying "Select a column or cell to edit column settings." (Mirrors `TextFormattingControls` empty state copy length.)
  - **Unsupported column type** (text, bullet, numbered): render `<p className="text-sm text-textMuted">` saying `"{Type label} columns have no type-specific settings."` Use the same `getColumnTypeLabel` helper used in `inspectorTargetSummary.ts` (extract it into a shared module if needed, otherwise re-implement inline — see Step 2a).
  - **Checkbox**: render two `<ToggleRow>` controls (component below) bound to `strikeoutRowWhenChecked` and `moveCheckedRowsToBottom`.
  - **Date** / **Time**: render one `<ToggleRow>` bound to `alertsEnabled`.
  - **Dropdown**: render `<DropdownOptionsEditor>` (Step 3).
- Each toggle handler calls:
  ```ts
  void updateColumnSettings(target.workspaceId, target.blockId, target.column.id, { [key]: nextValue });
  ```
  Use a typed cast `column.settings as { [key]: boolean }` to read the current value, mirroring `ColumnContextMenu` (it already uses this narrowing pattern).
- Add a local `ToggleRow` subcomponent with the same visual treatment as the existing `ToggleButton` in `ColumnContextMenu.tsx` (pill toggle on the right, label on the left). Add a `data-testid` so tests can target it deterministically, e.g.
  ```
  data-testid={`column-setting-toggle-${settingKey}`}
  ```
- **Verify**: `npm run typecheck`; render the app and confirm card appears.

### Step 2a: Decide on column type label helper

- `getColumnTypeLabel` exists only inside `inspectorTargetSummary.ts` (module-private). Two options — pick exactly one in implementation:
  1. **Re-implement** locally inside `TypeSpecificColumnSettings.tsx` (small, no churn elsewhere). Recommended.
  2. **Extract** to `src/components/layout/columnSettingsTarget.ts` and import from both files. Only do this if Dev needs the label for tests too.
- Choose option 1 unless the test file requires programmatic access; this keeps the change surface area small.

### Step 3: Implement dropdown options editor

- Inline subcomponent inside `TypeSpecificColumnSettings.tsx`:
  ```tsx
  function DropdownOptionsEditor({ options, onUpdate }: { options: string[]; onUpdate: (next: string[]) => void }) { … }
  ```
- Local state:
  - `draftAdd: string` — new option text input.
  - `editing: { index: number; value: string } | null` — currently-editing existing option.
  - `error: string | null` — validation message shown beneath the input.
- UI layout:
  - A list of existing options. Each row contains:
    - A text `<input>` (read-only by default; click to edit, or always editable — see below).
    - A "Remove" button (`data-testid={`dropdown-option-remove-${index}`}`).
  - Below the list, an "Add option" input + "Add" button (`data-testid="dropdown-option-add-input"`, `data-testid="dropdown-option-add-button"`).
  - Below the add row, the validation `error` text in `text-danger` if set.
- Behaviors:
  - **Add**: trim input. Reject empty (set error: "Option cannot be empty"). Reject duplicates of any trimmed existing option (set error: `Option "X" already exists`). On accept, call `onUpdate([...options, trimmed])` and clear `draftAdd` + `error`.
  - **Rename**: each row's input is always editable. On blur or Enter, trim. Empty → revert to previous value, set error. Duplicate of any OTHER existing option (case-sensitive, trimmed) → revert, set error. Otherwise call `onUpdate(options.map(...))` replacing the value at that index.
  - **Remove**: call `onUpdate(options.filter((_, i) => i !== index))`. No confirmation prompt — out-of-scope rule already excludes rewriting existing cell values when options change, so we just edit the options list.
  - **Ordering**: preserve insertion order. Adds append. Renames keep position. Removes shift later items up. Reordering is OUT OF SCOPE for this ticket.
- The parent (`TypeSpecificColumnSettings`) passes:
  ```ts
  onUpdate={(next) => void updateColumnSettings(target.workspaceId, target.blockId, target.column.id, { options: next })}
  ```
- All inputs use `aria-label` so tests can use `querySelector('[aria-label="…"]')` and so the panel is accessible.
- **Verify**: render the app, select a dropdown column, add/rename/remove an option, see the dropdown cell `<select>` reflect the new options after closing the inspector edit.

### Step 4: Wire the new section into `InspectorShell`

- **File**: `src/components/layout/InspectorShell.tsx`
- Import `TypeSpecificColumnSettings` from `./TypeSpecificColumnSettings.js`.
- Insert it after the existing `<BorderFormattingControls selection={selection} />` line and before the workspace style `FieldCard` block:
  ```tsx
  <BorderFormattingControls selection={selection} />

  <TypeSpecificColumnSettings selection={selection} />

  <div className="mt-4 space-y-4">
    {/* existing workspace-style FieldCards */}
  </div>
  ```
- Do not change any other inspector layout, spacing, or copy.
- **Verify**: `npm run typecheck`; manual check that the new card renders without shifting unrelated sections.

### Step 5: Unit tests — `columnSettingsTarget.test.ts`

- **File**: `src/tests/unit/columnSettingsTarget.test.ts`
- Use `createBlockTemplate("basic_checklist", "ws_home", ...)` and `createColumn(...)` to build fixtures, following the pattern in `inspectorTargetSummary.test.ts`.
- Cases (each `assert.equal` / `assert.deepEqual`):
  1. `selection.kind === "none"` → `null`.
  2. `selection.kind === "block"` → `null`.
  3. `selection.kind === "row"` → `null`.
  4. `selection.kind === "column"` on existing visible column → returns target with that column.
  5. `selection.kind === "cell"` on existing visible column → returns target with the column (row is irrelevant).
  6. `selection.kind === "column"` on a hidden column → `null`.
  7. `selection.kind === "column"` on a missing column → `null`.
  8. `selection.kind === "column"` on a missing block → `null`.
  9. `workspaceDocument === null` with any non-none selection → `null`.
- **Verify**: `npm run test`.

### Step 6: Render tests — `typeSpecificColumnSettings.test.tsx`

- **File**: `src/tests/unit/typeSpecificColumnSettings.test.tsx`
- Copy the JSDOM setup boilerplate (installGlobals, renderNode, before/afterEach, root unmount) from `src/tests/unit/contextMenuDismissal.test.tsx`. Reset `useDocumentStore` and `useUiStore` initial state in `afterEach`.
- Seed `useDocumentStore` with a single workspace + a `basic_checklist` block extended with one `dropdown` column, one `date` column, and one `time` column. Use `createColumn` and add cells for each row.
- Render `<InspectorShell />` directly (not the full `AppShell`) — it's the smallest scope that exercises wiring.
- Cases:
  1. **No selection** (`selection.kind === "none"`): the type-specific card renders and contains "Select a column or cell" guidance text.
  2. **Block selection**: renders the same guidance text.
  3. **Text column selection**: renders "Text columns have no type-specific settings." (or similar copy that matches the implementation).
  4. **Checkbox column selection**: toggling `strikeoutRowWhenChecked` updates the store value to `false`/`true`; toggling `moveCheckedRowsToBottom` updates the store value. Use `data-testid="column-setting-toggle-strikeoutRowWhenChecked"` and `data-testid="column-setting-toggle-moveCheckedRowsToBottom"`.
  5. **Date column selection**: toggling `alertsEnabled` updates the store value.
  6. **Time column selection**: same as date.
  7. **Dropdown column — add option**: type into the add input, click add button, store options array contains the new value in order.
  8. **Dropdown column — rename option**: focus an existing option input, change value, blur, store options array reflects the rename in place.
  9. **Dropdown column — remove option**: click remove on index 0, store options array no longer contains that value, others remain.
  10. **Dropdown — reject empty**: try to add `"   "`, store is unchanged, error text is visible in the DOM.
  11. **Dropdown — reject duplicate**: try to add a value already present, store is unchanged, error text is visible.
  12. **Cell selection resolves to owning column**: pick a cell whose column is a dropdown; verify the dropdown options editor renders and an add/rename/remove updates the same column.
- Each store assertion reads from `useDocumentStore.getState().workspacesById[workspaceId].blocks[0].columns.find(...).settings`.
- **Verify**: `npm run test`.

### Step 7: Document store coverage — `documentStore.test.ts`

- **File**: `src/tests/unit/documentStore.test.ts`
- Add one new test (do not modify existing checkbox case) at the end of the existing `updateColumnSettings` test (or as a sibling test):
  - Build a memory storage workspace, add a dropdown column, call
    `updateColumnSettings(workspaceId, blockId, columnId, { options: ["A", "B"] })`.
  - Assert the stored column's `settings.options` equals `["A", "B"]`.
  - Assert that calling `updateColumnSettings` again with `{ options: ["A", "B", "C"] }` overwrites (not merges) the array.
- **Verify**: `npm run test`.

### Step 8: Run full verification

- Run in this exact order, all four commands. Each must pass.
  1. `npm run typecheck`
  2. `npm run test`
  3. `npm run build`
  4. `npm run lint`
- If lint flags any unused imports in `TypeSpecificColumnSettings.tsx` or new tests, remove them before completing.
- Report each command per `CLOSING.md`'s verification reporting form in the complete artifact.

## Data / Storage Changes

None. The implementation uses the existing `ColumnSettings` discriminated union in
`src/types/column.ts`. Dropdown columns continue to store `{ options: string[] }`.
Mutations route through the existing `documentStore.updateColumnSettings`, which
already commits via `commitSnapshot` and integrates with the history transaction
path (so undo/redo works without changes).

## UI Specifications

- New inspector section titled "Type-specific settings" placed after
  "Borders" and before the workspace style block.
- Container styling matches existing inspector cards
  (`rounded-2xl border border-border bg-panelMuted/60 px-4 py-4`).
- States rendered inside the card:
  - No supported selection → muted guidance text (1 line).
  - Unsupported column type → muted "no settings" text (1 line).
  - Checkbox → two pill toggles ("Strikeout when checked", "Move checked to bottom").
  - Date / Time → one pill toggle ("Enable alerts").
  - Dropdown → options editor:
    - List of existing options (one row per option: text input + "Remove" button).
    - "Add option" row: text input + "Add" button.
    - Inline error text in `text-danger` for empty/duplicate inputs.
- Toggles reuse the visual treatment of the existing `ToggleButton` in
  `ColumnContextMenu.tsx` (a pill on the right, label on the left).
- All interactive elements have `aria-label`s and stable `data-testid`s.
- No new keyboard shortcuts, no new menus, no drag-to-reorder behavior.

## Acceptance Criteria

- [ ] Inspector shows a "Type-specific settings" section for supported column and cell selections.
- [ ] Checkbox column selections can toggle `strikeoutRowWhenChecked` and `moveCheckedRowsToBottom` from the inspector, persisted through `documentStore.updateColumnSettings`.
- [ ] Date and time column selections can toggle `alertsEnabled` from the inspector.
- [ ] Dropdown column selections can add, rename, and remove ordered options from the inspector.
- [ ] Dropdown option edits reject empty (post-trim) and duplicate (case-sensitive, trimmed) labels with inline error text; store is unchanged on rejection.
- [ ] Dropdown cell `<select>` reflects updated options after inspector edits.
- [ ] Unsupported selections (none, block, row, stale target, text/bullet/numbered columns) do not crash and show a clear no-controls/guidance state.
- [ ] Setting changes are undoable through the existing document history transaction path (no new wiring needed — verified by manual undo after a change).
- [ ] Existing `ColumnContextMenu` settings toggles continue to work unchanged.
- [ ] Targeted tests cover: target resolution (`columnSettingsTarget.test.ts`), inspector rendering across selection kinds (`typeSpecificColumnSettings.test.tsx`), dropdown option validation, and `documentStore.updateColumnSettings` with a dropdown `options` patch (`documentStore.test.ts`).
- [ ] All four verification commands pass: `npm run typecheck`, `npm run test`, `npm run build`, `npm run lint`.

## Estimated Complexity

- **Size**: Medium
- **File count**: ~6 (2 new source, 1 modified source, 2 new test files, 1 modified test file)
- **Risk**: Low — no schema changes, single new action path through an existing store action, isolated UI surface area.

## Architectural Notes

- No new spec required; this plan follows the same target-resolution pattern as
  `resolveSelectedFormattingTarget` and the same inspector-card visual pattern
  as `TextFormattingControls` / `BorderFormattingControls`. If Dev needs the
  `getColumnTypeLabel` helper for tests, extracting it into a shared module is
  acceptable but not required by this plan.
- `ColumnContextMenu` settings toggles remain in place by design (constraint),
  giving users a per-column right-click path even when the inspector is closed.
