import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "node:test";
import { JSDOM } from "jsdom";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { fireEvent } from "@testing-library/react";
import { MainPane } from "../../components/layout/MainPane.js";
import { createBlockTemplate } from "../../domain/templates/blockTemplates.js";
import { useDocumentStore } from "../../stores/documentStore.js";
import { useUiStore } from "../../stores/uiStore.js";
import type { Block } from "../../types/block.js";

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
  useDocumentStore.setState(initialDocumentState);
  useUiStore.setState(initialUiState);
});

describe("row editing ui", () => {
  test("toggles checkbox through persisted store actions", async () => {
    const block = createBlockTemplate("basic_checklist", "ws_home", {
      blockId: "block_home",
      title: "Today",
      order: 0,
    });
    const rowId = block.rows[0]?.id;
    const checkboxColumnId = block.columns.find((column) => column.type === "checkbox")?.id;
    assert.ok(rowId);
    assert.ok(checkboxColumnId);

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

    const checkboxButton = document.querySelector(
      `[data-testid="cell-${rowId}-${checkboxColumnId}"] [data-testid="checkbox-cell-toggle"]`
    ) as HTMLButtonElement | null;
    assert.ok(checkboxButton);

    await act(async () => {
      checkboxButton.click();
    });

    assert.equal(
      useDocumentStore.getState().workspacesById.ws_home?.blocks[0]?.rows[0]?.cells[checkboxColumnId]?.value,
      true
    );
  });

  test("adds, inserts, and deletes rows from UI controls", async () => {
    const block = createBlockTemplate("basic_checklist", "ws_home", {
      blockId: "block_home",
      title: "Today",
      order: 0,
    });
    const baseRowId = block.rows[0]?.id;
    assert.ok(baseRowId);

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

    const addRowButton = document.querySelector('[data-testid="add-row-block_home"]') as HTMLButtonElement | null;
    assert.ok(addRowButton);

    await act(async () => {
      addRowButton.click();
    });

    const rowsAfterAdd = useDocumentStore.getState().workspacesById.ws_home?.blocks[0]?.rows ?? [];
    assert.equal(rowsAfterAdd.length, 2);
    const secondRowId = rowsAfterAdd[1]?.id;
    assert.ok(secondRowId);

    const insertAbove = document.querySelector(
      `[data-testid="insert-row-above-${secondRowId}"]`
    ) as HTMLButtonElement | null;
    assert.ok(insertAbove);

    await act(async () => {
      insertAbove.click();
    });

    const rowsAfterInsert = useDocumentStore.getState().workspacesById.ws_home?.blocks[0]?.rows ?? [];
    assert.equal(rowsAfterInsert.length, 3);
    assert.equal(rowsAfterInsert[0]?.id, baseRowId);
    assert.notEqual(rowsAfterInsert[1]?.id, secondRowId);
    assert.equal(rowsAfterInsert[2]?.id, secondRowId);

    const insertedRowId = rowsAfterInsert[1]?.id;
    assert.ok(insertedRowId);
    const deleteButton = document.querySelector(
      `[data-testid="delete-row-${insertedRowId}"]`
    ) as HTMLButtonElement | null;
    assert.ok(deleteButton);

    await act(async () => {
      deleteButton.click();
    });

    const rowsAfterDelete = useDocumentStore.getState().workspacesById.ws_home?.blocks[0]?.rows ?? [];
    assert.equal(rowsAfterDelete.length, 2);
    assert.equal(rowsAfterDelete.some((row) => row.id === insertedRowId), false);
    assert.deepEqual(
      rowsAfterDelete.map((row) => row.order),
      [0, 1]
    );
  });

  test("renders and edits date, time, and dropdown cells", async () => {
    const block = createBlockTemplate("basic_checklist", "ws_home", {
      blockId: "block_home",
      title: "Today",
      order: 0,
    });

    const dateColumnId = "col_date";
    const timeColumnId = "col_time";
    const dropdownColumnId = "col_dropdown";

    const extendedBlock: Block = {
      ...block,
      columns: [
        ...block.columns,
        {
          id: dateColumnId,
          type: "date",
          label: "Due",
          order: block.columns.length,
          width: 120,
          visible: true,
          settings: { alertsEnabled: false },
          format: {},
        },
        {
          id: timeColumnId,
          type: "time",
          label: "At",
          order: block.columns.length + 1,
          width: 80,
          visible: true,
          settings: { alertsEnabled: false },
          format: {},
        },
        {
          id: dropdownColumnId,
          type: "dropdown",
          label: "Status",
          order: block.columns.length + 2,
          width: 120,
          visible: true,
          settings: { options: ["Open", "Done"] },
          format: {},
        },
      ],
      rows: block.rows.map((row) => ({
        ...row,
        cells: {
          ...row.cells,
          [dateColumnId]: { value: null, format: {} },
          [timeColumnId]: { value: null, format: {} },
          [dropdownColumnId]: { value: null, format: {} },
        },
      })),
    };

    const rowId = extendedBlock.rows[0]?.id;
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
          blocks: [extendedBlock],
        },
      },
      loadedWorkspaceIds: ["ws_home"],
      activeWorkspaceId: "ws_home",
    });

    await renderMainPane();

    const dateInput = document.querySelector(
      `[data-testid="cell-${rowId}-${dateColumnId}"] [data-testid="date-cell-input"]`
    ) as HTMLInputElement | null;
    assert.ok(dateInput);

    await act(async () => {
      fireEvent.input(dateInput, { target: { value: "2026-05-11" } });
    });
    await act(async () => {
      fireEvent.blur(dateInput);
    });

    assert.equal(
      useDocumentStore.getState().workspacesById.ws_home?.blocks[0]?.rows[0]?.cells[dateColumnId]?.value,
      "2026-05-11"
    );

    const timeInput = document.querySelector(
      `[data-testid="cell-${rowId}-${timeColumnId}"] [data-testid="time-cell-input"]`
    ) as HTMLInputElement | null;
    assert.ok(timeInput);

    await act(async () => {
      fireEvent.input(timeInput, { target: { value: "14:30" } });
    });
    await act(async () => {
      fireEvent.blur(timeInput);
    });

    assert.equal(
      useDocumentStore.getState().workspacesById.ws_home?.blocks[0]?.rows[0]?.cells[timeColumnId]?.value,
      "14:30"
    );

    const dropdownSelect = document.querySelector(
      `[data-testid="cell-${rowId}-${dropdownColumnId}"] [data-testid="dropdown-cell-select"]`
    ) as HTMLSelectElement | null;
    assert.ok(dropdownSelect);

    await act(async () => {
      fireEvent.change(dropdownSelect, { target: { value: "Done" } });
    });

    assert.equal(
      useDocumentStore.getState().workspacesById.ws_home?.blocks[0]?.rows[0]?.cells[dropdownColumnId]?.value,
      "Done"
    );
  });

  test("shows invalid styling for bad date and time values without crashing", async () => {
    const block = createBlockTemplate("basic_checklist", "ws_home", {
      blockId: "block_home",
      title: "Today",
      order: 0,
    });

    const dateColumnId = "col_date";
    const timeColumnId = "col_time";

    const extendedBlock: Block = {
      ...block,
      columns: [
        ...block.columns,
        {
          id: dateColumnId,
          type: "date",
          label: "Due",
          order: block.columns.length,
          width: 120,
          visible: true,
          settings: { alertsEnabled: false },
          format: {},
        },
        {
          id: timeColumnId,
          type: "time",
          label: "At",
          order: block.columns.length + 1,
          width: 80,
          visible: true,
          settings: { alertsEnabled: false },
          format: {},
        },
      ],
      rows: block.rows.map((row) => ({
        ...row,
        cells: {
          ...row.cells,
          [dateColumnId]: { value: null, format: {} },
          [timeColumnId]: { value: null, format: {} },
        },
      })),
    };

    const rowId = extendedBlock.rows[0]?.id;
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
          blocks: [extendedBlock],
        },
      },
      loadedWorkspaceIds: ["ws_home"],
      activeWorkspaceId: "ws_home",
    });

    await renderMainPane();

    const dateInput = document.querySelector(
      `[data-testid="cell-${rowId}-${dateColumnId}"] [data-testid="date-cell-input"]`
    ) as HTMLInputElement | null;
    assert.ok(dateInput);

    await act(async () => {
      fireEvent.input(dateInput, { target: { value: "not-a-date" } });
    });

    assert.ok(dateInput.className.includes("text-danger"));

    const timeInput = document.querySelector(
      `[data-testid="cell-${rowId}-${timeColumnId}"] [data-testid="time-cell-input"]`
    ) as HTMLInputElement | null;
    assert.ok(timeInput);

    await act(async () => {
      fireEvent.input(timeInput, { target: { value: "99:99" } });
    });

    assert.ok(timeInput.className.includes("text-danger"));
  });

  test("row drag handle sets ui drag state on drag start", async () => {
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
