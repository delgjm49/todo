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
Implement the plan.

## Close Requirements
- Create exactly one next message file in this channel's messages directory.
- Update docs/SESSIONS.md.
- Do not commit; Main handles git.
```

Allowed `State` values:

- `ready-for-plan`
- `ready-for-dev`
- `ready-for-review`
- `needs-dev-fix`
- `needs-main-fix`
- `review-pass`
- `stalled`
- `error`

Routing is determined by `## To`. A channel is terminal for dispatch-auto when the latest message is addressed to `Main`.

## Pickup Rules

Human pickup:

```text
pickup agents/channels/###-feature-slug/
```

A human-invoked pickup is always Main. If the latest message is addressed to Plan/Dev/Review, the chain was interrupted; Main should diagnose and re-route, not do worker work.

Orchestrator pickup starts with `[dispatch-auto]` and includes the latest file and allowed next filename(s). In that case the worker must:

1. Re-read the exact latest file named in the pickup prompt from disk.
2. Ignore remembered/cached channel state from earlier turns.
3. Confirm that file's `## To` matches the expected role.
4. Perform the task.
5. Create exactly one new message file with one of the allowed filenames named in the pickup prompt.
6. Never edit existing message files.

## Agent Responsibilities

### Main

- Creates the dispatch artifact.
- Creates `agents/channels/<slug>/messages/001-main-to-plan.md`.
- Commits/pushes only after explicit user approval.

### Plan

- Reads the pickup-specified latest message file.
- Creates or revises the plan artifact.
- Creates `002-plan-to-dev.md` for normal progress.
- May create `002-plan-to-main.md` with `State = needs-main-fix`, `stalled`, or `error` if it cannot proceed safely.
- Updates `docs/SESSIONS.md`.
- Does not commit.

### Dev

- Reads the pickup-specified latest message file.
- Implements or fixes the requested work.
- Creates/updates the complete artifact.
- Creates `NNN-dev-to-review.md` for normal progress.
- May create `NNN-dev-to-main.md` with `State = needs-main-fix`, `stalled`, or `error` if it cannot proceed safely.
- Updates `docs/SESSIONS.md`.
- Does not commit.

### Review

- Reads the pickup-specified latest message file.
- Reviews the work. Review is read-only on implementation and test files.
- Creates/updates the review artifact.
- Creates one of:
  - `NNN-review-to-main.md` with `State = review-pass` for pass
  - `NNN-review-to-dev.md` with `State = needs-dev-fix` for fixable implementation failures
  - `NNN-review-to-main.md` with `State = needs-main-fix`, `stalled`, or `error` for Main/human triage
- Updates `docs/SESSIONS.md`.
- Does not commit.

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
