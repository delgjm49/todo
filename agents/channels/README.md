# Dispatch Channels

This directory stores append-only handoff logs for active dispatches.

Use one channel per dispatch:

```text
agents/channels/###-feature-slug-channel.md
```

Continue a dispatch with:

```text
pickup agents/channels/###-feature-slug-channel.md
```

See `agents/workflows/dispatch-channel-protocol.md` for the full protocol.
