import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "node:test";
import { JSDOM } from "jsdom";
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { WorkspaceCard } from "../../components/workspace/WorkspaceCard.js";
import type { WorkspaceIndexEntry } from "../../types/workspace.js";

// ---------------------------------------------------------------------------
// JSDOM setup (following rowContextMenu.test.tsx pattern)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Factory helper
// ---------------------------------------------------------------------------

function entry(overrides: Partial<WorkspaceIndexEntry> = {}): WorkspaceIndexEntry {
  return {
    id: "ws_test" as WorkspaceIndexEntry["id"],
    title: "Test Workspace",
    order: 0,
    style: {},
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("WorkspaceCard drag contract", () => {
  test("sets drag data before notifying drag start", async () => {
    let started = false;
    const calls: Array<[string, string]> = [];
    const dataTransfer = {
      effectAllowed: "uninitialized",
      setData: (format: string, value: string) => {
        calls.push([format, value]);
      },
    };

    await renderNode(
      <WorkspaceCard
        entry={entry({ id: "ws_drag" as WorkspaceIndexEntry["id"] })}
        active={false}
        dragging={false}
        dropTarget={false}
        onOpenMenu={() => {}}
        onSelect={() => {}}
        onDragStart={() => {
          started = true;
        }}
        onDragEnd={() => {}}
        onDrop={() => {}}
        onDragOver={() => {}}
      />,
    );

    const button = document.querySelector('[role="button"]');
    assert.ok(button);
    const event = new dom.window.Event("dragstart", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "dataTransfer", {
      configurable: true,
      value: dataTransfer,
    });

    await act(async () => {
      button.dispatchEvent(event);
    });

    assert.equal(dataTransfer.effectAllowed, "move");
    assert.deepEqual(calls, [["text/plain", "ws_drag"]]);
    assert.equal(started, true);
  });
});

describe("WorkspaceCard alert badge", () => {
  test("hides badge when alertSummary is null", async () => {
    await renderNode(
      <WorkspaceCard
        entry={entry({ alertSummary: null })}
        active={false}
        dragging={false}
        dropTarget={false}
        onOpenMenu={() => {}}
        onSelect={() => {}}
        onDragStart={() => {}}
        onDragEnd={() => {}}
        onDrop={() => {}}
        onDragOver={() => {}}
      />,
    );

    const badge = document.querySelector('[data-testid="alert-badge"]');
    assert.equal(badge, null);
  });

  test("hides badge when alertSummary is undefined", async () => {
    await renderNode(
      <WorkspaceCard
        entry={entry({ alertSummary: undefined })}
        active={false}
        dragging={false}
        dropTarget={false}
        onOpenMenu={() => {}}
        onSelect={() => {}}
        onDragStart={() => {}}
        onDragEnd={() => {}}
        onDrop={() => {}}
        onDragOver={() => {}}
      />,
    );

    const badge = document.querySelector('[data-testid="alert-badge"]');
    assert.equal(badge, null);
  });

  test("hides badge when count is 0", async () => {
    await renderNode(
      <WorkspaceCard
        entry={entry({ alertSummary: { count: 0 } })}
        active={false}
        dragging={false}
        dropTarget={false}
        onOpenMenu={() => {}}
        onSelect={() => {}}
        onDragStart={() => {}}
        onDragEnd={() => {}}
        onDrop={() => {}}
        onDragOver={() => {}}
      />,
    );

    const badge = document.querySelector('[data-testid="alert-badge"]');
    assert.equal(badge, null);
  });

  test("shows single alert with count 1", async () => {
    await renderNode(
      <WorkspaceCard
        entry={entry({ alertSummary: { count: 1 } })}
        active={false}
        dragging={false}
        dropTarget={false}
        onOpenMenu={() => {}}
        onSelect={() => {}}
        onDragStart={() => {}}
        onDragEnd={() => {}}
        onDrop={() => {}}
        onDragOver={() => {}}
      />,
    );

    const badge = document.querySelector('[data-testid="alert-badge"]');
    assert.ok(badge);

    const countEl = document.querySelector('[data-testid="alert-count"]');
    assert.ok(countEl);
    assert.equal(countEl.textContent, "1");
  });

  test("shows multiple alerts with correct count", async () => {
    await renderNode(
      <WorkspaceCard
        entry={entry({ alertSummary: { count: 5 } })}
        active={false}
        dragging={false}
        dropTarget={false}
        onOpenMenu={() => {}}
        onSelect={() => {}}
        onDragStart={() => {}}
        onDragEnd={() => {}}
        onDrop={() => {}}
        onDragOver={() => {}}
      />,
    );

    const countEl = document.querySelector('[data-testid="alert-count"]');
    assert.ok(countEl);
    assert.equal(countEl.textContent, "5");
  });

  test("caps large count at 99+", async () => {
    await renderNode(
      <WorkspaceCard
        entry={entry({ alertSummary: { count: 150 } })}
        active={false}
        dragging={false}
        dropTarget={false}
        onOpenMenu={() => {}}
        onSelect={() => {}}
        onDragStart={() => {}}
        onDragEnd={() => {}}
        onDrop={() => {}}
        onDragOver={() => {}}
      />,
    );

    const countEl = document.querySelector('[data-testid="alert-count"]');
    assert.ok(countEl);
    assert.equal(countEl.textContent, "99+");
  });

  test("shows note subtext when present", async () => {
    await renderNode(
      <WorkspaceCard
        entry={entry({ alertSummary: { count: 3, note: "Due today" } })}
        active={false}
        dragging={false}
        dropTarget={false}
        onOpenMenu={() => {}}
        onSelect={() => {}}
        onDragStart={() => {}}
        onDragEnd={() => {}}
        onDrop={() => {}}
        onDragOver={() => {}}
      />,
    );

    const noteEl = document.querySelector('[data-testid="alert-note"]');
    assert.ok(noteEl);
    assert.equal(noteEl.textContent, "Due today");
  });

  test("hides note subtext when absent", async () => {
    await renderNode(
      <WorkspaceCard
        entry={entry({ alertSummary: { count: 2 } })}
        active={false}
        dragging={false}
        dropTarget={false}
        onOpenMenu={() => {}}
        onSelect={() => {}}
        onDragStart={() => {}}
        onDragEnd={() => {}}
        onDrop={() => {}}
        onDragOver={() => {}}
      />,
    );

    const noteEl = document.querySelector('[data-testid="alert-note"]');
    assert.equal(noteEl, null);
  });

  test("sets correct aria-label for single alert", async () => {
    await renderNode(
      <WorkspaceCard
        entry={entry({ alertSummary: { count: 1 } })}
        active={false}
        dragging={false}
        dropTarget={false}
        onOpenMenu={() => {}}
        onSelect={() => {}}
        onDragStart={() => {}}
        onDragEnd={() => {}}
        onDrop={() => {}}
        onDragOver={() => {}}
      />,
    );

    const badgeEl = document.querySelector('[data-testid="alert-badge"] > div');
    assert.ok(badgeEl);
    assert.equal(badgeEl.getAttribute("aria-label"), "1 active alert");
  });

  test("sets correct aria-label for multiple alerts", async () => {
    await renderNode(
      <WorkspaceCard
        entry={entry({ alertSummary: { count: 3 } })}
        active={false}
        dragging={false}
        dropTarget={false}
        onOpenMenu={() => {}}
        onSelect={() => {}}
        onDragStart={() => {}}
        onDragEnd={() => {}}
        onDrop={() => {}}
        onDragOver={() => {}}
      />,
    );

    const badgeEl = document.querySelector('[data-testid="alert-badge"] > div');
    assert.ok(badgeEl);
    assert.equal(badgeEl.getAttribute("aria-label"), "3 active alerts");
  });

  test("note has correct aria-label", async () => {
    await renderNode(
      <WorkspaceCard
        entry={entry({ alertSummary: { count: 1, note: "Overdue" } })}
        active={false}
        dragging={false}
        dropTarget={false}
        onOpenMenu={() => {}}
        onSelect={() => {}}
        onDragStart={() => {}}
        onDragEnd={() => {}}
        onDrop={() => {}}
        onDragOver={() => {}}
      />,
    );

    const noteEl = document.querySelector('[data-testid="alert-note"]');
    assert.ok(noteEl);
    assert.equal(noteEl.getAttribute("aria-label"), "Note: Overdue");
  });

  test("renders inside WorkspaceCard without breaking other content", async () => {
    await renderNode(
      <WorkspaceCard
        entry={entry({
          title: "My Workspace",
          alertSummary: { count: 2, note: "Overdue" },
        })}
        active={false}
        dragging={false}
        dropTarget={false}
        onOpenMenu={() => {}}
        onSelect={() => {}}
        onDragStart={() => {}}
        onDragEnd={() => {}}
        onDrop={() => {}}
        onDragOver={() => {}}
      />,
    );

    // The card renders the title normally
    const button = document.querySelector('[role="button"]');
    assert.ok(button);
    assert.ok(button.textContent?.includes("My Workspace"));

    // Badge is present
    const badge = document.querySelector('[data-testid="alert-badge"]');
    assert.ok(badge);

    // Note is present
    const note = document.querySelector('[data-testid="alert-note"]');
    assert.ok(note);
    assert.equal(note?.textContent, "Overdue");
  });
});
