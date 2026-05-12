import { useDocumentStore } from "../../stores/documentStore.js";
import type { Selection } from "../../types/ui.js";
import { resolveSelectedFormattingTarget } from "../../domain/formatting/selectedFormattingTarget.js";
import type { FormattingLayer } from "../../domain/formatting/mergeFormatting.js";
import { FieldCard } from "./FieldCard.js";

const FONT_OPTIONS = ["Segoe UI", "Arial", "Calibri", "Consolas", "Georgia"];

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

export function TextFormattingControls({ selection }: { selection: Selection }) {
  const updateSelectedTextFormatting = useDocumentStore(
    (state) => state.updateSelectedTextFormatting
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
          Select a block, column, row, or cell to format text.
        </p>
      </div>
    );
  }

  const { direct, effective } = target;

  const patch = (key: keyof FormattingLayer, value: FormattingLayer[keyof FormattingLayer] | undefined) => {
    void updateSelectedTextFormatting(selection, { [key]: value });
  };

  const fontFamilyValue = direct.fontFamily ?? effective.fontFamily ?? "";
  const fontSizeValue = direct.fontSize ?? effective.fontSize ?? 14;
  const boldDirect = direct.bold;
  const boldEffective = effective.bold ?? false;
  const boldDisplay = boldDirect !== undefined ? boldDirect : boldEffective;
  const italicDirect = direct.italic;
  const italicEffective = effective.italic ?? false;
  const italicDisplay = italicDirect !== undefined ? italicDirect : italicEffective;
  const underlineDirect = direct.underline;
  const underlineEffective = effective.underline ?? false;
  const underlineDisplay = underlineDirect !== undefined ? underlineDirect : underlineEffective;
  const textColorValue = direct.textColor ?? effective.textColor ?? "#000000";
  const backgroundColorValue = direct.backgroundColor ?? effective.backgroundColor ?? "#ffffff";

  return (
    <div className="mt-4 space-y-4">
      <div className="text-xs uppercase tracking-[0.24em] text-textMuted">Text formatting</div>

      <FieldCard label="Font family">
        <div className="flex items-center gap-2">
          <select
            aria-label="Font family"
            className="h-9 flex-1 rounded-lg border border-border bg-transparent px-2 text-sm text-text"
            onChange={(event) =>
              patch("fontFamily", event.target.value || undefined)
            }
            value={fontFamilyValue}
          >
            {FONT_OPTIONS.map((font) => (
              <option key={font} value={font}>
                {font}
              </option>
            ))}
          </select>
          {"fontFamily" in direct && (
            <ResetButton onClick={() => patch("fontFamily", undefined)} />
          )}
        </div>
        {!("fontFamily" in direct) && <InheritedLabel />}
      </FieldCard>

      <FieldCard label="Font size">
        <div className="flex items-center gap-2">
          <input
            aria-label="Font size"
            className="h-9 flex-1 rounded-lg border border-border bg-transparent px-2 text-sm text-text"
            max={48}
            min={8}
            onChange={(event) => {
              const value = event.target.value === "" ? undefined : Number(event.target.value);
              patch("fontSize", value);
            }}
            type="number"
            value={fontSizeValue}
          />
          {"fontSize" in direct && (
            <ResetButton onClick={() => patch("fontSize", undefined)} />
          )}
        </div>
        {!("fontSize" in direct) && <InheritedLabel />}
      </FieldCard>

      <FieldCard label="Style">
        <div className="flex items-center gap-2">
          <ToggleButton
            active={boldDisplay}
            label="B"
            onClick={() =>
              patch(
                "bold",
                boldDirect === undefined ? !boldEffective : !boldDirect
              )
            }
          />
          <ToggleButton
            active={italicDisplay}
            label="I"
            onClick={() =>
              patch(
                "italic",
                italicDirect === undefined ? !italicEffective : !italicDirect
              )
            }
          />
          <ToggleButton
            active={underlineDisplay}
            label="U"
            onClick={() =>
              patch(
                "underline",
                underlineDirect === undefined ? !underlineEffective : !underlineDirect
              )
            }
          />
          {(("bold" in direct) || ("italic" in direct) || ("underline" in direct)) && (
            <ResetButton
              onClick={() => {
                patch("bold", undefined);
                patch("italic", undefined);
                patch("underline", undefined);
              }}
            />
          )}
        </div>
      </FieldCard>

      <FieldCard label="Text color">
        <div className="flex items-center gap-2">
          <input
            aria-label="Text color"
            className="h-10 w-full rounded-lg border border-border bg-transparent p-1"
            onChange={(event) => patch("textColor", event.target.value || undefined)}
            type="color"
            value={textColorValue}
          />
          {"textColor" in direct && (
            <ResetButton onClick={() => patch("textColor", undefined)} />
          )}
        </div>
        {!("textColor" in direct) && <InheritedLabel />}
      </FieldCard>

      <FieldCard label="Fill color">
        <div className="flex items-center gap-2">
          <input
            aria-label="Fill color"
            className="h-10 w-full rounded-lg border border-border bg-transparent p-1"
            onChange={(event) => patch("backgroundColor", event.target.value || undefined)}
            type="color"
            value={backgroundColorValue}
          />
          {"backgroundColor" in direct && (
            <ResetButton onClick={() => patch("backgroundColor", undefined)} />
          )}
        </div>
        {!("backgroundColor" in direct) && <InheritedLabel />}
      </FieldCard>
    </div>
  );
}

function ToggleButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`h-9 w-9 rounded-lg border text-sm font-semibold transition ${
        active
          ? "border-accent/60 bg-accent/10 text-accent"
          : "border-border bg-transparent text-textMuted hover:border-accent/40 hover:text-text"
      }`}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}
