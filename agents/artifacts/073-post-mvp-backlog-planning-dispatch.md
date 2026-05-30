# Dispatch: Post-MVP backlog planning

## What
Create a short post-MVP planning recommendation for the Todo app now that planned v1 and release-readiness validation are complete. Compare the first plausible backlog seeds — search, archive/completed views, import/export, and richer date/time pickers — and recommend the best first post-MVP dispatch with a proposed scope, risks, dependencies, and acceptance criteria.

## Why
The v1 backlog is complete and Windows CI is green end-to-end. Before starting new product work, Main needs a repo-aware planning pass to choose a high-value, well-scoped first post-MVP feature rather than dispatching an arbitrary seed.

## Scope
- Review current product docs, backlog seeds, and relevant implementation architecture.
- Compare at least these candidates: search, archive/completed views, import/export, richer date/time pickers.
- For each candidate, summarize user value, implementation complexity, data/model impact, test impact, and release risk.
- Recommend one first post-MVP dispatch and define a crisp initial slice.
- Produce a plan/recommendation artifact that Main can use to discuss scope with the user before dispatching implementation.

**Out of scope:**
- Implementing product code.
- Editing source/test files.
- Rewriting the whole product roadmap.
- Dispatching Dev directly for a feature without Main/user choosing the scope.

## Related Spec Sections
- docs/TODO_APP_IMPLEMENTATION_BACKLOG.md Post-MVP Backlog Seeds
- docs/TODO_APP_PLAN.md
- docs/TODO_APP_TECH_SPEC.md
- docs/TODO_APP_UI_SPEC.md
- docs/SESSIONS.md Next Recommended

## Constraints
- Keep this as a planning/recommendation dispatch; no product code changes.
- Use existing architecture and local-first/no-cloud constraints.
- Prefer a small first slice that can go through normal Main → Plan → Dev → Review after Main/user approval.
- Main handles commits and future implementation dispatch decisions.

## Acceptance Criteria
- [ ] A planning artifact is created at `agents/artifacts/073-post-mvp-backlog-planning-plan.md`.
- [ ] The artifact compares search, archive/completed views, import/export, and richer date/time pickers.
- [ ] The artifact recommends one first post-MVP feature slice with rationale.
- [ ] The artifact includes proposed scope, out-of-scope items, likely files/areas, risks, verification approach, and acceptance criteria for the future implementation dispatch.
- [ ] No source/test/product files are changed.
