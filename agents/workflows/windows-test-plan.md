# dispatch-auto: Windows Verification Checklist

Status: **not yet exercised on Windows.** All design and validation so far has been on macOS (M1). The shipping target for the Todo app is Windows 11, so dispatch-auto needs a real run there before we trust the integration.

Run through this the next time you're at the work PC.

---

## Environment assumptions

- Windows 11 + PowerShell 7+
- `pi` and `claude` on `PATH`
- `~/.claude-acct1` (or whichever) populated so `claude` workers can run if configured
- `agents/orchestration.json` present (opt-in)

## Pre-flight

```powershell
pi --version
claude --version
node --version
Test-Path agents\orchestration.json
```

Verify:

- [ ] `agents/channels/.sessions/` does not exist yet (or is empty) — proves a clean baseline
- [ ] `~/.pi/agent/extensions/dispatch-auto.ts` is the same content as `/Users/joe/Developer/todo/.pi/install/dispatch-auto.ts` on this machine

## Test 1 — Basic chain, all Pi workers (no Claude config)

1. Start fresh Pi session, type `main`
2. Scope a small ticket with you (say something low-stakes — a one-file tweak)
3. Approve the dispatch
4. Walk away

Pass criteria:

- [ ] Plan / Dev / Review run in sequence as subprocesses (visible via `Get-Process pi` or Task Manager — count should hit 2 momentarily during a turn, drop to 1 between)
- [ ] `.dispatch-auto.log` shows `spawn role=Plan timeoutMs=900000` (15 min default × 60000)
- [ ] No `--session-dir` parse errors in the log (Windows path semantics work)
- [ ] Chain completes; Main wakes up and asks for commit approval

## Test 2 — Path semantics

After Test 1 succeeds:

- [ ] Inspect `agents\channels\.sessions\` — confirm one dir per role with backslash-style paths in any log references
- [ ] Confirm Pi sessions inside `.sessions\<channel>-<role>\` are non-empty (proves `--session-dir` accepted the Windows path)

## Test 3 — WinRT toast

- [ ] When Test 1's chain ends, verify a Windows toast notification appears with title "Dispatch chain complete" and body containing the channel filename + state
- [ ] Bonus: if the channel filename happens to contain `$` or backticks (it shouldn't normally but...), confirm the toast still renders correctly (the `psEscape` helper should handle this)

If no toast: check Focus Assist isn't suppressing it, and that the PowerShell command in `notify()` ran (it spawns detached, so failures are silent — manually paste the command into a PowerShell window to debug).

## Test 4 — Claude worker integration

Pre-req: configure one role to use Claude in `agents/orchestration.json`:

```json
{
  "roles": {
    "Review": { "binary": "claude", "configDir": "~/.claude-acct2" }
  }
}
```

Then run a real dispatch and verify:

- [ ] Plan/Dev are Pi processes; Review is a Claude process (check Task Manager — `claude.exe` or whichever the binary is)
- [ ] `agents/channels/.sessions/<channel>-Review/claude-session.uuid` is created on first Review turn
- [ ] If Review needs a revision turn, the same UUID file is reused (and Claude resumes — check the dispatch log shows `--resume <same-uuid>`)
- [ ] Dispatch a second ticket. Confirm a NEW UUID file is generated for the new channel's Review session (cycle isolation)

## Test 5 — Resume-failure recovery

Manual destructive test (run on a non-critical dispatch):

1. After Review's first turn writes a session file
2. Delete the matching session under `~/.claude\projects\<hash>\` BUT leave `claude-session.uuid` in place
3. Trigger a revision turn (e.g., reply on the channel from Dev → Review)

Pass criteria:

- [ ] `.dispatch-auto.log` shows `claude resume failed for role=Review — wiping uuid file and retrying with fresh session`
- [ ] Review actually completes (with fresh context — expected, this is the fallback path)
- [ ] A new UUID file is now present

## Test 6 — Timeout override via env var

1. Stop any active Pi session
2. Set `$env:DISPATCH_AUTO_TIMEOUT_MS = "120000"` (2 min)
3. Start Pi, run a dispatch you expect to be fast
4. Confirm `.dispatch-auto.log` shows `timeoutMs=120000` on the spawn line

Optional Test 7 — Idle behavior

- [ ] After all chains complete, leave Pi idle for a few minutes. Confirm the extension does NOT re-fire on the now-terminal channel (mtime gate + acted Map should both prevent this)

---

## Known gaps to flag back to the development thread

- Recursion guard relies only on `DISPATCH_AUTO_SUBPROCESS=1` env var. PowerShell doesn't strip env on spawn, so this should be fine — but if you ever see a sub-Pi launching a sub-Pi, report.
- Log rotation: `.dispatch-auto.log` grows unbounded. On a long-lived work machine, prune manually for now.
- The 250ms `setTimeout` before `pi.sendMessage` to wake Main is a race. Hasn't bitten yet but is theoretically fragile.

Report results back to whoever is iterating on `dispatch-auto.ts`. If any test fails, the log at `.dispatch-auto.log` and the contents of `agents/channels/.sessions/<channel-role>/` are the primary diagnostic surfaces.
