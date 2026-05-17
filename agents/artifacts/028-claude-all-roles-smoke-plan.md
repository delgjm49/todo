# Plan: Claude All-Roles Smoke — Phase 4 Interactive Worker Validation

## Overview

Validate Claude Code as an interactive worker for all three roles (Plan, Dev, Review) end-to-end on Dispatch 028. This is an artifact-only smoke with no product code changes. Dev creates a completion summary artifact, and Review validates it before routing back to Main with a pass verdict.

## Prerequisites

- Main has created `agents/artifacts/028-claude-all-roles-smoke-dispatch.md`
- Dispatch channel `agents/channels/028-claude-all-roles-smoke/` exists with message `001-main-to-plan.md`

## Files to Create/Modify

| Action | Path | Description |
|--------|------|-------------|
| Create | agents/artifacts/028-claude-all-roles-smoke-complete.md | Dev completion summary |
| Create | agents/artifacts/028-claude-all-roles-smoke-review.md | Review findings and verdict |
| Create | agents/channels/028-claude-all-roles-smoke/messages/002-plan-to-dev.md | Route from Plan to Dev |
| Create | agents/channels/028-claude-all-roles-smoke/messages/003-dev-to-review.md | Route from Dev to Review |
| Create | agents/channels/028-claude-all-roles-smoke/messages/004-review-to-main.md | Route from Review to Main |
| Modify | docs/SESSIONS.md | Append Plan, Dev, and Review session entries |

## Implementation Steps

### Step 1: Dev Task
- Create `agents/artifacts/028-claude-all-roles-smoke-complete.md` summarizing the artifact-only smoke completion
- Confirm Claude Code launches as interactive worker for Dev role with Haiku 4.5 in `~/.claude-acct2`
- Create `003-dev-to-review.md` routing to Review with `State = ready-for-review`
- Append a Dev session entry to `docs/SESSIONS.md`
- **Verify**: Message file exists and is routed to Review with correct State value

### Step 2: Review Task
- Review the completion artifact and plan
- Create `agents/artifacts/028-claude-all-roles-smoke-review.md` documenting findings
- Confirm:
  - All three roles (Plan, Dev, Review) launched via Claude Code interactively
  - Message files are correctly sequenced and routed (001 → 002 → 003 → 004)
  - No product code changes were made
  - All role field values are present in event captures (if applicable)
- Create `004-review-to-main.md` with `State = review-pass` routing to Main
- Append a Review session entry to `docs/SESSIONS.md`
- **Verify**: Review artifact exists, message file routes to Main with `review-pass` state

## Acceptance Criteria

- [ ] Dev creates exactly one completion artifact with valid markdown structure
- [ ] Dev routes to Review via `003-dev-to-review.md` with `State = ready-for-review`
- [ ] Review creates exactly one review artifact with findings and verdict
- [ ] Review routes to Main via `004-review-to-main.md` with `State = review-pass`
- [ ] Final route reaches Main with `State = review-pass`
- [ ] No product code, tests, UI, or Tauri configuration are modified
- [ ] All worker turns are captured as Claude Code interactive panes (role field present in events)
- [ ] Channel messages are sequentially numbered and follow valid routing (001 → 002 → 003 → 004)

## Estimated Complexity

- Small
- Artifact-only: 3 files to create (complete, review, and this plan artifact); 3 message files to create
- No product implementation required
