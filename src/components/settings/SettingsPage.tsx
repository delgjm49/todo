import { useDocumentStore } from "../../stores/documentStore.js";
import { useUiStore } from "../../stores/uiStore.js";

export function SettingsPage() {
  const settings = useDocumentStore((state) => state.settings);
  const showMainScreen = useUiStore((state) => state.showMainScreen);

  return (
    <main className="min-h-screen bg-canvas px-6 py-6 text-text">
      <div className="mx-auto max-w-5xl rounded-3xl border border-border bg-panel/90 px-6 py-6 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-textMuted">Settings</p>
            <h1 className="mt-2 text-3xl font-semibold">Application settings shell</h1>
          </div>
          <button
            className="rounded-lg border border-border bg-panel px-4 py-2 text-sm font-medium text-text transition hover:border-accent/40 hover:bg-panelMuted"
            onClick={() => showMainScreen()}
            type="button"
          >
            Back to workspace
          </button>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <SettingsSection
            title="Appearance"
            entries={[
              ["Theme", settings?.theme ?? "dark"],
              ["Text color", settings?.defaults.textColor ?? "#F3F4F6"],
              ["Cell background", settings?.defaults.cellBackground ?? "#111827"],
            ]}
          />
          <SettingsSection
            title="Editor defaults"
            entries={[
              ["Font family", settings?.defaults.fontFamily ?? "Segoe UI"],
              ["Font size", `${settings?.defaults.fontSize ?? 14}px`],
              ["Block border", settings?.defaults.blockBorderColor ?? "#374151"],
            ]}
          />
          <SettingsSection
            title="Workspace defaults"
            entries={[
              ["Accent enabled", settings?.defaults.workspaceAccentEnabled ? "Yes" : "No"],
              ["Border width", `${settings?.defaults.blockBorderWidth ?? 1}px`],
              ["Theme mode", settings?.theme ?? "dark"],
            ]}
          />
        </div>
      </div>
    </main>
  );
}

function SettingsSection({
  title,
  entries,
}: {
  title: string;
  entries: Array<[string, string | boolean]>;
}) {
  return (
    <section className="rounded-2xl border border-border bg-panelMuted/60 px-5 py-5">
      <h2 className="text-lg font-semibold">{title}</h2>
      <dl className="mt-4 space-y-3">
        {entries.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-4 border-b border-border/60 pb-3 last:border-b-0 last:pb-0">
            <dt className="text-sm text-textMuted">{label}</dt>
            <dd className="text-sm font-medium">{String(value)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
