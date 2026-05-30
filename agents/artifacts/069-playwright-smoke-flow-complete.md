# Complete: Playwright smoke flow

## Summary
Implemented and fixed an enabled Playwright smoke test for TICKET-062 in `src/tests/e2e/smoke.spec.ts`. The smoke targets the configured Vite renderer/browser boundary, clears only `todo-app::` browser storage at startup, verifies the real seeded Home state, creates `Workspace 2`, adds a checklist, edits two rows, toggles a checkbox, waits for persisted browser storage, reloads, re-selects the workspace, and verifies persisted visible state.

## Files Changed
- `src/tests/e2e/smoke.spec.ts` — replaced the skipped placeholder with the deterministic Chromium/Vite renderer smoke test; fixed review findings by asserting Home's real seeded `Today` block, using the stable block-count test hook, and waiting for persisted localStorage content before reload.
- `src/components/layout/MainPane.tsx` — added minimal non-visual `data-testid="workspace-block-count"` to the block-count value for stable e2e selection.
- `agents/artifacts/069-playwright-smoke-flow-complete.md` — updated completion artifact with review-fix notes and current verification.
- `docs/SESSIONS_PENDING.md` — appended Dev session entries.
- `agents/channels/069-playwright-smoke-flow/messages/003-dev-to-review.md` — initial Dev → Review handoff.
- `agents/channels/069-playwright-smoke-flow/messages/005-dev-to-review.md` — review-fix Dev → Review handoff.

## Deviation Notes
Plan Step 2 expected the starter `Home` workspace to show zero blocks after reset, but Review confirmed the app intentionally seeds one `Today` checklist block. The smoke now asserts that real seeded state instead of changing app seeding. A minimal non-visual `data-testid` was added to the block-count value because the visible `Blocks` text is ambiguous in `MainPane`.

## Open Questions
None.

## Verification
- command: `npm run test:e2e`
- shell used: bash via Pi command tool on macOS
- result: passed
- if failed, exact failure surface: n/a
- checkpoint-scoped or unrelated repo-state: checkpoint-scoped verification passed
- was this the actual shell provided by the environment: yes, this Pi session executes verification through its bash command tool

- command: `npm run test:build`
- shell used: bash via Pi command tool on macOS
- result: passed
- if failed, exact failure surface: n/a
- checkpoint-scoped or unrelated repo-state: checkpoint-scoped verification passed
- was this the actual shell provided by the environment: yes, this Pi session executes verification through its bash command tool

- command: `npm run lint`
- shell used: bash via Pi command tool on macOS
- result: passed
- if failed, exact failure surface: n/a
- checkpoint-scoped or unrelated repo-state: checkpoint-scoped verification passed
- was this the actual shell provided by the environment: yes, this Pi session executes verification through its bash command tool

## Known Issues
None known.
