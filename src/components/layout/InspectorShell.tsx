import type { ReactNode } from "react";
import { useDocumentStore } from "../../stores/documentStore.js";

export function InspectorShell() {
  const workspaceIndex = useDocumentStore((state) => state.workspaceIndex);
  const activeWorkspaceId = useDocumentStore((state) => state.activeWorkspaceId);
  const updateWorkspaceStyle = useDocumentStore((state) => state.updateWorkspaceStyle);
  const activeWorkspace = workspaceIndex.find((entry) => entry.id === activeWorkspaceId) ?? workspaceIndex[0] ?? null;

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
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-panelMuted/60 px-4 py-4">
      <div className="text-xs uppercase tracking-[0.24em] text-textMuted">{label}</div>
      <div className="mt-3">{children}</div>
    </section>
  );
}
