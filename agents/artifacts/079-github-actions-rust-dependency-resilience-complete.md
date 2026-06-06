# Complete: GitHub Actions Rust Dependency Resilience

## Summary

Confirmed the exact failure in GitHub Actions run `26927387850`: Cargo failed to download `serde_derive v1.0.228` from crates.io during the `Build Tauri app` step with a curl error `[56] Failure when receiving data from the peer (schannel: server closed abruptly (missing close_notify))`. Added three additive hardening measures to `.github/workflows/tauri-windows.yml`: job-level `CARGO_HTTP_MULTIPLEXING: false` to prevent the Windows schannel/HTTP2 multiplexing error, `CARGO_NET_RETRY: 5` for transient network retries, and a `Swatinem/rust-cache@v2` step to cache the Cargo registry — eliminating the download requirement on subsequent runs with an unchanged `Cargo.lock`. All existing release gates are preserved and no product code was changed.

## Files Changed

| Action | Path | Notes |
|--------|------|-------|
| Modified | `.github/workflows/tauri-windows.yml` | Added `env:` block with `CARGO_HTTP_MULTIPLEXING: false` and `CARGO_NET_RETRY: 5`; added `Cache Cargo registry and build artifacts` step using `Swatinem/rust-cache@v2` with `workspaces: src-tauri` |

## Failure Evidence

**Run**: `26927387850`
**URL**: https://github.com/delgjm49/todo/actions/runs/26927387850
**Head SHA**: `46203c6dde3aa54493a2243d3cd392fccbe769cf`
**Workflow**: Tauri Windows CI
**Status**: completed / conclusion: failure
**Display title**: feat: viewport-safe menus and sortable headers
**Failing step**: Build Tauri app (at Cargo crate download, immediately after `✓ built in 2.22s` for the frontend)

**Exact error from failed log**:
```
error: failed to get `serde_derive` as a dependency of package `serde v1.0.228`
    ... which satisfies dependency `serde = "^1"` (locked to 1.0.228) of package `todo_app v0.1.0`

Caused by:
  failed to load source for dependency `serde_derive`

Caused by:
  unable to update registry `crates-io`

Caused by:
  download of se/rd/serde_derive failed

Caused by:
  curl failed

Caused by:
  [56] Failure when receiving data from the peer (schannel: server closed abruptly (missing close_notify))
```

**Root cause**: Windows SChannel TLS error during an HTTP/2 multiplexed Cargo registry download. The `dtolnay/rust-toolchain` action conditionally sets `CARGO_HTTP_MULTIPLEXING=false` only for Rust 1.70.x/1.71.x; the current stable toolchain is newer and did not trigger that guard, leaving HTTP/2 multiplexing enabled and exposed to this class of transient schannel failure.

## Changes Rationale

1. **`CARGO_HTTP_MULTIPLEXING: false`** (job-level env): Directly targets the schannel error by forcing Cargo to use HTTP/1.1 for registry communication instead of HTTP/2. This is the canonical mitigation for this class of Windows TLS error on GitHub Actions.

2. **`CARGO_NET_RETRY: 5`** (job-level env): Maps to `net.retry` in Cargo config. Default is 3; raising to 5 adds resilience against brief transient download failures without affecting build correctness.

3. **`Swatinem/rust-cache@v2` with `workspaces: src-tauri`**: Caches `~/.cargo/registry/index`, `~/.cargo/registry/cache`, `~/.cargo/git/db`, and `src-tauri/target/`, keyed on `src-tauri/Cargo.lock`. On a cache hit, Cargo skips registry downloads entirely, eliminating the network exposure for unchanged dependency sets. This is the strongest resilience measure — the serde_derive failure cannot recur on a warm cache run.

## Gate Preservation

All existing release gates are unchanged and in their original order:
- `npm ci`
- `npx playwright install chromium`
- `npm run test:e2e`
- `npm run typecheck`
- `npm test`
- `npm run lint`
- `npm run build`
- `npm run tauri:build`
- Upload MSI artifact (`if-no-files-found: error`)

## Deviations from Plan

None. The dispatch was routed directly to Dev (S-sized, no separate plan artifact).

## Open Questions

None.

## Verification

- command: `gh run view 26927387850 --json conclusion,headSha,workflowName,url,status,displayTitle`
- shell used: zsh via Bash tool on macOS
- result: succeeded; `conclusion: failure`, `status: completed`, `headSha: 46203c6dde3aa54493a2243d3cd392fccbe769cf`, `workflowName: Tauri Windows CI`, `url: https://github.com/delgjm49/todo/actions/runs/26927387850`, `displayTitle: feat: viewport-safe menus and sortable headers`
- if failed, exact failure surface: n/a
- checkpoint-scoped or unrelated repo-state: checkpoint-scoped failure evidence confirmation
- was this the actual shell provided by the environment: yes

- command: `gh run view 26927387850 --log-failed | grep -i -A 5 -B 5 "serde\|schannel\|curl\|error\["` (first 120 lines)
- shell used: zsh via Bash tool on macOS
- result: succeeded; extracted the exact `serde_derive` curl schannel error from the `Build Tauri app` step log, timestamped `2026-06-04T02:58:32`
- if failed, exact failure surface: n/a
- checkpoint-scoped or unrelated repo-state: checkpoint-scoped failure surface identification
- was this the actual shell provided by the environment: yes

- command: `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/tauri-windows.yml')); print('YAML valid')"`
- shell used: zsh via Bash tool on macOS
- result: `YAML valid`
- if failed, exact failure surface: n/a
- checkpoint-scoped or unrelated repo-state: checkpoint-scoped YAML syntax validation
- was this the actual shell provided by the environment: yes

- command: `npm run typecheck`
- shell used: zsh via Bash tool on macOS
- result: succeeded; `tsc -p tsconfig.json --noEmit` exited 0 with no errors
- if failed, exact failure surface: n/a
- checkpoint-scoped or unrelated repo-state: unrelated (confirms no frontend regressions; workflow change does not touch TypeScript)
- was this the actual shell provided by the environment: yes

## GitHub Actions Follow-Up

A new cloud run to validate the fix requires Main to commit and push this change. Once pushed, the workflow triggers automatically on push to `main`. Commands for Main/user to observe the next run:

```zsh
# Watch the most recent run after pushing
gh run watch $(gh run list --workflow=tauri-windows.yml --limit=1 --json databaseId --jq '.[0].databaseId')

# Or trigger a manual workflow_dispatch run (before pushing)
gh workflow run tauri-windows.yml --ref main
```

On a warm-cache run (second push), the `Cache Cargo registry and build artifacts` step will restore the registry and the `Build Tauri app` step will skip the `serde_derive` download entirely, providing the strongest validation of the resilience improvement.

## Known Issues

None. The `CARGO_HTTP_MULTIPLEXING: false` env var takes effect before any Cargo network operation, so the first run after this change is pushed still benefits from the fix even with a cold cache.
