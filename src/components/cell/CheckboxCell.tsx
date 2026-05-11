export function CheckboxCell({ checked, onToggle }: { checked: boolean; onToggle: () => void }) {
  return (
    <button
      className="flex w-full items-center justify-center text-base text-text transition hover:text-accent"
      data-testid="checkbox-cell-toggle"
      onClick={onToggle}
      type="button"
    >
      {checked ? "☑" : "☐"}
    </button>
  );
}
