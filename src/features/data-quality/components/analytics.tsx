import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";

import { pctStatus } from "../utils";
import type { AnalyticTone } from "../types";

export function Sparkline({ values, color = "#f97316" }: { values: number[]; color?: string }) {
  if (!values.length) return <div className="h-8 text-xs text-muted">Sem histórico de execução</div>;
  const width = 120;
  const height = 36;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values
    .map((value, index) => {
      const x = (index / Math.max(1, values.length - 1)) * width;
      const y = height - ((value - min) / range) * (height - 6) - 3;
      return `${x},${y}`;
    })
    .join(" ");
  const areaPoints = `0,${height} ${points} ${width},${height}`;
  const gradientId = `spark-${color.replace(/[^a-z0-9]/gi, "")}-${values.length}`;
  return (
    <svg aria-label="sparkline" className="h-9 w-full" viewBox={`0 0 ${width} ${height}`}>
      <defs>
        <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`M0 ${height - 1} H${width}`} stroke="#e2e8f0" strokeDasharray="4 4" strokeWidth="1" />
      <polygon fill={`url(#${gradientId})`} points={areaPoints} />
      <polyline fill="none" points={points} stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
    </svg>
  );
}

export function ScoreRing({ score }: { score: number | null }) {
  const clamped = score === null ? 0 : Math.max(0, Math.min(100, score));
  const status = score === null ? { label: "Sem cálculo", tone: "neutral" as const } : pctStatus(clamped);
  const ringColor = score === null ? "#94a3b8" : clamped >= 90 ? "#059669" : clamped >= 75 ? "#f59e0b" : "#dc2626";
  return (
    <div className="flex items-center gap-3">
      <div
        className="relative grid h-16 w-16 place-items-center rounded-full shadow-inner ring-4 ring-white"
        style={{ background: `conic-gradient(${ringColor} ${clamped * 3.6}deg, #e2e8f0 0deg)` }}
      >
        <div className="grid h-12 w-12 place-items-center rounded-full bg-surface text-xs font-semibold text-text-body shadow-sm">
          {score === null ? "—" : clamped.toFixed(0)}
        </div>
      </div>
      <div>
        <p className="text-sm font-medium text-text-body">Pontuação</p>
        <Badge tone={status.tone}>{status.label}</Badge>
      </div>
    </div>
  );
}

export function MetricCard({
  title,
  value,
  subtitle,
  delta,
  badge,
  icon,
  tone,
  children,
}: {
  title: string;
  value: string;
  subtitle?: string;
  delta?: ReactNode;
  badge?: ReactNode;
  icon: ReactNode;
  tone: AnalyticTone;
  children?: ReactNode;
}) {
  return (
    <div className={`rounded-2xl border bg-gradient-to-br ${tone.accentSoft} ${tone.border} p-4 shadow-[0_10px_30px_rgba(15,23,42,0.05)]`}>
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">{title}</p>
          <p className="text-3xl font-semibold tracking-tight text-text">{value}</p>
          {subtitle ? <p className="text-sm text-text-body">{subtitle}</p> : null}
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${tone.iconBg} shadow-sm`}>
          {icon}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <div>{delta}</div>
        {badge}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}
