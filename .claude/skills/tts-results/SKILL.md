---
name: tts-results
description: >-
  Check, summarize, open, or reveal asynchronous TTS jobs created by tools/ai-tts-async.py. Use when
  the user asks whether narration/audio is done, wants to hear generated TTS, compare voices, or open
  the output directory.
---

# TTS results workflow

Audio should not play automatically when a background TTS job finishes. Use this skill to inspect and
open results on request.

## Check job status

Latest jobs for the current repo:

```bash
tools/ai-tts-async.py status
```

Specific/latest job:

```bash
tools/ai-tts-async.py status latest
tools/ai-tts-async.py status <job-id-prefix>
```

## Show saved paths/links

```bash
tools/ai-tts-async.py results latest
```

This prints audio paths and `file://` links without opening anything.

## Open audio only when requested

Open every audio file in the latest job:

```bash
tools/ai-tts-async.py open latest
```

Open selected item(s):

```bash
tools/ai-tts-async.py open latest --index 2
tools/ai-tts-async.py open <job-id-prefix> --index 1 --index 3
```

## Reveal output directory

```bash
tools/ai-tts-async.py reveal latest
tools/ai-tts-async.py reveal <job-id-prefix>
```

## Organizing selected outputs

Keep raw generations under `~/Music/ai-generated/by-repo/<repo>/...`. If the user picks audio for the
project, copy that specific file into an appropriate repo path with normal confirmation/review. Do not
bulk-copy all variants into git.
