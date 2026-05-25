# Dispatch: Editor Default Settings UI

## What
Add interactive controls to the Settings page so users can edit the app-level editor default formatting values: font family, font size, text color, cell background color, block border color, and block border width. These values already exist in `AppDefaults` and are displayed as read-only text in the SettingsPage — this ticket makes them editable and persists changes via the existing `updateSettings` infrastructure.

## Why
Users need to customize the default formatting that new blocks and rows inherit. Currently the defaults are hardcoded (`#F3F4F6` text color, `#111827` cell background, etc.) and can only be changed by editing the settings JSON directly.

## Scope

### In scope
- **Interactive controls for each editor default** in the Settings page "Editor defaults" section:
  - Font family: text input
  - Font size: number input (px)
  - Text color: text input accepting hex color + optional small color preview swatch
  - Cell background: text input accepting hex color + optional small color preview swatch
  - Block border color: text input accepting hex color + optional small color preview swatch
  - Border width: number input (px)
- **Settings update wiring**: each control calls `updateSettings({ defaults: { ...patch } })` on change/blur (use `blur` or `change` to avoid autosave thrash; `change` is acceptable for selects, `blur` for text inputs)
- **Immediate visual feedback**: the Settings page itself should reflect the updated values (it already re-renders from store state)
- **Persistence**: changes must dirty the store and trigger autosave via the existing `updateSettings` mechanism
- **Tests** covering: each control updates the correct default field, `updateSettings` is called with the correct patch, invalid/empty inputs are handled gracefully (fall back to current value or default)

### Out of scope
- Color picker widget (hex text input is sufficient for v1)
- Live preview of defaults in the main workspace (the defaults only apply to new formatting; existing blocks keep their own values)
- Per-workspace default overrides
- Undo/redo for settings changes (settings changes are not undoable by design)

## Related Spec Sections
- docs/TODO_APP_IMPLEMENTATION_BACKLOG.md TICKET-058

## Data Model Context
- `AppDefaults` interface in `src/types/settings.ts`:
  - `fontFamily: string`
  - `fontSize: number`
  - `textColor: string` (hex)
  - `cellBackground: string` (hex)
  - `blockBorderColor: string` (hex)
  - `blockBorderWidth: number`
- `Settings.defaults: AppDefaults`
- `updateSettings` already supports `Partial<Settings>` including nested `defaults` patches
- Existing bootstrap defaults in `src/services/storage/bootstrapData.ts`

## Constraints
- Reuse the `SettingsSection` component pattern established in TICKET-057 (the component now supports `children` for interactive controls)
- Keep controls simple — native `<input type="text">`, `<input type="number">` with existing Tailwind styling
- Optional: small color preview swatch next to hex inputs for usability (a small `div` with `background-color` set to the current value)
- Follow existing store update patterns (shallow merge via `updateSettings`)
- Add tests alongside implementation
- `npm run test` must pass
- `npm run lint` must pass

## Acceptance Criteria
- [ ] Settings page "Editor defaults" section has interactive controls for all 6 fields
- [ ] Changing a value and blurring/confirming updates `settings.defaults` via `updateSettings`
- [ ] Changes persist after app reload (autosave triggers)
- [ ] Color inputs show a preview swatch of the current color
- [ ] Number inputs validate as positive integers
- [ ] Tests cover: each field update, correct patch shape, persistence round-trip
- [ ] `npm run test` passes (including new tests)
- [ ] `npm run lint` passes
