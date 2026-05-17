# Dispatch 028 — Claude All-Roles Smoke

Date: 2026-05-17
Type: artifact-only Phase 3 / Phase 4 live interactive smoke with all three worker roles on Claude Code

## Objective

Close the remaining Phase 4 Claude gap by exercising Plan and Review as Claude interactive workers end-to-end. Dispatch 027's resume already validated Dev on Claude (see `docs/design/dispatch-auto-phase3-test-results.md` "Todo Dispatch 027 Claude resume MVP — PASS" in the meta-workflow repo). Plan and Review are structurally identical to Dev from the dispatch-auto handshake's perspective, but have never been live-soaked on Claude.

This is a happy-path artifact-only smoke. No forced loop — 027 already covered the loop case on Claude Dev, and 016/017/018-zen + the deterministic harness cover the loop case structurally. The unique value of this dispatch is exercising the per-role Claude pane launch + handshake on Plan and Review.

## Worker assignment

All three roles use the same configuration:

- `binary`: `claude`
- `configDir`: `~/.claude-acct2`
- `model`: `claude-haiku-4-5-20251001`

Set in `agents/orchestration.local.json` (gitignored). Cheapest validation of the wiring per the Phase 4 MVP rationale.

## Required route

```text
Main → Plan → Dev → Review → Main
```

Expected channel message files:

```text
agents/channels/028-claude-all-roles-smoke/messages/001-main-to-plan.md
agents/channels/028-claude-all-roles-smoke/messages/002-plan-to-dev.md
agents/channels/028-claude-all-roles-smoke/messages/003-dev-to-review.md
agents/channels/028-claude-all-roles-smoke/messages/004-review-to-main.md
```

Final `State` in `004-review-to-main.md` must be `review-pass`.

## Artifact-only work

No product implementation files may change. Workers may only create or update:

- Files under `agents/artifacts/028-claude-all-roles-smoke-*.md`
- Channel message files in this dispatch's `messages/` directory
- `docs/SESSIONS.md` (append-only per role/turn)

No edits to application source, Tauri config, tests, UI, storage layer, or product documentation. Workers must not commit.

## Success criteria

- All three worker turns launch as Claude Code interactive panes via `~/.claude-acct2` + Haiku 4.5; no Pi binary is invoked.
- Each role produces exactly one valid next-message file matching its allowed filename.
- Final route reaches Main with `State = review-pass`.
- Per-channel session capture for all three roles writes valid `ready-events.ndjson` + `turn-events.ndjson` (the role field must be present on every ready event — fixed in commit `8db10c5`).
- No product code is changed.

## Out of scope

- Per-configDir installer hardening (only `~/.claude-acct2` is in play here).
- Default-mode `workerMode: interactive` promotion.
- Forced loop variants (covered elsewhere).
