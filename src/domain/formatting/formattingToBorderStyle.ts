import type { CSSProperties } from "react";
import type { FormattingLayer } from "./mergeFormatting.js";

export function formattingToBorderStyle(formatting: FormattingLayer): CSSProperties {
  if (!Array.isArray(formatting.edges)) {
    return {};
  }

  const width = formatting.borderWidth ?? 1;
  const color = formatting.borderColor ?? "#000000";
  const edgeSet = new Set(formatting.edges);

  return {
    borderStyle: "solid",
    borderColor: color,
    borderTopWidth: edgeSet.has("top") ? width : 0,
    borderRightWidth: edgeSet.has("right") ? width : 0,
    borderBottomWidth: edgeSet.has("bottom") ? width : 0,
    borderLeftWidth: edgeSet.has("left") ? width : 0,
  };
}
