# Review: Left dock and top-bar polish

- Dispatch ID: 077
- Feature slug: left-dock-topbar-polish
- Date: 2026-05-31
- Reviewer role: Review
- Verdict: **FAIL — Return to Dev**

## Scope Reviewed
Reviewed the dispatch 077 implementation against `agents/artifacts/077-left-dock-topbar-polish-plan.md`
and the dispatch acceptance criteria, using the working-tree diff (`git diff HEAD`) for
the in-scope files plus the complete artifact and a full re-run of the required
verification commands.

## Verification (rerun by Review, zsh on macOS)
| Command | Result | Notes |
|---------|--------|-------|
| `npm run test` | **pass** | 455 tests / 64 suites, 0 fail (matches Dev's report) |
| `npm run lint` | **pass** | clean, no output |
| `npm run build` | **pass** | `vite build` ✓, 117 modules, built in ~1s |

- shell used: zsh (the actual environment shell)
- checkpoint-scoped or unrelated repo-state: the working tree also carries
  unrelated, out-of-scope modifications (`package-lock.json` libc-field churn) that
  are not part of this dispatch — see Notes. The required commands themselves pass.

## Plan Compliance — Acceptance Criteria

| # | Criterion | Status |
|---|-----------|--------|
| 1 | Left dock fixed-height; only workspace list scrolls | ✅ implemented (AppShell `h-screen overflow-hidden`, LeftDock `h-full` + `shrink-0` on non-list regions, MainPane `overflow-y-auto`) — structurally correct; **runtime not confirmed** |
| 2 | Settings = single bottom gear; no duplicate top-right Settings | ✅ implemented (LeftDock gear inline-SVG + `aria-label`/`title`; TopBar Settings control + selector removed) |
| 3 | Top-bar `+ Block` removed | ✅ implemented |
| 4 | Canvas add-block templates remain after blocks exist | ✅ implemented (`AddBlockTemplateButtons` reused in empty + non-empty branches) |
| 5 | Always-visible top-bar search, MVP behavior preserved | ✅ implemented (inline `<SearchPanel />`, dropdown on non-empty query, outside-click + Escape clear, search pipeline untouched) |
| 6 | Undo/Redo icon buttons w/ tooltips, disabled states, actions | ✅ implemented (`IconButton`, inline SVG, `aria-label`/`title`, `disabled`/`onClick` preserved) |
| 7 | **Workspace drag reorders reliably (confirmed in running app)** | ❌ **FAIL — primary fix skipped + required runtime check not done** |
| 8 | Reordered workspaces persist after reload/storage round-trip | ⚠️ store round-trip test passes, but the UI drag path that drives it is not fixed (see #7) |
| 9 | Coverage added/updated | ⚠️ reorder round-trip + dragstart-contract tests added; the plan-mandated update tied to the root change was not made (because the root change was skipped) |
| 10 | `npm run test` / `lint` / `build` pass | ✅ verified |

## Issues Found

### 1. [Severity: High] The primary workspace-reorder fix was not implemented
- **Files:** `src/components/workspace/WorkspaceCard.tsx`,
  `src/tests/unit/workspaceCard.test.tsx`
- **Problem:** The plan's Root-Cause Finding #1 and Step 1 are explicit that the
  reorder bug is caused by the draggable root being a native `<button>`, and the
  **required** fix is to change that root from `<button>` to
  `<div role="button" tabIndex={0}>` (with `aria-pressed={active}` and an
  Enter/Space `onKeyDown` → `onSelect` for a11y). The `setData`/`effectAllowed`
  additions are described in the plan as secondary, "cheap, spec-correct hardening."
  - The diff only adds `effectAllowed`/`setData` inside `onDragStart`. **The root
    element is still `<button>`** — confirmed three ways: (a) the WorkspaceCard diff
    touches only the `onDragStart` handler, with no root-tag/`role`/`tabIndex`/
    `onKeyDown` change; (b) the newly added "WorkspaceCard drag contract" test queries
    `document.querySelector("button")` and asserts it exists, and that test passes;
    (c) the plan-required update of the existing test (`querySelector("button")` →
    `[role="button"]`) is absent because it was unnecessary with the root unchanged.
  - The plan's own analysis notes that block drag already works **without** any
    `dataTransfer` setup, so adding `setData` alone targets the *less* likely cause and
    leaves the *more* likely cause (the `<button>` drop target) in place. The reported
    bug — "drag starts but the drop never fires" — is very likely still present.
- **Fix:** Implement Step 1 as written: change the draggable root to
  `<div role="button" tabIndex={0} aria-pressed={active}>`, add the Enter/Space
  `onKeyDown` handler, drop `type="button"`, adjust the `onDragOver` event type to
  `DragEvent<HTMLDivElement>` if needed, and keep the `setData`/`effectAllowed`
  hardening that is already in place. Then update both `workspaceCard.test.tsx`
  queries that rely on `querySelector("button")` (the existing render test near the
  bottom of the file **and** the new drag-contract test) to target `[role="button"]`.

### 2. [Severity: High] Required runtime verification of the reorder was not performed
- **Problem:** The plan made runtime verification a **required acceptance gate** for
  the reorder criterion ("confirmed in the running app, not just unit tests";
  "JSDOM cannot prove a drag-and-drop fix"). The complete artifact's Verification
  section reports only `test`/`lint`/`build`/`e2e` — there is no runtime reorder check.
  JSDOM does not implement `DataTransfer`/`DragEvent` robustly, so the unit tests
  cannot stand in for this gate.
- **Fix:** After applying Issue 1, launch the app (Tauri MCP / `verify` or `run`
  skill) and confirm that dragging a workspace onto another reorders the dock **and**
  that the new order persists after reload. Record the result (with the actual shell)
  in the complete artifact. While the app is up, a quick visual confirm of the new
  fixed-height dock scroll (only the workspace list scrolls; header/footer pinned) and
  the persistent canvas add-block buttons would also discharge the plan's other
  runtime checks.

### 3. [Severity: Low] Complete artifact mischaracterizes the plan's root cause
- **File:** `agents/artifacts/077-left-dock-topbar-polish-complete.md` (Deviations)
- **Problem:** The Deviations note states the plan "correctly identified missing
  `dataTransfer` setup as root cause." The plan actually identified the native
  `<button>` root as the root cause and treated `dataTransfer` as secondary hardening.
  This misreading is what led to the skipped primary fix in Issue 1.
- **Fix:** When updating the complete artifact with fix notes, correct this so the
  record reflects the `<button>` → `<div role="button">` change as the primary fix.

## Notes (not blocking, for Main awareness)
- The working tree contains an out-of-scope `package-lock.json` change (removal of
  `libc` fields on several optional native deps — likely an incidental `npm` lockfile
  normalization). It is unrelated to dispatch 077. Main should decide whether to
  keep, revert, or split it out before committing; Review takes no action on it
  (read-only on code).

## Verdict
**FAIL — Return to Dev.** The structural/visual portions of the dispatch (fixed-height
shell, Settings gear, top-bar simplification, always-visible search, icon Undo/Redo,
persistent add-block, store-level reorder persistence test) are implemented well and
the required commands pass. However, the central reason for the dispatch — the
workspace drag-reorder fix — was only half-implemented (the secondary `dataTransfer`
hardening without the primary `<button>` → `<div role="button">` root change), and the
plan-mandated runtime verification of the reorder was not performed. Return to Dev to
complete Step 1, update the dependent tests, perform the required runtime check, and
re-submit for re-review.

---

## Re-Review — Fix Round (message 005) — 2026-05-31

**Verdict: PASS — Ready for Main.**

All four required findings from the initial review (message 004) are resolved:

1. **(Was High) Primary reorder fix — RESOLVED.** `WorkspaceCard.tsx` root is now
   `<div role="button" tabIndex={0} aria-pressed={active}>` with an Enter/Space
   `onKeyDown` → `onSelect` handler; `type="button"` removed; the `onDragOver` prop is
   retyped to `DragEvent<HTMLDivElement>`; the `effectAllowed`/`setData` hardening is
   retained; `cursor-pointer` added for the non-button root.
2. **(Was High) Required runtime verification — RESOLVED.** The complete artifact now
   records a `npm run dev` + Playwright Chromium runtime check: dragging a workspace
   reorders the dock and the new order persists across reload (also confirmed the
   bottom Settings entry and the non-empty-canvas "Add another block" affordance).
3. **(Was Low) Deviations note — RESOLVED.** The complete artifact now correctly
   describes the `<button>` → `<div role="button">` root replacement as the primary fix.
4. **Dependent tests — RESOLVED.** Both `workspaceCard.test.tsx` root queries
   (lines 124 and 393) and the new drag-contract test now use `[role="button"]`.

**Verification rerun by Review (zsh/macOS):** `npm run test` 455/455 pass,
`npm run lint` pass, `npm run build` pass.

**Carried to Main:** the out-of-scope `package-lock.json` change remains in the working
tree (libc-field churn on optional native deps) — Main to decide keep/revert/split
before commit.

**Verdict: PASS.** Routed to Main (`review-pass`).
