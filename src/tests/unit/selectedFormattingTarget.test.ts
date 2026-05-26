import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { resolveSelectedFormattingTarget } from "../../domain/formatting/selectedFormattingTarget.js";
import type { Selection } from "../../types/ui.js";
import type { WorkspaceIndexEntry, WorkspaceDocument } from "../../types/workspace.js";
import type { AppDefaults } from "../../types/settings.js";
import type { Block } from "../../types/block.js";
import type { ColumnDefinition } from "../../types/column.js";
import type { PersistedCell, Row } from "../../types/row.js";

// ---------------------------------------------------------------------------
// Factory helpers
// ---------------------------------------------------------------------------

function appDefaults(overrides: Partial<AppDefaults> = {}): AppDefaults {
  return {
    fontFamily: "sans-serif",
    fontSize: 14,
    textColor: "#000000",
    cellBackground: "#ffffff",
    blockBorderColor: "#d1d5db",
    blockBorderWidth: 1,
    workspaceAccentEnabled: false,
    workspaceBackground: "#f9fafb",
    workspaceTextColor: "#111827",
    workspaceAccentColor: "#3b82f6",
    ...overrides,
  };
}

function column(overrides: Partial<ColumnDefinition> & Pick<ColumnDefinition, "id" | "type">): ColumnDefinition {
  return {
    label: overrides.id,
    order: 0,
    width: 120,
    visible: true,
    settings: {},
    format: {},
    ...overrides,
  };
}

function row(id: string, order: number, values: Record<string, PersistedCell["value"] | undefined>, format: Row["format"] = {}): Row {
  const cells: Record<string, PersistedCell> = {};
  for (const [columnId, value] of Object.entries(values)) {
    if (value !== undefined) {
      cells[columnId] = { value, format: {} };
    }
  }
  return { id, order, format, cells };
}

function block(overrides: Partial<Block> & { id: string; columns: ColumnDefinition[]; rows: Row[] }): Block {
  return {
    workspaceId: "ws_test",
    title: "Test Block",
    blockType: "basic_checklist",
    order: 0,
    collapsed: false,
    border: {},
    sort: null,
    format: {},
    ...overrides,
  };
}

function workspaceDocument(blocks: Block[]): WorkspaceDocument {
  return { id: "ws_test", blocks };
}

function workspaceIndexEntry(overrides: Partial<WorkspaceIndexEntry> & { id: string }): WorkspaceIndexEntry {
  return {
    title: "Test",
    order: 0,
    style: {},
    ...overrides,
  };
}

function selection(sel: Selection): Selection {
  return sel;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("resolveSelectedFormattingTarget", () => {
  test('selection kind "none" returns null', () => {
    const result = resolveSelectedFormattingTarget(
      selection({ kind: "none" }),
      workspaceIndexEntry({ id: "ws_test" }),
      workspaceDocument([block({ id: "b1", columns: [], rows: [] })]),
      appDefaults()
    );
    assert.equal(result, null);
  });

  test("workspaceDocument null returns null for any non-none selection", () => {
    const result = resolveSelectedFormattingTarget(
      selection({ kind: "block", workspaceId: "ws_test", blockId: "b1" }),
      workspaceIndexEntry({ id: "ws_test" }),
      null,
      appDefaults()
    );
    assert.equal(result, null);
  });

  test("block not found in document returns null", () => {
    const result = resolveSelectedFormattingTarget(
      selection({ kind: "block", workspaceId: "ws_test", blockId: "missing" }),
      workspaceIndexEntry({ id: "ws_test" }),
      workspaceDocument([block({ id: "b1", columns: [], rows: [] })]),
      appDefaults()
    );
    assert.equal(result, null);
  });

  test('selection kind "block" returns block target with merged effective', () => {
    const appDef = appDefaults({ fontFamily: "serif", fontSize: 16 });
    const doc = workspaceDocument([
      block({
        id: "b1",
        format: { bold: true },
        columns: [],
        rows: [],
      }),
    ]);

    const result = resolveSelectedFormattingTarget(
      selection({ kind: "block", workspaceId: "ws_test", blockId: "b1" }),
      workspaceIndexEntry({ id: "ws_test" }),
      doc,
      appDef
    );

    assert.notEqual(result, null);
    assert.equal(result!.kind, "block");
    assert.deepEqual(result!.direct, { bold: true });
    // effective: appDefaults merged with block format
    assert.equal(result!.effective.fontFamily, "serif");
    assert.equal(result!.effective.fontSize, 16);
    assert.equal(result!.effective.bold, true);
  });

  test('selection kind "column" with found column returns column target', () => {
    const appDef = appDefaults({ fontFamily: "serif" });
    const cols = [
      column({ id: "col1", type: "text", format: { italic: true } }),
    ];
    const doc = workspaceDocument([
      block({
        id: "b1",
        format: { bold: true },
        columns: cols,
        rows: [],
      }),
    ]);

    const result = resolveSelectedFormattingTarget(
      selection({ kind: "column", workspaceId: "ws_test", blockId: "b1", columnId: "col1" }),
      workspaceIndexEntry({ id: "ws_test" }),
      doc,
      appDef
    );

    assert.notEqual(result, null);
    assert.equal(result!.kind, "column");
    assert.deepEqual(result!.direct, { italic: true });
    // effective: appDefaults + block + column
    assert.equal(result!.effective.fontFamily, "serif");
    assert.equal(result!.effective.bold, true);
    assert.equal(result!.effective.italic, true);
  });

  test('selection kind "column" with missing column returns null', () => {
    const doc = workspaceDocument([
      block({
        id: "b1",
        columns: [column({ id: "col1", type: "text" })],
        rows: [],
      }),
    ]);

    const result = resolveSelectedFormattingTarget(
      selection({ kind: "column", workspaceId: "ws_test", blockId: "b1", columnId: "missing" }),
      workspaceIndexEntry({ id: "ws_test" }),
      doc,
      appDefaults()
    );

    assert.equal(result, null);
  });

  test('selection kind "column" with hidden column returns null', () => {
    const doc = workspaceDocument([
      block({
        id: "b1",
        columns: [column({ id: "col1", type: "text", visible: false })],
        rows: [],
      }),
    ]);

    const result = resolveSelectedFormattingTarget(
      selection({ kind: "column", workspaceId: "ws_test", blockId: "b1", columnId: "col1" }),
      workspaceIndexEntry({ id: "ws_test" }),
      doc,
      appDefaults()
    );

    assert.equal(result, null);
  });

  test('selection kind "row" with found row returns row target', () => {
    const appDef = appDefaults({ fontFamily: "serif" });
    const cols = [column({ id: "col1", type: "text" })];
    const rows = [row("r1", 0, { col1: "hello" }, { italic: true })];
    const doc = workspaceDocument([
      block({
        id: "b1",
        format: { bold: true },
        columns: cols,
        rows,
      }),
    ]);

    const result = resolveSelectedFormattingTarget(
      selection({ kind: "row", workspaceId: "ws_test", blockId: "b1", rowId: "r1" }),
      workspaceIndexEntry({ id: "ws_test" }),
      doc,
      appDef
    );

    assert.notEqual(result, null);
    assert.equal(result!.kind, "row");
    assert.deepEqual(result!.direct, { italic: true });
    // effective: appDefaults merged with block, then row
    assert.equal(result!.effective.fontFamily, "serif");
    assert.equal(result!.effective.bold, true);
    assert.equal(result!.effective.italic, true);
  });

  test('selection kind "row" with missing row returns null', () => {
    const doc = workspaceDocument([
      block({
        id: "b1",
        columns: [column({ id: "col1", type: "text" })],
        rows: [row("r1", 0, { col1: "hello" })],
      }),
    ]);

    const result = resolveSelectedFormattingTarget(
      selection({ kind: "row", workspaceId: "ws_test", blockId: "b1", rowId: "missing" }),
      workspaceIndexEntry({ id: "ws_test" }),
      doc,
      appDefaults()
    );

    assert.equal(result, null);
  });

  test('selection kind "cell" with cell having format returns cell target', () => {
    const appDef = appDefaults({ fontFamily: "serif" });
    const cols = [column({ id: "col1", type: "text" })];
    const r = row("r1", 0, { col1: "hello" });
    // Give the cell a format
    r.cells.col1 = { value: "hello", format: { underline: true } };
    const rows = [r];
    const doc = workspaceDocument([
      block({
        id: "b1",
        format: { bold: true },
        columns: cols,
        rows,
      }),
    ]);

    const result = resolveSelectedFormattingTarget(
      selection({ kind: "cell", workspaceId: "ws_test", blockId: "b1", rowId: "r1", columnId: "col1" }),
      workspaceIndexEntry({ id: "ws_test" }),
      doc,
      appDef
    );

    assert.notEqual(result, null);
    assert.equal(result!.kind, "cell");
    assert.deepEqual(result!.direct, { underline: true });
    // effective: appDefaults + block + column + row + cell
    assert.equal(result!.effective.fontFamily, "serif");
    assert.equal(result!.effective.bold, true);
    assert.equal(result!.effective.underline, true);
  });

  test('selection kind "cell" with missing cell row entry returns null', () => {
    const cols = [column({ id: "col1", type: "text" })];
    const doc = workspaceDocument([
      block({
        id: "b1",
        columns: cols,
        rows: [row("r1", 0, { col1: "hello" })],
      }),
    ]);

    const result = resolveSelectedFormattingTarget(
      selection({ kind: "cell", workspaceId: "ws_test", blockId: "b1", rowId: "missing", columnId: "col1" }),
      workspaceIndexEntry({ id: "ws_test" }),
      doc,
      appDefaults()
    );

    assert.equal(result, null);
  });

  test('selection kind "cell" with missing column returns null', () => {
    const cols = [column({ id: "col1", type: "text" })];
    const doc = workspaceDocument([
      block({
        id: "b1",
        columns: cols,
        rows: [row("r1", 0, { col1: "hello" })],
      }),
    ]);

    const result = resolveSelectedFormattingTarget(
      selection({ kind: "cell", workspaceId: "ws_test", blockId: "b1", rowId: "r1", columnId: "missing" }),
      workspaceIndexEntry({ id: "ws_test" }),
      doc,
      appDefaults()
    );

    assert.equal(result, null);
  });

  test('selection kind "cell" with undefined cell in row.cells yields empty direct', () => {
    const appDef = appDefaults({ fontFamily: "serif" });
    const cols = [column({ id: "col1", type: "text" })];
    // row has no cell for col1
    const r: Row = { id: "r1", order: 0, format: { italic: true }, cells: {} };
    const doc = workspaceDocument([
      block({
        id: "b1",
        format: { bold: true },
        columns: cols,
        rows: [r],
      }),
    ]);

    const result = resolveSelectedFormattingTarget(
      selection({ kind: "cell", workspaceId: "ws_test", blockId: "b1", rowId: "r1", columnId: "col1" }),
      workspaceIndexEntry({ id: "ws_test" }),
      doc,
      appDef
    );

    assert.notEqual(result, null);
    assert.equal(result!.kind, "cell");
    assert.deepEqual(result!.direct, {});
    // effective: appDefaults + block + column + row (no cell format)
    assert.equal(result!.effective.fontFamily, "serif");
    assert.equal(result!.effective.bold, true);
    assert.equal(result!.effective.italic, true);
  });
});
