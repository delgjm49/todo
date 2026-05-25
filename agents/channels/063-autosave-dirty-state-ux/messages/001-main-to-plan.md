# Message 001 — Main → Plan — 2026-05-25

## From
Main

## To
Plan

## State
ready-for-plan

## Read
- agents/artifacts/063-autosave-dirty-state-ux-dispatch.md

## Task
Create the implementation plan for this dispatch. Write the plan to `agents/artifacts/063-autosave-dirty-state-ux-plan.md`.

## Context
The app already has full autosave infrastructure in `documentStore.ts`:
- `saveStatus`: `"idle" | "saving" | "saved" | "partial" | "error"`
- `dirty: boolean`
- `saveError: SaveFailure | null`
- `lastSaveAt: string | null`
- `saveAll()` and `retrySave()` methods
- `scheduleAutosave()` called from `commitSnapshot` and `updateSettings`
- `DEFAULT_AUTOSAVE_DELAY_MS` already configured

What is missing:
- Any visible save status indicator in the UI
- A retry affordance when save fails
- Verification that all mutation paths set dirty consistently
- Verification that undo/redo restore dirty state correctly

The top bar (`src/components/layout/AppShell.tsx` or similar) currently has workspace title, add block, undo/redo, inspector toggle, settings entry — but no save feedback.

## Close Requirements
- Create exactly one next message file in this channel's `messages/` directory.
- Append a session entry to `docs/SESSIONS_PENDING.md`.
- Do not commit; Main handles git.
