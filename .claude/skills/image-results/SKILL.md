---
name: image-results
description: >-
  Check, summarize, open, or reveal asynchronous AI image-generation jobs created by
  tools/ai-image-async.py. Use when the user asks whether images are done, wants to see generated
  images, choose among variants, or open the output directory.
---

# Image results workflow

Images should not appear automatically when a background job finishes. Use this skill to inspect and
open results on request.

## Check job status

Latest jobs for the current repo:

```bash
tools/ai-image-async.py status
```

Specific/latest job:

```bash
tools/ai-image-async.py status latest
tools/ai-image-async.py status <job-id-prefix>
```

## Show saved paths/links

```bash
tools/ai-image-async.py results latest
```

This prints image paths and `file://` links without opening anything.

## Open images only when requested

Open every image in the latest job:

```bash
tools/ai-image-async.py open latest
```

Open selected item(s):

```bash
tools/ai-image-async.py open latest --index 2
tools/ai-image-async.py open <job-id-prefix> --index 1 --index 3
```

## Reveal output directory

```bash
tools/ai-image-async.py reveal latest
tools/ai-image-async.py reveal <job-id-prefix>
```

## Organizing selected outputs

Keep raw generations under `~/Pictures/ai-generated/by-repo/<repo>/...`. If the user picks an image
for the project, copy that specific file into an appropriate repo path (`assets/`, `docs/images/`,
etc.) with normal confirmation and review. Do not bulk-copy all variants into git.
