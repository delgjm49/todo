# Dispatch: TICKET-051 Plain Text Clipboard for Text Cells

## What
Implement and/or harden normal plain-text clipboard behavior for text cells. A focused text cell should support expected desktop copy/cut/paste of plain text without interfering with existing text editing, row clipboard flows, formatting, history, or autosave behavior.

## Why
`TICKET-051` is an MVP Core item and the next natural follow-up after internal row clipboard serialization/UI (`TICKET-049`/`TICKET-050`). It ensures basic text-cell clipboard behavior is explicit, tested, and reliable before the broader hotkey layer (`TICKET-052`).

## Scope
- Inspect the current `TextCell` and cell/grid interaction path to determine what native input clipboard behavior already provides.
- Implement any needed text-cell-scoped handling so focused text inputs can:
  - copy selected plain text out,
  - cut selected plain text when editing is allowed,
  - paste plain text in,
  - keep React controlled-input state and commit behavior correct.
- Preserve existing commit semantics unless Plan finds a clear bug: text edits should still commit through the existing `onCommit` / `documentStore.updateTextCellValue` path on Enter or blur.
- Add focused tests for text-cell clipboard behavior. Prefer component tests around `TextCell` / the focused cell path; add store tests only if store behavior changes.
- Keep behavior local to text cells and compatible with Tauri/browser clipboard constraints.

## Out of Scope
- App-wide/global hotkey layer (`TICKET-052`).
- Row clipboard state, row context menu behavior, or internal row payload serialization (`TICKET-049`/`TICKET-050`).
- Multi-cell, multi-row, or spreadsheet-style clipboard ranges.
- Rich text, formatting transfer, HTML clipboard content, images, files, or external APIs.
- Clipboard behavior for checkbox, bullet, numbered, date, time, or dropdown cells unless needed to avoid regressions.
- Persistence/schema changes.

## Related Spec Sections
- `docs/TODO_APP_IMPLEMENTATION_BACKLOG.md` — `TICKET-051: Implement plain text clipboard for text cells`
- `docs/TODO_APP_TECH_SPEC.md` — Copy/Paste Design
- Existing row clipboard artifacts for context only:
  - `agents/artifacts/009-internal-row-clipboard-serialization-*.md`
  - `agents/artifacts/013-row-clipboard-ui-*.md`

## Constraints
- Keep the implementation small and text-cell-scoped.
- Do not introduce external services or cloud/network dependencies.
- Do not route plain text cell clipboard actions through `uiStore` row clipboard state.
- Preserve undo/history/autosave patterns if a text-cell mutation is committed.
- React/jsdom input tests are high-risk in this repo: tests that exercise paste/input/change/focus must pass locally, not just by static inspection.

## Acceptance Criteria
- [ ] Focused text cells support normal desktop copy/cut/paste of plain text.
- [ ] Pasted text appears in the controlled input draft and commits through the existing text-cell mutation path according to current edit semantics.
- [ ] Copy/cut/paste in text cells does not trigger or corrupt row clipboard state.
- [ ] Existing row clipboard behavior remains intact.
- [ ] No persistence/schema changes are introduced.
- [ ] Targeted tests cover the implemented text-cell clipboard behavior and pass reliably.
- [ ] `npm run typecheck`, `npm run test`, `npm run build`, and `npm run lint` pass.
