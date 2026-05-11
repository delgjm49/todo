# AI Session Workflow

## Purpose

This folder holds the lightweight continuity artifacts for stateless AI sessions on this project.

## Files

### `HANDOFF.md`

Current baton-pass document for the next agent.

Read this first.

### `STATUS.md`

Stable summary of:

- implementation progress
- CI/build status
- current checkpoint
- known constraints

### `WORKLOG.md`

Append-only session log of meaningful decisions and progress.

## Usage

At the start of a session:

1. Read `HANDOFF.md`
2. Read `STATUS.md`
3. Read the relevant planning docs under `docs/`

At the end of a session:

1. Update `HANDOFF.md`
2. Update `STATUS.md` if project state changed
3. Append a short entry to `WORKLOG.md`

## Environment Assumption

This repo is Windows-first.

For local verification:

- PowerShell is the expected shell
- lack of bash is not a valid reason to skip required local commands
- if a command fails because of a known sandbox restriction, document the exact failure and use the approved escalation path where applicable

## Agent Roles

### Main Agent

Responsibilities:

- entry point for work on the repo
- orient to the project and current checkpoint
- work directly with the user on scope, ideas, bugs, and tradeoffs
- create dispatch artifacts
- send easy copy/paste prompts directly to the user
- make workflow/process changes
- handle commits and pushes
- update session documents at a high level and as needed

### Dev Agent

Responsibilities:

- implement one dispatched checkpoint
- stay inside the checkpoint boundary
- report exact files changed, tests run, and known gaps
- return a user-facing prompt for the review agent

The dev agent does not decide final acceptance.

### Dev Handoff Quality

When Dev closes a checkpoint, the handoff should:

1. report exact commands actually run
2. report the real shell/environment used
3. include pass/fail status for each required command
4. include exact failure reason when a command was not run or did not pass
5. distinguish:
   - checkpoint-scoped failures
   - unrelated repo-state failures outside the checkpoint
6. produce the Review prompt in a way that references:
   - the immutable dispatch artifact
   - the mutable dispatch channel artifact
   - any Main validation override already present
7. use the actual shell provided by the environment when running required verification:
   - in this repo that normally means PowerShell
   - lack of bash is not a valid skip reason if PowerShell is available

Bad close example:

- "bash unavailable; commands not run"

Acceptable close example:

- "`npm run test` failed in PowerShell with these specific assertions ..."
- "`npm run build` hit known sandbox `spawn EPERM`; rerun with escalation is required"
- "`npm run lint` failed in unrelated untracked file `.pi/...`; not introduced by this checkpoint"

### Review Agent

Responsibilities:

- review the dev agent's work against the dispatch, backlog, and specs
- identify blockers, regressions, scope drift, missing tests, and low-effort cleanup that should still be done before acceptance
- decide whether the checkpoint passes back to the main agent or must return to the dev agent
- return a user-facing prompt for the next hop
- remain read-only on implementation and test files under the normal workflow; Review may update the dispatch channel artifact but should not fix code directly

The review agent is the quality gate before work returns to the main agent.

### Review Verification Discipline

Review should follow these rules unless the dispatch explicitly says otherwise:

1. Run the required local verification commands for the checkpoint.
2. Do not replace command execution with static review when the dispatch requires runnable verification.
3. If `npm run build` or another required command fails because of the known sandbox `spawn EPERM` restriction, rerun it with the approved escalated path before deciding pass/fail.
4. Treat React/jsdom controlled-input tests as high-risk in this repo:
   - do not trust static inspection alone for new input/editing tests
   - if tests exercise focus, blur, input, or change behavior, those tests must actually pass locally before Review can pass the checkpoint
5. Distinguish store-level correctness from UI-test correctness:
   - a passing store test does not prove the UI interaction path is valid
6. Treat jsdom/react input-focus errors as red flags, especially messages involving:
   - `attachEvent`
   - `detachEvent`
   - repeated `act(...)` warnings tied to the new behavior under review
7. If code changes are needed to make the checkpoint pass, route back to Dev instead of fixing code in Review.
8. If a command fails in unrelated pre-existing or out-of-scope repo state, say so explicitly instead of collapsing it into the checkpoint status.
9. use the actual shell provided by the environment when running required verification:
   - in this repo that normally means PowerShell
   - lack of bash is not a valid skip reason if PowerShell is available

## Routing

Default routing:

1. Main -> Dev
2. Dev -> Review
3. Review -> Dev or Main

Rules:

- work should not return directly from Dev to Main for acceptance
- Review returns to Main only when no blockers remain
- a passing review should leave no blocker, no "should-do before merge", and no trivial low-effort cleanup item that should still be completed inside the same checkpoint
- if Review sends work back to Dev, the return must be concrete and checkpoint-scoped
- Review should not fix implementation files inline and then self-pass the checkpoint; if code changes are needed, route back to Dev

## Dispatch Workflow

When preparing builder or reviewer dispatches:

1. Store the durable checkpoint scope, guardrails, and references in a repo artifact file under `docs/ai_sessions/` when that context should persist.
2. Do not embed the copy/paste prompt inside that artifact file.
3. Send the actual prompt directly to the user in chat so it can be forwarded without editing.
4. If the prompt depends on an artifact file, explicitly reference that file in the prompt.

## Artifact Model

Use two artifact types for dispatched checkpoint work:

### 1. Dispatch Artifact

Purpose:

- immutable checkpoint scope
- required reads
- guardrails
- suggested files
- required tests
- handoff format

Typical naming:

- `BUILDER_DISPATCH_CHECKPOINT_<N>_...md`
- `REVIEW_DISPATCH_CHECKPOINT_<N>_...md` if a separate review artifact is needed

### 2. Dispatch Channel Artifact

Purpose:

- mutable chain-of-custody document for one checkpoint
- current routing state
- linked artifacts
- dev implementation summary
- review findings / outcome
- next hop

Typical naming:

- `DISPATCH_CHANNEL_CHECKPOINT_<N>_...md`

The dispatch artifact defines scope.
The channel artifact records the live handoff state as the work moves between agents.

## Prompt Rule

Keep prompts user-facing and copy/paste ready in chat.

Do not place the full prompt body inside repo artifacts.

When a prompt depends on artifacts, the prompt should reference:

- the dispatch artifact
- the dispatch channel artifact if one exists

## Pass Criteria

A review pass should mean:

- no blockers remain
- no scope-critical regression remains
- no obvious missing test required by the dispatch remains
- no trivial or low-effort cleanup remains that should still be done before returning to Main

If any of those remain, Review should route back to Dev with a concrete next prompt.

## Review-Specific Guidance

`AGENTS.md` should contain only the short durable reminder that Review must run required verification and stay read-only on code.

The detailed review gate and test-risk guidance should live here in `docs/ai_sessions/README.md` and in dispatch/channel artifacts, because:

- every agent reads `AGENTS.md`, including Dev
- only Review needs the full verification discipline
- keeping the detailed checklist here avoids bloating the repo-wide primer

## Verification Reporting Rule

Both Dev and Review should report command outcomes in this form:

- command:
- shell used:
- result:
- if failed, exact failure surface:
- checkpoint-scoped or unrelated repo-state:
- was this the actual shell provided by the environment:

## Scope

These files are not meant to replace the main planning artifacts.
They exist to make session-to-session continuation predictable and low-friction.
