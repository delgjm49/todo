<!-- AGENT-SPECIFIC-START -->
# AGENTS.md — Todo AI Session Guide

This file provides guidance to Pi and OpenCode agents when working in this repository.

## Pi / OpenCode Notes

- Pi reads this file automatically at session start.
- Dispatch-auto pickup: when the session starts with `[dispatch-auto]`, role resolution follows the channel's `To` field per the dispatch-channel-protocol. Read the protocol doc after this file.
<!-- AGENT-SPECIFIC-END -->

<!-- SHARED-START -->
<!-- Synced from CLAUDE.md — run tools/sync_agent_docs.py --apply to update -->
## Project

A local-first desktop todo app focused on a polished, minimal interface and durable session-based workflow.

- **Stack**: Tauri v2, React 18+, TypeScript, Tailwind CSS, Vite, Vitest, Playwright
- **Storage**: Local JSON files (no SQL, no cloud, no external APIs)
- **Shipping target**: Windows 11 desktop
- **Dev platforms**: Windows 11 (work) and macOS (home)

## Key Documents

| File | Purpose |
|------|---------|
| [`docs/TODO_APP_PLAN.md`](docs/TODO_APP_PLAN.md) | Product plan and scope |
| [`docs/TODO_APP_TECH_SPEC.md`](docs/TODO_APP_TECH_SPEC.md) | Technical spec — architecture, data model, conventions |
| [`docs/TODO_APP_UI_SPEC.md`](docs/TODO_APP_UI_SPEC.md) | UI spec — layout, states, interactions |
| [`docs/TODO_APP_IMPLEMENTATION_BACKLOG.md`](docs/TODO_APP_IMPLEMENTATION_BACKLOG.md) | Ticket backlog (TICKET-XXX) and epic structure |
| [`docs/TODO_APP_PLAN_REVIEW.md`](docs/TODO_APP_PLAN_REVIEW.md) | Plan review findings (read when refining scope) |
| [`docs/SESSIONS.md`](docs/SESSIONS.md) | Session log — what's been done, what's next |

## Agent Workflow

This project uses a **multi-agent workflow**: Main → Plan → Dev → Review, with append-only dispatch channels carrying handoffs between sessions.

- Full protocol: [`agents/README.md`](agents/README.md)
- Dispatch channels: [`agents/workflows/dispatch-channel-protocol.md`](agents/workflows/dispatch-channel-protocol.md)
- Prompt templates: [`agents/prompts/`](agents/prompts/)
- Artifact format: [`agents/ARTIFACTS.md`](agents/ARTIFACTS.md)
- Review protocol: [`agents/workflows/review-protocol.md`](agents/workflows/review-protocol.md)
- Closing protocol: [`agents/CLOSING.md`](agents/CLOSING.md)

**Session start**: The first line of your message determines your role. Say `main`, `plan`, `dev`, `review`, `pickup agents/channels/###-feature-slug/`, or bare `pickup`. New dispatches use Phase 3 spool directories under `agents/channels/<slug>/messages/`; legacy `*-channel.md` files are historical only.

**Mandatory first read for every session**: After reading this file, you MUST read your role's prompt template **before doing any work** (orient, write artifacts, append messages, run commands). The role-specific rules — including guardrails like "discuss scope before dispatching" and "never commit without explicit user approval" — live only in those files. Skipping the prompt template will cause you to violate rules you didn't know existed.

- `main` → read [`agents/prompts/main.md`](agents/prompts/main.md)
- `plan` → read [`agents/prompts/plan.md`](agents/prompts/plan.md)
- `dev` → read [`agents/prompts/dev.md`](agents/prompts/dev.md)
- `review` → read [`agents/prompts/review.md`](agents/prompts/review.md)
- `pickup` → see Pickup mode below

**Pickup mode**: If the session starts with `pickup`, read this file first, then [`agents/workflows/dispatch-channel-protocol.md`](agents/workflows/dispatch-channel-protocol.md), then the named dispatch channel. If no channel path is given, use the most recently modified channel in `agents/channels/`. The protocol doc's Role Resolution Rules section determines your active role (it depends on the `[dispatch-auto]` tag). Then read the matching `agents/prompts/<role>.md` template before acting.

**Session close**: Only Main commits and pushes. Other agents document and append the next dispatch-channel message. See [`agents/CLOSING.md`](agents/CLOSING.md).

## Project Conventions

- **Naming**: PascalCase for components, camelCase for hooks/utils, kebab-case for files
- **State**: React local state + Zustand stores (see existing `src/` patterns)
- **Storage**: JSON files via Tauri filesystem APIs (no client-side SQL, no cloud calls)
- **Testing**: Vitest for unit/store tests, Playwright for E2E
- **No external APIs**: Everything runs locally

## Local Development Environment May Vary

The user works on this repo from two machines:

- **Work (primary):** Windows 11 PC. Default shell is PowerShell; a Bash terminal is also available.
- **Home:** Macbook M1 Air (Apple Silicon, 16GB), shell is zsh. Working directory: `/Users/joe/Developer/todo`.

The shipping target is Windows 11 only — the Mac is for development convenience, not a supported runtime. On the Mac, translate PowerShell-isms to zsh; don't refuse a step just because the doc says "PowerShell." Mac-specific build/packaging issues (Tauri code signing, `.app` bundling, etc.) are out of scope for v1 unless explicitly opened.

When running required verification commands, use the **actual shell available in the environment**. Lack of bash on Windows or lack of PowerShell on Mac is not a valid reason to skip a required command — translate and run it.

## Current Phase

Check [`docs/SESSIONS.md`](docs/SESSIONS.md) for the latest phase status and most recent session entries. **Workers (Plan / Dev / Review) do not need to read this file** — your dispatch artifact + channel have everything required for a well-scoped task. Main reads it to orient.

The previous 3-agent checkpoint workflow (Epics 07–08, checkpoints 6–12) is archived under [`docs/ai_sessions/legacy/`](docs/ai_sessions/legacy/) for historical reference. Do not append new entries there.

## Agent File Sync

`AGENTS.md` and `GEMINI.md` mirror the shared content of this file outside their agent-specific sections. After changing any shared section here, run:

```bash
python3 tools/sync_agent_docs.py --apply
```

Use `--check` to detect drift without modifying files. The sync script is sourced from `~/Developer/meta-workflow/tools/sync_agent_docs.py`.

<!-- SHARED-END -->
