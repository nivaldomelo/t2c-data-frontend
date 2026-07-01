import type { ReactNode } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export type BannerTone = "info" | "warning" | "error" | "success";

type BannerProps = {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  tone?: BannerTone;
  dismissible?: boolean;
  onDismiss?: () => void;
  className?: string;
};

function toneClassName(tone: BannerTone) {
  if (tone === "warning") return "border-warning-200 bg-warning-50 text-amber-950";
  if (tone === "error") return "border-danger-200 bg-danger-50 text-rose-950";
  if (tone === "success") return "border-success-200 bg-success-50 text-emerald-950";
  return "border-info-200 bg-info-50 text-sky-950";
}

function toneIconClassName(tone: BannerTone) {
  if (tone === "warning") return "border-warning-200 bg-surface text-warning-700";
  if (tone === "error") return "border-danger-200 bg-surface text-danger-700";
  if (tone === "success") return "border-success-200 bg-surface text-success-700";
  return "border-info-200 bg-surface text-info-700";
}

export function Banner({ title, description, action, icon, tone = "info", dismissible = false, onDismiss, className }: BannerProps) {
  return (
    <div className={cn("flex flex-col gap-4 rounded-2xl border p-4 shadow-sm sm:flex-row sm:items-start sm:justify-between", toneClassName(tone), className)}>
      <div className="flex min-w-0 items-start gap-3">
        {icon ? (
          <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border", toneIconClassName(tone))}>{icon}</div>
        ) : null}
        <div className="min-w-0 space-y-1">
          <div className="text-sm font-semibold leading-6">{title}</div>
          {description ? <div className="text-sm leading-6 opacity-90">{description}</div> : null}
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
        {action}
        {dismissible ? (
          <Button aria-label="Fechar aviso" onClick={onDismiss} size="sm" variant="ghost">
            <X className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}
