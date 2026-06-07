import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "node:test";
import { JSDOM } from "jsdom";
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { LeftDock } from "../../components/layout/LeftDock.js";
import { MainPane } from "../../components/layout/MainPane.js";
import { createBlockTemplate } from "../../domain/templates/blockTemplates.js";
import { createMemoryStorageService } from "../../services/storage/index.js";
import { useDocumentStore } from "../../stores/documentStore.js";
import { useUiStore } from "../../stores/uiStore.js";
import { createColumn } from "../../domain/columns/createColumn.js";

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

async function renderNode(element: ReactNode) {
  const container = document.getElementById("root");
  assert.ok(container);
  root = createRoot(container);

  await act(async () => {
    root?.render(element);
  });
}

async function dispatchPointerDown(element: Element) {
  await act(async () => {
    element.dispatchEvent(new window.PointerEvent("pointerdown", { bubbles: true }));
  });
}

async function dispatchClick(element: Element) {
  await act(async () => {
    element.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  });
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

beforeEach(() => {
  dom = new JSDOM("<!doctype html><html><body><div id=\"root\"></div></body></html>", {
    url: "http://localhost/",
  });
  installDomGlobals(dom.window as unknown as Window & typeof globalThis);
});

afterEach(async () => {
  // Flush pending timers (rAF polyfilled to setTimeout 0) while the
  // React tree is still active, so callbacks fire inside act().
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

describe("context menu dismissal", () => {
  test("workspace menu uses a backdrop so outside dismissal does not change selection", async () => {
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
        {
          id: "ws_work",
          title: "Work",
          order: 1,
          style: {
            background: "#111827",
            textColor: "#F9FAFB",
            accentStripe: { enabled: true, color: "#34D399" },
          },
        },
      ],
      workspacesById: {
        ws_home: { id: "ws_home", blocks: [] },
        ws_work: { id: "ws_work", blocks: [] },
      },
      loadedWorkspaceIds: ["ws_home", "ws_work"],
      activeWorkspaceId: "ws_home",
    });
    useUiStore.setState({
      workspaceMenu: {
        workspaceId: "ws_home",
        x: 24,
        y: 24,
      },
      blockMenu: null,
      draggingWorkspaceId: null,
      dropTargetWorkspaceId: null,
      draggingBlockId: null,
      dropTargetBlockId: null,
      screen: "main",
      inspectorOpen: false,
    });

    await renderNode(<LeftDock />);

    const backdrop = document.querySelector('[data-testid="workspace-menu-backdrop"]');
    assert.ok(backdrop);

    await dispatchPointerDown(backdrop);

    assert.equal(useUiStore.getState().workspaceMenu, null);
    assert.equal(useDocumentStore.getState().activeWorkspaceId, "ws_home");
    assert.equal(document.querySelector('[data-testid="workspace-menu-backdrop"]'), null);
  });

  test("block menu uses a backdrop so outside dismissal does not mutate block state", async () => {
    const checklist = createBlockTemplate("basic_checklist", "ws_home", {
      blockId: "block_home",
      title: "Today",
      order: 0,
    });
    const bullets = createBlockTemplate("bulleted_list", "ws_home", {
      blockId: "block_notes",
      title: "Notes",
      order: 1,
    });

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
          blocks: [checklist, bullets],
        },
      },
      loadedWorkspaceIds: ["ws_home"],
      activeWorkspaceId: "ws_home",
    });
    useUiStore.setState({
      workspaceMenu: null,
      blockMenu: null,
      draggingWorkspaceId: null,
      dropTargetWorkspaceId: null,
      draggingBlockId: null,
      dropTargetBlockId: null,
      screen: "main",
      inspectorOpen: false,
    });

    await renderNode(<MainPane />);

    await act(async () => {
      useUiStore.getState().openBlockMenu("ws_home", "block_home", 36, 36);
    });

    const backdrop = document.querySelector('[data-testid="block-menu-backdrop"]');
    assert.ok(backdrop);

    await dispatchPointerDown(backdrop);

    assert.equal(useUiStore.getState().blockMenu, null);
    const blocks = useDocumentStore.getState().workspacesById.ws_home?.blocks ?? [];
    assert.deepEqual(
      blocks.map((block) => ({ id: block.id, title: block.title, collapsed: block.collapsed })),
      [
        { id: "block_home", title: "Today", collapsed: false },
        { id: "block_notes", title: "Notes", collapsed: false },
      ]
    );
    assert.equal(document.querySelector('[data-testid="block-menu-backdrop"]'), null);
  });

  test("workspace menu rename action renames the workspace and closes the menu", async () => {
    const service = await createMemoryStorageService();
    await useDocumentStore.getState().initializeAppData(service);

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
        {
          id: "ws_work",
          title: "Work",
          order: 1,
          style: {
            background: "#111827",
            textColor: "#F9FAFB",
            accentStripe: { enabled: true, color: "#34D399" },
          },
        },
      ],
      workspacesById: {
        ws_home: { id: "ws_home", blocks: [] },
        ws_work: { id: "ws_work", blocks: [] },
      },
      loadedWorkspaceIds: ["ws_home", "ws_work"],
      activeWorkspaceId: "ws_home",
    });
    useUiStore.setState({
      workspaceMenu: {
        workspaceId: "ws_home",
        x: 24,
        y: 24,
      },
      blockMenu: null,
      draggingWorkspaceId: null,
      dropTargetWorkspaceId: null,
      draggingBlockId: null,
      dropTargetBlockId: null,
      screen: "main",
      inspectorOpen: false,
    });

    const originalPrompt = window.prompt;
    window.prompt = () => "Renamed Home";

    await renderNode(<LeftDock />);

    const renameButton = Array.from(document.querySelectorAll("button")).find(
      (btn) => btn.textContent === "Rename workspace"
    );
    assert.ok(renameButton);

    await dispatchClick(renameButton);

    const state = useDocumentStore.getState();
    const renamed = state.workspaceIndex.find((entry) => entry.id === "ws_home");
    assert.ok(renamed);
    assert.equal(renamed.title, "Renamed Home");
    assert.equal(useUiStore.getState().workspaceMenu, null);

    window.prompt = originalPrompt;
  });

  test("workspace menu delete action removes the workspace and closes the menu", async () => {
    const service = await createMemoryStorageService();
    await useDocumentStore.getState().initializeAppData(service);

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
        {
          id: "ws_work",
          title: "Work",
          order: 1,
          style: {
            background: "#111827",
            textColor: "#F9FAFB",
            accentStripe: { enabled: true, color: "#34D399" },
          },
        },
      ],
      workspacesById: {
        ws_home: { id: "ws_home", blocks: [] },
        ws_work: { id: "ws_work", blocks: [] },
      },
      loadedWorkspaceIds: ["ws_home", "ws_work"],
      activeWorkspaceId: "ws_home",
    });
    useUiStore.setState({
      workspaceMenu: {
        workspaceId: "ws_home",
        x: 24,
        y: 24,
      },
      blockMenu: null,
      draggingWorkspaceId: null,
      dropTargetWorkspaceId: null,
      draggingBlockId: null,
      dropTargetBlockId: null,
      screen: "main",
      inspectorOpen: false,
    });

    const originalConfirm = window.confirm;
    window.confirm = () => true;

    await renderNode(<LeftDock />);

    const deleteButton = Array.from(document.querySelectorAll("button")).find(
      (btn) => btn.textContent === "Delete workspace"
    );
    assert.ok(deleteButton);

    await dispatchClick(deleteButton);

    const state = useDocumentStore.getState();
    assert.equal(state.workspaceIndex.some((entry) => entry.id === "ws_home"), false);
    assert.equal(useUiStore.getState().workspaceMenu, null);

    window.confirm = originalConfirm;
  });

  test("workspace menu delete does not remove workspace when confirm returns false", async () => {
    const service = await createMemoryStorageService();
    await useDocumentStore.getState().initializeAppData(service);

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
        {
          id: "ws_work",
          title: "Work",
          order: 1,
          style: {
            background: "#111827",
            textColor: "#F9FAFB",
            accentStripe: { enabled: true, color: "#34D399" },
          },
        },
      ],
      workspacesById: {
        ws_home: { id: "ws_home", blocks: [] },
        ws_work: { id: "ws_work", blocks: [] },
      },
      loadedWorkspaceIds: ["ws_home", "ws_work"],
      activeWorkspaceId: "ws_home",
    });
    useUiStore.setState({
      workspaceMenu: {
        workspaceId: "ws_home",
        x: 24,
        y: 24,
      },
      blockMenu: null,
      draggingWorkspaceId: null,
      dropTargetWorkspaceId: null,
      draggingBlockId: null,
      dropTargetBlockId: null,
      screen: "main",
      inspectorOpen: false,
    });

    const originalConfirm = window.confirm;
    window.confirm = () => false;

    await renderNode(<LeftDock />);

    const deleteButton = Array.from(document.querySelectorAll("button")).find(
      (btn) => btn.textContent === "Delete workspace"
    );
    assert.ok(deleteButton);

    await dispatchClick(deleteButton);

    const state = useDocumentStore.getState();
    assert.equal(state.workspaceIndex.some((entry) => entry.id === "ws_home"), true);
    assert.equal(useUiStore.getState().workspaceMenu, null);

    window.confirm = originalConfirm;
  });

  test("block menu delete action removes the block and closes the menu", async () => {
    const service = await createMemoryStorageService();
    await useDocumentStore.getState().initializeAppData(service);

    const checklist = createBlockTemplate("basic_checklist", "ws_home", {
      blockId: "block_home",
      title: "Today",
      order: 0,
    });
    const bullets = createBlockTemplate("bulleted_list", "ws_home", {
      blockId: "block_notes",
      title: "Notes",
      order: 1,
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
          blocks: [checklist, bullets],
        },
      },
      loadedWorkspaceIds: ["ws_home"],
      activeWorkspaceId: "ws_home",
    });
    useUiStore.setState({
      workspaceMenu: null,
      blockMenu: null,
      draggingWorkspaceId: null,
      dropTargetWorkspaceId: null,
      draggingBlockId: null,
      dropTargetBlockId: null,
      screen: "main",
      inspectorOpen: false,
    });

    const originalConfirm = window.confirm;
    window.confirm = () => true;

    await renderNode(<MainPane />);

    await act(async () => {
      useUiStore.getState().openBlockMenu("ws_home", "block_home", 36, 36);
    });

    const deleteButton = Array.from(document.querySelectorAll("button")).find(
      (btn) => btn.textContent === "Delete block"
    );
    assert.ok(deleteButton);

    await dispatchClick(deleteButton);

    const state = useDocumentStore.getState();
    const blocks = state.workspacesById.ws_home?.blocks ?? [];
    assert.equal(blocks.some((block) => block.id === "block_home"), false);
    assert.equal(blocks.some((block) => block.id === "block_notes"), true);
    assert.equal(useUiStore.getState().blockMenu, null);

    window.confirm = originalConfirm;
  });

  test("block menu delete does not remove block when confirm returns false", async () => {
    const service = await createMemoryStorageService();
    await useDocumentStore.getState().initializeAppData(service);

    const checklist = createBlockTemplate("basic_checklist", "ws_home", {
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
          blocks: [checklist],
        },
      },
      loadedWorkspaceIds: ["ws_home"],
      activeWorkspaceId: "ws_home",
    });
    useUiStore.setState({
      workspaceMenu: null,
      blockMenu: null,
      draggingWorkspaceId: null,
      dropTargetWorkspaceId: null,
      draggingBlockId: null,
      dropTargetBlockId: null,
      screen: "main",
      inspectorOpen: false,
    });

    const originalConfirm = window.confirm;
    window.confirm = () => false;

    await renderNode(<MainPane />);

    await act(async () => {
      useUiStore.getState().openBlockMenu("ws_home", "block_home", 36, 36);
    });

    const deleteButton = Array.from(document.querySelectorAll("button")).find(
      (btn) => btn.textContent === "Delete block"
    );
    assert.ok(deleteButton);

    await dispatchClick(deleteButton);

    const state = useDocumentStore.getState();
    const blocks = state.workspacesById.ws_home?.blocks ?? [];
    assert.equal(blocks.some((block) => block.id === "block_home"), true);
    assert.equal(useUiStore.getState().blockMenu, null);

    window.confirm = originalConfirm;
  });

  test("block sort menu action sorts rows and closes the menu", async () => {
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
          [textColumn.id]: { value: "Zulu", format: { bold: true } },
        },
      },
      {
        ...structuredClone(baseRow),
        id: "row_alpha",
        order: 1,
        cells: {
          [checkboxColumn.id]: { value: false, format: {} },
          [textColumn.id]: { value: "Alpha", format: { bold: true } },
        },
      },
      {
        ...structuredClone(baseRow),
        id: "row_mike",
        order: 2,
        cells: {
          [checkboxColumn.id]: { value: false, format: {} },
          [textColumn.id]: { value: "Mike", format: { bold: true } },
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
    });

    await renderNode(<MainPane />);

    const sortButton = document.querySelector('[data-testid="sort-menu-block_home"]');
    assert.ok(sortButton);
    await dispatchClick(sortButton);

    const sortAction = document.querySelector(`[data-testid="sort-block_home-${textColumn.id}-asc"]`);
    assert.ok(sortAction);
    await dispatchClick(sortAction);

    const sortedRows = useDocumentStore.getState().workspacesById.ws_home?.blocks[0]?.rows ?? [];
    assert.deepEqual(sortedRows.map((row) => row.id), ["row_alpha", "row_mike", "row_zulu"]);
    assert.deepEqual(sortedRows.map((row) => row.order), [0, 1, 2]);
    assert.deepEqual(useDocumentStore.getState().workspacesById.ws_home?.blocks[0]?.sort, {
      columnId: textColumn.id,
      direction: "asc",
    });
    assert.equal(useUiStore.getState().blockMenu, null);
    await wait(300);
  });

  test("column menu uses a backdrop so outside dismissal does not mutate column state", async () => {
    const checklist = createBlockTemplate("basic_checklist", "ws_home", {
      blockId: "block_home",
      title: "Today",
      order: 0,
    });
    const customColumn = createColumn("text", { id: "col_custom", order: 3, label: "Custom" });
    checklist.columns = [...checklist.columns, customColumn];
    checklist.rows = checklist.rows.map((row) => ({
      ...row,
      cells: { ...row.cells, col_custom: { value: "", format: {} } },
    }));

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
    });

    await renderNode(<MainPane />);

    await act(async () => {
      useUiStore.getState().openColumnMenu("ws_home", "block_home", "col_custom", 36, 36);
    });

    const backdrop = document.querySelector('[data-testid="column-menu-backdrop"]');
    assert.ok(backdrop);

    await dispatchPointerDown(backdrop);

    assert.equal(useUiStore.getState().columnMenu, null);
    const columns = useDocumentStore.getState().workspacesById.ws_home?.blocks[0]?.columns ?? [];
    assert.equal(columns.find((c) => c.id === "col_custom")?.label, "Custom");
    assert.equal(document.querySelector('[data-testid="column-menu-backdrop"]'), null);
  });
});
