# 001 — Main → Plan

## From
Main

## To
Plan

## State
ready-for-plan

## Context

Dispatch 085 implements the "hide completed rows" feature recommended by dispatch 084's planning/audit artifact. The planning artifact is thorough and contains verified current-state facts, domain impact analysis, and a future file map. Dev should read it as the primary reference.

## Dispatch Artifact

`agents/artifacts/085-hide-completed-rows-dispatch.md`

## Key References for Plan

- **Planning artifact (MUST READ)**: `agents/artifacts/084-archive-completed-views-planning-complete.md` — contains verified facts about current completion semantics, storage schema, domain impacts (alerts, search, sort, clipboard, undo, autosave), and acceptance criteria
- **Existing completion logic**: `src/domain/rows/applyCheckboxRules.ts` — `isRowCompletedByCheckbox`, `isCheckboxColumnCompleted`
- **Block type**: `src/types/block.ts` — add `hideCompletedRows: boolean`
- **Storage schemas**: `src/services/storage/storageSchemas.ts` — add to `normalizeBlock`
- **Document store**: `src/stores/documentStore.ts` — add `toggleHideCompletedRows` action
- **Row rendering**: `src/components/row/RowView.tsx` — apply filter before rendering
- **Block header**: look for the block header component where collapse/sort controls live — add toggle UI there
- **Existing tests**: `src/tests/unit/checkboxAutomation.test.ts`, `src/tests/integration/saveLoadRoundtrip.integration.test.ts`, `src/tests/unit/rowClipboard.test.ts`

## Scope Notes

This is an M-sized implementation dispatch. The design is well-defined by the planning artifact — Plan should produce concrete implementation steps and verify the file map is still accurate. Key areas to plan carefully:

1. The `getVisibleRows` filter helper — where it lives, how it's called
2. The toggle UI placement and styling (block header, near collapse/sort)
3. How the filter interacts with drag-and-drop and insert/paste when rows are hidden
4. Test coverage strategy
