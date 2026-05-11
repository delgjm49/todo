export function DropdownCell({
  value,
  options,
  onCommit,
}: {
  value: string | null;
  options: string[];
  onCommit: (value: string | null) => void;
}) {
  return (
    <select
      className="w-full bg-transparent text-sm text-text outline-none"
      data-testid="dropdown-cell-select"
      onChange={(event) => {
        const next = event.target.value === "" ? null : event.target.value;
        onCommit(next);
      }}
      value={value ?? ""}
    >
      <option value="">—</option>
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}
