# Todo App Plan Review

## Findings

### 1. Severity: Critical

**Title:** Persistence plan does not define atomic writes, recovery, schema versioning, or save ordering.

**Why it matters:** The plan relies on editable local JSON plus autosave, which is a data-loss-prone combination if writes are interrupted, files are partially written, the workspace index and workspace files get out of sync, or future schema changes occur. The current plan says separate workspace files reduce corruption risk, but it does not define the mechanisms that actually prevent or recover from corruption.

**Specific file references:**

- `docs/TODO_APP_PLAN.md:380` to `docs/TODO_APP_PLAN.md:390` defines JSON file storage and claims isolated workspace payloads reduce corruption risk.
- `docs/TODO_APP_TECH_SPEC.md:516` to `docs/TODO_APP_TECH_SPEC.md:560` defines storage APIs, autosave, and save failure behavior, but not atomic write protocol or recovery.
- `docs/TODO_APP_IMPLEMENTATION_BACKLOG.md:221` to `docs/TODO_APP_IMPLEMENTATION_BACKLOG.md:238` scopes storage read/write APIs without atomicity, backups, or version metadata.
- `docs/TODO_APP_IMPLEMENTATION_BACKLOG.md:1191` to `docs/TODO_APP_IMPLEMENTATION_BACKLOG.md:1205` adds autosave late without defining write safety.

**Recommended correction:** Add a persistence contract before implementation: schema version fields, temp-file write plus atomic rename, last-known-good backup files, index/workspace write ordering, recovery rules when one file is invalid, and acceptance tests for interrupted/corrupt writes.

### 2. Severity: High

**Title:** Persisted cell shape contradicts the typed cell contract.

**Why it matters:** The product plan's JSON example stores cells as `{ "value": ... }`, while the technical spec requires a discriminated union with `type`. Validation later requires every cell value type to match the column type. This ambiguity will affect storage schemas, migrations, sorting, alerts, clipboard serialization, and column type changes.

**Specific file references:**

- `docs/TODO_APP_PLAN.md:477` to `docs/TODO_APP_PLAN.md:480` shows persisted cells with values and formatting only.
- `docs/TODO_APP_TECH_SPEC.md:364` to `docs/TODO_APP_TECH_SPEC.md:389` requires `CellValue` variants with explicit `type`.
- `docs/TODO_APP_TECH_SPEC.md:764` to `docs/TODO_APP_TECH_SPEC.md:770` requires validation that every cell value type matches the column type.
- `docs/TODO_APP_IMPLEMENTATION_BACKLOG.md:188` to `docs/TODO_APP_IMPLEMENTATION_BACKLOG.md:202` asks for schemas/validation but does not resolve which persisted shape is canonical.

**Recommended correction:** Choose one persisted cell representation. Either persist discriminated cell values with `type`, or explicitly derive cell type from the column and remove `type` from saved cells. Document conversion rules for column type changes and clipboard mapping.

### 3. Severity: High

**Title:** MVP alert behavior depends on a deferred settings ticket.

**Why it matters:** Alerts require date/time columns to be alert-capable, but the only UI for enabling date/time alerts is grouped into type-specific inspector settings that the MVP cut line allows to slide after MVP. That leaves no defined way for a user to enable alerts while alerts remain required for MVP.

**Specific file references:**

- `docs/TODO_APP_PLAN.md:364` to `docs/TODO_APP_PLAN.md:371` requires alert-capable date/time columns and alert navigation/highlighting.
- `docs/TODO_APP_UI_SPEC.md:619` to `docs/TODO_APP_UI_SPEC.md:629` places date/time alert enablement under type-specific inspector settings.
- `docs/TODO_APP_IMPLEMENTATION_BACKLOG.md:888` to `docs/TODO_APP_IMPLEMENTATION_BACKLOG.md:902` makes type-specific inspector settings `P2`.
- `docs/TODO_APP_IMPLEMENTATION_BACKLOG.md:1258` to `docs/TODO_APP_IMPLEMENTATION_BACKLOG.md:1277` keeps alert tickets in MVP but explicitly allows `TICKET-046` to slide.

**Recommended correction:** Move the date/time alert enable toggle into the MVP path before alert evaluation, or define a default alert behavior that does not require a toggle. Update the MVP cut line and alert acceptance criteria accordingly.

### 4. Severity: High

**Title:** Column reorder is required by MVP acceptance but cut from the MVP backlog.

**Why it matters:** The plan says users can add, remove, and reorder columns, and the UI spec describes dragging column headers. The backlog's MVP cut excludes the only UI ticket that implements column reorder and resize. Domain helpers alone do not satisfy user-facing MVP behavior.

**Specific file references:**

- `docs/TODO_APP_PLAN.md:291` to `docs/TODO_APP_PLAN.md:296` includes add/remove/reorder columns and resizing.
- `docs/TODO_APP_PLAN.md:720` to `docs/TODO_APP_PLAN.md:734` includes `add/remove/reorder columns within a block` in MVP acceptance.
- `docs/TODO_APP_UI_SPEC.md:394` to `docs/TODO_APP_UI_SPEC.md:400` specifies column drag reorder and resize.
- `docs/TODO_APP_IMPLEMENTATION_BACKLOG.md:751` to `docs/TODO_APP_IMPLEMENTATION_BACKLOG.md:765` puts column reorder and resize in `TICKET-038` as `P2`.
- `docs/TODO_APP_IMPLEMENTATION_BACKLOG.md:1269` to `docs/TODO_APP_IMPLEMENTATION_BACKLOG.md:1277` allows `TICKET-038` to slide after MVP.

**Recommended correction:** Split `TICKET-038` into separate tickets. Keep column reorder in MVP if the MVP acceptance criteria stays unchanged, and defer only resize polish. If column reorder is not truly required for v1, remove it from MVP acceptance.

### 5. Severity: High

**Title:** Undo/redo is underspecified for autosave, per-workspace files, and high-volume edits.

**Why it matters:** Snapshot history is reasonable for a first implementation, but the plan does not define snapshot scope, stack limits, transaction boundaries, or how undo interacts with autosave and separately loaded workspace files. At the stated scale, full document snapshots can become expensive, and incorrect restore semantics can resurrect deleted workspaces, lose unloaded workspace changes, or save intermediate undo states unexpectedly.

**Specific file references:**

- `docs/TODO_APP_PLAN.md:542` to `docs/TODO_APP_PLAN.md:560` requires document-level undo for structural, content, and formatting edits.
- `docs/TODO_APP_PLAN.md:626` to `docs/TODO_APP_PLAN.md:634` sets a scale target up to 50 workspaces, 30 blocks per workspace, and 200 rows per block.
- `docs/TODO_APP_TECH_SPEC.md:416` to `docs/TODO_APP_TECH_SPEC.md:422` stores loaded workspace IDs and dirty state.
- `docs/TODO_APP_TECH_SPEC.md:484` to `docs/TODO_APP_TECH_SPEC.md:514` recommends snapshot history but only gives minimal transaction guidance.
- `docs/TODO_APP_IMPLEMENTATION_BACKLOG.md:298` to `docs/TODO_APP_IMPLEMENTATION_BACKLOG.md:313` defines `historyStore` acceptance as only "document-level changes can be undone and redone."

**Recommended correction:** Define undo scope explicitly: loaded workspace only versus full app document, max history depth or memory budget, transaction boundaries for typing/drag/sort/formatting, behavior after save failure, and whether undo operations themselves trigger autosave. Add acceptance tests for delete workspace, move block across workspaces, sort, formatting, and rapid cell edits.

### 6. Severity: High

**Title:** Drag/drop scope is too broad for MVP and mixes multiple hard interaction classes.

**Why it matters:** The plan includes workspace reorder, block reorder, cross-workspace block movement, row reorder, and column reorder/resize. These are not equivalent complexity levels. Cross-workspace drag, nested sortable contexts, scroll containers, selection, context menus, and editable cells can conflict. The backlog sizes these as mostly `M`/`L` items without acceptance criteria for keyboard fallback, invalid drops, scroll behavior, or drag cancellation.

**Specific file references:**

- `docs/TODO_APP_PLAN.md:276` to `docs/TODO_APP_PLAN.md:283` requires block drag reorder and dragging blocks to another workspace.
- `docs/TODO_APP_PLAN.md:285` to `docs/TODO_APP_PLAN.md:296` requires row drag and column reorder/resize.
- `docs/TODO_APP_TECH_SPEC.md:651` to `docs/TODO_APP_TECH_SPEC.md:672` recommends separate dnd-kit sortable contexts and cross-workspace block move.
- `docs/TODO_APP_IMPLEMENTATION_BACKLOG.md:459` to `docs/TODO_APP_IMPLEMENTATION_BACKLOG.md:473`, `docs/TODO_APP_IMPLEMENTATION_BACKLOG.md:562` to `docs/TODO_APP_IMPLEMENTATION_BACKLOG.md:592`, and `docs/TODO_APP_IMPLEMENTATION_BACKLOG.md:718` to `docs/TODO_APP_IMPLEMENTATION_BACKLOG.md:765` spread drag behavior across multiple tickets.

**Recommended correction:** Define the MVP drag hierarchy more narrowly. Keep workspace, block-within-workspace, and row-within-block reorder first. Prefer a context menu for cross-workspace block moves in MVP, and defer cross-workspace drag and column resize unless they are explicitly required.

### 7. Severity: Medium

**Title:** Formatting model lacks reset/inheritance semantics and is likely larger than the MVP can safely absorb.

**Why it matters:** The documents require formatting at four target levels plus border controls, colors, font controls, row/cell shading, column defaults, and block defaults. The plan does not define how users see direct overrides versus inherited values, how they clear an override, what happens when app defaults change, or which formatting properties apply to non-text cells. Without those rules, the inspector will produce inconsistent state and hard-to-debug rendering behavior.

**Specific file references:**

- `docs/TODO_APP_PLAN.md:327` to `docs/TODO_APP_PLAN.md:358` defines layered formatting and border properties.
- `docs/TODO_APP_TECH_SPEC.md:338` to `docs/TODO_APP_TECH_SPEC.md:362` uses the same broad formatting type for cell, row, column, and block.
- `docs/TODO_APP_TECH_SPEC.md:643` to `docs/TODO_APP_TECH_SPEC.md:649` says the inspector should show effective values versus direct overrides "where possible."
- `docs/TODO_APP_UI_SPEC.md:563` to `docs/TODO_APP_UI_SPEC.md:629` gives the inspector a wide set of controls.
- `docs/TODO_APP_IMPLEMENTATION_BACKLOG.md:822` to `docs/TODO_APP_IMPLEMENTATION_BACKLOG.md:871` requires text controls, border controls, and persistence across target levels.

**Recommended correction:** Add formatting acceptance rules before UI work: supported properties by target type, inherited versus direct display behavior, reset-to-inherited behavior, serialization of empty override objects, and what formatting applies to checkbox/bullet/numbered/date/time/dropdown cells. Consider reducing MVP formatting to text style, fill, and block/cell border before adding edge-level border controls.

### 8. Severity: Medium

**Title:** Reminder semantics are not defined enough to implement consistently.

**Why it matters:** "Date/time columns" and "due items" are ambiguous. The plan does not specify whether date and time are separate columns or paired, whether date-only reminders trigger at start of day, how invalid text input affects reminders, whether overdue items keep alerting forever, whether alerts are per cell or per row, or how repeated scans deduplicate visual alerts.

**Specific file references:**

- `docs/TODO_APP_PLAN.md:360` to `docs/TODO_APP_PLAN.md:378` defines open-app reminders at a high level.
- `docs/TODO_APP_TECH_SPEC.md:674` to `docs/TODO_APP_TECH_SPEC.md:697` defines polling but not due-time semantics.
- `docs/TODO_APP_UI_SPEC.md:524` to `docs/TODO_APP_UI_SPEC.md:538` allows direct text entry for date/time with invalid states.
- `docs/TODO_APP_IMPLEMENTATION_BACKLOG.md:1012` to `docs/TODO_APP_IMPLEMENTATION_BACKLOG.md:1072` defines alert evaluation, scheduler, dock indicators, and navigation without detailed acceptance criteria.

**Recommended correction:** Define alert semantics before implementation: date-only default time, time-only behavior, paired date/time column rules, invalid value handling, overdue persistence, deduplication per session, alert target identity, and whether checked/completed rows suppress alerts.

### 9. Severity: Medium

**Title:** Bullet and numbered cell models conflict with the template structure.

**Why it matters:** The plan's bulleted and numbered templates each include a marker column plus a text column, but the technical and UI specs treat bullet/numbered cells as carrying editable string values. This can produce duplicate editable text fields or unclear persistence for list items.

**Specific file references:**

- `docs/TODO_APP_PLAN.md:311` to `docs/TODO_APP_PLAN.md:323` defines bullet and numbered templates as `bullet + text` and `numbered + text`.
- `docs/TODO_APP_TECH_SPEC.md:371` to `docs/TODO_APP_TECH_SPEC.md:372` defines `BulletCellValue` and `NumberedCellValue` as string-valued cells.
- `docs/TODO_APP_UI_SPEC.md:509` to `docs/TODO_APP_UI_SPEC.md:522` says bullet and numbered cells show a marker and adjacent editable text.
- `docs/TODO_APP_IMPLEMENTATION_BACKLOG.md:682` to `docs/TODO_APP_IMPLEMENTATION_BACKLOG.md:700` requires bullet and numbered cell renderer/editor paths.

**Recommended correction:** Decide whether bullet/numbered columns are decorative marker columns with no persisted value, or single list-item cells that contain the item text. Align templates, cell value types, rendering, and copy/paste behavior to that decision.

### 10. Severity: Medium

**Title:** Testing is sequenced too late relative to high-risk domain logic.

**Why it matters:** The technical spec says unit tests should come first for pure logic, but the backlog puts domain test coverage near the end after most editing, formatting, sorting, and alert behavior has been built. That increases rework risk around the exact areas most likely to have edge-case defects.

**Specific file references:**

- `docs/TODO_APP_TECH_SPEC.md:794` to `docs/TODO_APP_TECH_SPEC.md:806` says unit tests should prioritize pure logic first.
- `docs/TODO_APP_IMPLEMENTATION_BACKLOG.md:1136` to `docs/TODO_APP_IMPLEMENTATION_BACKLOG.md:1153` schedules unit tests as `TICKET-060`, after many domain helpers are already implemented.
- `docs/TODO_APP_IMPLEMENTATION_BACKLOG.md:1155` to `docs/TODO_APP_IMPLEMENTATION_BACKLOG.md:1171` uses "major editing flows implemented" as an integration-test dependency, which is too vague to execute.

**Recommended correction:** Add test acceptance criteria directly to domain tickets for templates, validation, formatting merge, sorting, checkbox automation, row/column moves, and alerts. Keep `TICKET-060` as a coverage hardening pass, not the first point where tests are added.

### 11. Severity: Medium

**Title:** MVP cut line is not a safe subset of the full MVP acceptance criteria.

**Why it matters:** The cut line preserves a large amount of complex functionality while allowing specific dependency features to slide. This creates a nominal MVP that still promises typed cells, formatting, sorting, clipboard, undo/redo, alerts, packaging, and tests, but may lack settings controls, type-specific configuration, column reorder, hotkeys, alert navigation, and e2e smoke coverage.

**Specific file references:**

- `docs/TODO_APP_PLAN.md:716` to `docs/TODO_APP_PLAN.md:734` defines a broad MVP acceptance set.
- `docs/TODO_APP_IMPLEMENTATION_BACKLOG.md:1256` to `docs/TODO_APP_IMPLEMENTATION_BACKLOG.md:1277` defines the cut line.
- `docs/TODO_APP_IMPLEMENTATION_BACKLOG.md:1279` to `docs/TODO_APP_IMPLEMENTATION_BACKLOG.md:1295` defines MVP done separately from the cut line.

**Recommended correction:** Replace the cut line with explicit MVP tiers. Define "MVP Core" as storage, workspace/block CRUD, row CRUD, text/checkbox cells, basic formatting, autosave, and packaging. Then define "MVP Extended" for dropdown/date/time alerts, full formatting targets, row clipboard, sorting, and drag/drop polish.

### 12. Severity: Low

**Title:** Several ticket sizes are optimistic for editor-level UI work.

**Why it matters:** The backlog calls many interaction-heavy tasks `M` or `L` while each includes state, UI, persistence, validation, and edge-case behavior. Under-sizing will make sequencing look safer than it is and hide integration risk until late.

**Specific file references:**

- `docs/TODO_APP_IMPLEMENTATION_BACKLOG.md:682` to `docs/TODO_APP_IMPLEMENTATION_BACKLOG.md:700` correctly marks typed cell renderers as `XL`, but still keeps all seven cell types together.
- `docs/TODO_APP_IMPLEMENTATION_BACKLOG.md:822` to `docs/TODO_APP_IMPLEMENTATION_BACKLOG.md:871` sizes multi-target formatting controls and persistence as `L` plus two `M` tickets.
- `docs/TODO_APP_IMPLEMENTATION_BACKLOG.md:941` to `docs/TODO_APP_IMPLEMENTATION_BACKLOG.md:986` sizes internal row clipboard and plain text clipboard as two `M` tickets despite cross-block mapping.

**Recommended correction:** Split tickets by vertical slice and acceptance behavior. For example, implement text and checkbox cells before date/time/dropdown, implement row formatting before column/block/cell formatting, and implement same-block row paste before cross-block mapping.

## Open Questions

- What is the canonical persisted cell shape: discriminated cell values with `type`, or values whose type is derived entirely from the column definition?
- Are bullet and numbered columns marker-only columns, or do they contain editable task text?
- How is an alert enabled if `TICKET-046` slides after MVP?
- What exactly makes a date/time cell "due" when date and time are separate column types?
- Should checked/completed rows still produce active reminders?
- Is cross-workspace block movement required as drag/drop in MVP, or is a context-menu move acceptable?
- What is the undo history scope: active workspace, all loaded workspaces, or the full application document?
- Does autosave run after undo/redo operations, and how are save failures represented in undo history?
- Is column resize actually MVP, or only column reorder?
- What are the minimum supported dropdown behaviors if the dropdown options editor is deferred?

## Scope Risks

- The MVP combines a desktop shell, structured grid editing, drag/drop, formatting inspector, typed cells, clipboard, alerts, undo/redo, autosave, persistence recovery, settings, and packaging. That is closer to a small productivity editor than a todo MVP.
- Formatting at block, column, row, and cell levels is likely to expand because inheritance, reset behavior, mixed target selection, and visual conflict resolution are not yet specified.
- Date/time/dropdown cells introduce validation, parsing, settings, and alert dependencies that are much larger than text/checkbox cells.
- Drag/drop can consume disproportionate time because it crosses workspaces, blocks, rows, columns, scroll containers, and editable controls.
- Packaging and Tauri filesystem behavior may reveal Windows-specific path, permission, and app-data issues late if storage and packaging smoke tests wait until the final milestone.

## Sequencing Risks

- `TICKET-046` comes after alert-capable date/time behavior but contains the user-facing alert enable toggle.
- `TICKET-038` is deferred, but column reorder appears in product-level MVP acceptance.
- `TICKET-060` places unit tests after most domain logic instead of pairing tests with domain helper tickets.
- `TICKET-063` autosave is late even though storage, history, dirty state, and save-failure behavior should shape the document store from the start.
- `TICKET-012` implements snapshot history before the plan defines mutation transactions, autosave interaction, memory limits, or per-workspace history scope.
- `TICKET-034` groups all typed cell renderers into one `XL` ticket; this should be split so text/checkbox can stabilize before date/time/dropdown behavior.

## Review Summary

The planning artifacts establish a coherent product direction, but the current MVP is not yet a safe execution plan. The most important corrections are to harden persistence, resolve the cell data contract, make the MVP cut line internally consistent, narrow drag/drop and formatting scope, and define alert and undo semantics before implementation starts.
