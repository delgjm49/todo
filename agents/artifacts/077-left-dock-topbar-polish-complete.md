# Complete: Left dock and top-bar polish

## Summary
Implemented the shell polish from dispatch 077: the app shell is viewport-bounded, the left dock has a fixed footer Settings gear and list-only scrolling, and the top bar now uses an always-visible search input with icon Undo/Redo controls. Workspace drag now uses a non-button `div role="button"` draggable root with keyboard activation plus HTML drag payload hardening; add-block buttons remain available after blocks exist; reorder persistence/drag contract coverage was added. Review fix round 005 completed the required `<button>` → `<div role="button">` root change and runtime drag verification.

## Files Changed
| Action | Path | Notes |
|--------|------|-------|
| Modified | `src/components/workspace/WorkspaceCard.tsx` | Changed draggable root from native `<button>` to `<div role="button" tabIndex={0} aria-pressed={active}>`, added Enter/Space keyboard activation, kept `effectAllowed = "move"` and `setData("text/plain", entry.id)` in `onDragStart`. |
| Modified | `src/components/layout/AppShell.tsx` | Changed the root shell to `h-screen overflow-hidden`. |
| Modified | `src/components/layout/LeftDock.tsx` | Changed dock height to `h-full`, pinned header/add row/footer with `shrink-0`, and added an inline-SVG Settings gear with `aria-label`/`title`. |
| Modified | `src/components/layout/TopBar.tsx` | Removed top-bar `+ Block` and Settings controls, rendered inline `SearchPanel`, and converted Undo/Redo to inline-SVG icon buttons. |
| Modified | `src/components/search/SearchPanel.tsx` | Refactored to self-contained always-visible top-bar input with internal dropdown, outside-click clear, Escape clear/blur, and preserved search result navigation. |
| Modified | `src/components/layout/MainPane.tsx` | Added internal canvas scrolling and a reusable add-block button group for empty and non-empty block states. |
| Modified | `src/tests/unit/documentStore.test.ts` | Added workspace reorder persistence round-trip coverage. |
| Modified | `src/tests/unit/workspaceCard.test.tsx` | Added dragstart contract coverage and updated root queries to `[role="button"]`. |
| Modified | `agents/artifacts/077-left-dock-topbar-polish-complete.md` | Updated after review fixes with corrected root-cause/deviation notes and runtime verification. |
| Modified | `docs/SESSIONS_PENDING.md` | Appended Dev handoff entries. |
| Created | `agents/channels/077-left-dock-topbar-polish/messages/003-dev-to-review.md` | Initial Dev → Review handoff. |
| Created | `agents/channels/077-left-dock-topbar-polish/messages/005-dev-to-review.md` | Review-fix Dev → Review handoff. |

## Deviations from Plan
- The immutable channel recap requested adding `preventDefault()` to `WorkspaceCard` drop/drag-over, but the plan artifact superseded that. The implemented primary fix is the plan-required native `<button>` root replacement with `<div role="button">`; `dataTransfer` setup remains as secondary drag-contract hardening.
- The non-empty add-block buttons use disambiguated `aria-label`s (`Add block preset N`) while preserving visible `Add …` labels, so the existing Playwright smoke assertion for the new block header remains unambiguous.

## Open Questions
- None.

## Verification
- command: `npm run test`
- shell used: zsh via Pi bash tool on macOS
- result: pass (`455` tests passed)
- if failed, exact failure surface: N/A
- checkpoint-scoped or unrelated repo-state: checkpoint-scoped
- was this the actual shell provided by the environment: yes

- command: `npm run lint`
- shell used: zsh via Pi bash tool on macOS
- result: pass
- if failed, exact failure surface: N/A
- checkpoint-scoped or unrelated repo-state: checkpoint-scoped
- was this the actual shell provided by the environment: yes

- command: `npm run build`
- shell used: zsh via Pi bash tool on macOS
- result: pass
- if failed, exact failure surface: N/A
- checkpoint-scoped or unrelated repo-state: checkpoint-scoped
- was this the actual shell provided by the environment: yes

- command: `npm run test:e2e`
- shell used: zsh via Pi bash tool on macOS
- result: pass (`1` Chromium test passed)
- if failed, exact failure surface: N/A. An initial pre-review run failed because the new post-list `Add Checklist` affordance made `getByRole("button", { name: "Checklist" })` ambiguous; the add-block buttons were then given disambiguated accessible names for the non-empty state and the command passed on rerun. The post-review-fix rerun passed.
- checkpoint-scoped or unrelated repo-state: checkpoint-scoped
- was this the actual shell provided by the environment: yes

- command: runtime browser verification via `npm run dev -- --host 127.0.0.1 --port 4177` plus a Playwright Chromium script
- shell used: zsh via Pi bash tool on macOS
- result: pass
- if failed, exact failure surface: N/A. The script reset local storage, created two additional workspaces, dragged `Workspace 3` onto `Home`, confirmed dock order changed to `Workspace 3`, `Home`, `Workspace 2`, reloaded, confirmed that order persisted, confirmed the bottom Settings entry was visible, selected `Home`, and confirmed the non-empty canvas showed `Add another block`.
- checkpoint-scoped or unrelated repo-state: checkpoint-scoped
- was this the actual shell provided by the environment: yes

## Known Issues
- None.
