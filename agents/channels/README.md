# Dispatch Channels

This directory stores append-only handoff spools for active and historical dispatches.

## Current format: Phase 3 spool directories

New dispatches must use one directory per dispatch, with one immutable markdown file per handoff message:

```text
agents/channels/###-feature-slug/
  messages/
    001-main-to-plan.md
    002-plan-to-dev.md
    003-dev-to-review.md
```

Continue a dispatch with:

```text
pickup agents/channels/###-feature-slug/
```

The latest file in `messages/` determines the active role through its `## To` field. Message files are append-only: create the next numbered file, never edit or rename existing message files.

## Legacy channels

Older dispatches in this repository used single-file channels named `agents/channels/###-feature-slug-channel.md`. Those files are historical/audit artifacts only and should not be used as templates for new work.

See `agents/workflows/dispatch-channel-protocol.md` for the full protocol.
