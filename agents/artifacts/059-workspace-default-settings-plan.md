# Plan: Workspace Default Settings UI

## Overview

Add interactive controls to the Settings page "Workspace defaults" section so users can configure default background color, text color, accent stripe toggle, and accent stripe color for new workspaces. Extend the `AppDefaults` interface and wire workspace creation to read from these settings instead of hardcoded values.

## Prerequisites

- TICKET-058 (Editor default settings UI) is complete — the input/swatch/validation pattern is established.

## Files to Create/Modify

| Action | Path | Description |
|--------|------|-------------|
| Modify | `src/types/settings.ts` | Add workspace default fields to `AppDefaults` |
| Modify | `src/services/storage/bootstrapData.ts` | Add workspace defaults to `DEFAULT_SETTINGS` |
| Modify | `src/services/storage/storageSchemas.ts` | Coerce new workspace default fields in `validateSettingsFile` |
| Modify | `src/stores/documentStore.ts` | Pass settings defaults to workspace creation |
| Modify | `src/components/settings/SettingsPage.tsx` | Replace read-only entries with interactive controls |
| Create | `src/tests/unit/workspaceDefaultSettings.test.tsx` | Tests for the new controls and workspace inheritance |

## Implementation Steps

### Step 1: Extend `AppDefaults` interface

- File: `src/types/settings.ts`
- Add three new fields:
  ```typescript
  workspaceBackground: string;
  workspaceTextColor: string;
  workspaceAccentColor: string;
  ```
- `workspaceAccentEnabled` already exists, so no change needed for that.

- **Verify**: TypeScript compilation fails on files that construct `AppDefaults` without the new fields (expected — fixed in subsequent steps).

### Step 2: Update `DEFAULT_SETTINGS` and bootstrap

- File: `src/services/storage/bootstrapData.ts`
- Add defaults matching the current hardcoded workspace style in `createDefaultWorkspaceIndexEntry()`:
  ```typescript
  workspaceBackground: "#1F2937",
  workspaceTextColor: "#F9FAFB",
  workspaceAccentColor: "#60A5FA",
  ```
- These match the existing hardcoded `createDefaultWorkspaceIndexEntry()` values so the visual output is unchanged for existing users on first load.

- **Verify**: `DEFAULT_SETTINGS.defaults` has all required fields, TypeScript compiles.

### Step 3: Update settings validation/coercion

- File: `src/services/storage/storageSchemas.ts`
- In `validateSettingsFile`, inside the `defaults: { ... }` block (around line 493–517), add coercion for the three new fields using `toCssColor`:
  ```typescript
  workspaceBackground: toCssColor(defaultsInput.workspaceBackground, DEFAULT_SETTINGS.defaults.workspaceBackground),
  workspaceTextColor: toCssColor(defaultsInput.workspaceTextColor, DEFAULT_SETTINGS.defaults.workspaceTextColor),
  workspaceAccentColor: toCssColor(defaultsInput.workspaceAccentColor, DEFAULT_SETTINGS.defaults.workspaceAccentColor),
  ```

- **Verify**: Loading a settings file missing these fields falls back to defaults without error.

### Step 4: Wire workspace creation to read from settings defaults

- File: `src/stores/documentStore.ts`
- Modify `createWorkspaceIndexEntry` (local helper at ~line 342) to accept a partial style override:
  ```typescript
  function createWorkspaceIndexEntry(
    workspaceId: WorkspaceId,
    title: string,
    order: number,
    styleOverrides?: Partial<WorkspaceStyle>
  ): WorkspaceIndexEntry {
    const template = createDefaultWorkspaceIndexEntry();
    return {
      ...template,
      id: workspaceId,
      title,
      order,
      style: {
        ...structuredClone(template.style),
        ...structuredClone(styleOverrides ?? {}),
      },
    };
  }
  ```
- Modify `createDefaultWorkspaceState` (~line 534) to accept settings and derive style:
  ```typescript
  function createDefaultWorkspaceState(title?: string, settings?: Settings | null): { ... } {
    const workspaceId = createId("workspace");
    const workspace = createWorkspaceDocument(workspaceId);

    const styleFromDefaults: Partial<WorkspaceStyle> | undefined = settings ? {
      background: settings.defaults.workspaceBackground,
      textColor: settings.defaults.workspaceTextColor,
      accentStripe: {
        enabled: settings.defaults.workspaceAccentEnabled,
        color: settings.defaults.workspaceAccentColor,
      },
    } : undefined;

    const workspaceIndexEntry = createWorkspaceIndexEntry(
      workspaceId,
      title?.trim() || "Workspace",
      0,
      styleFromDefaults
    );
    return { workspace, workspaceIndexEntry };
  }
  ```
- Update the `createWorkspace` action (~line 1014) to pass `state.settings`:
  ```typescript
  const created = createDefaultWorkspaceState(
    title ?? getDefaultWorkspaceTitle(state.workspaceIndex.length),
    state.settings
  );
  ```

- **Verify**: Creating a new workspace after changing defaults applies the configured colors (visible in workspace tab styling).

### Step 5: Add interactive controls to Settings page

- File: `src/components/settings/SettingsPage.tsx`
- Replace the read-only `<SettingsSection title="Workspace defaults" entries={[...]} />` with a children-based section matching the Editor defaults pattern.
- Add local state hooks:
  ```typescript
  const [localWsBackground, setLocalWsBackground] = useState(settings?.defaults.workspaceBackground ?? "#1F2937");
  const [localWsTextColor, setLocalWsTextColor] = useState(settings?.defaults.workspaceTextColor ?? "#F9FAFB");
  const [localWsAccentEnabled, setLocalWsAccentEnabled] = useState(settings?.defaults.workspaceAccentEnabled ?? true);
  const [localWsAccentColor, setLocalWsAccentColor] = useState(settings?.defaults.workspaceAccentColor ?? "#60A5FA");
  ```
- Controls to render:
  1. **Background color** — text input + color swatch, validate with `hexRegex`, save via `saveDefault("workspaceBackground", raw)` on blur. Revert on invalid.
  2. **Text color** — same pattern, key = `"workspaceTextColor"`.
  3. **Accent enabled** — checkbox/toggle. On change, call `saveDefault("workspaceAccentEnabled", !localWsAccentEnabled)` and update local state.
  4. **Accent color** — text input + swatch, validate hex, save via `saveDefault("workspaceAccentColor", raw)`. Only render when `localWsAccentEnabled` is true.
- Extend the `validateAndSaveHexColor` helper's key union type to include workspace keys, or write a parallel helper (simpler: extend the existing type union):
  ```typescript
  function validateAndSaveHexColor(
    key: "textColor" | "cellBackground" | "blockBorderColor" | "workspaceBackground" | "workspaceTextColor" | "workspaceAccentColor",
    raw: string,
    setter: (v: string) => void
  ) { ... }
  ```

- **Verify**: Render the Settings page; all workspace default fields display with correct initial values. Changing and blurring a color field updates the store. Toggling accent enabled hides/shows accent color field.

### Step 6: Add tests

- File: `src/tests/unit/workspaceDefaultSettings.test.tsx`
- Follow the exact pattern from `editorDefaultSettings.test.tsx` (JSDOM setup, `getInputByLabel` helper, `useDocumentStore.setState`).
- Test cases:
  1. Each workspace default field renders with current store value.
  2. Background color updates store on blur with valid hex.
  3. Text color updates store on blur with valid hex.
  4. Invalid hex rejects and reverts without saving.
  5. Accent enabled toggle updates store.
  6. Accent color field is hidden when accent enabled is false.
  7. Accent color field is shown when accent enabled is true, updates on valid blur.
  8. New workspace inherits configured defaults — set custom workspace defaults in store, call `createWorkspace`, assert new workspace's style matches.
  9. Updating one workspace default field preserves other defaults values.

- **Verify**: `npm run test` passes with all new tests green.

## Data / Storage Changes

The `AppDefaults` shape gains three new string fields. Existing persisted settings files will be missing these fields; `validateSettingsFile` coerces them to the `DEFAULT_SETTINGS` values (backward-compatible).

New `AppDefaults` shape:
```typescript
interface AppDefaults {
  fontFamily: string;
  fontSize: number;
  textColor: string;
  cellBackground: string;
  blockBorderColor: string;
  blockBorderWidth: number;
  workspaceAccentEnabled: boolean;   // existing
  workspaceBackground: string;       // NEW
  workspaceTextColor: string;        // NEW
  workspaceAccentColor: string;      // NEW
}
```

No migration needed — coercion handles missing fields on load.

## UI Specifications

The "Workspace defaults" card in Settings will contain:

```
┌─────────────────────────────────────────────┐
│ Workspace defaults                          │
│                                             │
│  Background color    [■] [#1F2937 ]         │
│  ─────────────────────────────────────────  │
│  Text color          [■] [#F9FAFB ]         │
│  ─────────────────────────────────────────  │
│  Accent enabled      [✓]                    │
│  ─────────────────────────────────────────  │
│  Accent color        [■] [#60A5FA ]         │ ← hidden if unchecked
│                                             │
└─────────────────────────────────────────────┘
```

- Color inputs: same `w-28 rounded-md border` styling as editor defaults.
- Color swatches: same `h-5 w-5 shrink-0 rounded border` pattern.
- Accent enabled: checkbox input styled consistently with the section's visual language.
- Conditional rendering: accent color row only renders when `localWsAccentEnabled` is true.

## Acceptance Criteria

- [ ] Settings page "Workspace defaults" section has interactive controls for background color, text color, accent enabled, and accent color
- [ ] Accent color input shows only when accent enabled is true
- [ ] Changing a value updates `settings.defaults` via `updateSettings`
- [ ] New workspaces created after setting defaults inherit the configured values
- [ ] Hex validation rejects invalid colors; invalid values revert without calling `updateSettings`
- [ ] Tests cover: each field update, accent conditional visibility, invalid rejection, new workspace inheritance
- [ ] `npm run test` passes (including new tests)
- [ ] `npm run lint` passes

## Estimated Complexity

- **Medium**
- 6 files touched (1 new test file, 5 modified)
