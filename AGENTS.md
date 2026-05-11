# Agent Workflow

## Purpose

This repository uses stateless AI CLI agents across multiple sessions.

Agents must rely on repository artifacts, not memory, to continue work safely.

The continuity system in this repo is intentionally lightweight:

- `docs/ai_sessions/HANDOFF.md`
- `docs/ai_sessions/STATUS.md`
- `docs/ai_sessions/WORKLOG.md`
- the planning artifacts under `docs/`

## Agent Roles

This repo now uses a three-role workflow:

1. Main agent
2. Dev agent
3. Review agent

### Main agent

Responsibilities:

- primary user-facing entry point
- orients to project state and current checkpoint
- brainstorms, troubleshoots, and helps define scope
- creates dispatch artifacts
- sends copy/paste prompts directly to the user
- makes workflow/process changes
- handles commits and pushes
- updates session docs at a high level and as needed

### Dev agent

Responsibilities:

- implements one dispatched checkpoint
- stays inside the checkpoint boundary
- updates the dispatch channel for the checkpoint
- when done, hands off to Review with a user-facing prompt
- must use the actual local shell available in the environment for required verification; in this repo that normally means PowerShell, so lack of bash is not a valid reason to skip commands

### Review agent

Responsibilities:

- reviews Dev work against the dispatch, backlog, and specs
- decides whether the checkpoint returns to Dev or passes back to Main
- when passing, there should be no blockers, no scope-critical regressions, no required test gaps, and no trivial low-effort cleanup that should still be done inside the same checkpoint
- does not edit implementation or test files under the normal workflow
- may update the dispatch channel artifact with findings and routing
- must run the required verification commands for the checkpoint unless a real environment blocker prevents it
- should treat React/jsdom controlled-input tests as high-risk and should not trust static review alone for those paths
- must use the actual local shell available in the environment for required verification; in this repo that normally means PowerShell, so lack of bash is not a valid reason to skip commands

## Routing

Default routing is:

1. Main -> Dev
2. Dev -> Review
3. Review -> Dev or Main

Dev should not return directly to Main for checkpoint acceptance.
Review should not silently fix code and then self-pass the checkpoint.
If Review finds a defect that requires code changes, route back to Dev with a concrete fix prompt.
If a required command fails because of a known sandbox restriction such as `spawn EPERM`, Review should rerun it with the approved escalation path before deciding pass/fail.

## Dispatch Artifacts

Dispatched checkpoint work should normally use two artifacts under `docs/ai_sessions/`:

1. Dispatch artifact
2. Dispatch channel artifact

### Dispatch artifact

Purpose:

- immutable checkpoint scope
- guardrails
- required reads
- suggested files
- required tests

### Dispatch channel artifact

Purpose:

- mutable handoff record for one checkpoint
- current owner and routing state
- implementation summary
- review findings/outcome
- next hop

Agents should update the channel artifact as work moves:

- Main initializes it
- Dev updates the `Dev -> Review` section
- Review updates the `Review -> Dev or Main` section

Prompts should stay in chat for user copy/paste, not inside repo artifacts.

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
- respect the Main -> Dev -> Review routing model
- treat the dispatch artifact as immutable scope
- treat the dispatch channel artifact as the live chain-of-custody record

## Current Working Style

- Windows-first local desktop app
- Tauri + React + TypeScript
- JSON storage
- GitHub Actions is the current native Windows build verification path
- local Rust/MSVC is not available on the user's work PC, so do not rely on local Tauri execution
- PowerShell is the expected local shell for verification in this repo; lack of bash is not a valid reason to skip required local commands
