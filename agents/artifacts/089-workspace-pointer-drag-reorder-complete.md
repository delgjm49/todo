# Complete: Workspace Pointer Drag Reorder

## Summary
Implemented reliable pointer-based drag-and-drop reorder for workspace cards in the left dock using custom pointer-event handling, avoiding native HTML5 drag/drop entirely. Workspace cards can be reordered by pointer/mouse drag with visual feedback (grab cursor, opacity/ring while dragging, drop-target ring) and deterministic test coverage. Append-to-end (dropping below the last card) is supported via a `null` target extension of the store's `reorderWorkspaces` API.

## Files Changed
| Action | Path | Notes |
|--------|------|-------|
| Modified | `src/components/workspace/WorkspaceCard.tsx` | Added `dragging`, `dropTarget`, `onPointerDown` props; stable selectors (`data-testid="workspace-card"`, `data-workspace-id`, `data-testid="workspace-card-title"`); `cursor-grab` / `cursor-grabbing` visual states; no native HTML5 drag attributes. |
| Modified | `src/components/layout/LeftDock.tsx` | Custom pointer-drag session management (threshold-based activation, document-level `pointermove`/`pointerup`/`pointercancel` listeners, drop-target calculation from card `getBoundingClientRect()`, `suppressNextClickRef` for click-after-drag suppression, uiStore drag state wiring). |
| Modified | `src/stores/documentStore.ts` | Extended `reorderWorkspaces` to accept `WorkspaceId \| null` for `targetWorkspaceId`; null target appends the source to the end of the list. |
| Modified | `src/tests/unit/contextMenuDismissal.test.tsx` | Added 3 pointer-drag tests: drag-above (insert-before), drag-to-end (append-to-end), below-threshold no-op. |
| Modified | `src/tests/unit/documentStore.test.ts` | Added append-to-end test: verifies null target reorder, persistence, and no-op when source already last. |
| Modified | `src/tests/e2e/ux-fixes.spec.ts` | Added 2 pointer-drag E2E tests (insert-before and append-to-end); strengthened existing Move up/down tests with exact visible-order assertions via `data-testid="workspace-card-title"`. |

## Deviations from Plan
- **Card ref approach**: The plan suggested a `cardRefs = useRef<Map<WorkspaceId, HTMLElement>>()` pattern. Instead, the implementation uses `document.querySelectorAll('[data-testid="workspace-card"]')` during pointer-move to calculate drop targets. This is simpler, avoids `forwardRef` complexity on WorkspaceCard, and is equally deterministic since card positions are recomputed from live DOM every move.
- **`isPrimary` guard**: The plan recommended `event.isPrimary !== false`, but the initial code used `!event.isPrimary`. Fixed to `event.isPrimary === false` to handle environments where `isPrimary` is not defined (e.g., JSDOM polyfill). This matches the plan's intent and allows drag from any pointer that is not explicitly secondary.
- **Unit tests use getBoundingClientRect mocking**: The plan suggested mocking via card rects. Tests use `Object.defineProperty` on each card element to override `getBoundingClientRect` with deterministic values. This works reliably in JSDOM and doesn't require a more complex layout simulation.

## Open Questions
- None. The implementation follows the plan and acceptance criteria.

## Verification

### Command 1: `npm run test:build`
- **shell used**: zsh (macOS)
- **result**: PASS — exit code 0, no TypeScript errors
- **if failed, exact failure surface**: N/A
- **checkpoint-scoped or unrelated repo-state**: Checkpoint-scoped
- **was this the actual shell provided by the environment**: Yes

### Command 2: Targeted unit/integration tests
- **Command**: `node --test .test-dist/tests/unit/contextMenuDismissal.test.js .test-dist/tests/unit/workspaceCard.test.js .test-dist/tests/unit/documentStore.test.js .test-dist/tests/integration/workspaceLifecycle.integration.test.js`
- **shell used**: zsh (macOS)
- **result**: PASS — 77/77 tests pass across 7 suites (16 context-menu dismissal + pointer-drag, 17 workspace card, 37 document store, 7 workspace lifecycle)
- **if failed, exact failure surface**: N/A
- **checkpoint-scoped or unrelated repo-state**: Checkpoint-scoped
- **was this the actual shell provided by the environment**: Yes

### Command 3: Playwright E2E
- **Command**: `npx playwright test src/tests/e2e/ux-fixes.spec.ts --project=chromium`
- **shell used**: zsh (macOS)
- **result**: PASS — 9/9 tests pass (5.8s): workspace scroll, main canvas scroll, rename, delete, move up (strengthened), move down (strengthened), sort/menu, pointer-drag insert-before, pointer-drag append-to-end
- **if failed, exact failure surface**: N/A
- **checkpoint-scoped or unrelated repo-state**: Checkpoint-scoped
- **was this the actual shell provided by the environment**: Yes

## Fix Round: Drag Feedback Improvements

### Changes
| Action | Path | Notes |
|--------|------|-------|
| Modified | `src/components/workspace/WorkspaceCard.tsx` | Enhanced dragging visual: `scale-[0.97]` + `shadow-lg` for lifted appearance, `opacity-70` (was 60). Enhanced dropTarget visual: `border-accent ring-2 ring-accent bg-accent/10` for more visible target highlighting. Added `drop-indicator` testid: a horizontal accent line at the top of the target card spanning full width (`h-0.5 bg-accent shadow-sm shadow-accent/50`). |
| Modified | `src/components/layout/LeftDock.tsx` | Added end-of-list drop marker (`drop-indicator-end`): an accent horizontal line with "drop to end" label rendered at the bottom of the workspace list when dragging below all cards. Computed via `isDragging && !!draggingWorkspaceId && !dropTargetWorkspaceId`. |
| Modified | `src/tests/unit/contextMenuDismissal.test.tsx` | Added assertions for `drop-indicator` (visible during insert-before drag, invisible during append-to-end and below-threshold) and `drop-indicator-end` (visible only during append-to-end drag). |
| Modified | `src/tests/e2e/ux-fixes.spec.ts` | Added `expect(page.getByTestId("drop-indicator").first()).toBeVisible()` during insert-before drag; added `expect(page.getByTestId("drop-indicator-end")).toBeVisible()` during append-to-end drag. |

### Verification (Fix Round)

#### Command 1: `npm run test:build`
- **shell used**: zsh (macOS)
- **result**: PASS — exit code 0, no TypeScript errors
- **checkpoint-scoped or unrelated repo-state**: Checkpoint-scoped
- **was this the actual shell provided by the environment**: Yes

#### Command 2: Targeted unit/integration tests
- **Command**: `node --test .test-dist/tests/unit/contextMenuDismissal.test.js .test-dist/tests/unit/workspaceCard.test.js .test-dist/tests/unit/documentStore.test.js .test-dist/tests/integration/workspaceLifecycle.integration.test.js`
- **shell used**: zsh (macOS)
- **result**: PASS — 77/77 tests pass across 7 suites
- **checkpoint-scoped or unrelated repo-state**: Checkpoint-scoped
- **was this the actual shell provided by the environment**: Yes

#### Command 3: Playwright E2E
- **Command**: `npx playwright test src/tests/e2e/ux-fixes.spec.ts --project=chromium`
- **shell used**: zsh (macOS)
- **result**: PASS — 9/9 tests pass (5.8s)
- **checkpoint-scoped or unrelated repo-state**: Checkpoint-scoped
- **was this the actual shell provided by the environment**: Yes

### UI Feedback Summary
- **Dragged card**: Now appears "lifted" with `scale-[0.97]` transform and `shadow-lg` elevation, plus 70% opacity and accent ring. Previously had only opacity and ring.
- **Drop-target card**: Now has a more prominent `bg-accent/10` background tint, `border-accent` (brighter border) and `ring-2 ring-accent`. An accent-colored horizontal line (`drop-indicator`) spans the top of the card to clearly mark the insert position.
- **Append-to-end**: A new "drop to end" marker (`drop-indicator-end`) with accent horizontal lines appears at the bottom of the workspace list when dragging below all cards.
- **Cursor**: `cursor-grab` on default cards, `cursor-grabbing` during active drag.

## Known Issues
- None. All feedback improvements are complete and verified.
