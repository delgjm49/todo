import type { ColumnDefinition } from "../../types/column.js";
import type { PersistedCell } from "../../types/row.js";
import { BulletCell } from "./BulletCell.js";
import { CheckboxCell } from "./CheckboxCell.js";
import { DateCell } from "./DateCell.js";
import { DropdownCell } from "./DropdownCell.js";
import { NumberedCell } from "./NumberedCell.js";
import { TextCell } from "./TextCell.js";
import { TimeCell } from "./TimeCell.js";

export function CellRenderer({
  column,
  rowIndex,
  cell,
  onCommitText,
  onToggleCheckbox,
  onCommitDate,
  onCommitTime,
  onCommitDropdown,
}: {
  column: ColumnDefinition;
  rowIndex: number;
  cell: PersistedCell | undefined;
  onCommitText: (value: string) => void;
  onToggleCheckbox: () => void;
  onCommitDate?: (value: string | null) => void;
  onCommitTime?: (value: string | null) => void;
  onCommitDropdown?: (value: string | null) => void;
}) {
  if (column.type === "checkbox") {
    return <CheckboxCell checked={Boolean(cell && typeof cell.value === "boolean" && cell.value)} onToggle={onToggleCheckbox} />;
  }

  if (column.type === "bullet") {
    return <BulletCell />;
  }

  if (column.type === "numbered") {
    return <NumberedCell value={rowIndex + 1} />;
  }

  if (column.type === "text") {
    const value = cell && typeof cell.value === "string" ? cell.value : "";
    return <TextCell onCommit={onCommitText} value={value} />;
  }

  if (column.type === "date") {
    const value = cell && typeof cell.value === "string" ? cell.value : null;
    return <DateCell onCommit={onCommitDate ?? (() => {})} value={value} />;
  }

  if (column.type === "time") {
    const value = cell && typeof cell.value === "string" ? cell.value : null;
    return <TimeCell onCommit={onCommitTime ?? (() => {})} value={value} />;
  }

  if (column.type === "dropdown") {
    const value = cell && typeof cell.value === "string" ? cell.value : null;
    const options = Array.isArray((column.settings as Record<string, unknown>)?.options)
      ? ((column.settings as Record<string, unknown>).options as string[])
      : [];
    return <DropdownCell onCommit={onCommitDropdown ?? (() => {})} options={options} value={value} />;
  }

  if (!cell || typeof cell.value !== "string") {
    return <span className="text-sm text-textMuted" />;
  }

  return <span className="text-sm text-text">{cell.value}</span>;
}
