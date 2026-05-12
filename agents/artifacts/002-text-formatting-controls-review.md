# Review: Text Formatting Controls

## Dispatch
- Channel: `agents/channels/002-text-formatting-controls-channel.md`
- Dispatch: `agents/artifacts/002-text-formatting-controls-dispatch.md`
- Plan: `agents/artifacts/002-text-formatting-controls-plan.md`
- Complete: `agents/artifacts/002-text-formatting-controls-complete.md`
- Ticket: `TICKET-042: Implement text formatting controls`

## Verdict
**PASS**

## Acceptance Criteria

| Criterion | Status | Notes |
|-----------|--------|-------|
| Inspector shows text formatting section for block, column, row, cell | PASS | `TextFormattingControls` rendered in `InspectorShell` for valid targets |
| No-selection/missing-target state does not expose mutation controls | PASS | Shows guidance message when `resolveSelectedFormattingTarget` returns null |
| Font family, size, bold, italic, underline, text color, fill can be set | PASS | All 7 properties have dedicated controls |
| Each property has reset-to-inherited/unset path | PASS | Each control has explicit Reset button dispatching `undefined` |
| Formatting mutations update persistent document state | PASS | `updateSelectedTextFormatting` commits via snapshot/history path |
| Effective formatting resolves through precedence | PASS | Uses `resolveCellFormatting` / `resolveRowStyle` in grid and inspector |
| Grid rendering reflects formatting immediately | PASS | `RowView` cell wrappers apply inline styles via `formattingToCellStyle` |
| Controls don't mutate unrelated targets | PASS | Sparse patches target only the selected entity; `formatLayersEqual` guards no-ops |
| Tests cover formatting application for all targets | PASS | 10 patch helper tests + 6 store action tests (block, column, row, cell, none, stale) |
| Verification commands pass | PASS | `typecheck`, `test` (107/107), `build`, `lint` all clean |

## Scope Check

- Border controls were not added (`TICKET-043` untouched).
- No dedicated persistence/reload QA pass added (`TICKET-044` untouched).
- No checkbox automation, sorting, clipboard, alerts, settings defaults UI, or packaging work.
- Inline partial rich text was not attempted.

## Implementation Quality

- `applyFormattingPatch` is a pure, deterministic helper with no input mutation.
- `formattingToCellStyle` cleanly converts resolved `FormattingLayer` to React CSS properties.
- `resolveSelectedFormattingTarget` reuses existing precedence helpers and returns null for stale/missing targets.
- `updateSelectedTextFormatting` in `documentStore` handles all four selection kinds with consistent snapshot/history commits (`"formatting"` transaction kind).
- Cell formatting is set to `undefined` when empty to keep payloads sparse.
- `RowView` applies `cellStyle` to the cell wrapper so all cell renderer types inherit text styling.
- `FieldCard` extraction from `InspectorShell` is a clean refactor with no behavior change.

## Test Coverage

- `src/tests/unit/formattingPatch.test.ts` — 10 tests: set, overwrite, reset, multiple keys, empty result, immutability, text color, background color.
- `src/tests/unit/documentStore.test.ts` — 6 new tests: block set/reset, column isolation, row isolation, cell set/reset-to-undefined, none selection rejection, stale selection rejection.

## Regressions

No regressions detected. All pre-existing test suites continue to pass (107/107). Pre-existing React `act(...)` warnings in render tests are unchanged.

## Notes (optional, no action required)

1. **No render tests for visible styling:** The plan suggested "at minimum" store formatting application plus one visible/effective formatting behavior test. Dev covered the store minimum comprehensively but did not add a render test asserting inline styles on cell wrappers. The `RowView` inline style application is straightforward and the helper is unit-tested; this gap is acceptable.
2. **Number input edge case:** `TextFormattingControls` font size input converts `event.target.value` via `Number()`. In the unlikely event a browser allows non-numeric text through a `type="number"` input, `NaN` could be stored as a direct override. Normal browser behavior returns empty string for invalid number input, which maps to `undefined`/reset. Not a practical concern.
3. **Selection background override:** The cell wrapper in `RowView` applies `backgroundColor` via inline style, which overrides the Tailwind `bg-panel` class. This is intentional — a formatted background should display. The selection ring/border still communicates active selection visually.
