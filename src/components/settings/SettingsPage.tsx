import { useState } from "react";
import { useDocumentStore } from "../../stores/documentStore.js";
import { useUiStore } from "../../stores/uiStore.js";
import type { AppDefaults } from "../../types/settings";

export function SettingsPage() {
  const settings = useDocumentStore((state) => state.settings);
  const updateSettings = useDocumentStore((state) => state.updateSettings);
  const showMainScreen = useUiStore((state) => state.showMainScreen);

  // Local form state for editor defaults inputs
  const [localFontFamily, setLocalFontFamily] = useState(settings?.defaults.fontFamily ?? "Segoe UI");
  const [localFontSize, setLocalFontSize] = useState(String(settings?.defaults.fontSize ?? 14));
  const [localTextColor, setLocalTextColor] = useState(settings?.defaults.textColor ?? "#F3F4F6");
  const [localCellBackground, setLocalCellBackground] = useState(settings?.defaults.cellBackground ?? "#111827");
  const [localBlockBorderColor, setLocalBlockBorderColor] = useState(settings?.defaults.blockBorderColor ?? "#374151");
  const [localBlockBorderWidth, setLocalBlockBorderWidth] = useState(String(settings?.defaults.blockBorderWidth ?? 1));

  function saveDefault<K extends keyof AppDefaults>(key: K, value: AppDefaults[K]) {
    if (!settings) return;
    updateSettings({ defaults: { ...settings.defaults, [key]: value } });
  }

  function validateAndSaveFontSize(raw: string) {
    const parsed = parseInt(raw, 10);
    if (isNaN(parsed) || parsed < 8 || parsed > 72) {
      setLocalFontSize(String(settings?.defaults.fontSize ?? 14));
      return;
    }
    saveDefault("fontSize", parsed);
  }

  function validateAndSaveBlockBorderWidth(raw: string) {
    const parsed = parseInt(raw, 10);
    if (isNaN(parsed) || parsed < 0 || parsed > 10) {
      setLocalBlockBorderWidth(String(settings?.defaults.blockBorderWidth ?? 1));
      return;
    }
    saveDefault("blockBorderWidth", parsed);
  }

  const hexRegex = /^#[0-9a-fA-F]{6}$/;

  function validateAndSaveHexColor(key: "textColor" | "cellBackground" | "blockBorderColor", raw: string, setter: (v: string) => void) {
    if (!hexRegex.test(raw)) {
      setter(settings?.defaults[key] ?? "#000000");
      return;
    }
    saveDefault(key, raw);
  }

  function validateAndSaveFontFamily(raw: string) {
    if (raw.trim().length === 0) {
      setLocalFontFamily(settings?.defaults.fontFamily ?? "Segoe UI");
      return;
    }
    saveDefault("fontFamily", raw);
  }

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
          <SettingsSection title="Appearance">
            <div className="mt-4 flex items-center justify-between gap-4 border-b border-border/60 pb-3">
              <span className="text-sm text-textMuted">Theme mode</span>
              <div className="flex overflow-hidden rounded-lg border border-border">
                <button
                  className={`px-3 py-1.5 text-sm font-medium transition ${
                    settings?.theme === "light"
                      ? "bg-panelMuted text-text"
                      : "bg-panel text-textMuted hover:bg-panelMuted"
                  }`}
                  onClick={() => updateSettings({ theme: "light" })}
                  type="button"
                >
                  Light
                </button>
                <button
                  className={`px-3 py-1.5 text-sm font-medium transition ${
                    settings?.theme === "dark"
                      ? "bg-panelMuted text-text"
                      : "bg-panel text-textMuted hover:bg-panelMuted"
                  }`}
                  onClick={() => updateSettings({ theme: "dark" })}
                  type="button"
                >
                  Dark
                </button>
              </div>
            </div>
          </SettingsSection>
          <SettingsSection title="Editor defaults">
            <div className="mt-4 space-y-3">
              {/* Font family */}
              <div className="flex items-center justify-between gap-4 border-b border-border/60 pb-3 last:border-b-0 last:pb-0">
                <span className="text-sm text-textMuted">Font family</span>
                <input
                  type="text"
                  value={localFontFamily}
                  onChange={(e) => setLocalFontFamily(e.target.value)}
                  onBlur={(e) => validateAndSaveFontFamily(e.target.value)}
                  className="w-40 rounded-md border border-border bg-panel px-2 py-1 text-sm text-text text-right focus:border-accent/60 focus:outline-none"
                />
              </div>
              {/* Font size */}
              <div className="flex items-center justify-between gap-4 border-b border-border/60 pb-3 last:border-b-0 last:pb-0">
                <span className="text-sm text-textMuted">Font size</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={8}
                    max={72}
                    value={localFontSize}
                    onChange={(e) => setLocalFontSize(e.target.value)}
                    onBlur={(e) => validateAndSaveFontSize(e.target.value)}
                    className="w-20 rounded-md border border-border bg-panel px-2 py-1 text-sm text-text text-right focus:border-accent/60 focus:outline-none"
                  />
                  <span className="text-sm text-textMuted">px</span>
                </div>
              </div>
              {/* Text color */}
              <div className="flex items-center justify-between gap-4 border-b border-border/60 pb-3 last:border-b-0 last:pb-0">
                <span className="text-sm text-textMuted">Text color</span>
                <div className="flex items-center gap-2">
                  <div
                    className="h-5 w-5 shrink-0 rounded border border-border"
                    style={{ backgroundColor: localTextColor }}
                  />
                  <input
                    type="text"
                    value={localTextColor}
                    onChange={(e) => setLocalTextColor(e.target.value)}
                    onBlur={(e) => validateAndSaveHexColor("textColor", e.target.value, setLocalTextColor)}
                    className="w-28 rounded-md border border-border bg-panel px-2 py-1 text-sm text-text text-right focus:border-accent/60 focus:outline-none"
                  />
                </div>
              </div>
              {/* Cell background */}
              <div className="flex items-center justify-between gap-4 border-b border-border/60 pb-3 last:border-b-0 last:pb-0">
                <span className="text-sm text-textMuted">Cell background</span>
                <div className="flex items-center gap-2">
                  <div
                    className="h-5 w-5 shrink-0 rounded border border-border"
                    style={{ backgroundColor: localCellBackground }}
                  />
                  <input
                    type="text"
                    value={localCellBackground}
                    onChange={(e) => setLocalCellBackground(e.target.value)}
                    onBlur={(e) => validateAndSaveHexColor("cellBackground", e.target.value, setLocalCellBackground)}
                    className="w-28 rounded-md border border-border bg-panel px-2 py-1 text-sm text-text text-right focus:border-accent/60 focus:outline-none"
                  />
                </div>
              </div>
              {/* Block border color */}
              <div className="flex items-center justify-between gap-4 border-b border-border/60 pb-3 last:border-b-0 last:pb-0">
                <span className="text-sm text-textMuted">Block border color</span>
                <div className="flex items-center gap-2">
                  <div
                    className="h-5 w-5 shrink-0 rounded border border-border"
                    style={{ backgroundColor: localBlockBorderColor }}
                  />
                  <input
                    type="text"
                    value={localBlockBorderColor}
                    onChange={(e) => setLocalBlockBorderColor(e.target.value)}
                    onBlur={(e) => validateAndSaveHexColor("blockBorderColor", e.target.value, setLocalBlockBorderColor)}
                    className="w-28 rounded-md border border-border bg-panel px-2 py-1 text-sm text-text text-right focus:border-accent/60 focus:outline-none"
                  />
                </div>
              </div>
              {/* Border width */}
              <div className="flex items-center justify-between gap-4 border-b border-border/60 pb-3 last:border-b-0 last:pb-0">
                <span className="text-sm text-textMuted">Border width</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={localBlockBorderWidth}
                    onChange={(e) => setLocalBlockBorderWidth(e.target.value)}
                    onBlur={(e) => validateAndSaveBlockBorderWidth(e.target.value)}
                    className="w-20 rounded-md border border-border bg-panel px-2 py-1 text-sm text-text text-right focus:border-accent/60 focus:outline-none"
                  />
                  <span className="text-sm text-textMuted">px</span>
                </div>
              </div>
            </div>
          </SettingsSection>
          <SettingsSection
            title="Workspace defaults"
            entries={[
              ["Accent enabled", settings?.defaults.workspaceAccentEnabled ? "Yes" : "No"],
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
  children,
}: {
  title: string;
  entries?: Array<[string, string | boolean]>;
  children?: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-panelMuted/60 px-5 py-5">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
      {entries && entries.length > 0 && (
        <dl className="mt-4 space-y-3">
          {entries.map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-4 border-b border-border/60 pb-3 last:border-b-0 last:pb-0">
              <dt className="text-sm text-textMuted">{label}</dt>
              <dd className="text-sm font-medium">{String(value)}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
