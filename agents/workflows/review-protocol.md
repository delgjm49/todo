<!-- DISPATCH-SHARED:review-protocol-pre — synced from meta-workflow/agents/templates/dispatch. Edit the canonical file and run tools/sync_repo_agents.py --apply; do not hand-edit here. Repo-specific text belongs in DISPATCH-LOCAL blocks. -->
# Review Protocol

How review works, what constitutes pass/fail, and how to handle failures.

---

## Review is Read-Only on Code

Review **must not edit implementation or test files**. If code needs to change, route back to Dev. Review may update:

- the review artifact (`*-review.md`)
- the dispatch channel
- the repo's configured session append buffer

If Review fixes code inline and self-passes the checkpoint, the audit trail and Dev → Review feedback loop break. Always route fixes through Dev or Main and require re-review.

---

## Review Checklist

Every review must inspect plan compliance plus the repo's stack-specific criteria.

### 1. Plan Compliance
- [ ] All steps in the plan were addressed
- [ ] All acceptance criteria are met
- [ ] No scope creep (extra features not in the plan)
- [ ] Any deviations are documented and reasonable
<!-- /DISPATCH-SHARED:review-protocol-pre -->
<!-- DISPATCH-LOCAL:review-checklist-stack — repo-owned: stack-specific review criteria (build/typecheck commands, data-layer integrity, UI/test risks, naming conventions). Sync preserves this block; edit it here. -->

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
- Treat jsdom/react input-focus errors as red flags, especially messages involving `attachEvent`, `detachEvent`, or repeated `act(...)` warnings.
<!-- /DISPATCH-LOCAL:review-checklist-stack -->
<!-- DISPATCH-SHARED:review-protocol-post — synced from meta-workflow/agents/templates/dispatch. Edit the canonical file and run tools/sync_repo_agents.py --apply; do not hand-edit here. Repo-specific text belongs in DISPATCH-LOCAL blocks. -->

### Verification Reporting
- [ ] Required commands were rerun by Review (not just inspected)
- [ ] Each command outcome is reported using the form in [`../CLOSING.md`](../CLOSING.md#verification-reporting-rule)
- [ ] Failures in unrelated pre-existing or out-of-scope repo state are called out explicitly, not collapsed into the checkpoint status

### Out-of-Scope Working Tree Changes
- [ ] `git status` inspected; any unexpected dirty file is classified in the review artifact's `## Out-of-Scope Working Tree Changes` section (path, suspected cause, recommendation, blocking status)

---

## Verdict Definitions

The review artifact must end with an unambiguous `## Final Verdict` section. The verdict is one of:

### PASS
All criteria met. No issues found. Feature is complete.

**Next action**: Review creates the next `Review → Main` message file to the dispatch channel with `State = review-pass`. User continues with `pickup agents/channels/###-feature-slug/` so Main can run the dirty-file close gate, then close, commit, and push.

### PASS WITH NOTES
All core criteria met. Only genuinely optional, intentionally deferred suggestions are provided. No one is required to change files before the work can be closed.

**Use this sparingly.** Review should bias toward fixing actionable issues now, even if they are low severity, when the fix is reasonable within the current dispatch.

A note may remain optional only when Review explicitly documents why it should not be required now. Valid deferral reasons include:
- speculative preference with no clear product/correctness benefit
- larger refactor or design change outside the dispatch scope
- risky change that deserves a separate plan/review cycle
- issue already captured by a queued/future dispatch
- truly cosmetic preference with no meaningful user or maintenance impact

**Important**: Low severity does not automatically mean optional. If an issue is useful, clear, and reasonable to fix now, route it as a required fix even if it is small.

**Deferral requires a tracked destination.** Every deferred note must be recorded as an `[open]` entry in the repo's deferred ledger `agents/DEFERRED.md` (create the file if it does not exist yet) — not just mentioned in this review artifact. A note you cannot justify writing into the ledger is a note that should have been a required Dev fix. See [`deferred-protocol.md`](deferred-protocol.md) for the ledger format and lifecycle. This is what keeps "PASS WITH NOTES" from quietly becoming "skip and forget."

**Next action**: Same as PASS only when every note has a documented deferral reason **and** has been written to `agents/DEFERRED.md`, and no files need to change before completion.

### FAIL — Return to Dev
One or more specific, fixable issues found. The plan is fine; the implementation needs correction.

This includes high/medium defects and also low-severity polish when the fix is reasonable, helpful, and within the current dispatch. Route back to Dev rather than leaving actionable polish as optional notes when any of the following apply:
- fix is trivial or low-risk
- fix improves future maintainability or catches future issues
- fix adds/adjusts useful tests or smoke-test docs
- fix removes stale/dead/confusing code
- fix improves clear user-facing copy, state handling, or affordance quality
- fix addresses a product papercut discovered during review and is in scope

Examples:
- Missing error state in a component
- A step from the plan was skipped
- Build/typecheck errors
- Incorrect data shape on save
- Trivial stale import/dead component cleanup
- Missing test for a new branch that would catch regressions

**Format for issues**:

```markdown
## Issues Found
1. **[Severity: High]** Missing error state in <Component>
   - File: src/components/<Component>
   - Problem: When the save fails, the component shows nothing. No error message.
   - Fix: Add an error state with a retry button, following the existing error-handling pattern.
```

**Next action**: Review creates the next `Review → Dev` message file in the dispatch channel with `State = needs-dev-fix`. Dev reads the review, fixes the listed issues, updates the complete artifact with fix notes, creates the next `Dev → Review` message file (`State = ready-for-review`), then re-review follows.

### FAIL — Return to Main
The issue is design/plan-level, or it requires Main-owned action rather than Dev work.

Examples:
- Plan didn't account for an edge case that makes the current approach unworkable
- Plan's data shape or architecture has a design flaw
- Requirements were misunderstood
- Workflow/process documentation needs correction
- Main-created dispatch or channel metadata is wrong
- The feature should be re-scoped, paused, or closed differently
- Git/commit/release coordination needs correction

**Next action**: Review creates the next `Review → Main` message file in the dispatch channel with `State = needs-main-fix`. Main applies the required fixes — re-engaging Plan if the plan itself needs revision — and creates the next `Main → Review` message file with `State = ready-for-review`; re-review follows. Main must not mark the dispatch closed until Review later returns `review-pass`.

> Note: there is no `Review → Plan` route. Design/plan-level failures go to Main via `needs-main-fix`; Main owns re-engaging Plan. (See the dispatch-channel protocol for the full allowed-state list and retired tokens.)

---

## Re-Review (After Fixes)

Any required fix must return to Review before the work can be finalized.

When Dev or Main returns after a FAIL verdict:

1. Review reads the latest channel message and previous review artifact.
2. Review checks the fixes against the issues it previously raised (and the wider scope if changes are large).
3. Review writes a new review artifact or updates the existing one with a re-review section and an updated `## Final Verdict`.
4. If fixes resolve the issues → PASS or narrowly justified PASS WITH NOTES with `State = review-pass`.
5. If not → FAIL again with specifics and create another Review → Dev or Review → Main message file.

Main may only close the dispatch after this all-clear review.

---

## Dispatch Channel Requirements

Review must create the next numbered next-agent message file in the active dispatch channel spool. It should not put long prompts in chat.

### PASS / PASS WITH NOTES Channel Message

```markdown
# Message NNN — Review → Main — YYYY-MM-DD

## From
Review

## To
Main

## State
review-pass

## Read
- agents/channels/###-feature-slug/
- agents/artifacts/###-feature-review.md
- agents/artifacts/###-feature-complete.md

## Task
Close the feature. Confirm the Final Verdict, run the dirty-file close gate, consolidate the session log, commit, and push.

## Close Requirements
- Run the dirty-file close gate before committing.
- Commit and push if the review is valid.
- Consolidate the session log per agents/CLOSING.md.
- Provide the next main/pickup instruction.
```

### FAIL → Dev Channel Message

```markdown
# Message NNN — Review → Dev — YYYY-MM-DD

## From
Review

## To
Dev

## State
needs-dev-fix

## Read
- agents/artifacts/###-feature-plan.md
- agents/artifacts/###-feature-complete.md
- agents/artifacts/###-feature-review.md

## Task
Address each issue listed in the review. Update the complete artifact with fix notes.

## Close Requirements
---
## ⚠️ BEFORE YOU END
When you finish fixing the issues:
- [ ] Update the complete artifact with fix notes
- [ ] Append a session entry to the configured session append buffer
- [ ] Create the next Dev → Review message file in this dispatch channel (State = ready-for-review)
- [ ] Output only the short pickup instruction to the user
- [ ] Do NOT commit — Main handles git
```

### FAIL → Main Channel Message

```markdown
# Message NNN — Review → Main — YYYY-MM-DD

## From
Review

## To
Main

## State
needs-main-fix

## Read
- agents/channels/###-feature-slug/
- agents/artifacts/###-feature-review.md
- [any files Main must fix, or the plan if it needs revision]

## Task
Address each required Main-owned or design/plan-level issue listed in the review. Re-engage Plan if the plan itself needs revision. When fixed, create a Main → Review message file for re-review. Do not close the dispatch yet.

## Close Requirements
- Apply the listed fixes (re-engaging Plan if needed).
- Create the next Main → Review message file with State = ready-for-review.
- Do not mark the dispatch closed until Review returns State = review-pass.
```

### Main → Review Re-Review Channel Message

```markdown
# Message NNN — Main → Review — YYYY-MM-DD

## From
Main

## To
Review

## State
ready-for-review

## Read
- agents/channels/###-feature-slug/
- agents/artifacts/###-feature-review.md
- [fixed files]

## Task
Re-review the required fixes. If all issues are resolved, create the next Review → Main message file with State = review-pass. If issues remain, create the appropriate Review → Dev or Review → Main fix message file.

## Close Requirements
- Write or update the review artifact with re-review findings and an updated Final Verdict.
- Append a session entry to the configured session append buffer.
- Create the next numbered message file in this dispatch channel.
- Do not commit; Main handles git.
```

---

## Multiple Reviewer Option

For critical features, two independent review sessions can be run by creating explicit review message files in the channel:

1. **Reviewer A**: Focuses on code correctness and data integrity
2. **Reviewer B**: Focuses on UI/UX and conventions

Both reviews are written, and Dev addresses combined findings. Use for:
- Storage / migration changes
- Input-heavy UI surfaces
- Session-close / dispatch-channel workflow changes
<!-- /DISPATCH-SHARED:review-protocol-post -->
