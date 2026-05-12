# Project Status

## Project

- Name: local desktop todo app
- Primary platform: Windows 11
- Architecture target: Tauri + React + TypeScript
- Persistence: local JSON files
- Native verification path: GitHub Actions Windows CI

## Planning State

The core planning stack is in place:

- `docs/TODO_APP_PLAN.md`
- `docs/TODO_APP_TECH_SPEC.md`
- `docs/TODO_APP_UI_SPEC.md`
- `docs/TODO_APP_IMPLEMENTATION_BACKLOG.md`
- `docs/TODO_APP_PLAN_REVIEW.md`

The planning artifacts have already been refined once in response to formal review findings.

## Implementation State

### Completed

- Checkpoint 1 foundation work:
  - repo scaffold
  - storage layer
  - persistence schemas
  - bootstrap behavior
  - document store foundation
- Checkpoint 1 follow-up fixes:
  - repo-local Tauri CLI wiring
  - explicit partial-save semantics
  - save-time coercion
  - expanded storage tests
- GitHub Actions Windows CI:
  - workflow added
  - Windows Tauri build now passes
- Checkpoint 2:
  - snapshot-based history store
  - autosave debounce
  - dirty/save-state behavior
- Checkpoint 3 builder pass:
  - app shell
  - top bar shell
  - settings screen shell
  - workspace dock rendering
  - workspace CRUD/styling/reorder
  - documentStore transaction batching integration
- Checkpoint 3 review refinements:
  - workspace card styling now renders stored background/text colors
  - workspace downward drag reorder now persists correctly
  - reorder coverage now includes the downward-move path
- Checkpoint 4 builder pass:
  - block templates
  - empty workspace add-block affordances
  - top bar add-block flow
  - block cards and headers
- Checkpoint 4 follow-up fix:
  - normal user-created workspaces now start empty
  - first-launch bootstrap starter workspace behavior remains intact
- Checkpoint 4 review outcome:
  - reviewed and accepted after the empty-workspace follow-up fix
- Checkpoint 5 builder pass:
  - block title inline edit
  - block collapse / expand
  - block reorder within workspace
  - move block to another workspace
  - block context menu
  - block-management store coverage expansion
- Checkpoint 5 review-fix pass:
  - fixed downward block reorder insertion behavior
  - cleared stale block drag state on settings navigation and `MainPane` unmount
  - cleared stale workspace drag state on settings navigation and `LeftDock` unmount
  - replaced window-level menu dismissal with explicit backdrops for block and workspace context menus
  - added downward reorder coverage
  - added UI-store coverage for block and workspace interaction reset
  - added DOM regression coverage for safe outside-click menu dismissal
- Checkpoint 6 builder pass:
  - pure column domain helpers
  - pure row domain helpers
  - column header row rendering
  - display-only row and base cell grid rendering
  - focused unit coverage for column helpers, row helpers, and block grid rendering
- Checkpoint 7 builder pass:
  - dedicated base cell renderer layer for text, checkbox, bullet, and numbered columns
  - persisted text-cell and checkbox-cell mutations through `documentStore`
  - row add, insert above/below, and delete UI flows
  - store coverage for row/cell mutations plus row-editing UI tests
- Checkpoint 8 builder pass:
  - advanced typed cell renderers for `date`, `time`, and `dropdown`
  - persisted editing flows for all three new cell types
  - row drag reorder within a block via explicit drag handles
  - row drag transient state in `uiStore` with safe reset on navigation/unmount
  - store and UI test coverage for typed cells and row reorder
- Checkpoint 9 builder pass:
  - column context menu from header row with rename, move left/right, add left/right, delete, change type
  - checkbox column settings toggles (`strikeoutRowWhenChecked`, `moveCheckedRowsToBottom`)
  - date/time column alert toggles
  - column mutation domain helpers (`addColumn`, `deleteColumn`, `renameColumn`, `changeColumnType`, `moveColumnLeft`, `moveColumnRight`, `updateColumnSettings`)
  - durable store APIs for all column mutations
  - safe cell payload conversion during type changes
  - backdrop dismissal for column menus
  - expanded test coverage for column helpers, store mutations, and menu dismissal
- Checkpoint 10 builder pass:
  - `TICKET-039` selection model across block/column/row/cell
  - `Selection` discriminated union type and ephemeral `uiStore` state
  - block selection via block header click
  - column selection via column header left-click (right-click opens context menu)
  - row selection via row surface click
  - cell selection via cell container click
  - visible selection treatment for all four target kinds
  - minimal inspector wiring showing current selection kind
  - selection reset on workspace switch and settings navigation
  - `selectionModel.test.tsx` UI coverage for selection interactions and styling
- Checkpoint 11 builder pass:
  - `TICKET-040` formatting merge/resolution helpers
  - `mergeFormatting` helper for sparse override merging
  - `appDefaultsToFormatting` helper mapping `AppDefaults` to a formatting layer
  - `resolveCellFormatting` helper resolving app -> block -> column -> row -> cell precedence
  - `resolveRowStyle` helper resolving app -> block -> row precedence
  - `formattingHelpers.test.ts` with 20 unit tests covering merge, precedence, empty overrides, and border arrays

### Review State

- Checkpoint 1: reviewed and refined
- Checkpoint 2: reviewed; acceptable to continue, with note that transaction batching should stay coordinated through `documentStore`
- Checkpoint 3: reviewed and refined; acceptable to continue
- Checkpoint 4: reviewed and accepted
- Checkpoint 5: reviewed and accepted on 2026-05-07 after follow-up fixes
- Checkpoint 6: reviewed and accepted on 2026-05-11 as the display-only EPIC-07 grid-shell checkpoint
- Checkpoint 7: reviewed and accepted on 2026-05-11 as the base text/checkbox editing and row-mutation checkpoint
- Checkpoint 8: implemented, directly fixed, and accepted on 2026-05-11 after Main closed the remaining typed-cell UI gap in the primary thread
- Checkpoint 9: reviewed and accepted on 2026-05-11 as the column context menu and mutation flows checkpoint
- Checkpoint 10: reviewed and accepted on 2026-05-11 as the EPIC-08 selection model entry checkpoint
- Checkpoint 11: reviewed and accepted on 2026-05-11 as the EPIC-08 formatting-helper checkpoint

## Current App Usability

- `npm run dev` starts the Vite web dev server
- browser preview is available through the local Vite URL
- local `tauri:dev` is not available on the user's work PC because Rust/MSVC tooling is unavailable there
- native Windows desktop verification is being done through GitHub Actions artifacts
- local `npm run typecheck`, `npm run test`, `npm run build`, and `npm run lint` pass after the checkpoint 10 Dev pass on 2026-05-11
- blocks now render visible column headers and a full editable row/cell grid for current template data
- text, checkbox, date, time, and dropdown cells all mutate persisted state through `documentStore`
- rows can be added/inserted/deleted and reordered via drag handle within a block
- block title editing, collapse/expand, reorder, move, and context menu remain functional
- column context menu is now accessible from header rows with rename, move, add, delete, type change, and settings toggles
- formatting resolution helpers now exist under `src/domain/formatting/` for merge, defaults mapping, cell resolution, and row resolution
- checkpoint 8 first fix pass: removed `focus()` calls and split `input`/`blur` events into separate `act()` calls
- checkpoint 8 final close: date/time tests now drive the text-input path with `fireEvent.input`, and `DateCell` / `TimeCell` update draft state on `onInput` as well as `onChange`
- selection model is now active: clicking block headers, column headers, rows, or cells sets the active inspector target in `uiStore`
- selection styling renders for blocks (ring/border), columns (header emphasis), rows (background), and cells (border/ring)
- column header left-click now selects the column; right-click opens the column context menu

## Current Constraints

- No local Rust toolchain on the work PC
- No local MSVC build tools on the work PC
- Native desktop build verification must use CI or another machine
- Work should continue in scoped checkpoints to control drift

## Recommended Next Work

1. Checkpoint 11 is accepted. Prepare or dispatch the next checkpoint:
   - `TICKET-041` inspector shell and target summary work is the recommended next scope
   - use the prepared artifacts:
     - `docs/ai_sessions/BUILDER_DISPATCH_CHECKPOINT_12_EPIC_08.md`
     - `docs/ai_sessions/DISPATCH_CHANNEL_CHECKPOINT_12_EPIC_08.md`
3. Keep note of the current residual testing gap:
   - no end-to-end browser coverage yet for a full drag-reorder / move / delete user flow
   - column menu DOM interaction tests are limited to backdrop dismissal
4. Keep note of the current feature boundary:
   - formatting persistence (`TICKET-044`), sorting, clipboard, and alerts remain pending
5. Keep note of the current review/test gaps:
   - `rowEditing` tests still emit React `act(...)` warnings from async autosave timing
   - `selectionModel` tests also emit the same pre-existing `act(...)` warnings
   - repo-wide lint passed in the checkpoint 11 Dev pass

## Current Verification Snapshot

- Dev verification on 2026-05-11 after the checkpoint 11 builder pass:
  - `npm run typecheck`: pass
  - `npm run test`: pass (77 tests)
  - `npm run build`: pass
  - `npm run lint`: pass
- Review verification rerun on 2026-05-11 (checkpoint 11):
  - `npm run typecheck`: pass
  - `npm run test`: pass (77 tests, 0 failures)
  - `npm run build`: pass
  - `npm run lint`: pass

## Notes

- The repo is now a git repository and is connected to:
  - `https://github.com/delgjm49/todo.git`
- The Windows CI workflow is currently the best gate for packaging/build confidence
- Checkpoint 10 is accepted and closed for `TICKET-039`
- Checkpoint 11 is accepted and closed for `TICKET-040`
- Checkpoint 12 dispatch preparation is complete for `TICKET-041`
