# Agent Workflow

## Purpose

This repository uses stateless AI CLI agents across multiple sessions.

Agents must rely on repository artifacts, not memory, to continue work safely.

The continuity system in this repo is intentionally lightweight:

- `docs/ai_sessions/HANDOFF.md`
- `docs/ai_sessions/STATUS.md`
- `docs/ai_sessions/WORKLOG.md`
- the planning artifacts under `docs/`

## Read Order At Session Start

Every new agent should read in this order before changing code:

1. `docs/ai_sessions/HANDOFF.md`
2. `docs/ai_sessions/STATUS.md`
3. `docs/TODO_APP_PLAN.md`
4. `docs/TODO_APP_TECH_SPEC.md`
5. `docs/TODO_APP_UI_SPEC.md`
6. `docs/TODO_APP_IMPLEMENTATION_BACKLOG.md`
7. `docs/TODO_APP_PLAN_REVIEW.md` if review-driven refinement is relevant to the task

If the requested task is narrow and clearly scoped by the handoff, the agent can stop reading once enough context is gathered.

## Write Targets

### `docs/ai_sessions/HANDOFF.md`

Update this at the end of any meaningful session.

It should answer:

- what state the project is in now
- what was completed this session
- what remains next
- what risks/blockers exist
- what exact files or tickets the next agent should touch first

This file should stay concise and current.

### `docs/ai_sessions/STATUS.md`

This is the stable project status snapshot.

Update it when:

- implementation milestones change
- build/CI status changes
- review status changes
- the recommended next checkpoint changes

This file should be a durable operational summary, not a diary.

### `docs/ai_sessions/WORKLOG.md`

Append to this file.

Use it for:

- dated session entries
- notable decisions
- checkpoint completions
- review outcomes
- CI/build incidents and resolutions

Do not rewrite prior entries except to fix obvious mistakes.

## Session Rules

1. Start by reading the handoff and status docs.
2. Confirm the requested scope against the backlog and current checkpoint.
3. Keep changes tightly scoped.
4. If the session changes project state materially, update:
   - `HANDOFF.md`
   - `STATUS.md`
   - `WORKLOG.md`
5. Before ending, leave the repo in a state that the next agent can understand without external context.
6. Paths used in responses to user should be relative, not literal (example docs/TOD_APP_PLAN.md)

## Planning Artifacts

The following docs are the source of truth for direction and execution:

- `docs/TODO_APP_PLAN.md`
- `docs/TODO_APP_TECH_SPEC.md`
- `docs/TODO_APP_UI_SPEC.md`
- `docs/TODO_APP_IMPLEMENTATION_BACKLOG.md`

Agents should not casually replace those documents.
If implementation reveals a contradiction, update the relevant planning artifact deliberately and note it in `WORKLOG.md`.

## Checkpoint Practice

Implementation is being driven through constrained checkpoints using a cheaper build agent plus reviewer verification.

Agents should:

- keep work inside the named checkpoint
- stop at the checkpoint boundary
- report completed tickets, changed files, checks run, gaps, and deviations

## Current Working Style

- Windows-first local desktop app
- Tauri + React + TypeScript
- JSON storage
- GitHub Actions is the current native Windows build verification path
- local Rust/MSVC is not available on the user's work PC, so do not rely on local Tauri execution
