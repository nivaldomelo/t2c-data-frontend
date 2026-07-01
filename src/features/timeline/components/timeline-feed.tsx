import { Link } from "@/lib/next-shims";
import { useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, Clock3, ShieldAlert, Sparkles, Workflow } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";

import type { TimelineCategory, TimelineEvent, TimelineMode, TimelineSeverity } from "../types";

type TimelineFeedProps = {
  events: TimelineEvent[];
  loading: boolean;
  emptyTitle: string;
  emptyDescription: string;
  compact?: boolean;
  showScopeBadges?: boolean;
  tableTimelineHref?: string | null;
};

type DayGroup = {
  key: string;
  label: string;
  events: TimelineEvent[];
};

function categoryTone(category: TimelineCategory): "accent" | "success" | "warning" | "neutral" {
  if (category === "incident") return "warning";
  if (category === "quality") return "accent";
  if (category === "operation") return "neutral";
  if (category === "audit") return "neutral";
  return "accent";
}

function modeTone(mode: TimelineMode): "accent" | "neutral" {
  return mode === "manual" ? "accent" : "neutral";
}

function severityTone(severity: TimelineSeverity): "success" | "accent" | "warning" | "danger" {
  if (severity === "critical") return "danger";
  if (severity === "high") return "warning";
  if (severity === "medium") return "accent";
  return "success";
}

function trustTone(tone: string | null | undefined): "success" | "accent" | "warning" | "neutral" {
  if (tone === "success") return "success";
  if (tone === "accent") return "accent";
  if (tone === "warning") return "warning";
  return "neutral";
}

function categoryIcon(category: TimelineCategory) {
  if (category === "incident") return AlertTriangle;
  if (category === "quality") return ShieldAlert;
  if (category === "operation") return Workflow;
  if (category === "audit") return Clock3;
  return Sparkles;
}

function describeCategory(category: TimelineCategory) {
  const labels: Record<TimelineCategory, string> = {
    governance: "Governança",
    operation: "Operação",
    quality: "Qualidade",
    incident: "Incidente",
    audit: "Auditoria",
  };
  return labels[category];
}

function describeMode(mode: TimelineMode) {
  if (mode === "manual") return "Manual";
  if (mode === "automatic") return "Automático";
  return "Indefinido";
}

function describeSeverity(severity: TimelineSeverity) {
  const labels: Record<TimelineSeverity, string> = {
    low: "Baixa",
    medium: "Média",
    high: "Alta",
    critical: "Crítica",
  };
  return labels[severity];
}

function formatDateHeader(value: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function groupByDay(events: TimelineEvent[]): DayGroup[] {
  const groups = new Map<string, TimelineEvent[]>();
  for (const event of events) {
    const key = new Date(event.occurred_at).toISOString().slice(0, 10);
    const current = groups.get(key) || [];
    current.push(event);
    groups.set(key, current);
  }
  return Array.from(groups.entries()).map(([key, items]) => ({
    key,
    label: formatDateHeader(`${key}T00:00:00Z`),
    events: items.sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime()),
  }));
}

function MetadataDetails({ event }: { event: TimelineEvent }) {
  if (!event.metadata_json || Object.keys(event.metadata_json).length === 0) return null;
  return (
    <details className="group rounded-2xl border border-border bg-bg-subtle/70 px-4 py-3">
      <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.14em] text-muted">
        Detalhes adicionais
      </summary>
      <pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-xs leading-6 text-text-body">
        {JSON.stringify(event.metadata_json, null, 2)}
      </pre>
    </details>
  );
}

function EventCard({ event }: { event: TimelineEvent }) {
  const Icon = categoryIcon(event.category);
  const severityClasses =
    event.severity === "critical"
      ? "border-danger-200 bg-danger-50 text-danger-700"
      : event.severity === "high"
        ? "border-warning-200 bg-warning-50 text-warning-700"
        : event.severity === "medium"
          ? "border-info-200 bg-info-50 text-info-700"
          : "border-border bg-surface text-text-body";
  return (
    <div className={cn("flex gap-4", event.severity === "critical" && "rounded-2xl bg-danger-50/60 p-3")}>
      <div className="relative flex w-8 flex-col items-center">
        <div className={cn("flex h-8 w-8 items-center justify-center rounded-full border shadow-sm", severityClasses)}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="mt-1 h-full w-px flex-1 bg-slate-200" />
      </div>

      <div className="min-w-0 flex-1 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={categoryTone(event.category)}>{describeCategory(event.category)}</Badge>
              <Badge tone={modeTone(event.mode)}>{describeMode(event.mode)}</Badge>
              <Badge tone={severityTone(event.severity)}>{describeSeverity(event.severity)}</Badge>
              {event.source_label ? <Badge tone="neutral">{event.source_label}</Badge> : null}
            </div>
            <div>
              <p className="text-sm font-semibold text-text">{event.title}</p>
              <p className="mt-1 text-xs text-muted">
                {event.table_fqn || event.table_name || "Evento"} {event.column_name ? `• ${event.column_name}` : ""}
              </p>
            </div>
          </div>
          <div className="text-right text-xs text-muted">
            <p>{formatTime(event.occurred_at)}</p>
            <p className="mt-1">{event.actor_name || event.actor_email || (event.mode === "automatic" ? "Sistema" : "Governança")}</p>
          </div>
        </div>

        {event.detail ? <p className="text-sm leading-6 text-text-body">{event.detail}</p> : null}

        <div className="flex flex-wrap gap-2">
          {event.table_fqn ? <Badge tone="neutral">{event.table_fqn}</Badge> : null}
          {event.owner_name ? <Badge tone="neutral">Owner: {event.owner_name}</Badge> : null}
          {event.certification_status_label ? <Badge tone={event.certification_status === "certified" ? "success" : "accent"}>{event.certification_status_label}</Badge> : null}
          {event.readiness_score != null ? (
            <Badge tone={event.readiness_score >= 80 ? "success" : event.readiness_score >= 50 ? "accent" : "neutral"}>
              Prontidão {event.readiness_score}%
            </Badge>
          ) : null}
          {event.trust_score != null ? (
            <Badge tone={trustTone(event.trust_tone)}>
              Trust {event.trust_score}
              {event.trust_label ? ` · ${event.trust_label}` : ""}
            </Badge>
          ) : null}
          {event.trust_delta != null ? (
            <Badge tone={event.trust_delta > 0 ? "success" : event.trust_delta < 0 ? "warning" : "neutral"}>
              {event.trust_delta > 0 ? `+${event.trust_delta}` : event.trust_delta}
            </Badge>
          ) : null}
          {event.active_dq_violation ? <Badge tone="warning">DQ ativa</Badge> : null}
          {event.active_dq_rule_names.length > 0 ? <Badge tone="warning">{event.active_dq_rule_names.length} regra(s) DQ</Badge> : null}
          {event.column_name ? <Badge tone="neutral">Coluna: {event.column_name}</Badge> : null}
          {event.source_module ? <Badge tone="neutral">Origem: {event.source_module}</Badge> : null}
        </div>

        {event.metadata_json ? <MetadataDetails event={event} /> : null}

        {event.href ? (
          <div className="flex justify-end">
            <Link className="inline-flex items-center gap-1 text-xs font-semibold text-info-700 hover:text-info-700" href={event.href}>
              Abrir contexto
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function TimelineFeed({
  events,
  loading,
  emptyTitle,
  emptyDescription,
  compact = false,
  showScopeBadges = true,
  tableTimelineHref,
}: TimelineFeedProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const groups = useMemo(() => groupByDay(events), [events]);

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: compact ? 4 : 6 }).map((_, index) => (
          <Skeleton className="h-36 w-full rounded-3xl" key={index} />
        ))}
      </div>
    );
  }

  if (!groups.length) {
    return (
      <EmptyState
        action={
          tableTimelineHref ? (
            <Link className="text-sm font-semibold text-info-700 hover:text-info-700" href={tableTimelineHref}>
              Abrir no Explorer
            </Link>
          ) : null
        }
        description={emptyDescription}
        title={emptyTitle}
      />
    );
  }

  return (
    <div className="space-y-4">
      {groups.map((group) => {
        const isExpanded = expanded[group.key] ?? !compact;
        return (
          <Card className="border-border/80 shadow-[0_10px_26px_rgba(15,23,42,0.04)]" key={group.key}>
            <CardContent className="space-y-4 p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="neutral">{group.events.length} evento(s)</Badge>
                    {showScopeBadges ? <Badge tone="neutral">{group.label}</Badge> : null}
                  </div>
                  <p className="text-sm font-semibold text-text">{group.label}</p>
                </div>
                {group.events.length > 2 ? (
                  <button
                    className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-text-body hover:bg-bg-subtle"
                    onClick={() => setExpanded((current) => ({ ...current, [group.key]: !isExpanded }))}
                    type="button"
                  >
                    {isExpanded ? "Recolher" : "Expandir"}
                  </button>
                ) : null}
              </div>

              <div className="space-y-4">
                {group.events.slice(0, isExpanded ? group.events.length : 3).map((event) => (
                  <EventCard event={event} key={event.id} />
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
