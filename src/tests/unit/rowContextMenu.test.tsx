import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "node:test";
import { JSDOM } from "jsdom";
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { RowContextMenu } from "../../components/row/RowContextMenu.js";

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

async function renderNode(element: ReactNode) {
  const container = document.getElementById("root");
  assert.ok(container);
  root = createRoot(container);

  await act(async () => {
    root?.render(element);
  });
}

beforeEach(() => {
  dom = new JSDOM("<!doctype html><html><body><div id=\"root\"></div></body></html>", {
    url: "http://localhost/",
  });
  installDomGlobals(dom.window as unknown as Window & typeof globalThis);
});

afterEach(async () => {
  await act(async () => {
    root?.unmount();
  });
  root = null;
});

describe("RowContextMenu rendering", () => {
  test("disables Cut and Copy when canCutOrCopy is false, enables Paste when canPaste is true", async () => {
    await renderNode(
      <RowContextMenu
        canCutOrCopy={false}
        canPaste={true}
        onCopy={() => {}}
        onCut={() => {}}
        onPaste={() => {}}
      />
    );

    const menu = document.querySelector('[data-testid="row-context-menu"]');
    assert.ok(menu);

    const cutButton = document.querySelector('[data-testid="row-menu-cut"]') as HTMLButtonElement | null;
    const copyButton = document.querySelector('[data-testid="row-menu-copy"]') as HTMLButtonElement | null;
    const pasteButton = document.querySelector('[data-testid="row-menu-paste"]') as HTMLButtonElement | null;

    assert.ok(cutButton);
    assert.ok(copyButton);
    assert.ok(pasteButton);

    assert.equal(cutButton.disabled, true);
    assert.equal(copyButton.disabled, true);
    assert.equal(pasteButton.disabled, false);
  });

  test("enables Cut and Copy when canCutOrCopy is true, disables Paste when canPaste is false", async () => {
    await renderNode(
      <RowContextMenu
        canCutOrCopy={true}
        canPaste={false}
        onCopy={() => {}}
        onCut={() => {}}
        onPaste={() => {}}
      />
    );

    const cutButton = document.querySelector('[data-testid="row-menu-cut"]') as HTMLButtonElement | null;
    const copyButton = document.querySelector('[data-testid="row-menu-copy"]') as HTMLButtonElement | null;
    const pasteButton = document.querySelector('[data-testid="row-menu-paste"]') as HTMLButtonElement | null;

    assert.ok(cutButton);
    assert.ok(copyButton);
    assert.ok(pasteButton);

    assert.equal(cutButton.disabled, false);
    assert.equal(copyButton.disabled, false);
    assert.equal(pasteButton.disabled, true);
  });

  test("disables all buttons when both canCutOrCopy and canPaste are false", async () => {
    await renderNode(
      <RowContextMenu
        canCutOrCopy={false}
        canPaste={false}
        onCopy={() => {}}
        onCut={() => {}}
        onPaste={() => {}}
      />
    );

    const cutButton = document.querySelector('[data-testid="row-menu-cut"]') as HTMLButtonElement | null;
    const copyButton = document.querySelector('[data-testid="row-menu-copy"]') as HTMLButtonElement | null;
    const pasteButton = document.querySelector('[data-testid="row-menu-paste"]') as HTMLButtonElement | null;

    assert.ok(cutButton);
    assert.ok(copyButton);
    assert.ok(pasteButton);

    assert.equal(cutButton.disabled, true);
    assert.equal(copyButton.disabled, true);
    assert.equal(pasteButton.disabled, true);
  });

  test("fires onCut, onCopy, and onPaste when enabled buttons are clicked", async () => {
    let cutCount = 0;
    let copyCount = 0;
    let pasteCount = 0;

    await renderNode(
      <RowContextMenu
        canCutOrCopy={true}
        canPaste={true}
        onCopy={() => {
          copyCount += 1;
        }}
        onCut={() => {
          cutCount += 1;
        }}
        onPaste={() => {
          pasteCount += 1;
        }}
      />
    );

    const cutButton = document.querySelector('[data-testid="row-menu-cut"]') as HTMLButtonElement | null;
    const copyButton = document.querySelector('[data-testid="row-menu-copy"]') as HTMLButtonElement | null;
    const pasteButton = document.querySelector('[data-testid="row-menu-paste"]') as HTMLButtonElement | null;

    assert.ok(cutButton);
    assert.ok(copyButton);
    assert.ok(pasteButton);

    await act(async () => {
      cutButton.click();
    });
    await act(async () => {
      copyButton.click();
    });
    await act(async () => {
      pasteButton.click();
    });

    assert.equal(cutCount, 1);
    assert.equal(copyCount, 1);
    assert.equal(pasteCount, 1);
  });

  test("does not fire handlers when disabled buttons are clicked", async () => {
    let cutCount = 0;
    let copyCount = 0;
    let pasteCount = 0;

    await renderNode(
      <RowContextMenu
        canCutOrCopy={false}
        canPaste={false}
        onCopy={() => {
          copyCount += 1;
        }}
        onCut={() => {
          cutCount += 1;
        }}
        onPaste={() => {
          pasteCount += 1;
        }}
      />
    );

    const cutButton = document.querySelector('[data-testid="row-menu-cut"]') as HTMLButtonElement | null;
    const copyButton = document.querySelector('[data-testid="row-menu-copy"]') as HTMLButtonElement | null;
    const pasteButton = document.querySelector('[data-testid="row-menu-paste"]') as HTMLButtonElement | null;

    assert.ok(cutButton);
    assert.ok(copyButton);
    assert.ok(pasteButton);

    await act(async () => {
      cutButton.click();
    });
    await act(async () => {
      copyButton.click();
    });
    await act(async () => {
      pasteButton.click();
    });

    assert.equal(cutCount, 0);
    assert.equal(copyCount, 0);
    assert.equal(pasteCount, 0);
  });
});
