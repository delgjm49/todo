# Dispatch: TICKET-048 Sort Menu UI

## What
Implement the user-facing sort control for blocks so a user can choose a sortable column and direction, then apply the existing block row sorting domain logic.

## Why
`TICKET-047` added pure row sorting helpers, but no UI or store action currently lets users trigger sorting. This dispatch connects the domain helper to the block header/menu surface and records the mutation as a normal document history operation.

## Scope
- Add a focused document store action for applying a block sort to one block.
- Use the existing `src/domain/sorting/` helpers from `TICKET-047` for row ordering; do not reimplement comparator logic in React components.
- Add a compact sort menu/control reachable from the block header (and optionally the existing block actions menu if Plan finds that cleaner).
- Show available sortable columns in display order, with clear ascending and descending actions.
- Exclude unsupported columns from the UI, especially `numbered` marker columns; prefer visible columns for the menu unless Plan identifies an existing convention requiring otherwise.
- Update the block `sort` metadata consistently when a sort is applied, and reindex row `order` values through the domain helper.
- Integrate with existing history/autosave mutation patterns using transaction kind `sort`.
- Add targeted tests for the store action and UI trigger behavior.

## Out of Scope
- New comparator semantics or broad changes to `TICKET-047` sorting helpers, except small fixes if Plan/Dev discovers an integration blocker.
- Multi-column sorting, persistent live/automatic resorting on every cell edit, or advanced sort configuration.
- Clipboard, shortcuts, alerts, packaging, column resizing, row drag/drop redesign, or inspector type-specific settings.
- Storage schema changes; `BlockSort` already exists and persistence hardening is not part of this dispatch.
- Rich menu primitives or global popover architecture beyond what is needed for this block sort menu.

## Related Spec Sections
- `docs/TODO_APP_IMPLEMENTATION_BACKLOG.md` — `TICKET-048: Implement sort menu UI`
- `docs/TODO_APP_TECH_SPEC.md` — `documentStore.sortBlockRows()`, history transaction guidance, Sorting Design
- `docs/TODO_APP_UI_SPEC.md` — block header sort affordance and block context menu `Sort by >`
- `agents/artifacts/007-block-row-sorting-domain-logic-dispatch.md`
- `agents/artifacts/007-block-row-sorting-domain-logic-complete.md`

## Constraints
- Keep sorting deterministic and routed through pure domain helpers.
- Do not mutate row ids or cell payloads; sorting may only change row `order` values and block sort metadata.
- Keep UI small and consistent with existing block/menu styling.
- Handle blocks with no sortable columns gracefully.
- Do not introduce runtime dependencies.
- Preserve existing block actions, row add behavior, collapse behavior, drag behavior, and column context menu behavior.

## Acceptance Criteria
- [ ] A user can open a sort control from a block header/menu.
- [ ] The sort control lists available sortable columns and excludes unsupported `numbered` columns.
- [ ] The user can apply ascending and descending sorts.
- [ ] Applying a sort updates row display order immediately using the `TICKET-047` domain helper behavior.
- [ ] Applying a sort updates `block.sort` metadata and records one undoable history transaction of kind `sort`.
- [ ] Blocks with no sortable columns show a clear disabled/empty menu state instead of failing.
- [ ] Store tests cover valid sort application, unsupported/missing column behavior, row payload preservation, and history integration.
- [ ] UI tests cover opening the sort control and triggering at least one sort direction.
- [ ] Existing verification remains green: typecheck, unit tests, build, and lint.
