import { useEffect, useState, type KeyboardEvent } from "react";
import { handleTextCellKeyDown } from "./text-cell-key-down.js";

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
    handleTextCellKeyDown(event, commitIfChanged, () => setDraft(value));
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
