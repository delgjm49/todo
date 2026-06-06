# Dispatch: Richer Date/Time Picker Planning

## What
Create a reviewed planning artifact for a narrow post-MVP date/time picker improvement for date and time cells. This dispatch is planning/audit only: it should define an implementable UX and technical slice for dispatch 083 while preserving the existing persisted `string | null` cell-value contract.

## Why
Post-MVP backlog planning identified richer date/time pickers as a useful, lower-risk usability improvement after Search MVP. Date/time cells already participate in alerts, sorting, search, clipboard/storage validation, autosave/history, and row rendering, so the safest next step is to ground a narrow implementation plan before changing product code.

## Scope
- Inspect current date/time cell editing components, parsing/normalization behavior, storage schema coercion, sorting behavior, alert evaluation, clipboard/search interactions, autosave/history transaction boundaries, and existing tests.
- Define the intended user interaction model for date and time picker usage, including edit/open behavior, commit, cancel/escape/blur behavior, clearing values, invalid values, keyboard/mouse behavior, and focus handling.
- Preserve the existing persisted value contract for date/time cells: values remain compatible with current string/null representations; no storage migration should be required unless Plan proves otherwise.
- Produce a concrete implementation recommendation for dispatch 083, including likely files to modify/create, tests to add/update, risks, and acceptance criteria.
- Keep the planning output narrow enough for a follow-up implementation dispatch to complete in one normal Plan → Dev → Review cycle.

**Out of scope:**
- Product implementation in this dispatch.
- Schema changes or migration implementation.
- Reminder/alert feature expansion beyond preserving current alert compatibility.
- Recurring dates, natural-language parsing, timezone scheduling, closed-app notifications, or calendar integrations.
- Styling/theming overhaul unrelated to date/time picker usability.

## Related Spec Sections
- `agents/artifacts/073-post-mvp-backlog-planning-plan.md` — deferred follow-up candidate: richer date/time pickers
- `docs/SESSIONS.md` — Next Recommended post-MVP bundle
- Likely source/tests to inspect:
  - `src/components/cell/DateCell.tsx`
  - `src/components/cell/TimeCell.tsx`
  - `src/stores/documentStore.ts` (`updateDateCellValue`, `updateTimeCellValue`)
  - `src/services/storage/storageSchemas.ts`
  - `src/domain/sorting/compareValues.ts`
  - `src/domain/alerts/*`
  - `src/domain/search/*`
  - `src/domain/clipboard/rowClipboardTypes.ts`
  - relevant tests under `src/tests/unit/` and `src/tests/integration/`

## Constraints
- This is a planning/audit dispatch through Plan → Dev → Review, not a product implementation dispatch.
- Plan must include a `## Verified Current-State Facts` section grounded in current files/tests.
- Dev should execute the planning/audit work by creating a complete artifact, not by changing product source. Source/test changes are out of scope unless a tiny docs/artifact-only correction is required.
- Review should verify that the recommendation is grounded, non-destructive, and ready to feed dispatch 083.
- Queue mode is pre-authorized for auto-close and auto-advance after Review passes.

## Acceptance Criteria
- [ ] Current date/time cell behavior and adjacent domain impacts are verified from disk, not assumed.
- [ ] The recommended picker UX defines open/edit, commit, cancel, clear, invalid-value, focus, and keyboard/mouse behavior.
- [ ] The plan preserves the existing date/time persisted `string | null` contract or explicitly explains why any change would be necessary.
- [ ] The output identifies likely implementation files, test coverage, risks, and acceptance criteria for dispatch 083.
- [ ] No product source implementation is performed in this dispatch.
- [ ] Review confirms the planning output is sufficiently concrete for the next implementation dispatch.
