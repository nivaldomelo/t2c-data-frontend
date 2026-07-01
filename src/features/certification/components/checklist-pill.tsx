import { AlertTriangle, CheckCircle2 } from "lucide-react";

import type { CertificationChecklistItem } from "@/features/certification/types";
import { cn } from "@/lib/cn";

export function ChecklistPill({ item }: { item: CertificationChecklistItem }) {
  return (
    <div
      className={cn(
        "rounded-2xl border px-3 py-2",
        item.passed ? "border-success-200 bg-success-50/70" : "border-border bg-bg-subtle/90",
      )}
    >
      <div className="flex items-start gap-2">
        <div
          className={cn(
            "mt-0.5 flex h-5 w-5 items-center justify-center rounded-full",
            item.passed ? "bg-success-100 text-success-700" : "bg-slate-200 text-muted",
          )}
        >
          {item.passed ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-text">{item.label}</p>
          <p className="mt-1 text-xs leading-5 text-text-body">{item.detail}</p>
        </div>
      </div>
    </div>
  );
}
