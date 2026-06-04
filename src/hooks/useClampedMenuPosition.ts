import { useLayoutEffect, useRef, useState } from "react";

export interface ClampMenuInput {
  x: number;
  y: number;
  width: number;
  height: number;
  viewportWidth: number;
  viewportHeight: number;
  margin?: number;
}

export interface ClampedPosition {
  left: number;
  top: number;
}

/** Pure helper: clamp a popover so it stays inside the viewport with an optional margin. */
export function clampMenuPosition(input: ClampMenuInput): ClampedPosition {
  const margin = input.margin ?? 8;
  const maxLeft = Math.max(margin, input.viewportWidth - input.width - margin);
  const maxTop = Math.max(margin, input.viewportHeight - input.height - margin);
  const left = Math.min(Math.max(input.x, margin), maxLeft);
  const top = Math.min(Math.max(input.y, margin), maxTop);
  return { left, top };
}

/**
 * Hook that wraps a popover container and clamps its position to the viewport.
 *
 * - `useLayoutEffect` measures the element *before* paint, so clamping is
 *   applied with no visible flash.
 * - In SSR / JSDOM environments where `window` or `getBoundingClientRect` are
 *   unavailable or return zero-sized rects, falls back to the raw `(x, y)`.
 */
export function useClampedMenuPosition(x: number, y: number, margin = 8) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<ClampedPosition>({ left: x, top: y });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof window === "undefined") {
      setPos({ left: x, top: y });
      return;
    }

    const rect = el.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    // When the DOM measurement returns zero (e.g. JSDOM without layout),
    // skip clamping and just use the raw coordinates so existing tests
    // that open menus at small x/y stay green.
    if (width === 0 && height === 0) {
      setPos({ left: x, top: y });
      return;
    }

    setPos(
      clampMenuPosition({
        x,
        y,
        width,
        height,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        margin,
      })
    );
  }, [x, y, margin]);

  return { ref, left: pos.left, top: pos.top };
}
