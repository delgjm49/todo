<!-- Synced wholesale from meta-workflow/agents/templates/dispatch. Edit the canonical file and run tools/sync_repo_agents.py --apply; do not hand-edit in app repos. -->
# Artifact Format Specification

Artifacts are structured markdown files that describe work state. Dispatch channels carry the messages between agents. Together they let agents parse project state reliably without long copy/paste prompts in chat.

## Artifact Types

### 1. Dispatch (`*-dispatch.md`)
**Created by**: Main (or Plan, when dispatching sub-tasks)
**Consumed by**: Plan (or Dev, for small/clear tasks)

```markdown
# Dispatch: [Feature Name]

## What
[2-3 sentence description of what to build]

## Why
[Context: what problem does this solve, what phase/feature does it belong to]

## Scope
- [In-scope item 1]
- [In-scope item 2]
- [Explicitly OUT of scope: item]

## Related Spec Sections
- [docs/SPEC.md §X — relevant section]
- [docs/ARCHITECTURE.md — relevant section]
- [Ticket / backlog reference, if any]

## Constraints
- [Any technical constraints, must-use libraries, patterns to follow]

## Acceptance Criteria
- [ ] [Criterion 1]
- [ ] [Criterion 2]
```

### 2. Plan (`*-plan.md`)
**Created by**: Plan
**Consumed by**: Dev

```markdown
# Plan: [Feature Name]

## Overview
[2-3 sentence summary]

## Verified Current-State Facts
[Concrete facts confirmed from disk during reconnaissance: which files/tests/functions
were read and what they currently do. This grounds the plan. Anything not verified is
labeled below as an assumption or hypothesis.]

## Prerequisites
- [Any dependency that must be done first]

## Files to Create/Modify
| Action | Path | Description |
|--------|------|-------------|
| Create | path/to/new/file | ... |
| Modify | path/to/existing/file | ... |

## Implementation Steps
### Step 1: [Title]
- [Specific instruction]
- [File: path/to/file]
- **Verify**: [How to confirm this step worked]

### Step 2: [Title]
...

## Data / Storage / Schema Changes
[Shape/schema changes, migration notes if any. None, if not applicable.]

## UI Specifications
- Component hierarchy
- States: loading, empty, error, success
- Key interactions and animations

## Assumptions / Hypotheses
[Anything not verified from disk that the plan depends on, to be confirmed during implementation.]

## Acceptance Criteria
- [ ] [Criterion 1]
...

## Estimated Complexity
- [Small / Medium / Large]
- [Estimated file count]
```

### 3. Complete (`*-complete.md`)
**Created by**: Dev
**Consumed by**: Review

```markdown
# Complete: [Feature Name]

## Summary
[What was built, 2-3 sentences]

## Files Changed
| Action | Path | Notes |
|--------|------|-------|
| Created | ... | ... |
| Modified | ... | ... |

## Deviations from Plan
- [Deviation 1]: [Why]
- (None, if plan was followed exactly)

## Open Questions
- [Question for Plan/Main]
- (None)

## Verification
Report each required command using the form in [`CLOSING.md`](CLOSING.md#verification-reporting-rule):

- command:
- shell used:
- result:
- if failed, exact failure surface:
- checkpoint-scoped or unrelated repo-state:
- was this the actual shell provided by the environment:

## Known Issues
- [Any issues the dev is aware of but couldn't fix]
- (None)
```

### 4. Review (`*-review.md`)
**Created by**: Review
**Consumed by**: Main or Dev

```markdown
# Review: [Feature Name]

## Plan Reviewed
- [Link or reference to plan artifact]

## Complete Reviewed
- [Link or reference to complete artifact]

## Findings

### Correctness
- ✅ / ⚠️ / ❌ [Finding]

### Completeness
- ✅ / ⚠️ / ❌ [Finding]

### Quality
- ✅ / ⚠️ / ❌ [Finding]

### Data Integrity
- ✅ / ⚠️ / ❌ [Finding]

## Issues Found
1. **[Severity: High/Med/Low]** [Description]
   - File: [path]
   - Fix: [What needs to change]

## Verification
Report each required command rerun by Review using the form in [`CLOSING.md`](CLOSING.md#verification-reporting-rule).

## Out-of-Scope Working Tree Changes
[Classify any dirty file not expected from this dispatch: path, suspected cause,
recommendation (revert / keep / split / Main decide), blocking status
(blocking / non-blocking). State "None" if the working tree is clean of surprises.]

## Final Verdict
**[PASS — Ready for Main / PASS WITH NOTES / FAIL — Return to Dev / FAIL — Return to Main]**

This section states the *current* outcome unambiguously. If an earlier FAIL section is
preserved above and a later re-review passes, the Final Verdict must clearly say so
(e.g. `PASS — Ready for Main`). PASS WITH NOTES is only for genuinely optional,
intentionally deferred suggestions; any required fix routes to Dev or Main and then
returns to Review for all-clear. Every deferred suggestion must also be recorded as an
`[open]` entry in `agents/DEFERRED.md` (see `workflows/deferred-protocol.md`), not left
only in this artifact.

## Next Steps
[Short prose only. The next-agent message belongs in the dispatch channel, not here.]
```

## Dispatch Channels

A dispatch channel is an append-only message-per-file spool for a single dispatch.

**Created by**: Main
**Next messages created by**: Main, Plan, Dev, Review
**Consumed by**: Any agent via `pickup agents/channels/###-feature-slug/`

```text
agents/channels/###-feature-slug/
  messages/
    001-main-to-plan.md
    002-plan-to-dev.md
    003-dev-to-review.md
```

Example message file (`messages/001-main-to-plan.md`):

```markdown
# Message 001 — Main → Plan — YYYY-MM-DD

## From
Main

## To
Plan

## State
ready-for-plan

## Read
- agents/artifacts/###-feature-dispatch.md

## Task
Create the implementation plan for this dispatch. Write the plan to `agents/artifacts/###-feature-plan.md`.

## Close Requirements
- Create exactly one next message file in this channel's `messages/` directory.
- Append a session entry to the repo's configured session append buffer.
- Do not commit; Main handles git.
```

See [`workflows/dispatch-channel-protocol.md`](workflows/dispatch-channel-protocol.md) for complete rules, including the allowed `## State` values.

## Naming Convention

```
agents/artifacts/###-feature-slug-{dispatch|plan|complete|review}.md
agents/channels/###-feature-slug/
```

- `###` = sequential feature number (001, 002, ...)
- `feature-slug` = short kebab-case name
- Suffix = artifact/channel type

Example:

```text
agents/artifacts/001-feature-slug-dispatch.md
agents/channels/001-feature-slug/
```

## Storage & Cleanup

- Active artifacts live in `agents/artifacts/`
- Active dispatch channels live in `agents/channels/`
- After a feature passes review, artifacts and channels can optionally be archived
- The repo's living session summary should reference both artifact numbers and the channel for traceability
