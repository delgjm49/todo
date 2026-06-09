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

### 2026-06-09 — Workspace context menu polish
- Observation: Right-clicking a workspace opens a context menu whose button hover highlight feels subtly delayed/not fully responsive. The "Delete workspace" action does not highlight like the other actions.
- Impact / Why it matters: Small responsiveness/polish issue in a high-frequency management menu; inconsistent destructive-action styling can make the menu feel unfinished.
- Possible follow-up: Investigate whether transition classes, hover delays, CSS specificity for destructive variants, or portal/menu layering are causing delayed hover feedback. Tune hover states to be instant and ensure the delete action has an intentional hover treatment.

### 2026-06-09 — Workspace card color text cursor
- Observation: On workspace cards, hovering over the accent color text (for example `#1F2937 / #F9FAFB`) changes the cursor to a text-selection/I-beam cursor even though the text is not editable.
- Impact / Why it matters: Misleading affordance; users may think inline color editing is available.
- Possible follow-up: Set the color summary text to a default cursor (or make it an actual edit affordance later if desired).

### 2026-06-09 — Screenshot review: duplicate workspace title
- Observation: In `/Users/joe/Downloads/Screenshot 2026-06-09 at 9.23.40 AM.png`, the active workspace title appears twice near the top: once in the top bar (`CURRENT WORKSPACE / Workspace 3`) and again in the canvas hero (`WORKSPACE CANVAS / Workspace 3`).
- Impact / Why it matters: Redundant hierarchy adds visual noise and makes the top of the workspace feel heavier than necessary.
- Possible follow-up: Remove or demote one title layer. Candidate: keep the compact top-bar current-workspace label for orientation and make the canvas hero less repetitive, or remove the top-bar title if the canvas heading is sufficient.

### 2026-06-09 — Screenshot review: add-block panel differentiation
- Observation: The "Add another block" area visually reads like another user-created block because it uses a similar bordered container treatment.
- Impact / Why it matters: Users may confuse an empty add affordance with real content; it weakens the distinction between content blocks and creation controls.
- Possible follow-up: Differentiate the add-block panel with a softer/no border, dashed treatment, separator, lower-contrast background, or compact inline controls.

### 2026-06-09 — Hide completed on non-checkbox blocks
- Observation: A bullet-list block shows a "Hide completed" control even though completion is currently most obvious/primary only for checklist rows.
- Impact / Why it matters: The control feels semantically mismatched on bullet lists and may confuse users about what can be completed.
- Possible follow-up: Hide the control for block types that do not support row completion, or make row completion a cross-list capability before exposing the control globally.

### 2026-06-09 — Lightweight completion for bullet/numbered rows
- Observation: The mismatch above suggests a possible feature: allow bullet/numbered rows to be marked complete/struck through as a secondary affordance, even without primary checkboxes.
- Impact / Why it matters: Preserves quick "done" semantics across list types and could make conversion between bullets and checklists less lossy.
- Possible follow-up: Explore a row-level completion state independent of checkbox cell values, including how it interacts with strikeout styling, hide-completed filtering, alerts, sorting, clipboard, and storage compatibility.

### 2026-06-09 — Convert between list block types
- Observation: It is unclear whether users can convert a bullet list to a checklist, or a checklist back to bullets. If conversion is added, preserving completed/struck state becomes important.
- Impact / Why it matters: List-type conversion is a natural editing workflow and may reduce friction when users start with the wrong block type.
- Possible follow-up: Audit current support for block type conversion. If not present, consider a future conversion feature with explicit rules for preserving row text, checkbox completion, row-level completion, columns, and alerts.

### 2026-06-09 — Date/time alerts are hard to discover
- Observation: Although date/time columns, alert toggles, an in-app scheduler, and workspace alert badges exist in code, they are not visible in the default UI shown in the latest screenshot. The path appears to require interacting with a column header/context menu to add or change a column to Date/Time and then enabling alerts, which is not obvious from normal app use.
- Impact / Why it matters: A core reminder/alert capability may feel absent to users even if technically implemented.
- Possible follow-up: Improve discoverability with clearer add-column affordances, block templates that include date/time examples, visible column menus/help text, or a dedicated reminder/date workflow.

## [promoted]

<!-- Items that have been folded into a dispatch or the main backlog. -->

---

## [done] / [dropped]

<!-- Historical items that were either implemented or intentionally set aside. -->
