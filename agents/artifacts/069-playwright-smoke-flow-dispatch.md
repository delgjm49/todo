# Dispatch: Playwright smoke flow

## What
Add the real Playwright smoke coverage for TICKET-062, replacing the current skipped e2e scaffold with a reliable end-to-end smoke path. The smoke should validate the highest-value happy path through the existing Vite/renderer Playwright setup: launch app, create/select workspace, create a checklist block, add/edit rows, reload, and verify persistence.

## Why
Full planned v1 is otherwise complete, but the broader backlog still has no executable Playwright smoke. A repeatable browser-level smoke gives release confidence that critical UI wiring, autosave/persistence boundaries, and reload behavior still work after the extensive unit/integration coverage already added.

## Scope
- Replace `src/tests/e2e/smoke.spec.ts`'s skipped placeholder with executable Playwright smoke coverage.
- Cover first-launch/empty-state behavior as far as the existing dev-server renderer setup supports it.
- Cover creating or selecting a workspace, creating a checklist block, adding/editing at least one row, and reloading to verify persisted visible state.
- Add narrow, stable selectors/test hooks only where existing accessible roles/text are insufficient.
- Document the smoke boundary if it targets the Vite web surface rather than the packaged Tauri desktop shell.
- Ensure the smoke is reliable locally and in the existing Playwright config.

**Out of scope:**
- New product features or UX redesign.
- Broad e2e suite expansion beyond one focused smoke path.
- Cross-browser matrix work beyond the configured Chromium project.
- Packaged Tauri desktop automation unless Plan confirms it is already supported by the project setup.
- Fixing unrelated existing CI/environment failures; route blockers back to Main with a concrete diagnosis.

## Related Spec Sections
- docs/TODO_APP_IMPLEMENTATION_BACKLOG.md TICKET-062
- docs/TODO_APP_IMPLEMENTATION_BACKLOG.md EPIC-12: Testing, QA, and Packaging
- docs/TODO_APP_TECH_SPEC.md testing/storage architecture sections as needed
- src/tests/e2e/smoke.spec.ts
- playwright.config.js

## Constraints
- Use the existing Playwright setup: `npm run test:e2e` / `playwright.config.js` / `src/tests/e2e`.
- Prefer user-observable interactions and accessible selectors; add `data-testid` only when needed for stability.
- Keep test setup local-first and deterministic. Avoid dependence on external APIs, cloud services, or user machine state.
- If persistent app data must be isolated/reset for the smoke, Plan should identify the safest approach before Dev implements it.
- Do not weaken existing unit/integration/lint coverage to make e2e pass.
- Workers must append session entries to `docs/SESSIONS_PENDING.md`; Main handles commits.

## Acceptance Criteria
- [ ] `src/tests/e2e/smoke.spec.ts` contains an enabled Playwright smoke test rather than only a skipped placeholder.
- [ ] The smoke covers launch/initial state, workspace creation or selection, checklist block creation, row add/edit, reload, and persistence verification within the supported Playwright boundary.
- [ ] Any new selectors or test hooks are minimal, stable, and do not change user-facing behavior.
- [ ] The dispatch documents whether the smoke exercises the Vite renderer surface or a Tauri desktop shell, with rationale if desktop automation remains out of scope.
- [ ] `npm run test:e2e` passes locally or any environmental blocker is routed to Main with a precise diagnosis.
- [ ] Relevant existing verification still passes, at minimum `npm run test:build` and `npm run lint` unless Plan justifies additional/alternate commands.
