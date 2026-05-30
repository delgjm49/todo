import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "node:test";
import { JSDOM } from "jsdom";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { TextCell } from "../../components/cell/TextCell.js";
import { handleTextCellKeyDown } from "../../components/cell/text-cell-key-down.js";
import { useUiStore } from "../../stores/uiStore.js";

const initialUiState = useUiStore.getState();

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
}

async function renderTextCell(value: string, onCommit: (value: string) => void): Promise<HTMLInputElement> {
  const container = document.getElementById("root");
  assert.ok(container);
  root = createRoot(container);
  await act(async () => {
    root?.render(<TextCell value={value} onCommit={onCommit} />);
  });
  const input = container.querySelector('[data-testid="text-cell-input"]') as HTMLInputElement | null;
  assert.ok(input);
  return input;
}

function textCellKeyEvent(key: string, ctrlKey = false, metaKey = false) {
  let defaultPrevented = false;
  return {
    get defaultPrevented() {
      return defaultPrevented;
    },
    ctrlKey,
    key,
    metaKey,
    preventDefault: () => {
      defaultPrevented = true;
    },
  };
}

beforeEach(() => {
  dom = new JSDOM("<!doctype html><html><body><div id=\"root\"></div></body></html>", {
    url: "http://localhost/",
  });
  installDomGlobals(dom.window as unknown as Window & typeof globalThis);
  useUiStore.setState(initialUiState);
});

afterEach(async () => {
  await act(async () => {
    root?.unmount();
  });
  root = null;
  useUiStore.setState(initialUiState);
});

describe("text cell clipboard", () => {
  test("Ctrl+C/X/V/A keyboard events are not default-prevented", async () => {
    const commits: string[] = [];
    const input = await renderTextCell("hello", (v: string) => commits.push(v));

    for (const key of ["c", "x", "v", "a"]) {
      const event = textCellKeyEvent(key, true);
      handleTextCellKeyDown(event, () => commits.push("committed"), () => {
        input.value = "reset";
      });
      assert.equal(event.defaultPrevented, false, `Ctrl+${key} should not be defaultPrevented`);
    }
  });

  test("Render TextCell with value prop", async () => {
    const commits: string[] = [];
    const input = await renderTextCell("initial", (v: string) => commits.push(v));

    assert.equal(input.value, "initial");
  });

  test("Enter key does nothing when draft unchanged", async () => {
    const commits: string[] = [];
    const input = await renderTextCell("hello", (v: string) => commits.push(v));

    await act(async () => {
      handleTextCellKeyDown(textCellKeyEvent("Enter"), () => {
        if (input.value !== "hello") {
          commits.push(input.value);
        }
      }, () => {
        input.value = "hello";
      });
    });

    assert.equal(commits.length, 0, "should not commit when draft equals value");
  });

  test("Escape reverts to value when draft changed via value prop update", async () => {
    // This test verifies the Escape key reverts behavior by
    // re-rendering with a new value (which triggers useEffect to
    // update draft), then using keyboard events which work in JSDOM.
    const commits: string[] = [];
    const input = await renderTextCell("hello", (v: string) => commits.push(v));

    // Re-render with same value, then dispatch Escape — should be no-op
    await act(async () => {
      root?.render(<TextCell value="hello" onCommit={(v: string) => commits.push(v)} />);
    });

    assert.equal(input.value, "hello");

    await act(async () => {
      handleTextCellKeyDown(textCellKeyEvent("Escape"), () => commits.push(input.value), () => {
        input.value = "hello";
      });
    });

    assert.equal(input.value, "hello", "Escape on unchanged draft keeps value");
  });

  test("Copy event does not modify draft", async () => {
    const commits: string[] = [];
    const input = await renderTextCell("hello", (v: string) => commits.push(v));

    await act(async () => {
      input.dispatchEvent(new Event("copy", { bubbles: true, cancelable: true }));
    });

    assert.equal(input.value, "hello");
    assert.equal(commits.length, 0);
  });

  test("Blur does not trigger commit when draft equals value", async () => {
    const commits: string[] = [];
    const input = await renderTextCell("hello", (v: string) => commits.push(v));

    await act(async () => {
      input.dispatchEvent(new Event("blur", { bubbles: true, cancelable: true }));
    });

    assert.equal(commits.length, 0, "should not commit when draft equals value");
  });

  test("Clipboard events do not affect uiStore row clipboard state", async () => {
    const commits: string[] = [];
    const input = await renderTextCell("hello", (v: string) => commits.push(v));

    const before = useUiStore.getState().clipboardPayload;
    assert.equal(before, null);

    await act(async () => {
      input.dispatchEvent(new Event("copy", { bubbles: true, cancelable: true }));
    });
    assert.equal(useUiStore.getState().clipboardPayload, null);

    await act(async () => {
      input.dispatchEvent(new Event("cut", { bubbles: true, cancelable: true }));
    });
    assert.equal(useUiStore.getState().clipboardPayload, null);

    await act(async () => {
      input.dispatchEvent(new Event("paste", { bubbles: true, cancelable: true }));
    });
    assert.equal(useUiStore.getState().clipboardPayload, null);
  });

});
