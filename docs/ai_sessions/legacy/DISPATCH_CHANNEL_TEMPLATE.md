# Dispatch Channel Template

## Purpose

This file is the mutable handoff channel for one dispatched checkpoint.

Use it to carry the checkpoint between:

- Main
- Dev
- Review

Do not place the full copy/paste prompt in this file.
Prompts should be sent directly to the user in chat and should reference this file when relevant.

## Naming

Recommended pattern:

- `docs/ai_sessions/DISPATCH_CHANNEL_CHECKPOINT_<N>_<SHORT_NAME>.md`

## Channel Metadata

- Checkpoint:
- Epic / tickets:
- Current status:
- Current owner:
- Next route:
- Created by:
- Created date:

## Linked Artifacts

- Dispatch artifact:
- Relevant planning docs:
- Relevant continuity docs:

## Immutable Scope Summary

Record the stable scope in 5 to 10 bullets.

- in scope:
- out of scope:
- non-negotiable guardrails:

This section should summarize the dispatch artifact, not replace it.

## Current Acceptance Bar

Review should only pass this checkpoint back to Main when:

- no blockers remain
- no scope-critical regression remains
- no required dispatch test gap remains
- no trivial low-effort cleanup remains that should still be done inside the checkpoint

## Main -> Dev

### Main Dispatch Summary

- checkpoint objective:
- intended ticket boundary:
- required verification commands:
- artifact references the user prompt must mention:

### Main Notes

- assumptions:
- risks to watch:
- files likely to change:

## Dev -> Review

### Implementation Summary

- completed tickets:
- exact files changed:
- store/api changes:
- tests added or updated:
- commands run and results:
- known gaps:
- intentionally deferred items:

### Dev Self-Check

- stayed inside dispatch scope:
- required commands run:
- shell/environment used for command execution:
- was that the actual shell provided by the environment:
- for each command, exact result:
- if any command was skipped, exact blocker:
- if any command failed, checkpoint-scoped or unrelated repo-state:
- any unresolved warnings or oddities:

## Review -> Dev or Main

### Review Outcome

- status: `pass` or `return_to_dev`
- reviewer summary:

### Findings

List only actionable review findings. Order by severity.

- finding:
- finding:

### Verification Notes

- code paths reviewed:
- commands rerun by reviewer, if any:
- shell/environment used for command execution:
- was that the actual shell provided by the environment:
- remaining risks:
- did reviewer run every required verification command:
- if not, what real blocker prevented it:
- for each required command, exact result:
- if any command failed, checkpoint-scoped or unrelated repo-state:
- were any React/jsdom controlled-input tests added or touched:
- if yes, did those tests pass locally:
- were any `attachEvent` / `detachEvent` / repeated `act(...)` warnings observed:

### Routing Decision

- next route:
- why:

### Review Boundaries

- review edited code: `yes` or `no`
- if yes, why the normal read-only review boundary was broken:

## Return To Main

Fill this only when Review passes the checkpoint.

- accepted tickets:
- accepted residual risks:
- recommended next checkpoint:
- session docs Main should update:

## Change Log

- date:
  - owner:
  - update:
