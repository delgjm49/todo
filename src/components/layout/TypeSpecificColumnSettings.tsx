import { useState, useEffect, type ReactNode } from "react";
import { useDocumentStore } from "../../stores/documentStore.js";
import type { Selection } from "../../types/ui.js";
import type { ColumnType } from "../../types/column.js";
import { resolveColumnSettingsTarget } from "./columnSettingsTarget.js";

function getColumnTypeLabel(columnType: ColumnType): string {
  switch (columnType) {
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
  }
}

function ToggleRow({
  label,
  active,
  onClick,
  testId,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  testId: string;
}) {
  return (
    <button
      aria-label={`Toggle ${label}`}
      className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-text transition hover:bg-panelMuted"
      data-testid={testId}
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

function DropdownOptionsEditor({
  options,
  onUpdate,
}: {
  options: string[];
  onUpdate: (next: string[]) => void;
}) {
  const [draftAdd, setDraftAdd] = useState("");
  const [draftValues, setDraftValues] = useState<string[]>(options);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraftValues(options);
  }, [options]);

  const clearError = () => {
    if (error) setError(null);
  };

  const validateAndCommitRename = (index: number) => {
    const trimmed = draftValues[index].trim();
    const original = options[index];

    if (!trimmed) {
      setDraftValues((prev) => {
        const next = [...prev];
        next[index] = original;
        return next;
      });
      setError("Option cannot be empty");
      return;
    }

    const otherOptions = options
      .filter((_, i) => i !== index)
      .map((o) => o.trim());
    if (otherOptions.includes(trimmed)) {
      setDraftValues((prev) => {
        const next = [...prev];
        next[index] = original;
        return next;
      });
      setError(`Option "${trimmed}" already exists`);
      return;
    }

    if (trimmed !== original) {
      const nextOptions = options.map((o, i) => (i === index ? trimmed : o));
      onUpdate(nextOptions);
    }
    setError(null);
  };

  const handleAdd = () => {
    const trimmed = draftAdd.trim();
    if (!trimmed) {
      setError("Option cannot be empty");
      return;
    }

    const existing = options.map((o) => o.trim());
    if (existing.includes(trimmed)) {
      setError(`Option "${trimmed}" already exists`);
      return;
    }

    setDraftAdd("");
    setError(null);
    onUpdate([...options, trimmed]);
  };

  const handleRemove = (index: number) => {
    setError(null);
    onUpdate(options.filter((_, i) => i !== index));
  };

  const handleOptionKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key === "Enter") {
      event.currentTarget.blur();
    }
  };

  return (
    <div className="space-y-2">
      {draftValues.map((value, index) => (
        <div key={index} className="flex items-center gap-2">
          <input
            aria-label={`Edit option ${index + 1}`}
            className="h-9 flex-1 rounded-lg border border-border bg-transparent px-2 text-sm text-text"
            onBlur={() => validateAndCommitRename(index)}
            onChange={(event) => {
              setDraftValues((prev) => {
                const next = [...prev];
                next[index] = event.target.value;
                return next;
              });
              clearError();
            }}
            onInput={(event) => {
              setDraftValues((prev) => {
                const next = [...prev];
                next[index] = (event.target as HTMLInputElement).value;
                return next;
              });
              clearError();
            }}
            onKeyDown={(event) => handleOptionKeyDown(event)}
            type="text"
            value={value}
          />
          <button
            aria-label={`Remove option ${options[index] ?? ""}`}
            className="shrink-0 rounded-md border border-border px-2 py-1 text-[11px] text-textMuted transition hover:border-danger/40 hover:text-danger"
            data-testid={`dropdown-option-remove-${index}`}
            onClick={() => handleRemove(index)}
            type="button"
          >
            Remove
          </button>
        </div>
      ))}

      <div className="flex items-center gap-2 pt-1">
        <input
          aria-label="New dropdown option"
          className="h-9 flex-1 rounded-lg border border-border bg-transparent px-2 text-sm text-text"
          data-testid="dropdown-option-add-input"
          onChange={(event) => {
            setDraftAdd(event.target.value);
            clearError();
          }}
          onInput={(event) => {
            setDraftAdd((event.target as HTMLInputElement).value);
            clearError();
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              handleAdd();
            }
          }}
          placeholder="Add option"
          type="text"
          value={draftAdd}
        />
        <button
          aria-label="Add option"
          className="shrink-0 rounded-md border border-border px-3 py-1.5 text-sm text-text transition hover:border-accent/40 hover:text-accent"
          data-testid="dropdown-option-add-button"
          onClick={handleAdd}
          type="button"
        >
          Add
        </button>
      </div>

      {error && (
        <p className="text-sm text-danger" data-testid="dropdown-options-error">
          {error}
        </p>
      )}
    </div>
  );
}

export function TypeSpecificColumnSettings({
  selection,
}: {
  selection: Selection;
}) {
  const workspaceIndex = useDocumentStore((state) => state.workspaceIndex);
  const workspacesById = useDocumentStore((state) => state.workspacesById);
  const activeWorkspaceId = useDocumentStore((state) => state.activeWorkspaceId);
  const updateColumnSettings = useDocumentStore(
    (state) => state.updateColumnSettings
  );

  const activeWorkspace =
    workspaceIndex.find((entry) => entry.id === activeWorkspaceId) ?? null;
  const workspaceDocument = activeWorkspace
    ? workspacesById[activeWorkspace.id] ?? null
    : null;

  const target = resolveColumnSettingsTarget(selection, workspaceDocument);

  let body: ReactNode;

  if (!target) {
    body = (
      <p className="text-sm text-textMuted">
        Select a column or cell to edit column settings.
      </p>
    );
  } else {
    const { column, workspaceId, blockId } = target;

    if (
      column.type === "text" ||
      column.type === "bullet" ||
      column.type === "numbered"
    ) {
      body = (
        <p className="text-sm text-textMuted">
          {getColumnTypeLabel(column.type)} columns have no type-specific
          settings.
        </p>
      );
    } else if (column.type === "checkbox") {
      const checkboxSettings = column.settings as {
        strikeoutRowWhenChecked?: boolean;
        moveCheckedRowsToBottom?: boolean;
      };
      body = (
        <div className="space-y-1">
          <ToggleRow
            active={!!checkboxSettings.strikeoutRowWhenChecked}
            label="Strikeout when checked"
            onClick={() =>
              void updateColumnSettings(workspaceId, blockId, column.id, {
                strikeoutRowWhenChecked:
                  !checkboxSettings.strikeoutRowWhenChecked,
              })
            }
            testId="column-setting-toggle-strikeoutRowWhenChecked"
          />
          <ToggleRow
            active={!!checkboxSettings.moveCheckedRowsToBottom}
            label="Move checked to bottom"
            onClick={() =>
              void updateColumnSettings(workspaceId, blockId, column.id, {
                moveCheckedRowsToBottom:
                  !checkboxSettings.moveCheckedRowsToBottom,
              })
            }
            testId="column-setting-toggle-moveCheckedRowsToBottom"
          />
        </div>
      );
    } else if (column.type === "date" || column.type === "time") {
      const dateTimeSettings = column.settings as {
        alertsEnabled?: boolean;
      };
      body = (
        <div className="space-y-1">
          <ToggleRow
            active={!!dateTimeSettings.alertsEnabled}
            label="Enable alerts"
            onClick={() =>
              void updateColumnSettings(workspaceId, blockId, column.id, {
                alertsEnabled: !dateTimeSettings.alertsEnabled,
              })
            }
            testId="column-setting-toggle-alertsEnabled"
          />
        </div>
      );
    } else if (column.type === "dropdown") {
      const dropdownSettings = column.settings as { options?: string[] };
      body = (
        <DropdownOptionsEditor
          options={dropdownSettings.options ?? []}
          onUpdate={(next) =>
            void updateColumnSettings(workspaceId, blockId, column.id, {
              options: next,
            })
          }
        />
      );
    }
  }

  return (
    <section className="mt-4 rounded-2xl border border-border bg-panelMuted/60 px-4 py-4">
      <div className="text-xs uppercase tracking-[0.24em] text-textMuted">
        Type-specific settings
      </div>
      <div className="mt-3">{body}</div>
    </section>
  );
}
