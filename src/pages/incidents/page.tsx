import { Link } from "@/lib/next-shims";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BookMarked,
  Clock3,
  Plus,
  ShieldAlert,
  Ticket,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ContextualJourneyCard } from "@/components/navigation/contextual-journey-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/client-api";
import { cn } from "@/lib/cn";
import type { Incident, IncidentCenterSummary } from "@/features/incidents/types";

type IncidentSummary = {
  counts_by_status: Record<string, number>;
  counts_by_severity: Record<string, number>;
  counts_by_entity_type: Record<string, number>;
  detected_per_day: Array<{ date: string; count: number }>;
  total_last_7_days: number;
};

type Tone = {
  border: string;
  surface: string;
  icon: string;
  spark: string;
};

const TONES: Record<"risk" | "ops" | "fresh" | "catalog" | "neutral", Tone> = {
  risk: {
    border: "border-danger-200/80",
    surface: "from-rose-50 via-orange-50 to-white",
    icon: "bg-danger-100 text-danger-700",
    spark: "#dc2626",
  },
  ops: {
    border: "border-info-200/80",
    surface: "from-accent-50 via-cyan-50 to-white",
    icon: "bg-info-100 text-info-700",
    spark: "#0284c7",
  },
  fresh: {
    border: "border-success-200/80",
    surface: "from-emerald-50 via-teal-50 to-white",
    icon: "bg-success-100 text-success-700",
    spark: "#059669",
  },
  catalog: {
    border: "border-violet-200/80",
    surface: "from-violet-50 via-fuchsia-50 to-white",
    icon: "bg-violet-100 text-violet-700",
    spark: "#7c3aed",
  },
  neutral: {
    border: "border-border/80",
    surface: "from-slate-50 via-white to-white",
    icon: "bg-bg-subtle text-text-body",
    spark: "#475569",
  },
};

function MiniLineChart({
  data,
  color,
}: {
  data: Array<{ date: string; count: number }>;
  color: string;
}) {
  if (!data.length) return <p className="text-xs text-muted">Sem dados</p>;
  const width = 600;
  const height = 220;
  const max = Math.max(1, ...data.map((d) => d.count));
  const points = data.map((d, idx) => {
    const x = data.length === 1 ? 0 : (idx / (data.length - 1)) * width;
    const y = height - (d.count / max) * (height - 12) - 6;
    return `${x},${y}`;
  });
  return (
    <svg className="h-full w-full" preserveAspectRatio="none" viewBox={`0 0 ${width} ${height}`}>
      <polyline fill="none" points={points.join(" ")} stroke={color} strokeWidth="3" />
    </svg>
  );
}

function HorizontalBars({
  data,
  colorClassName,
}: {
  data: Array<{ name: string; value: number }>;
  colorClassName: string;
}) {
  if (!data.length) return <p className="text-xs text-muted">Sem dados</p>;
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="space-y-3">
      {data.map((item) => (
        <div key={item.name}>
          <div className="mb-1 flex items-center justify-between text-xs text-text-body">
            <span className="truncate">{item.name}</span>
            <span className="font-medium">{item.value}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-bg-subtle">
            <div className={cn("h-full rounded-full", colorClassName)} style={{ width: `${(item.value / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

type IncidentOriginFilter = {
  label: string;
  value: string;
};

const INCIDENT_ORIGIN_FILTERS: IncidentOriginFilter[] = [
  { label: "Todas", value: "" },
  { label: "Data Quality", value: "dq_rule" },
  { label: "Ingestão", value: "ingestion_ops" },
  { label: "Privacidade", value: "privacy" },
  { label: "Certificação", value: "certification" },
  { label: "Operação", value: "platform_ops" },
  { label: "Manual", value: "manual" },
];

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("pt-BR");
}

function incidentSourceCategory(value: string | null | undefined): IncidentOriginFilter {
  const source = (value || "").trim().toLowerCase();
  if (!source) return INCIDENT_ORIGIN_FILTERS[0];
  if (source.startsWith("dq")) return INCIDENT_ORIGIN_FILTERS[1];
  if (["pipeline_failure", "pipeline_stale", "ingestion_ops"].includes(source)) return INCIDENT_ORIGIN_FILTERS[2];
  if (source.includes("privacy")) return INCIDENT_ORIGIN_FILTERS[3];
  if (source.includes("cert")) return INCIDENT_ORIGIN_FILTERS[4];
  if (["platform_ops", "ops_cockpit"].includes(source)) return INCIDENT_ORIGIN_FILTERS[5];
  if (source === "manual") return INCIDENT_ORIGIN_FILTERS[6];
  return { label: source, value: source };
}

function incidentOwnerLabel(item: Incident): string {
  if (item.asset_context?.owner_name) return item.asset_context.owner_name;
  if (item.owner_team && item.owner_team.trim()) return item.owner_team;
  if (item.squad_name && item.squad_name.trim()) return item.squad_name;
  if (item.owner_user?.name) return item.owner_user.name;
  if (item.owner_user?.email) return item.owner_user.email;
  return "Sem responsável";
}

function buildTicketsHref(params: Record<string, string | number | boolean | Array<string | number> | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) {
      value.forEach((entry) => search.append(key, String(entry)));
      continue;
    }
    if (value === true) {
      search.set(key, "1");
      continue;
    }
    if (value === false) continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `/incidents/tickets?${query}` : "/incidents/tickets";
}

export default function IncidentsSummaryPage() {
  const [summary, setSummary] = useState<IncidentSummary | null>(null);
  const [centerSummary, setCenterSummary] = useState<IncidentCenterSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [centerError, setCenterError] = useState("");

  useEffect(() => {
    void (async () => {
      await reloadSummary();
    })();
  }, []);

  async function reloadSummary() {
    setLoading(true);
    setLoadError("");
    setCenterError("");
    try {
      const [summaryResult, centerResult] = await Promise.allSettled([
        apiRequest<IncidentSummary>("/v1/incidents/summary?days=30"),
        apiRequest<IncidentCenterSummary>("/v1/incidents/center?days=30"),
      ]);
      if (summaryResult.status === "fulfilled") {
        setSummary(summaryResult.value);
        setError("");
      } else {
        const message = summaryResult.reason instanceof Error ? summaryResult.reason.message : "Não foi possível carregar o resumo.";
        setError(message);
        setLoadError(message);
        setSummary(null);
      }
      if (centerResult.status === "fulfilled") {
        setCenterSummary(centerResult.value);
      } else {
        setCenterError(centerResult.reason instanceof Error ? centerResult.reason.message : "Não foi possível carregar a central de triagem.");
        setCenterSummary(null);
      }
    } catch (e) {
      const message = (e as Error).message;
      setError(message);
      setLoadError(message);
      setSummary(null);
      setCenterSummary(null);
      setCenterError(message);
    } finally {
      setLoading(false);
    }
  }

  const openCount = summary?.counts_by_status?.open ?? 0;
  const investigatingCount = summary?.counts_by_status?.investigating ?? 0;
  const mitigatedCount = summary?.counts_by_status?.mitigated ?? 0;
  const resolvedCount = summary?.counts_by_status?.resolved ?? 0;
  const closedCount = summary?.counts_by_status?.closed ?? 0;
  const reopenedCount = summary?.counts_by_status?.reopened ?? 0;
  const recurringCount = summary?.counts_by_status?.recurring ?? 0;
  const criticalCount = summary?.counts_by_severity?.sev1 ?? 0;
  const highCount = summary?.counts_by_severity?.sev2 ?? 0;
  const mediumCount = summary?.counts_by_severity?.sev3 ?? 0;
  const lowCount = summary?.counts_by_severity?.sev4 ?? 0;
  const total7d = summary?.total_last_7_days ?? 0;
  const totalTickets = Object.values(summary?.counts_by_status || {}).reduce((acc, value) => acc + value, 0);
  const slaOverdue = centerSummary?.by_sla?.find((queue) => queue.key === "overdue")?.count ?? 0;
  const slaRisk = centerSummary?.by_sla?.find((queue) => queue.key === "due_soon")?.count ?? 0;
  const unassignedCount = centerSummary?.by_owner?.find((queue) => queue.key === "__unassigned__")?.count ?? 0;
  const recentIncidents = centerSummary?.recent_incidents ?? [];
  const originCounts = useMemo(
    () =>
      INCIDENT_ORIGIN_FILTERS.map((origin) => ({
        ...origin,
        count:
          origin.value === ""
            ? recentIncidents.length
            : recentIncidents.filter((incident) => incidentSourceCategory(incident.source_type).value === origin.value).length,
      })),
    [recentIncidents],
  );
  const queueHealthCards = [
    {
      title: "Total de chamados",
      value: totalTickets,
      hint: "chamados retornados pelo resumo atual",
      tone: "neutral" as const,
      href: buildTicketsHref({}),
    },
    {
      title: "Abertos",
      value: openCount,
      hint: "aguardando investigação ou atribuição",
      tone: "risk" as const,
      href: buildTicketsHref({ status: ["open"] }),
    },
    {
      title: "Críticos",
      value: criticalCount,
      hint: "incidentes sev1 com maior risco operacional",
      tone: "risk" as const,
      href: buildTicketsHref({ severity: ["sev1"] }),
    },
    {
      title: "Sem responsável",
      value: unassignedCount,
      hint: "chamados sem owner definido",
      tone: "ops" as const,
      href: buildTicketsHref({ unassigned: true }),
    },
    {
      title: "Investigando",
      value: investigatingCount,
      hint: "em tratativa ativa",
      tone: "ops" as const,
      href: buildTicketsHref({ status: ["investigating"] }),
    },
    {
      title: "Resolvidos",
      value: resolvedCount + closedCount + mitigatedCount,
      hint: "tratativa concluída ou reduzida",
      tone: "fresh" as const,
      href: buildTicketsHref({ status: ["resolved", "closed", "mitigated"] }),
    },
    {
      title: "Recorrentes",
      value: recurringCount,
      hint: "repetições ou reincidência operacional",
      tone: "catalog" as const,
      href: buildTicketsHref({ status: ["recurring"] }),
    },
    {
      title: "SLA em risco",
      value: slaRisk + slaOverdue,
      hint: "vencendo ou vencidos na janela atual",
      tone: "risk" as const,
      href: buildTicketsHref({ sla_status: "overdue" }),
    },
  ];
  const attentionCards = [
    {
      title: "Críticos abertos",
      value: criticalCount,
      hint: "Incidentes sev1 ainda sem resolução.",
      impact: "Podem interromper consumo, confiança ou operação dos dados.",
      actionLabel: "Ver críticos",
      href: buildTicketsHref({ severity: ["sev1"], status: ["open"] }),
      tone: "risk" as const,
    },
    {
      title: "Sem responsável",
      value: unassignedCount,
      hint: "Chamados sem owner definido.",
      impact: "Podem ficar sem tratativa e atrasar a resolução.",
      actionLabel: "Ver sem responsável",
      href: buildTicketsHref({ unassigned: true }),
      tone: "ops" as const,
    },
    {
      title: "SLA vencido",
      value: slaOverdue,
      hint: "Chamados fora do prazo operacional.",
      impact: "Aumentam risco e expõem atraso na resposta.",
      actionLabel: "Ver vencidos",
      href: buildTicketsHref({ sla_status: "overdue" }),
      tone: "risk" as const,
    },
    {
      title: "Recorrentes",
      value: recurringCount,
      hint: "Chamados repetidos ou com reincidência.",
      impact: "Sugerem correção incompleta ou causa ainda presente.",
      actionLabel: "Ver recorrentes",
      href: buildTicketsHref({ status: ["recurring"] }),
      tone: "catalog" as const,
    },
    {
      title: "Reabertos",
      value: reopenedCount,
      hint: "Chamados que voltaram após fechamento.",
      impact: "Indicam regressão ou tratativa incompleta.",
      actionLabel: "Ver reabertos",
      href: buildTicketsHref({ status: ["reopened"] }),
      tone: "catalog" as const,
    },
    {
      title: "DQ crítico",
      value: recentIncidents.filter((incident) => incidentSourceCategory(incident.source_type).value === "dq_rule" && incident.severity === "sev1").length,
      hint: "Incidentes de Data Quality com maior criticidade.",
      impact: "Regras e ativos críticos podem estar comprometidos.",
      actionLabel: "Ver DQ",
      href: buildTicketsHref({ source_type: "dq_rule", severity: ["sev1"] }),
      tone: "risk" as const,
    },
  ];
  const recommendedActions = [
    {
      title: "Atribuir responsável para chamados críticos sem owner",
      detail: `${unassignedCount} chamado(s) sem responsável.`,
      impact: "Reduce o risco de fila parada e acelera a investigação.",
      href: buildTicketsHref({ unassigned: true, severity: ["sev1"] }),
      label: "Ver sem responsável",
      tone: "risk" as const,
    },
    {
      title: "Priorizar regras de Data Quality com múltiplas ocorrências",
      detail: `${recentIncidents.filter((incident) => incidentSourceCategory(incident.source_type).value === "dq_rule").length} incidente(s) ligados a DQ.`,
      impact: "Ajuda a atacar a causa raiz antes de resolver caso a caso.",
      href: buildTicketsHref({ source_type: "dq_rule" }),
      label: "Abrir fila DQ",
      tone: "catalog" as const,
    },
    {
      title: "Revisar chamados fora do SLA",
      detail: `${slaOverdue} chamado(s) vencido(s).`,
      impact: "Concentra a investigação onde já existe atraso operacional.",
      href: buildTicketsHref({ sla_status: "overdue" }),
      label: "Ver vencidos",
      tone: "risk" as const,
    },
    {
      title: "Inspecionar ativos com maior concentração",
      detail: `${centerSummary?.top_assets?.[0]?.open_count ?? 0} chamado(s) no ativo mais impactado.`,
      impact: "Mostra onde o risco está se acumulando na operação.",
      href: centerSummary?.top_assets?.[0]?.href || "/incidents/tickets",
      label: "Abrir ativo",
      tone: "ops" as const,
    },
    {
      title: "Abrir fila detalhada para triagem",
      detail: "Use a fila para investigar, atribuir, mitigar e resolver.",
      impact: "Mantém a visão executiva separada da operação diária.",
      href: "/incidents/tickets",
      label: "Abrir fila",
      tone: "neutral" as const,
    },
  ];
  const triageQueues = centerSummary?.by_status ?? [];
  const triageAssets = centerSummary?.top_assets ?? [];

  const detectedSeries = useMemo(
    () =>
      (summary?.detected_per_day || []).map((item) => ({
        date: item.date.slice(5),
        count: item.count,
      })),
    [summary?.detected_per_day],
  );

  const statusSeries = useMemo(
    () => [
      { name: "Abertos", value: openCount },
      { name: "Investigando", value: investigatingCount },
      { name: "Mitigados", value: mitigatedCount },
      { name: "Resolvidos", value: resolvedCount },
      { name: "Fechados", value: closedCount },
    ],
    [openCount, investigatingCount, mitigatedCount, resolvedCount, closedCount],
  );

  const severitySeries = useMemo(
    () =>
      Object.entries(summary?.counts_by_severity || {}).map(([key, value]) => ({
        name:
          key === "sev1" ? "Crítico" : key === "sev2" ? "Alto" : key === "sev3" ? "Médio" : key === "sev4" ? "Baixo" : key,
        value,
      })),
    [summary?.counts_by_severity],
  );

  return (
    <div className="space-y-6">
      <Card className="border-border/80 bg-gradient-to-br from-white via-slate-50 to-accent-50 shadow-[0_18px_48px_rgba(15,23,42,0.05)]">
        <CardContent className="space-y-6 p-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-info-200 bg-surface px-3 py-1 text-xs font-medium text-info-700">
                <ShieldAlert className="h-3.5 w-3.5" />
                Central operacional
              </div>
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-text">Central de incidentes</h2>
                <p className="mt-2 max-w-3xl text-sm leading-7 text-text-body">
                  Visão executiva da saúde, prioridade e evolução dos chamados de dados.
                </p>
                <p className="mt-2 max-w-3xl text-sm leading-7 text-muted">
                  Use esta página para acompanhar a situação geral dos incidentes, identificar riscos críticos e acessar a fila operacional para investigação, atribuição e resolução.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm" variant="outline">
                <Link href="/incidents/tickets">Abrir fila de chamados</Link>
              </Button>
              <Button asChild data-doc-anchor="incidents-create" size="sm">
                <Link href="/incidents/tickets?create=1">
                  <Plus className="mr-2 h-4 w-4" />
                  Criar chamado
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href={buildTicketsHref({ severity: ["sev1"] })}>Ver críticos</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href={buildTicketsHref({ unassigned: true })}>Ver sem responsável</Link>
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Saúde</p>
              <p className="mt-3 text-2xl font-semibold text-text">{openCount + investigatingCount}</p>
              <p className="mt-1 text-sm text-text-body">Chamados em ação agora.</p>
            </div>
            <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Críticos</p>
              <p className="mt-3 text-2xl font-semibold text-text">{criticalCount}</p>
              <p className="mt-1 text-sm text-text-body">Incidentes sev1 que exigem prioridade.</p>
            </div>
            <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Sem responsável</p>
              <p className="mt-3 text-2xl font-semibold text-text">{unassignedCount}</p>
              <p className="mt-1 text-sm text-text-body">Chamados sem owner definido.</p>
            </div>
            <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Últimos 7 dias</p>
              <p className="mt-3 text-2xl font-semibold text-text">{total7d}</p>
              <p className="mt-1 text-sm text-text-body">Novos incidentes detectados recentemente.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <ContextualJourneyCard
        description="Use os atalhos para investigar causa, impacto e resolução dos chamados."
        links={[
          { description: "Fila operacional para triagem, atribuição e resolução.", href: "/incidents/tickets", label: "Fila de chamados", tone: "accent" },
          { description: "Revisar regras, profiling e ocorrências de qualidade.", href: "/data-quality", label: "Data Quality", tone: "success" },
          { description: "Ver o pipeline, os eventos e o diagnóstico técnico.", href: "/ops/ingestion", label: "Ingestion", tone: "neutral" },
          { description: "Cruzar falhas operacionais e filas prioritárias.", href: "/ops/cockpit", label: "Ops Cockpit", tone: "accent" },
          { description: "Abrir o ativo e revisar ownership e metadados.", href: "/explorer", label: "Explorer", tone: "accent" },
          { description: "Atribuir o responsável certo ao chamado.", href: "/data-owners", label: "Owners", tone: "success" },
          { description: "Ver bloqueios de confiança e prontidão.", href: "/certification", label: "Certificação", tone: "neutral" },
          { description: "Revisar incidentes com dado pessoal ou acesso sensível.", href: "/privacy-access", label: "Privacidade", tone: "accent" },
          { description: "Entender o impacto upstream e downstream.", href: "/lineage", label: "Linhagem", tone: "accent" },
        ]}
        title="Jornadas principais de incidentes"
      />

      <Card className="border-border/80 bg-surface shadow-[0_12px_32px_rgba(15,23,42,0.04)]">
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Saúde da fila</p>
              <h3 className="mt-2 text-lg font-semibold text-text">Resumo operacional dos chamados de dados</h3>
              <p className="mt-1 text-sm text-text-body">Use estes indicadores para entender o estado geral da operação antes de abrir a fila detalhada.</p>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link href="/incidents/tickets">Abrir fila de chamados</Link>
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {queueHealthCards.map((card) => (
              <Link
                className={cn(
                  "group rounded-2xl border p-4 shadow-sm transition hover:-translate-y-[1px] hover:border-info-200 hover:bg-info-50/40",
                  card.tone === "risk"
                    ? "border-danger-200 bg-danger-50/70"
                    : card.tone === "ops"
                      ? "border-info-200 bg-info-50/70"
                      : card.tone === "fresh"
                        ? "border-success-200 bg-success-50/70"
                        : card.tone === "catalog"
                          ? "border-violet-200 bg-violet-50/70"
                          : "border-border bg-surface",
                )}
                href={card.href}
                key={card.title}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-text">{card.title}</p>
                    <p className="mt-2 text-3xl font-semibold tracking-tight text-text">{card.value}</p>
                  </div>
                  <Badge tone={card.tone === "risk" ? "warning" : card.tone === "ops" ? "accent" : card.tone === "fresh" ? "success" : card.tone === "catalog" ? "accent" : "neutral"}>
                    {card.tone === "risk" ? "Crítico" : card.tone === "ops" ? "Atenção" : card.tone === "fresh" ? "Saudável" : card.tone === "catalog" ? "Informativo" : "Neutro"}
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-text-body">{card.hint}</p>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/80 bg-surface shadow-[0_12px_32px_rgba(15,23,42,0.04)]">
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Atenção imediata</p>
              <h3 className="mt-2 text-lg font-semibold text-text">Incidentes que precisam de ação agora</h3>
              <p className="mt-1 text-sm text-text-body">Chamados críticos, vencidos, sem responsável ou reincidentes merecem triagem primeiro.</p>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link href={buildTicketsHref({ severity: ["sev1"] })}>Ver fila crítica</Link>
            </Button>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {attentionCards.map((card) => (
              <Link
                key={card.title}
                href={card.href}
                className={cn(
                  "rounded-2xl border p-4 shadow-sm transition hover:-translate-y-[1px] hover:border-info-200 hover:bg-info-50/40",
                  card.tone === "risk"
                    ? "border-danger-200 bg-danger-50/70"
                    : card.tone === "ops"
                      ? "border-info-200 bg-info-50/70"
                      : "border-violet-200 bg-violet-50/70",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="min-w-0 truncate text-sm font-semibold text-text" title={card.title}>
                    {card.title}
                  </p>
                  <Badge tone={card.tone === "risk" ? "warning" : card.tone === "ops" ? "accent" : "accent"}>{card.value}</Badge>
                </div>
                <p className="mt-2 text-sm text-text-body">{card.hint}</p>
                <p className="mt-2 text-xs text-muted">Impacto: {card.impact}</p>
                <p className="mt-3 text-xs font-medium text-info-700">{card.actionLabel}</p>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/80 bg-surface shadow-[0_12px_32px_rgba(15,23,42,0.04)]">
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Próximas ações recomendadas</p>
              <h3 className="mt-2 text-lg font-semibold text-text">Ações sugeridas para reduzir risco</h3>
              <p className="mt-1 text-sm text-text-body">Selecione uma ação para acelerar triagem, correção ou investigação.</p>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link href="/incidents/tickets">Ver fila</Link>
            </Button>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {recommendedActions.map((action) => (
              <Link
                className={cn(
                  "rounded-2xl border p-4 shadow-sm transition hover:-translate-y-[1px] hover:border-info-200 hover:bg-info-50/40",
                  action.tone === "risk"
                    ? "border-danger-200 bg-danger-50/70"
                    : action.tone === "ops"
                      ? "border-info-200 bg-info-50/70"
                      : "border-violet-200 bg-violet-50/70",
                )}
                href={action.href}
                key={action.title}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="min-w-0 truncate text-sm font-semibold text-text" title={action.title}>
                    {action.title}
                  </p>
                  <Badge tone={action.tone === "risk" ? "warning" : action.tone === "ops" ? "accent" : "accent"}>
                    {action.tone === "risk" ? "Crítico" : action.tone === "ops" ? "Atenção" : action.tone === "catalog" ? "Informativo" : "Neutro"}
                  </Badge>
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-text-body">{action.detail}</p>
                <p className="mt-2 line-clamp-2 text-xs text-muted">Impacto: {action.impact}</p>
                <p className="mt-3 text-xs font-medium text-info-700">{action.label}</p>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="border-border/80 bg-surface shadow-[0_12px_32px_rgba(15,23,42,0.04)]">
          <CardContent className="space-y-4 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Origem dos incidentes</p>
                <h3 className="mt-2 text-lg font-semibold text-text">De onde os chamados estão vindo</h3>
                <p className="mt-1 text-sm text-text-body">A maior parte dos incidentes atuais foi gerada por regras de Data Quality quando a origem DQ domina a janela recente.</p>
              </div>
              <Button asChild size="sm" variant="outline">
                <Link href={buildTicketsHref({ source_type: "dq_rule" })}>Ver Data Quality</Link>
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {originCounts.map((origin) => (
                <Link
                  className="rounded-2xl border border-border bg-bg-subtle/80 p-4 transition hover:-translate-y-[1px] hover:border-info-200 hover:bg-info-50/40"
                  href={buildTicketsHref(origin.value ? { source_type: origin.value } : {})}
                  key={origin.value || "all"}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-text">{origin.label}</p>
                      <p className="mt-2 text-2xl font-semibold text-text">{origin.count}</p>
                    </div>
                    <Badge tone="neutral">
                      {recentIncidents.length ? `${Math.round((origin.count / recentIncidents.length) * 100)}%` : "0%"}
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs text-muted">Abrir fila filtrada por origem</p>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-surface shadow-[0_12px_32px_rgba(15,23,42,0.04)]">
          <CardContent className="space-y-4 p-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Severidade e status</p>
              <h3 className="mt-2 text-lg font-semibold text-text">Leitura rápida da distribuição</h3>
            </div>
            <div className="space-y-3">
              <div className="rounded-2xl border border-border bg-bg-subtle/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Severidade</p>
                <div className="mt-3 space-y-2 text-sm text-text-body">
                  <div className="flex items-center justify-between"><span>Crítico</span><span className="font-medium text-text">{criticalCount}</span></div>
                  <div className="flex items-center justify-between"><span>Alto</span><span className="font-medium text-text">{highCount}</span></div>
                  <div className="flex items-center justify-between"><span>Médio</span><span className="font-medium text-text">{mediumCount}</span></div>
                  <div className="flex items-center justify-between"><span>Baixo</span><span className="font-medium text-text">{lowCount}</span></div>
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-bg-subtle/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Status</p>
                <div className="mt-3 space-y-2 text-sm text-text-body">
                  <div className="flex items-center justify-between"><span>Aberto</span><span className="font-medium text-text">{openCount}</span></div>
                  <div className="flex items-center justify-between"><span>Investigando</span><span className="font-medium text-text">{investigatingCount}</span></div>
                  <div className="flex items-center justify-between"><span>Mitigado</span><span className="font-medium text-text">{mitigatedCount}</span></div>
                  <div className="flex items-center justify-between"><span>Resolvido</span><span className="font-medium text-text">{resolvedCount}</span></div>
                  <div className="flex items-center justify-between"><span>Fechado</span><span className="font-medium text-text">{closedCount}</span></div>
                  <div className="flex items-center justify-between"><span>Reaberto</span><span className="font-medium text-text">{reopenedCount}</span></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-border/80 bg-surface shadow-[0_12px_32px_rgba(15,23,42,0.04)]">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-text">Ativos mais impactados</h3>
                <p className="mt-1 text-xs text-muted">Tabelas com maior concentração de chamados.</p>
              </div>
              <ShieldAlert className="h-4 w-4 text-danger-700" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {triageAssets.length ? (
              triageAssets.map((asset) => (
                <div className="rounded-2xl border border-border bg-surface p-4" key={asset.key}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-text">{asset.label}</p>
                      <p className="mt-1 truncate text-xs text-muted">{asset.table_fqn || asset.key}</p>
                    </div>
                    <Badge tone={asset.overdue_count > 0 ? "warning" : "neutral"}>{asset.open_count} chamado(s)</Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge tone="neutral">{asset.domain_name || "Sem domínio"}</Badge>
                    {asset.owner_name ? <Badge tone="accent">{asset.owner_name}</Badge> : null}
                    {asset.signals.slice(0, 2).map((signal) => (
                      <Badge key={signal} tone="warning">
                        {signal}
                      </Badge>
                    ))}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {asset.href ? (
                      <Button asChild size="sm" variant="outline">
                        <Link href={asset.href}>Abrir contexto</Link>
                      </Button>
                    ) : null}
                    <Button asChild size="sm" variant="ghost">
                      <Link href={buildTicketsHref({ tableId: asset.table_id || undefined })}>Abrir fila filtrada</Link>
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState
                title="Ainda não há agregação suficiente por ativo"
                description="Use a fila de chamados para investigar incidentes individualmente."
              />
            )}
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-surface shadow-[0_12px_32px_rgba(15,23,42,0.04)]">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-text">Incidentes recentes</h3>
                <p className="mt-1 text-xs text-muted">Últimos chamados criados ou atualizados.</p>
              </div>
              <Ticket className="h-4 w-4 text-info-700" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentIncidents.length ? (
              recentIncidents.slice(0, 5).map((incident) => {
                const origin = incidentSourceCategory(incident.source_type);
                return (
                  <div className="rounded-2xl border border-border bg-bg-subtle/80 p-4" key={incident.id}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-text">{incident.title}</p>
                        <p className="mt-1 text-xs text-muted">
                          {incident.asset_context?.table_fqn || incident.table_fqn || incident.airflow_dag_id || "Sem ativo relacionado"}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge tone={incident.severity === "sev1" ? "warning" : incident.severity === "sev2" ? "warning" : "neutral"}>
                          {incident.severity_label}
                        </Badge>
                        <Badge tone={incident.status === "open" ? "warning" : incident.status === "investigating" ? "accent" : "neutral"}>
                          {incident.status === "open"
                            ? "Aberto"
                            : incident.status === "investigating"
                              ? "Investigando"
                              : incident.status === "mitigated"
                                ? "Mitigado"
                                : incident.status === "reopened"
                                  ? "Reaberto"
                                  : incident.status === "recurring"
                                    ? "Recorrente"
                                    : incident.status === "resolved"
                                      ? "Resolvido"
                                      : "Fechado"}
                        </Badge>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge tone={origin.value === "dq_rule" ? "accent" : "neutral"}>{origin.label}</Badge>
                      <Badge tone={incident.owner_user_id || incident.owner_team || incident.squad_name || incident.asset_context?.owner_name ? "success" : "warning"}>
                        {incidentOwnerLabel(incident)}
                      </Badge>
                      <Badge tone="neutral">Detectado em {formatDateTime(incident.detected_at)}</Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button asChild size="sm" variant="outline">
                        <Link href={buildTicketsHref({ source_type: origin.value || undefined, tableId: incident.asset_context?.table_id || undefined })}>
                          Ver detalhes
                        </Link>
                      </Button>
                      {incident.asset_context?.links?.explorer ? (
                        <Button asChild size="sm" variant="ghost">
                          <Link href={incident.asset_context.links.explorer}>Abrir ativo</Link>
                        </Button>
                      ) : null}
                    </div>
                  </div>
                );
              })
            ) : (
              <EmptyState title="Nenhum incidente recente" description="Nenhum chamado recente foi encontrado." />
            )}
            <Button asChild size="sm" variant="outline">
              <Link href="/incidents/tickets">Ver todos os chamados</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {centerError ? (
        <Card className="border-warning-200 bg-warning-50/80 shadow-[0_12px_32px_rgba(15,23,42,0.04)]">
          <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-warning-700">A central de triagem não pôde ser carregada</p>
              <p className="text-sm text-warning-700">{centerError}</p>
            </div>
            <Button onClick={() => void reloadSummary()} size="sm" variant="outline">
              Recarregar
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {centerSummary ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {centerSummary.metrics.map((metric) => (
              <Card className="border-border/80 shadow-[0_12px_32px_rgba(15,23,42,0.04)]" key={metric.key}>
                <CardContent className="space-y-3 bg-gradient-to-br from-white via-slate-50 to-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-text-body">{metric.label}</p>
                      <p className="mt-2 text-3xl font-semibold tracking-tight text-text">
                        {Number.isInteger(metric.value) ? metric.value.toFixed(0) : metric.value.toFixed(1)}
                        {metric.unit ? <span className="ml-1 text-base font-medium text-muted">{metric.unit}</span> : null}
                      </p>
                    </div>
                    <div className={cn("flex h-10 w-10 items-center justify-center rounded-2xl", metric.tone === "danger" ? "bg-danger-100 text-danger-700" : metric.tone === "warning" ? "bg-warning-100 text-warning-700" : metric.tone === "success" ? "bg-success-100 text-success-700" : "bg-bg-subtle text-text-body")}>
                      <Ticket className="h-4 w-4" />
                    </div>
                  </div>
                  {metric.detail ? <p className="text-sm text-text-body">{metric.detail}</p> : null}
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <Card className="border-border/80 shadow-[0_12px_32px_rgba(15,23,42,0.04)]">
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-text">Filas prioritárias</h3>
                    <p className="mt-1 text-xs text-muted">Atalhos para os cortes de investigação mais usados pela operação.</p>
                  </div>
                  <Ticket className="h-4 w-4 text-info-700" />
                </div>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                {triageQueues.map((queue) => (
                  <Link
                    className="flex items-center justify-between rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-text-body transition hover:border-info-200 hover:bg-info-50/40"
                    href={queue.href || "/incidents/tickets"}
                    key={queue.key}
                  >
                    <span className="min-w-0">
                      <span className="block font-medium text-text">{queue.label}</span>
                      {queue.description ? <span className="mt-0.5 block text-xs text-muted">{queue.description}</span> : null}
                    </span>
                    <span className="ml-3 rounded-full bg-bg-subtle px-2.5 py-1 text-xs font-semibold text-text-body">{queue.count}</span>
                  </Link>
                ))}
              </CardContent>
            </Card>

            <Card className="border-border/80 shadow-[0_12px_32px_rgba(15,23,42,0.04)]">
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-text">Ativos mais impactados</h3>
                    <p className="mt-1 text-xs text-muted">Priorize os itens com recorrência, severidade e SLA comprometido.</p>
                  </div>
                  <ShieldAlert className="h-4 w-4 text-danger-700" />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {triageAssets.length ? (
                  triageAssets.map((asset) => (
                    <div className="rounded-2xl border border-border bg-surface p-4" key={asset.key}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-text">{asset.label}</p>
                          <p className="mt-1 truncate text-xs text-muted">{asset.table_fqn || asset.key}</p>
                        </div>
                        <Badge tone={asset.overdue_count > 0 ? "warning" : "neutral"}>{asset.open_count} ativo(s)</Badge>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge tone="neutral">{asset.domain_name || "Sem domínio"}</Badge>
                        {asset.owner_name ? <Badge tone="accent">{asset.owner_name}</Badge> : null}
                        {asset.signals.slice(0, 2).map((signal) => (
                          <Badge key={signal} tone="warning">
                            {signal}
                          </Badge>
                        ))}
                      </div>
                      {asset.href ? (
                        <div className="mt-3">
                          <Button asChild size="sm" variant="outline">
                            <Link href={asset.href}>Abrir contexto</Link>
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted">Nenhum ativo priorizado na janela atual.</p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="border-border/80 shadow-[0_12px_32px_rgba(15,23,42,0.04)]">
              <CardHeader>
                <h3 className="text-sm font-semibold text-text">Por domínio</h3>
                <p className="mt-1 text-xs text-muted">Separação por contexto de negócio.</p>
              </CardHeader>
              <CardContent className="space-y-2">
                {(centerSummary.by_domain || []).length ? centerSummary.by_domain.map((queue) => (
                  <Link key={queue.key} href={queue.href || "/incidents/tickets"} className="flex items-center justify-between rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-text-body transition hover:border-info-200 hover:bg-info-50/40">
                    <span className="min-w-0 truncate font-medium text-text">{queue.label}</span>
                    <Badge tone="neutral">{queue.count}</Badge>
                  </Link>
                )) : <p className="text-sm text-muted">Sem filas por domínio.</p>}
              </CardContent>
            </Card>
            <Card className="border-border/80 shadow-[0_12px_32px_rgba(15,23,42,0.04)]">
              <CardHeader>
                <h3 className="text-sm font-semibold text-text">Por responsável</h3>
                <p className="mt-1 text-xs text-muted">Fila do owner ou squad associado.</p>
              </CardHeader>
              <CardContent className="space-y-2">
                {(centerSummary.by_owner || []).length ? centerSummary.by_owner.map((queue) => (
                  <Link key={queue.key} href={queue.href || "/incidents/tickets"} className="flex items-center justify-between rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-text-body transition hover:border-info-200 hover:bg-info-50/40">
                    <span className="min-w-0 truncate font-medium text-text">{queue.label}</span>
                    <Badge tone={queue.tone === "warning" ? "warning" : "neutral"}>{queue.count}</Badge>
                  </Link>
                )) : <p className="text-sm text-muted">Sem filas por responsável.</p>}
              </CardContent>
            </Card>
            <Card className="border-border/80 shadow-[0_12px_32px_rgba(15,23,42,0.04)]">
              <CardHeader>
                <h3 className="text-sm font-semibold text-text">SLA operacional</h3>
                <p className="mt-1 text-xs text-muted">Casos dentro, perto ou fora do prazo.</p>
              </CardHeader>
              <CardContent className="space-y-2">
                {(centerSummary.by_sla || []).length ? centerSummary.by_sla.map((queue) => (
                  <Link key={queue.key} href={queue.href || "/incidents/tickets"} className="flex items-center justify-between rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-text-body transition hover:border-info-200 hover:bg-info-50/40">
                    <span className="min-w-0 truncate font-medium text-text">{queue.label}</span>
                    <Badge tone={queue.tone === "danger" ? "warning" : queue.tone === "success" ? "success" : "neutral"}>{queue.count}</Badge>
                  </Link>
                )) : <p className="text-sm text-muted">Sem distribuição de SLA na janela.</p>}
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}

      {loadError ? (
        <Card className="border-danger-200 bg-danger-50/80 shadow-[0_12px_32px_rgba(15,23,42,0.04)]">
          <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-danger-700">Não foi possível carregar o resumo de incidentes</p>
              <p className="text-sm text-danger-700">{loadError}</p>
            </div>
            <Button onClick={() => void reloadSummary()} size="sm" variant="outline">
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      ) : error ? (
        <p className="text-sm text-danger-700">{error}</p>
      ) : null}

      {loading ? (
        <div className="grid gap-4 xl:grid-cols-3">
          <Skeleton className="h-44 w-full" />
          <Skeleton className="h-44 w-full" />
          <Skeleton className="h-44 w-full" />
        </div>
      ) : loadError ? null : !summary ? (
        <EmptyState title="Sem dados de incidentes" description="Não foi possível carregar o resumo de incidentes." />
      ) : (
        <>
          <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
            <Card className="border-border/80 shadow-[0_12px_32px_rgba(15,23,42,0.04)]">
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-text">Incidentes detectados por dia</h3>
                    <p className="mt-1 text-xs text-muted">Histórico dos últimos 30 dias para leitura rápida do volume operacional.</p>
                  </div>
                  <Clock3 className="h-4 w-4 text-info-700" />
                </div>
              </CardHeader>
              <CardContent className="h-64">
                <MiniLineChart color={TONES.ops.spark} data={detectedSeries} />
              </CardContent>
            </Card>

            <Card className="border-border/80 shadow-[0_12px_32px_rgba(15,23,42,0.04)]">
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-text">Distribuição por status</h3>
                    <p className="mt-1 text-xs text-muted">Onde o fluxo operacional está concentrado agora.</p>
                  </div>
                  <AlertTriangle className="h-4 w-4 text-violet-700" />
                </div>
              </CardHeader>
              <CardContent>
                <HorizontalBars colorClassName="bg-violet-500" data={statusSeries} />
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <Card className="border-border/80 shadow-[0_12px_32px_rgba(15,23,42,0.04)]">
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-text">Severidade</h3>
                    <p className="mt-1 text-xs text-muted">Leitura rápida da distribuição de criticidade.</p>
                  </div>
                  <ShieldAlert className="h-4 w-4 text-danger-700" />
                </div>
              </CardHeader>
              <CardContent>
                <HorizontalBars colorClassName="bg-danger-500" data={severitySeries} />
              </CardContent>
            </Card>

            <Card className="border-border/80 shadow-[0_12px_32px_rgba(15,23,42,0.04)]">
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-text">Como ir para a fila detalhada</h3>
                    <p className="mt-1 text-xs text-muted">Use estes atalhos para investigar, atribuir e resolver chamados sem sair do contexto.</p>
                  </div>
                  <Ticket className="h-4 w-4 text-text-body" />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-2xl border border-border bg-bg-subtle/70 p-4 text-sm text-text-body">
                  Abra a fila detalhada para investigar, atribuir, mitigar e resolver. Os filtros da fila já permitem recortar por severidade, responsável, SLA e origem.
                </div>
                <div className="space-y-2">
                  <Link className="flex items-center justify-between rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-text-body transition hover:border-info-200 hover:bg-info-50/40" href="/incidents/tickets">
                    <span>Abrir fila de chamados</span>
                    <ArrowRight className="h-4 w-4 text-muted" />
                  </Link>
                  <Link className="flex items-center justify-between rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-text-body transition hover:border-info-200 hover:bg-info-50/40" href="/incidents/tickets?create=1">
                    <span>Criar chamado manualmente</span>
                    <ArrowRight className="h-4 w-4 text-muted" />
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
