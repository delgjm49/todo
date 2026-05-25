# Dispatch: Theme Mode Switching

## What
Implement full light/dark theme mode switching for the app. The app already has a `theme: ThemeMode` field in settings (default `"dark"`), but it is not wired to any visual switching mechanism. This ticket makes theme switching functional: add a toggle control, define light theme CSS variable values, apply the theme to the document, and persist the preference.

## Why
The app currently renders in dark mode only. For v1 polish and accessibility, users need to be able to switch to a light theme and have their preference persist across sessions. This is the last remaining P1 ticket before entering the final QA/polish phase.

## Scope

### In scope
- **Light theme CSS variables**: define a complete set of light-mode color values for all semantic CSS custom properties (`--color-canvas`, `--color-panel`, `--color-panel-muted`, `--color-accent`, `--color-accent-soft`, `--color-border`, `--color-text`, `--color-text-muted`, `--color-danger`, `--color-warning`). The background gradient in `body` also needs a light variant.
- **Theme application mechanism**: apply the selected theme to the document. The cleanest approach given the existing CSS custom property architecture is to toggle a class (e.g., `dark` / `light`) on the `<html>` element and define both theme variable sets under the respective selectors. Set `darkMode: "class"` in the Tailwind config so `dark:` utility variants can also be used if needed.
- **Theme toggle UI**: add an interactive theme mode control to the Settings page. A simple segmented control or select dropdown with "Light" / "Dark" / "System" (optional) is acceptable. The control must update the store, trigger immediate visual change, and save to persisted settings.
- **Initial theme on boot**: on app startup, read `settings.theme` from storage and apply the correct class to `<html>` before the first paint (or as early as possible in the React tree).
- **`color-scheme` meta**: update the `color-scheme` CSS property to match the active theme so native form controls (scrollbars, inputs, selects) render correctly.
- **Persistence**: changing the theme must dirty the store and trigger an autosave so the preference survives reload.
- **Tests** covering: theme toggle updates the DOM class, light CSS variables render expected colors, theme persists through save/load, SettingsPage shows the correct selected value.

### Out of scope
- System preference auto-detection (nice-to-have, can be added later)
- Per-workspace theme overrides
- Animated theme transitions (a simple instant switch is fine)
- Any changes to the semantic color naming or Tailwind config beyond adding `darkMode: "class"`

## Related Spec Sections
- docs/TODO_APP_TECH_SPEC.md §Settings and Persistence
- docs/TODO_APP_UI_SPEC.md §Settings Screen
- docs/TODO_APP_IMPLEMENTATION_BACKLOG.md TICKET-057

## Data Model Context
- `ThemeMode` is `"light" | "dark"` in `src/types/formatting.ts`
- `Settings.theme: ThemeMode` in `src/types/settings.ts`
- `documentStore` holds `settings` and provides `updateSettings()` / `saveSettings()`
- Default bootstrap theme is `"dark"` in `src/services/storage/bootstrapData.ts`
- Settings schema validation already accepts `"light" | "dark"` in `src/services/storage/storageSchemas.ts`

## Constraints
- Use the existing CSS custom property color system — do not replace it with Tailwind `dark:` utilities on every element. The semantic variable approach is the app's design foundation.
- Keep `dark` as the default/fallback theme.
- Follow existing store patterns for settings updates.
- Add tests alongside implementation.
- `npm run test` must pass.
- `npm run lint` must pass.

## Acceptance Criteria
- [ ] Light theme defines a complete, coherent set of color values that make the app readable and visually consistent
- [ ] Toggling the theme in Settings immediately switches the entire app between light and dark
- [ ] Theme preference persists after app reload
- [ ] `color-scheme` CSS property matches the active theme
- [ ] Tailwind config includes `darkMode: "class"`
- [ ] SettingsPage displays an interactive theme control (not read-only text)
- [ ] Tests cover: DOM class toggle, light CSS variable values, persistence round-trip, SettingsPage control state
- [ ] `npm run test` passes (including new tests)
- [ ] `npm run lint` passes
