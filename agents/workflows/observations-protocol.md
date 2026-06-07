# Observations Protocol

Lightweight process for capturing and triaging general observations made while using the app.  
This complements (but is separate from) the stricter `deferred-protocol.md` used for Review-discovered deferrals.

## Purpose

`agents/OBSERVATIONS.md` exists so that notes from real usage — UX friction, polish ideas, minor bugs noticed in passing, future feature sparks — are not lost in chat or scattered across session logs. Hub is the primary owner and triage point.

## When to Add an Observation

- You notice something while manually testing or using the running app.
- The item is **not** currently in scope for an active dispatch.
- It feels worth remembering but does not yet justify a formal ticket or review note.

Do **not** use this for:
- Required fixes from a Review (use the review artifact + `DEFERRED.md` if deferred).
- Planned v1 work (use the implementation backlog).

## File Location & Format

See `agents/OBSERVATIONS.md` for the current structure.

Entries are intentionally lightweight. Hub may later add status tags (`[promoted]`, `[backlogged]`, `[dropped]`) during triage.

## Hub Responsibilities (Primary Curator)

When working in Hub mode:

1. Read `agents/OBSERVATIONS.md` as part of orientation when the user asks about future work or "what next".
2. Periodically triage the `[open]` section:
   - Group or dedupe similar items.
   - Promote promising items into a dispatch brief or the main backlog.
   - Move clearly out-of-scope or low-value items to `[dropped]` with a one-line reason.
   - Update status tags in place.
3. When drafting dispatch context for Main, surface relevant observations that overlap with the proposed scope.

Hub may edit `agents/OBSERVATIONS.md` directly as meta work (status changes, pruning, reorganization). Product changes still route through the normal Main → Plan → Dev → Review flow.

## Relationship to Other Artifacts

| Artifact                        | Purpose                                      | Owner     | When an item moves here                  |
|---------------------------------|----------------------------------------------|-----------|------------------------------------------|
| `agents/DEFERRED.md`            | Review-discovered items intentionally deferred | Hub (triage) | From Review PASS WITH NOTES             |
| `agents/OBSERVATIONS.md`        | General usage notes & ideas                  | Hub       | From live use / manual testing           |
| `docs/TODO_APP_IMPLEMENTATION_BACKLOG.md` | Planned v1 (and later) work            | Main/Plan | When an observation becomes a real ticket |
| `docs/SESSIONS.md`              | Session history                              | Main      | Historical record only                   |

## Lifecycle

```
Live use / manual test → add to [open] in OBSERVATIONS.md
Hub triage session      → promote / backlog / drop
Main scoping a dispatch → opportunistically pulls relevant items
Item ships or is dropped → move to [done] / [dropped] section
```

This keeps the signal-to-noise high while giving Hub a durable place to collect "things we noticed" without forcing every idea through the dispatch machinery immediately.