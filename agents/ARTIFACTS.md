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
- docs/TODO_APP_TECH_SPEC.md §X (relevant section)
- docs/TODO_APP_UI_SPEC.md §X (relevant section)
- docs/TODO_APP_IMPLEMENTATION_BACKLOG.md TICKET-### (relevant ticket)

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

## Prerequisites
- [Any dependency that must be done first]

## Files to Create/Modify
| Action | Path | Description |
|--------|------|-------------|
| Create | src/components/X.tsx | ... |
| Modify | src/store/X.ts | ... |

## Implementation Steps
### Step 1: [Title]
- [Specific instruction]
- [File: path/to/file]
- **Verify**: [How to confirm this step worked]

### Step 2: [Title]
...

## Data / Storage Changes
[JSON schema or shape changes, migration notes if any]

## UI Specifications
- Component hierarchy
- States: loading, empty, error, success
- Key interactions and animations

## Acceptance Criteria
- [ ] [Criterion 1]
...

## Estimated Complexity
- [Small / Medium / Large]
- [Estimated file count]
```

### 3. Complete (`*-complete.md`)
**Created by**: Dev
**Consumed by**: Review (or Plan)

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
**Consumed by**: Main, Plan, or Dev

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

## Verdict
**[PASS / PASS WITH NOTES / FAIL — Return to Dev / FAIL — Return to Plan / FAIL — Return to Main]**

Note: PASS WITH NOTES is only for genuinely optional, intentionally deferred suggestions. Actionable low-severity items should be required fixes when they are reasonable within the current dispatch. Any required fix must route to Dev, Plan, or Main and then return to Review for all-clear.

## Next Steps
[Short prose only. The next-agent message belongs in the dispatch channel, not here.]
```

## Dispatch Channels

A dispatch channel is an append-only message log for a single dispatch.

**Created by**: Main
**Appended by**: Main, Plan, Dev, Review
**Consumed by**: Any agent via `pickup agents/channels/###-feature-channel.md`

```markdown
# Dispatch Channel: [Feature Name]

## Summary
- Dispatch: agents/artifacts/###-feature-dispatch.md
- Current status: ready-for-plan / ready-for-dev / ready-for-review / ready-for-re-review / needs-dev-fix / needs-plan-revision / needs-main-fix / review-pass / closed
- Created by: Main
- Created: YYYY-MM-DD

## Message 1 — Main → Plan — YYYY-MM-DD

### To
Plan

### State
ready-for-plan

### Read
- agents/artifacts/###-feature-dispatch.md

### Task
Create the implementation plan for this dispatch. Write the plan to `agents/artifacts/###-feature-plan.md`.

### Close Requirements
- Append the next message to this channel for Dev.
- Update `docs/SESSIONS.md`.
- Do not commit; Main handles git.
```

See [`workflows/dispatch-channel-protocol.md`](workflows/dispatch-channel-protocol.md) for complete rules.

## Naming Convention

```
agents/artifacts/###-feature-slug-{dispatch|plan|complete|review}.md
agents/channels/###-feature-slug-channel.md
```

- `###` = sequential feature number (001, 002, ...)
- `feature-slug` = short kebab-case name
- Suffix = artifact/channel type

Example:

```text
agents/artifacts/001-block-editor-polish-dispatch.md
agents/channels/001-block-editor-polish-channel.md
```

## Storage & Cleanup

- Active artifacts live in `agents/artifacts/`
- Active dispatch channels live in `agents/channels/`
- After a feature passes review, artifacts and channels can optionally be archived
- The `docs/SESSIONS.md` log should reference both artifact numbers and the channel for traceability
