import type { Block } from "../../types/block.js";

export function BlockCard({ block }: { block: Block }) {
  return (
    <article className="overflow-hidden rounded-3xl border border-border bg-panel/85 shadow-soft">
      <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-[0.24em] text-textMuted">Block {block.order + 1}</div>
          <h3 className="mt-1 truncate text-xl font-semibold">{block.title}</h3>
          <p className="mt-2 text-sm text-textMuted">{formatBlockTypeLabel(block.blockType)}</p>
        </div>

        <div className="flex items-center gap-2">
          <button className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-textMuted" disabled type="button">
            Collapse
          </button>
          <button className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-textMuted" disabled type="button">
            Menu
          </button>
        </div>
      </header>

      <div className="px-5 py-5">
        <div className="rounded-2xl border border-dashed border-border bg-panelMuted/50 px-4 py-6 text-sm text-textMuted">
          Block body rendering is deferred to the next checkpoint.
        </div>
      </div>
    </article>
  );
}

function formatBlockTypeLabel(blockType: Block["blockType"]): string {
  if (blockType === "basic_checklist") {
    return "Checklist";
  }

  if (blockType === "bulleted_list") {
    return "Bullet list";
  }

  return "Numbered list";
}
