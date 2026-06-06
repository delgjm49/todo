import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { isValidDateString } from "./date-time-validation.js";

function hasNativePickerSupport(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.HTMLInputElement !== "undefined" &&
    "showPicker" in window.HTMLInputElement.prototype
  );
}

export function DateCell({
  value,
  onCommit,
}: {
  value: string | null;
  onCommit: (value: string | null) => void;
}) {
  const [draft, setDraft] = useState(value ?? "");
  const textRef = useRef<HTMLInputElement>(null);
  const pickerRef = useRef<HTMLInputElement>(null);

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

  const supportsPicker = hasNativePickerSupport();

  const openPicker = () => {
    const picker = pickerRef.current;
    if (!picker || typeof picker.showPicker !== "function") {
      // Graceful fallback: focus the visible text input
      textRef.current?.focus();
      return;
    }
    try {
      picker.showPicker();
    } catch {
      // Fallback if showPicker() throws (unsupported state, etc.)
      textRef.current?.focus();
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
      return;
    }

    // Ctrl+ArrowDown or Alt+ArrowDown opens the native date picker
    if (
      supportsPicker &&
      event.key === "ArrowDown" &&
      (event.ctrlKey || event.altKey)
    ) {
      event.preventDefault();
      openPicker();
    }
  };

  return (
    <div className="flex w-full items-center gap-1 relative">
      <input
        ref={textRef}
        className={`flex-1 min-w-0 bg-transparent text-sm outline-none ${
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
      {supportsPicker && (
        <>
          <input
            ref={pickerRef}
            type="date"
            data-testid="date-cell-picker-input"
            tabIndex={-1}
            aria-hidden="true"
            className="absolute top-0 left-0 opacity-0 pointer-events-none"
            style={{ width: "1px", height: "1px" }}
            value={
              draft.trim().length > 0 && isValidDateString(draft) ? draft.trim() : ""
            }
            onChange={(event) => {
              const newVal = (event.target as HTMLInputElement).value;
              if (newVal) {
                // Write normalized draft only; do not commit
                setDraft(newVal);
                // Refocus the visible text input so Enter/Escape/blur remain anchored
                textRef.current?.focus();
              }
            }}
          />
          <button
            type="button"
            aria-label="Open date picker"
            title="Open date picker"
            data-testid="date-cell-picker-button"
            className="shrink-0 px-1 text-sm text-textMuted hover:text-text focus:text-text rounded"
            onMouseDown={(event) => {
              // Prevent the button from stealing focus and blurring the text input (which would commit prematurely)
              event.preventDefault();
            }}
            onClick={() => {
              openPicker();
              // Refocus the visible text input after picker interaction
              textRef.current?.focus();
            }}
          >
            📅
          </button>
        </>
      )}
    </div>
  );
}
