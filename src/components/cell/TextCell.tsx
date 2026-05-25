import { useEffect, useState, type KeyboardEvent } from "react";

export function TextCell({ value, onCommit }: { value: string; onCommit: (value: string) => void }) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const commitIfChanged = () => {
    if (draft !== value) {
      onCommit(draft);
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const mod = event.ctrlKey || event.metaKey;
    if (mod && (event.key === "c" || event.key === "x" || event.key === "v" || event.key === "a")) {
      return; // let native clipboard/select-all behavior through
    }

    if (event.key === "Enter") {
      event.preventDefault();
      commitIfChanged();
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setDraft(value);
    }
  };

  return (
    <input
      className="w-full bg-transparent text-sm text-text outline-none"
      data-testid="text-cell-input"
      onBlur={commitIfChanged}
      onChange={(event) => setDraft(event.target.value)}
      onKeyDown={onKeyDown}
      type="text"
      value={draft}
    />
  );
}
