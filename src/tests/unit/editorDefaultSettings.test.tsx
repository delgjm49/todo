import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "node:test";
import { JSDOM } from "jsdom";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { fireEvent } from "@testing-library/react";
import { useDocumentStore } from "../../stores/documentStore.js";
import { SettingsPage } from "../../components/settings/SettingsPage.js";
import { DEFAULT_SETTINGS } from "../../services/storage/bootstrapData.js";

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

  if (!window.CSSStyleSheet) {
    Object.defineProperty(window, "CSSStyleSheet", {
      configurable: true,
      value: class {},
    });
  }
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
  document.documentElement.className = "";
  useDocumentStore.setState(initialDocumentState);
});

function getInputByLabel(labelText: string): HTMLInputElement | null {
  const labels = Array.from(document.querySelectorAll("span.text-textMuted"));
  const label = labels.find((el) => el.textContent?.trim() === labelText);
  if (!label) return null;
  const row = label.closest("div");
  if (!row) return null;
  return row.querySelector("input");
}

describe("editor default settings", () => {
  test("each field renders with the current store value", () => {
    useDocumentStore.setState({
      settings: { ...DEFAULT_SETTINGS },
    });

    const container = document.getElementById("root");
    assert.ok(container);
    root = createRoot(container);
    act(() => {
      root?.render(<SettingsPage />);
    });

    const fontFamilyInput = getInputByLabel("Font family");
    assert.ok(fontFamilyInput);
    assert.equal(fontFamilyInput.value, "Segoe UI");

    const fontSizeInput = getInputByLabel("Font size");
    assert.ok(fontSizeInput);
    assert.equal(fontSizeInput.value, "14");

    const textColorInput = getInputByLabel("Text color");
    assert.ok(textColorInput);
    assert.equal(textColorInput.value, "#F3F4F6");

    const cellBgInput = getInputByLabel("Cell background");
    assert.ok(cellBgInput);
    assert.equal(cellBgInput.value, "#111827");

    const borderColorInput = getInputByLabel("Block border color");
    assert.ok(borderColorInput);
    assert.equal(borderColorInput.value, "#374151");

    const borderWidthInput = getInputByLabel("Border width");
    assert.ok(borderWidthInput);
    assert.equal(borderWidthInput.value, "1");
  });

  test("font family update on blur", async () => {
    useDocumentStore.setState({
      settings: { ...DEFAULT_SETTINGS },
    });

    const container = document.getElementById("root");
    assert.ok(container);
    root = createRoot(container);
    await act(async () => {
      root?.render(<SettingsPage />);
    });

    const input = getInputByLabel("Font family");
    assert.ok(input);

    await act(async () => {
      fireEvent.input(input, { target: { value: "Arial" } });
      fireEvent.blur(input);
    });

    assert.equal(useDocumentStore.getState().settings?.defaults.fontFamily, "Arial");
  });

  test("font size update on blur with valid value", async () => {
    useDocumentStore.setState({
      settings: { ...DEFAULT_SETTINGS },
    });

    const container = document.getElementById("root");
    assert.ok(container);
    root = createRoot(container);
    await act(async () => {
      root?.render(<SettingsPage />);
    });

    const input = getInputByLabel("Font size");
    assert.ok(input);

    await act(async () => {
      fireEvent.input(input, { target: { value: "18" } });
      fireEvent.blur(input);
    });

    assert.equal(useDocumentStore.getState().settings?.defaults.fontSize, 18);
  });

  test("font size rejects out-of-range value and does not save", async () => {
    useDocumentStore.setState({
      settings: { ...DEFAULT_SETTINGS },
    });

    const container = document.getElementById("root");
    assert.ok(container);
    root = createRoot(container);
    await act(async () => {
      root?.render(<SettingsPage />);
    });

    const input = getInputByLabel("Font size");
    assert.ok(input);

    await act(async () => {
      fireEvent.input(input, { target: { value: "999" } });
      fireEvent.blur(input);
    });

    // Store value unchanged (validation rejected the input)
    assert.equal(useDocumentStore.getState().settings?.defaults.fontSize, 14);
  });

  test("font size rejects non-numeric input and does not save", async () => {
    useDocumentStore.setState({
      settings: { ...DEFAULT_SETTINGS },
    });

    const container = document.getElementById("root");
    assert.ok(container);
    root = createRoot(container);
    await act(async () => {
      root?.render(<SettingsPage />);
    });

    const input = getInputByLabel("Font size");
    assert.ok(input);

    await act(async () => {
      fireEvent.input(input, { target: { value: "abc" } });
      fireEvent.blur(input);
    });

    assert.equal(useDocumentStore.getState().settings?.defaults.fontSize, 14);
  });

  test("font size rejects below-minimum value and does not save", async () => {
    useDocumentStore.setState({
      settings: { ...DEFAULT_SETTINGS },
    });

    const container = document.getElementById("root");
    assert.ok(container);
    root = createRoot(container);
    await act(async () => {
      root?.render(<SettingsPage />);
    });

    const input = getInputByLabel("Font size");
    assert.ok(input);

    await act(async () => {
      fireEvent.input(input, { target: { value: "3" } });
      fireEvent.blur(input);
    });

    assert.equal(useDocumentStore.getState().settings?.defaults.fontSize, 14);
  });

  test("hex color field textColor updates on blur with valid hex", async () => {
    useDocumentStore.setState({
      settings: { ...DEFAULT_SETTINGS },
    });

    const container = document.getElementById("root");
    assert.ok(container);
    root = createRoot(container);
    await act(async () => {
      root?.render(<SettingsPage />);
    });

    const input = getInputByLabel("Text color");
    assert.ok(input);

    await act(async () => {
      fireEvent.input(input, { target: { value: "#FF0000" } });
      fireEvent.blur(input);
    });

    assert.equal(useDocumentStore.getState().settings?.defaults.textColor, "#FF0000");
  });

  test("hex color field cellBackground updates on blur with valid hex", async () => {
    useDocumentStore.setState({
      settings: { ...DEFAULT_SETTINGS },
    });

    const container = document.getElementById("root");
    assert.ok(container);
    root = createRoot(container);
    await act(async () => {
      root?.render(<SettingsPage />);
    });

    const input = getInputByLabel("Cell background");
    assert.ok(input);

    await act(async () => {
      fireEvent.input(input, { target: { value: "#00FF00" } });
      fireEvent.blur(input);
    });

    assert.equal(useDocumentStore.getState().settings?.defaults.cellBackground, "#00FF00");
  });

  test("hex color field blockBorderColor updates on blur with valid hex", async () => {
    useDocumentStore.setState({
      settings: { ...DEFAULT_SETTINGS },
    });

    const container = document.getElementById("root");
    assert.ok(container);
    root = createRoot(container);
    await act(async () => {
      root?.render(<SettingsPage />);
    });

    const input = getInputByLabel("Block border color");
    assert.ok(input);

    await act(async () => {
      fireEvent.input(input, { target: { value: "#0000FF" } });
      fireEvent.blur(input);
    });

    assert.equal(useDocumentStore.getState().settings?.defaults.blockBorderColor, "#0000FF");
  });

  test("hex color rejects invalid input and does not save", async () => {
    useDocumentStore.setState({
      settings: { ...DEFAULT_SETTINGS },
    });

    const container = document.getElementById("root");
    assert.ok(container);
    root = createRoot(container);
    await act(async () => {
      root?.render(<SettingsPage />);
    });

    const input = getInputByLabel("Text color");
    assert.ok(input);

    await act(async () => {
      fireEvent.input(input, { target: { value: "red" } });
      fireEvent.blur(input);
    });

    // Store value unchanged
    assert.equal(useDocumentStore.getState().settings?.defaults.textColor, "#F3F4F6");
  });

  test("hex color rejects non-hex with #GGG and does not save", async () => {
    useDocumentStore.setState({
      settings: { ...DEFAULT_SETTINGS },
    });

    const container = document.getElementById("root");
    assert.ok(container);
    root = createRoot(container);
    await act(async () => {
      root?.render(<SettingsPage />);
    });

    const input = getInputByLabel("Cell background");
    assert.ok(input);

    await act(async () => {
      fireEvent.input(input, { target: { value: "#GGG" } });
      fireEvent.blur(input);
    });

    assert.equal(useDocumentStore.getState().settings?.defaults.cellBackground, "#111827");
  });

  test("border width update on blur with valid value", async () => {
    useDocumentStore.setState({
      settings: { ...DEFAULT_SETTINGS },
    });

    const container = document.getElementById("root");
    assert.ok(container);
    root = createRoot(container);
    await act(async () => {
      root?.render(<SettingsPage />);
    });

    const input = getInputByLabel("Border width");
    assert.ok(input);

    await act(async () => {
      fireEvent.input(input, { target: { value: "5" } });
      fireEvent.blur(input);
    });

    assert.equal(useDocumentStore.getState().settings?.defaults.blockBorderWidth, 5);
  });

  test("border width rejects out-of-range value and does not save", async () => {
    useDocumentStore.setState({
      settings: { ...DEFAULT_SETTINGS },
    });

    const container = document.getElementById("root");
    assert.ok(container);
    root = createRoot(container);
    await act(async () => {
      root?.render(<SettingsPage />);
    });

    const input = getInputByLabel("Border width");
    assert.ok(input);

    // Test negative
    await act(async () => {
      fireEvent.input(input, { target: { value: "-1" } });
      fireEvent.blur(input);
    });

    assert.equal(useDocumentStore.getState().settings?.defaults.blockBorderWidth, 1);

    // Test too high
    await act(async () => {
      fireEvent.input(input, { target: { value: "20" } });
      fireEvent.blur(input);
    });

    assert.equal(useDocumentStore.getState().settings?.defaults.blockBorderWidth, 1);
  });

  test("updating one field preserves other defaults values", async () => {
    useDocumentStore.setState({
      settings: { ...DEFAULT_SETTINGS },
    });

    const container = document.getElementById("root");
    assert.ok(container);
    root = createRoot(container);
    await act(async () => {
      root?.render(<SettingsPage />);
    });

    const fontSizeInput = getInputByLabel("Font size");
    assert.ok(fontSizeInput);

    await act(async () => {
      fireEvent.input(fontSizeInput, { target: { value: "20" } });
      fireEvent.blur(fontSizeInput);
    });

    const state = useDocumentStore.getState();
    assert.equal(state.settings?.defaults.fontSize, 20);
    // All other defaults must be preserved
    assert.equal(state.settings?.defaults.fontFamily, "Segoe UI");
    assert.equal(state.settings?.defaults.textColor, "#F3F4F6");
    assert.equal(state.settings?.defaults.cellBackground, "#111827");
    assert.equal(state.settings?.defaults.blockBorderColor, "#374151");
    assert.equal(state.settings?.defaults.blockBorderWidth, 1);
  });

  test("updateSettings is called on valid blur and dirty flag is set", async () => {
    useDocumentStore.setState({
      settings: { ...DEFAULT_SETTINGS, theme: "dark" },
      dirty: false,
    });

    const container = document.getElementById("root");
    assert.ok(container);
    root = createRoot(container);
    await act(async () => {
      root?.render(<SettingsPage />);
    });

    const input = getInputByLabel("Text color");
    assert.ok(input);

    await act(async () => {
      fireEvent.input(input, { target: { value: "#AABBCC" } });
      fireEvent.blur(input);
    });

    const state = useDocumentStore.getState();
    assert.equal(state.settings?.defaults.textColor, "#AABBCC");
    assert.equal(state.dirty, true);
  });

  test("empty font family does not save", async () => {
    useDocumentStore.setState({
      settings: { ...DEFAULT_SETTINGS },
    });

    const container = document.getElementById("root");
    assert.ok(container);
    root = createRoot(container);
    await act(async () => {
      root?.render(<SettingsPage />);
    });

    const input = getInputByLabel("Font family");
    assert.ok(input);

    await act(async () => {
      fireEvent.input(input, { target: { value: "" } });
      fireEvent.blur(input);
    });

    assert.equal(useDocumentStore.getState().settings?.defaults.fontFamily, "Segoe UI");
  });

  test("color swatch divs render next to hex inputs", () => {
    useDocumentStore.setState({
      settings: { ...DEFAULT_SETTINGS },
    });

    const container = document.getElementById("root");
    assert.ok(container);
    root = createRoot(container);
    act(() => {
      root?.render(<SettingsPage />);
    });

    // Each color field row should have a color swatch div before the input
    const colorLabels = ["Text color", "Cell background", "Block border color"];
    for (const label of colorLabels) {
      const labels = Array.from(document.querySelectorAll("span.text-textMuted"));
      const labelEl = labels.find((el) => el.textContent?.trim() === label);
      assert.ok(labelEl, `Label "${label}" not found`);
      const row = labelEl.closest("div");
      assert.ok(row, `Row for "${label}" not found`);
      const swatch = row.querySelector("div.h-5.w-5");
      assert.ok(swatch, `Color swatch not found for "${label}"`);
    }
  });
});
