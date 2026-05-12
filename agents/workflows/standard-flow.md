# Standard Development Flow

A step-by-step walkthrough of how a feature moves through the agent pipeline using dispatch channels.

---

## Step 1: Main Orchestration

**User starts session with**: `main`

**What happens**:
1. Main reads `AGENTS.md`, checks `docs/SESSIONS.md`, and helps choose the next task.
2. Main writes a dispatch artifact to `agents/artifacts/###-feature-dispatch.md`.
3. Main creates a dispatch channel at `agents/channels/###-feature-channel.md`.
4. Main appends `Message 1 — Main → Plan` with the dispatch path and planning task.
5. Main outputs a short pickup instruction.

**User action**: Start a new session with:

```text
pickup agents/channels/###-feature-channel.md
```

---

## Step 2: Planning

**User starts session with**: `pickup agents/channels/###-feature-channel.md`

**What happens**:
1. Agent reads the channel and sees the latest message is addressed to Plan.
2. Plan reads the dispatch artifact listed in the channel.
3. Plan reads relevant TODO_APP_TECH_SPEC.md, TODO_APP_UI_SPEC.md, IMPLEMENTATION_BACKLOG.md, and existing code.
4. Plan creates `###-feature-plan.md`.
5. Plan appends `Message 2 — Plan → Dev` to the same channel.
6. Plan updates `docs/SESSIONS.md` and outputs the short pickup instruction.

**If the dispatch is unclear**: Plan appends a message back to Main with the question.

**User action**: Start a new session with the same pickup command.

---

## Step 3: Development

**User starts session with**: `pickup agents/channels/###-feature-channel.md`

**What happens**:
1. Agent reads the channel and sees the latest message is addressed to Dev.
2. Dev reads the plan artifact listed in the channel.
3. Dev implements each step in order.
4. Dev verifies the work, reporting each required command using the verification reporting rule in `agents/CLOSING.md`.
5. Dev writes `###-feature-complete.md`.
6. Dev appends `Message 3 — Dev → Review` to the same channel.
7. Dev updates `docs/SESSIONS.md` and outputs the short pickup instruction.

**If the plan has issues**: Dev notes deviations in the complete artifact and may append a channel message back to Plan or Main for clarification.

**User action**: Start a new session with the same pickup command.

---

## Step 4: Review

**User starts session with**: `pickup agents/channels/###-feature-channel.md`

**What happens**:
1. Agent reads the channel and sees the latest message is addressed to Review.
2. Review reads the plan and complete artifacts listed in the channel.
3. Review inspects the actual code changes.
4. Review reruns required verification commands and reports each using the verification reporting rule.
5. Review writes `###-feature-review.md` with findings and verdict.
6. Review appends the next channel message.
7. Review updates `docs/SESSIONS.md` and outputs the short pickup instruction.

**Possible outcomes**:

### PASS → Main Close
- Review appends `Review → Main` with `State = review-pass`.
- Main can mark the feature done, commit, and push.

### PASS WITH NOTES → Main Close
- Review appends `Review → Main` with `State = review-pass`.
- Notes must be genuinely optional, intentionally deferred future improvements only.
- Review should require fixes for actionable low-severity items when they are reasonable within the current dispatch.
- If any file must change before completion, this is not PASS WITH NOTES.
- If any source/test/artifact/user-facing docs change after review-pass and before Main closes, Main routes back to Review for re-review.

### FAIL — Return to Dev → Fix Needed
- Review appends `Review → Dev` with `State = needs-dev-fix`.
- Dev fixes the listed issues, updates the complete artifact, appends `Dev → Review`, and re-review follows.
- The work is not done until Review later appends `State = review-pass`.

### FAIL — Return to Plan → Design Issue
- Review appends `Review → Plan` with `State = needs-plan-revision`.
- Plan revises the plan, appends `Plan → Dev`, Dev implements, appends `Dev → Review`, and re-review follows.
- The work is not done until Review later appends `State = review-pass`.

### FAIL — Return to Main → Main-Owned Fix Needed
- Review appends `Review → Main` with `State = needs-main-fix`.
- Main applies the fixes, appends `Main → Review` with `State = ready-for-re-review`, and re-review follows.
- Main must not close the dispatch until Review later appends `State = review-pass`.

**User action**: Continue with the same pickup command. The latest channel message determines which role runs next.

---

## Manual Fallback

If pickup mode is unavailable or the channel is damaged, the user can still start with explicit roles:

```text
plan

Read dispatch: agents/artifacts/###-feature-dispatch.md
```

```text
dev

Read plan: agents/artifacts/###-feature-plan.md
```

```text
review

Read plan: agents/artifacts/###-feature-plan.md
Read complete: agents/artifacts/###-feature-complete.md
```

Main should repair or recreate the dispatch channel afterward so future handoffs are auditable.

---

## Variations

### Fast Track: Main → Dev
For very small, well-understood tasks, Main can append `Main → Dev` as the first channel message. The dispatch must be detailed enough to act as the implementation instruction.

### Double Review
For critical features, the channel can include two review messages or route to different review scopes:
1. Plan Review before Dev starts
2. Code Review after Dev completes

### Batch Planning
Plan can produce multiple plans in one session only if Main explicitly scopes that batch. The channel should still make each next step unambiguous.

---

## Context Carryover Between Sessions

Because each session is independent, context flows through artifacts and the dispatch channel:

```text
Session 1 (Main)   → writes dispatch.md + channel Message 1
Session 2 (Plan)   → reads channel, writes plan.md + channel Message 2
Session 3 (Dev)    → reads channel, writes complete.md + channel Message 3
Session 4 (Review) → reads channel, writes review.md + channel Message 4
Session 5 (Fixer)  → if required fixes exist, fixes and routes back to Review
Session 6 (Review) → confirms fixes or loops again
Session 7 (Main)   → only after review-pass, reads channel + review and closes feature
```

The user no longer has to copy long prompts between sessions. They reuse the same pickup command for the dispatch.
