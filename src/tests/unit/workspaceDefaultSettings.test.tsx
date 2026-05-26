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

function getCheckboxByLabel(labelText: string): HTMLInputElement | null {
  const labels = Array.from(document.querySelectorAll("span.text-textMuted"));
  const label = labels.find((el) => el.textContent?.trim() === labelText);
  if (!label) return null;
  const row = label.closest("div");
  if (!row) return null;
  return row.querySelector('input[type="checkbox"]');
}

describe("workspace default settings", () => {
  test("each workspace default field renders with the current store value", async () => {
    useDocumentStore.setState({
      settings: { ...DEFAULT_SETTINGS },
    });

    const container = document.getElementById("root");
    assert.ok(container);
    root = createRoot(container);
    await act(async () => {
      root?.render(<SettingsPage />);
    });

    const bgInput = getInputByLabel("Background color");
    assert.ok(bgInput);
    assert.equal(bgInput.value, "#1F2937");

    const textColorInput = getInputByLabel("Default text");
    assert.ok(textColorInput);
    assert.equal(textColorInput.value, "#F9FAFB");

    const accentCheckbox = getCheckboxByLabel("Accent enabled");
    assert.ok(accentCheckbox);
    assert.equal(accentCheckbox.checked, true);

    const accentColorInput = getInputByLabel("Accent color");
    assert.ok(accentColorInput);
    assert.equal(accentColorInput.value, "#60A5FA");
  });

  test("background color updates store on blur with valid hex", async () => {
    useDocumentStore.setState({
      settings: { ...DEFAULT_SETTINGS },
    });

    const container = document.getElementById("root");
    assert.ok(container);
    root = createRoot(container);
    await act(async () => {
      root?.render(<SettingsPage />);
    });

    const input = getInputByLabel("Background color");
    assert.ok(input);

    await act(async () => {
      fireEvent.input(input, { target: { value: "#FF5733" } });
      fireEvent.blur(input);
    });

    assert.equal(useDocumentStore.getState().settings?.defaults.workspaceBackground, "#FF5733");
  });

  test("text color updates store on blur with valid hex", async () => {
    useDocumentStore.setState({
      settings: { ...DEFAULT_SETTINGS },
    });

    const container = document.getElementById("root");
    assert.ok(container);
    root = createRoot(container);
    await act(async () => {
      root?.render(<SettingsPage />);
    });

    const input = getInputByLabel("Default text");
    assert.ok(input);

    await act(async () => {
      fireEvent.input(input, { target: { value: "#000000" } });
      fireEvent.blur(input);
    });

    assert.equal(useDocumentStore.getState().settings?.defaults.workspaceTextColor, "#000000");
  });

  test("accent color updates store on blur with valid hex", async () => {
    useDocumentStore.setState({
      settings: { ...DEFAULT_SETTINGS },
    });

    const container = document.getElementById("root");
    assert.ok(container);
    root = createRoot(container);
    await act(async () => {
      root?.render(<SettingsPage />);
    });

    const input = getInputByLabel("Accent color");
    assert.ok(input);

    await act(async () => {
      fireEvent.input(input, { target: { value: "#00FF00" } });
      fireEvent.blur(input);
    });

    assert.equal(useDocumentStore.getState().settings?.defaults.workspaceAccentColor, "#00FF00");
  });

  test("invalid hex rejects and reverts without saving", async () => {
    useDocumentStore.setState({
      settings: { ...DEFAULT_SETTINGS },
    });

    const container = document.getElementById("root");
    assert.ok(container);
    root = createRoot(container);
    await act(async () => {
      root?.render(<SettingsPage />);
    });

    const input = getInputByLabel("Background color");
    assert.ok(input);

    await act(async () => {
      fireEvent.input(input, { target: { value: "invalid" } });
      fireEvent.blur(input);
    });

    // Store value unchanged
    assert.equal(useDocumentStore.getState().settings?.defaults.workspaceBackground, "#1F2937");
  });

  test("invalid hex with wrong format (#GGGGGG) rejects and reverts", async () => {
    useDocumentStore.setState({
      settings: { ...DEFAULT_SETTINGS },
    });

    const container = document.getElementById("root");
    assert.ok(container);
    root = createRoot(container);
    await act(async () => {
      root?.render(<SettingsPage />);
    });

    const input = getInputByLabel("Default text");
    assert.ok(input);

    await act(async () => {
      fireEvent.input(input, { target: { value: "#GGGGGG" } });
      fireEvent.blur(input);
    });

    assert.equal(useDocumentStore.getState().settings?.defaults.workspaceTextColor, "#F9FAFB");
  });

  test("accent enabled toggle updates store", async () => {
    useDocumentStore.setState({
      settings: { ...DEFAULT_SETTINGS },
    });

    const container = document.getElementById("root");
    assert.ok(container);
    root = createRoot(container);
    await act(async () => {
      root?.render(<SettingsPage />);
    });

    const checkbox = getCheckboxByLabel("Accent enabled");
    assert.ok(checkbox);
    assert.equal(checkbox.checked, true);

    // Toggle off
    await act(async () => {
      fireEvent.click(checkbox);
    });

    assert.equal(useDocumentStore.getState().settings?.defaults.workspaceAccentEnabled, false);

    // Re-render and check checkbox is unchecked
    await act(async () => {
      root?.unmount();
      root = createRoot(document.getElementById("root")!);
      root?.render(<SettingsPage />);
    });

    const checkboxAfter = getCheckboxByLabel("Accent enabled");
    assert.ok(checkboxAfter);
    assert.equal(checkboxAfter.checked, false);
  });

  test("accent color field is hidden when accent enabled is false", async () => {
    useDocumentStore.setState({
      settings: {
        ...DEFAULT_SETTINGS,
        defaults: {
          ...DEFAULT_SETTINGS.defaults,
          workspaceAccentEnabled: false,
        },
      },
    });

    const container = document.getElementById("root");
    assert.ok(container);
    root = createRoot(container);
    await act(async () => {
      root?.render(<SettingsPage />);
    });

    // Accent color input should not exist
    const accentColorInput = getInputByLabel("Accent color");
    assert.equal(accentColorInput, null);
  });

  test("accent color field is shown when accent enabled is true", async () => {
    useDocumentStore.setState({
      settings: { ...DEFAULT_SETTINGS },
    });

    const container = document.getElementById("root");
    assert.ok(container);
    root = createRoot(container);
    await act(async () => {
      root?.render(<SettingsPage />);
    });

    const accentColorInput = getInputByLabel("Accent color");
    assert.ok(accentColorInput);
  });

  test("new workspace inherits configured defaults", () => {
    const customDefaults = {
      ...DEFAULT_SETTINGS.defaults,
      workspaceBackground: "#0D1117",
      workspaceTextColor: "#C9D1D9",
      workspaceAccentEnabled: false,
      workspaceAccentColor: "#58A6FF",
    };

    useDocumentStore.setState({
      settings: { ...DEFAULT_SETTINGS, defaults: customDefaults },
    });

    // Call createWorkspace directly (bypassing JSDOM)
    const result = useDocumentStore.getState().createWorkspace("Test Workspace");
    assert.equal(result, true);

    const state = useDocumentStore.getState();
    const newWorkspace = state.workspaceIndex.find(
      (entry) => entry.title === "Test Workspace"
    );
    assert.ok(newWorkspace, "New workspace should exist in index");
    assert.equal(newWorkspace.style.background, "#0D1117");
    assert.equal(newWorkspace.style.textColor, "#C9D1D9");
    assert.equal(newWorkspace.style.accentStripe?.enabled, false);
    assert.equal(newWorkspace.style.accentStripe?.color, "#58A6FF");
  });

  test("new workspace inherits defaults when accent enabled is true", () => {
    const customDefaults = {
      ...DEFAULT_SETTINGS.defaults,
      workspaceBackground: "#1E1E1E",
      workspaceTextColor: "#D4D4D4",
      workspaceAccentEnabled: true,
      workspaceAccentColor: "#007ACC",
    };

    useDocumentStore.setState({
      settings: { ...DEFAULT_SETTINGS, defaults: customDefaults },
    });

    const result = useDocumentStore.getState().createWorkspace("Styled Workspace");
    assert.equal(result, true);

    const state = useDocumentStore.getState();
    const newWorkspace = state.workspaceIndex.find(
      (entry) => entry.title === "Styled Workspace"
    );
    assert.ok(newWorkspace);
    assert.equal(newWorkspace.style.background, "#1E1E1E");
    assert.equal(newWorkspace.style.textColor, "#D4D4D4");
    assert.equal(newWorkspace.style.accentStripe?.enabled, true);
    assert.equal(newWorkspace.style.accentStripe?.color, "#007ACC");
  });

  test("updating one workspace default field preserves other defaults values", async () => {
    useDocumentStore.setState({
      settings: { ...DEFAULT_SETTINGS },
    });

    const container = document.getElementById("root");
    assert.ok(container);
    root = createRoot(container);
    await act(async () => {
      root?.render(<SettingsPage />);
    });

    const bgInput = getInputByLabel("Background color");
    assert.ok(bgInput);

    await act(async () => {
      fireEvent.input(bgInput, { target: { value: "#FF0000" } });
      fireEvent.blur(bgInput);
    });

    const state = useDocumentStore.getState();
    assert.equal(state.settings?.defaults.workspaceBackground, "#FF0000");
    // All other workspace defaults must be preserved
    assert.equal(state.settings?.defaults.workspaceTextColor, "#F9FAFB");
    assert.equal(state.settings?.defaults.workspaceAccentEnabled, true);
    assert.equal(state.settings?.defaults.workspaceAccentColor, "#60A5FA");
  });

  test("color swatch divs render next to hex inputs", async () => {
    useDocumentStore.setState({
      settings: { ...DEFAULT_SETTINGS },
    });

    const container = document.getElementById("root");
    assert.ok(container);
    root = createRoot(container);
    await act(async () => {
      root?.render(<SettingsPage />);
    });

    const colorLabels = ["Background color", "Default text", "Accent color"];
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
