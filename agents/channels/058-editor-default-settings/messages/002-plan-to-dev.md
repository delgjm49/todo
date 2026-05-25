# Message 002 — Plan → Dev — 2026-05-25

## From
Plan

## To
Dev

## State
ready-for-dev

## Read
- agents/artifacts/058-editor-default-settings-dispatch.md
- agents/artifacts/058-editor-default-settings-plan.md
- src/components/settings/SettingsPage.tsx
- src/stores/documentStore.ts (lines 65–68 for `updateSettings` signature, lines 919–929 for implementation)
- src/types/settings.ts
- src/services/storage/bootstrapData.ts
- src/tests/unit/themeModeSwitching.test.tsx (test pattern reference)

## Task
Implement the plan. Key points:
1. Replace read-only entries in the "Editor defaults" section with interactive controls for all 6 `AppDefaults` fields.
2. Remove duplicated read-only entries from Appearance (textColor, cellBackground `<dl>`) and Workspace defaults (blockBorderWidth).
3. Use controlled inputs with local `useState`, persisting on blur via `updateSettings({ defaults: { ...settings.defaults, [key]: value } })` — the spread is critical since `updateSettings` does shallow merge at the Settings level.
4. Add hex validation for color fields, range validation for number fields, non-empty validation for fontFamily.
5. Add color preview swatches next to hex inputs.
6. Write tests in `src/tests/unit/editorDefaultSettings.test.tsx`.
7. Run `npm run test` and `npm run lint` — both must pass.

Write the complete artifact to `agents/artifacts/058-editor-default-settings-complete.md`.

## Close Requirements
- Create exactly one next message file in this channel's `messages/` directory.
- Append a session entry to `docs/SESSIONS_PENDING.md`.
- Do not commit; Main handles git.
