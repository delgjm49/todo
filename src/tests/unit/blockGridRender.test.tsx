import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { createColumn } from "../../domain/columns/createColumn.js";
import { BlockCard } from "../../components/block/BlockCard.js";
import { BlockContextMenu } from "../../components/block/BlockContextMenu.js";
import type { Block } from "../../types/block.js";

function createBlockFixture(): Block {
  const colTextB = createColumn("text", { id: "col_text_b", order: 1, width: 220, label: "Task" });
  const colNum = createColumn("numbered", { id: "col_num", order: 0, width: 44, label: "" });
  const colCheck = createColumn("checkbox", { id: "col_check", order: 2, width: 44, label: "" });

  return {
    id: "block_1",
    workspaceId: "ws_1",
    title: "Checklist",
    blockType: "basic_checklist",
    order: 0,
    collapsed: false,
    border: {
      borderWidth: 1,
      borderColor: "#374151",
      edges: ["top", "right", "bottom", "left"],
    },
    sort: null,
    format: {},
    columns: [colTextB, colNum, colCheck],
    rows: [
      {
        id: "row_2",
        order: 1,
        format: {},
        cells: {
          col_num: { value: null, format: {} },
          col_text_b: { value: "Second", format: {} },
          col_check: { value: true, format: {} },
        },
      },
      {
        id: "row_1",
        order: 0,
        format: {},
        cells: {
          col_num: { value: null, format: {} },
          col_text_b: { value: "First", format: {} },
          col_check: { value: false, format: {} },
        },
      },
    ],
  };
}

describe("block grid render", () => {
  test("renders header and row grid using stored column and row order", () => {
    const block = createBlockFixture();
    const html = renderToStaticMarkup(
      <BlockCard
        block={block}
        dragging={false}
        dropTarget={false}
        isEditing={false}
        isSelected={false}
        onCancelEditing={() => {}}
        onCommitTitle={() => {}}
        onDragEnd={() => {}}
        onDragOver={(event) => {
          void event;
        }}
        onDragStart={() => {}}
        onDrop={() => {}}
        onOpenMenu={() => {}}
        onSelectBlock={() => {}}
        onStartEditing={() => {}}
        onToggleCollapsed={() => {}}
        onAddRow={() => {}}
      />
    );

    assert.notEqual(html.includes("Row and cell editing land in the next checkpoint"), true);
    // Marker header glyphs: # for numbered, • for bullet (not present here).
    assert.ok(html.includes("#"));
    assert.ok(html.indexOf("#") < html.indexOf("Task"));
    // Old type-letter badges (NUM/CHK/TXT/BLT/DATE/TIME/OPT) are gone.
    assert.equal(html.includes(">NUM<"), false);
    assert.equal(html.includes(">CHK<"), false);
    assert.equal(html.includes(">TXT<"), false);
    assert.ok(html.indexOf("First") < html.indexOf("Second"));
    assert.ok(html.includes('data-testid="column-header-col_num"'));
    assert.ok(html.includes('data-testid="column-header-col_text_b"'));
    assert.ok(html.includes('data-testid="column-header-col_check"'));
    assert.ok(html.includes('data-testid="sort-menu-block_1"'));
  });

  test("renders sort menu choices for visible sortable columns and excludes numbered columns", () => {
    const block = createBlockFixture();
    const html = renderToStaticMarkup(
      <BlockContextMenu
        block={block}
        onDelete={() => {}}
        onMoveToWorkspace={() => {}}
        onRename={() => {}}
        onSort={() => {}}
        onToggleCollapsed={() => {}}
        workspaces={[{ id: "ws_1", title: "Home", order: 0, style: { background: "#fff", textColor: "#111", accentStripe: { enabled: true, color: "#60A5FA" } } }]}
      />
    );

    assert.ok(html.includes('data-testid="block-sort-section"'));
    assert.ok(html.includes('data-testid="sort-block_1-col_text_b-asc"'));
    assert.ok(html.includes('data-testid="sort-block_1-col_text_b-desc"'));
    assert.ok(html.includes('data-testid="sort-block_1-col_check-asc"'));
    assert.equal(html.includes('data-testid="sort-block_1-col_num-asc"'), false);
    assert.ok(html.indexOf("Task") < html.indexOf("Checkbox"));
  });

  test("renders an empty sort state when no visible sortable columns are available", () => {
    const block = createBlockFixture();
    const numberedOnlyBlock = {
      ...block,
      columns: [createColumn("numbered", { id: "col_only_numbered", order: 0, width: 44, label: "" })],
    };

    const html = renderToStaticMarkup(
      <BlockContextMenu
        block={numberedOnlyBlock}
        onDelete={() => {}}
        onMoveToWorkspace={() => {}}
        onRename={() => {}}
        onSort={() => {}}
        onToggleCollapsed={() => {}}
        workspaces={[]}
      />
    );

    assert.ok(html.includes("No sortable columns available."));
    assert.equal(html.includes("sort-block_1-col_only_numbered-asc"), false);
  });
});
