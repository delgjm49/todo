# Plan: Editor Default Settings UI

## Overview
Replace the read-only editor default entries on the Settings page with interactive controls for all 6 `AppDefaults` fields (fontFamily, fontSize, textColor, cellBackground, blockBorderColor, blockBorderWidth). Each control persists changes via `updateSettings` on blur, and color hex inputs show a small preview swatch. The existing `SettingsSection` component's `children` slot is used for the interactive content.

## Prerequisites
- TICKET-057 theme mode switching is merged (confirmed: commit `7f2de8a`).
- `SettingsSection` already accepts `children` for interactive content.
- `updateSettings` in `documentStore` supports `Partial<Settings>` with shallow merge.

## Files to Create/Modify
| Action | Path | Description |
|--------|------|-------------|
| Modify | `src/components/settings/SettingsPage.tsx` | Replace read-only entries with interactive controls for all 6 defaults fields |
| Create | `src/tests/unit/editorDefaultSettings.test.tsx` | Tests for each control's update behavior, patch shape, and validation |

## Implementation Steps

### Step 1: Consolidate all 6 editor default fields into the "Editor defaults" section

Currently the 6 `AppDefaults` fields are scattered across all 3 settings sections:
- **Appearance** shows textColor and cellBackground (read-only `<dl>`)
- **Editor defaults** shows fontFamily, fontSize, blockBorderColor (read-only `entries` prop)
- **Workspace defaults** shows blockBorderWidth (read-only `entries` prop)

Consolidate all 6 into the "Editor defaults" section. Remove the duplicate entries from Appearance and Workspace defaults:
- Remove the `<dl>` block showing textColor/cellBackground from the Appearance section (lines 55–64 of current file). The Appearance section retains only the theme toggle.
- Remove `blockBorderWidth` from the Workspace defaults `entries` array. Keep `workspaceAccentEnabled` there (it is not in scope).
- Remove the `entries` prop from the "Editor defaults" `SettingsSection` entirely — all content will be via `children`.

**Verify**: The Appearance section has only the theme toggle. Workspace defaults has only "Accent enabled". Editor defaults has no `entries` prop.

### Step 2: Build the interactive controls inside "Editor defaults"

Use the `children` slot of `SettingsSection` to render a `<div className="mt-4 space-y-3">` containing one row per field. Each row follows the existing pattern: `flex items-center justify-between gap-4 border-b border-border/60 pb-3 last:border-b-0 last:pb-0`.

**Field specifications:**

| Field | Label | Input type | Notes |
|-------|-------|-----------|-------|
| `fontFamily` | Font family | `<input type="text">` | Blur to save |
| `fontSize` | Font size | `<input type="number" min="8" max="72">` | Blur to save; append "px" label |
| `textColor` | Text color | `<input type="text">` | Blur to save; color swatch |
| `cellBackground` | Cell background | `<input type="text">` | Blur to save; color swatch |
| `blockBorderColor` | Block border color | `<input type="text">` | Blur to save; color swatch |
| `blockBorderWidth` | Border width | `<input type="number" min="0" max="10">` | Blur to save; append "px" label |

**Input styling** (consistent with existing Tailwind patterns):
```
className="w-28 rounded-md border border-border bg-panel px-2 py-1 text-sm text-text text-right focus:border-accent/60 focus:outline-none"
```
Number inputs: `w-20`. Text inputs for hex colors: `w-28`. Font family: `w-40`.

**Color swatch**: For the 3 hex color fields, render a `<div>` immediately before the input:
```tsx
<div
  className="h-5 w-5 shrink-0 rounded border border-border"
  style={{ backgroundColor: currentValue }}
/>
```

**Verify**: Each field renders with the correct input type and current value from `settings.defaults`.

### Step 3: Wire up change handling with blur persistence

Each input should be a controlled component backed by local React state (`useState`), initialized from `settings.defaults`. On `blur`, the handler:

1. Validates the value (see Step 4).
2. If valid, calls `updateSettings({ defaults: { ...settings.defaults, ...patch } })` where `patch` is `{ [fieldName]: parsedValue }`.
3. If invalid, resets the local state to the current store value (no save).

**Important**: `updateSettings` does a shallow merge at the `Settings` level. The `defaults` key is replaced entirely, so the caller MUST spread `settings.defaults` to preserve other fields:
```ts
updateSettings({ defaults: { ...settings.defaults, fontSize: newValue } })
```

Use a helper function inside `SettingsPage` to reduce repetition:
```ts
function saveDefault<K extends keyof AppDefaults>(key: K, value: AppDefaults[K]) {
  if (!settings) return;
  updateSettings({ defaults: { ...settings.defaults, [key]: value } });
}
```

**Verify**: Changing a value and blurring calls `updateSettings` with the correct patch shape. The store updates and the input reflects the new value.

### Step 4: Input validation

- **Number fields** (`fontSize`, `blockBorderWidth`): Parse with `parseInt`. Reject `NaN`, values below `min`, or above `max`. On invalid input at blur, revert to current store value.
  - `fontSize`: min 8, max 72
  - `blockBorderWidth`: min 0, max 10
- **Hex color fields** (`textColor`, `cellBackground`, `blockBorderColor`): Validate against `/^#[0-9a-fA-F]{6}$/`. On invalid input at blur, revert to current store value.
- **Font family** (`fontFamily`): Accept any non-empty string. If empty on blur, revert to current store value.

**Verify**: Entering invalid values (empty hex, non-numeric, out-of-range) reverts on blur without calling `updateSettings`.

### Step 5: Write tests

Create `src/tests/unit/editorDefaultSettings.test.tsx` following the pattern in `themeModeSwitching.test.tsx`:
- Same JSDOM setup, `installDomGlobals`, `beforeEach`/`afterEach` cleanup
- Initialize store with `DEFAULT_SETTINGS` from bootstrapData

**Test cases:**

1. **Each field renders with current value**: Render `SettingsPage`, verify each input's value matches the store defaults.
2. **Font family update on blur**: Type a new value, blur, assert `updateSettings` was called and `settings.defaults.fontFamily` updated.
3. **Font size update on blur**: Change to valid number, blur, assert `settings.defaults.fontSize` updated.
4. **Font size rejects invalid input**: Set to non-numeric or out-of-range, blur, assert store value unchanged.
5. **Hex color update on blur**: For each of textColor, cellBackground, blockBorderColor: enter valid hex, blur, assert field updated.
6. **Hex color rejects invalid input**: Enter invalid hex (e.g., "red", "#GGG"), blur, assert store value unchanged.
7. **Border width update on blur**: Valid number, blur, assert updated.
8. **Border width rejects out-of-range**: Negative or >10, blur, assert reverted.
9. **Correct patch shape**: After updating one field, assert other defaults fields are preserved (spread works correctly).

**Verify**: `npm run test` passes with all new tests green.

## Data / Storage Changes
None. The `AppDefaults` interface and `Settings` shape are unchanged. This ticket only adds UI controls to edit existing fields.

## UI Specifications

### Layout
The "Editor defaults" section uses `children` (no `entries` prop). Inside: a vertical stack of label+input rows, each separated by bottom borders matching the existing `border-border/60` pattern.

### Row layout (each field)
```
[Label (text-sm text-textMuted)]          [swatch?] [input]
```
- Color fields: swatch + text input
- Number fields: number input + "px" suffix label
- Font family: wider text input, no suffix

### States
- **Default**: inputs show current store values
- **Editing**: user types; local state tracks input value
- **Blur (valid)**: store updates, dirty flag set, autosave triggers
- **Blur (invalid)**: input reverts to store value, no save

## Acceptance Criteria
- [ ] Settings page "Editor defaults" section has interactive controls for all 6 fields
- [ ] Changing a value and blurring updates `settings.defaults` via `updateSettings`
- [ ] Changes persist after app reload (autosave triggers)
- [ ] Color inputs show a preview swatch of the current color
- [ ] Number inputs validate as positive integers within range
- [ ] Hex color inputs validate against `#RRGGBB` pattern
- [ ] Tests cover: each field update, correct patch shape, invalid input handling
- [ ] Read-only duplicates removed from Appearance and Workspace defaults sections
- [ ] `npm run test` passes
- [ ] `npm run lint` passes

## Estimated Complexity
- **Small-Medium**
- 2 files (1 modified, 1 created)
