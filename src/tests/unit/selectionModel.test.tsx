import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "node:test";
import { JSDOM } from "jsdom";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MainPane } from "../../components/layout/MainPane.js";
import { createBlockTemplate } from "../../domain/templates/blockTemplates.js";
import { useDocumentStore } from "../../stores/documentStore.js";
import { useUiStore } from "../../stores/uiStore.js";

const initialDocumentState = useDocumentStore.getState();
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

async function renderMainPane() {
  const container = document.getElementById("root");
  assert.ok(container);
  root = createRoot(container);
  await act(async () => {
    root?.render(<MainPane />);
  });
}

beforeEach(() => {
  dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
    url: "http://localhost/",
  });
  installDomGlobals(dom.window as unknown as Window & typeof globalThis);
});

afterEach(async () => {
  await act(async () => {
    root?.unmount();
  });
  root = null;
  useDocumentStore.setState(initialDocumentState);
  useUiStore.setState(initialUiState);
});

describe("selection model ui", () => {
  test("clicking block header selects block", async () => {
    const block = createBlockTemplate("basic_checklist", "ws_home", {
      blockId: "block_home",
      title: "Today",
      order: 0,
    });

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
          workspaceBackground: "#1F2937",
          workspaceTextColor: "#F9FAFB",
          workspaceAccentColor: "#60A5FA",
        },
      },
      workspaceIndex: [
        {
          id: "ws_home",
          title: "Home",
          order: 0,
          style: {
            background: "#1F2937",
            textColor: "#F9FAFB",
            accentStripe: { enabled: true, color: "#60A5FA" },
          },
        },
      ],
      workspacesById: {
        ws_home: {
          id: "ws_home",
          blocks: [block],
        },
      },
      loadedWorkspaceIds: ["ws_home"],
      activeWorkspaceId: "ws_home",
    });

    await renderMainPane();

    const header = document.querySelector('[data-testid="block-header-block_home"]') as HTMLElement | null;
    assert.ok(header);

    await act(async () => {
      header.click();
    });

    const selection = useUiStore.getState().selection;
    assert.equal(selection.kind, "block");
    assert.equal((selection as Extract<typeof selection, { kind: "block" }>).blockId, "block_home");
  });

  test("clicking column header selects column", async () => {
    const block = createBlockTemplate("basic_checklist", "ws_home", {
      blockId: "block_home",
      title: "Today",
      order: 0,
    });
    const textColumnId = block.columns.find((c) => c.type === "text")?.id;
    assert.ok(textColumnId);

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
          workspaceBackground: "#1F2937",
          workspaceTextColor: "#F9FAFB",
          workspaceAccentColor: "#60A5FA",
        },
      },
      workspaceIndex: [
        {
          id: "ws_home",
          title: "Home",
          order: 0,
          style: {
            background: "#1F2937",
            textColor: "#F9FAFB",
            accentStripe: { enabled: true, color: "#60A5FA" },
          },
        },
      ],
      workspacesById: {
        ws_home: {
          id: "ws_home",
          blocks: [block],
        },
      },
      loadedWorkspaceIds: ["ws_home"],
      activeWorkspaceId: "ws_home",
    });

    await renderMainPane();

    const columnHeader = document.querySelector(
      `[data-testid="column-header-${textColumnId}"]`
    ) as HTMLElement | null;
    assert.ok(columnHeader);

    await act(async () => {
      columnHeader.click();
    });

    const selection = useUiStore.getState().selection;
    assert.equal(selection.kind, "column");
    assert.equal((selection as Extract<typeof selection, { kind: "column" }>).columnId, textColumnId);
  });

  test("clicking row surface selects row", async () => {
    const block = createBlockTemplate("basic_checklist", "ws_home", {
      blockId: "block_home",
      title: "Today",
      order: 0,
    });
    const rowId = block.rows[0]?.id;
    assert.ok(rowId);

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
          workspaceBackground: "#1F2937",
          workspaceTextColor: "#F9FAFB",
          workspaceAccentColor: "#60A5FA",
        },
      },
      workspaceIndex: [
        {
          id: "ws_home",
          title: "Home",
          order: 0,
          style: {
            background: "#1F2937",
            textColor: "#F9FAFB",
            accentStripe: { enabled: true, color: "#60A5FA" },
          },
        },
      ],
      workspacesById: {
        ws_home: {
          id: "ws_home",
          blocks: [block],
        },
      },
      loadedWorkspaceIds: ["ws_home"],
      activeWorkspaceId: "ws_home",
    });

    await renderMainPane();

    const row = document.querySelector(`[data-testid="row-${rowId}"]`) as HTMLElement | null;
    assert.ok(row);

    await act(async () => {
      row.click();
    });

    const selection = useUiStore.getState().selection;
    assert.equal(selection.kind, "row");
    assert.equal((selection as Extract<typeof selection, { kind: "row" }>).rowId, rowId);
  });

  test("clicking cell selects cell and replaces row selection", async () => {
    const block = createBlockTemplate("basic_checklist", "ws_home", {
      blockId: "block_home",
      title: "Today",
      order: 0,
    });
    const rowId = block.rows[0]?.id;
    const textColumnId = block.columns.find((c) => c.type === "text")?.id;
    assert.ok(rowId);
    assert.ok(textColumnId);

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
          workspaceBackground: "#1F2937",
          workspaceTextColor: "#F9FAFB",
          workspaceAccentColor: "#60A5FA",
        },
      },
      workspaceIndex: [
        {
          id: "ws_home",
          title: "Home",
          order: 0,
          style: {
            background: "#1F2937",
            textColor: "#F9FAFB",
            accentStripe: { enabled: true, color: "#60A5FA" },
          },
        },
      ],
      workspacesById: {
        ws_home: {
          id: "ws_home",
          blocks: [block],
        },
      },
      loadedWorkspaceIds: ["ws_home"],
      activeWorkspaceId: "ws_home",
    });

    await renderMainPane();

    const cell = document.querySelector(
      `[data-testid="cell-${rowId}-${textColumnId}"]`
    ) as HTMLElement | null;
    assert.ok(cell);

    await act(async () => {
      cell.click();
    });

    const selection = useUiStore.getState().selection;
    assert.equal(selection.kind, "cell");
    const cellSelection = selection as Extract<typeof selection, { kind: "cell" }>;
    assert.equal(cellSelection.rowId, rowId);
    assert.equal(cellSelection.columnId, textColumnId);
  });

  test("selection styling appears on active targets", async () => {
    const block = createBlockTemplate("basic_checklist", "ws_home", {
      blockId: "block_home",
      title: "Today",
      order: 0,
    });
    const rowId = block.rows[0]?.id;
    const textColumnId = block.columns.find((c) => c.type === "text")?.id;
    assert.ok(rowId);
    assert.ok(textColumnId);

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
          workspaceBackground: "#1F2937",
          workspaceTextColor: "#F9FAFB",
          workspaceAccentColor: "#60A5FA",
        },
      },
      workspaceIndex: [
        {
          id: "ws_home",
          title: "Home",
          order: 0,
          style: {
            background: "#1F2937",
            textColor: "#F9FAFB",
            accentStripe: { enabled: true, color: "#60A5FA" },
          },
        },
      ],
      workspacesById: {
        ws_home: {
          id: "ws_home",
          blocks: [block],
        },
      },
      loadedWorkspaceIds: ["ws_home"],
      activeWorkspaceId: "ws_home",
    });

    await renderMainPane();

    const blockCard = document.querySelector('[data-testid="block-card-block_home"]') as HTMLElement | null;
    assert.ok(blockCard);
    assert.equal(blockCard.className.includes("ring-accent"), false);

    const header = document.querySelector('[data-testid="block-header-block_home"]') as HTMLElement | null;
    assert.ok(header);
    await act(async () => {
      header.click();
    });
    assert.ok(blockCard.className.includes("ring-accent"));

    const columnHeader = document.querySelector(
      `[data-testid="column-header-${textColumnId}"]`
    ) as HTMLElement | null;
    assert.ok(columnHeader);
    await act(async () => {
      columnHeader.click();
    });
    assert.ok(columnHeader.className.includes("bg-accent"));

    const row = document.querySelector(`[data-testid="row-${rowId}"]`) as HTMLElement | null;
    assert.ok(row);
    await act(async () => {
      row.click();
    });
    assert.ok(row.className.includes("bg-accent"));

    const cell = document.querySelector(
      `[data-testid="cell-${rowId}-${textColumnId}"]`
    ) as HTMLElement | null;
    assert.ok(cell);
    await act(async () => {
      cell.click();
    });
    assert.ok(cell.className.includes("ring-accent"));
  });

  test("block menu still opens after selection is introduced", async () => {
    const block = createBlockTemplate("basic_checklist", "ws_home", {
      blockId: "block_home",
      title: "Today",
      order: 0,
    });

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
          workspaceBackground: "#1F2937",
          workspaceTextColor: "#F9FAFB",
          workspaceAccentColor: "#60A5FA",
        },
      },
      workspaceIndex: [
        {
          id: "ws_home",
          title: "Home",
          order: 0,
          style: {
            background: "#1F2937",
            textColor: "#F9FAFB",
            accentStripe: { enabled: true, color: "#60A5FA" },
          },
        },
      ],
      workspacesById: {
        ws_home: {
          id: "ws_home",
          blocks: [block],
        },
      },
      loadedWorkspaceIds: ["ws_home"],
      activeWorkspaceId: "ws_home",
    });
    useUiStore.setState({ blockMenu: null });

    await renderMainPane();

    const menuButton = document.querySelector(
      "button"
    ) as HTMLButtonElement | null;
    assert.ok(menuButton);

    await act(async () => {
      useUiStore.getState().openBlockMenu("ws_home", "block_home", 10, 10);
    });

    assert.equal(useUiStore.getState().blockMenu?.blockId, "block_home");
  });

  test("row drag handle still sets ui drag state after selection is introduced", async () => {
    const block = createBlockTemplate("basic_checklist", "ws_home", {
      blockId: "block_home",
      title: "Today",
      order: 0,
    });
    const rowId = block.rows[0]?.id;
    assert.ok(rowId);

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
          workspaceBackground: "#1F2937",
          workspaceTextColor: "#F9FAFB",
          workspaceAccentColor: "#60A5FA",
        },
      },
      workspaceIndex: [
        {
          id: "ws_home",
          title: "Home",
          order: 0,
          style: {
            background: "#1F2937",
            textColor: "#F9FAFB",
            accentStripe: { enabled: true, color: "#60A5FA" },
          },
        },
      ],
      workspacesById: {
        ws_home: {
          id: "ws_home",
          blocks: [block],
        },
      },
      loadedWorkspaceIds: ["ws_home"],
      activeWorkspaceId: "ws_home",
    });

    await renderMainPane();

    const dragHandle = document.querySelector(
      `[data-testid="row-drag-handle-${rowId}"]`
    ) as HTMLButtonElement | null;
    assert.ok(dragHandle);

    const dragStart = new Event("dragstart", { bubbles: true }) as DragEvent;
    Object.defineProperty(dragStart, "target", { value: dragHandle, configurable: true });
    await act(async () => {
      dragHandle.dispatchEvent(dragStart);
    });

    assert.equal(useUiStore.getState().draggingRowBlockId, "block_home");
    assert.equal(useUiStore.getState().draggingRowId, rowId);
  });
});
