import type { AppDefaults } from "../../types/settings.js";
import type { FormattingLayer } from "./mergeFormatting.js";

export function appDefaultsToFormatting(defaults: AppDefaults): FormattingLayer {
  return {
    fontFamily: defaults.fontFamily,
    fontSize: defaults.fontSize,
    textColor: defaults.textColor,
    backgroundColor: defaults.cellBackground,
    borderColor: defaults.blockBorderColor,
    borderWidth: defaults.blockBorderWidth,
  };
}
