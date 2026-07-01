import { cn } from "@/lib/cn";

import type { ProfilingStatusPresentation, ProfilingStatusTone } from "../profiling-status";

const STATUS_CLASSES: Record<
  ProfilingStatusTone,
  {
    container: string;
    label: string;
    detail: string;
    dot: string;
  }
> = {
  neutral: {
    container: "border-border bg-bg-subtle/70",
    label: "text-text-body",
    detail: "text-text-body",
    dot: "bg-slate-400",
  },
  accent: {
    container: "border-info-200 bg-info-50/80",
    label: "text-info-800",
    detail: "text-info-700",
    dot: "bg-info-500",
  },
  success: {
    container: "border-success-200 bg-success-50/80",
    label: "text-success-800",
    detail: "text-success-700",
    dot: "bg-success-500",
  },
  warning: {
    container: "border-warning-200 bg-warning-50/80",
    label: "text-warning-800",
    detail: "text-warning-700",
    dot: "bg-warning-500",
  },
  danger: {
    container: "border-danger-200 bg-danger-50/80",
    label: "text-danger-800",
    detail: "text-danger-700",
    dot: "bg-danger-500",
  },
};

type ProfilingRunStatusProps = {
  status: ProfilingStatusPresentation;
  className?: string;
};

export function ProfilingRunStatus({ className, status }: ProfilingRunStatusProps) {
  const tone = STATUS_CLASSES[status.tone] ?? STATUS_CLASSES.neutral;

  return (
    <div className={cn("flex items-start gap-3 rounded-2xl border px-3 py-2", tone.container, className)}>
      <span className={cn("mt-1 h-2.5 w-2.5 shrink-0 rounded-full", tone.dot)} aria-hidden="true" />
      <div className="min-w-0">
        <p className={cn("text-sm font-medium", tone.label)}>{status.label}</p>
        <p className={cn("mt-0.5 text-xs leading-5", tone.detail)}>{status.detail}</p>
      </div>
    </div>
  );
}
