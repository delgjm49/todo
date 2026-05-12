# Pi Setup

Per-machine setup for the [Pi coding agent](https://earendil.works) when working in this repo.

## What lives here

- [`repo-statusline.ts`](repo-statusline.ts) — canonical source for the custom Pi footer/statusline (repo name + branch, git diff, token counters, context %, model). Tracked in the repo so any machine that pulls from `main` has the same source.

## Why "install" instead of `.pi/extensions/`

Pi auto-loads extensions from `.pi/extensions/` in the project directory. If the statusline were there, it would double-load on machines that also have it installed globally. The canonical source is kept here as a reference; each machine installs it **once** to its global Pi config.

## One-time install on a new machine

```bash
# 1. Copy the canonical source to your global Pi extensions dir
mkdir -p ~/.pi/agent/extensions
cp .pi/install/repo-statusline.ts ~/.pi/agent/extensions/repo-statusline.ts
```

```bash
# 2. Register it in your global Pi settings (~/.pi/agent/settings.json),
#    by adding "~/.pi/agent/extensions/repo-statusline.ts" to the
#    "extensions" array. Example settings:
#
# {
#   "extensions": [
#     "~/.pi/agent/extensions/repo-statusline.ts"
#   ]
# }
```

After the next Pi session restart, the statusline applies to **every** repo on that machine, not just this one.

## Per-machine settings

`.pi/settings.json` is **gitignored** — each machine maintains its own. Typical contents:

- **Windows PC** (work):
  ```json
  {
    "shellPath": "C:\\Users\\<user>\\Documents\\PortableGit\\bin\\bash.exe"
  }
  ```
- **Mac M1** (home): usually nothing project-specific; rely on global `~/.pi/agent/settings.json`.

If you ever need to seed a fresh machine, copy from the other one — there is no canonical version of this file.

## Keeping the statusline in sync

When the canonical source at `.pi/install/repo-statusline.ts` changes (and is pulled from `main`), re-run step 1 above on each machine to refresh the globally installed copy. Step 2 is only needed the very first time.
