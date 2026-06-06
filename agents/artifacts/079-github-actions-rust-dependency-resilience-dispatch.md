# Dispatch: GitHub Actions Rust Dependency Resilience

## What
Investigate and harden the Windows Tauri GitHub Actions build after run `26927387850` failed in the `Build Tauri app` step while Cargo fetched `serde_derive` from crates.io. Implement the smallest safe CI reliability improvement that makes Rust dependency fetching more resilient without weakening any release gates.

## Why
The latest cloud build for commit `46203c6` (`feat: viewport-safe menus and sortable headers`) passed e2e, typecheck, unit tests, lint, and frontend build, then failed during Tauri packaging with a Cargo network/download error. This blocks confidence in the GitHub-hosted Windows build even though the failure appears dependency-fetch related rather than product-code related.

## Scope
- Inspect GitHub Actions run `26927387850` and `.github/workflows/tauri-windows.yml` as the current source of truth.
- Preserve the existing strict gates: dependency install, Playwright Chromium install, e2e smoke, typecheck, unit tests, lint, frontend build, Tauri build, and MSI artifact upload.
- Add focused Rust/Cargo workflow resilience, such as Cargo dependency caching and/or Cargo network retry configuration, only if supported by current workflow/repo state.
- Keep changes minimal and directly tied to the observed `serde_derive` / crates.io download failure.
- Document the failure surface and the expected follow-up GitHub Actions validation.

**Out of scope:**
- Skipping, weakening, or reordering gates to hide the failing Tauri build.
- Product/UI changes.
- Broad release engineering redesign unrelated to Rust dependency download reliability.
- Declaring the cloud build fixed without either run evidence or clear follow-up run instructions when a new run cannot be triggered from the worker environment.

## Related Spec Sections
- `.github/workflows/tauri-windows.yml`
- `src-tauri/Cargo.toml`
- `src-tauri/Cargo.lock`
- `agents/artifacts/072-windows-ci-final-green-confirmation-review.md`
- `docs/SESSIONS.md` Phase Status / recent Windows CI entries

## Constraints
- Direct this dispatch to Dev; no separate Plan artifact is required for this S-sized CI reliability fix.
- Use the GitHub CLI if available to capture current run evidence. If authentication/network access blocks inspection, report the exact blocker and route to Main only if implementation cannot proceed safely.
- Prefer additive resilience (cache/retry) over changing dependency versions unless the logs prove a version-specific issue.
- Main handles final close/commit/push after Review passes; queue mode has been pre-authorized by the user for auto-close and auto-advance.

## Acceptance Criteria
- [ ] Run `26927387850` is identified by URL, head SHA, workflow name, status, conclusion, and failing step/log excerpt.
- [ ] The workflow still runs all existing release gates and does not skip or weaken `npm run test:e2e`, `npm run typecheck`, `npm test`, `npm run lint`, `npm run build`, `npm run tauri:build`, or artifact upload.
- [ ] Rust dependency fetching is made more resilient in a focused way, with rationale tied to the observed Cargo/crates.io failure.
- [ ] Relevant local verification is run for workflow/config changes, and GitHub Actions follow-up evidence or exact trigger/watch instructions are documented.
- [ ] Review confirms the workflow hardening is sufficient and scoped to the observed cloud build failure.
