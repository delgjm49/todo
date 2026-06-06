# Message 001 — Main → Plan — 2026-06-06

## From
Main

## To
Plan

## State
ready-for-plan

## Read
- agents/artifacts/080-light-mode-default-color-cleanup-dispatch.md
- docs/SESSIONS.md
- docs/TODO_APP_UI_SPEC.md
- agents/artifacts/057-theme-mode-switching-review.md
- agents/artifacts/058-editor-default-settings-review.md
- agents/artifacts/059-workspace-default-settings-review.md
- src/services/storage/bootstrapData.ts
- src/services/storage/storageSchemas.ts
- src/stores/documentStore.ts
- src/domain/formatting/appDefaultsToFormatting.ts
- src/domain/templates/blockTemplates.ts
- src/components/workspace/WorkspaceCard.tsx
- src/components/settings/SettingsPage.tsx

## Task
Create the implementation plan for this dispatch. Ground the plan in current source/test behavior before proposing changes. In particular, clarify where dark-oriented defaults currently enter fresh light-mode flows and how Dev should fix those flows without overwriting existing explicit user colors. Write the plan to `agents/artifacts/080-light-mode-default-color-cleanup-plan.md`, then append exactly one next message to this channel addressed to Dev unless Main triage is required.

## Required Verification Planning
The implementation plan should require Dev to report commands using the project verification format. At minimum require:
- Targeted tests for settings/default/bootstrap/template behavior changed by the plan.
- `npm run test`
- `npm run lint`
- `npm run build`

## Close Requirements
- Create `agents/artifacts/080-light-mode-default-color-cleanup-plan.md`.
- Create exactly one next message file in `agents/channels/080-light-mode-default-color-cleanup/messages/`, addressed to Dev unless Main triage is required.
- Append a session entry to `docs/SESSIONS_PENDING.md`.
- Do not commit; Main handles git operations after Review passes.
