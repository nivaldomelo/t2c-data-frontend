import { useId, useState, type ReactNode } from "react";
import { HelpCircle } from "lucide-react";

import { cn } from "@/lib/cn";

type TooltipProps = {
  content: ReactNode;
  children: ReactNode;
  className?: string;
  side?: "top" | "bottom";
};

/**
 * Lightweight, dependency-free tooltip. Shows `content` on hover/focus of `children`.
 * Accessible via aria-describedby; the bubble is non-interactive (decorative help text).
 */
export function Tooltip({ content, children, className, side = "top" }: TooltipProps) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <span
      className={cn("relative inline-flex", className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <span aria-describedby={open ? id : undefined} className="inline-flex">
        {children}
      </span>
      {open ? (
        <span
          role="tooltip"
          id={id}
          className={cn(
            "pointer-events-none absolute left-1/2 z-50 w-max max-w-xs -translate-x-1/2 rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-normal leading-snug text-white shadow-lg",
            side === "top" ? "bottom-full mb-1.5" : "top-full mt-1.5",
          )}
        >
          {content}
        </span>
      ) : null}
    </span>
  );
}

/**
 * Convenience "(?)" icon that reveals help text on hover/focus. Use next to a label/term.
 */
export function InfoTooltip({ text, className }: { text: ReactNode; className?: string }) {
  return (
    <Tooltip content={text}>
      <button
        type="button"
        aria-label="Ajuda"
        className={cn(
          "inline-flex h-4 w-4 items-center justify-center rounded-full text-muted transition hover:text-text-body",
          className,
        )}
      >
        <HelpCircle className="h-3.5 w-3.5" />
      </button>
    </Tooltip>
  );
}

export default Tooltip;
