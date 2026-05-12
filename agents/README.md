# Agent Workflow Protocol

The Todo app uses a **multi-agent development workflow**. Instead of one agent doing everything, work flows through specialized agents with formal artifacts and append-only dispatch channels.

## Agent Types

| Agent | Trigger Phrase | Role |
|-------|---------------|------|
| **Main** (Orchestrator) | `"main"` | Entry point. Guides the session, decides scope, writes dispatch artifacts, creates dispatch channels, and commits/pushes completed work. |
| **Plan** (Planner) | `"plan"` | Takes a dispatch, creates detailed implementation plans. Can dispatch directly to Dev for small scoped work. |
| **Dev** (Builder) | `"dev"` | Takes a plan, implements it, and writes completion artifacts. |
| **Review** (Reviewer) | `"review"` | Takes a plan + completed work, reviews for correctness/completeness, and writes findings. |
| **Pickup** (Channel Resume) | `"pickup agents/channels/..."` or `"pickup"` | Reads the latest dispatch-channel message, assumes the `To` role, and continues with minimal user prompting. Bare `pickup` uses the most recently modified channel. |

## Starting a Session

Every session begins with a **first message** that identifies the agent type. The agent reads `AGENTS.md` for project context, then assumes its role.

```
Session start: "main"                         → Main Orchestrator mode
Session start: "plan"                         → Planning mode (manual fallback; needs dispatch artifact)
Session start: "dev"                          → Dev mode (manual fallback; needs plan artifact)
Session start: "review"                       → Review mode (manual fallback; needs plan + complete artifacts)
Session start: "pickup agents/channels/...."  → Pickup mode (preferred; role comes from latest channel message)
Session start: "pickup"                       → Pickup mode using most recently modified channel
```

Preferred flow: after Main creates a dispatch channel, continue each later session with:

```text
pickup agents/channels/###-feature-channel.md
```

The pickup agent reads `AGENTS.md`, then the dispatch-channel protocol, then the channel. It finds the latest message and inherits the role from that message's `To` field. If no channel path is supplied, it uses the most recently modified channel in `agents/channels/`.

## Artifacts and Dispatch Channels

Artifacts describe work state. They live in `agents/artifacts/`.

| Artifact | Created By | Consumed By | Purpose |
|----------|------------|-------------|---------|
| **Dispatch** (`*-dispatch.md`) | Main or Plan | Plan or Dev | Defines WHAT to build, at a feature level |
| **Plan** (`*-plan.md`) | Plan | Dev | Defines HOW to build it, with step-by-step breakdown |
| **Complete** (`*-complete.md`) | Dev | Review or Plan | Summarizes what was built, files changed, decisions made |
| **Review** (`*-review.md`) | Review | Main or Plan | Findings: pass/fail, issues found, recommendations |

Dispatch channels carry handoff messages. They live in `agents/channels/`.

| Channel | Created By | Appended By | Purpose |
|---------|------------|-------------|---------|
| **Channel** (`*-channel.md`) | Main | Main, Plan, Dev, Review | Append-only message chain for one dispatch; replaces long chat prompts |

See [`workflows/dispatch-channel-protocol.md`](workflows/dispatch-channel-protocol.md).

## Standard Flow

```
Main Orchestrator
  │
  │  User says "main"
  │  Main helps prioritize work, writes dispatch artifact + dispatch channel
  │  Main appends: Main → Plan
  │
  ▼
Planning Agent
  │
  │  User starts new session with: pickup agents/channels/###-feature-channel.md
  │  Plan reads latest channel message, creates detailed implementation plan
  │  Plan appends: Plan → Dev
  │
  ▼
Dev Agent
  │
  │  User starts new session with the same pickup command
  │  Dev reads latest channel message, implements the plan, writes complete artifact
  │  Dev appends: Dev → Review
  │
  ▼
Review Agent
  │
  │  User starts new session with the same pickup command
  │  Review checks work, writes review artifact
  │  If PASS → appends Review → Main with State = review-pass
  │  If required fixes → appends Review → Dev, Plan, or Main
  │  Fixer routes back to Review after fixes
  │
  └──→ Back to Main only after Review confirms State = review-pass
```

## File Naming

```
agents/artifacts/
  ├── 001-feature-slug-dispatch.md     # Dispatch for feature #1
  ├── 001-feature-slug-plan.md         # Plan for feature #1
  ├── 001-feature-slug-complete.md     # Dev completion for feature #1
  └── 001-feature-slug-review.md       # Review for feature #1
agents/channels/
  └── 001-feature-slug-channel.md      # Handoff message chain for feature #1
```

## Quick Reference

- **Starting work**: Start with `main`; Main creates a dispatch artifact and dispatch channel
- **Continuing work**: Start with `pickup agents/channels/###-feature-channel.md`
- **Manual fallback**: Use [`prompts/plan.md`](prompts/plan.md), [`prompts/dev.md`](prompts/dev.md), or [`prompts/review.md`](prompts/review.md) with explicit artifact paths
- **Dispatch channels**: See [`workflows/dispatch-channel-protocol.md`](workflows/dispatch-channel-protocol.md)
- **Full flow walkthrough**: See [`workflows/standard-flow.md`](workflows/standard-flow.md)
- **Review criteria**: See [`workflows/review-protocol.md`](workflows/review-protocol.md)
