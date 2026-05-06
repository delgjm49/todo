import { BLOCK_TEMPLATES, type BlockTemplateDefinition } from "../../domain/templates/blockTemplates.js";

export function BlockTemplateMenu({
  onSelectTemplate,
}: {
  onSelectTemplate: (template: BlockTemplateDefinition["type"]) => void;
}) {
  return (
    <div className="w-64 rounded-xl border border-border bg-panel px-2 py-2 shadow-soft">
      <div className="px-3 py-2 text-xs uppercase tracking-[0.24em] text-textMuted">Add block</div>
      <div className="space-y-1">
        {BLOCK_TEMPLATES.map((template) => (
          <button
            key={template.type}
            className="block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-text transition hover:bg-panelMuted"
            onClick={() => onSelectTemplate(template.type)}
            type="button"
          >
            <div>{template.label}</div>
            <div className="mt-1 text-xs font-normal text-textMuted">{template.title}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
