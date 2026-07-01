import * as React from "react";

import { cn } from "@/lib/cn";

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export function Textarea({ className, ...props }: TextareaProps) {
  return (
    <textarea
      className={cn(
        "min-h-[96px] w-full rounded-xl border border-border bg-surface/90 px-3.5 py-2.5 text-sm text-text-body shadow-[0_8px_24px_rgba(15,23,42,0.04)] transition-all duration-200 ease-out placeholder:text-muted focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-500/10",
        className,
      )}
      {...props}
    />
  );
}
