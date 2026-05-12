# Dispatch: Formatting Persistence

## What
Implement `TICKET-044`: verify and harden persistence for formatting overrides at every supported target level: block, column, row, and cell. Formatting applied through the inspector should survive save/load cycles and reload into the editor with the same effective formatting resolution.

## Why
`TICKET-042` and `TICKET-043` added text/fill and border formatting controls plus immediate rendering. This checkpoint closes the formatting feature by ensuring those sparse override payloads are part of the canonical JSON persistence contract and are restored correctly after storage round trips.

## Scope
- Audit persisted workspace schema validation/coercion for block, column, row, and cell `format` payloads.
- Ensure text/fill properties and border properties are preserved on save and load for all supported target levels.
- Ensure invalid or malformed formatting values are safely normalized without corrupting valid nearby formatting.
- Add storage-level and/or document-store integration tests that exercise save/load round trips for block, column, row, and cell formatting.
- Add or update tests proving restored documents produce the expected effective formatting through existing resolution helpers.
- Explicitly out of scope: new formatting controls, new formatting properties, settings defaults UI, checkbox automation, sorting, clipboard, alerts, column resize, packaging, and broad Playwright E2E expansion.

## Related Spec Sections
- docs/TODO_APP_IMPLEMENTATION_BACKLOG.md `TICKET-044: Implement row/cell/column/block formatting persistence`
- docs/TODO_APP_TECH_SPEC.md `Persistence Architecture`
- docs/TODO_APP_TECH_SPEC.md `Formatting contract`
- docs/TODO_APP_TECH_SPEC.md `Formatting Resolution`
- docs/TODO_APP_TECH_SPEC.md `Validation Rules`
- docs/TODO_APP_UI_SPEC.md `Right Inspector` / formatting sections

## Constraints
- Preserve local JSON storage; no SQL, cloud, external APIs, or new persistence backend.
- Keep formatting sparse: omitted keys mean inherit; empty formatting objects should be omitted or normalized consistently where practical.
- Do not eagerly denormalize effective formatting into persisted data.
- Use the existing storage service boundary and schema validation/coercion helpers.
- Avoid changing the user-facing formatting UI unless required to fix a persistence defect.
- Keep invalid persisted data recoverable: bad values should be dropped/defaulted, not crash app load.
- Maintain existing test, build, typecheck, and lint cleanliness.

## Acceptance Criteria
- [ ] Block-level formatting overrides persist to JSON and load back correctly.
- [ ] Column-level formatting overrides persist to JSON and load back correctly.
- [ ] Row-level formatting overrides persist to JSON and load back correctly.
- [ ] Cell-level formatting overrides persist to JSON and load back correctly.
- [ ] Text/fill properties from `TICKET-042` survive a storage round trip where valid.
- [ ] Border properties from `TICKET-043` survive a storage round trip where valid.
- [ ] Invalid formatting values are normalized/dropped safely while valid formatting values remain intact.
- [ ] Effective formatting after reload matches the expected precedence order: app defaults → block → column → row → cell.
- [ ] Existing inspector formatting controls and immediate rendering behavior continue to work.
- [ ] Verification commands pass: `npm run typecheck`, `npm run test`, `npm run build`, and `npm run lint`.
