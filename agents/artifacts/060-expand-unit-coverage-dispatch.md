# Dispatch: Expand Unit Coverage for Domain Helpers

## What
Audit the existing unit test coverage for pure domain logic in `src/domain/` and `src/stores/` and expand tests for any high-risk areas that lack comprehensive coverage. The codebase already has a substantial test suite (30+ test files, 348+ tests), but some edge cases, error paths, and complex pure functions may still need deeper coverage.

## Why
Ticket-level tests verify the happy path for each feature, but they don't always stress-test edge cases, error branches, or interactions between domain modules. High-risk pure logic (formatting merge, sorting comparators, alert evaluation, validation coercion) benefits from dedicated unit coverage that exercises boundary conditions and invariant preservation.

## Scope

### In scope
- **Coverage audit**: review existing test files in `tests/unit/` against the domain modules in `src/domain/` to identify gaps. Specifically examine:
  - `src/domain/formatting/` — `applyFormattingPatch.ts`, formatting merge/resolution helpers
  - `src/domain/sorting/` — `compareValues.ts` comparators, `sortRows.ts`, edge cases for null/undefined/mixed types
  - `src/domain/alerts/` — `evaluateRow.ts`, `evaluateWorkspace.ts`, date-only and time-only semantics
  - `src/domain/validation/` — input coercion, boundary validation, fallback behavior
  - `src/domain/templates/` — block template creation, edge cases for malformed/empty inputs
  - `src/domain/clipboard/` — serialization round-trips, cross-block compatibility
  - `src/stores/documentStore.ts` — complex multi-step mutations, error recovery paths
- **Test expansion**: add focused unit tests for identified gaps. Each new test should be a pure function test (input → output assertion) that doesn't require React rendering or Tauri APIs.
- **Test quality**: new tests should follow existing patterns (describe/it blocks, clear assertion messages, minimal setup)

### Out of scope
- UI/component tests (already well covered by feature tickets)
- E2E or Playwright tests (TICKET-062)
- Integration tests across the full editing flow (TICKET-061)
- Performance benchmarks
- Refactoring domain logic for testability — test what's there

## Related Spec Sections
- docs/TODO_APP_IMPLEMENTATION_BACKLOG.md TICKET-060

## Constraints
- Write tests that run in Vitest + JSDOM (no Tauri APIs in unit tests)
- Follow existing test naming and structure conventions
- Keep tests focused — one concept per `test()` block
- `npm run test` must pass (including new tests)
- `npm run lint` must pass

## Acceptance Criteria
- [ ] Plan identifies specific coverage gaps with file/function names
- [ ] Dev writes tests for all identified gaps
- [ ] New tests are all pure function tests (no React render, no Tauri)
- [ ] All new tests pass
- [ ] No regressions in existing test suite
- [ ] `npm run lint` passes
