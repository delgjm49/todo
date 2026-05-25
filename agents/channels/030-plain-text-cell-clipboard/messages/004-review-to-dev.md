# Message 004 — Review → Dev — 2026-05-25

## From
Review

## To
Dev

## State
needs-dev-fix

## Read
- agents/artifacts/030-plain-text-cell-clipboard-plan.md
- agents/artifacts/030-plain-text-cell-clipboard-complete.md
- agents/artifacts/030-plain-text-cell-clipboard-review.md

## Task
Address each issue listed in the review artifact:

1. **[Severity: Med] Test 8 logically incorrect assertion** — Remove test 8 ("Keyboard shortcut guard is first in handler before Enter/Escape") entirely. The assertion is wrong: the clipboard guard only catches c/x/v/a, not Enter, so `Ctrl+Enter` would hit the Enter handler's `preventDefault()` if the React handler fired. The test passes only because the JSDOM crash prevents the handler from running. Guard ordering is already covered structurally by test 1 and source inspection.

2. **[Severity: Low] Test 1 vacuous assertion** — Add a brief inline comment (1-2 lines) on test 1 ("Ctrl+C/X/V/A keyboard events are not default-prevented") acknowledging that native `dispatchEvent` on controlled inputs triggers the React 18 `getNodeFromInstance` crash before the synthetic `onKeyDown` handler fires, making the `defaultPrevented` check a structural/guard-presence assertion rather than a behavioral one.

No changes to `TextCell.tsx` are needed — the production code is correct.

## Close Requirements
---
## ⚠️ BEFORE YOU END
When you finish fixing the issues:
- [ ] Update the complete artifact with fix notes
- [ ] Update docs/SESSIONS.md with a session entry
- [ ] Append the next Dev → Review message to this dispatch channel
- [ ] Output only the short pickup instruction to the user
- [ ] Do NOT commit — Main handles git
