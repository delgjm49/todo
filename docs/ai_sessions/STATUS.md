# Project Status

## Project

- Name: local desktop todo app
- Primary platform: Windows 11
- Architecture target: Tauri + React + TypeScript
- Persistence: local JSON files
- Native verification path: GitHub Actions Windows CI

## Planning State

The core planning stack is in place:

- `docs/TODO_APP_PLAN.md`
- `docs/TODO_APP_TECH_SPEC.md`
- `docs/TODO_APP_UI_SPEC.md`
- `docs/TODO_APP_IMPLEMENTATION_BACKLOG.md`
- `docs/TODO_APP_PLAN_REVIEW.md`

The planning artifacts have already been refined once in response to formal review findings.

## Implementation State

### Completed

- Checkpoint 1 foundation work:
  - repo scaffold
  - storage layer
  - persistence schemas
  - bootstrap behavior
  - document store foundation
- Checkpoint 1 follow-up fixes:
  - repo-local Tauri CLI wiring
  - explicit partial-save semantics
  - save-time coercion
  - expanded storage tests
- GitHub Actions Windows CI:
  - workflow added
  - Windows Tauri build now passes
- Checkpoint 2:
  - snapshot-based history store
  - autosave debounce
  - dirty/save-state behavior
- Checkpoint 3 builder pass:
  - app shell
  - top bar shell
  - settings screen shell
  - workspace dock rendering
  - workspace CRUD/styling/reorder
  - documentStore transaction batching integration
- Checkpoint 3 review refinements:
  - workspace card styling now renders stored background/text colors
  - workspace downward drag reorder now persists correctly
  - reorder coverage now includes the downward-move path
- Checkpoint 4 builder pass:
  - block templates
  - empty workspace add-block affordances
  - top bar add-block flow
  - block cards and headers
- Checkpoint 4 follow-up fix:
  - normal user-created workspaces now start empty
  - first-launch bootstrap starter workspace behavior remains intact
- Checkpoint 4 review outcome:
  - reviewed and accepted after the empty-workspace follow-up fix

### Review State

- Checkpoint 1: reviewed and refined
- Checkpoint 2: reviewed; acceptable to continue, with note that transaction batching should stay coordinated through `documentStore`
- Checkpoint 3: reviewed and refined; acceptable to continue
- Checkpoint 4: reviewed and accepted

## Current App Usability

- `npm run dev` starts the Vite web dev server
- browser preview is available through the local Vite URL
- local `tauri:dev` is not available on the user's work PC because Rust/MSVC tooling is unavailable there
- native Windows desktop verification is being done through GitHub Actions artifacts
- local `npm run typecheck`, `npm run test`, `npm run build`, and `npm run lint` pass after the checkpoint 3 review fixes on 2026-05-06

## Current Constraints

- No local Rust toolchain on the work PC
- No local MSVC build tools on the work PC
- Native desktop build verification must use CI or another machine
- Work should continue in scoped checkpoints to control drift

## Recommended Next Work

1. Start the next block-management checkpoint inside EPIC-06
2. Prefer this sequence:
   - `TICKET-026`
   - `TICKET-027`
   - `TICKET-028`
   - `TICKET-029`

## Notes

- The repo is now a git repository and is connected to:
  - `https://github.com/delgjm49/todo.git`
- The Windows CI workflow is currently the best gate for packaging/build confidence
