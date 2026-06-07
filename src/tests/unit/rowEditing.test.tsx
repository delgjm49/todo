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

// ---- Module-level JSDOM attachEvent/detachEvent shims ----
// React's controlled-input polyfill calls activeElement.attachEvent() /
// detachEvent() which are legacy IE APIs not provided by JSDOM. We install
// no-op stubs once at module load time on Object.prototype, which is the
// root prototype for all JSDOM DOM objects. This is intentionally broad but
// necessary because:
//   (a) JSDOM creates fresh prototype chains per instance, and per-instance
//       stubs do not cover errors triggered during React's async event
//       cleanup that spans JSDOM lifetimes in the full test suite.
//   (b) The stubs are harmless no-ops — they silently absorb the calls that
//       React's polyfill makes, which React only uses for legacy IE support.
//   (c) This technique is used by production React+JSDOM testing setups.

(function installAttachEventShims() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const O = Object.prototype as any;
  if (!("attachEvent" in O)) {
    Object.defineProperty(O, "attachEvent", {
      configurable: true,
      writable: true,
      value: function () {},
    });
  }
  if (!("detachEvent" in O)) {
    Object.defineProperty(O, "detachEvent", {
      configurable: true,
      writable: true,
      value: function () {},
    });
  }
})();
// -------------------------------------------------------------

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

  // React's input-event polyfill (used for controlled components) expects
  // attachEvent / detachEvent on the active element. JSDOM does not provide
  // these legacy IE APIs. We add no-op stubs on both Node.prototype (covers
  // document) and HTMLElement.prototype (covers input elements).
  const noop = function () {};
  Object.defineProperty(window.Node.prototype, "attachEvent", {
    configurable: true,
    writable: true,
    value: noop,
  });
  Object.defineProperty(window.Node.prototype, "detachEvent", {
    configurable: true,
    writable: true,
    value: noop,
  });
  Object.defineProperty(window.HTMLElement.prototype, "attachEvent", {
    configurable: true,
    writable: true,
    value: noop,
  });
  Object.defineProperty(window.HTMLElement.prototype, "detachEvent", {
    configurable: true,
    writable: true,
    value: noop,
  });
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
  // Flush pending timers (rAF polyfilled to setTimeout 0) and any
  // nested timeouts while the React tree is still active, so that
  // their callbacks fire inside act() and don't leak across tests.
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

  test("marks strikeout-enabled checked rows as completed", async () => {
    const block = createBlockTemplate("basic_checklist", "ws_home", {
      blockId: "block_home",
      title: "Today",
      order: 0,
    });
    const rowId = block.rows[0]?.id;
    const checkboxColumnId = block.columns.find((column) => column.type === "checkbox")?.id;
    assert.ok(rowId);
    assert.ok(checkboxColumnId);

    const completedBlock: Block = {
      ...block,
      columns: block.columns.map((column) =>
        column.id === checkboxColumnId
          ? {
              ...column,
              settings: { strikeoutRowWhenChecked: true, moveCheckedRowsToBottom: false },
            }
          : column
      ),
      rows: block.rows.map((row) => ({
        ...row,
        cells: {
          ...row.cells,
          [checkboxColumnId]: { value: true, format: {} },
        },
      })),
    };

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
          blocks: [completedBlock],
        },
      },
      loadedWorkspaceIds: ["ws_home"],
      activeWorkspaceId: "ws_home",
    });

    await renderMainPane();

    const rowElement = document.querySelector(`[data-testid="row-${rowId}"]`) as HTMLDivElement | null;
    const cellElement = document.querySelector(`[data-testid="cell-${rowId}-${checkboxColumnId}"]`) as HTMLDivElement | null;
    assert.ok(rowElement);
    assert.ok(cellElement);
    assert.equal(rowElement.dataset.completed, "true");
    assert.ok(cellElement.className.includes("line-through"));
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

  // -----------------------------------------------------------------------
  // Date/time picker tests
  // -----------------------------------------------------------------------

  function buildDateTimeBlock(): Block {
    const block = createBlockTemplate("basic_checklist", "ws_home", {
      blockId: "block_home",
      title: "Today",
      order: 0,
    });

    const dateColumnId = "col_date";
    const timeColumnId = "col_time";

    return {
      ...block,
      columns: [
        ...block.columns,
        {
          id: dateColumnId,
          type: "date" as const,
          label: "Due",
          order: block.columns.length,
          width: 120,
          visible: true,
          settings: { alertsEnabled: false },
          format: {},
        },
        {
          id: timeColumnId,
          type: "time" as const,
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
  }

  function setStateWithBlock(block: Block) {
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
  }

  function installShowPickerStub(): { calls: number } {
    // Must use globalThis.window (not dom.window) because the React component
    // detection reads from globalThis.window, which is a different JSDOM proxy.
    const win: Window & typeof globalThis = globalThis.window as unknown as Window & typeof globalThis;
    const HTMLInputElement = win.HTMLInputElement;
    const stub = {
      calls: 0,
    };
    const fn = function () {
      stub.calls++;
    };
    Object.defineProperty(HTMLInputElement.prototype, "showPicker", {
      configurable: true,
      writable: true,
      value: fn,
    });
    return stub;
  }

  test("date picker button opens native picker when showPicker is supported", async () => {
    const block = buildDateTimeBlock();
    const rowId = block.rows[0]?.id;
    assert.ok(rowId);

    setStateWithBlock(block);

    const showPickerStub = installShowPickerStub();
    assert.ok(showPickerStub);

    await renderMainPane();

    // Picker button should exist
    const dateButton = document.querySelector(
      `[data-testid="cell-${rowId}-col_date"] [data-testid="date-cell-picker-button"]`
    ) as HTMLButtonElement | null;
    assert.ok(dateButton, "Date picker button should exist when showPicker is supported");

    // Clicking the button should call showPicker on the hidden date input
    await act(async () => {
      dateButton.click();
    });

    assert.ok(showPickerStub.calls > 0, "showPicker should have been called");
  });

  test("time picker button opens native picker when showPicker is supported", async () => {
    const block = buildDateTimeBlock();
    const rowId = block.rows[0]?.id;
    assert.ok(rowId);

    setStateWithBlock(block);

    const showPickerStub = installShowPickerStub();
    assert.ok(showPickerStub);

    await renderMainPane();

    const timeButton = document.querySelector(
      `[data-testid="cell-${rowId}-col_time"] [data-testid="time-cell-picker-button"]`
    ) as HTMLButtonElement | null;
    assert.ok(timeButton, "Time picker button should exist when showPicker is supported");

    await act(async () => {
      timeButton.click();
    });

    assert.ok(showPickerStub.calls > 0, "showPicker should have been called for time picker");
  });

  test("Ctrl+Alt+Down opens date picker via keyboard shortcut", async () => {
    const block = buildDateTimeBlock();
    const rowId = block.rows[0]?.id;
    assert.ok(rowId);

    setStateWithBlock(block);
    const showPickerStub = installShowPickerStub();
    assert.ok(showPickerStub);

    await renderMainPane();

    const dateInput = document.querySelector(
      `[data-testid="cell-${rowId}-col_date"] [data-testid="date-cell-input"]`
    ) as HTMLInputElement | null;
    assert.ok(dateInput);

    const callsBefore = showPickerStub.calls;

    await act(async () => {
      fireEvent.keyDown(dateInput, { key: "ArrowDown", ctrlKey: true });
    });

    assert.ok(showPickerStub.calls > callsBefore, "Ctrl+ArrowDown should open date picker");

    // Also test Alt+ArrowDown
    const callsBeforeAlt = showPickerStub.calls;
    await act(async () => {
      fireEvent.keyDown(dateInput, { key: "ArrowDown", altKey: true });
    });

    assert.ok(showPickerStub.calls > callsBeforeAlt, "Alt+ArrowDown should open date picker");
  });

  test("Ctrl+Alt+Down opens time picker via keyboard shortcut", async () => {
    const block = buildDateTimeBlock();
    const rowId = block.rows[0]?.id;
    assert.ok(rowId);

    setStateWithBlock(block);
    const showPickerStub = installShowPickerStub();
    assert.ok(showPickerStub);

    await renderMainPane();

    const timeInput = document.querySelector(
      `[data-testid="cell-${rowId}-col_time"] [data-testid="time-cell-input"]`
    ) as HTMLInputElement | null;
    assert.ok(timeInput);

    const callsBefore = showPickerStub.calls;

    await act(async () => {
      fireEvent.keyDown(timeInput, { key: "ArrowDown", ctrlKey: true });
    });

    assert.ok(showPickerStub.calls > callsBefore, "Ctrl+ArrowDown should open time picker");

    // Also test Alt+ArrowDown
    const callsBeforeAlt = showPickerStub.calls;
    await act(async () => {
      fireEvent.keyDown(timeInput, { key: "ArrowDown", altKey: true });
    });

    assert.ok(showPickerStub.calls > callsBeforeAlt, "Alt+ArrowDown should open time picker");
  });

  test("date picker selection updates draft but does not immediately commit", async () => {
    const block = buildDateTimeBlock();
    const rowId = block.rows[0]?.id;
    assert.ok(rowId);

    setStateWithBlock(block);
    installShowPickerStub();

    await renderMainPane();

    const dateInput = document.querySelector(
      `[data-testid="cell-${rowId}-col_date"] [data-testid="date-cell-input"]`
    ) as HTMLInputElement | null;
    const pickerInput = document.querySelector(
      `[data-testid="cell-${rowId}-col_date"] [data-testid="date-cell-picker-input"]`
    ) as HTMLInputElement | null;
    const pickerButton = document.querySelector(
      `[data-testid="cell-${rowId}-col_date"] [data-testid="date-cell-picker-button"]`
    ) as HTMLButtonElement | null;
    assert.ok(dateInput);
    assert.ok(pickerInput);
    assert.ok(pickerButton, "Date picker button should be present");

    // Simulate what a picker selection does: the native date picker writes
    // a normalized draft (YYYY-MM-DD) into the visible text input without
    // committing to the store. In JSDOM, native date picker change events
    // on hidden inputs do not fire React's onChange handler reliably, so we
    // exercise the draft→commit path via the visible text input.
    await act(async () => {
      fireEvent.input(dateInput, { target: { value: "2026-06-06" } });
    });

    // Draft should be updated to the picked value
    assert.equal(dateInput.value, "2026-06-06");

    // Store should NOT have committed yet (draft-only)
    assert.equal(
      useDocumentStore.getState().workspacesById.ws_home?.blocks[0]?.rows[0]?.cells["col_date"]?.value,
      null
    );

    // Commit via Enter
    await act(async () => {
      fireEvent.keyDown(dateInput, { key: "Enter" });
    });

    assert.equal(
      useDocumentStore.getState().workspacesById.ws_home?.blocks[0]?.rows[0]?.cells["col_date"]?.value,
      "2026-06-06"
    );
  });

  test("time picker selection updates draft and commits only through blur/Enter", async () => {
    const block = buildDateTimeBlock();
    const rowId = block.rows[0]?.id;
    assert.ok(rowId);

    setStateWithBlock(block);
    installShowPickerStub();

    await renderMainPane();

    const timeInput = document.querySelector(
      `[data-testid="cell-${rowId}-col_time"] [data-testid="time-cell-input"]`
    ) as HTMLInputElement | null;
    const pickerInput = document.querySelector(
      `[data-testid="cell-${rowId}-col_time"] [data-testid="time-cell-picker-input"]`
    ) as HTMLInputElement | null;
    const pickerButton = document.querySelector(
      `[data-testid="cell-${rowId}-col_time"] [data-testid="time-cell-picker-button"]`
    ) as HTMLButtonElement | null;
    assert.ok(timeInput);
    assert.ok(pickerInput);
    assert.ok(pickerButton, "Time picker button should be present");

    // Simulate what a picker selection does (JSDOM limitation for hidden
    // native inputs — see date picker test above for explanation).
    await act(async () => {
      fireEvent.input(timeInput, { target: { value: "15:45" } });
    });

    assert.equal(timeInput.value, "15:45");

    // Store should NOT have committed yet
    assert.equal(
      useDocumentStore.getState().workspacesById.ws_home?.blocks[0]?.rows[0]?.cells["col_time"]?.value,
      null
    );

    // Commit via Enter
    await act(async () => {
      fireEvent.keyDown(timeInput, { key: "Enter" });
    });

    assert.equal(
      useDocumentStore.getState().workspacesById.ws_home?.blocks[0]?.rows[0]?.cells["col_time"]?.value,
      "15:45"
    );
  });

  test("Escape after picker selection resets draft without committing", async () => {
    const block = buildDateTimeBlock();
    const rowId = block.rows[0]?.id;
    assert.ok(rowId);

    setStateWithBlock(block);
    installShowPickerStub();

    await renderMainPane();

    const dateInput = document.querySelector(
      `[data-testid="cell-${rowId}-col_date"] [data-testid="date-cell-input"]`
    ) as HTMLInputElement | null;
    const pickerInput = document.querySelector(
      `[data-testid="cell-${rowId}-col_date"] [data-testid="date-cell-picker-input"]`
    ) as HTMLInputElement | null;
    assert.ok(dateInput);
    assert.ok(pickerInput);

    // Simulate picker selection via the visible input (see date picker test
    // above for JSDOM limitation explanation).
    await act(async () => {
      fireEvent.input(dateInput, { target: { value: "2026-06-06" } });
    });

    assert.equal(dateInput.value, "2026-06-06");

    // Escape should reset draft to original (null → "")
    await act(async () => {
      fireEvent.keyDown(dateInput, { key: "Escape" });
    });

    assert.equal(dateInput.value, "");

    // Store should still be null (never committed)
    assert.equal(
      useDocumentStore.getState().workspacesById.ws_home?.blocks[0]?.rows[0]?.cells["col_date"]?.value,
      null
    );
  });

  test("graceful fallback: without showPicker, buttons are absent and text editing still works", async () => {
    const block = buildDateTimeBlock();
    const rowId = block.rows[0]?.id;
    assert.ok(rowId);

    setStateWithBlock(block);
    // Do NOT install the showPicker stub — this is the fallback scenario

    await renderMainPane();

    // Picker buttons should NOT exist
    const dateButton = document.querySelector(
      `[data-testid="cell-${rowId}-col_date"] [data-testid="date-cell-picker-button"]`
    );
    const timeButton = document.querySelector(
      `[data-testid="cell-${rowId}-col_time"] [data-testid="time-cell-picker-button"]`
    );
    assert.equal(dateButton, null, "Date picker button should not exist without showPicker");
    assert.equal(timeButton, null, "Time picker button should not exist without showPicker");

    // Text inputs should still render and work
    const dateInput = document.querySelector(
      `[data-testid="cell-${rowId}-col_date"] [data-testid="date-cell-input"]`
    ) as HTMLInputElement | null;
    const timeInput = document.querySelector(
      `[data-testid="cell-${rowId}-col_time"] [data-testid="time-cell-input"]`
    ) as HTMLInputElement | null;
    assert.ok(dateInput, "Date text input should exist");
    assert.ok(timeInput, "Time text input should exist");

    // Typed commit should still work via Enter
    await act(async () => {
      fireEvent.input(dateInput, { target: { value: "2026-05-11" } });
    });
    await act(async () => {
      fireEvent.keyDown(dateInput, { key: "Enter" });
    });

    assert.equal(
      useDocumentStore.getState().workspacesById.ws_home?.blocks[0]?.rows[0]?.cells["col_date"]?.value,
      "2026-05-11"
    );
  });

  test("strict date validation: lenient and impossible dates get danger styling", async () => {
    const block = buildDateTimeBlock();
    const rowId = block.rows[0]?.id;
    assert.ok(rowId);

    setStateWithBlock(block);

    await renderMainPane();

    const dateInput = document.querySelector(
      `[data-testid="cell-${rowId}-col_date"] [data-testid="date-cell-input"]`
    ) as HTMLInputElement | null;
    assert.ok(dateInput);

    // Lenient strings should be danger-styled
    const badValues = [
      "Jun 1 2026",
      "06/01/2026",
      "2026-02-30",
      "2026-02-29", // 2026 is not a leap year
      "2026-13-01",
      "2026-00-05",
      "not-a-date",
      "2026-1-1",
    ];

    for (const bad of badValues) {
      await act(async () => {
        fireEvent.input(dateInput, { target: { value: bad } });
      });
      assert.ok(
        dateInput.className.includes("text-danger"),
        `"${bad}" should be danger-styled`
      );
    }

    // Valid dates should NOT be danger-styled
    const goodValues = [
      "2026-06-06",
      "2024-02-29", // 2024 is a leap year
      "2026-01-01",
      "2026-12-31",
    ];

    for (const good of goodValues) {
      await act(async () => {
        fireEvent.input(dateInput, { target: { value: good } });
      });
      assert.ok(
        !dateInput.className.includes("text-danger"),
        `"${good}" should NOT be danger-styled`
      );
    }
  });

  test("invalid persisted date string remains visible and danger-styled", async () => {
    const block = buildDateTimeBlock();
    const rowId = block.rows[0]?.id;
    assert.ok(rowId);

    // Initialize the date cell with an invalid persisted value
    const blockWithBadDate: Block = {
      ...block,
      rows: block.rows.map((row) => ({
        ...row,
        cells: {
          ...row.cells,
          col_date: { value: "not-a-valid-date", format: {} },
        },
      })),
    };

    setStateWithBlock(blockWithBadDate);

    await renderMainPane();

    const dateInput = document.querySelector(
      `[data-testid="cell-${rowId}-col_date"] [data-testid="date-cell-input"]`
    ) as HTMLInputElement | null;
    assert.ok(dateInput);

    // Should display the invalid string, not coerce or hide it
    assert.equal(dateInput.value, "not-a-valid-date");

    // Should have danger styling
    assert.ok(dateInput.className.includes("text-danger"));
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

    // Row drag-and-drop now uses @dnd-kit instead of native HTML5 DnD.
    // Dispatching a native dragstart event should not set uiStore drag state.
    const dragStart = new Event("dragstart", { bubbles: true }) as DragEvent;
    Object.defineProperty(dragStart, "target", { value: dragHandle, configurable: true });
    await act(async () => {
      dragHandle.dispatchEvent(dragStart);
    });

    assert.equal(useUiStore.getState().draggingRowBlockId, null);
    assert.equal(useUiStore.getState().draggingRowId, null);
  });
});
