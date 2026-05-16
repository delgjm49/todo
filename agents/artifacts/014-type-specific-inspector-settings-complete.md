# Complete: Type-Specific Inspector Settings (TICKET-046)

## Summary

Implemented TICKET-046 type-specific inspector settings. Added a `resolveColumnSettingsTarget` resolver, a `TypeSpecificColumnSettings` component with checkbox/dropdown/date/time controls and an inline dropdown options editor (add/rename/remove with validation), wired it into `InspectorShell`, and wrote targeted tests. Recovered from two prior output-length stalls that left partial work; repaired the test approach (using `@testing-library/react`'s `fireEvent` and `onInput` handlers on controlled text inputs for JSDOM compatibility) and removed an unused function parameter to clear lint.

## Files Changed

| Action | Path | Notes |
|--------|------|-------|
| Created | `src/components/layout/columnSettingsTarget.ts` | Pure resolver from `Selection` + workspace document → `ColumnSettingsTarget \| null`. Follows the same pattern as `resolveSelectedFormattingTarget`. |
| Created | `src/components/layout/TypeSpecificColumnSettings.tsx` | New inspector section component. Renders type-specific controls for checkbox (toggle strikeout/move-to-bottom), date/time (toggle alerts), and dropdown (inline options editor). Unsupported column types show a guidance message. Includes `ToggleRow` sub-component and `DropdownOptionsEditor` sub-component with add/rename/remove and validation. |
| Modified | `src/components/layout/InspectorShell.tsx` | Rendered `<TypeSpecificColumnSettings selection={selection} />` after `<BorderFormattingControls />`. |
| Created | `src/tests/unit/columnSettingsTarget.test.ts` | Unit tests for the resolver: none/block/row → null, column → target, cell → column, hidden/missing/stale → null. |
| Created | `src/tests/unit/typeSpecificColumnSettings.test.tsx` | JSDOM render tests for all selection kinds, checkbox toggle persistence, date/time toggle, dropdown add/rename/remove/validation, and cell → column resolution. Uses `fireEvent` from `@testing-library/react` for controlled input events. |
| Modified | `src/tests/unit/documentStore.test.ts` | Added one test: `updateColumnSettings` persists dropdown `options` and overwrites on subsequent calls. |

## Deviations from Plan

- **`onInput` handlers on text inputs**: Added `onInput` event handlers alongside `onChange` on the dropdown editor text inputs (add input and option edit inputs), mirroring the pattern used in `DateCell` and `TimeCell`. This was necessary because React's `onChange` for `<input type="text">` in JSDOM does not fire from dispatched native `input` events, but `onInput` does fire from `fireEvent.input`. The `onInput` handler has no visible production difference — it updates the same local state as `onChange` — but it ensures testability. This deviation was discovered during test implementation, not anticipated in the plan.
- **Removed unused `index` parameter**: The `handleOptionKeyDown` function originally accepted an unused `index` parameter. Removed it to satisfy the eslint `no-unused-vars` rule.
- **Test helper approach**: The plan did not specify which JSDOM input simulation approach to use. Initially used native `Event("input")` dispatching, then switched to `fireEvent.input` from `@testing-library/react`, then finally to `fireEvent.input` combined with the `onInput` component fix. The final approach matches the existing pattern in `rowEditing.test.tsx`.

## Open Questions

- None.

## Verification

- command: `npm run typecheck`
- shell used: zsh (macOS)
- result: pass (0 errors)
- if failed, exact failure surface: N/A
- checkpoint-scoped or unrelated repo-state: checkpoint-scoped
- was this the actual shell provided by the environment: yes

- command: `npm run test`
- shell used: zsh (macOS)
- result: pass (210 tests, 29 suites, 0 failures)
- if failed, exact failure surface: N/A
- checkpoint-scoped or unrelated repo-state: checkpoint-scoped
- was this the actual shell provided by the environment: yes

- command: `npm run build`
- shell used: zsh (macOS)
- result: pass (built successfully in ~900ms)
- if failed, exact failure surface: N/A
- checkpoint-scoped or unrelated repo-state: checkpoint-scoped
- was this the actual shell provided by the environment: yes

- command: `npm run lint`
- shell used: zsh (macOS)
- result: pass (0 errors, 0 warnings)
- if failed, exact failure surface: N/A
- checkpoint-scoped or unrelated repo-state: checkpoint-scoped
- was this the actual shell provided by the environment: yes

## Known Issues

- The `TypeSpecificColumnSettings` component renders `act()` warnings in JSDOM test output when external store selectors trigger re-renders. These are cosmetic (React's `act()` boundary heuristic in JSDOM; not a production bug) and match the same pattern seen in existing `TextFormattingControls` and `BorderFormattingControls` tests.