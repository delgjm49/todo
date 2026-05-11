import type { AppDefaults } from "../../types/settings.js";
import type { FormattingLayer } from "./mergeFormatting.js";
import { appDefaultsToFormatting } from "./appDefaultsToFormatting.js";
import { mergeFormatting } from "./mergeFormatting.js";

export function resolveRowStyle(
  appDefaults: AppDefaults,
  blockFormat: FormattingLayer,
  rowFormat: FormattingLayer
): FormattingLayer {
  let resolved = appDefaultsToFormatting(appDefaults);
  resolved = mergeFormatting(resolved, blockFormat);
  resolved = mergeFormatting(resolved, rowFormat);
  return resolved;
}
