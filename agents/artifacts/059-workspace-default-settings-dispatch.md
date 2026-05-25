# Dispatch: Workspace Default Settings UI

## What
Add interactive controls to the Settings page so users can edit the app-level workspace default styles: background color, text color, accent stripe toggle, and accent stripe color. New workspaces created after these defaults are set should pick up the configured values for their initial style.

## Why
Users want to customize the default appearance of new workspaces rather than manually styling each one. Currently workspace defaults are hardcoded in the bootstrap data and can only be changed per-workspace after creation.

## Scope

### In scope
- **Interactive controls for workspace defaults** in the Settings page "Workspace defaults" section:
  - Background color: text input with hex validation + color preview swatch
  - Text color: text input with hex validation + color preview swatch
  - Accent enabled: toggle/checkbox control
  - Accent color: text input with hex validation + color preview swatch (shown only when accent enabled is true)
- **Settings update wiring**: each control calls `updateSettings({ defaults: { ... } })` on blur/change, spreading existing defaults
- **New workspace default application**: verify that `createWorkspace` in `documentStore` applies the current `settings.defaults` values (background color, text color, accent stripe enabled/color) to the newly created workspace's initial style. If it doesn't, add the wiring.
- **Tests** covering: each control updates the correct default field, invalid values are rejected, accent color field shows/hides correctly, new workspace inherits configured defaults

### Out of scope
- Changing existing workspace styles retroactively (only new workspaces pick up defaults)
- Per-workspace style editor (that exists in the inspector)
- Undo/redo for settings changes

## Related Spec Sections
- docs/TODO_APP_IMPLEMENTATION_BACKLOG.md TICKET-059

## Data Model Context
- `AppDefaults` interface already has `workspaceAccentEnabled: boolean`
- `WorkspaceStyle` interface: `{ backgroundColor: string; textColor: string; accentStripe: { enabled?: boolean; color?: string } }`
- `Settings.defaults: AppDefaults` — currently has `workspaceAccentEnabled` but no background/text/accent color defaults at the settings level
- Workspace creation likely uses hardcoded defaults from `bootstrapData.ts` or inline constants

## Constraints
- Follow the same input/swatch/validation pattern established in TICKET-058 for editor defaults
- Use the `SettingsSection` component with `children` for interactive controls
- Keep controls simple — native inputs with Tailwind styling
- `updateSettings` already supports nested `defaults` patches
- Add tests alongside implementation
- `npm run test` must pass
- `npm run lint` must pass

## Acceptance Criteria
- [ ] Settings page "Workspace defaults" section has interactive controls for background color, text color, accent enabled, and accent color
- [ ] Accent color input shows only when accent enabled is true
- [ ] Changing a value updates `settings.defaults` via `updateSettings`
- [ ] New workspaces created after setting defaults inherit the configured values
- [ ] Hex validation rejects invalid colors; invalid values revert without calling `updateSettings`
- [ ] Tests cover: each field update, accent conditional visibility, invalid rejection, new workspace inheritance
- [ ] `npm run test` passes (including new tests)
- [ ] `npm run lint` passes
