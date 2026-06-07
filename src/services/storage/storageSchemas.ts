import type { LoadedAppData } from "../../types/app";
import type { Block, BlockSort } from "../../types/block";
import type {
  CheckboxColumnSettings,
  ColumnDefinition,
  ColumnSettings,
  ColumnType,
  DateColumnSettings,
  DropdownColumnSettings,
  TimeColumnSettings,
} from "../../types/column";
import type { BorderFormatting, CellFormatting, RowFormatting, TextFormatting } from "../../types/formatting";
import type {
  CheckboxCellPayload,
  MarkerCellPayload,
  NullableTextCellPayload,
  PersistedCell,
  Row,
  TextCellPayload,
} from "../../types/row";
import type { Settings } from "../../types/settings";
import type { WorkspaceDocument, WorkspaceIndexEntry } from "../../types/workspace";
import { DEFAULT_SETTINGS, STORAGE_SCHEMA_VERSION } from "./bootstrapData.js";
import { resolveAppDataPaths, type AppDataPaths } from "./pathUtils.js";

export interface ValidationIssue {
  path: string;
  message: string;
}

export interface ValidationResult<T> {
  value: T;
  issues: ValidationIssue[];
}

export interface PersistedSettingsFile {
  schemaVersion: number;
  settings: Settings;
}

export interface PersistedWorkspaceIndexFile {
  schemaVersion: number;
  workspaces: WorkspaceIndexEntry[];
}

export interface PersistedWorkspaceFile {
  schemaVersion: number;
  id: string;
  blocks: Block[];
}

export interface StorageDocumentSet {
  settings: PersistedSettingsFile;
  workspaceIndex: PersistedWorkspaceIndexFile;
  workspaces: PersistedWorkspaceFile[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function addIssue(issues: ValidationIssue[], path: string, message: string): void {
  issues.push({ path, message });
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function toString(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function toBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function toNumber(value: unknown, fallback: number, min?: number): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return fallback;
  }

  if (typeof min === "number" && value < min) {
    return fallback;
  }

  return value;
}

function isCssColor(value: unknown): value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    return false;
  }

  if (typeof document !== "undefined") {
    const probe = document.createElement("span");
    probe.style.color = "";
    probe.style.color = value;
    return probe.style.color.length > 0;
  }

  return /^#([0-9a-fA-F]{3,8})$/.test(value) || /^(rgb|rgba|hsl|hsla)\(/i.test(value);
}

function toCssColor(value: unknown, fallback: string): string {
  return isCssColor(value) ? value : fallback;
}

function toStringArray(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const result = value.filter((entry): entry is string => typeof entry === "string");
  return result.length > 0 ? result : fallback;
}

function toEdges(value: unknown): BorderFormatting["edges"] {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const seen = new Set<string>();
  for (const entry of value) {
    if (entry === "top" || entry === "right" || entry === "bottom" || entry === "left") {
      seen.add(entry);
    }
  }

  const edgeOrder: Array<"top" | "right" | "bottom" | "left"> = ["top", "right", "bottom", "left"];
  const allowed = edgeOrder.filter((edge) => seen.has(edge));

  return allowed.length > 0 ? allowed : undefined;
}

function normalizeTextFormatting(value: unknown): TextFormatting {
  if (!isRecord(value)) {
    return {};
  }

  const result: TextFormatting = {};
  if (typeof value.fontFamily === "string" && value.fontFamily.trim().length > 0) {
    result.fontFamily = value.fontFamily;
  }
  if (typeof value.fontSize === "number" && Number.isFinite(value.fontSize) && value.fontSize > 0) {
    result.fontSize = value.fontSize;
  }
  if (typeof value.bold === "boolean") {
    result.bold = value.bold;
  }
  if (typeof value.italic === "boolean") {
    result.italic = value.italic;
  }
  if (typeof value.underline === "boolean") {
    result.underline = value.underline;
  }
  if (isCssColor(value.textColor)) {
    result.textColor = value.textColor;
  }
  if (isCssColor(value.backgroundColor)) {
    result.backgroundColor = value.backgroundColor;
  }
  if (
    value.horizontalAlign === "left" ||
    value.horizontalAlign === "center" ||
    value.horizontalAlign === "right"
  ) {
    result.horizontalAlign = value.horizontalAlign;
  }

  return result;
}

function normalizeBorderFormatting(value: unknown): BorderFormatting {
  if (!isRecord(value)) {
    return {};
  }

  const result: BorderFormatting = {};
  if (isCssColor(value.borderColor)) {
    result.borderColor = value.borderColor;
  }
  if (typeof value.borderWidth === "number" && Number.isFinite(value.borderWidth) && value.borderWidth >= 0) {
    result.borderWidth = value.borderWidth;
  }
  const edges = toEdges(value.edges);
  if (edges) {
    result.edges = edges;
  }

  return result;
}

function normalizeCellFormatting(value: unknown): CellFormatting {
  return {
    ...normalizeTextFormatting(value),
    ...normalizeBorderFormatting(value),
  };
}

function hasEmptyFormatting(value: CellFormatting | RowFormatting | TextFormatting | BorderFormatting): boolean {
  return Object.keys(value).length === 0;
}

function normalizeColumnSettings(type: ColumnType, value: unknown): ColumnSettings {
  if (type === "checkbox") {
    const input = isRecord(value) ? value : {};
    const settings: CheckboxColumnSettings = {
      strikeoutRowWhenChecked: toBoolean(input.strikeoutRowWhenChecked, true),
      moveCheckedRowsToBottom: toBoolean(input.moveCheckedRowsToBottom, false),
    };
    return settings;
  }

  if (type === "dropdown") {
    const input = isRecord(value) ? value : {};
    const settings: DropdownColumnSettings = {
      options: toStringArray(input.options, []),
    };
    return settings;
  }

  if (type === "date") {
    const input = isRecord(value) ? value : {};
    const settings: DateColumnSettings = {
      alertsEnabled: toBoolean(input.alertsEnabled, false),
    };
    return settings;
  }

  if (type === "time") {
    const input = isRecord(value) ? value : {};
    const settings: TimeColumnSettings = {
      alertsEnabled: toBoolean(input.alertsEnabled, false),
    };
    return settings;
  }

  return {};
}

function normalizeColumn(rawValue: unknown, path: string, issues: ValidationIssue[]): ColumnDefinition | null {
  if (!isRecord(rawValue)) {
    addIssue(issues, path, "Column must be an object.");
    return null;
  }

  const type = rawValue.type;
  if (
    type !== "text" &&
    type !== "checkbox" &&
    type !== "bullet" &&
    type !== "numbered" &&
    type !== "date" &&
    type !== "time" &&
    type !== "dropdown"
  ) {
    addIssue(issues, `${path}.type`, "Invalid column type.");
    return null;
  }

  const column: ColumnDefinition = {
    id: isNonEmptyString(rawValue.id) ? rawValue.id : `${path.replaceAll(".", "_")}_column`,
    type,
    label: toString(rawValue.label, ""),
    order: toNumber(rawValue.order, 0, 0),
    width: toNumber(rawValue.width, 160, 24),
    visible: toBoolean(rawValue.visible, true),
    settings: normalizeColumnSettings(type, rawValue.settings),
    format: {
      ...normalizeTextFormatting(rawValue.format),
      ...normalizeBorderFormatting(rawValue.format),
    },
  };

  return column;
}

function createDefaultCellForType(type: ColumnType): PersistedCell {
  if (type === "checkbox") {
    return { value: false, format: {} };
  }

  if (type === "bullet" || type === "numbered") {
    return { value: null, format: {} };
  }

  if (type === "date" || type === "time" || type === "dropdown") {
    return { value: null, format: {} };
  }

  return { value: "", format: {} };
}

function normalizeCellValue(type: ColumnType, value: unknown): PersistedCell {
  if (type === "checkbox") {
    return { value: typeof value === "boolean" ? value : false, format: {} };
  }

  if (type === "bullet" || type === "numbered") {
    return { value: null, format: {} };
  }

  if (type === "date" || type === "time" || type === "dropdown") {
    return {
      value: typeof value === "string" ? value : null,
      format: {},
    };
  }

  return { value: typeof value === "string" ? value : "", format: {} };
}

function normalizeCell(rawValue: unknown, column: ColumnDefinition, path: string, issues: ValidationIssue[]): PersistedCell {
  if (!isRecord(rawValue)) {
    addIssue(issues, path, "Cell must be an object.");
    return createDefaultCellForType(column.type);
  }

  const format = normalizeCellFormatting(rawValue.format);
  const cell = normalizeCellValue(column.type, rawValue.value);
  const output: PersistedCell = {
    value: cell.value,
    format: hasEmptyFormatting(format) ? {} : format,
  } as PersistedCell;

  return output;
}

function normalizeRow(rawValue: unknown, columns: ColumnDefinition[], path: string, issues: ValidationIssue[]): Row | null {
  if (!isRecord(rawValue)) {
    addIssue(issues, path, "Row must be an object.");
    return null;
  }

  const cellsInput = isRecord(rawValue.cells) ? rawValue.cells : {};
  const formatInput = rawValue.format;
  const rowCells: Row["cells"] = {};
  for (const column of columns) {
    const cellPath = `${path}.cells.${column.id}`;
    rowCells[column.id] = normalizeCell(cellsInput[column.id], column, cellPath, issues);
  }

  return {
    id: isNonEmptyString(rawValue.id) ? rawValue.id : `${path.replaceAll(".", "_")}_row`,
    order: toNumber(rawValue.order, 0, 0),
    format:
      hasEmptyFormatting(normalizeTextFormatting(formatInput)) &&
      hasEmptyFormatting(normalizeBorderFormatting(formatInput))
      ? {}
      : {
          ...normalizeTextFormatting(formatInput),
          ...normalizeBorderFormatting(formatInput),
        },
    cells: rowCells,
  };
}

function normalizeSort(rawValue: unknown): BlockSort | null {
  if (!isRecord(rawValue)) {
    return null;
  }

  if (rawValue.direction !== "asc" && rawValue.direction !== "desc") {
    return null;
  }

  return {
    columnId: isNonEmptyString(rawValue.columnId) ? rawValue.columnId : "",
    direction: rawValue.direction,
  };
}

function normalizeBlock(rawValue: unknown, workspaceId: string, path: string, issues: ValidationIssue[]): Block | null {
  if (!isRecord(rawValue)) {
    addIssue(issues, path, "Block must be an object.");
    return null;
  }

  const blockType =
    rawValue.blockType === "basic_checklist" ||
    rawValue.blockType === "bulleted_list" ||
    rawValue.blockType === "numbered_list"
      ? rawValue.blockType
      : "basic_checklist";

  const columns: ColumnDefinition[] = [];
  const seenColumns = new Set<string>();
  const rawColumns = Array.isArray(rawValue.columns) ? rawValue.columns : [];
  for (let index = 0; index < rawColumns.length; index += 1) {
    const column = normalizeColumn(rawColumns[index], `${path}.columns[${index}]`, issues);
    if (!column) {
      continue;
    }
    if (seenColumns.has(column.id)) {
      addIssue(issues, `${path}.columns[${index}].id`, "Duplicate column id.");
      continue;
    }
    seenColumns.add(column.id);
    columns.push(column);
  }

  columns.sort((left, right) => left.order - right.order);

  const rows: Row[] = [];
  const seenRows = new Set<string>();
  const rawRows = Array.isArray(rawValue.rows) ? rawValue.rows : [];
  for (let index = 0; index < rawRows.length; index += 1) {
    const row = normalizeRow(rawRows[index], columns, `${path}.rows[${index}]`, issues);
    if (!row) {
      continue;
    }
    if (seenRows.has(row.id)) {
      addIssue(issues, `${path}.rows[${index}].id`, "Duplicate row id.");
      continue;
    }
    seenRows.add(row.id);
    rows.push(row);
  }

  rows.sort((left, right) => left.order - right.order);

  return {
    id: isNonEmptyString(rawValue.id) ? rawValue.id : `${path.replaceAll(".", "_")}_block`,
    workspaceId,
    title: toString(rawValue.title, "Untitled block"),
    blockType,
    order: toNumber(rawValue.order, 0, 0),
    collapsed: toBoolean(rawValue.collapsed, false),
    hideCompletedRows: toBoolean(rawValue.hideCompletedRows, false),
    border: {
      ...normalizeBorderFormatting(rawValue.border),
    },
    sort: normalizeSort(rawValue.sort),
    format: {
      ...normalizeTextFormatting(rawValue.format),
      ...normalizeBorderFormatting(rawValue.format),
    },
    columns,
    rows,
  };
}

function normalizeWorkspaceStyle(value: unknown): WorkspaceIndexEntry["style"] {
  const input = isRecord(value) ? value : {};
  const accentInput = isRecord(input.accentStripe) ? input.accentStripe : {};

  return {
    background: isCssColor(input.background) ? input.background : "#1F2937",
    textColor: isCssColor(input.textColor) ? input.textColor : "#F9FAFB",
    accentStripe: {
      enabled: toBoolean(accentInput.enabled, true),
      color: isCssColor(accentInput.color) ? accentInput.color : "#60A5FA",
    },
  };
}

function normalizeWorkspaceIndexEntry(rawValue: unknown, path: string, issues: ValidationIssue[]): WorkspaceIndexEntry | null {
  if (!isRecord(rawValue)) {
    addIssue(issues, path, "Workspace entry must be an object.");
    return null;
  }

  const alertSummaryInput = isRecord(rawValue.alertSummary) ? rawValue.alertSummary : null;

  return {
    id: isNonEmptyString(rawValue.id) ? rawValue.id : `${path.replaceAll(".", "_")}_workspace`,
    title: toString(rawValue.title, "Home"),
    order: toNumber(rawValue.order, 0, 0),
    style: normalizeWorkspaceStyle(rawValue.style),
    alertSummary: alertSummaryInput
      ? {
          count: toNumber(alertSummaryInput.count, 0, 0),
          note: typeof alertSummaryInput.note === "string" ? alertSummaryInput.note : undefined,
          blockId: typeof alertSummaryInput.blockId === "string" ? alertSummaryInput.blockId : undefined,
          rowId: typeof alertSummaryInput.rowId === "string" ? alertSummaryInput.rowId : undefined,
          columnId: typeof alertSummaryInput.columnId === "string" ? alertSummaryInput.columnId : undefined,
        }
      : null,
  };
}

export function validateSettingsFile(value: unknown): ValidationResult<PersistedSettingsFile> {
  const issues: ValidationIssue[] = [];
  const input = isRecord(value) ? value : {};
  if (input.schemaVersion !== STORAGE_SCHEMA_VERSION) {
    addIssue(issues, "schemaVersion", "Unexpected schema version.");
  }

  const settingsInput = isRecord(input.settings) ? input.settings : {};
  const defaultsInput = isRecord(settingsInput.defaults) ? settingsInput.defaults : {};
  const settings: Settings = {
    theme: settingsInput.theme === "light" || settingsInput.theme === "dark" ? settingsInput.theme : DEFAULT_SETTINGS.theme,
    defaults: {
      fontFamily:
        typeof defaultsInput.fontFamily === "string"
          ? defaultsInput.fontFamily
          : DEFAULT_SETTINGS.defaults.fontFamily,
      fontSize: toNumber(defaultsInput.fontSize, DEFAULT_SETTINGS.defaults.fontSize, 8),
      textColor: toCssColor(defaultsInput.textColor, DEFAULT_SETTINGS.defaults.textColor),
      cellBackground: toCssColor(
        defaultsInput.cellBackground,
        DEFAULT_SETTINGS.defaults.cellBackground
      ),
      blockBorderColor: toCssColor(
        defaultsInput.blockBorderColor,
        DEFAULT_SETTINGS.defaults.blockBorderColor
      ),
      blockBorderWidth: toNumber(
        defaultsInput.blockBorderWidth,
        DEFAULT_SETTINGS.defaults.blockBorderWidth,
        0
      ),
      workspaceAccentEnabled: toBoolean(
        defaultsInput.workspaceAccentEnabled,
        DEFAULT_SETTINGS.defaults.workspaceAccentEnabled
      ),
      workspaceBackground: toCssColor(
        defaultsInput.workspaceBackground,
        DEFAULT_SETTINGS.defaults.workspaceBackground
      ),
      workspaceTextColor: toCssColor(
        defaultsInput.workspaceTextColor,
        DEFAULT_SETTINGS.defaults.workspaceTextColor
      ),
      workspaceAccentColor: toCssColor(
        defaultsInput.workspaceAccentColor,
        DEFAULT_SETTINGS.defaults.workspaceAccentColor
      ),
    },
  };

  return {
    value: {
      schemaVersion: STORAGE_SCHEMA_VERSION,
      settings,
    },
    issues,
  };
}

export function validateWorkspaceIndexFile(value: unknown): ValidationResult<PersistedWorkspaceIndexFile> {
  const issues: ValidationIssue[] = [];
  const input = isRecord(value) ? value : {};
  if (input.schemaVersion !== STORAGE_SCHEMA_VERSION) {
    addIssue(issues, "schemaVersion", "Unexpected schema version.");
  }

  const workspaces: WorkspaceIndexEntry[] = [];
  const seen = new Set<string>();
  const rawWorkspaces = Array.isArray(input.workspaces) ? input.workspaces : [];
  for (let index = 0; index < rawWorkspaces.length; index += 1) {
    const workspace = normalizeWorkspaceIndexEntry(rawWorkspaces[index], `workspaces[${index}]`, issues);
    if (!workspace) {
      continue;
    }
    if (seen.has(workspace.id)) {
      addIssue(issues, `workspaces[${index}].id`, "Duplicate workspace id.");
      continue;
    }
    seen.add(workspace.id);
    workspaces.push(workspace);
  }

  workspaces.sort((left, right) => left.order - right.order);

  return {
    value: {
      schemaVersion: STORAGE_SCHEMA_VERSION,
      workspaces,
    },
    issues,
  };
}

export function validateWorkspaceFile(value: unknown): ValidationResult<PersistedWorkspaceFile> {
  const issues: ValidationIssue[] = [];
  const input = isRecord(value) ? value : {};
  if (input.schemaVersion !== STORAGE_SCHEMA_VERSION) {
    addIssue(issues, "schemaVersion", "Unexpected schema version.");
  }

  const workspaceId = isNonEmptyString(input.id) ? input.id : "workspace";
  const blocks: Block[] = [];
  const seen = new Set<string>();
  const rawBlocks = Array.isArray(input.blocks) ? input.blocks : [];
  for (let index = 0; index < rawBlocks.length; index += 1) {
    const block = normalizeBlock(rawBlocks[index], workspaceId, `blocks[${index}]`, issues);
    if (!block) {
      continue;
    }
    if (seen.has(block.id)) {
      addIssue(issues, `blocks[${index}].id`, "Duplicate block id.");
      continue;
    }
    seen.add(block.id);
    blocks.push(block);
  }

  blocks.sort((left, right) => left.order - right.order);

  return {
    value: {
      schemaVersion: STORAGE_SCHEMA_VERSION,
      id: workspaceId,
      blocks,
    },
    issues,
  };
}

export function validateLoadedAppData(value: unknown): ValidationResult<LoadedAppData> {
  const issues: ValidationIssue[] = [];
  const input = isRecord(value) ? value : {};
  const settingsFile = validateSettingsFile(input.settings).value;
  const indexFile = validateWorkspaceIndexFile(input.workspaceIndex).value;
  const workspaceValues = Array.isArray(input.workspaces)
    ? input.workspaces.map((workspace) => validateWorkspaceFile(workspace).value)
    : [];
  const workspaces = workspaceValues.length > 0 ? workspaceValues : [];

  return {
    value: {
      settings: settingsFile.settings,
      workspaceIndex: indexFile.workspaces,
      workspaces,
      activeWorkspaceId: typeof input.activeWorkspaceId === "string" ? input.activeWorkspaceId : null,
    },
    issues,
  };
}

export function toWorkspaceDocumentMap(workspaces: WorkspaceDocument[]): Record<string, WorkspaceDocument> {
  return workspaces.reduce<Record<string, WorkspaceDocument>>((accumulator, workspace) => {
    accumulator[workspace.id] = workspace;
    return accumulator;
  }, {});
}

export function resolveWorkspacePaths(root: string): AppDataPaths {
  return resolveAppDataPaths(root);
}

export function createPersistedSettingsFile(settings: Settings): PersistedSettingsFile {
  return {
    schemaVersion: STORAGE_SCHEMA_VERSION,
    settings,
  };
}

export function coerceSettingsForSave(settings: Settings): PersistedSettingsFile {
  return validateSettingsFile({
    schemaVersion: STORAGE_SCHEMA_VERSION,
    settings,
  }).value;
}

export function createPersistedWorkspaceIndexFile(
  workspaces: WorkspaceIndexEntry[]
): PersistedWorkspaceIndexFile {
  return {
    schemaVersion: STORAGE_SCHEMA_VERSION,
    workspaces,
  };
}

export function coerceWorkspaceIndexForSave(workspaces: WorkspaceIndexEntry[]): PersistedWorkspaceIndexFile {
  return validateWorkspaceIndexFile({
    schemaVersion: STORAGE_SCHEMA_VERSION,
    workspaces,
  }).value;
}

export function createPersistedWorkspaceFile(workspace: WorkspaceDocument): PersistedWorkspaceFile {
  return {
    schemaVersion: STORAGE_SCHEMA_VERSION,
    id: workspace.id,
    blocks: workspace.blocks,
  };
}

export function coerceWorkspaceForSave(workspace: WorkspaceDocument): PersistedWorkspaceFile {
  return validateWorkspaceFile({
    schemaVersion: STORAGE_SCHEMA_VERSION,
    id: workspace.id,
    blocks: workspace.blocks,
  }).value;
}

export function validateAndCoerceSettingsFile(value: unknown): PersistedSettingsFile {
  return validateSettingsFile(value).value;
}

export function validateAndCoerceWorkspaceIndexFile(value: unknown): PersistedWorkspaceIndexFile {
  return validateWorkspaceIndexFile(value).value;
}

export function validateAndCoerceWorkspaceFile(value: unknown): PersistedWorkspaceFile {
  return validateWorkspaceFile(value).value;
}

export function clonePersistedCell(cell: PersistedCell): PersistedCell {
  return {
    value: cell.value,
    format: cell.format ? { ...cell.format } : {},
  } as PersistedCell;
}

export function normalizePersistedCell(cell: PersistedCell, columnType: ColumnType): PersistedCell {
  if (columnType === "checkbox") {
    return {
      value: typeof cell.value === "boolean" ? cell.value : false,
      format: cell.format ? { ...cell.format } : {},
    } as CheckboxCellPayload;
  }

  if (columnType === "bullet" || columnType === "numbered") {
    return {
      value: null,
      format: cell.format ? { ...cell.format } : {},
    } as MarkerCellPayload;
  }

  if (columnType === "date" || columnType === "time" || columnType === "dropdown") {
    return {
      value: typeof cell.value === "string" || cell.value === null ? cell.value : null,
      format: cell.format ? { ...cell.format } : {},
    } as NullableTextCellPayload;
  }

  return {
    value: typeof cell.value === "string" ? cell.value : "",
    format: cell.format ? { ...cell.format } : {},
  } as TextCellPayload;
}
