import { useDocumentStore } from "../../stores/documentStore.js";
import { useUiStore } from "../../stores/uiStore.js";
import { buildInspectorTargetSummary } from "./inspectorTargetSummary.js";

export function InspectorShell() {
  const workspaceIndex = useDocumentStore((state) => state.workspaceIndex);
  const workspacesById = useDocumentStore((state) => state.workspacesById);
  const activeWorkspaceId = useDocumentStore((state) => state.activeWorkspaceId);
  const updateWorkspaceStyle = useDocumentStore((state) => state.updateWorkspaceStyle);
  const selection = useUiStore((state) => state.selection);

  const activeWorkspace = workspaceIndex.find((entry) => entry.id === activeWorkspaceId) ?? workspaceIndex[0] ?? null;
  const workspaceDocument = activeWorkspace ? workspacesById[activeWorkspace.id] ?? null : null;

  const summary = buildInspectorTargetSummary({
    selection,
    activeWorkspace,
    workspaceDocument,
  });

  if (!activeWorkspace) {
    return (
      <aside className="border-l border-border bg-panel/85 px-5 py-5">
        <div className="rounded-2xl border border-border bg-panelMuted/60 px-4 py-4 text-sm text-textMuted">
          No workspace is selected.
        </div>
      </aside>
    );
  }

  return (
    <aside className="border-l border-border bg-panel/90 px-5 py-5">
      <div className="rounded-2xl border border-border bg-panelMuted/70 px-4 py-4">
        <div className="text-xs uppercase tracking-[0.28em] text-textMuted">Inspector</div>
        <h3 className="mt-2 text-lg font-semibold">{activeWorkspace.title}</h3>
        <p className="mt-2 text-sm leading-6 text-textMuted">
          Workspace styling is exposed here while block-level editing is still deferred.
        </p>
      </div>

      <div className="mt-4 rounded-2xl border border-border bg-panelMuted/60 px-4 py-4">
        <div className="text-xs uppercase tracking-[0.24em] text-textMuted">Target summary</div>
        <div className="mt-2">
          <span className="text-xs font-medium uppercase tracking-wider text-accent">{summary.eyebrow}</span>
          <h4 className="mt-1 text-sm font-semibold text-text">{summary.title}</h4>
          <p className="mt-1 text-sm leading-5 text-textMuted">{summary.description}</p>
        </div>
        {summary.details.length > 0 && (
          <dl className="mt-3 space-y-1">
            {summary.details.map((detail) => (
              <div key={detail.label} className="flex items-baseline justify-between gap-3">
                <dt className="text-xs text-textMuted">{detail.label}</dt>
                <dd className="text-sm text-text">{detail.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      <div className="mt-4 space-y-4">
        <FieldCard label="Background color">
          <input
            aria-label="Workspace background color"
            className="h-10 w-full rounded-lg border border-border bg-transparent p-1"
            onChange={(event) =>
              void updateWorkspaceStyle(activeWorkspace.id, {
                background: event.target.value,
              })
            }
            value={activeWorkspace.style.background ?? "#1F2937"}
            type="color"
          />
        </FieldCard>

        <FieldCard label="Text color">
          <input
            aria-label="Workspace text color"
            className="h-10 w-full rounded-lg border border-border bg-transparent p-1"
            onChange={(event) =>
              void updateWorkspaceStyle(activeWorkspace.id, {
                textColor: event.target.value,
              })
            }
            value={activeWorkspace.style.textColor ?? "#F9FAFB"}
            type="color"
          />
        </FieldCard>

        <FieldCard label="Accent stripe">
          <label className="flex items-center gap-3 text-sm text-text">
            <input
              checked={activeWorkspace.style.accentStripe?.enabled ?? false}
              onChange={(event) =>
                void updateWorkspaceStyle(activeWorkspace.id, {
                  accentStripe: {
                    enabled: event.target.checked,
                  },
                })
              }
              type="checkbox"
            />
            Show accent stripe
          </label>
        </FieldCard>

        <FieldCard label="Accent stripe color">
          <input
            aria-label="Accent stripe color"
            className="h-10 w-full rounded-lg border border-border bg-transparent p-1"
            onChange={(event) =>
              void updateWorkspaceStyle(activeWorkspace.id, {
                accentStripe: {
                  color: event.target.value,
                },
              })
            }
            value={activeWorkspace.style.accentStripe?.color ?? "#60A5FA"}
            type="color"
          />
        </FieldCard>
      </div>
    </aside>
  );
}

function FieldCard({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-panelMuted/60 px-4 py-4">
      <div className="text-xs uppercase tracking-[0.24em] text-textMuted">{label}</div>
      <div className="mt-3">{children}</div>
    </section>
  );
}