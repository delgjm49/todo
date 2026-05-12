# Dispatch: Border Formatting Controls

## What
Implement `TICKET-043`: inspector-driven border formatting controls for the currently selected block, column, row, or cell. Add controls for border width, border color, and top/right/bottom/left edge toggles, and render the effective border formatting immediately in the grid/editor surface.

## Why
This continues EPIC-08 after the inspector shell and text/fill formatting controls. Border controls complete the v1 formatting control surface before the follow-up persistence/reload checkpoint validates formatting durability end to end.

## Scope
- Add inspector controls for border width, border color, and individual edge toggles.
- Support block, column, row, and cell selection targets through the existing selection and formatting target patterns.
- Apply border formatting as sparse overrides, where omitted keys inherit from broader formatting layers.
- Provide reset-to-inherited/unset behavior for each editable border property.
- Render effective border formatting immediately for visible rows/cells using the existing formatting resolution path where practical.
- Add or update unit tests for border patch behavior, store mutation behavior, and/or style conversion behavior.
- Explicitly out of scope: dedicated save/reload formatting persistence QA (`TICKET-044`), text/fill formatting changes beyond integration needs, checkbox automation, sorting, clipboard, alerts, settings defaults UI, column resize, and packaging.

## Related Spec Sections
- docs/TODO_APP_IMPLEMENTATION_BACKLOG.md `TICKET-043: Implement border formatting controls`
- docs/TODO_APP_TECH_SPEC.md `Formatting contract`
- docs/TODO_APP_TECH_SPEC.md `Formatting Resolution`
- docs/TODO_APP_UI_SPEC.md `Right Inspector` / `Border formatting`
- docs/TODO_APP_UI_SPEC.md `Cell Design` / selected and focus states

## Constraints
- Preserve the existing local-first, no-external-API architecture.
- Keep presentation components thin; put reusable patch/style logic in domain helpers where appropriate.
- Reuse existing formatting types (`borderColor`, `borderWidth`, `edges`) rather than introducing a parallel model.
- Use sparse formatting objects; remove empty direct formatting objects where practical.
- Border controls must not expose mutation UI for no-selection or stale/missing targets.
- Mutations should flow through `documentStore` and use the existing history/autosave transaction pattern for formatting changes.
- Avoid breaking selected-cell/row visual affordances; border rendering should coexist with focus/selection states.

## Acceptance Criteria
- [ ] Inspector shows border formatting controls for valid block, column, row, and cell selections.
- [ ] No-selection and stale/missing-target states do not expose border mutation controls.
- [ ] Border width can be set and reset to inherited/unset.
- [ ] Border color can be set and reset to inherited/unset.
- [ ] Top, right, bottom, and left border edges can be toggled individually and reset to inherited/unset.
- [ ] Border formatting changes are stored as sparse overrides on the selected block/column/row/cell target.
- [ ] Effective border formatting renders immediately in the editor surface according to the existing formatting precedence order.
- [ ] Formatting mutations commit as formatting history transactions and do not mutate unrelated targets.
- [ ] Existing text/fill formatting behavior continues to work.
- [ ] Verification commands pass: `npm run typecheck`, `npm run test`, `npm run build`, and `npm run lint`.
