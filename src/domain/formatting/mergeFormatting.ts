import type { TextFormatting, BorderFormatting } from "../../types/formatting.js";

export type FormattingLayer = Partial<TextFormatting & BorderFormatting>;

export function mergeFormatting(
  base: FormattingLayer,
  override: FormattingLayer
): FormattingLayer {
  const result: Record<string, unknown> = { ...base };

  for (const [key, value] of Object.entries(override)) {
    if (value !== undefined) {
      result[key] = value;
    } else {
      delete result[key];
    }
  }

  return result as FormattingLayer;
}
