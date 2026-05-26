import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "node:test";
import { JSDOM } from "jsdom";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { SaveStatusIndicator } from "../../components/layout/SaveStatusIndicator.js";
import { useDocumentStore } from "../../stores/documentStore.js";

const initialDocumentState = useDocumentStore.getState();

let dom: JSDOM;
let root: Root | null = null;

function installDomGlobals(window: Window & typeof globalThis) {
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
  globalThis.PointerEvent = window.PointerEvent;
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

beforeEach(() => {
  dom = new JSDOM(
    '<!doctype html><html><head><style>:root{--color-canvas:#0f172a;--color-panel:#111827;--color-panel-muted:#1f2937;--color-accent:#60a5fa;--color-accent-soft:rgba(96,165,250,0.16);--color-border:#374151;--color-text:#f9fafb;--color-text-muted:#9ca3af;--color-danger:#f87171;--color-warning:#fbbf24}</style></head><body><div id="root"></div></body></html>',
    { url: "http://localhost/" }
  );
  installDomGlobals(dom.window as unknown as Window & typeof globalThis);
});

afterEach(async () => {
  await act(async () => {
    root?.unmount();
  });
  root = null;
  useDocumentStore.setState(initialDocumentState);
});

async function renderIndicator() {
  const container = document.getElementById("root");
  assert.ok(container);
  root = createRoot(container);
  await act(async () => {
    root?.render(<SaveStatusIndicator />);
  });
}

describe("SaveStatusIndicator", () => {
  test("renders 'Saved' when saveStatus=saved and dirty=false", async () => {
    useDocumentStore.setState({
      saveStatus: "saved",
      dirty: false,
    });

    await renderIndicator();

    const text = document.body.textContent?.trim();
    assert.equal(text, "Saved");
    // Should be a span, not a button
    const button = document.querySelector("button");
    assert.equal(button, null);
  });

  test("renders 'Saving…' when saveStatus=saving", async () => {
    useDocumentStore.setState({
      saveStatus: "saving",
      dirty: false,
    });

    await renderIndicator();

    const text = document.body.textContent?.trim();
    assert.ok(text?.includes("Saving"));
    // Element should have the animate-pulse class
    const span = document.querySelector("span");
    assert.ok(span);
    assert.ok(span.className.includes("animate-pulse"));
  });

  test("renders 'Unsaved changes' when dirty=true and saveStatus=idle", async () => {
    useDocumentStore.setState({
      saveStatus: "idle",
      dirty: true,
    });

    await renderIndicator();

    const text = document.body.textContent?.trim();
    assert.equal(text, "Unsaved changes");
  });

  test("renders 'Save failed · Retry' when saveStatus=error", async () => {
    useDocumentStore.setState({
      saveStatus: "error",
      dirty: false,
    });

    await renderIndicator();

    const text = document.body.textContent?.trim();
    assert.ok(text?.includes("Save failed"));
    assert.ok(text?.includes("Retry"));
    // Should be a button for retry
    const button = document.querySelector("button");
    assert.ok(button);
    assert.ok(button.textContent?.includes("Retry"));
  });

  test("renders 'Partially saved · Retry' when saveStatus=partial", async () => {
    useDocumentStore.setState({
      saveStatus: "partial",
      dirty: false,
    });

    await renderIndicator();

    const text = document.body.textContent?.trim();
    assert.ok(text?.includes("Partially saved"));
    assert.ok(text?.includes("Retry"));
    // Should be a button for retry
    const button = document.querySelector("button");
    assert.ok(button);
    assert.ok(button.textContent?.includes("Retry"));
  });

  test("retry button calls retrySave on click", async () => {
    let retryCalled = false;
    useDocumentStore.setState({
      saveStatus: "error",
      dirty: false,
      retrySave: () => {
        retryCalled = true;
        return Promise.resolve(true);
      },
    });

    await renderIndicator();

    const button = document.querySelector("button");
    assert.ok(button);

    await act(async () => {
      button.click();
    });

    // Flush any microtasks before asserting
    await act(async () => {});

    assert.equal(retryCalled, true);
  });

  test("renders nothing when saveStatus=loading", async () => {
    useDocumentStore.setState({
      saveStatus: "loading",
      dirty: false,
    });

    await renderIndicator();

    // Should render nothing (null/empty fragment)
    const text = document.body.textContent?.trim();
    assert.equal(text, "");
  });
});
