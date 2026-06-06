<!-- Synced wholesale from meta-workflow/agents/templates/dispatch. Edit the canonical file and run tools/sync_repo_agents.py --apply; do not hand-edit in app repos. -->
# Deferred Follow-Ups Protocol

How a review-discovered item that is *not* fixed now still gets tracked, triaged, and eventually handled — instead of being written into a review artifact and forgotten.

This is the single source of truth for the deferred-items ledger. The dispatch roles (Review, Main) and the repo's standing assistant (generic Hub, or a persona hub such as Ember in `hay-there` / Terra in `gumball-factory`) all reference this file.

---

## The Problem This Solves

Before this protocol, a finding had only two real fates: **fix it now** (route back to Dev) or **note it and move on**. A "PASS WITH NOTES" item written into `agents/artifacts/###-feature-review.md` was committed and then buried under the next feature number. Even well-reasoned deferrals (genuinely out of scope, risky, larger refactor) silently accumulated as invisible tech debt.

The deferred ledger adds a durable **third lane**: an item can be deferred *only if it lands in a tracked list that someone actively curates*. Deferral now costs one line in `agents/DEFERRED.md`; in exchange, nothing falls off the table.

---

## The Ledger: `agents/DEFERRED.md`

One per repo, at `agents/DEFERRED.md`. It is **repo-local data**, not a synced template — like the session-log buffer, it grows per repo and the sync tool never overwrites it. It is created lazily: the first agent that needs to defer an item creates the file with the header below if it does not yet exist.

### File shape

```markdown
# Deferred Follow-Ups

Tracked items that were reviewed, judged worth doing, but intentionally not done
in their originating dispatch. Produced by Review; triaged by the Hub; picked up
by Main. See agents/workflows/deferred-protocol.md.

---

## [open] NNN-feature-slug — short title
- Source: agents/artifacts/NNN-feature-slug-review.md
- Severity: low | medium
- What: one-line description of the change
- Why deferred: the explicit deferral reason (out of scope / risky / larger refactor / speculative / cosmetic-but-worth-doing)
- Suggested fix: concrete pointer (file:line + approach) so a future Dev can act without rediscovery
- Added: YYYY-MM-DD by Review
```

### Status tags

Each entry's heading carries a status tag the curator updates in place:

- `[open]` — waiting; not yet scheduled.
- `[promoted → NNN]` — folded into dispatch `NNN` (a new plan/dispatch or an in-flight one). Stays in the ledger until that dispatch closes, then becomes `[done]`.
- `[done]` — shipped. Keep for a short audit window, then prune.
- `[dropped — reason]` — a curator (Hub or Main, with user agreement) decided it is not worth doing. Keep the one-line reason so it is not re-raised.

Append-only in spirit: change a tag, don't silently delete an open item.

---

## Roles

### Review — Producer
Review owns putting items *into* the ledger. When a review results in **PASS WITH NOTES**, every deferred note must be written as an `[open]` entry in `agents/DEFERRED.md` (creating the file if absent), in addition to appearing in the review artifact's Final Verdict.

A note may only be deferred (rather than routed back to Dev) when it has an explicit, defensible deferral reason — the same bar the review protocol already sets. **Deferral without a ledger entry is not allowed.** If Review would defer an item but cannot justify a ledger line for it, that is a signal it should have been a required Dev fix.

Low-severity does not mean optional, and optional does not mean invisible: the ledger is where "optional but worth doing" lives so it is never lost.

### Main — Transactional pickup
Main is the in-the-moment handler:

- **At close**, Main confirms that every item the review deferred actually landed in `agents/DEFERRED.md`. This is part of the dirty-file / close gate — do not close a PASS-WITH-NOTES dispatch whose deferrals were never recorded.
- **When scoping a new dispatch**, Main reads `agents/DEFERRED.md`. If the new work touches the same area as an `[open]` item, Main proposes folding it into the dispatch and tags it `[promoted → NNN]`. Main does not have to clear the whole list — it opportunistically grabs what is convenient and leaves the rest for triage.

### Hub / persona hub — Standing triage owner
The repo's standing assistant is the safety net that sees the *accumulation* Main handles only piecemeal. When the user works with the Hub (generic Hub in app repos; Ember in `hay-there`; Terra in `gumball-factory`) to plan or "fire up some dispatches," the Hub:

1. Reads `agents/DEFERRED.md` as part of its orientation/triage.
2. Evaluates the open items: still relevant? superseded? duplicated? grouped?
3. Sorts / dedupes / regroups entries and surfaces anything that has been hanging.
4. Proposes what to do with each — promote into a dispatch brief, move into the repo's longer-term backlog, or drop (with a recorded reason) — and updates the status tags accordingly when the user agrees.
5. May fold promoted items into the dispatch briefs it drafts for a future `main` session.

The Hub is the natural owner because it is meta-aware of repo status and already drafts dispatch briefs; the deferred ledger is just one more input it triages. The Hub may edit `agents/DEFERRED.md` directly as meta work (status tags, regrouping, pruning `[done]`), under the usual Hub git boundary (meta commits allowed with user approval; product work routes to Main).

---

## Lifecycle Summary

```text
Review (PASS WITH NOTES) → writes [open] entry in agents/DEFERRED.md
Main (close)             → confirms the entry exists before closing
Main (next scoping)      → opportunistically promotes adjacent items → [promoted → NNN]
Hub / Ember (triage)     → evaluates the whole list, promotes / backlogs / drops, keeps it tidy
Dispatch NNN closes      → promoted item → [done]; pruned after a short audit window
```

Dev is intentionally **not** ledger-aware: deferred items reach Dev only through a normal plan/dispatch, never by reading `agents/DEFERRED.md` directly. This keeps the producer/curator/consumer split clean.

---

## What This Is Not

- Not a replacement for FAIL → Dev. Actionable, trivial, low-risk, in-scope fixes still route back to Dev now. The ledger is only for items with a real deferral reason.
- Not a second backlog for product features. Long-term feature ideas belong in the repo's existing backlog doc; the ledger is specifically for review-discovered "worth doing, deferred" items so they do not mix with frozen planning docs.
- Not a way to weaken the review bar. If anything it tightens it: deferral now requires a tracked destination, so "PASS WITH NOTES and forget" is no longer an option.
