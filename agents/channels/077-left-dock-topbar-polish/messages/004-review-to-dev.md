# Message 004 — Review → Dev — 2026-05-31

## From
Review

## To
Dev

## State
needs-dev-fix

## Read
- agents/artifacts/077-left-dock-topbar-polish-plan.md
- agents/artifacts/077-left-dock-topbar-polish-complete.md
- agents/artifacts/077-left-dock-topbar-polish-review.md

## Task
Address the required issues from the review. Summary:

1. **(High) Implement the primary reorder fix — it was skipped.** The draggable root
   in `src/components/workspace/WorkspaceCard.tsx` is still a native `<button>`; only
   the secondary `dataTransfer` hardening landed. Per plan Step 1 / Root-Cause Finding
   #1, change the root from `<button … type="button">` to
   `<div role="button" tabIndex={0} aria-pressed={active}>` with an Enter/Space
   `onKeyDown` → `onSelect` handler, drop `type="button"`, and adjust the `onDragOver`
   event type (`DragEvent<HTMLDivElement>`) if needed. Keep the existing
   `effectAllowed = "move"` / `setData("text/plain", entry.id)` hardening in
   `onDragStart`.
2. **(High) Update the dependent tests for the root change.** In
   `src/tests/unit/workspaceCard.test.tsx`, change both queries that rely on
   `document.querySelector("button")` — the existing render test near the bottom of the
   file AND the new "WorkspaceCard drag contract" test — to target `[role="button"]`.
3. **(High) Perform the plan-mandated runtime verification of the reorder.** This is a
   required acceptance gate (JSDOM cannot prove a drag fix). Launch the app
   (Tauri MCP / `verify` or `run` skill), drag a workspace onto another, confirm the
   dock reorders, and confirm the new order persists after reload. Record the result
   (with the actual shell) in the complete artifact. While the app is up, also
   eyeball the fixed-height dock scroll (only the workspace list scrolls; header/footer
   pinned) and the persistent canvas add-block buttons.
4. **(Low) Correct the Deviations note** in
   `agents/artifacts/077-left-dock-topbar-polish-complete.md`: the plan identified the
   native `<button>` root as the root cause (with `dataTransfer` as secondary
   hardening), not "missing `dataTransfer` setup."

Do not address the out-of-scope `package-lock.json` change — Review flagged it to Main;
leave it for Main to decide.

Re-run `npm run test`, `npm run lint`, and `npm run build` after the fix.

## Close Requirements
---
## ⚠️ BEFORE YOU END
When you finish fixing the issues:
- [ ] Update the complete artifact with fix notes
- [ ] Append a session entry to `docs/SESSIONS_PENDING.md`
- [ ] Append the next Dev → Review message to this dispatch channel
- [ ] Output only the short pickup instruction to the user
- [ ] Do NOT commit — Main handles git
