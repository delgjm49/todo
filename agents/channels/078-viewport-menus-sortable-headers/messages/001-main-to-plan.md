# Message 001 — Main → Plan — 2026-06-03

## From
Main

## To
Plan

## State
ready-for-plan

## Read
- agents/artifacts/078-viewport-menus-sortable-headers-dispatch.md
- docs/TODO_APP_UI_SPEC.md
- docs/TODO_APP_TECH_SPEC.md
- docs/TODO_APP_IMPLEMENTATION_BACKLOG.md
- agents/artifacts/007-block-row-sorting-domain-logic-dispatch.md
- agents/artifacts/008-sort-menu-ui-dispatch.md
- agents/artifacts/077-left-dock-topbar-polish-dispatch.md

## Task
Create the implementation plan for viewport-safe menus and sortable block headers. Ground the plan in current source/test files for block/workspace/column menus, popover positioning, block header rendering, numbered-list headers, and existing sort domain/store behavior. Write the plan to `agents/artifacts/078-viewport-menus-sortable-headers-plan.md`, then append exactly one next message to this channel addressed to Dev unless Main triage is required.

## Required Verification
Plan should specify the expected verification commands for Dev and Review, including:
- `npm run test`
- `npm run lint`
- `npm run build`

Plan should also call out targeted tests to add/update for viewport clamping and header click-sort/toggle interactions where practical.

## Close Requirements
- Create `agents/artifacts/078-viewport-menus-sortable-headers-plan.md`.
- Create exactly one next message file in `agents/channels/078-viewport-menus-sortable-headers/messages/`, addressed to Dev unless Main triage is required.
- Append a session entry to `docs/SESSIONS_PENDING.md`.
- Do not commit; Main handles git after Review passes.
