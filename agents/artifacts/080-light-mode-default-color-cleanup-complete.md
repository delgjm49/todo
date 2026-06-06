# Complete: Light-Mode Default Color Cleanup

## Summary

Implemented a focused, non-migrating cleanup so light-mode stock/default flows use readable light-oriented colors for workspace cards and row/cell formatting. A new pure helper module (`themeDefaultColors.ts`) maps legacy stock dark values to light-mode equivalents only when `settings.theme === "light"` and only when the value exactly matches the stock dark constant — preserving all custom/non-stock colors. The mapping is applied at render time (WorkspaceCard, RowView) and at fresh workspace creation (documentStore), with no schema changes and no rewrites of existing persisted data.

## Files Changed

| Action | Path | Notes |
|--------|------|-------|
| Created | `src/domain/defaults/themeDefaultColors.ts` | Pure helper: stock dark/light color constants, `resolveThemeAwareAppDefaults`, `resolveThemeAwareWorkspaceStyle` |
| Modified | `src/stores/documentStore.ts` | Use `resolveThemeAwareAppDefaults` in `createDefaultWorkspaceState`; pass `state.settings` to `createDefaultWorkspaceState("Home", ...)` in `deleteWorkspace` |
| Modified | `src/components/layout/LeftDock.tsx` | Subscribe to `settings?.theme ?? "dark"`, pass `theme` prop to `WorkspaceCard` |
| Modified | `src/components/workspace/WorkspaceCard.tsx` | Accept optional `theme` prop, compute `effectiveStyle` via `resolveThemeAwareWorkspaceStyle`, use it for inline styles and color chip text |
| Modified | `src/components/row/RowView.tsx` | Compute `effectiveAppDefaults` via `resolveThemeAwareAppDefaults` before calling `resolveCellFormatting` |
| Modified | `src/components/settings/SettingsPage.tsx` | Replace hardcoded dark fallback literals with imported constants from `themeDefaultColors.ts` |
| Created | `src/tests/unit/themeDefaultColors.test.ts` | 20 pure unit tests for `resolveThemeAwareAppDefaults` and `resolveThemeAwareWorkspaceStyle` |
| Modified | `src/tests/unit/formattingHelpers.test.ts` | Added 4 integration tests: theme-aware defaults + resolveCellFormatting for light/dark modes and explicit override preservation |
| Modified | `src/tests/unit/workspaceCard.test.tsx` | Added 5 tests: stock dark in light mode (bg, text, accent), stock dark in dark mode, custom dark preserved in light mode, chip text reflects effective palette |
| Modified | `src/tests/unit/documentStore.test.ts` | Added 3 tests: new workspace in light mode with stock defaults, new workspace with custom defaults, delete-last in light mode creates light replacement |

## Deviations from Plan

- **Step 5 (SettingsPage)**: The plan mentioned optionally displaying effective light values in SettingsPage when `theme === "light"`. I chose the simpler path: SettingsPage continues to display persisted values (not effective values). This avoids confusing the user by showing "#E0F2FE" when they persisted "#1F2937". The effective mapping happens at render/creation time where it's needed. Only the null-safety fallback literals were replaced with imported constants (semantically identical, better DRY).
- **WorkspaceCard `theme` prop defaulted to `"dark"`**: Since the prop is optional and all existing tests use the component without passing `theme`, the default prevents any change in rendering for dark-mode or unspecified contexts.
- **`resolveThemeAwareWorkspaceStyle` on dark**: The function returns the same object reference for dark theme. For light theme, it creates a shallow copy so the input is never mutated.

## Open Questions

- None.

## Verification

### Targeted tests

- command: `npm run test -- --test-name-pattern="theme-aware default|light-mode default|WorkspaceCard light"`
- shell used: zsh (macOS home machine)
- result: 500 tests, 0 failures
- checkpoint-scoped or unrelated repo-state: all pass; none pre-existing failures observed
- was this the actual shell provided by the environment: yes

### Full test suite

- command: `npm run test`
- shell used: zsh
- result: 500 tests, 0 fail, 0 cancelled, 0 skipped
- checkpoint-scoped or unrelated repo-state: clean pass
- was this the actual shell provided by the environment: yes

### Lint

- command: `npm run lint`
- shell used: zsh
- result: exit 0, no warnings, no errors
- checkpoint-scoped or unrelated repo-state: clean
- was this the actual shell provided by the environment: yes

### Build

- command: `npm run build`
- shell used: zsh
- result: exit 0, 120 modules transformed, no errors
- checkpoint-scoped or unrelated repo-state: clean
- was this the actual shell provided by the environment: yes

## Known Issues

- None.
