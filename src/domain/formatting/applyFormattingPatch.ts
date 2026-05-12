import type { FormattingLayer } from "./mergeFormatting.js";

export type FormattingPatch = Partial<
  Record<keyof FormattingLayer, FormattingLayer[keyof FormattingLayer] | undefined>
>;

export function applyFormattingPatch<T extends FormattingLayer>(
  current: T | undefined,
  patch: FormattingPatch
): T {
  const result = { ...(current ?? {}) } as T;

  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) {
      delete (result as Record<string, unknown>)[key];
    } else {
      (result as Record<string, unknown>)[key] = value;
    }
  }

  return result;
}
