# Dispatch: Smoke v7 — Phase 3 Spool-Format Dispatch Test

## What
Run a minimal artifact-only dispatch through the new Phase 3 spool-format channel system to validate end-to-end operation with interactive worker mode. The channel is a `messages/` directory with individual numbered message files, not a single legacy channel document. The route follows the standard forced-loop pattern: `Main → Plan → Dev → Review → Dev → Review → Main`.

## Why
All previous smokes (001–021) used legacy single-file channels (`agents/channels/NNN-feature-channel.md`). Phase 3 requires spool directories (`agents/channels/NNN-feature/messages/NNN-from-to.md`) and is now mandatory for all new dispatches. This smoke validates that the directory-per-channel, file-per-message workflow works correctly end-to-end — including worker role resolution, state re-read from disk on loopback, and proper message numbering.

## Scope
- In scope: create a minimal plan artifact under `agents/artifacts/`.
- In scope: create and update a disposable Dev marker artifact under `agents/artifacts/`.
- In scope: create complete and review artifacts under `agents/artifacts/`.
- In scope: intentionally force exactly one Review → Dev loop.
- In scope: validate the spool directory channel format end-to-end (directory creation, message file naming, sequencing).
- In scope: validate interactive worker mode behavior with Phase 3 pickups (`pickup agents/channels/NNN-feature/`).
- Out of scope: app source, app tests, package/Tauri config, product docs, orchestration config, dispatch-auto code, external scripts, and commits by workers.

## Required Route

```
Main → Plan → Dev → Review → Dev → Review → Main
```

## Required Loop Semantics

1. **First Dev pass** writes `agents/artifacts/022-dispatch-smoke-v7-marker.md` with exact line:
   ```text
   smoke-v7-state: first-pass
   ```
   After writing the marker, append `002-dev-to-review.md` to the channel's `messages/` directory with `State = ready-for-review`.

2. **First Review pass** must intentionally return to Dev with `State = needs-dev-fix`, even if everything else is correct. It should instruct Dev to update the marker to:
   ```text
   smoke-v7-state: second-pass
   ```
   Append `003-review-to-dev.md` to the channel's `messages/` directory.

3. **Second Dev pass** must:
   - Re-read the channel from disk (`agents/channels/022-dispatch-smoke-v7/messages/`).
   - Parse the latest message file — identify that the most recent message is `003-review-to-dev.md` with `## To = Dev` and `State = needs-dev-fix`.
   - Recompute active role from that message.
   - Update the marker to `smoke-v7-state: second-pass`.
   - Create `agents/artifacts/022-dispatch-smoke-v7-complete.md` with lightweight verification results documenting both Dev passes.
   - Append `004-dev-to-review.md` to the channel's `messages/` directory with `State = ready-for-review`.

4. **Second Review pass** verifies the marker now contains the second-pass line, confirms the complete artifact documents both passes, and returns `State = review-pass` to Main. Append `005-review-to-main.md` to the channel's `messages/` directory.

## Test Objective (explicit)

Validate Phase 3 spool-format channel workflow end-to-end by answering:

- Did the spool directory structure get created correctly?
- Did each agent create exactly one new numbered message file (not modify existing ones)?
- Did workers resolve their role from the `## To` field of the latest message file?
- Did the second Dev pass re-read the channel from disk and correctly identify its task from the latest Review → Dev message?
- Does the final message chain contain exactly 6 files (`001-main-to-plan.md`, `002-plan-to-dev.md`, `003-dev-to-review.md`, `004-review-to-dev.md`, `005-dev-to-review.md`, `006-review-to-main.md`)?

Pass condition: the channel's `messages/` directory contains exactly 6 numbered message files with no gaps, correct routing, and valid `State` values.

## Related Spec Sections
- agents/workflows/dispatch-channel-protocol.md (spool-format rules)
- agents/ARTIFACTS.md
- agents/CLOSING.md
- agents/orchestration.json

## Constraints
- Keep all created worker artifacts disposable and located under `agents/artifacts/`.
- Do not modify app/source/product documentation files. `docs/SESSIONS.md` updates are allowed because the workflow requires them.
- Use only lightweight artifact verification such as checking expected files/content and `git diff --check`.
- Preserve the required route exactly.
- Workers must not edit dispatch-auto code, orchestration config, external scripts, app code, app tests, package/Tauri config, or product docs as part of this smoke test.
- This is the first spool-format dispatch — workers must follow the Phase 3 protocol rules (message-per-file, no single-channel-document appending).

## Acceptance Criteria
- [ ] Dispatch artifact exists at `agents/artifacts/022-dispatch-smoke-v7-dispatch.md`.
- [ ] Spool channel directory exists at `agents/channels/022-dispatch-smoke-v7/messages/`.
- [ ] `001-main-to-plan.md` exists with correct route and state.
- [ ] Plan writes `agents/artifacts/022-dispatch-smoke-v7-plan.md` with tiny artifact-only plan and spool-format-specific instructions.
- [ ] Plan appends `002-plan-to-dev.md` to the messages directory.
- [ ] First Dev writes marker with `smoke-v7-state: first-pass` and appends `003-dev-to-review.md`.
- [ ] First Review writes review artifact and returns `State = needs-dev-fix` to Dev, appending `004-review-to-dev.md`.
- [ ] Second Dev re-reads channel from disk, parses latest message, updates marker to `smoke-v7-state: second-pass`, creates complete artifact, and appends `005-dev-to-review.md`.
- [ ] Second Review returns `State = review-pass` to Main, appending `006-review-to-main.md`.
- [ ] Channel messages directory contains exactly 6 files with correct routing and no gaps.
- [ ] No app source, app tests, package/Tauri config, product docs, orchestration config, dispatch-auto code, or external script changes are made by workers.
