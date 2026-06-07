# Dispatch: Core UX fixes (all 7 observations)

## What
Fix the seven usage-discovered UX issues captured in agents/OBSERVATIONS.md (2026-06-07): workspace list scrolling, block content area scrolling, workspace context-menu Delete/Rename, block delete via Menu, row drag-and-drop reordering, Sort button showing the same menu as Menu, and text color flash after interactions.

## Why
These are high-impact blockers for basic workspace and block interaction. They were discovered in live use after extensive prior testing and must be resolved before the hide-completed-rows feature or any further post-MVP work.

## Scope
- Workspace list: make scrollable with proper overflow handling
- Block content area: make scrollable with proper overflow handling
- Workspace context menu: wire Delete and Rename actions
- Block menu: wire "Delete Block" action with confirmation flow
- Row drag-and-drop: make reordering functional via existing @dnd-kit integration
- Sort vs Menu buttons on block headers: clarify behavior and implement distinct sort UI or remove dead button
- Text color flash: investigate and eliminate style glitch after drag/state transitions

Out of scope: hide-completed rows (separate dispatch 086), any new features, archive state, search, alerts.

## Related Spec Sections
- docs/TODO_APP_UI_SPEC.md (workspace pane, block layout, menus, drag-and-drop)
- docs/TODO_APP_TECH_SPEC.md (state management, row ordering, block model)

## Constraints
- Use existing component and store patterns (Zustand, React, Tailwind)
- Preserve current data model and storage format
- Add or update tests (Vitest + Playwright) for the fixed flows
- No external APIs or new dependencies

## Acceptance Criteria
- [ ] Workspace list scrolls when content exceeds viewport
- [ ] Block content area scrolls when rows exceed viewport
- [ ] Workspace context menu Delete and Rename perform the expected actions
- [ ] Block menu "Delete Block" deletes the block with confirmation
- [ ] Row drag-and-drop reorders rows within a block
- [ ] Sort button either provides distinct sort behavior or is removed; Menu button remains unchanged
- [ ] No text color flash occurs after drag or state-changing interactions
- [ ] Relevant unit/integration and Playwright tests pass
- [ ] No unrelated files modified at close

## Dispatch Metadata
- Number: 085
- Type: Main → Plan
- Auto-close authorized: yes
- Auto-advance to 086 authorized: yes