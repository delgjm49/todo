# Dispatch: Integration tests for critical editing flows

## What
Add integration tests covering the core editing workflows that span multiple stores, components, and persistence layers. These tests validate that the app works correctly end-to-end within the renderer process, complementing the existing unit test suite.

## Why
Unit coverage (TICKET-060) covers pure domain logic, but there are no integration tests for multi-store, multi-component workflows. Critical flows like workspace creation → block creation → row editing → save/load → undo/redo are high-risk and deserve repeatable coverage before v1.

## Scope
- Workspace CRUD (create, switch, rename, delete)
- Block CRUD (add, rename, delete, reorder, type switching)
- Row editing (add, delete, reorder, cell value changes, checkbox toggling)
- Save/load round-trip persistence (including formatting, sorting, column config)
- Undo/redo across the above flows
- Alert state integration (dock indicators, navigation highlight)

**Out of scope:**
- Playwright E2E (TICKET-062)
- New application features or UI changes
- Performance/load testing

## Related Spec Sections
- docs/TODO_APP_TECH_SPEC.md §Testing (Vitest patterns)
- docs/TODO_APP_IMPLEMENTATION_BACKLOG.md TICKET-061
- docs/TODO_APP_IMPLEMENTATION_BACKLOG.md TICKET-062 (follow-up)

## Constraints
- Use Vitest with React Testing Library for integration tests
- Mock Tauri filesystem APIs where persistence is involved (do not depend on real disk)
- Follow existing test file naming: `*.test.ts` or `*.test.tsx`
- Reuse existing test fixtures and helpers if available
- Tests must pass in `npm run test` (CI target)
- Do not modify production code except for minimal testability hooks if absolutely necessary

## Acceptance Criteria
- [ ] Core workspace CRUD workflow covered by repeatable tests
- [ ] Core block CRUD workflow covered by repeatable tests
- [ ] Row editing (add, delete, reorder, cell changes, checkbox) covered by repeatable tests
- [ ] Save/load round-trip persistence covered by repeatable tests
- [ ] Undo/redo across workflows covered by repeatable tests
- [ ] All new tests pass: `npm run test` exits 0
- [ ] Lint passes: `npm run lint` exits 0
