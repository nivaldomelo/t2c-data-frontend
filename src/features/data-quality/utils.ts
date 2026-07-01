import { ArrowDownRight, ArrowUpRight, TrendingUp } from "lucide-react";

import { STATUS_TOKENS } from "@/config/status-tokens";
import type { AnalyticTone } from "./types";

export const ANALYTIC_TONES: Record<"score" | "completeness" | "freshness" | "volume" | "issues" | "column", AnalyticTone> = {
  score: {
    accent: "#7c3aed",
    accentSoft: "from-accent-50 via-cyan-50 to-white",
    border: STATUS_TOKENS.accent.border,
    text: STATUS_TOKENS.accent.text,
    iconBg: "bg-info-100 text-info-700",
    spark: "#7c3aed",
  },
  completeness: {
    accent: "#059669",
    accentSoft: "from-emerald-50 via-teal-50 to-white",
    border: STATUS_TOKENS.success.border,
    text: STATUS_TOKENS.success.text,
    iconBg: "bg-success-100 text-success-700",
    spark: "#059669",
  },
  freshness: {
    accent: "#0284c7",
    accentSoft: "from-accent-50 via-cyan-50 to-white",
    border: STATUS_TOKENS.info.border,
    text: STATUS_TOKENS.info.text,
    iconBg: "bg-cyan-100 text-cyan-700",
    spark: "#0284c7",
  },
  volume: {
    accent: "#2563eb",
    accentSoft: "from-blue-50 via-indigo-50 to-white",
    border: "border-blue-200",
    text: "text-blue-700",
    iconBg: "bg-blue-100 text-blue-700",
    spark: "#2563eb",
  },
  issues: {
    accent: "#dc2626",
    accentSoft: "from-rose-50 via-orange-50 to-white",
    border: STATUS_TOKENS.danger.border,
    text: STATUS_TOKENS.danger.text,
    iconBg: "bg-danger-100 text-danger-700",
    spark: "#dc2626",
  },
  column: {
    accent: "#0f766e",
    accentSoft: "from-slate-50 via-cyan-50 to-white",
    border: STATUS_TOKENS.neutral.border,
    text: STATUS_TOKENS.neutral.text,
    iconBg: "bg-bg-subtle text-text-body",
    spark: "#0f766e",
  },
};

export function pctStatus(value: number): { label: string; tone: "success" | "warning" | "neutral" } {
  if (value >= 90) return { label: "OK", tone: "success" };
  if (value >= 75) return { label: "Warning", tone: "warning" };
  return { label: "Critical", tone: "neutral" };
}

export function freshnessStatus(seconds: number): { label: string; tone: "success" | "warning" | "neutral" } {
  if (seconds <= 6 * 3600) return { label: "fresh", tone: "success" };
  if (seconds <= 24 * 3600) return { label: "warning", tone: "warning" };
  return { label: "stale", tone: "neutral" };
}

export function humanAge(seconds: number): string {
  if (seconds < 60) return `há ${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  return `há ${days}d`;
}

export function pctDelta(current: number, previous?: number): string {
  if (previous === undefined) return "-";
  const delta = current - previous;
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta.toFixed(2)} pp`;
}

export function deltaState(current: number, previous?: number): {
  label: string;
  className: string;
  icon: typeof ArrowUpRight;
} {
  if (previous === undefined) {
    return { label: "Sem referência", className: "text-muted", icon: TrendingUp };
  }
  const delta = current - previous;
  if (delta > 0) {
    return { label: `+${delta.toFixed(2)} pp vs anterior`, className: STATUS_TOKENS.success.text, icon: ArrowUpRight };
  }
  if (delta < 0) {
    return { label: `${delta.toFixed(2)} pp vs anterior`, className: STATUS_TOKENS.danger.text, icon: ArrowDownRight };
  }
  return { label: "Estável vs anterior", className: "text-muted", icon: TrendingUp };
}

export function heatTone(nullPct: number): string {
  if (nullPct >= 30) return "border-danger-200 bg-gradient-to-br from-rose-50 via-red-50 to-white text-rose-950";
  if (nullPct >= 10) return "border-warning-200 bg-gradient-to-br from-amber-50 via-yellow-50 to-white text-amber-950";
  if (nullPct > 0) return "border-orange-200 bg-gradient-to-br from-orange-50 via-amber-50 to-white text-orange-900";
  return "border-success-200 bg-gradient-to-br from-emerald-50 via-teal-50 to-white text-success-700";
}
