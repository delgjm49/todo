# Review Protocol

How review works, what constitutes pass/fail, and how to handle failures.

---

## Review is Read-Only on Code

Review **must not edit implementation or test files**. If code needs to change, route back to Dev. Review may update:

- the review artifact (`*-review.md`)
- the dispatch channel
- `docs/SESSIONS.md`

If Review fixes code inline and self-passes the checkpoint, the audit trail and Dev → Review feedback loop break. Always route fixes through Dev/Plan/Main and require re-review.

---

## Review Checklist

Every review must inspect:

### 1. Plan Compliance
- [ ] All steps in the plan were addressed
- [ ] All acceptance criteria are met
- [ ] No scope creep (extra features not in the plan)
- [ ] Any deviations are documented and reasonable

### 2. Code Correctness
- [ ] TypeScript compiles without errors (`npm run build` or `tsc --noEmit`)
- [ ] No obvious logic errors
- [ ] Data shape / JSON storage changes match the plan
- [ ] Tauri commands (if added) are properly registered and typed

### 3. UI/UX
- [ ] Component handles all states: loading, empty, error, success
- [ ] UI matches the described layout and interactions
- [ ] Consistent with existing styling patterns (Tailwind classes, spacing)
- [ ] Keyboard shortcuts work if specified
- [ ] Animations work if specified

### 4. Data Integrity
- [ ] JSON read/write paths handle missing/corrupt files gracefully
- [ ] No risk of data loss on error (write-then-rename or equivalent for atomic saves)
- [ ] Migration logic, if any, is reversible or version-gated

### 5. Conventions
- [ ] File naming follows project conventions (`PascalCase` components, `camelCase` hooks/utils, `kebab-case` files)
- [ ] Imports are organized
- [ ] No leftover debug code or console.logs

### 6. Test Risk (React + Vitest + jsdom)
React/jsdom controlled-input tests are high-risk in this repo:
- Do not trust static inspection alone for new input/editing tests.
- If tests exercise focus, blur, input, or change behavior, those tests must actually pass locally before Review can pass the checkpoint.
- Store-level passing tests **do not prove** the UI interaction path is valid — both layers must be verified.
- Treat jsdom/react input-focus errors as red flags, especially messages involving `attachEvent`, `detachEvent`, or repeated `act(...)` warnings tied to new behavior under review.

### 7. Verification Reporting
- [ ] Required commands were rerun by Review (not just inspected)
- [ ] Each command outcome is reported using the form in [`../CLOSING.md`](../CLOSING.md#verification-reporting-rule)
- [ ] Failures in unrelated pre-existing or out-of-scope repo state are called out explicitly, not collapsed into the checkpoint status

---

## Verdict Definitions

### PASS
All criteria met. No issues found. Feature is complete.

**Next action**: Review appends `Review → Main` to the dispatch channel with `State = review-pass`. User continues with `pickup agents/channels/###-feature-channel.md` so Main can close, commit, and push.

### PASS WITH NOTES
All core criteria met. Only genuinely optional, intentionally deferred suggestions are provided. No one is required to change files before the work can be closed.

**Use this sparingly.** Review should bias toward fixing actionable issues now, even if they are low severity, when the fix is reasonable within the current dispatch.

A note may remain optional only when Review explicitly documents why it should not be required now. Valid deferral reasons include:
- speculative preference with no clear product/correctness benefit
- larger refactor or design change outside the dispatch scope
- risky change that deserves a separate plan/review cycle
- issue already captured by a queued/future dispatch
- truly cosmetic preference with no meaningful user or maintenance impact

Examples of acceptable optional notes:
- "This animation could be smoother, but changing motion behavior is subjective and outside this dispatch."
- "This helper could be generalized later, but it is only used once today."
- "A larger refactor would reduce duplication, but it is not low-risk enough for this fix round."

**Important**: Low severity does not automatically mean optional. If an issue is useful, clear, and reasonable to fix now, route it as a required fix even if it is small.

**Next action**: Same as PASS only when every note has a documented deferral reason and no files need to change before completion.

### FAIL — Return to Dev
One or more specific, fixable issues found. The plan is fine; the implementation needs correction.

This includes high/medium defects and also low-severity polish when the fix is reasonable, helpful, and within the current dispatch. Review should route back to Dev for fixes rather than leave actionable polish as optional notes when any of the following apply:
- fix is trivial or low-risk
- fix improves future maintainability or catches future issues
- fix adds/adjusts useful tests or smoke-test docs
- fix removes stale/dead/confusing code
- fix improves clear user-facing copy, state handling, or affordance quality
- fix addresses a product papercut discovered during review and is in scope

Examples:
- Missing error state in a component
- A step from the plan was skipped
- TypeScript compilation errors
- Incorrect data shape on save
- Trivial stale import/dead component cleanup
- Missing test for a new branch that would catch regressions
- Confusing label in a newly added UI surface

**Format for issues**:

```markdown
## Issues Found
1. **[Severity: High]** Missing error state in BlockEditor
   - File: src/components/BlockEditor.tsx
   - Problem: When the save fails, the component shows nothing. No error message.
   - Fix: Add an error state with a retry button, following the pattern in src/components/ErrorBoundary.tsx
```

**Next action**: Review appends `Review → Dev` to the dispatch channel with `State = needs-dev-fix`. Dev reads the review, fixes the listed issues, updates the complete artifact with fix notes, appends `Dev → Review`, then re-review follows.

### FAIL — Return to Plan
The issue is in the design, not the implementation. The plan needs adjustment.

Examples:
- Plan didn't account for an edge case that makes the current approach unworkable
- Plan's data shape has a design flaw
- Plan's component architecture won't scale
- Requirements were misunderstood

**Next action**: Review appends `Review → Plan` to the dispatch channel with `State = needs-plan-revision`. Plan revises, appends `Plan → Dev`, Dev implements the revision, appends `Dev → Review`, then re-review follows.

### FAIL — Return to Main
The issue requires Main-owned action rather than Dev or Plan work.

Examples:
- Workflow/process documentation needs correction
- Main-created dispatch or channel metadata is wrong
- The feature should be re-scoped, paused, or closed differently
- Git/commit/release coordination needs correction

**Next action**: Review appends `Review → Main` to the dispatch channel with `State = needs-main-fix`. Main applies the required fixes, appends `Main → Review` with `State = ready-for-re-review`, then re-review follows. Main must not mark the dispatch closed until Review later returns `review-pass`.

---

## Re-Review (After Fixes)

Any required fix must return to Review before the work can be finalized.

When Dev, Plan, or Main returns after a FAIL verdict:

1. Review reads the latest channel message and previous review artifact.
2. Review checks only the fixes unless the scope of changes is large.
3. Review writes a new review artifact or updates the existing one with a re-review section.
4. If fixes resolve the issues → PASS or narrowly justified PASS WITH NOTES with `State = review-pass`.
5. If not → FAIL again with specifics and append another Review → Dev, Review → Plan, or Review → Main channel message.

Main may only close the dispatch after this all-clear review.

---

## Dispatch Channel Requirements

Review must append the next-agent message to the active dispatch channel. It should not put long prompts in chat.

### PASS / PASS WITH NOTES Channel Message

```markdown
## Message N — Review → Main — YYYY-MM-DD

### To
Main

### State
review-pass

### Read
- agents/channels/###-feature-channel.md
- agents/artifacts/###-feature-review.md
- agents/artifacts/###-feature-complete.md

### Task
Close the feature. Confirm the PASS verdict, update docs/SESSIONS.md, commit, and push.

### Close Requirements
- Commit and push if the review is valid.
- Update docs/SESSIONS.md.
- Provide the next main/pickup instruction.
```

### FAIL → Dev Channel Message

```markdown
## Message N — Review → Dev — YYYY-MM-DD

### To
Dev

### State
needs-dev-fix

### Read
- agents/artifacts/###-feature-plan.md
- agents/artifacts/###-feature-complete.md
- agents/artifacts/###-feature-review.md

### Task
Address each issue listed in the review. Update the complete artifact with fix notes.

### Close Requirements
---
## ⚠️ BEFORE YOU END
When you finish fixing the issues:
- [ ] Update the complete artifact with fix notes
- [ ] Update docs/SESSIONS.md with a session entry
- [ ] Append the next Dev → Review message to this dispatch channel
- [ ] Output only the short pickup instruction to the user
- [ ] Do NOT commit — Main handles git
```

### FAIL → Main Channel Message

```markdown
## Message N — Review → Main — YYYY-MM-DD

### To
Main

### State
needs-main-fix

### Read
- agents/channels/###-feature-channel.md
- agents/artifacts/###-feature-review.md
- [any files Main must fix]

### Task
Address each required Main-owned issue listed in the review. When fixed, append a Main → Review message for re-review. Do not close the dispatch yet.

### Close Requirements
- Apply the listed fixes.
- Update docs/SESSIONS.md.
- Append Main → Review with State = ready-for-re-review.
- Do not mark the dispatch closed until Review returns State = review-pass.
```

### Main → Review Re-Review Channel Message

```markdown
## Message N — Main → Review — YYYY-MM-DD

### To
Review

### State
ready-for-re-review

### Read
- agents/channels/###-feature-channel.md
- agents/artifacts/###-feature-review.md
- [fixed files]

### Task
Re-review the required fixes. If all issues are resolved, append Review → Main with State = review-pass. If issues remain, append the appropriate Review → Dev/Plan/Main fix message.

### Close Requirements
- Write or update the review artifact with re-review findings.
- Update docs/SESSIONS.md.
- Append the next message to this dispatch channel.
- Do not commit; Main handles git.
```

### FAIL → Plan Channel Message

```markdown
## Message N — Review → Plan — YYYY-MM-DD

### To
Plan

### State
needs-plan-revision

### Read
- agents/artifacts/###-feature-dispatch.md
- agents/artifacts/###-feature-plan.md
- agents/artifacts/###-feature-review.md

### Task
Revise the plan to address the design issues identified in the review. Append the next Plan → Dev message when done.

### Close Requirements
- Update the plan artifact.
- Update docs/SESSIONS.md.
- Append the next message to this dispatch channel.
- Do not commit; Main handles git.
```

---

## Multiple Reviewer Option

For critical features, two independent review sessions can be run by appending explicit review messages to the channel:

1. **Reviewer A**: Focuses on code correctness and data integrity
2. **Reviewer B**: Focuses on UI/UX and conventions

Both reviews are written, and Dev addresses combined findings. Use for:
- Storage / migration changes
- Block editor / input-heavy UI surfaces (jsdom test risk)
- Session-close / dispatch-channel workflow changes
