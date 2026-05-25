# Message 002 — Plan → Dev — 2026-05-25

## From
Plan

## To
Dev

## State
ready-for-dev

## Read
- agents/artifacts/057-theme-mode-switching-dispatch.md
- agents/artifacts/057-theme-mode-switching-plan.md

## Task
Implement the plan. Write the complete artifact (or confirm inline) and create the Dev → Review handoff.

## Context
The app currently renders in dark mode only. Infrastructure already exists:
- `ThemeMode = "light" | "dark"` in `src/types/formatting.ts`
- `Settings.theme: ThemeMode` in `src/types/settings.ts`
- Default bootstrap theme is `"dark"` in `src/services/storage/bootstrapData.ts`
- Settings schema validation accepts `"light" | "dark"` in `src/services/storage/storageSchemas.ts`
- CSS custom properties in `:root` (`src/styles/globals.css`) are hardcoded to dark
- SettingsPage (`src/components/settings/SettingsPage.tsx`) shows theme as read-only text
- Tailwind config (`tailwind.config.ts`) has no `darkMode` strategy
- `documentStore` has no `updateSettings` action yet — you will need to add one
- `saveAll` persists the full `AppDocument` including `settings`

The semantic color system (`bg-canvas`, `text-text`, `border-border`, etc.) must remain the primary mechanism. The goal is to make the CSS custom properties theme-aware by toggling an `html` class, not by replacing with Tailwind `dark:` utilities everywhere.

## Close Requirements
- Create exactly one next message file in this channel's `messages/` directory.
- Append a session entry to `docs/SESSIONS_PENDING.md`.
- Do not commit; Main handles git.
