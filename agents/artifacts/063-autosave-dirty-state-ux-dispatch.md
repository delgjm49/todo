# Dispatch: Autosave Debounce and Dirty-State UX

## What
Add a visible save status indicator to the app UI and verify the autosave/dirty-state pipeline is coherent across all document mutation paths. The store layer already has full autosave infrastructure (`saveAll`, `scheduleAutosave`, `dirty`, `saveStatus`, `saveError`, `retrySave`), but the user currently has no feedback about whether their changes are persisted, saving, or failed.

## Why
Users need confidence their work is saved. Without visible feedback, a user might close the app or switch contexts unsure if their last edit made it to disk. The autosave mechanism exists but is invisible — this ticket surfaces it with a lightweight, non-intrusive indicator.

## Scope

### In scope
- **Save status indicator in the top bar**: a subtle text/icon indicator next to existing top bar controls that shows:
  - `saved` → "Saved" or checkmark (dim, unobtrusive)
  - `saving` → "Saving..." with a subtle spinner or pulse
  - `idle` with `dirty=true` → "Unsaved changes" (indicates pending autosave)
  - `error` → "Save failed" with a retry affordance (button or clickable text that triggers `retrySave`)
  - `partial` → "Partially saved" with retry affordance
- **Dirty/save coherence audit**: verify that every document mutation path correctly sets `dirty=true` and triggers `scheduleAutosave`. This includes: workspace CRUD, block CRUD, row CRUD, cell edits, formatting changes, reordering, sorting, clipboard operations, and undo/redo.
- **Undo/redo save interaction**: confirm that undo and redo restore the previous dirty/save state correctly. Undoing a saved change should mark dirty again and queue autosave.
- **Tests** covering: save status indicator rendering for each state, dirty flag transitions on mutation, dirty flag transitions on undo/redo, retry affordance triggering `retrySave`.

### Out of scope
- Changing autosave delay timing (keep existing `DEFAULT_AUTOSAVE_DELAY_MS`)
- Adding a manual "Save now" button beyond the retry affordance
- Closed-app recovery or crash handling
- Changing the atomic write or backup strategy
- Toast/popup notifications for save status (keep it in the top bar)

## Related Spec Sections
- docs/TODO_APP_TECH_SPEC.md §Storage and Persistence
- docs/TODO_APP_IMPLEMENTATION_BACKLOG.md TICKET-063

## Data Model Context
- `DocumentStoreState.saveStatus`: `"idle" | "saving" | "saved" | "partial" | "error"`
- `DocumentStoreState.dirty: boolean`
- `DocumentStoreState.saveError: SaveFailure | null`
- `DocumentStoreState.lastSaveAt: string | null`
- `DocumentStoreState.saveAll`, `retrySave`, `markDirty`
- `scheduleAutosave` already wired into `commitSnapshot` and `updateSettings`

## Constraints
- The indicator must be subtle and non-intrusive — it should not compete with workspace title or primary actions for attention.
- Use existing Tailwind classes and color tokens (`text-textMuted`, `text-accent`, `text-danger`, etc.).
- The retry affordance should be accessible — keyboard focusable and clickable.
- Follow existing component patterns for the top bar.
- Add tests alongside implementation.
- `npm run test` must pass.
- `npm run lint` must pass.

## Acceptance Criteria
- [ ] Top bar shows a save status indicator that reflects `saveStatus` + `dirty` state
- [ ] Indicator states: Saved (dim), Saving (subtle animation/ellipsis), Unsaved changes, Save failed (with retry)
- [ ] Retry affordance calls `retrySave()` when activated
- [ ] All document mutation paths correctly mark dirty and schedule autosave
- [ ] Undo/redo restore dirty state and re-schedule autosave when appropriate
- [ ] Tests cover: indicator rendering per state, dirty transitions on mutation, dirty transitions on undo/redo, retry interaction
- [ ] `npm run test` passes (including new tests)
- [ ] `npm run lint` passes
