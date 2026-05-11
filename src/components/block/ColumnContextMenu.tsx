import { useState } from "react";
import type { ColumnDefinition, ColumnType } from "../../types/column.js";

export function ColumnContextMenu({
  column,
  canMoveLeft,
  canMoveRight,
  onRename,
  onMoveLeft,
  onMoveRight,
  onAddLeft,
  onAddRight,
  onDelete,
  onChangeType,
  onUpdateSettings,
  onClose,
}: {
  column: ColumnDefinition;
  canMoveLeft: boolean;
  canMoveRight: boolean;
  onRename: (label: string) => void;
  onMoveLeft: () => void;
  onMoveRight: () => void;
  onAddLeft: (type: ColumnType) => void;
  onAddRight: (type: ColumnType) => void;
  onDelete: () => void;
  onChangeType: (type: ColumnType) => void;
  onUpdateSettings: (patch: Partial<Record<string, unknown>>) => void;
  onClose: () => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const [draftLabel, setDraftLabel] = useState(column.label);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [showAddPicker, setShowAddPicker] = useState<"left" | "right" | null>(null);

  const columnTypes: ColumnType[] = ["text", "checkbox", "bullet", "numbered", "date", "time", "dropdown"];

  const finishRename = () => {
    const trimmed = draftLabel.trim();
    if (trimmed) {
      onRename(trimmed);
    }
    setRenaming(false);
  };

  const isCheckbox = column.type === "checkbox";
  const isDate = column.type === "date";
  const isTime = column.type === "time";
  const isDropdown = column.type === "dropdown";

  const checkboxSettings = isCheckbox
    ? (column.settings as { strikeoutRowWhenChecked?: boolean; moveCheckedRowsToBottom?: boolean })
    : {};
  const dateSettings = isDate ? (column.settings as { alertsEnabled?: boolean }) : {};
  const timeSettings = isTime ? (column.settings as { alertsEnabled?: boolean }) : {};
  const dropdownSettings = isDropdown ? (column.settings as { options?: string[] }) : {};

  return (
    <div className="w-64 rounded-xl border border-border bg-panel px-2 py-2 shadow-soft">
      <div className="px-3 py-2 text-xs uppercase tracking-[0.24em] text-textMuted">Column</div>

      {renaming ? (
        <div className="px-2 py-1">
          <input
            autoFocus
            className="w-full rounded-lg border border-accent/50 bg-panel px-2 py-1.5 text-sm text-text outline-none"
            onBlur={finishRename}
            onChange={(event) => setDraftLabel(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                finishRename();
              }
              if (event.key === "Escape") {
                event.preventDefault();
                setDraftLabel(column.label);
                setRenaming(false);
              }
            }}
            value={draftLabel}
          />
        </div>
      ) : (
        <MenuButton label={`Rename "${column.label || "Untitled"}"`} onClick={() => setRenaming(true)} />
      )}

      <MenuButton disabled={!canMoveLeft} label="Move left" onClick={onMoveLeft} />
      <MenuButton disabled={!canMoveRight} label="Move right" onClick={onMoveRight} />

      <div className="mt-2 border-t border-border pt-2">
        <div className="px-3 py-2 text-[11px] uppercase tracking-[0.22em] text-textMuted">Add column</div>
        {showAddPicker === "left" ? (
          <div className="px-2">
            {columnTypes.map((type) => (
              <MenuButton key={type} label={formatTypeLabel(type)} onClick={() => { onAddLeft(type); setShowAddPicker(null); onClose(); }} />
            ))}
            <MenuButton label="Cancel" onClick={() => setShowAddPicker(null)} />
          </div>
        ) : (
          <MenuButton label="Add column to left" onClick={() => setShowAddPicker("left")} />
        )}
        {showAddPicker === "right" ? (
          <div className="px-2">
            {columnTypes.map((type) => (
              <MenuButton key={type} label={formatTypeLabel(type)} onClick={() => { onAddRight(type); setShowAddPicker(null); onClose(); }} />
            ))}
            <MenuButton label="Cancel" onClick={() => setShowAddPicker(null)} />
          </div>
        ) : (
          <MenuButton label="Add column to right" onClick={() => setShowAddPicker("right")} />
        )}
      </div>

      <div className="mt-2 border-t border-border pt-2">
        <div className="px-3 py-2 text-[11px] uppercase tracking-[0.22em] text-textMuted">Change type</div>
        {showTypePicker ? (
          <div className="px-2">
            {columnTypes.map((type) => (
              <MenuButton
                disabled={type === column.type}
                key={type}
                label={formatTypeLabel(type)}
                onClick={() => {
                  onChangeType(type);
                  setShowTypePicker(false);
                  onClose();
                }}
              />
            ))}
            <MenuButton label="Cancel" onClick={() => setShowTypePicker(false)} />
          </div>
        ) : (
          <MenuButton label={`Current: ${formatTypeLabel(column.type)}`} onClick={() => setShowTypePicker(true)} />
        )}
      </div>

      {(isCheckbox || isDate || isTime || isDropdown) && (
        <div className="mt-2 border-t border-border pt-2">
          <div className="px-3 py-2 text-[11px] uppercase tracking-[0.22em] text-textMuted">Settings</div>
          {isCheckbox && (
            <>
              <ToggleButton
                active={!!checkboxSettings.strikeoutRowWhenChecked}
                label="Strikeout when checked"
                onClick={() =>
                  onUpdateSettings({ strikeoutRowWhenChecked: !checkboxSettings.strikeoutRowWhenChecked })
                }
              />
              <ToggleButton
                active={!!checkboxSettings.moveCheckedRowsToBottom}
                label="Move checked to bottom"
                onClick={() =>
                  onUpdateSettings({ moveCheckedRowsToBottom: !checkboxSettings.moveCheckedRowsToBottom })
                }
              />
            </>
          )}
          {isDate && (
            <ToggleButton
              active={!!dateSettings.alertsEnabled}
              label="Enable alerts"
              onClick={() => onUpdateSettings({ alertsEnabled: !dateSettings.alertsEnabled })}
            />
          )}
          {isTime && (
            <ToggleButton
              active={!!timeSettings.alertsEnabled}
              label="Enable alerts"
              onClick={() => onUpdateSettings({ alertsEnabled: !timeSettings.alertsEnabled })}
            />
          )}
          {isDropdown && (
            <div className="px-3 py-1 text-xs text-textMuted">
              Options: {(dropdownSettings.options ?? []).join(", ") || "None"}
            </div>
          )}
        </div>
      )}

      <hr className="my-2 border-border" />
      <MenuButton danger label="Delete column" onClick={() => { onDelete(); onClose(); }} />
    </div>
  );
}

function MenuButton({
  label,
  onClick,
  danger = false,
  disabled = false,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      className={`block w-full rounded-lg px-3 py-2 text-left text-sm transition ${
        disabled
          ? "cursor-not-allowed text-textMuted"
          : danger
            ? "text-danger hover:bg-danger/10"
            : "text-text hover:bg-panelMuted"
      }`}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

function ToggleButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-text transition hover:bg-panelMuted"
      onClick={onClick}
      type="button"
    >
      <span>{label}</span>
      <span
        className={`inline-block h-4 w-8 rounded-full transition ${active ? "bg-accent" : "bg-border"}`}
      >
        <span
          className={`inline-block h-4 w-4 rounded-full bg-panel shadow transition ${active ? "translate-x-4" : "translate-x-0"}`}
        />
      </span>
    </button>
  );
}

function formatTypeLabel(type: ColumnType): string {
  switch (type) {
    case "text":
      return "Text";
    case "checkbox":
      return "Checkbox";
    case "bullet":
      return "Bullet";
    case "numbered":
      return "Numbered";
    case "date":
      return "Date";
    case "time":
      return "Time";
    case "dropdown":
      return "Dropdown";
    default:
      return "Unknown";
  }
}
