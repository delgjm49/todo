import { useDocumentStore } from "../../stores/documentStore.js";
import type { Selection } from "../../types/ui.js";
import type { BorderEdge } from "../../types/formatting.js";
import { resolveSelectedFormattingTarget } from "../../domain/formatting/selectedFormattingTarget.js";
import type { FormattingLayer } from "../../domain/formatting/mergeFormatting.js";
import { FieldCard } from "./FieldCard.js";

const EDGE_ORDER: BorderEdge[] = ["top", "right", "bottom", "left"];

function ResetButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      className="shrink-0 rounded-md border border-border px-2 py-1 text-[11px] text-textMuted transition hover:border-accent/40 hover:text-text"
      onClick={onClick}
      type="button"
    >
      Reset
    </button>
  );
}

function InheritedLabel() {
  return <span className="text-[11px] text-textMuted">Inherited</span>;
}

export function BorderFormattingControls({ selection }: { selection: Selection }) {
  const updateSelectedBorderFormatting = useDocumentStore(
    (state) => state.updateSelectedBorderFormatting
  );
  const workspaceIndex = useDocumentStore((state) => state.workspaceIndex);
  const workspacesById = useDocumentStore((state) => state.workspacesById);
  const activeWorkspaceId = useDocumentStore((state) => state.activeWorkspaceId);
  const settings = useDocumentStore((state) => state.settings);

  const activeWorkspace =
    workspaceIndex.find((entry) => entry.id === activeWorkspaceId) ?? null;
  const workspaceDocument = activeWorkspace
    ? workspacesById[activeWorkspace.id] ?? null
    : null;

  const target = settings
    ? resolveSelectedFormattingTarget(
        selection,
        activeWorkspace,
        workspaceDocument,
        settings.defaults
      )
    : null;

  if (!target) {
    return (
      <div className="mt-4 rounded-2xl border border-border bg-panelMuted/60 px-4 py-4">
        <p className="text-sm text-textMuted">
          Select a block, column, row, or cell to format borders.
        </p>
      </div>
    );
  }

  const { direct, effective } = target;

  const patch = (key: keyof FormattingLayer, value: FormattingLayer[keyof FormattingLayer] | undefined) => {
    void updateSelectedBorderFormatting(selection, { [key]: value });
  };

  const widthValue = direct.borderWidth ?? effective.borderWidth ?? 1;
  const colorValue = direct.borderColor ?? effective.borderColor ?? "#000000";

  const directEdges = "edges" in direct ? direct.edges : undefined;
  const effectiveEdges = effective.edges ?? [];
  const displayEdges = directEdges ?? effectiveEdges;

  const toggleEdge = (edge: BorderEdge) => {
    const base = directEdges !== undefined ? directEdges : effectiveEdges;
    const hasEdge = base.includes(edge);
    const next = hasEdge ? base.filter((e) => e !== edge) : [...base, edge];
    const canonical = EDGE_ORDER.filter((e) => next.includes(e));
    patch("edges", canonical);
  };

  return (
    <div className="mt-4 space-y-4">
      <div className="text-xs uppercase tracking-[0.24em] text-textMuted">Border formatting</div>

      <FieldCard label="Border width">
        <div className="flex items-center gap-2">
          <input
            aria-label="Border width"
            className="h-9 flex-1 rounded-lg border border-border bg-transparent px-2 text-sm text-text"
            max={8}
            min={0}
            onChange={(event) => {
              const value = event.target.value === "" ? undefined : Number(event.target.value);
              patch("borderWidth", value);
            }}
            type="number"
            value={widthValue}
          />
          {"borderWidth" in direct && (
            <ResetButton onClick={() => patch("borderWidth", undefined)} />
          )}
        </div>
        {!("borderWidth" in direct) && <InheritedLabel />}
      </FieldCard>

      <FieldCard label="Border color">
        <div className="flex items-center gap-2">
          <input
            aria-label="Border color"
            className="h-10 w-full rounded-lg border border-border bg-transparent p-1"
            onChange={(event) => patch("borderColor", event.target.value || undefined)}
            type="color"
            value={colorValue}
          />
          {"borderColor" in direct && (
            <ResetButton onClick={() => patch("borderColor", undefined)} />
          )}
        </div>
        {!("borderColor" in direct) && <InheritedLabel />}
      </FieldCard>

      <FieldCard label="Edges">
        <div className="flex items-center gap-2">
          {EDGE_ORDER.map((edge) => (
            <EdgeToggleButton
              key={edge}
              active={displayEdges.includes(edge)}
              label={edge[0]!.toUpperCase()}
              onClick={() => toggleEdge(edge)}
              title={`Toggle ${edge} border`}
            />
          ))}
          {"edges" in direct && (
            <ResetButton onClick={() => patch("edges", undefined)} />
          )}
        </div>
        {!("edges" in direct) && <InheritedLabel />}
      </FieldCard>
    </div>
  );
}

function EdgeToggleButton({
  active,
  label,
  onClick,
  title,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      className={`h-9 w-9 rounded-lg border text-sm font-semibold transition ${
        active
          ? "border-accent/60 bg-accent/10 text-accent"
          : "border-border bg-transparent text-textMuted hover:border-accent/40 hover:text-text"
      }`}
      onClick={onClick}
      title={title}
      type="button"
    >
      {label}
    </button>
  );
}
