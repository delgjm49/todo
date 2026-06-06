# Dispatch: Light-Mode Default Color Cleanup

## What
Plan and implement a focused polish slice that makes fresh light-mode defaults visually appropriate for workspace cards/buttons and block/cell text. Clarify and preserve the behavior for existing explicit dark formatting so the cleanup improves new/default flows without destructively rewriting user-chosen colors.

## Why
The app has strong theme-mode support and persisted editor/workspace defaults, but live QA identified that some fresh/default colors remain dark-theme-oriented when the app is used in light mode. This is the remaining recommended polish slice in `docs/SESSIONS.md` after dispatch 078.

## Scope
- Investigate the current default color sources for:
  - initial bootstrap settings and starter workspace/block data;
  - validated/fallback settings and workspace index styles;
  - new workspace creation from settings defaults;
  - new block/template formatting and app-default-to-formatting behavior;
  - light/dark theme switching and defaults settings UI.
- Define the intended behavior for fresh light-mode defaults versus explicitly persisted dark colors.
- Implement the smallest safe changes so fresh light-mode workspaces/cards/buttons and block/cell text have readable light-mode defaults.
- Preserve existing explicit user formatting and persisted dark values; do not add a broad migration that overwrites user choices.
- Add or update targeted tests for the default/fallback behavior and preservation rules.

**Out of scope:**
- Full theming redesign or palette overhaul.
- Schema-version migration unless Plan proves it is necessary and safe.
- Rewriting existing user documents/settings just because their values resemble old defaults.
- The dispatch 078 sortable-header follow-up items; those are queued separately as dispatch 081.

## Related Spec Sections
- `docs/SESSIONS.md` — Next Recommended: light-mode persisted default color cleanup
- `docs/TODO_APP_UI_SPEC.md` — theme/appearance expectations, if relevant during planning
- `agents/artifacts/057-theme-mode-switching-review.md`
- `agents/artifacts/058-editor-default-settings-review.md`
- `agents/artifacts/059-workspace-default-settings-review.md`
- Likely source/tests to inspect:
  - `src/services/storage/bootstrapData.ts`
  - `src/services/storage/storageSchemas.ts`
  - `src/stores/documentStore.ts`
  - `src/domain/formatting/appDefaultsToFormatting.ts`
  - `src/domain/templates/blockTemplates.ts`
  - `src/components/workspace/WorkspaceCard.tsx`
  - `src/components/settings/SettingsPage.tsx`
  - existing editor/workspace defaults and theme tests under `src/tests/`

## Constraints
- Route through Plan first. Plan must verify current behavior from disk before deciding whether this is a settings-default issue, bootstrap/fallback issue, block-template formatting issue, or a combination.
- Keep storage durable and local-only; avoid schema changes unless clearly justified.
- Preserve user intent: explicit persisted colors remain explicit, even if they are dark colors used while in light mode.
- Prefer targeted helpers/tests over scattered literal color replacements.
- Main handles final close/commit/push; queue mode is pre-authorized for auto-close and auto-advance after Review passes.

## Acceptance Criteria
- [ ] Plan documents verified current-state facts for how default editor/workspace colors are bootstrapped, validated, applied to new workspaces/blocks, and rendered.
- [ ] Fresh light-mode defaults for workspace cards/buttons and block/cell text are readable and visually consistent with light mode.
- [ ] Existing explicit dark formatting/persisted user colors are not overwritten or silently normalized away.
- [ ] Behavior for invalid/missing persisted colors remains deterministic and covered by tests.
- [ ] Targeted tests cover the fresh-default behavior and explicit-color preservation rule.
- [ ] Standard verification passes for the implementation dispatch: `npm run test`, `npm run lint`, and `npm run build`.
