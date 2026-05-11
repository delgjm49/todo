import { useEffect, useState, type KeyboardEvent } from "react";

function isValidDateString(value: string): boolean {
  if (!value.trim()) {
    return true;
  }

  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime());
}

export function DateCell({
  value,
  onCommit,
}: {
  value: string | null;
  onCommit: (value: string | null) => void;
}) {
  const [draft, setDraft] = useState(value ?? "");

  useEffect(() => {
    setDraft(value ?? "");
  }, [value]);

  const invalid = draft.trim().length > 0 && !isValidDateString(draft);

  const commit = () => {
    const trimmed = draft.trim();
    const next = trimmed || null;
    if (next !== value) {
      onCommit(next);
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      commit();
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setDraft(value ?? "");
    }
  };

  return (
    <input
      className={`w-full bg-transparent text-sm outline-none ${
        invalid ? "border-b border-danger/60 text-danger" : "text-text"
      }`}
      data-testid="date-cell-input"
      onBlur={commit}
      onChange={(event) => setDraft(event.target.value)}
      onInput={(event) => setDraft((event.target as HTMLInputElement).value)}
      onKeyDown={onKeyDown}
      placeholder="YYYY-MM-DD"
      type="text"
      value={draft}
    />
  );
}
