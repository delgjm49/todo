import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "node:test";
import { JSDOM } from "jsdom";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { useDocumentStore } from "../../stores/documentStore.js";
import { useTheme } from "../../hooks/useTheme.js";
import { SettingsPage } from "../../components/settings/SettingsPage.js";

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

  // Required for innerText / textContent on JSDOM elements
  if (!window.CSSStyleSheet) {
    Object.defineProperty(window, "CSSStyleSheet", {
      configurable: true,
      value: class {},
    });
  }
}

/**
 * Minimal wrapper that exercises the actual useTheme hook.
 * The hook reads settings.theme from the store and toggles
 * html classes / color-scheme via a useEffect.
 */
function ThemeTestHarness() {
  useTheme();
  return null;
}

beforeEach(() => {
  dom = new JSDOM(
    '<!doctype html><html><head><style>:root{--color-canvas:#0f172a;--color-panel:#111827;--color-panel-muted:#1f2937;--color-accent:#60a5fa;--color-accent-soft:rgba(96,165,250,0.16);--color-border:#374151;--color-text:#f9fafb;--color-text-muted:#9ca3af;--color-danger:#f87171;--color-warning:#fbbf24}html.dark{color-scheme:dark}html.light{--color-canvas:#f8fafc;--color-panel:#ffffff;--color-panel-muted:#f1f5f9;--color-accent:#2563eb;--color-accent-soft:rgba(37,99,235,0.12);--color-border:#e2e8f0;--color-text:#0f172a;--color-text-muted:#64748b;--color-danger:#dc2626;--color-warning:#d97706;color-scheme:light}</style></head><body><div id="root"></div></body></html>',
    { url: "http://localhost/" }
  );
  installDomGlobals(dom.window as unknown as Window & typeof globalThis);
});

afterEach(async () => {
  await act(async () => {
    root?.unmount();
  });
  root = null;
  // Reset document classes
  document.documentElement.className = "";
  useDocumentStore.setState(initialDocumentState);
});

describe("theme mode switching", () => {
  test("useTheme applies light class and color-scheme when theme is light", async () => {
    // Set store to light theme before rendering so the hook picks it up
    useDocumentStore.setState({
      settings: {
        theme: "light",
        defaults: {
          fontFamily: "Segoe UI",
          fontSize: 14,
          textColor: "#F3F4F6",
          cellBackground: "#111827",
          blockBorderColor: "#374151",
          blockBorderWidth: 1,
          workspaceAccentEnabled: true,
        },
      },
    });

    const container = document.getElementById("root");
    assert.ok(container);
    root = createRoot(container);
    await act(async () => {
      root?.render(<ThemeTestHarness />);
    });

    assert.ok(
      document.documentElement.classList.contains("light"),
      "Expected html to have 'light' class"
    );
    assert.equal(
      document.documentElement.classList.contains("dark"),
      false,
      "Expected html to NOT have 'dark' class"
    );
    assert.equal(document.documentElement.style.colorScheme, "light");
  });

  test("useTheme applies dark class and color-scheme when theme is dark", async () => {
    // Set store to dark theme before rendering
    useDocumentStore.setState({
      settings: {
        theme: "dark",
        defaults: {
          fontFamily: "Segoe UI",
          fontSize: 14,
          textColor: "#F3F4F6",
          cellBackground: "#111827",
          blockBorderColor: "#374151",
          blockBorderWidth: 1,
          workspaceAccentEnabled: true,
        },
      },
    });

    const container = document.getElementById("root");
    assert.ok(container);
    root = createRoot(container);
    await act(async () => {
      root?.render(<ThemeTestHarness />);
    });

    assert.ok(
      document.documentElement.classList.contains("dark"),
      "Expected html to have 'dark' class"
    );
    assert.equal(
      document.documentElement.classList.contains("light"),
      false,
      "Expected html to NOT have 'light' class"
    );
    assert.equal(document.documentElement.style.colorScheme, "dark");
  });

  test("updateSettings persists theme change and marks store dirty", async () => {
    // Set up initial store with dark theme
    useDocumentStore.setState({
      settings: {
        theme: "dark",
        defaults: {
          fontFamily: "Segoe UI",
          fontSize: 14,
          textColor: "#F3F4F6",
          cellBackground: "#111827",
          blockBorderColor: "#374151",
          blockBorderWidth: 1,
          workspaceAccentEnabled: true,
        },
      },
    });

    const result = useDocumentStore.getState().updateSettings({ theme: "light" });
    assert.equal(result, true);

    const state = useDocumentStore.getState();
    assert.equal(state.settings?.theme, "light");
    assert.equal(state.dirty, true);
  });

  test("SettingsPage theme control switches between light and dark", async () => {
    // Set up the store with default dark theme
    useDocumentStore.setState({
      settings: {
        theme: "dark",
        defaults: {
          fontFamily: "Segoe UI",
          fontSize: 14,
          textColor: "#F3F4F6",
          cellBackground: "#111827",
          blockBorderColor: "#374151",
          blockBorderWidth: 1,
          workspaceAccentEnabled: true,
        },
      },
    });

    const container = document.getElementById("root");
    assert.ok(container);
    root = createRoot(container);
    await act(async () => {
      root?.render(<SettingsPage />);
    });

    // Find the Light button and click it
    const allButtons = Array.from(document.querySelectorAll("button"));
    const lightBtn = allButtons.find((b) => b.textContent?.trim() === "Light");
    assert.ok(lightBtn, "Light theme button not found");

    await act(async () => {
      lightBtn.click();
    });

    assert.equal(useDocumentStore.getState().settings?.theme, "light");

    // Find the Dark button and click it
    const darkBtn = allButtons.find((b) => b.textContent?.trim() === "Dark");
    assert.ok(darkBtn, "Dark theme button not found");

    await act(async () => {
      darkBtn.click();
    });

    assert.equal(useDocumentStore.getState().settings?.theme, "dark");
  });
});
