import type { CSSProperties } from "react";
import type { FormattingLayer } from "./mergeFormatting.js";

export function formattingToCellStyle(formatting: FormattingLayer): CSSProperties {
  return {
    fontFamily: formatting.fontFamily,
    fontSize: formatting.fontSize ? `${formatting.fontSize}px` : undefined,
    fontWeight: formatting.bold ? 700 : undefined,
    fontStyle: formatting.italic ? "italic" : undefined,
    textDecoration: formatting.underline ? "underline" : undefined,
    color: formatting.textColor,
    backgroundColor: formatting.backgroundColor,
  };
}
