import type { KeyboardEvent } from "react";

type TextCellKeyEvent = Pick<KeyboardEvent<HTMLInputElement>, "ctrlKey" | "key" | "metaKey" | "preventDefault">;

export function handleTextCellKeyDown(
  event: TextCellKeyEvent,
  commitIfChanged: () => void,
  resetDraft: () => void,
): void {
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
    resetDraft();
  }
}
