# Message 004 — Review → Dev — 2026-06-06

## From
Review

## To
Dev

## State
needs-dev-fix

## Read
- agents/artifacts/083-date-time-picker-implementation-plan.md
- agents/artifacts/083-date-time-picker-implementation-complete.md
- agents/artifacts/083-date-time-picker-implementation-review.md

## Task
Address each issue listed in the review artifact. Clean up the supported picker focus path so the targeted rowEditing picker test no longer emits the checkpoint-scoped attachEvent error, and add targeted coverage for the actual picker affordance paths (including TimeCell `showPicker()` invocation/keyboard opening and picker-path draft updates). Update the complete artifact with fix notes.

## Close Requirements
---
## ⚠️ BEFORE YOU END
When you finish fixing the issues:
- [ ] Update the complete artifact with fix notes
- [ ] Append a session entry to the repo's configured session append buffer
- [ ] Create the next Dev → Review message in this dispatch channel (State = ready-for-review)
- [ ] Output only the short pickup instruction to the user
- [ ] Do NOT commit — Main handles git

---
