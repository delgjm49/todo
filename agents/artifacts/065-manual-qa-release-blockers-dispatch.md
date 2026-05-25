# Dispatch: Manual QA Pass and Release Blocker Fixes

## What
Run a systematic QA pass over the entire app codebase to identify and fix critical defects before MVP release. This is the final P1 ticket — after this, no known critical blockers should remain for the v1 MVP Core ship.

## Why
All major features are implemented (workspaces, blocks, rows, cells, formatting, sorting, clipboard, alerts, theme, autosave). Before shipping, we need confidence that the app is stable, consistent, and free of critical defects that would block a credible release.

## Scope

### In scope
- **Systematic feature verification**: examine each major feature area for bugs, missing edge-case handling, or inconsistent behavior:
  - Dock/workspace list: rendering, selection, drag reorder, rename, delete
  - Block editing: create from template, title edit, collapse/expand, reorder, move, delete
  - Row/cell editing: add, insert, delete, reorder, type-specific cells (text, checkbox, date, time, dropdown), cell value updates
  - Formatting: text formatting, border formatting, inheritance, inspector controls, persistence
  - Sorting: sort menu, comparators, stable identity
  - Clipboard: internal row clipboard, plain text clipboard, hotkeys
  - Alerts: evaluation, scheduler, dock indicators, navigation + highlight
  - Theme: light/dark switching, CSS variable coherence
  - Autosave: dirty tracking, save status indicator, retry, undo/redo interaction
- **Error handling audit**: identify unhandled error paths (storage failures, invalid inputs, missing targets) and add guards or user-facing feedback where appropriate
- **Accessibility audit**: verify interactive elements have proper focus states, ARIA labels where needed, and keyboard operability
- **Test verification**: run the full test suite, ensure all tests pass, assess test coverage gaps for critical paths
- **Lint/type verification**: ensure zero lint warnings and zero TypeScript errors
- **Code cleanup**: remove any dead code, unused imports, TODOs without clear deferral, or console.logs

### Out of scope
- New features (TICKET-058, TICKET-059 settings UIs are post-MVP Core)
- Expanded test coverage beyond critical paths (TICKET-060/061 are separate)
- Playwright E2E tests (TICKET-062 is separate)
- Performance optimization beyond obvious issues
- macOS packaging

## Constraints
- Fixes should be minimal and targeted — do not refactor entire subsystems unless a critical blocker justifies it
- Follow existing patterns and conventions
- Add tests for any new fix that is testable
- `npm run test` must pass
- `npm run lint` must pass

## Acceptance Criteria
- [ ] Systematic QA checklist completed for all major feature areas
- [ ] Critical defects found during QA are fixed
- [ ] No known crash, data-loss, or corruption issues remain in normal use paths
- [ ] Full test suite passes
- [ ] Lint passes with zero warnings
- [ ] Any new fix has test coverage where feasible
- [ ] Review confirms no blockers remain
