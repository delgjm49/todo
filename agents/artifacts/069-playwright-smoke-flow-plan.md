# Plan: Playwright smoke flow

## Overview
Add an enabled Playwright smoke test for TICKET-062 that exercises the existing Vite renderer surface through the configured Chromium project. The smoke should reset browser-backed app storage, create/select a workspace, create a checklist block, edit rows, reload, re-select the created workspace, and verify the visible persisted state.

This dispatch does **not** automate the packaged Tauri desktop shell. `playwright.config.js` starts `npm run dev` at `http://127.0.0.1:1420`, so the smoke runs against the browser/Vite renderer and the app's browser `localStorage` storage backend fallback rather than the Tauri filesystem backend.

## Prerequisites
- Playwright Chromium browser binaries must be available in the local environment for `npm run test:e2e`.
- If `npm run test:e2e` fails because browsers are not installed or a local dev-server port/environment issue prevents launch, report the exact blocker in the complete artifact as environment-only vs repo-state.

## Files to Create/Modify
| Action | Path | Description |
|--------|------|-------------|
| Modify | `src/tests/e2e/smoke.spec.ts` | Replace the skipped placeholder with the enabled Playwright smoke and small local helpers. |
| Modify only if needed | UI component files under `src/components/` | Add minimal `data-testid` hooks only if accessible selectors plus existing test IDs are insufficient; no behavior or styling changes. |

## Implementation Steps

### Step 1: Replace the skipped scaffold with an enabled smoke
- In `src/tests/e2e/smoke.spec.ts`, import both `test` and `expect` from `@playwright/test`.
- Remove `test.skip(...)`.
- Add a brief file-level comment that this smoke targets the Vite renderer/browser Playwright boundary, not packaged Tauri shell automation.
- Add one focused test, for example `test("creates checklist rows and persists them after reload", async ({ page }) => { ... })`.
- **Verify**: `npm run test:build` can type-check the Playwright spec.

### Step 2: Make the test deterministic by clearing browser-backed app storage once at the start
- Add a helper such as `resetTodoStorage(page)` that:
  1. navigates to `/`,
  2. removes `localStorage` keys beginning with the storage backend prefix `todo-app::`,
  3. reloads the page.
- Do **not** use `page.addInitScript(() => localStorage.clear())` for this test because it would also clear storage during the persistence-verification reload.
- Add a `waitForAppReady(page)` helper that waits for the app shell to be visible, e.g. `Workspace Dock` and the `+ Workspace` button, and for `Loading workspace` to be gone/hidden.
- **Verify**: after reset, the starter `Home` workspace is visible and the canvas shows zero blocks.

### Step 3: Exercise workspace creation/selection and checklist creation
- From the clean starter state, click the `+ Workspace` button.
- Verify the new workspace is active; with the current store defaults it should be titled `Workspace 2`.
- Click the empty-state `Add Checklist` button.
- Verify the checklist block appears with a `Checklist` title, a `Task` column header, one text-cell input, and one checkbox toggle.
- Prefer accessible selectors such as `page.getByRole("button", { name: "+ Workspace" })` and `page.getByRole("button", { name: "Add Checklist" })`; use existing `data-testid="text-cell-input"` and `data-testid="checkbox-cell-toggle"` for dynamic cells.
- **Verify**: the block count updates and the checklist row controls are visible.

### Step 4: Add/edit rows and touch checklist behavior
- Fill the first text-cell input with a unique value such as `Smoke task alpha`, then press `Enter` to commit the cell edit.
- Click the block `+ Row` button.
- Verify two text-cell inputs are present.
- Fill the second text-cell input with `Smoke task beta`, then press `Enter` to commit.
- Click the first checkbox toggle and verify it displays the checked glyph (`☑`).
- Wait for the final autosave cycle by first observing `Unsaved changes` after the final mutation, then waiting for `Saved`.
- **Verify**: both text inputs have the expected values before reload and the first checkbox is checked.

### Step 5: Reload and verify persisted visible state
- Reload the page.
- Wait for the app shell to be ready again.
- Because the current storage load path chooses the first workspace as active on reload, click the persisted `Workspace 2` card/button in the dock to re-select the created workspace.
- Verify the `Checklist` block is present, two text-cell inputs are present, their values are `Smoke task alpha` and `Smoke task beta`, and the first checkbox toggle still displays `☑`.
- **Verify**: this proves persistence across renderer reload through the browser storage backend used by the current Playwright config.

### Step 6: Keep selectors stable without overfitting
- Start with existing accessible labels/text and existing test IDs:
  - `+ Workspace`
  - `Add Checklist`
  - `+ Row`
  - `data-testid="text-cell-input"`
  - `data-testid="checkbox-cell-toggle"`
- If strict locator errors occur because visible text is duplicated, scope locators to nearby containers or add the narrowest possible `data-testid` to the relevant component.
- Do not alter user-facing copy, storage behavior, or application logic solely for this smoke.
- **Verify**: `npm run lint` passes after any selector/test-hook edits.

## Data / Storage Changes
No schema or persisted JSON shape changes are required. The test should isolate state by clearing browser `localStorage` keys with the `todo-app::` prefix before the smoke starts; it should then rely on the existing storage service/autosave path and verify persistence after a page reload.

## UI Specifications
No user-facing UI changes are planned. Any new test hooks must be non-visual `data-testid` attributes only, added only if the existing accessible selectors and current test IDs are insufficient for a stable smoke.

## Acceptance Criteria
- [ ] `src/tests/e2e/smoke.spec.ts` contains an enabled Playwright smoke test, not a skipped placeholder.
- [ ] The smoke resets browser-backed app storage deterministically at the start without clearing storage during the verification reload.
- [ ] The smoke covers launch/initial state, workspace creation/selection, checklist block creation, row add/edit, checkbox toggle, reload, and persistence verification.
- [ ] The smoke documents that it targets the Vite renderer/browser surface, not packaged Tauri desktop shell automation.
- [ ] `npm run test:e2e` passes locally, or the complete artifact reports the exact environment-only/repo-state blocker.
- [ ] `npm run test:build` and `npm run lint` pass, or failures are reported with exact failure surfaces and classification.

## Required Verification
Dev must report these commands using the project verification format from `agents/CLOSING.md`:
- `npm run test:e2e`
- `npm run test:build`
- `npm run lint`

If any command cannot complete because Playwright browser binaries or local environment setup are missing, include the exact command output and classify whether the blocker is environment-only or repo-state.

## Dependencies or Prerequisites
- Existing `playwright.config.js` must remain the source of truth for the e2e boundary (`npm run dev`, Chromium, base URL `http://127.0.0.1:1420`).
- Existing autosave behavior must be used as-is; do not add product persistence behavior in this dispatch.

## Estimated Complexity
- Small/Medium
- Expected file count: 1 test file, plus at most 1-2 component files only if minimal selector hooks are unavoidable.
