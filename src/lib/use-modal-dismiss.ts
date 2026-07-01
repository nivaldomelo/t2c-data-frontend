import { useEffect } from "react";

type ModalDismissOptions = {
  /** Whether the modal is currently visible. The handlers no-op while false. */
  open: boolean;
  /** Called when the user presses Escape (when enabled). */
  onClose: () => void;
  /** Close the modal when Escape is pressed. Defaults to true. */
  closeOnEscape?: boolean;
  /** Prevent the page body from scrolling behind the modal. Defaults to true. */
  lockScroll?: boolean;
};

/**
 * Shared modal/dialog/drawer behaviour: Escape-to-close and background
 * scroll-lock. Call it unconditionally (before any early `if (!open) return`)
 * so it obeys the rules of hooks — it guards on `open` internally.
 */
export function useModalDismiss({
  open,
  onClose,
  closeOnEscape = true,
  lockScroll = true,
}: ModalDismissOptions): void {
  useEffect(() => {
    if (!open || !closeOnEscape) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, closeOnEscape, onClose]);

  useEffect(() => {
    if (!open || !lockScroll) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open, lockScroll]);
}
