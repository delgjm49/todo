# Message 001 — Main → Plan — 2026-05-25

## From
Main

## To
Plan

## State
ready-for-plan

## Read
- agents/artifacts/031-hotkey-layer-dispatch.md

## Task
Create the implementation plan for this dispatch. Write the plan to `agents/artifacts/031-hotkey-layer-plan.md`.

## Context
The app currently has no centralized hotkey system. Individual components handle their own `onKeyDown`:
- `src/components/cell/TextCell.tsx` — Enter, Escape, clipboard guard (Ctrl+C/X/V/A pass-through)
- `src/components/cell/DateCell.tsx` — Enter, Escape
- `src/components/cell/TimeCell.tsx` — Enter, Escape
- `src/components/block/BlockCard.tsx` — Enter on title input
- `src/components/layout/TypeSpecificColumnSettings.tsx` — Enter on option input

Existing store actions you may wire to:
- `historyStore` — `undo()`, `redo()` (from TICKET-012)
- `documentStore` — `copyRows()`, `cutRows()`, `pasteRows()` (from TICKET-050)
- `documentStore` — row deletion actions (from TICKET-035)
- `uiStore` — selection state, inspector toggle, menu state

The tech spec recommends a dedicated `useHotkeys` hook or `HotkeyProvider` so shortcuts stay centralized.

## Close Requirements
- Create exactly one next message file in this channel's `messages/` directory.
- Append a session entry to `docs/SESSIONS_PENDING.md`.
- Do not commit; Main handles git.
