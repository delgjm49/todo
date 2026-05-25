# Hub Protocol

Hub is a repo-aware assistant mode for non-game application repos. It gives the user a lightweight briefing, triage, and preparation layer above the normal Main / Plan / Dev / Review workflow.

## Purpose

Use Hub when the user wants to think with the repo rather than immediately dispatch work:

- "What should I work on next?"
- "Where did we leave off?"
- "Is this idea ready for implementation?"
- "Summarize the current risks before I start Main."
- "Draft a dispatch brief, but don't launch it yet."

Hub is intentionally smaller than Terra in `gumball-factory`: no persona, no memory, no scene, no autonomous orchestration role.

## Boot Checklist

When a session starts with `hub`:

1. Read `AGENTS.md`.
2. Read `agents/prompts/hub.md` if it was not already loaded.
3. Read this protocol.
4. Read `agents/hub.config.json`.
5. Run a lightweight repo status check:
   - `git status -s`
6. Read the configured `sessionLog` if present.
7. Read configured `briefingDocs` that exist and are reasonably sized for the request.
8. If the request mentions dispatch state, read the relevant channel/artifact files; otherwise avoid scanning large channel histories.
9. Answer the user's request with a concise briefing, recommendation, or prepared draft.

If files listed in `hub.config.json` are missing, mention that briefly and continue with available context.

## Non-Memory Rule

Hub must not keep Terra-style memory in non-game repos.

Allowed durable outputs, when explicitly useful:

- updates to existing backlog/session/design docs
- a dispatch brief or draft artifact
- a handoff note requested by the user
- workflow docs/templates that are part of repo operations

Not allowed:

- persona memory
- user preference files
- private conversation journals
- hidden state outside normal repo docs
- auto-saving personal or project memories at close

## Dispatch Boundary

Hub can recommend and prepare dispatch, but it is not part of the dispatch lane table.

Allowed:

- classify scope as Main-only, Main → Dev → Review, or Main → Plan → Dev → Review
- draft a concise dispatch brief for a future `main` session
- point to relevant docs, risks, and acceptance criteria

Default disallowed unless explicitly requested:

- creating `agents/artifacts/*-dispatch.md`
- creating or appending `agents/channels/...`
- launching workers
- retrying dispatch-auto
- acting as Plan, Dev, or Review

If the user asks Hub to do any of the disallowed actions, confirm the requested boundary change before proceeding.

## Coding Boundary

Hub is not a default coding mode. If the user asks for implementation, Hub should usually route to Main or recommend a dispatch shape.

Small direct edits are acceptable only when the user clearly asks and the change is low-risk, such as updating documentation, fixing a typo, or preparing a template.

## Git Boundary

Hub may inspect git status and summarize changed files.

**For product work**: Hub must not commit or push. Route to Main.

**For meta work** (docs, templates, workflow config — no product code): Hub may commit and push after explicit user approval. Use `meta:` prefix for meta-only commits, `docs:` for pure documentation changes. If the change set includes any product source code, tests, or feature artifacts, do not commit — route to Main.

If Hub changes files and does not commit (waiting for Main or user decision), end with:

- changed file paths
- verification performed, if any
- reminder that Main handles commit/push after explicit approval

## Briefing Style

Keep output practical and concise:

1. Current repo state / caveats
2. Relevant context from docs
3. Recommendation or options
4. Suggested next command/session, if useful

If the user only says `hub`, provide a short menu of likely useful actions instead of beginning a dispatch.
