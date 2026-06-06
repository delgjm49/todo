# Plan: Archive/Completed Views Planning

## Overview
This dispatch is an audit/planning pass, not product implementation. Dev must produce a grounded complete artifact that defines current completed-row semantics, distinguishes them from a future archived lifecycle state, and recommends or rejects the narrowest safe first archive/completed-view implementation slice.

The likely safe direction to evaluate is a derived completed-row view/filter before any persisted archive state, because current rows have checkbox-derived completion behavior but no row lifecycle field. Dev must confirm that recommendation from current code/tests and explicitly call out what would be required if a future dispatch persists archive state.

## Verified Current-State Facts
- `agents/channels/084-archive-completed-views-planning/messages/001-main-to-plan.md` sets `To = Plan`, `State = ready-for-plan`, and requires an audit/planning plan artifact plus a Plan → Dev handoff; it explicitly says Dev should produce a planning/audit complete artifact, not product implementation.
- `agents/artifacts/084-archive-completed-views-planning-dispatch.md` scopes this as lifecycle-semantics planning only: audit checkbox-derived completion, distinguish completed/archived/hidden/restored/deleted, identify storage/schema/undo/autosave/search/sort/alert/clipboard impacts, and avoid data-destructive hiding without a restore path.
- `agents/artifacts/073-post-mvp-backlog-planning-plan.md` classified archive/completed views as useful but higher risk than search because current “completed” is derived from checked checkbox columns with `strikeoutRowWhenChecked`, not a universal row status.
- `src/domain/rows/applyCheckboxRules.ts` defines completion as derived state: `isRowCompletedByCheckbox(columns, row)` returns true only when any checkbox column has `settings.strikeoutRowWhenChecked === true` and that row’s cell for the column has `value === true`.
- `src/domain/rows/applyCheckboxRules.ts` also defines `applyCheckboxAutoMove`: only the toggled checkbox column’s `moveCheckedRowsToBottom === true` setting groups unchecked rows before checked rows and rewrites `order`; it does not create lifecycle state.
- `src/components/row/RowView.tsx` computes `completed` with `isRowCompletedByCheckbox(block.columns, row)`, sets `data-completed="true"` when completed, and applies a line-through class to visible cells. It still renders completed rows in normal row order and provides normal insert/delete/drag/select/edit controls.
- `src/components/cell/CheckboxCell.tsx` renders a local toggle button showing `☑`/`☐`; it has no archive/hide semantics.
- `src/components/block/ColumnContextMenu.tsx` and `src/components/layout/TypeSpecificColumnSettings.tsx` expose checkbox settings for “Strikeout when checked” and “Move checked to bottom”; no current menu exposes archive/hide/restore actions.
- `src/domain/templates/blockTemplates.ts` and `src/domain/columns/createColumn.ts` default checklist checkbox columns to `strikeoutRowWhenChecked: true` and `moveCheckedRowsToBottom: false`.
- `src/types/row.ts` defines `Row` with only `id`, `order`, `format`, and `cells`; there is no `archived`, `archivedAt`, `completed`, `hidden`, or deletion marker field.
- `src/types/block.ts` defines `Block` with `collapsed`, `sort`, `format`, `columns`, and `rows`; there is no block-level completed/archive view filter state.
- `src/types/column.ts` defines checkbox settings only as `strikeoutRowWhenChecked` and `moveCheckedRowsToBottom`; there is no lifecycle-related column or row setting.
- `src/types/workspace.ts` and `src/types/app.ts` define workspace/index/app snapshots without any archive collection or row lifecycle registry.
- `src/services/storage/storageSchemas.ts` validates/coerces fixed row and block shapes. `normalizeRow` returns only `id`, `order`, `format`, and normalized `cells`; `normalizeBlock` returns fixed block fields. A future persisted archive field would require deliberate type/schema/storage changes, otherwise coercion can drop unknown fields.
- `src/stores/documentStore.ts` mutation paths commit full document snapshots through `commitSnapshot`, mark state dirty, and schedule autosave. `toggleCheckboxCellValue` flips a boolean checkbox cell and applies checkbox auto-move; `deleteRowFromBlock` removes rows destructively; `cutRows` removes rows while storing a clipboard payload; `pasteRows` inserts fresh rows from clipboard data.
- `src/domain/alerts/evaluateRow.ts` suppresses alerts if any checkbox cell in the row is checked, regardless of `strikeoutRowWhenChecked`; alert semantics therefore already use a broader “checked checkbox suppresses alerts” rule than UI completion does.
- `src/domain/search/searchDocuments.ts` searches workspace titles, block titles, and visible text/date/time/dropdown string cell values. It explicitly excludes checkbox booleans, bullet/numbered markers, formatting, and ids.
- `src/domain/sorting/compareValues.ts` treats checkbox columns as sortable boolean values while excluding numbered columns and making bullet comparisons a no-op.
- `src/domain/clipboard/rowClipboardTypes.ts` serializes rows as `sourceRowId`, `order`, `format`, and partial cell values only; any future row lifecycle metadata would need explicit clipboard decisions.
- `src/tests/unit/checkboxAutomation.test.ts` covers derived completion only from checked strikeout-enabled checkbox columns and auto-move grouping/ordering behavior.
- `src/tests/unit/rowEditing.test.tsx` includes UI coverage that checked strikeout-enabled rows are marked completed and checkbox toggles persist through store actions.
- `src/tests/integration/rowCellEditing.integration.test.ts` verifies checkbox toggles and `moveCheckedRowsToBottom` row order survive autosave/reload.
- `src/tests/integration/saveLoadRoundtrip.integration.test.ts` verifies checkbox column settings and sort metadata round-trip through storage.
- `src/tests/unit/searchDocuments.test.ts`, `src/tests/unit/alertEvaluation.test.ts`, and `src/tests/unit/rowClipboard.test.ts` / `rowClipboardActions.test.ts` provide current coverage for search exclusions, alert checkbox suppression, and row clipboard serialization/actions respectively.

## Prerequisites
- No product source/test implementation is allowed in dispatch 084.
- Dev must read current source/tests again as needed before writing the complete artifact; this plan’s facts are a floor, not a substitute for Dev verification.
- If Dev finds a scope-affecting mismatch between this plan and current disk state, Dev should route to Main instead of guessing.

## Files to Create/Modify
| Action | Path | Description |
|--------|------|-------------|
| Create | `agents/artifacts/084-archive-completed-views-planning-complete.md` | Audit/planning complete artifact with recommendation, risks, future scope, and acceptance criteria. |
| Modify | `docs/SESSIONS_PENDING.md` | Append Dev session entry during close. |
| Create | `agents/channels/084-archive-completed-views-planning/messages/003-dev-to-review.md` | Dev → Review handoff with `State = ready-for-review`. |

### Future implementation files Dev should evaluate in the artifact
These are not to be modified during dispatch 084.

| Path | Why it matters for a future implementation |
|------|--------------------------------------------|
| `src/domain/rows/applyCheckboxRules.ts` | Home of current derived completed-row semantics; likely place for any pure derived completion helper. |
| `src/types/row.ts`, `src/types/block.ts`, `src/types/workspace.ts` | Any persisted archive/lifecycle state would start in these types. |
| `src/services/storage/storageSchemas.ts` | Future persisted fields require validation/coercion and migration/backward-compatibility handling. |
| `src/stores/documentStore.ts` | Future hide/archive/restore actions must integrate with undo/history/autosave snapshots. |
| `src/components/row/RowView.tsx` and layout/block components | Future view/filter controls and row rendering/hiding behavior will touch current row display. |
| `src/domain/search/searchDocuments.ts` | Future search must define whether completed/archived rows are included, excluded, or filterable. |
| `src/domain/sorting/compareValues.ts` and `src/domain/sorting/sortRows.ts` | Future hidden/restored rows must not corrupt stored sort order. |
| `src/domain/alerts/evaluateRow.ts` and `src/domain/alerts/evaluateWorkspace.ts` | Future archive/completed rules must define alert suppression/counting semantics. |
| `src/domain/clipboard/*` | Future clipboard behavior must define whether lifecycle metadata is copied/pasted. |
| `src/tests/unit/checkboxAutomation.test.ts`, `src/tests/integration/rowCellEditing.integration.test.ts`, `src/tests/integration/saveLoadRoundtrip.integration.test.ts` | Baseline tests to expand for derived completion, persistence, and round-trip behavior. |

## Implementation Steps
### Step 1: Reconfirm current lifecycle model from disk
- Re-read the dispatch artifact and the source/test files listed in this plan’s Verified Current-State Facts.
- Summarize the current model in the complete artifact using explicit terms:
  - **completed** = derived UI/behavioral state from checked strikeout-enabled checkbox columns;
  - **checked** = boolean checkbox cell state;
  - **alert-suppressed** = current alert behavior when any checkbox is checked;
  - **archived** = not currently implemented;
  - **hidden** = a view/filter behavior, not current persisted state;
  - **restored** = future action that must reverse hiding/archive without data loss;
  - **deleted** = current destructive row removal via `deleteRowFromBlock`.
- **Verify**: Complete artifact cites concrete files/functions/tests and does not rely on remembered behavior.

### Step 2: Decide and document the recommended first future slice
- Evaluate whether the first future implementation should be:
  1. a derived completed-row view/filter with no schema change;
  2. an explicit persisted archive lifecycle state;
  3. a non-product follow-up or rejection because requirements are not safe yet.
- Recommendation rubric:
  - Prefer a no-persistence completed-view/filter slice if it can deliver value with clear visibility/restore behavior and without hiding data permanently.
  - Reject persisted archive state for the first slice unless the artifact explains why derived/filter-only behavior is insufficient.
  - If recommending persisted archive, specify the exact proposed shape (for example `Row.archivedAt: string | null` or equivalent), migration/default behavior for existing rows, and recovery/restore semantics.
- **Verify**: Complete artifact contains an explicit “Recommendation” section with one chosen direction and rationale.

### Step 3: Define future UI/view semantics
- Specify what a future view/filter would show and hide.
- Required distinctions:
  - completed rows should remain recoverable because completion is just checkbox state;
  - archived rows, if ever implemented, must have an explicit restore path;
  - deleting remains destructive and separate from archive/restore;
  - hidden rows must not disappear without an obvious control to reveal them again.
- Include likely UI entry points to evaluate, such as a block-level “show/hide completed” control, a workspace-level completed/archived view, or a non-destructive filtered panel.
- **Verify**: Complete artifact includes future UI states and accessibility/testable behavior without prescribing unreviewed implementation details as final.

### Step 4: Analyze storage/schema/migration risk
- For a derived-only completed view, document that no row/block/workspace schema field is required and explain why this is safer.
- For explicit archive, document required type/schema/storage changes, including `storageSchemas.ts` normalization/coercion behavior and whether `STORAGE_SCHEMA_VERSION` must change.
- Address backward compatibility, unknown-field loss during validation, default value for old rows, restore behavior, and backup/recovery expectations.
- **Verify**: Complete artifact has a `Data / Storage / Schema` section that explicitly says either “none for the recommended first slice” or names exact future fields and migration risks.

### Step 5: Analyze domain impacts
- Cover alerts, sorting, search, clipboard, undo/history, autosave, row ordering, and existing checkbox automation.
- Minimum required positions to document:
  - alerts currently suppress on any checked checkbox; future completed/archive semantics must decide whether to preserve, narrow, or separate that rule;
  - sorting and `moveCheckedRowsToBottom` both mutate/display row order today, so filters must not rewrite order unless intended;
  - search currently excludes checkbox values, so completed/archived inclusion/exclusion must be a product decision;
  - clipboard currently omits row lifecycle metadata, so future archive state would need copy/paste rules;
  - store mutations already use history snapshots/autosave, so future archive/restore actions must be undoable and autosaved.
- **Verify**: Complete artifact includes each domain area by name and states impact, risk, and proposed coverage.

### Step 6: Define future test and acceptance criteria
- List specific future tests for the chosen recommendation.
- Include unit tests for derived completion/archive semantics, store tests for undo/autosave/restore if source changes are recommended, storage round-trip/migration tests for any persisted state, and UI/integration tests for hide/show/restore behavior.
- Include required verification commands for that future implementation dispatch: `npm run test`, `npm run lint`, `npm run build`, and `npm run test:e2e` when Playwright browsers are available.
- **Verify**: Complete artifact is concrete enough for Main to open a future implementation dispatch without redoing the audit.

### Step 7: Close this planning/audit dispatch correctly
- Write only `agents/artifacts/084-archive-completed-views-planning-complete.md` as the Dev artifact; do not change product source/tests.
- Append a concise Dev entry to `docs/SESSIONS_PENDING.md`.
- Create exactly one next channel message: `agents/channels/084-archive-completed-views-planning/messages/003-dev-to-review.md` with `From = Dev`, `To = Review`, and `State = ready-for-review`.
- **Verify**: No other `messages/*.md` files are created or edited by Dev.

## Data / Storage / Schema Changes
None for dispatch 084 itself.

For a future derived completed-view/filter slice, the expected data/storage change should also be none: completed state can be recomputed from existing checkbox column settings and row cell values.

For a future explicit archive slice, Dev must document exact proposed persisted fields and migration behavior. Current storage validation/coercion does not preserve unknown row/block lifecycle fields, so persisted archive state is a schema/storage project, not a UI-only toggle.

## UI Specifications
No UI is implemented in dispatch 084.

The complete artifact should describe future UI semantics at planning level only:
- completed rows may be hidden by a reversible filter/view derived from checkbox state;
- archived rows, if introduced, need an explicit archive action, a discoverable archived view, and a restore action;
- hidden/completed/archived indicators must avoid looking like deletion;
- bulk or destructive actions are out of scope for the first safe slice unless Main explicitly scopes them later.

## Assumptions / Hypotheses
- Hypothesis: the safest first implementation slice will be a derived completed-row view/filter with no persisted archive state. Dev must confirm or reject this in the complete artifact after reviewing current code/tests.
- Assumption: Main wants a reviewed audit artifact suitable for a future dispatch, not a product change in this cycle.
- Assumption: any behavior that hides rows must include an obvious way to reveal/restore them before it is safe for users.

## Acceptance Criteria
- [ ] Dev complete artifact includes a `## Verified Current-State Facts` section with concrete file/test citations.
- [ ] Current checkbox-derived completion is accurately documented, including `strikeoutRowWhenChecked`, `moveCheckedRowsToBottom`, and the difference between UI completion and alert checkbox suppression.
- [ ] Completed, checked, archived, hidden, restored, and deleted semantics are explicitly distinguished.
- [ ] The artifact recommends or rejects one first future implementation slice and gives rationale.
- [ ] Storage/schema/migration implications are explicit, especially the difference between a derived-only filter and persisted archive state.
- [ ] Alerts, sorting, search, clipboard, undo/history, autosave, row order, and tests are each addressed.
- [ ] Future files/tests/acceptance criteria are concrete enough for Main to dispatch implementation later.
- [ ] No product source or test files are changed in dispatch 084.

## Estimated Complexity
- Dispatch 084 Dev audit artifact: Small/Medium.
- Product implementation implied by a future derived completed-view slice: Medium.
- Product implementation implied by persisted archive state: Medium/Large because it touches types, storage validation/migration, store actions, UI, and recovery semantics.
