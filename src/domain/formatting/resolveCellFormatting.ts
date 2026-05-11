import type { AppDefaults } from "../../types/settings.js";
import type { FormattingLayer } from "./mergeFormatting.js";
import { appDefaultsToFormatting } from "./appDefaultsToFormatting.js";
import { mergeFormatting } from "./mergeFormatting.js";

export function resolveCellFormatting(
  appDefaults: AppDefaults,
  blockFormat: FormattingLayer,
  columnFormat: FormattingLayer,
  rowFormat: FormattingLayer,
  cellFormat?: FormattingLayer
): FormattingLayer {
  let resolved = appDefaultsToFormatting(appDefaults);
  resolved = mergeFormatting(resolved, blockFormat);
  resolved = mergeFormatting(resolved, columnFormat);
  resolved = mergeFormatting(resolved, rowFormat);
  if (cellFormat) {
    resolved = mergeFormatting(resolved, cellFormat);
  }
  return resolved;
}
