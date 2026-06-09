<!-- Synced wholesale from meta-workflow/agents/templates/dispatch. Edit the canonical file and run tools/sync_repo_agents.py --apply; do not hand-edit in app repos. -->
# Standard Development Flow

A step-by-step walkthrough of how a feature moves through the agent pipeline using dispatch channels.

---

## Step 1: Main Orchestration

**User starts session with**: `main`

**What happens**:
1. Main reads `AGENTS.md`, checks the session summary, and helps choose the next task.
2. Main writes a dispatch artifact to `agents/artifacts/###-feature-dispatch.md`.
3. Main creates a dispatch channel spool at `agents/channels/###-feature-slug/`.
4. Main creates `messages/001-main-to-plan.md` with the dispatch path and planning task.
5. Main outputs a short pickup instruction.

**User action**: Start a new session with:

```text
pickup agents/channels/###-feature-slug/
```

---

## Step 2: Planning

**User starts session with**: `pickup agents/channels/###-feature-slug/`

**What happens**:
1. Agent reads the channel spool and sees the latest message file is addressed to Plan.
2. Plan reads the dispatch artifact listed in the channel.
3. Plan completes reconnaissance: reads relevant spec/architecture docs and existing code before writing the plan. If current external docs, package versions, changelogs, or user-provided URLs matter, use the web research guidance in `agents/workflows/web-research.md`.
4. Plan creates `###-feature-plan.md`, including a `## Verified Current-State Facts` section.
5. Plan creates `messages/002-plan-to-dev.md` in the same channel.
6. Plan appends a session entry to the configured session buffer and outputs the short pickup instruction.

**If the dispatch is unclear**: Plan creates a message file back to Main with the question.

**User action**: Start a new session with the same pickup command.

---

## Step 3: Development

**User starts session with**: `pickup agents/channels/###-feature-slug/`

**What happens**:
1. Agent reads the channel spool and sees the latest message file is addressed to Dev.
2. Dev reads the plan artifact listed in the channel (authoritative over any short channel recap).
3. Dev implements each step in order. If implementation depends on current external docs, package versions, changelogs, or user-provided URLs, use the web research guidance in `agents/workflows/web-research.md`.
4. Dev verifies the work, reporting each required command using the verification reporting rule in `agents/CLOSING.md`.
5. Dev writes `###-feature-complete.md`.
6. Dev creates `messages/003-dev-to-review.md` in the same channel.
7. Dev appends a session entry to the configured session buffer and outputs the short pickup instruction.

**If the plan has issues**: Dev notes deviations in the complete artifact and may create a channel message file back to Main for clarification.

**User action**: Start a new session with the same pickup command.

---

## Step 4: Review

**User starts session with**: `pickup agents/channels/###-feature-slug/`

**What happens**:
1. Agent reads the channel spool and sees the latest message file is addressed to Review.
2. Review reads the plan and complete artifacts listed in the channel, plus any later fix messages.
3. Review inspects the actual code changes.
4. Review reruns required verification commands and reports each using the verification reporting rule.
5. Review writes `###-feature-review.md` with findings, a `## Out-of-Scope Working Tree Changes` section, and a `## Final Verdict`.
6. Review creates the next numbered channel message file.
7. Review appends a session entry to the configured session buffer and outputs the short pickup instruction.

**Possible outcomes**:

### PASS → Main Close
- Review creates the next `Review → Main` message file with `State = review-pass`.
- Main runs the dirty-file close gate, then marks the feature done, commits, and pushes.

### PASS WITH NOTES → Main Close
- Review creates the next `Review → Main` message file with `State = review-pass`.
- Notes must be genuinely optional, intentionally deferred future improvements only.
- Review should require fixes for actionable low-severity items when they are reasonable within the current dispatch.
- Every deferred note must be recorded as an `[open]` entry in `agents/DEFERRED.md` (the deferred lane), not just left in the review artifact. Main confirms this at close; the Hub later triages the list. See `workflows/deferred-protocol.md`.
- If any file must change before completion, this is not PASS WITH NOTES.
- If any source/test/artifact/user-facing docs change after review-pass and before Main closes, Main routes back to Review for re-review.

### FAIL — Return to Dev → Fix Needed
- Review creates the next `Review → Dev` message file with `State = needs-dev-fix`.
- Dev fixes the listed issues, updates the complete artifact, creates the next `Dev → Review` message file (`State = ready-for-review`), and re-review follows.
- The work is not done until Review later creates a message file with `State = review-pass`.

### FAIL — Return to Main → Design or Main-Owned Fix Needed
- Review creates the next `Review → Main` message file with `State = needs-main-fix`. This covers design/plan-level flaws as well as Main-owned workflow/dispatch/channel/git issues.
- Main applies the fix, re-engaging Plan if the plan itself needs revision, then creates the next `Main → Review` message file with `State = ready-for-review`; re-review follows.
- Main must not close the dispatch until Review later creates a message file with `State = review-pass`.

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
For very small, well-understood tasks, Main can create `001-main-to-dev.md` as the first channel message. The dispatch must be detailed enough to act as the implementation instruction.

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

The user no longer has to copy long prompts between sessions. They reuse the same pickup command for the dispatch; the latest numbered message file determines the next role.
