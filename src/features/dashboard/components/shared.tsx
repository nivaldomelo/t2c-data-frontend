import { Link } from "@/lib/next-shims";
import {
  AlertTriangle,
  BadgeCheck,
  BookOpen,
  ChartNoAxesCombined,
  CircleAlert,
  Database,
  FileText,
  ShieldAlert,
  UserCircle2,
} from "lucide-react";

import { DatabaseTechLogo } from "@/components/database-tech-logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { STATUS_TOKENS } from "@/config/status-tokens";
import { cn } from "@/lib/cn";
import type { BreakdownItem, CoverageItem, DashboardKpi, TableItem, TrendPoint } from "@/features/dashboard/types";

type ToneName = "catalog" | "quality" | "freshness" | "glossary" | "risk" | "neutral";

type Tone = {
  border: string;
  surface: string;
  icon: string;
  text: string;
  bar: string;
};

const TONES: Record<ToneName, Tone> = {
  catalog: {
    border: STATUS_TOKENS.accent.border,
    surface: "from-brand-50 via-white to-accent-50",
    icon: `bg-brand-100 ${STATUS_TOKENS.accent.text}`,
    text: STATUS_TOKENS.accent.text,
    bar: "bg-gradient-to-r from-brand-600 to-accent-600",
  },
  quality: {
    border: STATUS_TOKENS.accent.border,
    surface: "from-brand-50 via-white to-accent-50",
    icon: `bg-brand-100 ${STATUS_TOKENS.accent.text}`,
    text: STATUS_TOKENS.accent.text,
    bar: "bg-gradient-to-r from-brand-600 to-accent-600",
  },
  freshness: {
    border: STATUS_TOKENS.success.border,
    surface: "from-success-50 via-white to-accent-50",
    icon: `bg-success-100 ${STATUS_TOKENS.success.text}`,
    text: STATUS_TOKENS.success.text,
    bar: "bg-gradient-to-r from-success-600 to-accent-500",
  },
  glossary: {
    border: "border-info-200",
    surface: "from-info-50 via-white to-brand-50",
    icon: "bg-info-100 text-info-700",
    text: "text-info-700",
    bar: "bg-gradient-to-r from-info-600 to-brand-600",
  },
  risk: {
    border: STATUS_TOKENS.danger.border,
    surface: "from-danger-50 via-white to-warning-50",
    icon: `bg-danger-100 ${STATUS_TOKENS.danger.text}`,
    text: STATUS_TOKENS.danger.text,
    bar: "bg-gradient-to-r from-danger-600 to-warning-500",
  },
  neutral: {
    border: STATUS_TOKENS.neutral.border,
    surface: "from-slate-50 via-white to-white",
    icon: `bg-bg-subtle ${STATUS_TOKENS.neutral.text}`,
    text: STATUS_TOKENS.neutral.text,
    bar: "bg-slate-500",
  },
};

const DONUT_COLORS = ["#0284c7", "#7c3aed", "#059669", "#f97316", "#e11d48", "#0f766e"];

function explorerTableHref(tableId: number): string {
  return `/explorer?tableId=${tableId}`;
}

export function formatValue(value: number, unit?: string | null): string {
  const formatter = new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: value % 1 === 0 ? 0 : 1,
    minimumFractionDigits: value % 1 === 0 ? 0 : 1,
  });
  return `${formatter.format(value)}${unit ? ` ${unit}` : ""}`;
}

export function formatPercent(value: number): string {
  return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(value)}%`;
}

export function formatDateTime(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Não disponível";
  return parsed.toLocaleString("pt-BR");
}

function toneFromName(value?: string | null): ToneName {
  if (!value) return "neutral";
  if (["catalog", "sky"].includes(value)) return "catalog";
  if (["quality", "certified", "in_review", "violet", "attention", "success"].includes(value)) return "quality";
  if (["freshness", "emerald"].includes(value)) return "freshness";
  if (["glossary", "cyan", "blue"].includes(value)) return "glossary";
  if (["risk", "critical", "rejected", "rose", "warning", "amber"].includes(value)) return "risk";
  return "neutral";
}

function iconForKpi(key: string) {
  if (key.includes("owner")) return UserCircle2;
  if (key.includes("dictionary")) return BookOpen;
  if (key.includes("dq") || key.includes("certified")) return BadgeCheck;
  if (key.includes("incident")) return AlertTriangle;
  if (key.includes("database") || key.includes("source") || key.includes("asset")) return Database;
  return ChartNoAxesCombined;
}

export function SectionTitle({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">{eyebrow}</p>
      <h3 className="text-lg font-semibold tracking-tight text-text">{title}</h3>
      <p className="text-sm leading-6 text-text-body">{description}</p>
    </div>
  );
}

export function KpiCard({ item }: { item: DashboardKpi }) {
  const tone = TONES[toneFromName(item.tone)];
  const Icon = iconForKpi(item.key);
  return (
    <Card className={cn("border shadow-card", tone.border)}>
      <CardContent className={cn("space-y-4 bg-gradient-to-br p-4", tone.surface)}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-text-body">{item.label}</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-text">{formatValue(item.value, item.unit)}</p>
          </div>
          <div className={cn("flex h-11 w-11 items-center justify-center rounded-2xl shadow-sm", tone.icon)}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
        <p className="text-sm text-text-body">{item.hint || "Sem detalhe adicional"}</p>
      </CardContent>
    </Card>
  );
}

export function DonutChart({ items, centerLabel = "Ativos" }: { items: BreakdownItem[]; centerLabel?: string }) {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  let current = 0;
  const gradient = items
    .map((item, index) => {
      const start = current;
      const delta = total > 0 ? (item.value / total) * 360 : 0;
      current += delta;
      return `${DONUT_COLORS[index % DONUT_COLORS.length]} ${start}deg ${current}deg`;
    })
    .join(", ");

  return (
    <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-center">
      <div className="mx-auto flex flex-col items-center gap-3">
        <div
          className="relative grid h-44 w-44 place-items-center rounded-full"
          style={{ background: total > 0 ? `conic-gradient(${gradient})` : "conic-gradient(#e2e8f0 360deg)" }}
        >
          <div className="grid h-28 w-28 place-items-center rounded-full bg-surface text-center shadow-inner">
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">{centerLabel}</span>
            <span className="text-3xl font-semibold tracking-tight text-text">{total}</span>
          </div>
        </div>
        <p className="text-xs text-muted">Distribuicao atual do ciclo de certificacao.</p>
      </div>
      <div className="space-y-3">
        {items.map((item, index) => (
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-border/80 bg-surface px-4 py-3 shadow-sm" key={item.key}>
            <div className="flex items-center gap-3">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: DONUT_COLORS[index % DONUT_COLORS.length] }} />
              <div>
                <p className="text-sm font-medium text-text">{item.label}</p>
                <p className="text-xs text-muted">{formatPercent(total ? (item.value / total) * 100 : 0)}</p>
              </div>
            </div>
            <span className="text-sm font-semibold text-text">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProgressRow({ item }: { item: CoverageItem }) {
  const tone = TONES[toneFromName(item.tone)];
  return (
    <div className="space-y-2" key={item.key}>
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium text-text-body">{item.label}</span>
        <span className={cn("font-semibold", tone.text)}>{formatPercent(item.pct)}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-bg-subtle">
        <div className={cn("h-full rounded-full", tone.bar)} style={{ width: `${Math.min(100, item.pct)}%` }} />
      </div>
      <p className="text-xs text-muted">{item.count} de {item.total} ativos cobertos</p>
    </div>
  );
}

export function MiniBarList({ items, engineIcons = false }: { items: BreakdownItem[]; engineIcons?: boolean }) {
  const max = Math.max(1, ...items.map((item) => item.value), 1);
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.key}>
          <div className="mb-1.5 flex items-center justify-between gap-3 text-sm text-text-body">
            <span className="flex min-w-0 items-center gap-2 truncate font-medium">
              {engineIcons ? <DatabaseTechLogo engine={item.key} size={32} variant="compact" /> : null}
              <span className="truncate">{item.label}</span>
            </span>
            <span className="font-semibold text-text">{item.value}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-bg-subtle">
            <div className="h-full rounded-full bg-brand-700" style={{ width: `${(item.value / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function TrendChart({ points }: { points: TrendPoint[] }) {
  if (!points.length) {
    return <p className="text-sm text-muted">Sem histórico de Qualidade de dados disponível.</p>;
  }
  const width = 720;
  const height = 240;
  const values = points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const path = points
    .map((point, index) => {
      const x = points.length === 1 ? width / 2 : (index / (points.length - 1)) * width;
      const y = height - ((point.value - min) / range) * (height - 24) - 12;
      return `${index === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ");

  return (
    <div className="space-y-3">
      <svg className="h-52 w-full" preserveAspectRatio="none" viewBox={`0 0 ${width} ${height}`}>
        <defs>
          <linearGradient id="dashboardTrend" x1="0%" x2="100%" y1="0%" y2="0%">
            <stop offset="0%" stopColor="#0284c7" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.95" />
          </linearGradient>
        </defs>
        <path d={path} fill="none" stroke="url(#dashboardTrend)" strokeLinecap="round" strokeWidth="4" />
      </svg>
      <div className="grid grid-cols-5 gap-2 text-xs text-muted md:grid-cols-10">
        {points.map((point) => (
          <div className="truncate" key={point.label}>{point.label}</div>
        ))}
      </div>
    </div>
  );
}

export function TableList({ title, subtitle, items, empty }: { title: string; subtitle: string; items: TableItem[]; empty: string }) {
  return (
    <div className="rounded-3xl border border-border/80 bg-surface p-5 shadow-card">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h4 className="text-base font-semibold text-text">{title}</h4>
          <p className="mt-1 text-sm text-text-body">{subtitle}</p>
        </div>
      </div>
      {!items.length ? (
        <p className="text-sm text-muted">{empty}</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Link
              className="flex items-center justify-between gap-3 rounded-2xl border border-border/80 bg-bg-subtle/80 px-4 py-3 transition-all duration-200 ease-out hover:border-border-strong hover:bg-surface"
              href={explorerTableHref(item.table_id)}
              key={item.table_id}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <DatabaseTechLogo engine={item.engine} size={32} variant="compact" />
                  <p className="truncate text-sm font-medium text-text">{item.table_name}</p>
                </div>
                <p className="mt-1 truncate text-xs text-muted">{item.datasource_name} / {item.database_name} / {item.schema_name}</p>
              </div>
              <div className="text-right text-xs text-muted">
                <p className="font-semibold text-text">DQ {item.dq_score?.toFixed(1) ?? "-"}</p>
                <p>Readiness {item.readiness_score}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function AttentionCard({ title, items, icon: Icon, helper }: { title: string; items: TableItem[]; icon: typeof CircleAlert; helper: string }) {
  return (
    <Card className="border-border/80 bg-surface shadow-card">
      <CardHeader className="flex flex-row items-start justify-between gap-3 border-b border-border/70 bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_58%,#eef6ff_100%)]">
        <div>
          <h4 className="text-base font-semibold text-text">{title}</h4>
          <p className="mt-1 text-sm text-text-body">{helper}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-bg-subtle text-text-body">
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {!items.length ? (
          <p className="text-sm text-muted">Nenhum ativo nessa fila no momento.</p>
        ) : (
          items.map((item) => (
            <Link href={explorerTableHref(item.table_id)} key={item.table_id} className="block rounded-2xl border border-border/80 bg-bg-subtle/80 px-4 py-3 transition hover:border-border-strong hover:bg-surface">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-text">{item.table_name}</p>
                  <p className="truncate text-xs text-muted">{item.datasource_name} / {item.schema_name}</p>
                </div>
                <DatabaseTechLogo engine={item.engine} size={30} variant="compact" />
              </div>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export function DashboardLoadingState() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton className="h-40 w-full" key={index} />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Skeleton className="h-[420px] w-full" />
        <Skeleton className="h-[420px] w-full" />
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <Skeleton className="h-[320px] w-full" />
        <Skeleton className="h-[320px] w-full" />
        <Skeleton className="h-[320px] w-full" />
      </div>
    </div>
  );
}

export const ATTENTION_ICONS = {
  low_dq: CircleAlert,
  no_owner: UserCircle2,
  no_dictionary: BookOpen,
  eligible_not_certified: BadgeCheck,
  critical_incidents: ShieldAlert,
  rejected: AlertTriangle,
  restricted: FileText,
};
