# Plan: Theme Mode Switching

## Overview
Add functional light/dark theme switching to the app. The infrastructure is partially in place (`ThemeMode` type, `settings.theme` field, semantic CSS custom properties), but the theme is hardcoded to dark values. This plan covers: defining light theme CSS variables, adding a theme toggle to Settings, wiring the theme to the document, and adding tests.

## Files to Create / Modify

### Create
- `src/hooks/useTheme.ts` — Watches `settings.theme` from documentStore and syncs the active theme to the DOM (`html` class + `color-scheme`).
- `tests/unit/themeModeSwitching.test.tsx` — Tests for DOM class toggle, CSS variable values, persistence, and SettingsPage control.

### Modify
- `tailwind.config.ts` — Add `darkMode: "class"` to enable `dark:` utility variants.
- `src/styles/globals.css` — Split CSS custom properties into `html.dark` and `html.light` selectors; add light theme values and light `body` background; keep dark as the default.
- `src/stores/documentStore.ts` — Add `updateSettings` action to the `DocumentStoreState` interface and implementation. This action updates `state.settings`, marks dirty, and schedules autosave.
- `src/components/settings/SettingsPage.tsx` — Replace the read-only "Theme mode" text entry with an interactive control (segmented buttons or select) that calls `updateSettings({ theme })`.
- `src/app/App.tsx` — Call `useTheme()` at the top level so the theme applies as soon as settings are loaded.

## Step-by-Step Instructions

### Step 1: Tailwind config
In `tailwind.config.ts`, add `darkMode: "class"` at the top level (sibling to `content`). This lets the `dark:` prefix work if ever needed, though the primary mechanism remains CSS custom properties.

### Step 2: CSS theme variables
In `src/styles/globals.css`:

1. Keep the current `:root` dark values as the default.
2. Add an `html.light` selector that overrides every semantic custom property with light-appropriate values:
   - `--color-canvas`: `#f8fafc` (slate-50)
   - `--color-panel`: `#ffffff`
   - `--color-panel-muted`: `#f1f5f9` (slate-100)
   - `--color-accent`: `#2563eb` (blue-600)
   - `--color-accent-soft`: `rgba(37, 99, 235, 0.12)`
   - `--color-border`: `#e2e8f0` (slate-200)
   - `--color-text`: `#0f172a` (slate-900)
   - `--color-text-muted`: `#64748b` (slate-500)
   - `--color-danger`: `#dc2626` (red-600)
   - `--color-warning`: `#d97706` (amber-600)
3. Move `color-scheme` from `:root` to `html.dark` and `html.light` with respective values.
4. Move the `body` background gradient from the global `body` selector into `html.dark body` and add a `html.light body` variant with a light-friendly gradient (subtle radial + linear, or a simple flat background if gradient matching is too complex).
5. Keep the global `font-family` and `box-sizing` rules unchanged.

**Rationale**: The `:root` dark default ensures the loading screen and any pre-React content render dark. The `html.light` override switches the entire app when the class is toggled.

### Step 3: useTheme hook
Create `src/hooks/useTheme.ts`:

1. Subscribe to `documentStore.settings.theme` via `useDocumentStore(...)`.
2. In a `useEffect` keyed on `theme`:
   - If `theme === "light"`: `document.documentElement.classList.remove("dark")`, `document.documentElement.classList.add("light")`, `document.documentElement.style.colorScheme = "light"`.
   - Else: `document.documentElement.classList.remove("light")`, `document.documentElement.classList.add("dark")`, `document.documentElement.style.colorScheme = "dark"`.
3. On unmount or theme change, clean up appropriately.
4. Export the hook.

**Note**: This runs inside React, so it applies after hydration. The loading screen will briefly show dark (the `:root` default), which is acceptable.

### Step 4: documentStore updateSettings action
In `src/stores/documentStore.ts`:

1. Add `updateSettings: (patch: Partial<Settings>, options?: DocumentMutationOptions) => boolean` to the `DocumentStoreState` interface.
2. Implement `updateSettings` in the store creation:
   - If `!state.settings`, return `false`.
   - Compute `nextSettings = { ...state.settings, ...patch }` using `structuredClone` for safety.
   - `set({ settings: nextSettings })`.
   - `markDirty(true)`.
   - `scheduleAutosave(options?.service, options?.autosaveDelayMs, get().saveAll)`.
   - Return `true`.

This follows the same pattern as other simple state mutations that don't need history/undo.

### Step 5: SettingsPage theme control
In `src/components/settings/SettingsPage.tsx`:

1. Import `useDocumentStore`.
2. Get `updateSettings` from the store.
3. Replace the read-only `Workspace defaults` entry `["Theme mode", settings?.theme ?? "dark"]` with an interactive control.
4. Use a segmented button group (two buttons: "Light" / "Dark") or a `<select>` element. Style it with existing Tailwind classes (`border-border bg-panel text-text hover:bg-panelMuted`, etc.).
5. On change, call `updateSettings({ theme: newTheme })`.
6. Also remove the duplicate "Theme" entry from the `Appearance` section (or consolidate — there are currently two read-only theme entries, one under Appearance and one under Workspace defaults).

### Step 6: App.tsx integration
In `src/app/App.tsx`:

1. Import and call `useTheme()` at the top of the `App` component body, before the render logic.
2. This ensures the hook subscribes to settings and applies the theme as soon as the store is hydrated.

### Step 7: Tests
Create `tests/unit/themeModeSwitching.test.tsx`:

1. **DOM class toggle test**: Render `<App />` with light theme in documentStore, assert `document.documentElement.classList.contains("light")` is true and `contains("dark")` is false. Then simulate switching to dark and assert the inverse.
2. **CSS variable values test**: With `html.light` applied, read `getComputedStyle(document.documentElement).getPropertyValue("--color-canvas")` and assert it equals the light value (`#f8fafc`). With `html.dark`, assert it equals the dark value (`#0f172a`).
3. **Persistence test**: Update settings theme via `documentStore.getState().updateSettings({ theme: "light" })`, wait for the store state, then verify `documentStore.getState().settings.theme === "light"` and dirty is true.
4. **SettingsPage control test**: Render `<SettingsPage />`, find the theme control, simulate selecting "light", verify `updateSettings` was called with the correct patch.

Use the existing JSDOM + `createRoot` test harness pattern (see `tests/unit/selectionModel.test.tsx` or `tests/unit/alertNavigation.test.tsx` for reference).

Run `npm run test` and `npm run lint` to verify.

## Data / Storage Changes
No breaking schema changes. The `Settings.theme` field already accepts `"light" | "dark"` in storage schemas and bootstrap data. The default remains `"dark"`. Existing user data with `"dark"` will continue to work unchanged.

## UI Specifications
- **Theme control location**: Settings page, in the Appearance or Workspace defaults section (consolidate into one location; Appearance is most intuitive).
- **Control type**: Two-button segmented control with "Light" and "Dark" labels, or a `<select>` dropdown. Segmented buttons are preferred for a two-option choice.
- **Styling**: Use existing component styling conventions (`border-border`, `bg-panel`, `text-text`, `hover:bg-panelMuted`, `rounded-lg`, etc.). The active option should have a slightly different background (`bg-panelMuted` or `bg-accentSoft`) to indicate selection.
- **Immediate feedback**: Changing the control must immediately switch the app theme — no "Apply" or "Save" button needed. The autosave mechanism handles persistence.

## Acceptance Criteria
- [ ] `tailwind.config.ts` includes `darkMode: "class"`
- [ ] `src/styles/globals.css` defines complete light and dark theme variable sets
- [ ] `src/hooks/useTheme.ts` exists and toggles `html` class + `color-scheme` based on store state
- [ ] `src/stores/documentStore.ts` has `updateSettings` action that persists via autosave
- [ ] `src/components/settings/SettingsPage.tsx` has an interactive theme control (not read-only)
- [ ] `src/app/App.tsx` calls `useTheme()`
- [ ] `tests/unit/themeModeSwitching.test.tsx` covers: DOM class toggle, CSS variable values, persistence, SettingsPage control
- [ ] `npm run test` passes (including new tests)
- [ ] `npm run lint` passes

## Dependencies
- TICKET-016 (settings screen shell) — complete
- TICKET-008 (storage read/write) — complete
- Existing `ThemeMode` type and `settings.theme` field
