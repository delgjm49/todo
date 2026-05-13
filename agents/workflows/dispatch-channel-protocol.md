# Dispatch Channel Protocol

Dispatch channels are append-only message logs for passing work between agents without long copy/paste prompts in chat.

## Purpose

This protocol solves four recurring workflow problems:

1. Users had to manually copy long prompts mixed into agent summaries.
2. Agents sometimes forgot to include the next prompt in chat, or hid it inside an artifact.
3. Main could not easily audit whether handoffs were happening correctly.
4. Copy/paste prompts consumed chat tokens even though they only existed to bootstrap the next session.

A dispatch channel keeps the message chain on disk, next to the dispatch artifacts. Each agent appends the next agent's instructions to the channel and tells the user only that the next message is ready.

## Location and Naming

Dispatch channels live in:

```text
agents/channels/
```

Naming convention:

```text
agents/channels/###-feature-slug-channel.md
```

Example:

```text
agents/channels/005-block-editor-polish-channel.md
```

The channel number and slug should match the dispatch artifact whenever possible.

## Channel Format

```markdown
# Dispatch Channel: [Feature Name]

## Summary
- Dispatch: agents/artifacts/###-feature-dispatch.md
- Current status: ready-for-plan / ready-for-dev / ready-for-review / ready-for-re-review / needs-dev-fix / needs-plan-revision / needs-main-fix / review-pass / closed
- Created by: Main
- Created: YYYY-MM-DD

## Message 1 — Main → Plan — YYYY-MM-DD

### To
Plan

### State
ready-for-plan

### Read
- agents/artifacts/###-feature-dispatch.md

### Task
Create the implementation plan for this dispatch. Write the plan to `agents/artifacts/###-feature-plan.md`.

### Close Requirements
- Append the next message to this channel for Dev.
- Update `docs/SESSIONS.md`.
- Do not commit; Main handles git.
```

Each later agent appends a new `## Message N — From → To — YYYY-MM-DD` section. Use the next sequential integer based on existing messages in the channel (count the existing `## Message` headings, then add 1).

## Pickup Prompt

The user can start the next session with a minimal prompt:

```text
pickup agents/channels/###-feature-slug-channel.md
```

The pickup agent reads the channel, finds the most recent message, assumes the role named in `### To`, reads the listed files, and performs the task.

If the user omits the path:

```text
pickup
```

The agent should find the most recently modified file in `agents/channels/`, confirm it is the intended channel, then continue from the latest message.

## Role Resolution Rules

When a session starts with `pickup`:

1. Read `AGENTS.md` for project context.
2. Read `agents/workflows/dispatch-channel-protocol.md` for pickup mechanics.
3. Read the channel named in the prompt, or the most recently modified channel if no path is given.
4. Find the last `## Message` block.
5. **Determine your active role based on how pickup was invoked**:
   - **Orchestrator-invoked pickup** (the user prompt that triggered this turn starts with `[dispatch-auto]`): use the block's `### To` value as your active role:
     - `Main` → Main Orchestrator
     - `Plan` → Planning agent
     - `Dev` → Dev agent
     - `Review` → Review agent
   - **Human-invoked pickup** (no `[dispatch-auto]` tag in the prompt): you are always **Main**. Workers are spawned only by the orchestrator, never by humans. If the channel's latest `### To` is a worker (Plan / Dev / Review), the chain was interrupted — your job is to diagnose and re-route by appending a fresh `Main → <Role>` message, **never to do the worker's work yourself**.
6. Follow the `### Read`, `### Task`, and `### Close Requirements` sections from that message (Main, when re-routing, instead writes a fresh `Main → <Role>` message — it does not execute the worker's task).

If the channel is missing, ambiguous, contains no `## Message` blocks, or the `### To` role is invalid, stop and ask the user for the channel path or intended role.

**Tag commitment**: the `[dispatch-auto]` prefix is reserved for the orchestrator. Humans must never start a prompt with `[dispatch-auto]`. This is the single source of truth for "is this turn machine-driven or human-driven."

## Agent Responsibilities

### Main

- Creates the dispatch artifact.
- Creates the dispatch channel.
- Appends `Main → Plan` or `Main → Dev` as the first message.
- If Review returns `needs-main-fix`, applies the requested fixes and appends `Main → Review` with `State = ready-for-re-review`; Main must not mark the dispatch closed until Review later returns `review-pass`.
- Tells the user: `Next message is ready in agents/channels/... Start the next session with: pickup agents/channels/...`
- Commits and pushes only when appropriate.

### Plan

- Reads the latest channel message addressed to Plan.
- Creates or revises the plan artifact.
- Appends `Plan → Dev` with the plan path and dev instructions.
- Updates `docs/SESSIONS.md`.
- Does not commit.

### Dev

- Reads the latest channel message addressed to Dev.
- Implements or fixes the requested work.
- Creates or updates the complete artifact.
- Appends `Dev → Review` with the plan, complete, and any review context paths.
- Updates `docs/SESSIONS.md`.
- Does not commit.

### Review

- Reads the latest channel message addressed to Review.
- Reviews the work. Review is **read-only on implementation and test files** — if code needs to change, route back to Dev rather than editing inline. Review may update the channel and the review artifact.
- Creates or updates the review artifact.
- Appends one of:
  - `Review → Main` with `State = review-pass` for PASS / PASS WITH NOTES with no required fixes
  - `Review → Dev` with `State = needs-dev-fix` for fixable implementation failures
  - `Review → Plan` with `State = needs-plan-revision` for design failures
  - `Review → Main` with `State = needs-main-fix` for fixes that only Main can or should apply
- Updates `docs/SESSIONS.md`.
- Does not commit.

## Chat Output Rule

Agents should not output long next-session prompts in chat.

Instead, final chat output should be short:

```text
Implementation complete. Next message is ready for Review in agents/channels/###-feature-slug-channel.md.
Start the next session with:

pickup agents/channels/###-feature-slug-channel.md

Do not commit — Main handles git operations.
```

## Mandatory Re-Review Rule

If Review identifies any required fix, the work is not done after that fix is applied. The fixer must append a new message back to Review, and Review must confirm an all-clear verdict before Main can close the dispatch.

Required-fix loops:

```text
Review → Dev  → Dev fixes  → Dev → Review  → Review confirms or loops again
Review → Plan → Plan revises → Plan → Dev → Dev → Review → Review confirms or loops again
Review → Main → Main fixes → Main → Review → Review confirms or loops again
```

`PASS WITH NOTES` is only for genuinely optional, intentionally deferred suggestions. Review should require fixes for actionable low-severity items when they are reasonable within the current dispatch. If the review asks someone to change files before completion, or if an item is clear/trivial/helpful enough that it should be changed now, the verdict/state must route to Dev, Plan, or Main for fixes and then back to Review.

If any source, test, artifact, or user-facing documentation files change after Review has already returned `State = review-pass` but before Main closes the dispatch, Main must route back to Review (`Main → Review`, `State = ready-for-re-review`) instead of closing directly. Main-only close bookkeeping such as SESSIONS/channel closing text is exempt.

Main may only mark a dispatch `closed` after the latest Review message has `State = review-pass` and no post-review implementation/doc changes remain unreviewed.

## Review FAIL → Dev Requirement

For Review returning work to Dev, the appended channel message must include this close block verbatim under `### Close Requirements`:

```markdown
---
## ⚠️ BEFORE YOU END
When you finish fixing the issues:
- [ ] Update the complete artifact with fix notes
- [ ] Update docs/SESSIONS.md with a session entry
- [ ] Append the next Dev → Review message to this dispatch channel
- [ ] Output only the short pickup instruction to the user
- [ ] Do NOT commit — Main handles git
```

This replaces the old requirement to paste the full checklist into chat.

## Audit Trail

Because every handoff is appended to one dispatch channel, Main can audit the complete chain for a feature:

```text
Main → Plan → Dev → Review → Dev → Review → Main
```

Main should read the channel before closing a feature to confirm the workflow was followed.

## Recovery

If an agent forgets to update the channel:

1. Start Main with `main`.
2. Reference the relevant artifacts and channel.
3. Main reconstructs the missing channel message, notes the repair in `docs/SESSIONS.md`, and provides the next pickup instruction.
