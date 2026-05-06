import { useDocumentStore } from "../../stores/documentStore.js";
import { useUiStore } from "../../stores/uiStore.js";

export function MainPane() {
  const workspaceIndex = useDocumentStore((state) => state.workspaceIndex);
  const workspaceById = useDocumentStore((state) => state.workspacesById);
  const activeWorkspaceId = useDocumentStore((state) => state.activeWorkspaceId);
  const activeWorkspace = workspaceIndex.find((entry) => entry.id === activeWorkspaceId) ?? workspaceIndex[0] ?? null;
  const inspectorOpen = useUiStore((state) => state.inspectorOpen);

  const workspaceDocument = activeWorkspace ? workspaceById[activeWorkspace.id] ?? null : null;
  const blockCount = workspaceDocument?.blocks.length ?? 0;

  return (
    <section className="min-h-0 min-w-0 bg-canvas px-5 py-5">
      <div className="h-full rounded-3xl border border-border bg-panel/80 px-6 py-6 shadow-soft">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-textMuted">Workspace canvas</p>
            <h2 className="mt-2 text-3xl font-semibold">{activeWorkspace?.title ?? "No workspace selected"}</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-textMuted">
              This checkpoint stops at the shell. Blocks, rows, and cells will render in a later pass.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-panelMuted px-4 py-3 text-right">
            <div className="text-xs uppercase tracking-[0.24em] text-textMuted">Blocks</div>
            <div className="mt-1 text-lg font-semibold">{blockCount}</div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
          <div className="rounded-2xl border border-border bg-panelMuted/60 px-5 py-5">
            <div className="text-sm font-medium text-text">Empty workspace shell</div>
            <p className="mt-2 text-sm leading-6 text-textMuted">
              {activeWorkspace
                ? "The dock, top bar, settings route, and workspace controls are wired. Block editing is not yet enabled."
                : "Create or select a workspace to continue."}
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                className="rounded-lg border border-border bg-panel px-4 py-2 text-sm font-medium text-textMuted"
                disabled
                type="button"
              >
                Add your first block
              </button>
              <button
                className="rounded-lg border border-border bg-transparent px-4 py-2 text-sm font-medium text-textMuted"
                disabled
                type="button"
              >
                Preset block
              </button>
            </div>
          </div>

          <div
            className={`rounded-2xl border px-5 py-5 ${
              inspectorOpen ? "border-accent/40 bg-accent/10" : "border-border bg-panelMuted/60"
            }`}
          >
            <div className="text-sm font-medium text-text">Inspector status</div>
            <p className="mt-2 text-sm leading-6 text-textMuted">
              {inspectorOpen ? "Inspector is open and showing workspace styling controls." : "Inspector is collapsed."}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
