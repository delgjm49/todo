export function RowContextMenu({
  canCutOrCopy,
  canPaste,
  onCut,
  onCopy,
  onPaste,
}: {
  canCutOrCopy: boolean;
  canPaste: boolean;
  onCut: () => void;
  onCopy: () => void;
  onPaste: () => void;
}) {
  return (
    <div className="w-64 rounded-xl border border-border bg-panel px-2 py-2 shadow-soft" data-testid="row-context-menu">
      <div className="px-3 py-2 text-xs uppercase tracking-[0.24em] text-textMuted">Row actions</div>
      <MenuButton dataTestId="row-menu-cut" disabled={!canCutOrCopy} label="Cut" onClick={onCut} />
      <MenuButton dataTestId="row-menu-copy" disabled={!canCutOrCopy} label="Copy" onClick={onCopy} />
      <MenuButton dataTestId="row-menu-paste" disabled={!canPaste} label="Paste" onClick={onPaste} />
    </div>
  );
}

function MenuButton({
  label,
  onClick,
  disabled = false,
  dataTestId,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  dataTestId?: string;
}) {
  return (
    <button
      className={`block w-full rounded-lg px-3 py-2 text-left text-sm transition ${
        disabled ? "cursor-not-allowed text-textMuted" : "text-text hover:bg-panelMuted"
      }`}
      data-testid={dataTestId}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}
