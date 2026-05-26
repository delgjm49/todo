import { useDocumentStore } from "../../../stores/documentStore.js";
import { useUiStore } from "../../../stores/uiStore.js";
import { useHistoryStore } from "../../../stores/historyStore.js";
import {
  createMemoryStorageBackend,
  createStorageService,
} from "../../../services/storage/index.js";
import type { StorageService } from "../../../services/storage/index.js";

// ---------------------------------------------------------------------------
// Capture initial store states so we can reset between tests.
// ---------------------------------------------------------------------------
export const initialDocumentState = useDocumentStore.getState();
export const initialUiState = useUiStore.getState();
export const initialHistoryState = useHistoryStore.getState();

// ---------------------------------------------------------------------------
// Storage helpers
// ---------------------------------------------------------------------------

/**
 * Creates a **real** StorageService backed by an in-memory backend.
 * Unlike `createMemoryStorageService()` which is a one-liner, this
 * returns both the service and the backend so tests can inspect or
 * corrupt the persisted JSON if needed.
 */
export async function createRealStorageService(): Promise<{
  service: StorageService;
  backend: ReturnType<typeof createMemoryStorageBackend>;
}> {
  const backend = createMemoryStorageBackend();
  const service = await createStorageService(backend);
  return { service, backend };
}

// ---------------------------------------------------------------------------
// Store reset
// ---------------------------------------------------------------------------

/**
 * Reset every Zustand store back to its initial (module-load) state.
 * Call in `beforeEach` / `afterEach`.
 */
export function resetAllStores(): void {
  useDocumentStore.setState(initialDocumentState);
  useUiStore.setState(initialUiState);
  useHistoryStore.setState(initialHistoryState);
}

// ---------------------------------------------------------------------------
// Autosave flush
// ---------------------------------------------------------------------------

/**
 * Wait for autosave debounce to fire. The default delay is 250 ms,
 * so 300 ms is safe for flush-and-wait. Pass a custom `ms` for
 * different delays.
 */
export function flushAutosave(ms: number = 300): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// JSDOM globals
// ---------------------------------------------------------------------------

/**
 * Install JSDOM window globals so React Testing Library and React
 * can function.  Ported verbatim from
 * `src/tests/unit/rowEditing.test.tsx`.
 */
export function installDomGlobals(window: Window & typeof globalThis): void {
  globalThis.window = window;
  globalThis.document = window.document;
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: window.navigator,
  });
  globalThis.HTMLElement = window.HTMLElement;
  globalThis.Node = window.Node;
  globalThis.Event = window.Event;
  globalThis.KeyboardEvent = window.KeyboardEvent;
  globalThis.MouseEvent = window.MouseEvent;
  globalThis.MutationObserver = window.MutationObserver;
  globalThis.getComputedStyle = window.getComputedStyle.bind(window);
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

  if (!window.requestAnimationFrame) {
    window.requestAnimationFrame = (callback: FrameRequestCallback) =>
      window.setTimeout(() => callback(Date.now()), 0);
  }

  if (!window.cancelAnimationFrame) {
    window.cancelAnimationFrame = (handle: number) => window.clearTimeout(handle);
  }

  globalThis.requestAnimationFrame = window.requestAnimationFrame.bind(window);
  globalThis.cancelAnimationFrame = window.cancelAnimationFrame.bind(window);

  if (!window.PointerEvent) {
    class PointerEventPolyfill extends window.MouseEvent {}
    Object.defineProperty(window, "PointerEvent", {
      configurable: true,
      value: PointerEventPolyfill,
    });
  }

  globalThis.PointerEvent = window.PointerEvent;
}
