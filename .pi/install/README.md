# Pi Setup

Per-machine setup for the [Pi coding agent](https://earendil.works) when working in this repo.

## What Lives Here

- [`repo-statusline.ts`](repo-statusline.ts) - canonical source for the custom Pi footer/statusline (repo name + branch, git diff, token counters, context %, model). It is tracked in the repo so any machine that pulls from `main` has the same source.

## Why `install` Instead Of `.pi/extensions/`

Pi auto-loads extensions from `.pi/extensions/` in the project directory. If the statusline lived there, it would double-load on machines that also have it installed globally. The canonical source is kept here as a reference; each machine installs it once to its global Pi config.

## One-Time Install On A New Machine

```bash
# Copy the canonical source to your global Pi extensions dir
mkdir -p ~/.pi/agent/extensions
cp .pi/install/repo-statusline.ts ~/.pi/agent/extensions/repo-statusline.ts
```

Pi auto-discovers extensions from `~/.pi/agent/extensions/`, so no `settings.json` edit is required for this statusline. After the next Pi session restart, the statusline applies to every repo on that machine, not just this one.

If you do edit `~/.pi/agent/settings.json` for other reasons, save it as UTF-8 **without BOM**. Pi parses JSON with `JSON.parse`, and a leading BOM can cause startup warnings like `Unexpected token '﻿'`.

## Per-Machine Settings

`.pi/settings.json` is gitignored - each machine maintains its own when needed.

On Windows, there are two valid ways to make Pi's `BASH` tool work:

- add PortableGit's `bin` directory to the user's `PATH`, so `bash` resolves without a repo-local override
- or set `shellPath` in `.pi/settings.json`

Typical Windows fallback contents if `bash` is not already on `PATH`:

- **Windows PC** (work):
  ```json
  {
    "shellPath": "C:\\Users\\<user>\\Documents\\PortableGit\\bin\\bash.exe"
  }
  ```
- **Mac M1** (home): usually nothing project-specific; rely on global `~/.pi/agent/settings.json`.

If `bash --version` already works in a fresh terminal on a machine, `.pi/settings.json` is usually unnecessary there.

If you ever need to seed a fresh machine, copy from the other one only as a local fallback - there is no canonical version of this file.

## Keeping The Statusline In Sync

When the canonical source at `.pi/install/repo-statusline.ts` changes (and is pulled from `main`), re-run the copy command above on each machine to refresh the globally installed copy.
