import type { ReactNode } from "react";
import { useClampedMenuPosition } from "../../hooks/useClampedMenuPosition.js";

export function MenuPopover({
  x,
  y,
  backdropTestId,
  children,
  onDismiss,
}: {
  x: number;
  y: number;
  backdropTestId: string;
  children: ReactNode;
  onDismiss: () => void;
}) {
  const { ref, left, top } = useClampedMenuPosition(x, y);

  return (
    <>
      <div
        aria-hidden="true"
        className="fixed inset-0 z-40"
        data-testid={backdropTestId}
        onPointerDown={onDismiss}
      />
      <div
        ref={ref}
        className="fixed z-50"
        style={{ left: `${left}px`, top: `${top}px` }}
        onPointerDown={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </>
  );
}
