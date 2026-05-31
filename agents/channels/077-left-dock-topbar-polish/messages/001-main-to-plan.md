# Message 001 — Main → Plan — 2026-05-31

## From
Main

## To
Plan

## State
ready-for-plan

## Read
- agents/artifacts/077-left-dock-topbar-polish-dispatch.md
- docs/TODO_APP_UI_SPEC.md
- docs/TODO_APP_TECH_SPEC.md
- agents/artifacts/074-search-mvp-dispatch.md
- agents/artifacts/074-search-mvp-complete.md

## Task
Create the implementation plan for the left dock and top-bar polish dispatch. Focus on identifying the current shell/dock/top-bar/search/workspace-ordering components and the safest targeted changes to satisfy the live-QA polish list, including workspace drag reorder persistence. Write the plan to `agents/artifacts/077-left-dock-topbar-polish-plan.md`, then append exactly one next message to this channel addressed to Dev unless Main triage is required.

## Required Verification
Plan should specify the expected verification commands for Dev and Review, including:
- `npm run test`
- `npm run lint`
- `npm run build`

Plan should also call out any targeted tests to add/update for workspace reorder persistence and changed shell/search affordances where practical.

## Close Requirements
- Create `agents/artifacts/077-left-dock-topbar-polish-plan.md`.
- Create exactly one next message file in `agents/channels/077-left-dock-topbar-polish/messages/`, addressed to Dev unless Main triage is required.
- Append a session entry to `docs/SESSIONS_PENDING.md`.
- Do not commit; Main handles git after Review passes.
