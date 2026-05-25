import { useDocumentStore } from "../../stores/documentStore.js";

export function SaveStatusIndicator() {
  const saveStatus = useDocumentStore((state) => state.saveStatus);
  const dirty = useDocumentStore((state) => state.dirty);
  const retrySave = useDocumentStore((state) => state.retrySave);

  // Loading state: render nothing during hydration
  if (saveStatus === "loading") {
    return null;
  }

  // Saving state: subtle pulsing text
  if (saveStatus === "saving") {
    return (
      <span className="text-xs font-medium text-textMuted animate-pulse">
        Saving…
      </span>
    );
  }

  // Error state: retry button with danger color
  if (saveStatus === "error") {
    return (
      <button
        type="button"
        className="text-xs font-medium text-danger hover:underline focus-visible:underline focus-visible:outline-none"
        onClick={() => {
          void retrySave();
        }}
      >
        Save failed · Retry
      </button>
    );
  }

  // Partial state: retry button with warning color
  if (saveStatus === "partial") {
    return (
      <button
        type="button"
        className="text-xs font-medium text-warning hover:underline focus-visible:underline focus-visible:outline-none"
        onClick={() => {
          void retrySave();
        }}
      >
        Partially saved · Retry
      </button>
    );
  }

  // Dirty state with idle save status: plain "Unsaved changes" text
  if (dirty) {
    return (
      <span className="text-xs font-medium text-textMuted">
        Unsaved changes
      </span>
    );
  }

  // Saved or idle with no dirty: dimmed "Saved"
  return (
    <span className="text-xs font-medium text-textMuted/60">
      Saved
    </span>
  );
}
