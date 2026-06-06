# Plan: Light-Mode Default Color Cleanup

## Overview
Implement a focused, non-migrating cleanup so light-mode stock/default flows use readable light-oriented colors for workspace cards and row/cell formatting. The fix should compute light-mode effective defaults only for legacy stock dark default values, while preserving persisted custom settings, existing workspace styles, and explicit block/column/row/cell formatting.

## Verified Current-State Facts
- `src/services/storage/bootstrapData.ts` defines `DEFAULT_SETTINGS.theme` as `"dark"` and stock editor/workspace defaults as dark-oriented colors: editor text `#F3F4F6`, cell background `#111827`, block border `#374151`, workspace background `#1F2937`, workspace text `#F9FAFB`, workspace accent `#60A5FA`.
- `src/services/storage/bootstrapData.ts` also hardcodes the starter Home workspace style to `#1F2937` / `#F9FAFB` / `#60A5FA`; `createStarterBlock()` delegates to `createBlockTemplate()` and does not pass theme/default settings.
- `src/services/storage/storageSchemas.ts` validates missing/invalid settings colors by falling back to `DEFAULT_SETTINGS.defaults`, and validates missing/invalid workspace index styles by falling back to hardcoded dark workspace colors (`#1F2937`, `#F9FAFB`, `#60A5FA`). These fallbacks are deterministic but not theme-aware.
- `src/stores/documentStore.ts` creates new workspaces through `createDefaultWorkspaceState(title, state.settings)`, and that helper maps `settings.defaults.workspaceBackground`, `workspaceTextColor`, `workspaceAccentEnabled`, and `workspaceAccentColor` directly into the new `WorkspaceIndexEntry.style`.
- `src/stores/documentStore.ts` creates new blocks through `appendBlockToWorkspace()`, which calls `createBlockTemplate()`; `src/domain/templates/blockTemplates.ts` creates sparse row/cell formats (`format: {}`) for template rows/cells, so text/background colors are inherited at render time rather than persisted in each new cell.
- `src/domain/formatting/appDefaultsToFormatting.ts` maps `AppDefaults.textColor`, `cellBackground`, `blockBorderColor`, and `blockBorderWidth` directly into the base formatting layer. `src/domain/formatting/resolveCellFormatting.ts` then merges block, column, row, and cell formatting on top, so explicit formatting overrides inherited app defaults.
- `src/components/row/RowView.tsx` passes `settings.defaults` directly into `resolveCellFormatting()` and applies the result through `formattingToCellStyle()` / `formattingToBorderStyle()`. Empty-format cells therefore render the persisted stock dark defaults even if `settings.theme` is `"light"`.
- `src/components/workspace/WorkspaceCard.tsx` renders `entry.style.background`, `entry.style.textColor`, and `entry.style.accentStripe.color` directly as inline styles, with display fallbacks that also show `#1F2937` and `#F9FAFB`; it does not know the active theme.
- `src/components/layout/LeftDock.tsx` renders `WorkspaceCard` instances but currently selects only workspace index/action state; it does not pass `settings.theme` to cards.
- `src/components/settings/SettingsPage.tsx` initializes local editor/workspace color inputs from `settings.defaults` or dark fallback literals (`#F3F4F6`, `#111827`, `#374151`, `#1F2937`, `#F9FAFB`, `#60A5FA`) and validates saves with the existing six-digit hex rule.
- `src/styles/globals.css` defines light-mode CSS variables using light canvas/panel/border/text values (`#f8fafc`, `#ffffff`, `#f1f5f9`, `#e2e8f0`, `#0f172a`) and light accent `#2563eb`.
- Existing tests cover the current dark defaults and inheritance paths: `src/tests/unit/storage.test.ts`, `workspaceDefaultSettings.test.tsx`, `editorDefaultSettings.test.tsx`, `formattingHelpers.test.ts`, `blockTemplates.test.ts`, `workspaceCard.test.tsx`, and `documentStore.test.ts`.
- Reviews for dispatches 057, 058, and 059 confirm that theme mode switching, editor defaults, and workspace defaults were implemented without schema changes and that the workspace defaults intentionally mirrored the then-current dark hardcoded workspace values.

## Prerequisites
- No schema migration is required or desired for this dispatch.
- Dev should preserve the existing storage shape and keep all changes local to default-resolution, rendering, and tests.

## Files to Create/Modify
| Action | Path | Description |
|--------|------|-------------|
| Create | `src/domain/defaults/themeDefaultColors.ts` | Pure helper/constants for legacy dark stock defaults, light-mode stock defaults, and theme-aware effective default/style resolution. |
| Modify | `src/stores/documentStore.ts` | Use the theme-aware effective defaults when creating/replacing fresh workspaces. |
| Modify | `src/components/layout/LeftDock.tsx` | Read the active theme and pass it to `WorkspaceCard`. |
| Modify | `src/components/workspace/WorkspaceCard.tsx` | Render stock dark workspace styles as light-mode stock styles when the active theme is light, without mutating entries. |
| Modify | `src/components/row/RowView.tsx` | Resolve cell formatting from theme-aware effective app defaults before merging explicit formatting layers. |
| Modify | `src/components/settings/SettingsPage.tsx` | Replace duplicated dark fallback literals with shared constants/effective defaults where practical; keep save validation and persisted settings semantics intact. |
| Modify | `src/tests/unit/formattingHelpers.test.ts` or create a new unit test beside it | Cover theme-aware default resolution and explicit-color preservation. |
| Modify | `src/tests/unit/documentStore.test.ts` and/or `workspaceDefaultSettings.test.tsx` | Cover fresh light-mode workspace creation and custom default preservation. |
| Modify | `src/tests/unit/workspaceCard.test.tsx` | Cover light-mode rendering of legacy stock dark workspace styles and preservation of custom dark styles. |
| Modify | `src/tests/unit/storage.test.ts` | Update expected stock defaults only if helper/constants changes require it; otherwise add a validation fallback test showing invalid persisted defaults resolve deterministically before effective light defaults are applied elsewhere. |
| Modify | `src/tests/unit/editorDefaultSettings.test.tsx` | Update expected default input values/fallback assertions only if `SettingsPage` displays effective light defaults under light theme. |

## Implementation Steps

### Step 1: Add a pure theme-aware defaults helper
- Create `src/domain/defaults/themeDefaultColors.ts`.
- Define explicit constants for the current legacy stock dark color values:
  - editor text `#F3F4F6`
  - cell background `#111827`
  - block border `#374151`
  - workspace background `#1F2937`
  - workspace text `#F9FAFB`
  - workspace accent `#60A5FA`
- Define light-mode stock replacements:
  - editor/cell text `#0F172A`
  - cell background `#FFFFFF`
  - block/cell border `#E2E8F0`
  - workspace background `#E0F2FE`
  - workspace text `#0F172A`
  - workspace accent `#2563EB`
- Export pure functions similar to:
  - `resolveThemeAwareAppDefaults(settings: Settings): AppDefaults`
  - `resolveThemeAwareWorkspaceStyle(style: WorkspaceStyle, theme: ThemeMode): WorkspaceStyle`
  - optionally `workspaceStyleFromAppDefaults(defaults: AppDefaults): WorkspaceStyle`
- For `theme !== "light"`, return values equivalent to the input.
- For `theme === "light"`, replace each color field only when that field exactly equals the legacy stock dark value. Preserve any non-stock custom value, including explicit dark user colors that differ from the stock constants.
- Do not mutate input objects.
- **Verify**: Add pure unit tests proving light mode maps stock defaults to the light palette, dark mode preserves the original palette, custom/non-stock values survive unchanged, and a returned object does not share mutated nested references.

### Step 2: Use effective defaults for fresh workspace creation
- In `src/stores/documentStore.ts`, update `createDefaultWorkspaceState(title, settings)` so `styleFromDefaults` is derived from `resolveThemeAwareAppDefaults(settings)` rather than `settings.defaults` directly.
- In `deleteWorkspace`, when deleting the final workspace and creating the replacement Home workspace, pass `state.settings` to `createDefaultWorkspaceState("Home", state.settings)` so light-mode replacement workspaces also use effective light defaults.
- Preserve the existing behavior where `createWorkspace()` persists a concrete `WorkspaceIndexEntry.style` for the new workspace; this is a fresh-object write, not a migration of existing entries.
- **Verify**: Add/adjust store tests showing:
  - with `settings.theme = "light"` and stock dark workspace defaults, a newly created workspace gets the light workspace palette;
  - with `settings.theme = "light"` and custom workspace default colors, a newly created workspace uses the custom colors unchanged;
  - deleting the last workspace in light mode creates a readable light replacement.

### Step 3: Render legacy stock workspace styles as light-mode styles without migrating existing entries
- In `src/components/layout/LeftDock.tsx`, subscribe to `settings?.theme ?? "dark"` from `useDocumentStore` and pass it as a new `theme` prop to `WorkspaceCard`.
- In `src/components/workspace/WorkspaceCard.tsx`, accept `theme` and compute `const effectiveStyle = resolveThemeAwareWorkspaceStyle(entry.style, theme)`.
- Use `effectiveStyle.background`, `effectiveStyle.textColor`, and `effectiveStyle.accentStripe.color/enabled` for inline card/accent styles and for the displayed color chip text.
- Do not call `updateWorkspaceStyle` and do not mutate `entry.style` during render.
- **Verify**: Add `WorkspaceCard` tests that render a legacy stock dark card with `theme="light"` and assert the root/accent inline styles use the light palette. Add a preservation test where a custom dark style such as `#101828` / `#F8FAFC` remains unchanged in light mode.

### Step 4: Use effective app defaults for row/cell formatting inheritance
- In `src/components/row/RowView.tsx`, compute effective defaults with `resolveThemeAwareAppDefaults(settings)` before calling `resolveCellFormatting()`.
- Continue passing `block.format`, `column.format`, `row.format`, and `cell.format` unchanged so explicit formatting layers still override the effective app default layer.
- Do not write any text/background colors into template cells or existing documents.
- **Verify**: Add targeted tests showing:
  - a stock-default light-mode store renders an empty-format text cell with `color: #0F172A` and `background-color: #FFFFFF` (or assert via `resolveCellFormatting` if a RowView test is too brittle);
  - explicit cell/row/block text/background colors continue to override the light stock defaults.

### Step 5: Keep settings validation deterministic and non-migrating
- Leave `STORAGE_SCHEMA_VERSION` unchanged.
- Do not add a migration that rewrites existing settings, workspace index entries, or workspace documents.
- Keep `validateSettingsFile()` and `normalizeWorkspaceStyle()` deterministic. If Dev chooses to centralize fallback constants, ensure validation still falls back to the same stock persisted values for dark/default storage; theme-aware light mapping should happen in the effective helper at creation/render time, where theme is available.
- **Verify**: Add or update storage tests so invalid/missing persisted color values still normalize predictably, and add a test proving the helper maps those normalized stock values to the light palette only when `theme === "light"`.

### Step 6: Update SettingsPage only to reduce stale dark fallback duplication and clarify effective defaults
- Replace hardcoded fallback color literals in `SettingsPage` with imported constants/effective defaults where practical.
- Keep the existing hex validation behavior and `saveDefault()` semantics: editing a settings field persists exactly the user-entered value and should not auto-normalize other fields.
- If the UI displays effective light stock values when `settings.theme === "light"`, update tests to make that explicit and ensure blurring/saving still writes only the field being edited. If the UI continues to display persisted values, add a short non-invasive note or test coverage only if Dev finds it necessary for clarity; do not introduce a broad settings rewrite.
- **Verify**: Existing editor/workspace default settings tests should continue to pass with updated expected values where applicable, including invalid hex rejection and preservation of sibling defaults.

### Step 7: Document Dev verification in the complete artifact
- Dev must create `agents/artifacts/080-light-mode-default-color-cleanup-complete.md` and report verification using `agents/CLOSING.md` format.
- Required targeted tests should include the new/changed unit tests for default resolution, workspace creation/card rendering, settings/default validation, and cell formatting inheritance. Suggested command:
  - `npm run test -- --test-name-pattern="theme-aware default|light-mode default|workspace default|editor default|storage schemas|formatting|WorkspaceCard|document store"`
- Also run and report:
  - `npm run test`
  - `npm run lint`
  - `npm run build`

## Data / Storage / Schema Changes
None planned. Keep `STORAGE_SCHEMA_VERSION = 1`, do not add a migration, and do not rewrite existing persisted workspace styles or block/column/row/cell formatting.

The only fresh persisted writes should be for newly created workspaces/replacement workspaces, where storing the effective light workspace style is acceptable because the object is new. Existing persisted explicit styles/formats must remain untouched.

## UI Specifications
- Light-mode stock/default workspace cards should render with a pale readable card background, dark text, and the light accent blue.
- Existing custom workspace styles should continue to render exactly as stored, even when the app is in light mode.
- Light-mode empty/default cells should render dark text on a light cell background with a light border, while explicit block/column/row/cell formatting remains visually authoritative.
- Settings controls should retain the current compact layout, validation behavior, and color swatches. Avoid adding a large new UI surface.

## Assumptions / Hypotheses
- Assumption: the app has no metadata distinguishing "user explicitly chose the legacy stock dark value" from "this field is still the historical stock default." The plan therefore avoids storage rewrites and uses exact-value effective mapping at creation/render time.
- Assumption: preserving explicit formatting means preserving existing persisted block/column/row/cell formatting and custom/non-stock settings/workspace styles. Exact legacy stock values are treated as stock defaults for effective light-mode rendering because otherwise fresh light-mode flows cannot be made readable without a schema/source-tracking change.
- Verified fact, not a hypothesis: `blockTemplates.ts` currently leaves row/cell formats empty; therefore new block text colors inherit from app defaults at render time.

## Acceptance Criteria
- [ ] Light-mode stock/default workspace cards render with readable light-mode colors.
- [ ] New workspaces created while `settings.theme === "light"` and defaults are still legacy stock values receive readable light-mode workspace colors.
- [ ] Light-mode empty/default row cells inherit readable dark text on light cell background.
- [ ] Custom/non-stock settings defaults and workspace styles are preserved unchanged.
- [ ] Explicit block/column/row/cell formatting continues to override app defaults and is not rewritten.
- [ ] Invalid/missing persisted color fallbacks remain deterministic and are covered by tests.
- [ ] Targeted tests, `npm run test`, `npm run lint`, and `npm run build` are run and reported in the complete artifact.

## Estimated Complexity
- Medium
- Estimated 5-8 source/test files plus one new pure helper file
