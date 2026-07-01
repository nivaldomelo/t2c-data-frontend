import { Link } from "@/lib/next-shims";
import { useMemo, useState } from "react";
import { ArrowRight, ChevronDown, ChevronUp, Clock3, Layers3, ShieldAlert, Sparkles, Workflow } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";

import { dedupeTimelineEpisodes, formatEpisodeWindow, sortTimelineEpisodes } from "../episode-utils.js";
import type { TimelineEpisode, TimelineEpisodeMember, TimelineCategory, TimelineSeverity, TimelineMode } from "../types";

type TimelineEpisodeFeedProps = {
  episodes: TimelineEpisode[];
  loading: boolean;
  emptyTitle: string;
  emptyDescription: string;
  compact?: boolean;
  showScopeBadges?: boolean;
  tableTimelineHref?: string | null;
  onAcknowledgeEpisode?: (episodeKey: string) => void;
  onSilenceEpisode?: (episodeKey: string) => void;
  actionBusyKey?: string | null;
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

function statusTone(status: TimelineEpisode["status"]): "success" | "accent" | "warning" | "neutral" {
  if (status === "resolved") return "success";
  if (status === "acknowledged") return "accent";
  if (status === "silenced") return "neutral";
  if (status === "open") return "warning";
  return "neutral";
}

function describeStatus(status: TimelineEpisode["status"]) {
  const labels: Record<TimelineEpisode["status"], string> = {
    open: "Aberto",
    watching: "Observação",
    acknowledged: "Reconhecido",
    silenced: "Silenciado",
    resolved: "Resolvido",
  };
  return labels[status];
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
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

function iconForEpisode(episode: TimelineEpisode) {
  if (episode.category === "incident") return ShieldAlert;
  if (episode.category === "quality") return Sparkles;
  if (episode.category === "operation") return Workflow;
  if (episode.category === "audit") return Clock3;
  return Layers3;
}

function diffSummary(member: TimelineEpisodeMember) {
  const metadata = (member.metadata_json || {}) as Record<string, unknown>;
  const entries: string[] = [];
  const before = metadata["before_json"];
  const after = metadata["after_json"];
  if (before && after && typeof before === "object" && typeof after === "object") {
    const keys = Array.from(new Set([...Object.keys(before as Record<string, unknown>), ...Object.keys(after as Record<string, unknown>)]));
    for (const key of keys.slice(0, 3)) {
      const beforeValue = (before as Record<string, unknown>)[key];
      const afterValue = (after as Record<string, unknown>)[key];
      if (beforeValue === afterValue) continue;
      entries.push(`${key}: ${String(beforeValue ?? "—")} → ${String(afterValue ?? "—")}`);
    }
  }
  if (metadata["delta"] !== undefined && metadata["delta"] !== null) {
    entries.push(`Variação ${String(metadata["delta"])}`);
  }
  if (
    metadata["previous_score"] !== undefined &&
    metadata["previous_score"] !== null &&
    metadata["readiness_score"] !== undefined &&
    metadata["readiness_score"] !== null
  ) {
    entries.push(`Prontidão ${String(metadata["previous_score"])} → ${String(metadata["readiness_score"])}`);
  }
  if (metadata["latest_status_label"] || metadata["status_label"]) {
    entries.push(String(metadata["latest_status_label"] || metadata["status_label"]));
  }
  return entries.slice(0, 3);
}

function EpisodeMemberCard({ member }: { member: TimelineEpisodeMember }) {
  const changeSummary = diffSummary(member);
  return (
    <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={categoryTone(member.category)}>{describeCategory(member.category)}</Badge>
            <Badge tone={modeTone(member.mode)}>{describeMode(member.mode)}</Badge>
            <Badge tone={severityTone(member.severity)}>{describeSeverity(member.severity)}</Badge>
          </div>
          <p className="text-sm font-semibold text-text">{member.title}</p>
          <p className="text-xs text-muted">
            {member.table_fqn || member.table_name || "Evento"} {member.column_name ? `• ${member.column_name}` : ""}
          </p>
        </div>
        <p className="text-xs text-muted">{formatTime(member.occurred_at)}</p>
      </div>

      {member.detail ? <p className="mt-3 text-sm leading-6 text-text-body">{member.detail}</p> : null}

      {changeSummary.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {changeSummary.map((item) => (
            <span className="rounded-full border border-border bg-bg-subtle px-2.5 py-1 text-xs text-text-body" key={item}>
              {item}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        {member.owner_name ? <Badge tone="neutral">Owner: {member.owner_name}</Badge> : null}
        {member.trust_score != null ? <Badge tone="neutral">Trust {member.trust_score}</Badge> : null}
        {member.active_dq_violation ? <Badge tone="warning">DQ ativa</Badge> : null}
      </div>

      {member.href ? (
        <div className="mt-3 flex justify-end">
          <Link className="inline-flex items-center gap-1 text-xs font-semibold text-info-700 hover:text-info-700" href={member.href}>
            Abrir contexto
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      ) : null}
    </div>
  );
}

export function TimelineEpisodeFeed({
  episodes,
  loading,
  emptyTitle,
  emptyDescription,
  compact = false,
  showScopeBadges = true,
  tableTimelineHref,
  onAcknowledgeEpisode,
  onSilenceEpisode,
  actionBusyKey,
}: TimelineEpisodeFeedProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const orderedEpisodes = useMemo(() => sortTimelineEpisodes(dedupeTimelineEpisodes(episodes)), [episodes]);

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: compact ? 3 : 5 }).map((_, index) => (
          <Skeleton className="h-48 w-full rounded-[28px]" key={index} />
        ))}
      </div>
    );
  }

  if (!orderedEpisodes.length) {
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
      {orderedEpisodes.map((episode) => {
        const isExpanded = expanded[episode.id] ?? !compact;
        const Icon = iconForEpisode(episode);
        return (
          <Card className="border-border/80 shadow-[0_12px_30px_rgba(15,23,42,0.05)]" key={episode.id}>
            <CardContent className="space-y-4 p-4 sm:p-5">
              <div className="flex gap-4">
                <div className="relative flex w-10 flex-col items-center">
                  <div className={cn("flex h-10 w-10 items-center justify-center rounded-full border shadow-sm", episode.severity === "critical" ? "border-danger-200 bg-danger-50 text-danger-700" : episode.severity === "high" ? "border-warning-200 bg-warning-50 text-warning-700" : episode.severity === "medium" ? "border-info-200 bg-info-50 text-info-700" : "border-border bg-surface text-text-body")}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="mt-1 h-full w-px flex-1 bg-slate-200" />
                </div>

                <div className="min-w-0 flex-1 space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={categoryTone(episode.category)}>{describeCategory(episode.category)}</Badge>
                        <Badge tone={severityTone(episode.severity)}>{describeSeverity(episode.severity)}</Badge>
                        <Badge tone="neutral">{episode.event_count} evento(s)</Badge>
                        <Badge tone="neutral">{episode.affected_assets_count} ativo(s)</Badge>
                        <Badge tone={statusTone(episode.status)}>{describeStatus(episode.status)}</Badge>
                        <Badge tone="neutral">Score {episode.importance_score}</Badge>
                        {episode.action_count > 0 ? <Badge tone="accent">{episode.action_count} ação(ões)</Badge> : null}
                        {episode.silenced_until ? <Badge tone="neutral">Silenciado até {formatDateTime(episode.silenced_until)}</Badge> : null}
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-text">{episode.title}</p>
                        <p className="text-xs text-muted">{showScopeBadges ? formatEpisodeWindow(episode.window_start, episode.window_end) : null}</p>
                      </div>
                    </div>
                    <div className="text-right text-xs text-muted">
                      <p>{formatDateTime(episode.window_end)}</p>
                      <p className="mt-1">{episode.source_label || episode.source_module || "Sistema"}</p>
                    </div>
                  </div>

                  <p className="text-sm leading-6 text-text-body">{episode.summary}</p>

                  <div className="grid gap-3 lg:grid-cols-3">
                    <div className="rounded-2xl border border-border bg-bg-subtle/80 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">O que mudou</p>
                      <p className="mt-2 text-sm leading-6 text-text-body">{episode.correlation_chain.join(" → ") || episode.summary}</p>
                    </div>
                    <div className="rounded-2xl border border-border bg-bg-subtle/80 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Por que importa</p>
                      <p className="mt-2 text-sm leading-6 text-text-body">{episode.why_it_matters}</p>
                    </div>
                    <div className="rounded-2xl border border-border bg-bg-subtle/80 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Próxima ação</p>
                      <p className="mt-2 text-sm leading-6 text-text-body">{episode.next_action}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {episode.correlation_label ? <Badge tone="accent">{episode.correlation_label}</Badge> : null}
                    {episode.acknowledged_by_name ? <Badge tone="accent">Reconhecido por {episode.acknowledged_by_name}</Badge> : null}
                    {episode.silence_reason ? <Badge tone="neutral">{episode.silence_reason}</Badge> : null}
                    {episode.impacted_owner_names.map((owner) => (
                      <Badge key={owner} tone="neutral">
                        Owner: {owner}
                      </Badge>
                    ))}
                    {episode.impacted_table_fqns.slice(0, 3).map((table) => (
                      <Badge key={table} tone="neutral">
                        {table}
                      </Badge>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap gap-2">
                      <Badge tone={modeTone(episode.mode)}>{describeMode(episode.mode)}</Badge>
                      <Badge tone="neutral">{episode.episode_type}</Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {episode.status !== "resolved" && onAcknowledgeEpisode ? (
                        <button
                          className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-text-body hover:bg-bg-subtle disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={actionBusyKey === episode.episode_key}
                          onClick={() => onAcknowledgeEpisode(episode.episode_key)}
                          type="button"
                        >
                          {actionBusyKey === episode.episode_key ? "Salvando..." : "Reconhecer"}
                        </button>
                      ) : null}
                      {episode.status !== "resolved" && onSilenceEpisode ? (
                        <button
                          className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-text-body hover:bg-bg-subtle disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={actionBusyKey === episode.episode_key}
                          onClick={() => onSilenceEpisode(episode.episode_key)}
                          type="button"
                        >
                          {actionBusyKey === episode.episode_key ? "Salvando..." : "Silenciar 2h"}
                        </button>
                      ) : null}
                      {episode.href ? (
                        <Link className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-text-body hover:bg-bg-subtle" href={episode.href}>
                          Abrir contexto
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      ) : null}
                      <button
                        className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-text-body hover:bg-bg-subtle"
                        onClick={() => setExpanded((current) => ({ ...current, [episode.id]: !isExpanded }))}
                        type="button"
                      >
                        {isExpanded ? (
                          <>
                            Recolher
                            <ChevronUp className="h-3.5 w-3.5" />
                          </>
                        ) : (
                          <>
                            Ver evidência
                            <ChevronDown className="h-3.5 w-3.5" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {isExpanded ? (
                    <div className="space-y-3 border-t border-border pt-3">
                      <div className="grid gap-3 md:grid-cols-2">
                        {episode.child_events.slice(0, compact ? 3 : episode.child_events.length).map((member) => (
                          <EpisodeMemberCard key={member.id} member={member} />
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
