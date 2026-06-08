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

    await renderNode(<LeftDock />);

    // Click "Rename workspace" to open the inline rename input
    const renameButton = Array.from(document.querySelectorAll("button")).find(
      (btn) => btn.textContent === "Rename workspace"
    );
    assert.ok(renameButton);
    await dispatchClick(renameButton);

    // The inline rename view should show an input and a Save button
    const renameInput = document.querySelector('input[aria-label="Workspace name"]') as HTMLInputElement | null;
    assert.ok(renameInput, "Expected rename input to appear after clicking Rename");

    // Set the input value directly (uncontrolled input via ref)
    renameInput.value = "Renamed Home";

    // Click Save
    const saveButton = Array.from(document.querySelectorAll("button")).find(
      (btn) => btn.textContent === "Save"
    );
    assert.ok(saveButton);
    await dispatchClick(saveButton);

    const state = useDocumentStore.getState();
    const renamed = state.workspaceIndex.find((entry) => entry.id === "ws_home");
    assert.ok(renamed);
    assert.equal(renamed.title, "Renamed Home");
    assert.equal(useUiStore.getState().workspaceMenu, null);
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

    await renderNode(<LeftDock />);

    // Click "Delete workspace" to open inline confirm
    const deleteButton = Array.from(document.querySelectorAll("button")).find(
      (btn) => btn.textContent === "Delete workspace"
    );
    assert.ok(deleteButton);
    await dispatchClick(deleteButton);

    // Click the confirm "Delete" button in the inline confirmation
    const confirmDeleteButton = Array.from(document.querySelectorAll("button")).find(
      (btn) => btn.textContent === "Delete"
    );
    assert.ok(confirmDeleteButton, "Expected confirm Delete button to appear");
    await dispatchClick(confirmDeleteButton);

    const state = useDocumentStore.getState();
    assert.equal(state.workspaceIndex.some((entry) => entry.id === "ws_home"), false);
    assert.equal(useUiStore.getState().workspaceMenu, null);
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

    await renderNode(<LeftDock />);

    // Click "Delete workspace" to open inline confirm
    const deleteButton = Array.from(document.querySelectorAll("button")).find(
      (btn) => btn.textContent === "Delete workspace"
    );
    assert.ok(deleteButton);
    await dispatchClick(deleteButton);

    // Click "Keep" to cancel deletion
    const keepButton = Array.from(document.querySelectorAll("button")).find(
      (btn) => btn.textContent === "Keep"
    );
    assert.ok(keepButton, "Expected Keep button to appear");
    await dispatchClick(keepButton);

    const state = useDocumentStore.getState();
    assert.equal(state.workspaceIndex.some((entry) => entry.id === "ws_home"), true);
    // After clicking Keep, menu should close
    assert.equal(useUiStore.getState().workspaceMenu, null);
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

  test("workspace menu move up reorders the workspace up one position and closes the menu", async () => {
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
        {
          id: "ws_projects",
          title: "Projects",
          order: 2,
          style: {
            background: "#111827",
            textColor: "#F9FAFB",
            accentStripe: { enabled: true, color: "#F59E0B" },
          },
        },
      ],
      workspacesById: {
        ws_home: { id: "ws_home", blocks: [] },
        ws_work: { id: "ws_work", blocks: [] },
        ws_projects: { id: "ws_projects", blocks: [] },
      },
      loadedWorkspaceIds: ["ws_home", "ws_work", "ws_projects"],
      activeWorkspaceId: "ws_home",
    });
    useUiStore.setState({
      workspaceMenu: {
        workspaceId: "ws_work",
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

    const moveUpButton = Array.from(document.querySelectorAll("button")).find(
      (btn) => btn.textContent === "Move up"
    );
    assert.ok(moveUpButton);
    assert.equal(moveUpButton.hasAttribute("disabled"), false);

    await dispatchClick(moveUpButton);

    const state = useDocumentStore.getState();
    assert.deepEqual(
      state.workspaceIndex.map((ws) => ws.id),
      ["ws_work", "ws_home", "ws_projects"]
    );
    assert.deepEqual(
      state.workspaceIndex.map((ws) => ws.order),
      [0, 1, 2]
    );
    assert.equal(useUiStore.getState().workspaceMenu, null);
  });

  test("workspace menu move down reorders the workspace down one position and closes the menu", async () => {
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
        {
          id: "ws_projects",
          title: "Projects",
          order: 2,
          style: {
            background: "#111827",
            textColor: "#F9FAFB",
            accentStripe: { enabled: true, color: "#F59E0B" },
          },
        },
      ],
      workspacesById: {
        ws_home: { id: "ws_home", blocks: [] },
        ws_work: { id: "ws_work", blocks: [] },
        ws_projects: { id: "ws_projects", blocks: [] },
      },
      loadedWorkspaceIds: ["ws_home", "ws_work", "ws_projects"],
      activeWorkspaceId: "ws_home",
    });
    useUiStore.setState({
      workspaceMenu: {
        workspaceId: "ws_work",
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

    const moveDownButton = Array.from(document.querySelectorAll("button")).find(
      (btn) => btn.textContent === "Move down"
    );
    assert.ok(moveDownButton);
    assert.equal(moveDownButton.hasAttribute("disabled"), false);

    await dispatchClick(moveDownButton);

    const state = useDocumentStore.getState();
    assert.deepEqual(
      state.workspaceIndex.map((ws) => ws.id),
      ["ws_home", "ws_projects", "ws_work"]
    );
    assert.deepEqual(
      state.workspaceIndex.map((ws) => ws.order),
      [0, 1, 2]
    );
    assert.equal(useUiStore.getState().workspaceMenu, null);
  });

  test("workspace menu move up is disabled for the first workspace", async () => {
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

    const moveUpButton = Array.from(document.querySelectorAll("button")).find(
      (btn) => btn.textContent === "Move up"
    );
    assert.ok(moveUpButton);
    assert.equal(moveUpButton.hasAttribute("disabled"), true);
  });

  test("workspace menu move down is disabled for the last workspace", async () => {
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
        workspaceId: "ws_work",
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

    const moveDownButton = Array.from(document.querySelectorAll("button")).find(
      (btn) => btn.textContent === "Move down"
    );
    assert.ok(moveDownButton);
    assert.equal(moveDownButton.hasAttribute("disabled"), true);
  });
});

describe("workspace pointer-drag reorder", () => {
  function mockCardRects() {
    const cards = document.querySelectorAll<HTMLElement>(
      '[data-testid="workspace-card"]'
    );
    const rects: { element: HTMLElement; id: string; rect: DOMRect }[] = [];

    cards.forEach((card, index) => {
      const id = card.getAttribute("data-workspace-id");
      if (!id) return;

      const top = index * 64;
      const rect = {
        top,
        bottom: top + 60,
        height: 60,
        width: 280,
        left: 0,
        right: 280,
        x: 0,
        y: top,
        toJSON() {
          return this;
        },
      } as DOMRect;

      Object.defineProperty(card, "getBoundingClientRect", {
        configurable: true,
        value: () => rect,
      });

      rects.push({ element: card, id, rect });
    });

    return rects;
  }

  const threeWorkspaceState = {
    settings: {
      theme: "dark" as const,
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
      {
        id: "ws_projects",
        title: "Projects",
        order: 2,
        style: {
          background: "#111827",
          textColor: "#F9FAFB",
          accentStripe: { enabled: true, color: "#F59E0B" },
        },
      },
    ],
    workspacesById: {
      ws_home: { id: "ws_home", blocks: [] },
      ws_work: { id: "ws_work", blocks: [] },
      ws_projects: { id: "ws_projects", blocks: [] },
    },
    loadedWorkspaceIds: ["ws_home", "ws_work", "ws_projects"],
    activeWorkspaceId: "ws_home",
  };

  test("dragging a card above another card inserts before the target", async () => {
    useDocumentStore.setState(threeWorkspaceState);
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

    await renderNode(<LeftDock />);

    const rects = mockCardRects();

    // Find the source card (Work, index 1) and target card (Home, index 0)
    const sourceRects = rects.filter((r) => r.id === "ws_work");
    const targetRects = rects.filter((r) => r.id === "ws_home");
    assert.equal(sourceRects.length, 1);
    assert.equal(targetRects.length, 1);

    const sourceCard = sourceRects[0].element;
    const sourceRect = sourceRects[0].rect;
    const targetCard = targetRects[0].element;

    // pointerdown on Work card (middle of card = y: 64 + 30 = 94)
    await act(async () => {
      sourceCard.dispatchEvent(
        new window.PointerEvent("pointerdown", {
          bubbles: true,
          button: 0,
          isPrimary: true,
          clientX: 10,
          clientY: sourceRect.top + 30,
        })
      );
    });

    // pointermove above Home's midpoint (Home midpoint = 32)
    await act(async () => {
      document.dispatchEvent(
        new window.PointerEvent("pointermove", {
          bubbles: true,
          clientX: 10,
          clientY: 20, // well above Home's midpoint (32), so drop target should be Home
        })
      );
    });

    // Should now have an active drag with dropTargetWorkspaceId = ws_home
    assert.equal(
      useUiStore.getState().draggingWorkspaceId,
      "ws_work"
    );
    assert.equal(
      useUiStore.getState().dropTargetWorkspaceId,
      "ws_home"
    );

    // Drop-indicator should be visible on the target card (Home)
    const dropIndicator = document.querySelector('[data-testid="drop-indicator"]');
    assert.ok(dropIndicator, "Expected drop-indicator on target card");
    // End-of-list marker should NOT be visible
    const dropIndicatorEnd = document.querySelector('[data-testid="drop-indicator-end"]');
    assert.equal(dropIndicatorEnd, null, "Expected no end-of-list marker");

    // pointerup to commit
    await act(async () => {
      document.dispatchEvent(new window.PointerEvent("pointerup", { bubbles: true }));
    });

    const state = useDocumentStore.getState();
    assert.deepEqual(
      state.workspaceIndex.map((ws) => ws.id),
      ["ws_work", "ws_home", "ws_projects"]
    );
    assert.deepEqual(
      state.workspaceIndex.map((ws) => ws.order),
      [0, 1, 2]
    );
  });

  test("dragging below all cards appends to end", async () => {
    useDocumentStore.setState(threeWorkspaceState);
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

    await renderNode(<LeftDock />);

    mockCardRects();

    const homeCard = document.querySelector<HTMLElement>(
      '[data-workspace-id="ws_home"]'
    );
    assert.ok(homeCard);

    // pointerdown on Home card
    await act(async () => {
      homeCard.dispatchEvent(
        new window.PointerEvent("pointerdown", {
          bubbles: true,
          button: 0,
          isPrimary: true,
          clientX: 10,
          clientY: 30,
        })
      );
    });

    // pointermove far below the last card (last card bottom = 128 + 60 = 188)
    await act(async () => {
      document.dispatchEvent(
        new window.PointerEvent("pointermove", {
          bubbles: true,
          clientX: 10,
          clientY: 250, // below all cards
        })
      );
    });

    // Should not have a specific drop target (it's end-of-list)
    assert.equal(
      useUiStore.getState().draggingWorkspaceId,
      "ws_home"
    );
    assert.equal(useUiStore.getState().dropTargetWorkspaceId, null);

    // End-of-list marker should be visible
    const dropIndicatorEnd = document.querySelector('[data-testid="drop-indicator-end"]');
    assert.ok(dropIndicatorEnd, "Expected end-of-list drop marker");
    // Drop-indicator should NOT be visible (no specific card target)
    const dropIndicator = document.querySelector('[data-testid="drop-indicator"]');
    assert.equal(dropIndicator, null, "Expected no drop-indicator on any card");

    // pointerup to commit (append-to-end for null target)
    await act(async () => {
      document.dispatchEvent(new window.PointerEvent("pointerup", { bubbles: true }));
    });

    const state = useDocumentStore.getState();
    // Home should now be last: [Work, Projects, Home]
    assert.deepEqual(
      state.workspaceIndex.map((ws) => ws.id),
      ["ws_work", "ws_projects", "ws_home"]
    );
    assert.deepEqual(
      state.workspaceIndex.map((ws) => ws.order),
      [0, 1, 2]
    );
  });

  test("pointer move below threshold does not trigger reorder", async () => {
    useDocumentStore.setState({
      ...threeWorkspaceState,
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

    await renderNode(<LeftDock />);

    mockCardRects();

    const homeCard = document.querySelector<HTMLElement>(
      '[data-workspace-id="ws_home"]'
    );
    assert.ok(homeCard);

    // pointerdown on Home
    await act(async () => {
      homeCard.dispatchEvent(
        new window.PointerEvent("pointerdown", {
          bubbles: true,
          button: 0,
          isPrimary: true,
          clientX: 10,
          clientY: 30,
        })
      );
    });

    // pointermove with tiny movement (3px — below 6px threshold)
    await act(async () => {
      document.dispatchEvent(
        new window.PointerEvent("pointermove", {
          bubbles: true,
          clientX: 10,
          clientY: 33,
        })
      );
    });

    // Drag should NOT be active
    assert.equal(useUiStore.getState().draggingWorkspaceId, null);
    assert.equal(useUiStore.getState().dropTargetWorkspaceId, null);

    // Neither marker should appear
    assert.equal(
      document.querySelector('[data-testid="drop-indicator"]'),
      null,
      "Expected no drop-indicator below threshold"
    );
    assert.equal(
      document.querySelector('[data-testid="drop-indicator-end"]'),
      null,
      "Expected no end-of-list marker below threshold"
    );

    // pointerup
    await act(async () => {
      document.dispatchEvent(new window.PointerEvent("pointerup", { bubbles: true }));
    });

    // Order unchanged
    const state = useDocumentStore.getState();
    assert.deepEqual(
      state.workspaceIndex.map((ws) => ws.id),
      ["ws_home", "ws_work", "ws_projects"]
    );
  });
});
