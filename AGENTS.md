# Todo — AI Session Guide

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

**Session start**: The first line of your message determines your role. Say `main`, `plan`, `dev`, `review`, `pickup agents/channels/###-feature-channel.md`, or bare `pickup`.

**Pickup mode**: If the session starts with `pickup`, read `AGENTS.md` first, then [`agents/workflows/dispatch-channel-protocol.md`](agents/workflows/dispatch-channel-protocol.md), then the named dispatch channel. If no channel path is given, use the most recently modified channel in `agents/channels/`. Use the latest message's `To` field as your role and follow that message.

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
