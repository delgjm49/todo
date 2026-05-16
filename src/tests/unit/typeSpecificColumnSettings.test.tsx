import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "node:test";
import { JSDOM } from "jsdom";
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { fireEvent } from "@testing-library/react";
import { InspectorShell } from "../../components/layout/InspectorShell.js";
import { createBlockTemplate } from "../../domain/templates/blockTemplates.js";
import { createColumn } from "../../domain/columns/createColumn.js";
import { useDocumentStore } from "../../stores/documentStore.js";
import { useUiStore } from "../../stores/uiStore.js";
import type { Selection } from "../../types/ui.js";

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
  globalThis.FocusEvent = window.FocusEvent;
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

async function dispatchClick(element: Element) {
  await act(async () => {
    element.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  });
}

async function typeIntoInput(input: HTMLInputElement, value: string) {
  await act(async () => {
    fireEvent.input(input, { target: { value } });
  });
}

async function blurInput(input: HTMLInputElement) {
  await act(async () => {
    fireEvent.blur(input);
  });
}

function seedWorkspace(block: ReturnType<typeof createBlockTemplate>) {
  useDocumentStore.setState({
    settings: {
      theme: "dark",
      defaults: {
        fontFamily: "Segoe UI",
        fontSize: 14,
        textColor: "#F9FAFB",
        cellBackground: "#1F2937",
        blockBorderColor: "#374151",
        blockBorderWidth: 1,
        workspaceAccentEnabled: true,
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
}

function createTestBlock() {
  const block = createBlockTemplate("basic_checklist", "ws_home", {
    blockId: "block_home",
    title: "Today",
    order: 0,
  });

  const dropdownColumn = createColumn("dropdown", {
    id: "col_dropdown",
    order: 3,
    label: "Status",
  });
  (dropdownColumn.settings as { options: string[] }).options = ["Open", "Closed"];

  const dateColumn = createColumn("date", {
    id: "col_date",
    order: 4,
    label: "Due date",
  });
  const timeColumn = createColumn("time", {
    id: "col_time",
    order: 5,
    label: "Due time",
  });

  block.columns = [...block.columns, dropdownColumn, dateColumn, timeColumn];
  block.rows = block.rows.map((row) => ({
    ...row,
    cells: {
      ...row.cells,
      [dropdownColumn.id]: { value: "Open", format: {} },
      [dateColumn.id]: { value: "2024-01-01", format: {} },
      [timeColumn.id]: { value: "09:00", format: {} },
    },
  }));

  return { block, dropdownColumn, dateColumn, timeColumn };
}

beforeEach(() => {
  dom = new JSDOM(
    '<!doctype html><html><body><div id="root"></div></body></html>',
    { url: "http://localhost/" }
  );
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

describe("TypeSpecificColumnSettings", () => {
  test("no selection renders guidance text", async () => {
    const { block } = createTestBlock();
    seedWorkspace(block);
    useUiStore.setState({
      selection: { kind: "none" },
    } as Partial<typeof initialUiState>);

    await renderNode(<InspectorShell />);

    const guidance = document.querySelector('[data-testid="dropdown-option-add-input"]');
    assert.equal(guidance, null);
    assert.ok(
      document.body.textContent?.includes("Select a column or cell to edit column settings.")
    );
  });

  test("block selection renders guidance text", async () => {
    const { block } = createTestBlock();
    seedWorkspace(block);
    useUiStore.setState({
      selection: {
        kind: "block",
        workspaceId: "ws_home",
        blockId: "block_home",
      } as Selection,
    } as Partial<typeof initialUiState>);

    await renderNode(<InspectorShell />);

    assert.ok(
      document.body.textContent?.includes("Select a column or cell to edit column settings.")
    );
  });

  test("text column selection renders unsupported message", async () => {
    const { block } = createTestBlock();
    seedWorkspace(block);
    const textColumnId = block.columns.find((c) => c.type === "text")?.id;
    assert.ok(textColumnId);

    useUiStore.setState({
      selection: {
        kind: "column",
        workspaceId: "ws_home",
        blockId: "block_home",
        columnId: textColumnId,
      } as Selection,
    } as Partial<typeof initialUiState>);

    await renderNode(<InspectorShell />);

    assert.ok(
      document.body.textContent?.includes("Text columns have no type-specific settings.")
    );
  });

  test("checkbox column selection toggles strikeoutRowWhenChecked", async () => {
    const { block } = createTestBlock();
    seedWorkspace(block);
    const checkboxColumnId = block.columns.find((c) => c.type === "checkbox")?.id;
    assert.ok(checkboxColumnId);

    useUiStore.setState({
      selection: {
        kind: "column",
        workspaceId: "ws_home",
        blockId: "block_home",
        columnId: checkboxColumnId,
      } as Selection,
    } as Partial<typeof initialUiState>);

    await renderNode(<InspectorShell />);

    const toggle = document.querySelector(
      '[data-testid="column-setting-toggle-strikeoutRowWhenChecked"]'
    );
    assert.ok(toggle);

    await dispatchClick(toggle);

    const column = useDocumentStore
      .getState()
      .workspacesById.ws_home?.blocks[0]?.columns.find((c) => c.id === checkboxColumnId);
    assert.equal(
      (column?.settings as { strikeoutRowWhenChecked?: boolean })?.strikeoutRowWhenChecked,
      false
    );

    await dispatchClick(toggle);

    const columnAfter = useDocumentStore
      .getState()
      .workspacesById.ws_home?.blocks[0]?.columns.find((c) => c.id === checkboxColumnId);
    assert.equal(
      (columnAfter?.settings as { strikeoutRowWhenChecked?: boolean })?.strikeoutRowWhenChecked,
      true
    );
  });

  test("checkbox column selection toggles moveCheckedRowsToBottom", async () => {
    const { block } = createTestBlock();
    seedWorkspace(block);
    const checkboxColumnId = block.columns.find((c) => c.type === "checkbox")?.id;
    assert.ok(checkboxColumnId);

    useUiStore.setState({
      selection: {
        kind: "column",
        workspaceId: "ws_home",
        blockId: "block_home",
        columnId: checkboxColumnId,
      } as Selection,
    } as Partial<typeof initialUiState>);

    await renderNode(<InspectorShell />);

    const toggle = document.querySelector(
      '[data-testid="column-setting-toggle-moveCheckedRowsToBottom"]'
    );
    assert.ok(toggle);

    await dispatchClick(toggle);

    const column = useDocumentStore
      .getState()
      .workspacesById.ws_home?.blocks[0]?.columns.find((c) => c.id === checkboxColumnId);
    assert.equal(
      (column?.settings as { moveCheckedRowsToBottom?: boolean })?.moveCheckedRowsToBottom,
      true
    );
  });

  test("date column selection toggles alertsEnabled", async () => {
    const { block, dateColumn } = createTestBlock();
    seedWorkspace(block);

    useUiStore.setState({
      selection: {
        kind: "column",
        workspaceId: "ws_home",
        blockId: "block_home",
        columnId: dateColumn.id,
      } as Selection,
    } as Partial<typeof initialUiState>);

    await renderNode(<InspectorShell />);

    const toggle = document.querySelector(
      '[data-testid="column-setting-toggle-alertsEnabled"]'
    );
    assert.ok(toggle);

    await dispatchClick(toggle);

    const column = useDocumentStore
      .getState()
      .workspacesById.ws_home?.blocks[0]?.columns.find((c) => c.id === dateColumn.id);
    assert.equal(
      (column?.settings as { alertsEnabled?: boolean })?.alertsEnabled,
      true
    );
  });

  test("time column selection toggles alertsEnabled", async () => {
    const { block, timeColumn } = createTestBlock();
    seedWorkspace(block);

    useUiStore.setState({
      selection: {
        kind: "column",
        workspaceId: "ws_home",
        blockId: "block_home",
        columnId: timeColumn.id,
      } as Selection,
    } as Partial<typeof initialUiState>);

    await renderNode(<InspectorShell />);

    const toggle = document.querySelector(
      '[data-testid="column-setting-toggle-alertsEnabled"]'
    );
    assert.ok(toggle);

    await dispatchClick(toggle);

    const column = useDocumentStore
      .getState()
      .workspacesById.ws_home?.blocks[0]?.columns.find((c) => c.id === timeColumn.id);
    assert.equal(
      (column?.settings as { alertsEnabled?: boolean })?.alertsEnabled,
      true
    );
  });

  test("dropdown column add option updates store", async () => {
    const { block, dropdownColumn } = createTestBlock();
    seedWorkspace(block);

    useUiStore.setState({
      selection: {
        kind: "column",
        workspaceId: "ws_home",
        blockId: "block_home",
        columnId: dropdownColumn.id,
      } as Selection,
    } as Partial<typeof initialUiState>);

    await renderNode(<InspectorShell />);

    const addInput = document.querySelector<HTMLInputElement>(
      '[data-testid="dropdown-option-add-input"]'
    );
    assert.ok(addInput);

    const addButton = document.querySelector(
      '[data-testid="dropdown-option-add-button"]'
    );
    assert.ok(addButton);

    await typeIntoInput(addInput, "In Progress");
    await dispatchClick(addButton);

    const column = useDocumentStore
      .getState()
      .workspacesById.ws_home?.blocks[0]?.columns.find((c) => c.id === dropdownColumn.id);
    assert.deepEqual(
      (column?.settings as { options?: string[] })?.options,
      ["Open", "Closed", "In Progress"]
    );
  });

  test("dropdown column rename option updates store", async () => {
    const { block, dropdownColumn } = createTestBlock();
    seedWorkspace(block);

    useUiStore.setState({
      selection: {
        kind: "column",
        workspaceId: "ws_home",
        blockId: "block_home",
        columnId: dropdownColumn.id,
      } as Selection,
    } as Partial<typeof initialUiState>);

    await renderNode(<InspectorShell />);

    const optionInput = document.querySelector<HTMLInputElement>(
      '[aria-label="Edit option 1"]'
    );
    assert.ok(optionInput);

    await typeIntoInput(optionInput, "In Progress");
    await blurInput(optionInput);

    const column = useDocumentStore
      .getState()
      .workspacesById.ws_home?.blocks[0]?.columns.find((c) => c.id === dropdownColumn.id);
    assert.deepEqual(
      (column?.settings as { options?: string[] })?.options,
      ["In Progress", "Closed"]
    );
  });

  test("dropdown column remove option updates store", async () => {
    const { block, dropdownColumn } = createTestBlock();
    seedWorkspace(block);

    useUiStore.setState({
      selection: {
        kind: "column",
        workspaceId: "ws_home",
        blockId: "block_home",
        columnId: dropdownColumn.id,
      } as Selection,
    } as Partial<typeof initialUiState>);

    await renderNode(<InspectorShell />);

    const removeButton = document.querySelector(
      '[data-testid="dropdown-option-remove-0"]'
    );
    assert.ok(removeButton);

    await dispatchClick(removeButton);

    const column = useDocumentStore
      .getState()
      .workspacesById.ws_home?.blocks[0]?.columns.find((c) => c.id === dropdownColumn.id);
    assert.deepEqual(
      (column?.settings as { options?: string[] })?.options,
      ["Closed"]
    );
  });

  test("dropdown add rejects empty value", async () => {
    const { block, dropdownColumn } = createTestBlock();
    seedWorkspace(block);

    useUiStore.setState({
      selection: {
        kind: "column",
        workspaceId: "ws_home",
        blockId: "block_home",
        columnId: dropdownColumn.id,
      } as Selection,
    } as Partial<typeof initialUiState>);

    await renderNode(<InspectorShell />);

    const addInput = document.querySelector<HTMLInputElement>(
      '[data-testid="dropdown-option-add-input"]'
    );
    assert.ok(addInput);

    const addButton = document.querySelector(
      '[data-testid="dropdown-option-add-button"]'
    );
    assert.ok(addButton);

    await typeIntoInput(addInput, "   ");
    await dispatchClick(addButton);

    const column = useDocumentStore
      .getState()
      .workspacesById.ws_home?.blocks[0]?.columns.find((c) => c.id === dropdownColumn.id);
    assert.deepEqual(
      (column?.settings as { options?: string[] })?.options,
      ["Open", "Closed"]
    );

    const errorEl = document.querySelector('[data-testid="dropdown-options-error"]');
    assert.ok(errorEl);
    assert.ok(errorEl.textContent?.includes("cannot be empty"));
  });

  test("dropdown add rejects duplicate value", async () => {
    const { block, dropdownColumn } = createTestBlock();
    seedWorkspace(block);

    useUiStore.setState({
      selection: {
        kind: "column",
        workspaceId: "ws_home",
        blockId: "block_home",
        columnId: dropdownColumn.id,
      } as Selection,
    } as Partial<typeof initialUiState>);

    await renderNode(<InspectorShell />);

    const addInput = document.querySelector<HTMLInputElement>(
      '[data-testid="dropdown-option-add-input"]'
    );
    assert.ok(addInput);

    const addButton = document.querySelector(
      '[data-testid="dropdown-option-add-button"]'
    );
    assert.ok(addButton);

    await typeIntoInput(addInput, "Open");
    await dispatchClick(addButton);

    const column = useDocumentStore
      .getState()
      .workspacesById.ws_home?.blocks[0]?.columns.find((c) => c.id === dropdownColumn.id);
    assert.deepEqual(
      (column?.settings as { options?: string[] })?.options,
      ["Open", "Closed"]
    );

    const errorEl = document.querySelector('[data-testid="dropdown-options-error"]');
    assert.ok(errorEl);
    assert.ok(errorEl.textContent?.includes("already exists"));
  });

  test("cell selection resolves to owning dropdown column", async () => {
    const { block, dropdownColumn } = createTestBlock();
    seedWorkspace(block);
    const rowId = block.rows[0]?.id;
    assert.ok(rowId);

    useUiStore.setState({
      selection: {
        kind: "cell",
        workspaceId: "ws_home",
        blockId: "block_home",
        rowId,
        columnId: dropdownColumn.id,
      } as Selection,
    } as Partial<typeof initialUiState>);

    await renderNode(<InspectorShell />);

    const addInput = document.querySelector<HTMLInputElement>(
      '[data-testid="dropdown-option-add-input"]'
    );
    assert.ok(addInput);

    const addButton = document.querySelector(
      '[data-testid="dropdown-option-add-button"]'
    );
    assert.ok(addButton);

    await typeIntoInput(addInput, "New");
    await dispatchClick(addButton);

    const column = useDocumentStore
      .getState()
      .workspacesById.ws_home?.blocks[0]?.columns.find((c) => c.id === dropdownColumn.id);
    assert.deepEqual(
      (column?.settings as { options?: string[] })?.options,
      ["Open", "Closed", "New"]
    );
  });
});
