import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "node:test";
import { JSDOM } from "jsdom";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { BlockColumnHeaderRow } from "../../components/block/BlockColumnHeaderRow.js";
import { MainPane } from "../../components/layout/MainPane.js";
import { createBlockTemplate } from "../../domain/templates/blockTemplates.js";
import type { BlockSort } from "../../types/block.js";
import type { ColumnDefinition } from "../../types/column.js";
import { createMemoryStorageService } from "../../services/storage/index.js";
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

async function renderNode(element: React.ReactNode) {
  const container = document.getElementById("root");
  assert.ok(container);
  root = createRoot(container);

  await act(async () => {
    root?.render(element);
  });
}

async function dispatchClick(element: Element) {
  await act(async () => {
    element.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
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
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  await act(async () => {
    root?.unmount();
  });
  root = null;

  await act(async () => {
    useDocumentStore.setState(initialDocumentState);
    useUiStore.setState(initialUiState);
  });
});

describe("block header sort", () => {
  test("clicking a sortable header sorts rows ascending, then toggles to descending", async () => {
    const service = await createMemoryStorageService();
    await useDocumentStore.getState().initializeAppData(service);

    const checklist = createBlockTemplate("basic_checklist", "ws_home", {
      blockId: "block_home",
      title: "Today",
      order: 0,
    });
    const textColumn = checklist.columns.find((column) => column.type === "text");
    assert.ok(textColumn);
    const checkboxColumn = checklist.columns.find((column) => column.type === "checkbox");
    assert.ok(checkboxColumn);
    const baseRow = checklist.rows[0];
    assert.ok(baseRow);

    checklist.rows = [
      {
        ...structuredClone(baseRow),
        id: "row_zulu",
        order: 0,
        cells: {
          [checkboxColumn.id]: { value: false, format: {} },
          [textColumn.id]: { value: "Zulu", format: {} },
        },
      },
      {
        ...structuredClone(baseRow),
        id: "row_alpha",
        order: 1,
        cells: {
          [checkboxColumn.id]: { value: false, format: {} },
          [textColumn.id]: { value: "Alpha", format: {} },
        },
      },
      {
        ...structuredClone(baseRow),
        id: "row_mike",
        order: 2,
        cells: {
          [checkboxColumn.id]: { value: false, format: {} },
          [textColumn.id]: { value: "Mike", format: {} },
        },
      },
    ];

    useDocumentStore.setState({
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
          blocks: [checklist],
        },
      },
      loadedWorkspaceIds: ["ws_home"],
      activeWorkspaceId: "ws_home",
    });
    useUiStore.setState({
      workspaceMenu: null,
      blockMenu: null,
      columnMenu: null,
      draggingWorkspaceId: null,
      dropTargetWorkspaceId: null,
      draggingBlockId: null,
      dropTargetBlockId: null,
      screen: "main",
      inspectorOpen: false,
      selection: { kind: "none" },
    });

    await renderNode(<MainPane />);

    // --- First click: sort ascending ---
    const textHeader = document.querySelector(
      `[data-testid="column-header-${textColumn.id}"]`
    ) as HTMLElement | null;
    assert.ok(textHeader);

    await dispatchClick(textHeader);

    // Rows should now be in alphabetical order: Alpha, Mike, Zulu
    const stateAfterAsc = useDocumentStore.getState();
    const sortedRows = stateAfterAsc.workspacesById.ws_home?.blocks[0]?.rows ?? [];
    assert.deepEqual(sortedRows.map((row) => row.id), ["row_alpha", "row_mike", "row_zulu"]);
    assert.deepEqual(sortedRows.map((row) => row.order), [0, 1, 2]);
    assert.deepEqual(
      stateAfterAsc.workspacesById.ws_home?.blocks[0]?.sort,
      { columnId: textColumn.id, direction: "asc" }
    );

    // Header should show asc indicator
    assert.equal(
      textHeader.getAttribute("data-sort-direction"),
      "asc"
    );

    // --- Second click: toggle to descending ---
    await dispatchClick(textHeader);

    const stateAfterDesc = useDocumentStore.getState();
    const descRows = stateAfterDesc.workspacesById.ws_home?.blocks[0]?.rows ?? [];
    assert.deepEqual(descRows.map((row) => row.id), ["row_zulu", "row_mike", "row_alpha"]);
    assert.deepEqual(descRows.map((row) => row.order), [0, 1, 2]);
    assert.deepEqual(
      stateAfterDesc.workspacesById.ws_home?.blocks[0]?.sort,
      { columnId: textColumn.id, direction: "desc" }
    );

    assert.equal(
      textHeader.getAttribute("data-sort-direction"),
      "desc"
    );
  });

  test("clicking a marker header does not trigger sort or show sort indicator", async () => {
    const service = await createMemoryStorageService();
    await useDocumentStore.getState().initializeAppData(service);

    const numberedList = createBlockTemplate("numbered_list", "ws_home", {
      blockId: "block_num",
      title: "Steps",
      order: 0,
    });
    const numberedColumn = numberedList.columns.find((column) => column.type === "numbered");
    assert.ok(numberedColumn);
    const textColumn = numberedList.columns.find((column) => column.type === "text");
    assert.ok(textColumn);

    useDocumentStore.setState({
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
          blocks: [numberedList],
        },
      },
      loadedWorkspaceIds: ["ws_home"],
      activeWorkspaceId: "ws_home",
    });
    useUiStore.setState({
      workspaceMenu: null,
      blockMenu: null,
      columnMenu: null,
      draggingWorkspaceId: null,
      dropTargetWorkspaceId: null,
      draggingBlockId: null,
      dropTargetBlockId: null,
      screen: "main",
      inspectorOpen: false,
      selection: { kind: "none" },
    });

    await renderNode(<MainPane />);

    const numberedHeader = document.querySelector(
      `[data-testid="column-header-${numberedColumn.id}"]`
    ) as HTMLElement | null;
    assert.ok(numberedHeader);

    // Marker header should NOT have data-sort-direction
    assert.equal(numberedHeader.hasAttribute("data-sort-direction"), false);

    await dispatchClick(numberedHeader);

    // block.sort should remain null (no sort triggered)
    const state = useDocumentStore.getState();
    const block = state.workspacesById.ws_home?.blocks[0];
    assert.ok(block);
    assert.equal(block.sort, null);

    // data-sort-direction should still be absent
    assert.equal(numberedHeader.hasAttribute("data-sort-direction"), false);
  });
});

describe("BlockColumnHeaderRow aria-label and empty-label fallback", () => {
  test("active-sort aria-label has no stray space before comma", async () => {
    const col: ColumnDefinition = {
      id: "col_text",
      type: "text",
      label: "Task",
      order: 0,
      width: 100,
      visible: true,
      settings: {},
      format: {},
    };
    const sort: BlockSort = { columnId: "col_text", direction: "asc" };

    await renderNode(
      <BlockColumnHeaderRow
        blockId="block_test"
        columns={[col]}
        workspaceId="ws_test"
        sort={sort}
      />
    );

    const header = document.querySelector('[data-testid="column-header-col_text"]') as HTMLElement;
    assert.ok(header);
    assert.equal(header.getAttribute("aria-label"), "Sort by Task, currently ascending");
  });

  test("empty-label sortable header renders type-name fallback and clean aria-label", async () => {
    const col: ColumnDefinition = {
      id: "col_text",
      type: "text",
      label: "",
      order: 0,
      width: 100,
      visible: true,
      settings: {},
      format: {},
    };

    await renderNode(
      <BlockColumnHeaderRow
        blockId="block_test"
        columns={[col]}
        workspaceId="ws_test"
        sort={null}
      />
    );

    const header = document.querySelector('[data-testid="column-header-col_text"]') as HTMLElement;
    assert.ok(header);
    assert.ok(header.textContent?.includes("Text"), "empty-label text column should show 'Text' fallback");
    assert.equal(header.getAttribute("aria-label"), "Sort by Text");
  });
});
