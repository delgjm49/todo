# Review: Expand Unit Coverage for Domain Helpers

## Plan Reviewed
- `agents/artifacts/060-expand-unit-coverage-plan.md`

## Complete Reviewed
- `agents/artifacts/060-expand-unit-coverage-complete.md`

## Scope Recap
Test-only dispatch. Audit existing unit coverage in `src/domain/` and add focused pure-function tests for identified gaps. Two new files (`formattingToCellStyle.test.ts`, `selectedFormattingTarget.test.ts`) plus extensions to five existing test files. No changes permitted under `src/domain/` or `src/services/`.

## Findings

### Correctness
- ✅ All new test assertions match the actual behavior of the source modules. Spot-checked `formattingToCellStyle.ts` (`fontSize ? ${n}px : undefined`), `selectedFormattingTarget.ts` (block / column / row / cell branches and visible-column filtering), `evaluateRow.ts` (calendar-validity roundtrip and `nowMs >= dueAt`), `compareValues.ts` (Intl.Collator numeric+base), `createColumn.ts` (date/time `alertsEnabled: false` default; numbered empty settings), `blockTemplates.ts` (border defaults, labels, cell defaults), and `rowClipboardTypes.ts` (canonical edge order, fontSize > 0, borderWidth ≥ 0, finite order, duplicate-id rejection) plus `mapPastedRows.ts` (by-column-id requires matching type; by-shape fallback).
- ✅ Diacritic-insensitive equality test correctly relies on `sensitivity: "base"` plus stable tie-break via `getRowsInDisplayOrder` + index.
- ✅ `evaluateWorkspace` tie-breaking tests verify the documented "first row encountered" and "primary in second block" behavior.

### Completeness
- ✅ Both new files exist with the expected case counts (formattingToCellStyle: 13 `test(...)` blocks covering the 8 conceptual cases from the plan plus minor splits; selectedFormattingTarget: 13 cases matching the plan exactly).
- ✅ `alertEvaluation.test.ts` gained 10 new cases across `evaluateRow — calendar and time boundaries` (8) and `evaluateWorkspace — tie-breaking and block ordering` (2).
- ✅ `blockRowSorting.test.ts` gained 5 new cases under `block row sorting — collation and edge cases`. The plan's 6th case (`sort = null`) was reasonably dropped as a duplicate of an existing assertion at line 218.
- ✅ `columnHelpers.test.ts` gained 8 new cases under `column helpers — createColumn defaults and changeColumnType conversions`.
- ✅ `blockTemplates.test.ts` gained 8 new cases under `block templates — options, labels, and cell defaults`.
- ✅ `rowClipboard.test.ts` gained 8 new cases under `row clipboard — additional edge cases`.
- ✅ Plan acceptance criteria all satisfied; no missing items.

### Quality
- ✅ All new files / sections follow existing conventions (`node:test` + `node:assert/strict`, factory helpers, `describe` / `test` blocks, one concept per test).
- ✅ New tests are pure unit tests — no React rendering, no Tauri APIs, no DOM dependencies.
- ✅ Factory helpers in `selectedFormattingTarget.test.ts` are modeled cleanly after `alertEvaluation.test.ts` as the plan requested.
- ✅ `changeColumnType` test for `"false"` string → `true` (Boolean coercion) is appropriately documented in a comment, since this is intentional behavior worth flagging.

### Data Integrity
- ✅ N/A for this dispatch (test-only, no storage or persistence changes).

### Test Risk (React + Vitest + jsdom)
- ✅ No new React/jsdom controlled-input tests. All additions are pure-function tests; no `act()` exposure.

## Deviations from Plan
Dev called out three deviations in the complete artifact; all are reasonable:

1. **Step 3 — time 23:59:59 boundary**: Plan called for `now` one second after `23:59:59`, which would push the date forward and make the time-column evaluation interpret the due time as the *next* day (because time-column dueAt is anchored to `now`'s local day). Dev correctly retargeted the assertion to test the exact equality boundary (`now === dueAt` ⇒ `hasAlert: true`), which is the meaningful boundary in `evaluateRow.ts:145` (`nowMs >= dueAt`).
2. **Step 4 — dropped `sort = null` case**: Already covered by existing test `treats numbered and missing sort columns as display-order no-ops with normalized order` at line 218. Dropping avoids duplication.
3. **Step 4 — column id naming**: Adjusted ad-hoc test column type strings to match the `ColumnType` union (`"text"` instead of `"txt"`) to satisfy the `sort()` helper signature. Functionally equivalent.

## Issues Found
None.

## Verification

- command: `npm run test`
- shell used: zsh (macOS)
- result: 410 pass, 2 fail (1 subtest + 1 enclosing suite). The failing subtest is `alertScheduler.test.ts > edit-triggered re-evaluation > updateTimeCellValue triggers alert re-evaluation`.
- if failed, exact failure surface: `alertScheduler.test.ts:367` uses `new Date().getHours() + 5` then `% 24`, which wraps near end-of-day and turns the "future" time into the past — wall-clock dependent. Reproduces independently of this dispatch; flagged by Dev in the complete artifact and unchanged by the new tests.
- checkpoint-scoped or unrelated repo-state: Unrelated pre-existing flake.
- was this the actual shell provided by the environment: Yes (zsh on macOS).

- command: `npm run lint`
- shell used: zsh (macOS)
- result: Pass (0 warnings, 0 errors).
- checkpoint-scoped or unrelated repo-state: Scoped clean.
- was this the actual shell provided by the environment: Yes (zsh on macOS).

Note: an earlier `npm run test` invocation also showed a transient `SaveStatusIndicator > renders nothing when saveStatus=loading` failure that did not reproduce on subsequent runs. It is unrelated to this dispatch (no clipboard/sorting/formatting/templates test touches that component) and consistent with intermittent jsdom timing in that suite — captured here for awareness; not blocking.

## Verdict
**PASS**

All acceptance criteria met. Plan was followed accurately; the three deviations are documented and well-reasoned. New tests are pure, accurately reflect current domain behavior, and pass. No domain/service code was modified. Pre-existing time-sensitive flake in `alertScheduler.test.ts` is correctly identified and out of scope.

## Next Steps
Channel routes to Main for closeout. Main may want to open a follow-up ticket to harden `updateTimeCellValue triggers alert re-evaluation` (replace wall-clock derivation with an injected `now`), but that is intentionally out of scope here.
