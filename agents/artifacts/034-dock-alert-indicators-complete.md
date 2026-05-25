# Complete: Dock Alert Indicators

## Summary
Replaced the basic warning pill in `WorkspaceCard.tsx` with a polished `AlertBadge` component that visually communicates active alert state. The new badge includes a prominent dot indicator, formatted count (capped at "99+" for overflow), optional note subtext with truncation, proper `role="status"` and `aria-label` for accessibility, and `data-testid` attributes for testability. All component tests pass.

## Files Changed
| Action | Path | Notes |
|--------|------|-------|
| Modified | `src/components/workspace/WorkspaceCard.tsx` | Extracted `AlertBadge` sub-component; replaced inline badge with `<AlertBadge summary={entry.alertSummary} />` |
| Created | `src/tests/unit/workspaceCard.test.tsx` | 12 tests covering all badge states |

## Deviations from Plan
- None. The dispatch artifact was direct-to-Dev (no plan step), and the implementation follows the in-scope items faithfully.

## Design Decisions
- **Dot + count always shown**: the badge includes a small dot alongside the formatted count for both single and multiple alerts, providing a consistent visual anchor. The acceptance criteria listed "dot or '1'" as options; this approach satisfies both.
- **`formatAlertCount` caps at "99+"**: prevents layout breakage from very large counts.
- **`bg-warning/20` + `ring-1 ring-warning/40`**: uses existing Tailwind theme tokens with semi-opaque background for better visibility against custom card backgrounds. The ring adds definition without full opacity.
- **`role="status"` on the inner badge div**: allows assistive technology to announce count changes live.
- **Note subtext**: rendered as `[10px]` truncated text below the badge, color `text-warning/65` for hierarchy.

## Open Questions
- None.

## Verification
- command: `npm run test:build`
  shell used: zsh (macOS — actual environment shell)
  result: passed (TypeScript compilation succeeded)
  failure surface: none
  checkpoint-scoped or unrelated: checkpoint-scoped
  was this the actual shell provided by the environment: yes

- command: `npm run test`
  shell used: zsh (macOS — actual environment shell)
  result: passed — 286/286 tests pass (39 suites, 0 failures); 12 new WorkspaceCard tests all pass
  failure surface: none
  checkpoint-scoped or unrelated: checkpoint-scoped
  was this the actual shell provided by the environment: yes

- command: `npm run lint`
  shell used: zsh (macOS — actual environment shell)
  result: passed — no warnings, no errors
  failure surface: none
  checkpoint-scoped or unrelated: checkpoint-scoped
  was this the actual shell provided by the environment: yes

## Known Issues
- None.
