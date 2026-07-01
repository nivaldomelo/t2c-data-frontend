import { Link } from "@/lib/next-shims";
import { AlertTriangle, Activity, DatabaseZap, ShieldAlert, Siren, Stethoscope, X } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime } from "@/features/dashboard/components/shared";
import type { ExecutiveDashboardSummary } from "@/features/dashboard/types";
import { cn } from "@/lib/cn";
import {
  calculatePlatformHealth,
} from "@/features/dashboard/components/platform-executive-cockpit.logic";

type Props = {
  summary: ExecutiveDashboardSummary | null;
  loading: boolean;
  secondaryLoading: boolean;
  error: string;
};

type HealthCard = {
  key: string;
  label: string;
  value: string;
  detail: string;
  tone: "success" | "accent" | "warning" | "danger" | "neutral";
  icon: typeof Activity;
  progress?: number;
};

type DetailMetric = {
  label: string;
  value: string;
};

type KpiDetail = {
  key: string;
  title: string;
  eyebrow: string;
  description: string;
  formula: string;
  source: string;
  interpretation: string;
  actionHref: string;
  actionLabel: string;
  tone: HealthCard["tone"];
  icon: typeof Activity;
  metrics: DetailMetric[];
  items: Array<{ label: string; detail: string }>;
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(value);
}

function compactSchemaLabel(label: string, sourceLabel?: string | null) {
  if (sourceLabel && label.startsWith(`${sourceLabel} / `)) {
    return label.slice(sourceLabel.length + 3);
  }
  const parts = label.split(" / ");
  return parts.length > 1 ? parts.slice(1).join(" / ") : label;
}

function formatScopeLabel(summary: ExecutiveDashboardSummary) {
  const sourceLabel =
    summary.applied_filters.data_source_id != null
      ? summary.available_filters.sources.find((item) => item.value === String(summary.applied_filters.data_source_id))?.label ?? null
      : null;
  const schemaLabel = summary.applied_filters.schema_key
    ? summary.available_filters.schemas.find((item) => item.value === summary.applied_filters.schema_key)?.label ?? null
    : null;

  if (sourceLabel && schemaLabel) return `Recorte: ${sourceLabel} · ${compactSchemaLabel(schemaLabel, sourceLabel)}`;
  if (sourceLabel) return `Recorte: ${sourceLabel}`;
  if (schemaLabel) return `Recorte: ${compactSchemaLabel(schemaLabel)}`;
  return "Recorte global";
}

function cardToneClasses(tone: HealthCard["tone"]) {
  if (tone === "danger") return "border-danger-200 bg-danger-50 text-danger-800";
  if (tone === "warning") return "border-warning-200 bg-warning-50 text-warning-800";
  if (tone === "success") return "border-success-200 bg-success-50 text-success-800";
  if (tone === "accent") return "border-brand-200 bg-brand-50 text-brand-800";
  return "border-border bg-bg-subtle text-text-body";
}

function buildCards(summary: ExecutiveDashboardSummary): HealthCard[] {
  const health = calculatePlatformHealth(summary);
  const criticalIncidents = summary.incidents.critical_open_total;
  const dqCritical = summary.dq.worst_assets.filter((item) => (item.dq_score ?? 100) < 70).length;
  const integrationFailures = summary.ingestion.failed + summary.ingestion.degraded;

  return [
    {
      key: "platform-health",
      label: "Saúde da plataforma",
      value: `${health.score.toFixed(0)}/100`,
      detail: `${health.statusLabel} · ${
        health.score >= 80
          ? "plataforma estável e sem degradação relevante"
          : health.score >= 60
            ? "atenção concentrada em risco e incidentes"
            : health.score >= 30
              ? "impacto concentrado em incidentes, falhas operacionais e ativos bloqueados"
              : "impacto concentrado em incidentes, falhas operacionais e ativos bloqueados"
      }`,
      tone: health.tone,
      icon: Stethoscope,
      progress: health.score,
    },
    {
      key: "critical-risks",
      label: "Ativos em risco crítico",
      value: formatNumber(summary.top_critical.total),
      detail: "Ativos com score de risco executivo >= 75 ou bloqueio para consumo",
      tone: summary.top_critical.total > 0 ? "danger" : "success",
      icon: ShieldAlert,
    },
    {
      key: "incidents",
      label: "Incidentes abertos",
      value: formatNumber(summary.incidents.open_total),
      detail: `${formatNumber(criticalIncidents)} críticos abertos · incidentes ainda não resolvidos`,
      tone: criticalIncidents > 0 ? "danger" : summary.incidents.open_total > 0 ? "warning" : "success",
      icon: Siren,
    },
    {
      key: "critical-dq",
      label: "Tabelas com DQ crítica",
      value: formatNumber(dqCritical),
      detail: summary.dq.avg_score
        ? `${formatNumber(dqCritical)} abaixo de 70 pts · média DQ ${summary.dq.avg_score.toFixed(1)}`
        : "Aguardando leitura detalhada",
      tone: dqCritical > 0 ? "warning" : "success",
      icon: AlertTriangle,
    },
    {
      key: "integration-failures",
      label: "Falhas operacionais",
      value: formatNumber(integrationFailures),
      detail: summary.ingestion.available ? "Falhas e degradações em pipelines, integrações ou jobs" : "Camada operacional indisponível",
      tone: integrationFailures > 0 ? "warning" : summary.ingestion.available ? "success" : "neutral",
      icon: DatabaseZap,
    },
  ];
}

function buildDetails(summary: ExecutiveDashboardSummary): KpiDetail[] {
  const health = calculatePlatformHealth(summary);
  const criticalIncidents = summary.incidents.critical_open_total;
  const dqCriticalAssets = summary.dq.worst_assets.filter((item) => (item.dq_score ?? 100) < 70);
  const dqCritical = dqCriticalAssets.length;
  const integrationFailures = summary.ingestion.failed + summary.ingestion.degraded;
  const dqScore = health.dqScore;

  return [
    {
      key: "platform-health",
      title: "Saúde da plataforma",
      eyebrow: "KPI executivo",
      description:
        "Mostra a leitura consolidada de governança, DQ, certificação e penalidade por incidentes no recorte atual.",
      formula: "clamp(média(governança, DQ e certificação) - penalidade por incidentes, 0, 100)",
      source: "summary.governance_maturity.avg_score, summary.dq.avg_score, summary.certification.certified_pct, summary.incidents.open_total e summary.incidents.critical_open_total",
      interpretation: `${health.statusLabel} · resultado atual: ${health.score.toFixed(0)}/100.`,
      actionHref: "/dashboard",
      actionLabel: "Abrir dashboard",
      tone: health.tone,
      icon: Stethoscope,
      metrics: [
        { label: "Governança média", value: `${summary.governance_maturity.avg_score.toFixed(1)} pts` },
        { label: "DQ média", value: `${dqScore.toFixed(1)} pts` },
        { label: "Certificados", value: `${summary.certification.certified_pct.toFixed(1)}%` },
        { label: "Penalidade por incidentes", value: `${health.incidentPenalty.toFixed(0)} pts` },
      ],
      items: [
        { label: "Contribuição governança", detail: `${summary.governance_maturity.avg_score.toFixed(1)} pts` },
        { label: "Contribuição DQ", detail: `${dqScore.toFixed(1)} pts` },
        { label: "Contribuição certificação", detail: `${summary.certification.certified_pct.toFixed(1)}%` },
        { label: "Penalidade por incidentes", detail: `-${health.incidentPenalty.toFixed(0)} pts` },
      ],
    },
    {
      key: "critical-risks",
      title: "Ativos em risco crítico",
      eyebrow: "Prioridade executiva",
      description: "Conta os ativos com score de risco executivo igual ou acima de 75 pontos, ou bloqueio para consumo.",
      formula: "count(ativos com score de risco executivo >= 75 ou bloqueio para consumo)",
      source: "summary.top_critical.total e summary.top_critical.items",
      interpretation: `Ativos em risco crítico identificados no recorte: ${formatNumber(summary.top_critical.total)}.`,
      actionHref: summary.top_critical.items[0]?.links.explorer ?? "/dashboard",
      actionLabel: "Abrir ativo mais crítico",
      tone: summary.top_critical.total > 0 ? "danger" : "success",
      icon: ShieldAlert,
      metrics: [
        { label: "Total de críticos", value: formatNumber(summary.top_critical.total) },
        { label: "Base de cálculo", value: "Score de risco >= 75" },
      ],
      items: summary.top_critical.items.slice(0, 5).map((asset) => ({
        label: asset.table_fqn,
        detail: `${asset.criticality_score} pts de risco · ${formatNumber(asset.open_incidents)} incidente(s) aberto(s)`,
      })),
    },
    {
      key: "incidents",
      title: "Incidentes abertos",
      eyebrow: "Risco operacional",
      description: "Soma os incidentes ainda não resolvidos no recorte atual e destaca os críticos em separado.",
      formula: "open_total = soma dos incidentes abertos; critical_open_total = soma dos incidentes críticos abertos",
      source: "summary.incidents.open_total, summary.incidents.critical_open_total e summary.incidents.by_severity",
      interpretation: "A leitura da tela usa o recorte atual, e a severidade completa aparece no detalhe.",
      actionHref: "/incidents/tickets",
      actionLabel: "Abrir fila de incidentes",
      tone: criticalIncidents > 0 ? "danger" : summary.incidents.open_total > 0 ? "warning" : "success",
      icon: Siren,
      metrics: [
        { label: "Abertos", value: formatNumber(summary.incidents.open_total) },
        { label: "Críticos abertos", value: formatNumber(criticalIncidents) },
      ],
      items: summary.incidents.top_assets.slice(0, 5).map((asset) => ({
        label: asset.table_fqn,
        detail: `${formatNumber(asset.open_incidents)} incidente(s) abertos · ${formatNumber(asset.critical_open_incidents)} críticos`,
      })),
    },
    {
      key: "critical-dq",
      title: "Tabelas com DQ crítica",
      eyebrow: "Qualidade de dados",
      description: "Conta as tabelas com DQ abaixo do limite executivo de 70 pontos dentro do recorte atual.",
      formula: "count(summary.dq.worst_assets where dq_score < 70)",
      source: "summary.dq.worst_assets e summary.dq.avg_score",
      interpretation: summary.dq.not_evaluated > 0
        ? `${formatNumber(dqCritical)} abaixo de 70 pts · média DQ ${summary.dq.avg_score.toFixed(1)} · ${formatNumber(summary.dq.not_evaluated)} sem avaliação`
        : `${formatNumber(dqCritical)} abaixo de 70 pts · média DQ ${summary.dq.avg_score.toFixed(1)}`,
      actionHref: "/data-quality",
      actionLabel: "Abrir Data Quality",
      tone: dqCriticalAssets.length > 0 ? "warning" : "success",
      icon: AlertTriangle,
      metrics: [
        { label: "Tabelas críticas", value: formatNumber(dqCriticalAssets.length) },
        { label: "Média DQ", value: `${summary.dq.avg_score.toFixed(1)} pts` },
        { label: "Sem avaliação", value: formatNumber(summary.dq.not_evaluated) },
      ],
      items: dqCriticalAssets.slice(0, 5).map((asset) => ({
        label: asset.table_fqn,
        detail: `${asset.dq_score?.toFixed(1) ?? "n/d"} pts · ${formatNumber(asset.open_incidents)} incidente(s)`,
      })),
    },
    {
      key: "integration-failures",
      title: "Falhas operacionais",
      eyebrow: "Operação",
      description: "Considera falhas e degradações de pipeline. Anomalia de volume aparece separada no detalhe.",
      formula: "failed + degraded",
      source: "summary.ingestion.failed, summary.ingestion.degraded e summary.ingestion.high_volume_failed",
      interpretation: summary.ingestion.available
        ? `Falhas/degradações: ${formatNumber(integrationFailures)} · anomalia de volume: ${formatNumber(summary.ingestion.high_volume_failed)}`
        : "A camada operacional está indisponível nesta leitura.",
      actionHref: "/integrations/airflow",
      actionLabel: "Abrir integrações",
      tone: integrationFailures > 0 ? "warning" : summary.ingestion.available ? "success" : "neutral",
      icon: DatabaseZap,
      metrics: [
        { label: "Falhas + degradações", value: formatNumber(integrationFailures) },
        { label: "Anomalias de volume", value: formatNumber(summary.ingestion.high_volume_failed) },
      ],
      items: [
        ...summary.operational_intelligence.by_pipeline.slice(0, 3).map((item) => ({
          label: item.label,
          detail: `${formatNumber(item.failed_pipelines)} falha(s) · ${formatNumber(item.degraded_pipelines)} degradada(s)`,
        })),
        ...summary.ingestion.high_volume_failed_items.slice(0, 2).map((item) => ({
          label: item.table_fqn,
          detail: `Anomalia de volume · ${formatNumber(item.rows_processed ?? 0)} linhas`,
        })),
      ],
    },
  ];
}

function KpiDrawer({
  detail,
  onClose,
}: {
  detail: KpiDetail | null;
  onClose: () => void;
}) {
  if (!detail) return null;

  const Icon = detail.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-md md:p-6">
      <button aria-label="Fechar detalhe do KPI" className="absolute inset-0 cursor-default" onClick={onClose} type="button" />
      <div className="relative flex max-h-[92dvh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-border/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] shadow-card">
        <div className="sticky top-0 z-10 border-b border-border/60 bg-surface/90 backdrop-blur-xl">
          <div className="flex items-start justify-between gap-4 px-4 py-4 sm:px-6">
            <div className="min-w-0 space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">{detail.eyebrow}</p>
              <h3 className="break-words text-xl font-semibold tracking-[-0.02em] text-text sm:text-2xl">{detail.title}</h3>
              <p className="max-w-3xl text-sm leading-6 text-text-body">{detail.description}</p>
            </div>
            <Button className="h-10 w-10 shrink-0 px-0" onClick={onClose} variant="outline">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-8">
          <div className="space-y-6">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {detail.metrics.map((metric) => (
                <div className="rounded-2xl border border-border/80 bg-surface p-4 shadow-sm" key={metric.label}>
                  <p className="text-xs uppercase tracking-[0.16em] text-muted">{metric.label}</p>
                  <p className="mt-2 text-2xl font-semibold text-text">{metric.value}</p>
                </div>
              ))}
            </div>

            <Card className="border-border/80 bg-surface shadow-card">
              <CardContent className="space-y-4 p-5 sm:p-6">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={detail.tone}>{detail.title}</Badge>
                  <Badge tone="neutral">Escala 0-100 quando aplicável</Badge>
                </div>
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl border border-current/15 bg-surface p-2.5">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="space-y-3 text-sm leading-6 text-text-body">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Como é calculado?</p>
                      <p className="mt-1 font-mono text-sm text-text">{detail.formula}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Origem dos dados</p>
                      <p className="mt-1 break-words text-text-body">{detail.source}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Leitura executiva</p>
                      <p className="mt-1 text-text-body">{detail.interpretation}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {detail.items.length > 0 ? (
              <Card className="border-border/80 bg-surface shadow-card">
                <CardContent className="space-y-3 p-5 sm:p-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Drill-down</p>
                  <div className="space-y-2">
                    {detail.items.map((item) => (
                      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-bg-subtle/70 px-4 py-3" key={`${detail.key}-${item.label}`}>
                        <div className="min-w-0">
                          <p className="break-words text-sm font-medium text-text">{item.label}</p>
                          <p className="text-xs text-muted">{item.detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline">
                <Link href={detail.actionHref}>{detail.actionLabel}</Link>
              </Button>
              <Button onClick={onClose} variant="ghost">
                Fechar
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PlatformExecutiveCockpit({ summary, loading, secondaryLoading, error }: Props) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  if (loading && !summary) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full rounded-3xl" />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton className="h-28 w-full rounded-3xl" key={index} />
          ))}
        </div>
      </div>
    );
  }

  if (error && !summary) {
    return <EmptyState title="Dashboard indisponível" description={error} />;
  }

  if (!summary) {
    return <EmptyState title="Sem leitura executiva" description="Não foi possível consolidar a saúde da plataforma agora." />;
  }

  const cards = buildCards(summary);
  const details = buildDetails(summary);
  const selectedDetail = details.find((item) => item.key === selectedKey) ?? null;
  const scopeLabel = formatScopeLabel(summary);

  return (
    <section>
      <section className="rounded-3xl border border-border/60 bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_58%,#eef6ff_100%)] p-4 shadow-card md:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Dashboard executivo de dados</p>
            <h2 className="text-2xl font-semibold tracking-tight text-text">Risco, saúde e governança da plataforma</h2>
            <p className="max-w-3xl text-sm leading-7 text-text-body">
              Acompanhe saúde, risco, catálogo, governança, qualidade e certificação de dados no recorte selecionado.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone="neutral">Atualizado em {formatDateTime(summary.generated_at)}</Badge>
            <Badge tone="accent">{scopeLabel}</Badge>
            {secondaryLoading ? <Badge tone="neutral">Carregando sinais...</Badge> : null}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-5">
          {cards.map((item) => {
            const Icon = item.icon;
            return (
              <button
                aria-label={`Ver cálculo de ${item.label}`}
                className={cn(
                  "group rounded-2xl border p-2.5 text-left transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-brand-500 md:p-3",
                  cardToneClasses(item.tone),
                )}
                key={item.key}
                onClick={() => setSelectedKey(item.key)}
                title="Abrir detalhe"
                type="button"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-[0.68rem] font-semibold uppercase tracking-[0.12em] opacity-75">{item.label}</p>
                    <p className="mt-1 text-lg font-semibold tracking-tight md:text-xl">{item.value}</p>
                  </div>
                  <div className="rounded-xl border border-current/15 bg-surface/70 p-1.5">
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                </div>
                <p className="mt-1.5 line-clamp-2 text-xs opacity-80">{item.detail}</p>
                {typeof item.progress === "number" ? (
                  <div className="mt-3 space-y-1.5">
                    <div className="h-2 overflow-hidden rounded-full bg-surface/70">
                      <div
                        className="h-full rounded-full bg-current/80 transition-all"
                        style={{ width: `${Math.max(0, Math.min(100, item.progress))}%` }}
                      />
                    </div>
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] opacity-70">Barra executiva</p>
                  </div>
                ) : (
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] opacity-70">Detalhes</span>
                    <span className="rounded-full border border-current/10 bg-surface/70 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.14em] opacity-80">
                      Abrir
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </section>

      <KpiDrawer detail={selectedDetail} onClose={() => setSelectedKey(null)} />
    </section>
  );
}
