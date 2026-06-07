# Observations

Lightweight capture of notes, impressions, and ideas discovered while using the app.  
Intended for Hub-led triage; items may later be promoted into the implementation backlog, folded into a dispatch, or moved to `agents/DEFERRED.md`.

---

## Format

Each entry should be short and actionable enough for a future Hub or Main to understand without re-running the scenario.

```
## YYYY-MM-DD — short area / context
- Observation: one or two sentences describing what was noticed
- Impact / Why it matters: (optional) usability, performance, polish, discoverability, etc.
- Possible follow-up: (optional) rough idea of what could be done
```

Status is intentionally lightweight — Hub can add tags like `[promoted]`, `[backlogged]`, or `[dropped]` when triaging.

---

## [open]

### 2026-06-07 — Workspace context menu actions
- Observation: Right-clicking a workspace and selecting "Delete" or "Rename" does not appear to do anything.
- Impact: Basic workspace management is broken via context menu.
- Possible follow-up: Verify context menu handlers and ensure delete/rename actions are wired.

### 2026-06-07 — Workspace list scrolling
- Observation: Cannot scroll the right-hand workspace column when the list is longer than the viewport.
- Impact: Users with many workspaces cannot reach lower ones.
- Possible follow-up: Make the workspace list scrollable / add overflow handling.

### 2026-06-07 — Sort vs Menu behavior on blocks
- Observation: Clicking "Sort" on a block header brings up the same menu as the "Menu" button.
- Impact: Unclear intended behavior; may be a regression or missing sort-specific UI.
- Possible follow-up: Clarify design intent and either implement distinct sort UI or remove the button.

### 2026-06-07 — Block content area scrolling
- Observation: Cannot scroll within the main block content area when content overflows the viewport.
- Impact: Users cannot see or interact with rows that extend beyond the visible area.
- Possible follow-up: Ensure block content containers have proper overflow/scroll behavior.

### 2026-06-07 — Delete Block via Menu
- Observation: "Menu" → "Delete Block" does not appear to work.
- Impact: Users cannot delete blocks through the menu.
- Possible follow-up: Check block menu action wiring and delete confirmation flow.

### 2026-06-07 — Drag-and-drop row reordering
- Observation: Dragging rows to reorder within a block does not work.
- Impact: Core list manipulation UX is non-functional.
- Possible follow-up: Debug @dnd-kit integration or row drag handlers.

### 2026-06-07 — Text color flash after interaction
- Observation: After certain block interactions (e.g. attempted drag), all text in the block becomes lighter; recovers after leaving and re-entering the workspace.
- Impact: Visual glitch that temporarily reduces readability.
- Possible follow-up: Investigate theme / style application during drag or state transitions.

---

## [promoted]

<!-- Items that have been folded into a dispatch or the main backlog. -->

---

## [done] / [dropped]

<!-- Historical items that were either implemented or intentionally set aside. -->
