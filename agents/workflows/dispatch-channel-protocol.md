# Dispatch Channel Protocol

Dispatch channels are message-per-file spools for passing work between Main, Plan, Dev, and Review without long copy/paste prompts in chat.

## Location and Naming

New dispatch channels live in a directory under `agents/channels/`:

```text
agents/channels/###-feature-slug/
  messages/
    001-main-to-plan.md
    002-plan-to-dev.md
    003-dev-to-review.md
  .sessions/        # dispatch-auto runtime state; gitignored
```

Before using spool channels, ensure `.gitignore` contains:

```gitignore
agents/channels/*/.sessions/
```

Legacy single-file channels (`agents/channels/*-channel.md`) are historical/smoke-readable only. New dispatches must use spool directories.

## Universal Pickup Boot Order

Every role must start each pickup by reading fresh on-disk state in this order:

1. Repo guide (`AGENTS.md`, `CLAUDE.md`, or repo equivalent).
2. This dispatch protocol.
3. The applicable role prompt / repo role guidance, if present.
4. The exact latest channel message file named by the pickup prompt.
5. Referenced artifacts from that message.
6. Relevant current source/test files needed to ground the task.

Ignore cached or remembered channel state from earlier turns. Current files and the latest channel message are authoritative over memory.

## Message File Rules

Message files are immutable. Agents must never edit, delete, rename, or replace an existing `messages/*.md` file.

Each handoff creates exactly one new file using the next sequential number:

```text
NNN-from-to.md
```

Valid route tokens are exactly:

- `main`
- `plan`
- `dev`
- `review`

Examples:

```text
001-main-to-plan.md
002-plan-to-dev.md
003-dev-to-review.md
004-review-to-dev.md
005-dev-to-review.md
006-review-to-main.md
```

Do not create placeholder future messages, README/notes files, or trailing checklist files in `messages/`. Anything in `messages/` that is not a valid numbered message file is a channel-structure error.

## Message Format

```markdown
# Message 002 — Plan → Dev — YYYY-MM-DD

## From
Plan

## To
Dev

## State
ready-for-dev

## Read
- agents/artifacts/###-feature-dispatch.md
- agents/artifacts/###-feature-plan.md

## Task
Implement the plan artifact. If this message conflicts with the referenced artifact, treat the artifact as authoritative and route to Main if ambiguity affects scope.

## Close Requirements
- Create exactly one next message file in this channel's messages directory.
- Append a concise entry to the repo's configured session append buffer.
- Do not commit; Main handles git.
```

Channel messages should be concise handoffs, not substitute plans. Avoid speculative implementation recaps or brittle root-cause summaries. Put detailed analysis in artifacts; referenced artifacts are authoritative over short channel summaries.

Allowed `State` values:

- `ready-for-plan`
- `ready-for-dev`
- `ready-for-review`
- `needs-dev-fix`
- `needs-main-fix`
- `review-pass`
- `stalled`
- `error`
- `closed` *(Main close message only)*

Use exactly these tokens in new messages. In particular, every Dev → Review handoff uses `ready-for-review`, including a second/subsequent handoff after Review requested fixes. Do **not** use legacy variants such as `ready-for-re-review`.

There is no `Review → Plan` route and no `needs-plan-revision` state. Design/plan-level review failures use `needs-main-fix` (Review → Main); Main owns re-engaging Plan if the plan itself needs revision. `needs-plan-revision` is a retired token — the dispatch-auto parser rejects it as invalid.

**Close message format.** After `review-pass`, Main closes the dispatch with a final message using `To: Main` and `State: closed`:

```markdown
# Message NNN — Main → Main — YYYY-MM-DD

## From
Main

## To
Main

## State
closed
```

Legacy `To: (none — channel closing)` is tolerated for existing channels but deprecated; new close messages must use `To: Main`.

Routing is determined by `## To`. A channel is terminal for dispatch-auto when the latest message is addressed to `Main`.

## Pickup Rules

Human pickup:

```text
pickup agents/channels/###-feature-slug/
```

A human-invoked pickup is always Main. If the latest message is addressed to Plan/Dev/Review, the chain was interrupted; Main should diagnose and re-route, not do worker work.

Orchestrator pickup starts with `[dispatch-auto]` and includes the latest file and allowed next filename(s). In that case the worker must:

1. Follow the Universal Pickup Boot Order above.
2. Re-read the exact latest file named in the pickup prompt from disk.
3. Ignore remembered/cached channel state from earlier turns.
4. Confirm that file's `## To` matches the expected role.
5. Perform the task.
6. Create exactly one new message file with one of the allowed filenames named in the pickup prompt.
7. Use only the allowed `## State` tokens above (`ready-for-review` for any Dev → Review handoff, including re-review).
8. Never edit existing message files.

## Agent Responsibilities

### Main

- Creates the dispatch artifact.
- Creates `agents/channels/<slug>/messages/001-main-to-plan.md`.
- Keeps handoff messages concise: include scope, out-of-scope boundaries, key artifacts, likely files to inspect, and required verification, but avoid speculative root-cause claims unless evidence-backed.
- Before commit/close, confirms every dirty file is either reviewed in-scope or explicitly accepted, reverted, or split out.
- Commits/pushes only after explicit user approval.

### Plan

- Follows the Universal Pickup Boot Order.
- Reads the pickup-specified latest message file.
- Completes reconnaissance before writing or finalizing the plan artifact: inspect the active channel message, dispatch artifact, relevant current files, and existing tests/patterns needed to ground the plan.
- Creates or revises the plan artifact.
- Includes a `## Verified Current-State Facts` section in the plan artifact, citing concrete files/tests and facts verified from disk.
- Does not state a root cause unless backed by current code/test evidence; label unverified explanations as hypotheses.
- If a prior assumption is disproven, revises the plan before handoff. Do not hand off an artifact containing superseded assumptions; if immutable channel history conflicts with the corrected plan and ambiguity affects scope, route to Main.
- Creates `002-plan-to-dev.md` for normal progress.
- May create `002-plan-to-main.md` with `State = needs-main-fix`, `stalled`, or `error` if it cannot proceed safely.
- Appends a concise entry to the repo's configured session append buffer.
- Does not commit.

### Dev

- Follows the Universal Pickup Boot Order.
- Reads the pickup-specified latest message file.
- Treats the referenced plan artifact as authoritative over any short channel recap. If the channel message and artifact conflict in a scope-affecting way, stop and route to Main.
- Implements or fixes the requested work.
- Creates/updates the complete artifact.
- Creates `NNN-dev-to-review.md` for normal progress, using `State = ready-for-review` even when returning after a Review-requested fix.
- May create `NNN-dev-to-main.md` with `State = needs-main-fix`, `stalled`, or `error` if it cannot proceed safely.
- Appends a concise entry to the repo's configured session append buffer.
- Does not commit.

### Review

- Follows the Universal Pickup Boot Order.
- Reads the pickup-specified latest message file.
- Reviews the work against the latest relevant plan and any later Review fix messages, not only the original summary.
- Review is read-only on implementation and test files.
- Creates/updates the review artifact.
- The review artifact must include an unambiguous `## Final Verdict` section near the end. If the artifact preserves an earlier FAIL section and later re-review passes, the final verdict must clearly state the current outcome, e.g. `PASS — Ready for Main`.
- Classifies unexpected dirty files in a `## Out-of-Scope Working Tree Changes` section with path, suspected cause, recommendation (`revert`, `keep`, `split`, or `Main decide`), and blocking status (`blocking` or `non-blocking`).
- Creates one of:
  - `NNN-review-to-main.md` with `State = review-pass` for pass
  - `NNN-review-to-dev.md` with `State = needs-dev-fix` for fixable implementation failures
  - `NNN-review-to-main.md` with `State = needs-main-fix`, `stalled`, or `error` for Main/human triage
- Appends a concise entry to the repo's configured session append buffer.
- Does not commit.

## Session Append Rule

Agents must append required session notes to the repo's configured session append buffer (for example, a `SESSIONS_PENDING` file if the repo uses one). Do not assume a universal path such as `docs/SESSIONS.md`; follow the repo guide.

If an exact edit/append operation fails, read the current file and write back the original content plus the new entry. Never silently skip required session logging.

## Chat Output Rule

Agents should not output long next-session prompts in chat. Keep final output short:

```text
Work complete. Next message is ready in agents/channels/###-feature-slug/messages/NNN-from-to.md.
Do not commit — Main handles git operations.
```

## Required Re-Review Rule

If Review identifies any required fix, the fixer must create a new message back to Review, and Review must confirm a pass before Main closes the dispatch.

Typical route:

```text
Main → Plan → Dev → Review → Dev → Review → Main
```

## Recovery

If an agent creates the wrong file, forgets to create a file, or modifies an existing message file, stop the chain and ask Main/user for repair. Gaps in numbering require manual repair; there is no automatic recovery mode in Phase 3 v1.

If a historical message used the legacy `ready-for-re-review` state, preserve append-only history: do not edit that file. Main may append a valid repair message to the intended next role using `State = ready-for-review`. Current dispatch-auto builds tolerate that legacy token only so existing append-only channels remain parseable; new messages must not use it.
