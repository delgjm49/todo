# Dispatch: Dock Alert Indicators

## What
Polish the existing alert badge in the workspace dock (`WorkspaceCard`) into a proper visual indicator that clearly communicates active alert state per workspace. The scheduler from TICKET-054 is already populating `alertSummary` data; this ticket makes the dock UI reflect it well.

## Why
The current badge in `WorkspaceCard.tsx` is a basic warning-colored pill showing only a number. With the scheduler now live, users will see alert counts update in real time — the indicator needs to look polished, handle edge cases gracefully, and communicate urgency clearly.

## Scope

### In scope
- **Polished badge styling**: replace the basic warning pill with a more prominent alert indicator. Consider:
  - Solid background (not semi-transparent) for better visibility
  - Proper sizing that doesn't compete with the workspace title
  - Clear visual hierarchy (count + optional dot)
- **Count display**: show the number for 2+ alerts; show a dot or "1" for single alerts; hide entirely when zero/no alerts
- **Overflow handling**: cap large counts (e.g., "99+") to prevent layout breakage
- **Optional short subtext**: if `alertSummary.note` is present, render it as small secondary text below or beside the badge (e.g., "Due today", "Overdue")
- **Contrast safety**: ensure the badge is readable against any custom workspace background color (the dock cards use `entry.style.background` and `entry.style.textColor`)
- **Accessibility**: appropriate `aria-label` on the indicator (e.g., "3 active alerts")
- **Component tests** covering: no alerts (hidden), single alert, multiple alerts, large count overflow, custom note subtext

### Out of scope
- Alert navigation or flash highlight on click (TICKET-056)
- Click interaction on the badge itself
- Animations or transitions beyond CSS
- Sound or system notifications
- Closed-app notifications

## Current State
The existing alert badge is in `src/components/workspace/WorkspaceCard.tsx` at lines 73–76:
```tsx
{entry.alertSummary?.count ? (
  <div className="rounded-full border border-warning/40 bg-warning/10 px-2 py-1 text-xs font-medium text-warning">
    {entry.alertSummary.count}
  </div>
) : null}
```

The data model is fully live:
- `entry.alertSummary` is populated by `useAlertScheduler` (TICKET-054)
- `WorkspaceAlertSummary` type: `{ count: number; note?: string; blockId?: string; rowId?: string; columnId?: string }`
- `WorkspaceCard` receives `entry: WorkspaceIndexEntry` as a prop

## Constraints
- Keep changes localized to `WorkspaceCard.tsx` and its tests
- Use existing Tailwind classes and theme tokens (`warning`, `danger`, `text`, `bg-panel`, etc.)
- Follow existing component patterns in the codebase
- Add or update tests in `tests/unit/` using `node:test` + React Testing Library patterns
- `npm run test` must pass
- `npm run lint` must pass

## Acceptance Criteria
- [ ] Alert indicator is visually prominent and clearly communicates active alert state
- [ ] Single alert shows appropriately (dot or "1", not just a bare number)
- [ ] Multiple alerts show the count
- [ ] Very large counts are capped (e.g., "99+") to prevent layout issues
- [ ] No indicator is shown when `alertSummary` is null/undefined or count is zero
- [ ] Optional `note` subtext renders when present
- [ ] Indicator is readable against custom workspace background/text colors
- [ ] Accessibility label describes the alert count
- [ ] Component tests cover all states (hidden, single, multiple, overflow, note)
- [ ] `npm run test` passes
- [ ] `npm run lint` passes
