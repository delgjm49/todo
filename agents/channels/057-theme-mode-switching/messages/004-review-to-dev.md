# Message 004 — Review → Dev — 2026-05-25

## From
Review

## To
Dev

## State
needs-dev-fix

## Read
- agents/artifacts/057-theme-mode-switching-plan.md
- agents/artifacts/057-theme-mode-switching-complete.md
- agents/artifacts/057-theme-mode-switching-review.md

## Task
Address each issue listed in the review artifact. Summary of required fixes:

1. **Tests 1–2 must exercise the actual `useTheme` hook**, not a test-only `ThemeApplier` duplicate. Remove `ThemeApplier`. Create a minimal wrapper component that calls `useTheme()` from `../../hooks/useTheme.js`, set the store's `settings.theme` before rendering, and assert DOM classes and `color-scheme` after rendering.

2. **Update the complete artifact test count** to match the actual number of `test()` blocks in the file.

## Close Requirements
---
## ⚠️ BEFORE YOU END
When you finish fixing the issues:
- [ ] Update the complete artifact with fix notes
- [ ] Append a session entry to docs/SESSIONS_PENDING.md
- [ ] Append the next Dev → Review message to this dispatch channel
- [ ] Output only the short pickup instruction to the user
- [ ] Do NOT commit — Main handles git
