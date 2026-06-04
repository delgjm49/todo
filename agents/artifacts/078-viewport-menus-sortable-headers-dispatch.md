# Dispatch: Viewport-safe menus and sortable block headers

## What
Polish live-QA issues around popover positioning and block header interactions. Clamp block/workspace/column popover menus so they remain usable inside the viewport, clean up block column header layout/overflow, and add direct click-to-sort behavior on sortable headers with asc/desc toggling.

## Why
After the left dock/top-bar polish pass, the remaining high-impact live-QA UI issues are concentrated around menus that can render off-screen and table-like block headers that feel visually noisy or incomplete. This dispatch makes those surfaces feel durable and predictable without expanding the broader feature set.

## Scope
- Clamp block, workspace, and column popover/menu positioning to the viewport so menus do not open partially off-screen.
- Preserve existing menu behavior and keyboard/mouse interactions while improving placement.
- Clean block column header alignment, spacing, and overflow handling.
- Add click-to-sort behavior for sortable block headers.
- Support re-click asc/desc toggling on sortable headers, consistent with existing sort domain/store behavior.
- Make non-sortable marker headers visually minimal rather than looking like active sortable controls.
- Clean up numbered-list header weirdness called out during live QA.

**Out of scope:**
- Light-mode default color/formatting semantics.
- Richer inline text formatting for checklist/list text.
- New sort modes beyond existing sortable block/header capabilities.
- Broad shell/top-bar/dock redesign beyond what is necessary for menu viewport clamping.
- Storage schema changes unless Plan verifies a small existing-setting update is already required by current sort behavior.

## Related Spec Sections
- docs/TODO_APP_UI_SPEC.md
- docs/TODO_APP_TECH_SPEC.md
- docs/TODO_APP_IMPLEMENTATION_BACKLOG.md
- agents/artifacts/007-block-row-sorting-domain-logic-dispatch.md
- agents/artifacts/008-sort-menu-ui-dispatch.md
- agents/artifacts/077-left-dock-topbar-polish-dispatch.md
- Existing block, menu/popover, workspace dock, and sorting code under `src/`

## Constraints
- Follow existing React/TypeScript/Tailwind patterns and repo naming conventions.
- Keep storage local JSON only; do not introduce external APIs or new persistence backends.
- Prefer shared positioning utilities/hooks only if Plan verifies they fit current menu patterns; otherwise use targeted fixes.
- Preserve accessibility basics: menu triggers remain keyboard reachable, sortable headers expose appropriate button/pressed/sort semantics where current patterns support it, and visual-only marker headers are not misleading interactive controls.
- Keep behavior compatible with existing sort menu UI and row-sorting domain logic.
- Main handles commit/push after Review passes.

## Acceptance Criteria
- [ ] Block popover/menu surfaces remain within the visible viewport when opened near window edges.
- [ ] Workspace popover/menu surfaces remain within the visible viewport when opened near window edges.
- [ ] Column/header popover/menu surfaces remain within the visible viewport when opened near window edges.
- [ ] Block column headers have clean alignment, spacing, and overflow behavior.
- [ ] Sortable headers can be clicked to sort by that column/type.
- [ ] Re-clicking the active sortable header toggles ascending/descending order.
- [ ] Non-sortable marker headers are visually minimal and do not imply unsupported sorting.
- [ ] Numbered-list header presentation is cleaned up and no longer shows the live-QA weirdness.
- [ ] Relevant unit/component/integration coverage is added or updated for viewport clamping and header sort interactions where practical.
- [ ] `npm run test`, `npm run lint`, and `npm run build` pass.
