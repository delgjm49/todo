# Agent Workflow Protocol

The Todo app uses a **multi-agent development workflow**. Instead of one agent doing everything, work flows through specialized agents with formal artifacts and append-only dispatch channels.

> **Dispatch workflow sync.** The role prompts (`prompts/*.md`), `ARTIFACTS.md`, `CLOSING.md`, and the workflow docs are synced from the **meta-workflow** repo. Content in `DISPATCH-SHARED` blocks is owned centrally — edit it there and run `python3 tools/sync_dispatch_workflow.py --apply` (from meta-workflow), not here. Only `DISPATCH-LOCAL` blocks (this repo's project name, doc paths, session buffer, and stack-specific criteria) are repo-owned.

## Agent Types

| Agent | Trigger Phrase | Role |
|-------|---------------|------|
| **Hub** (Repo Assistant) | `"hub"` | Repo-aware briefing, Q&A, brainstorming, backlog/session triage, and dispatch preparation. May commit/push meta work (docs, templates, config). Not a dispatch worker and no persistent memory. |
| **Main** (Orchestrator) | `"main"` | Entry point for official dispatch. Guides the session, decides scope, writes dispatch artifacts, creates dispatch channels, and commits/pushes completed work. |
| **Plan** (Planner) | `"plan"` | Takes a dispatch, creates detailed implementation plans. Can dispatch directly to Dev for small scoped work. |
| **Dev** (Builder) | `"dev"` | Takes a plan, implements it, and writes completion artifacts. |
| **Review** (Reviewer) | `"review"` | Takes a plan + completed work, reviews for correctness/completeness, and writes findings. |
| **Pickup** (Channel Resume) | `"pickup agents/channels/..."` or `"pickup"` | Reads the latest dispatch-channel message, assumes the `To` role, and continues with minimal user prompting. Bare `pickup` uses the most recently modified channel. |

## Starting a Session

Every session begins with a **first message** that identifies the agent type. The agent reads `AGENTS.md` for project context, **then reads its role's prompt template** (the role-specific guardrails live there — skipping this step causes the agent to operate without rules it should be following), then assumes its role.

```
Session start: "hub"                          → read agents/prompts/hub.md, agents/workflows/hub-protocol.md, agents/hub.config.json → Hub assistant mode
Session start: "main"                         → read agents/prompts/main.md   → Main Orchestrator mode
Session start: "plan"                         → read agents/prompts/plan.md   → Planning mode (manual fallback)
Session start: "dev"                          → read agents/prompts/dev.md    → Dev mode (manual fallback)
Session start: "review"                       → read agents/prompts/review.md → Review mode (manual fallback)
Session start: "pickup agents/channels/...."  → see Pickup section below
Session start: "pickup"                       → see Pickup section below
```

Preferred flow: after Main creates a Phase 3 spool-format dispatch channel, continue each later session with:

```text
pickup agents/channels/###-feature-slug/
```

The pickup agent reads `AGENTS.md`, then the dispatch-channel protocol, then the channel. For spool channels, it reads the latest numbered file in `messages/` and inherits the role from that message's `## To` field. If no channel path is supplied, it uses the most recently modified channel in `agents/channels/`. Legacy `*-channel.md` files are historical/audit artifacts only.

## Artifacts and Dispatch Channels

Artifacts describe work state. They live in `agents/artifacts/`.

| Artifact | Created By | Consumed By | Purpose |
|----------|------------|-------------|---------|
| **Dispatch** (`*-dispatch.md`) | Main or Plan | Plan or Dev | Defines WHAT to build, at a feature level |
| **Plan** (`*-plan.md`) | Plan | Dev | Defines HOW to build it, with step-by-step breakdown |
| **Complete** (`*-complete.md`) | Dev | Review | Summarizes what was built, files changed, decisions made |
| **Review** (`*-review.md`) | Review | Main or Dev | Findings: pass/fail, issues found, recommendations |

Dispatch channels carry handoff messages. They live in `agents/channels/`.

| Channel | Created By | Next Messages Created By | Purpose |
|---------|------------|-------------|---------|
| **Channel spool** (`agents/channels/<slug>/messages/*.md`) | Main | Main, Plan, Dev, Review | Append-only message-per-file chain for one dispatch; replaces long chat prompts |

See [`workflows/dispatch-channel-protocol.md`](workflows/dispatch-channel-protocol.md).

## Hub Flow

Use Hub before Main when you want orientation or discussion without launching dispatch:

```text
hub
```

Hub reads `agents/hub.config.json`, provides a concise briefing or recommendation, and can draft dispatch-ready context. Hub does not create channels, launch workers, or maintain memory unless the user explicitly changes the scope.

## Standard Dispatch Flow

```
Main Orchestrator
  │
  │  User says "main"
  │  Main helps prioritize work, writes dispatch artifact + dispatch channel
  │  Main creates: `001-main-to-plan.md`
  │
  ▼
Planning Agent
  │
  │  User starts new session with: pickup agents/channels/###-feature-slug/
  │  Plan reads latest channel message, creates detailed implementation plan
  │  Plan creates: next `plan-to-dev` message file
  │
  ▼
Dev Agent
  │
  │  User starts new session with the same pickup command
  │  Dev reads latest channel message, implements the plan, writes complete artifact
  │  Dev creates: next `dev-to-review` message file
  │
  ▼
Review Agent
  │
  │  User starts new session with the same pickup command
  │  Review checks work, writes review artifact
  │  If PASS → creates next `review-to-main` message file with State = review-pass
  │  If required fixes → creates next message file to Dev or Main
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
  └── 001-feature-slug/                 # Handoff spool for feature #1
      └── messages/
          ├── 001-main-to-plan.md
          ├── 002-plan-to-dev.md
          └── 003-dev-to-review.md
```

## Quick Reference

- **Orienting / triage**: Start with `hub`; Hub briefs, answers, brainstorms, or prepares dispatch context without launching workers
- **Starting dispatch work**: Start with `main`; Main creates a dispatch artifact and dispatch channel
- **Continuing work**: Start with `pickup agents/channels/###-feature-slug/`
- **Manual fallback**: Use [`prompts/plan.md`](prompts/plan.md), [`prompts/dev.md`](prompts/dev.md), or [`prompts/review.md`](prompts/review.md) with explicit artifact paths
- **Dispatch channels**: See [`workflows/dispatch-channel-protocol.md`](workflows/dispatch-channel-protocol.md)
- **Full flow walkthrough**: See [`workflows/standard-flow.md`](workflows/standard-flow.md)
- **Review criteria**: See [`workflows/review-protocol.md`](workflows/review-protocol.md)
