# Message 001 — Main → Plan — 2026-05-25

## From
Main

## To
Plan

## State
ready-for-plan

## Read
- agents/artifacts/057-theme-mode-switching-dispatch.md

## Task
Create the implementation plan for this dispatch. Write the plan to `agents/artifacts/057-theme-mode-switching-plan.md`.

## Context
The app currently renders in dark mode only. The infrastructure for theme switching is partially in place:
- `ThemeMode = "light" | "dark"` exists in `src/types/formatting.ts`
- `Settings.theme: ThemeMode` exists in `src/types/settings.ts`
- Default bootstrap theme is `"dark"` in `src/services/storage/bootstrapData.ts`
- Settings schema validation already accepts `"light" | "dark"` in `src/services/storage/storageSchemas.ts`
- CSS custom properties in `:root` (see `src/styles/globals.css`) are hardcoded to dark values with `color-scheme: dark`
- The SettingsPage (`src/components/settings/SettingsPage.tsx`) shows theme as read-only text
- Tailwind config (`tailwind.config.ts`) uses CSS custom properties for semantic colors but has no `darkMode` strategy configured

What is missing:
- Light theme CSS variable values
- A mechanism to toggle the active theme on the document
- An interactive theme control in the UI
- Initial theme application on app boot from persisted settings
- `color-scheme` update to match the active theme

The semantic color system (`bg-canvas`, `text-text`, `border-border`, etc.) should remain the primary mechanism — the ticket is about making the CSS custom properties theme-aware, not about sprinkling `dark:` utility variants everywhere.

## Close Requirements
- Create exactly one next message file in this channel's `messages/` directory.
- Append a session entry to `docs/SESSIONS_PENDING.md`.
- Do not commit; Main handles git.
