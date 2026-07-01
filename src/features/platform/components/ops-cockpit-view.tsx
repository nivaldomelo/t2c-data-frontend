import { Link } from "@/lib/next-shims";
import { useMemo, useState } from "react";
import { Activity, AlertTriangle, RefreshCw, Search, Shield, Sparkles, Workflow } from "lucide-react";

import { AssetCorrelationCard } from "@/components/asset-correlation-card";
import { Badge } from "@/components/ui/badge";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime } from "@/features/dashboard/components/shared";
import type { TableCorrelationSummary } from "@/features/explorer/types";
import { formatCompactNumber } from "@/features/explorer/utils";
import { OpsJobsOverview, getJobDiagnostic } from "@/features/platform/components/ops-jobs-overview";
import type {
  PlatformCockpitRecommendedAction,
  PlatformCockpitSummary,
  PlatformIntegrationSyncJob,
  PlatformJobsHistoryResponse,
  PlatformJobsStatus,
} from "@/features/platform/types";

type Props = {
  correlationSummary: TableCorrelationSummary | null;
  correlationLoading: boolean;
  correlationError: string;
  summary: PlatformCockpitSummary | null;
  recommendedActions: PlatformCockpitRecommendedAction[] | null;
  jobsStatus: PlatformJobsStatus | null;
  jobsHistory: PlatformJobsHistoryResponse | null;
  jobsLoading: boolean;
  jobsError: string;
  loading: boolean;
  error: string;
  refreshing: boolean;
  canExportOperation: boolean;
  acting: string | null;
  onRefreshReadModels: () => void;
  onRefreshJobs: () => void;
  onExportOperation: () => void;
  onReprocessScan: (datasourceId: number) => void;
  onRerunProfiling: (tableId: number) => void;
  onOpenIncident: (tableId: number) => void;
  onAutoOpenIncident: (tableId: number) => void;
};

function sectionCardClassName() {
  return "border-border/80 bg-surface shadow-card";
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function metricLabel(label: string) {
  const map: Record<string, string> = {
    sem_pipeline_mapeado: "Ativos sem pipeline mapeado",
    pipeline_degradado: "Pipelines degradados",
    falha_operacional: "Falhas operacionais",
    falha_operacional_alto_consumo: "Falha operacional com alto consumo",
    falha_dq_incidente: "Falha + DQ + incidente",
    criticos_sem_sucesso_recente: "Ativos críticos sem sucesso recente",
    critical_without_owner: "Ativos críticos sem responsável",
    sensitive_without_classification: "Sensíveis sem classificação",
    overdue_reviews: "Revisões vencidas",
    datasources_total: "Fontes de dados",
    inactive_datasources: "Fontes inativas",
    critical_incidents: "Incidentes críticos",
    scan_failures_last_24h: "Falhas de scan nas últimas 24h",
    dq_failures_last_24h: "Falhas de DQ nas últimas 24h",
  };
  return map[label] || label.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function runtimeLabel(label: string) {
  const map: Record<string, string> = {
    uptime_seconds: "Uptime",
    in_flight_requests: "Em voo",
    total_requests: "Total de requisições",
    client_error_requests: "Erros 4xx",
    server_error_requests: "Erros 5xx",
    avg_duration_ms: "Média de resposta",
    p95_duration_ms: "P95 de resposta",
    methods: "Methods",
    status_families: "Status Families",
  };
  return map[label] || metricLabel(label);
}

function labelForSource(source?: string | null): string {
  const normalized = (source || "").toLowerCase();
  if (normalized === "s3") return "Data Lake";
  if (normalized === "metabase") return "Metabase";
  if (normalized === "dq") return "Data Quality";
  if (normalized === "datasource") return "Datasource";
  return normalized || "Integração";
}

function labelForJobType(jobType?: string | null): string {
  const normalized = (jobType || "").toLowerCase();
  const map: Record<string, string> = {
    inventory_scan: "Scan do Data Lake",
    data_lake_scan: "Scan do Data Lake",
    scan: "Scan",
    sync: "Sincronização",
    rules_scheduler: "Scheduler de regras",
    profiling_scheduler: "Scheduler de profiling",
    datasource_scan: "Scan de datasource",
    scheduler: "Scheduler",
    rules: "Regras",
    profiling: "Profiling",
  };
  return map[normalized] || normalized.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function jobTitle(job: PlatformIntegrationSyncJob): string {
  return `${labelForSource(job.source)} · ${labelForJobType(job.job_type)}`;
}

function formatRuntimeValue(value: unknown): string {
  if (value == null) return "-";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return "-";
    return Number.isInteger(value) ? value.toLocaleString("pt-BR") : value.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
  }
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (typeof value === "string") return value;
  return "";
}

function formatRuntimeEntryKey(key: string) {
  return runtimeLabel(key);
}

function formatDurationSeconds(seconds: number) {
  if (!Number.isFinite(seconds)) return "-";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} min`;
  return `${(seconds / 3600).toFixed(seconds >= 86400 ? 1 : 2)} h`;
}

type SeverityTone = "danger" | "warning" | "neutral" | "success";

function severityLabel(tone: SeverityTone) {
  return tone === "danger" ? "Crítico" : tone === "warning" ? "Atenção" : tone === "success" ? "Saudável" : "Informativo";
}

function queueCategoryForKey(key: string) {
  const map: Record<string, string> = {
    pipeline_degradado: "Operação",
    falha_operacional: "Operação",
    falha_operacional_alto_consumo: "Operação",
    criticos_sem_sucesso_recente: "Operação",
    critical_without_owner: "Governança",
    sem_pipeline_mapeado: "Mapeamento",
    sensitive_without_classification: "Privacidade",
    overdue_reviews: "Privacidade",
    falha_dq_incidente: "Qualidade",
  };
  return map[key] || "Operação";
}

function queueCategoryOrder(category: string) {
  const order = {
    Operação: 0,
    Governança: 1,
    Privacidade: 2,
    Qualidade: 3,
    Incidentes: 4,
    Mapeamento: 5,
  } as const;
  return order[category as keyof typeof order] ?? 99;
}

function queueSeverityTone(key: string): SeverityTone {
  if (key.includes("falha")) return "danger";
  if (key.includes("degradado") || key.includes("overdue") || key.includes("critical")) return "warning";
  return "neutral";
}

function queueSummaryDescription(key: string, count: number) {
  const map: Record<string, string> = {
    pipeline_degradado: "Pipelines com degradação operacional.",
    falha_operacional: "Falhas ativas que pedem triagem.",
    falha_operacional_alto_consumo: "Falhas com maior consumo recente.",
    criticos_sem_sucesso_recente: "Ativos críticos sem sucesso recente.",
    critical_without_owner: "Ativos críticos sem responsável definido.",
    sem_pipeline_mapeado: "Ativos ainda sem pipeline operacional.",
    sensitive_without_classification: "Ativos sensíveis sem classificação.",
    overdue_reviews: "Revisões vencidas ou atrasadas.",
    falha_dq_incidente: "Ocorrências que cruzam DQ e incidente.",
  };
  return `${map[key] || "Itens com atenção operacional."} ${count > 1 ? "Use a lista para priorizar." : "Use a lista para priorizar."}`;
}

function ingestionStatusTone(item: { latest_status_label?: string | null; last_status?: string | null; last_error?: string | null; observacao?: string | null }): SeverityTone {
  const status = (item.latest_status_label || item.last_status || "").toLowerCase();
  if (status.includes("falha") || status.includes("error") || item.last_error || item.observacao) return "danger";
  if (status.includes("degrad") || status.includes("warning")) return "warning";
  if (status.includes("sucesso")) return "success";
  return "neutral";
}

function ingestionStatusLabel(item: { latest_status_label?: string | null; last_status?: string | null; last_error?: string | null; observacao?: string | null }) {
  const tone = ingestionStatusTone(item);
  if (tone === "danger") return "Falha operacional ativa";
  if (tone === "warning") return "Sem sucesso recente";
  if (tone === "success") return "Pipeline saudável";
  return "Diagnóstico disponível";
}

function runtimeGroupForKey(key: string) {
  const map: Record<string, "volume" | "latency" | "errors" | "distribution"> = {
    uptime_seconds: "volume",
    total_requests: "volume",
    in_flight_requests: "volume",
    avg_duration_ms: "latency",
    p95_duration_ms: "latency",
    client_error_requests: "errors",
    server_error_requests: "errors",
    methods: "distribution",
    status_families: "distribution",
  };
  return map[key] || "volume";
}

export function OpsCockpitView({
  correlationSummary,
  correlationLoading,
  correlationError,
  summary,
  recommendedActions,
  jobsStatus,
  jobsHistory,
  jobsLoading,
  jobsError,
  loading,
  error,
  refreshing,
  canExportOperation,
  acting,
  onRefreshReadModels,
  onRefreshJobs,
  onExportOperation,
  onReprocessScan,
  onRerunProfiling,
  onOpenIncident,
  onAutoOpenIncident,
}: Props) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    ingestion: false,
    failures: false,
    adoption: false,
    queues: false,
  });
  const [activeQueueCategory, setActiveQueueCategory] = useState("Operação");
  const [showAllAdoption, setShowAllAdoption] = useState(false);
  const [ingestionFilter, setIngestionFilter] = useState<"all" | "failure" | "degraded" | "success" | "unmapped" | "stale">("all");
  const [showAllRecommended, setShowAllRecommended] = useState(false);

  const queues = Object.entries(summary?.queues ?? {});
  const failureGroups = Object.entries(summary?.recent_failures ?? {});
  const runtimeEntries = Object.entries(summary?.runtime ?? {});
  const jobs = jobsStatus?.items ?? [];
  const jobsBySeverity = useMemo(() => {
    return jobs
      .map((job) => ({ job, diagnostic: getJobDiagnostic(job) }))
      .sort((left, right) => {
        const severityRank = { danger: 3, warning: 2, neutral: 1, success: 0 } as const;
        const leftRank = severityRank[left.diagnostic.tone];
        const rightRank = severityRank[right.diagnostic.tone];
        if (leftRank !== rightRank) return rightRank - leftRank;
        return new Date(right.job.started_at).getTime() - new Date(left.job.started_at).getTime();
      });
  }, [jobs]);
  const attentionState = useMemo(() => {
    const stalledJobs = jobsBySeverity.filter((item) => item.diagnostic.stalled).length;
    const attentionJobs = jobsBySeverity.filter((item) => item.diagnostic.tone === "warning").length;
    const hasCriticalFailingQueues = (summary?.queues?.falha_operacional?.length ?? 0) > 0 || (summary?.queues?.falha_operacional_alto_consumo?.length ?? 0) > 0;
    const hasCriticalOperationalSignals =
      stalledJobs > 0 ||
      (summary?.health?.critical_incidents ?? 0) > 0 ||
      (summary?.ingestion?.failed ?? 0) > 0 ||
      (summary?.ingestion?.critical_stale ?? 0) > 0 ||
      hasCriticalFailingQueues;
    const hasAttentionSignals =
      hasCriticalOperationalSignals ||
      attentionJobs > 0 ||
      (summary?.ingestion?.degraded ?? 0) > 0 ||
      (summary?.ingestion?.unmapped ?? 0) > 0 ||
      (summary?.ingestion?.stale ?? 0) > 0 ||
      (summary?.analytics?.legacy_api_hits ?? 0) > 0;
    if (hasCriticalOperationalSignals) return { tone: "danger" as const, label: "Crítico" };
    if (hasAttentionSignals) return { tone: "warning" as const, label: "Atenção" };
    return { tone: "success" as const, label: "Saudável" };
  }, [jobsBySeverity, summary]);
  const attentionCards = useMemo(() => {
    return [
      {
        key: "jobs-travados",
        title: "Jobs travados",
        value: jobsBySeverity.filter((item) => item.diagnostic.stalled).length,
        tone: "danger" as const,
        description: "Execuções permanecem como running além do tempo esperado.",
        impact: "Pode indicar lock preso, scheduler parado ou execução sem encerramento.",
        action: "Revisar jobs",
      },
      {
        key: "falhas-ativas",
        title: "Falhas operacionais ativas",
        value: (summary?.queues?.falha_operacional?.length ?? 0) + (summary?.queues?.falha_operacional_alto_consumo?.length ?? 0) + (summary?.queues?.falha_dq_incidente?.length ?? 0),
        tone: "danger" as const,
        description: "Falhas ativas nos pipelines monitorados.",
        impact: "Podem interromper atualização de dados e abrir caminho para incidentes.",
        action: "Abrir incidente",
      },
      {
        key: "pipelines-degradados",
        title: "Pipelines degradados",
        value: summary?.ingestion?.degraded ?? 0,
        tone: "warning" as const,
        description: "Pipelines com degradação operacional no recorte atual.",
        impact: "Aumenta risco de atraso e de sucesso instável.",
        action: "Ver degradação",
      },
      {
        key: "execucao-atrasada",
        title: "Próximas execuções atrasadas",
        value: summary?.ingestion?.critical_stale ?? 0,
        tone: "danger" as const,
        description: "Execuções previstas já passaram do horário esperado.",
        impact: "Pode indicar scheduler desatualizado ou janela vencida.",
        action: "Revisar agenda",
      },
      {
        key: "ativos-sem-pipeline",
        title: "Ativos sem pipeline",
        value: summary?.ingestion?.unmapped ?? 0,
        tone: "warning" as const,
        description: "Ativos do catálogo ainda sem mapeamento operacional.",
        impact: "Reduz rastreabilidade e dificulta análise operacional.",
        action: "Mapear pipeline",
      },
      {
        key: "incidentes-criticos",
        title: "Incidentes críticos",
        value: summary?.health?.critical_incidents ?? 0,
        tone: "danger" as const,
        description: "Incidentes abertos com severidade crítica.",
        impact: "Exige triagem imediata para limitar impacto ao negócio.",
        action: "Triar incidentes",
      },
      {
        key: "sem-sucesso",
        title: "Sem sucesso recente",
        value: summary?.ingestion?.stale ?? 0,
        tone: "warning" as const,
        description: "Pipelines sem execução bem-sucedida na janela operacional.",
        impact: "Pode esconder degradação ou falha silenciosa.",
        action: "Ver últimos sucessos",
      },
      {
        key: "api-legada",
        title: "API legada ativa",
        value: summary?.analytics?.legacy_api_hits ?? 0,
        tone: (summary?.analytics?.legacy_api_hits ?? 0) > 0 ? ("warning" as const) : ("success" as const),
        description: "Chamadas remanescentes em rotas antigas.",
        impact: "Mantém superfície antiga em uso e adia desligamento seguro.",
        action: "Revisar legado",
      },
    ];
  }, [jobsBySeverity, summary]);
  const fallbackRecommendedActions = useMemo(() => {
    const actions: Array<{
      title: string;
      tone: SeverityTone;
      reason: string;
      impact: string;
      primaryLabel: string;
      primaryHref?: string;
      secondaryLabel?: string;
      secondaryHref?: string;
    }> = [];
    const firstStalled = jobsBySeverity.find((item) => item.diagnostic.stalled);
    if (firstStalled) {
      actions.push({
        title: "Revisar job travado",
        tone: "danger",
        reason: `${jobTitle(firstStalled.job)} está ${firstStalled.diagnostic.ageLabel || "em execução prolongada"}.`,
        impact: "Pode manter dados sem atualização e bloquear próximas execuções.",
        primaryLabel: "Ver jobs",
        primaryHref: "/ops/cockpit",
      });
    }
    const firstFailedQueue = (summary?.queues?.falha_operacional ?? [])[0] || (summary?.queues?.falha_operacional_alto_consumo ?? [])[0];
    if (firstFailedQueue) {
      actions.push({
        title: `Corrigir pipeline ${firstFailedQueue.table_name}`,
        tone: "danger",
        reason: firstFailedQueue.hint || `${firstFailedQueue.table_name} precisa de leitura técnica e possível reprocessamento.`,
        impact: "Pipeline sem último sucesso disponível e ativo priorizado na correlação operacional.",
        primaryLabel: "Ver histórico operacional",
        primaryHref: firstFailedQueue.pipeline_history_href || firstFailedQueue.target_url || undefined,
        secondaryLabel: "Abrir incidente",
        secondaryHref: firstFailedQueue.target_url || undefined,
      });
    }
    if ((summary?.ingestion?.unmapped ?? 0) > 0) {
      actions.push({
        title: "Mapear ativos sem pipeline",
        tone: "warning",
        reason: "Há ativos sem pipeline mapeado que merecem priorização.",
        impact: "Aumenta lacuna entre catálogo e operação monitorada.",
        primaryLabel: "Ver mapeamento",
        primaryHref: "/explorer",
      });
    }
    if ((summary?.analytics?.legacy_api_hits ?? 0) > 0) {
      actions.push({
        title: "Planejar corte do legado",
        tone: "warning",
        reason: "A API legada ainda recebe chamadas e deve ser tratada antes do desligamento.",
        impact: "Ainda existe tráfego em rotas antigas, especialmente em módulos remanescentes.",
        primaryLabel: "Ver legado",
        primaryHref: "/admin/governance",
      });
    }
    if ((summary?.ingestion?.critical_stale ?? 0) > 0) {
      actions.push({
        title: "Corrigir execução atrasada",
        tone: "danger",
        reason: "Há pipelines críticos com janela vencida ou sem sucesso recente.",
        impact: "Pode esconder scheduler atrasado, lock preso ou falha silenciosa.",
        primaryLabel: "Ver ingestão",
        primaryHref: "/ops/cockpit",
      });
    }
    return actions;
  }, [jobsBySeverity, summary]);
  const resolvedRecommendedActions = useMemo(() => {
    if (recommendedActions && recommendedActions.length > 0) {
      return recommendedActions.map((action) => ({
        title: action.title,
        tone: action.severity === "critical" ? ("danger" as const) : action.severity === "warning" ? ("warning" as const) : ("neutral" as const),
        reason: action.reason,
        impact: action.impact,
        primaryLabel: action.primary_action_label,
        primaryHref: action.suggested_route || undefined,
        secondaryLabel: action.secondary_action_label || undefined,
        secondaryHref: action.suggested_route || undefined,
      }));
    }
    return fallbackRecommendedActions;
  }, [fallbackRecommendedActions, recommendedActions]);
  const queueSections = useMemo(() => {
    const grouped = new Map<string, Array<[string, (typeof queues)[number][1]]>>();
    queues.forEach(([key, items]) => {
      const group = queueCategoryForKey(key);
      const existing = grouped.get(group) || [];
      existing.push([key, items]);
      grouped.set(group, existing);
    });
    return Array.from(grouped.entries())
      .map(([group, items]) => ({
        group,
        items: items.sort((left, right) => queueCategoryOrder(left[0]) - queueCategoryOrder(right[0])),
        count: items.reduce((acc, [, list]) => acc + list.length, 0),
        severity: items.reduce<SeverityTone>((current, [key]) => {
          const tone = queueSeverityTone(key);
          if (tone === "danger") return "danger";
          if (tone === "warning" && current !== "danger") return "warning";
          if (tone === "success" && current === "neutral") return "success";
          return current;
        }, "neutral"),
      }))
      .sort((left, right) => queueCategoryOrder(left.group) - queueCategoryOrder(right.group));
  }, [queues]);
  const queueCategories = ["Operação", "Governança", "Privacidade", "Qualidade", "Incidentes", "Mapeamento"] as const;
  const visibleQueueSections = useMemo(
    () => queueSections.filter((section) => section.group === activeQueueCategory),
    [activeQueueCategory, queueSections],
  );
  const visibleFailures = useMemo(
    () => (expandedSections.failures ? failureGroups : failureGroups.slice(0, 3)),
    [expandedSections.failures, failureGroups],
  );
  const filteredIngestionItems = useMemo(() => {
    const items = summary?.ingestion?.items ?? [];
    const filtered = items.filter((item) => {
      const tone = ingestionStatusTone(item);
      if (ingestionFilter === "failure") return tone === "danger";
      if (ingestionFilter === "degraded") return tone === "warning";
      if (ingestionFilter === "success") return tone === "success";
      if (ingestionFilter === "stale") return (item.latest_status_label || item.last_status || "").toLowerCase().includes("sucesso") ? false : tone !== "danger";
      return true;
    });
    const rank = (item: (typeof items)[number]) => {
      const tone = ingestionStatusTone(item);
      if (tone === "danger") return 0;
      if (tone === "warning") return 1;
      if (ingestionFilter === "stale") return 2;
      if (tone === "neutral") return 3;
      return 4;
    };
    return filtered.sort((left, right) => rank(left) - rank(right)).slice(0, expandedSections.ingestion ? filtered.length : 10);
    }, [expandedSections.ingestion, ingestionFilter, summary?.ingestion?.items]);
  const runtimeByGroup = useMemo(() => {
    const grouped: Record<"volume" | "latency" | "errors" | "distribution", Array<[string, unknown]>> = {
      volume: [],
      latency: [],
      errors: [],
      distribution: [],
    };
    runtimeEntries.forEach(([key, value]) => {
      grouped[runtimeGroupForKey(key)].push([key, value]);
    });
    return grouped;
  }, [runtimeEntries]);
  const adoptionMetrics = [
    ["Buscas", summary?.analytics?.search_queries ?? 0, "Consultas registradas na janela atual."],
    [
      "Conversão busca → ativo",
      `${(summary?.analytics?.search_to_asset_conversion_pct ?? 0).toFixed(1)}%`,
      "Clique real em resultado após busca. Pode ultrapassar 100% quando uma busca gera múltiplos acessos.",
    ],
    ["Ações de dashboard", summary?.analytics?.dashboard_to_action_count ?? 0, "Interações operacionais vindas do recorte executivo."],
    ["Campanhas com avanço", summary?.analytics?.campaign_to_update_count ?? 0, "Ações de saneamento registradas nas campanhas."],
    ["Explorer", summary?.analytics?.explorer_page_views ?? 0, "Page views reais do Explorer."],
    ["Incidentes", summary?.analytics?.incidents_page_views ?? 0, "Acessos ao módulo de tickets."],
    ["Certificação", summary?.analytics?.certification_page_views ?? 0, "Acessos ao fluxo de certificação."],
    ["Privacidade", summary?.analytics?.privacy_page_views ?? 0, "Acessos ao módulo de privacidade e acesso."],
    ["API legada", summary?.analytics?.legacy_api_hits ?? 0, "Chamadas reais ainda feitas em /api legado na janela atual."],
  ] as const;
  const visibleAdoptionMetrics = showAllAdoption ? adoptionMetrics : adoptionMetrics.slice(0, 5);
  const visibleRecommendedActions = showAllRecommended
    ? resolvedRecommendedActions
    : resolvedRecommendedActions.slice(0, 5);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton className="h-28 w-full" key={index} />
          ))}
        </div>
        <div className="grid gap-6 xl:grid-cols-2">
          <Skeleton className="h-[360px] w-full" />
          <Skeleton className="h-[360px] w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return <EmptyState title="Não foi possível carregar o cockpit" description={error} />;
  }

  if (!summary) {
    return <EmptyState title="Cockpit indisponível" description="Nenhum dado operacional foi retornado pela plataforma." />;
  }

  const cockpitSummary = summary;
  const healthItems = Object.entries(cockpitSummary.health);
  const visibleTopModules = showAllAdoption ? cockpitSummary.analytics.top_modules : cockpitSummary.analytics.top_modules.slice(0, 5);
  const visibleTopEvents = showAllAdoption ? cockpitSummary.analytics.top_events : cockpitSummary.analytics.top_events.slice(0, 5);
  const visibleTopLegacyModules = showAllAdoption ? cockpitSummary.analytics.top_legacy_modules : cockpitSummary.analytics.top_legacy_modules.slice(0, 5);
  const visibleTopAssets = showAllAdoption ? cockpitSummary.analytics.top_assets : cockpitSummary.analytics.top_assets.slice(0, 5);
  const toggleSection = (key: string) => {
    setExpandedSections((current) => ({ ...current, [key]: !current[key] }));
  };
  return (
    <div className="space-y-6 pb-6">
      <Card className="border-border/80 bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_55%,#eef6ff_100%)] shadow-card">
        <CardContent className="space-y-5 p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-surface px-3 py-1 text-xs font-medium text-brand-700">
                <Activity className="h-3.5 w-3.5" />
                Cockpit operacional da plataforma
              </div>
              <div>
                <h2 className="text-3xl font-semibold tracking-tight text-text">Cockpit Operacional</h2>
                <p className="mt-2 max-w-4xl text-sm leading-7 text-text-body">
                  Monitoramento de pipelines, jobs, falhas, filas críticas e sinais de operação da plataforma.
                </p>
                <p className="mt-2 max-w-4xl text-sm leading-7 text-text-body">
                  Use esta tela para identificar o que aconteceu, qual o impacto e qual a próxima ação operacional.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={attentionState.tone}>Status geral: {attentionState.label}</Badge>
              <Badge tone="neutral">Atualizado em {formatDateTime(cockpitSummary.generated_at)}</Badge>
              <Button onClick={onRefreshJobs} size="sm" variant="ghost">
                <RefreshCw className="mr-2 h-4 w-4" />
                Atualizar cockpit
              </Button>
              <Button onClick={onRefreshReadModels} size="sm" variant="outline">
                <RefreshCw className="mr-2 h-4 w-4" />
                {refreshing ? "Atualizando..." : "Atualizar read models"}
              </Button>
              {canExportOperation ? (
                <Button onClick={onExportOperation} size="sm" variant="outline">
                  <Sparkles className="mr-2 h-4 w-4" />
                  Exportar operação
                </Button>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className={sectionCardClassName()}>
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Atenção imediata</p>
              <h3 className="mt-2 text-lg font-semibold text-text">Principais sinais que exigem ação operacional</h3>
            </div>
            <p className="max-w-3xl text-sm text-text-body">
              Esta visão prioriza o que está quebrado agora, o que está atrasado e o que pode estar travado. Adoção e runtime ficam abaixo do bloco operacional.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {attentionCards.map((card) => (
              <div
                className={`rounded-2xl border p-4 ${
                  card.tone === "danger"
                    ? "border-danger-200 bg-danger-50"
                    : card.tone === "warning"
                      ? "border-warning-200 bg-warning-50"
                      : "border-border/80 bg-bg-subtle/80"
                }`}
                key={card.key}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-text">{card.title}</p>
                  <Badge tone={card.tone}>{card.value}</Badge>
                </div>
                <p className="mt-2 text-sm text-text-body">{card.description}</p>
                <p className="mt-2 text-xs font-medium text-muted">{card.action}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className={sectionCardClassName()}>
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Próximas ações recomendadas</p>
              <h3 className="mt-2 text-lg font-semibold text-text">O que fazer agora</h3>
            </div>
            <p className="max-w-3xl text-sm text-text-body">
              Sugestões geradas a partir dos sinais operacionais atuais para orientar a próxima intervenção.
            </p>
          </div>
          {visibleRecommendedActions.length ? (
            <div className="space-y-3">
              {visibleRecommendedActions.map((action, index) => (
                <div
                  className={`rounded-2xl border p-4 ${
                    action.tone === "danger"
                      ? "border-danger-200 bg-danger-50"
                      : action.tone === "warning"
                        ? "border-warning-200 bg-warning-50"
                        : "border-border/80 bg-bg-subtle/80"
                  }`}
                  key={`${action.title}-${action.primaryHref || action.secondaryHref || action.reason}-${index}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-text">{action.title}</p>
                        <Badge tone={action.tone}>{severityLabel(action.tone)}</Badge>
                      </div>
                      <p className="text-sm text-text-body">{action.reason}</p>
                      <p className="text-xs text-muted">Impacto: {action.impact}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {action.primaryHref ? (
                        <Button asChild size="sm" variant="outline">
                          <Link href={action.primaryHref}>{action.primaryLabel}</Link>
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline">
                          {action.primaryLabel}
                        </Button>
                      )}
                      {action.secondaryHref && action.secondaryLabel ? (
                        <Button asChild size="sm" variant="ghost">
                          <Link href={action.secondaryHref}>{action.secondaryLabel}</Link>
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
              {resolvedRecommendedActions.length > visibleRecommendedActions.length ? (
                <div className="flex justify-center pt-1">
                  <Button onClick={() => setShowAllRecommended((current) => !current)} size="sm" variant="ghost">
                    {showAllRecommended ? "Mostrar menos ações" : "Ver mais ações"}
                  </Button>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="rounded-2xl border border-success-200 bg-success-50 p-4 text-sm text-success-700">Nenhuma ação adicional recomendada no momento.</div>
          )}
        </CardContent>
      </Card>

      <OpsJobsOverview error={jobsError} jobsHistory={jobsHistory} jobsStatus={jobsStatus} loading={jobsLoading} onRefresh={onRefreshJobs} />

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className={sectionCardClassName()}>
          <CardContent className="space-y-4 p-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Correlação prioritária</p>
              <h3 className="mt-2 text-lg font-semibold text-text">Ativo priorizado por correlação operacional</h3>
            </div>
            {correlationLoading ? <Skeleton className="h-40 w-full" /> : null}
            {!correlationLoading && correlationError ? (
              <Banner
                description={`Não foi possível carregar a correlação prioritária agora. ${correlationError}`}
                icon={<AlertTriangle className="h-4 w-4" />}
                tone="error"
                title="Correlação prioritária indisponível"
              />
            ) : null}
            {!correlationLoading && !correlationError && correlationSummary ? (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Badge tone="accent">{correlationSummary.correlation_type || "Correlação priorizada"}</Badge>
                  <Badge tone={correlationSummary.has_operational_failure || correlationSummary.has_dq_degradation || correlationSummary.has_open_incident ? "warning" : "neutral"}>
                    Prioridade {correlationSummary.priority_score ?? 0}
                  </Badge>
                </div>
                <AssetCorrelationCard
                  autoOpening={acting === `incident-auto-${correlationSummary.table_id}`}
                  onAutoOpenIncident={() => onAutoOpenIncident(correlationSummary.table_id)}
                  summary={correlationSummary}
                  title="Correlação prioritária do cockpit"
                  subtitle={correlationSummary.summary || correlationSummary.signals.summary}
                />
              </div>
            ) : !correlationLoading ? (
              <Banner description="Nenhum ativo com correlação crítica relevante no momento." icon={<Workflow className="h-4 w-4" />} tone="success" title="Sem correlação crítica relevante" />
            ) : null}
          </CardContent>
        </Card>

        <Card className={sectionCardClassName()}>
          <CardContent className="space-y-4 p-5">
            <div className="flex items-center gap-2">
              <Workflow className="h-4 w-4 text-muted" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Ingestão operacional</p>
                <h3 className="mt-1 text-lg font-semibold text-text">Pipelines monitorados pelo catálogo</h3>
              </div>
            </div>
            {!cockpitSummary.ingestion.available ? (
              <Banner
                description={cockpitSummary.ingestion.message || "A camada operacional de ingestão ainda não está disponível neste ambiente."}
                icon={<Workflow className="h-4 w-4" />}
                tone="info"
                title="Camada operacional de ingestão indisponível"
              />
            ) : (
              <div className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {[
                    ["Pipelines", cockpitSummary.ingestion.pipelines_total, "neutral"],
                    ["Sem pipeline", cockpitSummary.ingestion.unmapped, "warning"],
                    ["Degradados", cockpitSummary.ingestion.degraded, "warning"],
                    ["Falha", cockpitSummary.ingestion.failed, "danger"],
                    ["Falha + alto consumo", cockpitSummary.ingestion.high_volume_failed, "danger"],
                    ["Em execução", cockpitSummary.ingestion.running, "neutral"],
                    ["Pendentes", cockpitSummary.ingestion.pending, "warning"],
                    ["Sem sucesso recente", cockpitSummary.ingestion.stale, "neutral"],
                    ["Críticos sem sucesso", cockpitSummary.ingestion.critical_stale, "danger"],
                  ].map(([label, value, tone]) => (
                    <div
                      className={`rounded-2xl border p-4 ${
                        tone === "danger"
                          ? "border-danger-200 bg-danger-50"
                          : tone === "warning"
                            ? "border-warning-200 bg-warning-50"
                            : "border-border/80 bg-bg-subtle/80"
                      }`}
                      key={String(label)}
                    >
                      <p className="text-xs uppercase tracking-[0.16em] text-muted">{label}</p>
                      <p className="mt-2 text-2xl font-semibold text-text">{value}</p>
                    </div>
                  ))}
                </div>
                <p className="text-xs leading-5 text-muted">
                  “Sem sucesso recente” considera pipelines sem execução bem-sucedida nas últimas {cockpitSummary.ingestion.stale_threshold_hours} horas.
                </p>
                <p className="text-xs leading-5 text-muted">
                  “Falha + alto consumo” destaca pipelines com falha e volume recente acima de {formatCompactNumber(cockpitSummary.ingestion.high_volume_failed_threshold_rows)} linhas processadas.
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    ["all", "Todos"],
                    ["failure", "Falha"],
                    ["degraded", "Degradados"],
                    ["success", "Sucesso"],
                    ["stale", "Sem sucesso recente"],
                  ].map(([value, label]) => (
                    <Button
                      key={value}
                      onClick={() => setIngestionFilter(value as typeof ingestionFilter)}
                      size="sm"
                      variant={ingestionFilter === value ? "default" : "outline"}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
                <div className="space-y-3">
                  {filteredIngestionItems.length ? (
                    filteredIngestionItems.map((item) => (
                      <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4" key={`${item.table_fqn}-${item.pipeline_name || item.dag_id || "pipeline"}`}>
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <Workflow className="h-4 w-4 text-muted" />
                              <p className="font-medium text-text">{item.schema_name ? `${item.schema_name}.${item.table_name}` : item.table_name}</p>
                              <Badge tone={ingestionStatusTone(item)}>{ingestionStatusLabel(item)}</Badge>
                            </div>
                            <p className="mt-1 text-xs text-muted">{item.table_fqn}</p>
                            <p className="mt-2 text-sm text-text-body">
                              {item.pipeline_name || "Pipeline sem nome"}
                              {item.dag_id ? ` · ${item.dag_id}` : ""}
                              {item.load_type_label ? ` · ${item.load_type_label}` : ""}
                            </p>
                            <p className="mt-1 text-sm text-text-body">
                              Último início: {item.last_run_started_at ? formatDateTime(item.last_run_started_at) : "Não disponível"} · Último término:{" "}
                              {item.last_run_finished_at ? formatDateTime(item.last_run_finished_at) : "Não disponível"}
                            </p>
                            <p className="mt-1 text-sm text-text-body">
                              Status: {item.last_status || item.latest_status_label || "Sem status"} · Ponto de controle: {item.last_watermark || item.watermark_value || "-"}
                            </p>
                            <p className="mt-1 text-sm text-text-body">
                              Task: {item.task_name || "-"} · Volume: {formatCompactNumber(item.records_processed ?? item.rows_processed)}
                            </p>
                            {item.observacao || item.last_error ? (
                              <p className="mt-2 text-sm text-danger-700">
                                <span className="font-medium text-danger-800">Causa/erro:</span> {item.observacao || item.last_error}
                              </p>
                            ) : null}
                            {!item.observacao && !item.last_error ? <p className="mt-2 text-sm text-text-body">{ingestionStatusLabel(item)}</p> : null}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {item.target_url ? (
                              <Button asChild size="sm" variant="outline">
                                <Link href={item.target_url}>Abrir ativo</Link>
                              </Button>
                            ) : null}
                            {item.pipeline_history_href ? (
                              <Button asChild size="sm" variant="ghost">
                                <Link href={item.pipeline_history_href}>Histórico completo</Link>
                              </Button>
                            ) : null}
                            {item.airflow_dag_href ? (
                              <Button asChild size="sm" variant="ghost">
                                <Link href={item.airflow_dag_href} rel="noreferrer" target="_blank">
                                  Abrir DAG
                                </Link>
                              </Button>
                            ) : null}
                            {item.airflow_task_href ? (
                              <Button asChild size="sm" variant="ghost">
                                <Link href={item.airflow_task_href} rel="noreferrer" target="_blank">
                                  Abrir task
                                </Link>
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-success-200 bg-success-50 p-4 text-sm text-success-700">
                      Nenhum pipeline nesta filtragem no momento.
                    </div>
                  )}
                </div>
                {filteredIngestionItems.length < (cockpitSummary.ingestion.items ?? []).length ? (
                  <div className="flex justify-center">
                    <Button onClick={() => toggleSection("ingestion")} size="sm" variant="ghost">
                      {expandedSections.ingestion ? "Mostrar menos" : "Ver mais pipelines"}
                    </Button>
                  </div>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className={sectionCardClassName()}>
        <CardContent className="space-y-4 p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Saúde geral</p>
            <h3 className="mt-2 text-lg font-semibold text-text">Sinais operacionais da plataforma</h3>
            <p className="mt-1 text-sm text-text-body">Sinais consolidados para acompanhar a saúde operacional da plataforma.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            {healthItems.map(([key, value]) => (
              <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-3" key={key}>
                <p className="text-xs uppercase tracking-[0.16em] text-muted">{metricLabel(key)}</p>
                <p className="mt-2 text-xl font-semibold text-text">{value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className={sectionCardClassName()}>
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Filas operacionais</p>
              <h3 className="mt-2 text-lg font-semibold text-text">Pendências agrupadas por tipo de ação</h3>
              <p className="mt-1 text-sm text-text-body">Use as abas para alternar rapidamente entre operação, governança, privacidade, qualidade, incidentes e mapeamento.</p>
            </div>
            <Button onClick={() => toggleSection("queues")} size="sm" variant="ghost">
              {expandedSections.queues ? "Compactar lista" : "Ver mais itens"}
            </Button>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {queueCategories.map((category) => {
              const total = queueSections
                .filter((section) => section.group === category)
                .reduce((acc, section) => acc + section.count, 0);
              return (
                <Button
                  key={category}
                  onClick={() => setActiveQueueCategory(category)}
                  className="whitespace-nowrap"
                  size="sm"
                  variant={activeQueueCategory === category ? "default" : "outline"}
                >
                  {category}
                  <span className="ml-2 rounded-full bg-surface/20 px-2 py-0.5 text-[11px]">{total}</span>
                </Button>
              );
            })}
          </div>
          <div className="space-y-4">
            {visibleQueueSections.length ? (
              visibleQueueSections.map((section) => (
                <div className="space-y-3" key={section.group}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-muted">{section.group}</p>
                      <p className="text-sm text-text-body">
                        {section.count} item(ns) · severidade {severityLabel(section.severity)}
                      </p>
                    </div>
                    <Badge tone={section.severity}>{section.count}</Badge>
                  </div>
                  <div className="grid gap-3">
                    {section.items.map(([key, items]) => {
                      const visibleItems = expandedSections.queues ? items : items.slice(0, 3);
                      return (
                        <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4" key={key}>
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <p className="text-sm font-medium text-text">{metricLabel(key)}</p>
                              <p className="text-xs text-muted">{queueSummaryDescription(key, items.length)}</p>
                            </div>
                            <Badge tone={queueSeverityTone(key)}>{severityLabel(queueSeverityTone(key))}</Badge>
                          </div>
                          <div className="mt-3 space-y-3">
                            {visibleItems.map((item) => (
                              <div className="rounded-xl border border-border/70 bg-surface p-3" key={`${key}-${item.table_id}`}>
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                  <div>
                                    <p className="text-sm font-medium text-text">{item.table_name}</p>
                                    <p className="mt-1 text-xs text-muted">{item.table_fqn}</p>
                                  </div>
                                  {item.status_label ? <Badge tone={queueSeverityTone(key)}>{item.status_label}</Badge> : null}
                                </div>
                                {item.hint ? <p className="mt-2 text-sm text-text-body">{item.hint}</p> : null}
                                <div className="mt-2 flex flex-wrap gap-2">
                                  <Button asChild size="sm" variant="outline">
                                    <Link href={item.target_url}>Abrir ativo</Link>
                                  </Button>
                                  {item.pipeline_history_href ? (
                                    <Button asChild size="sm" variant="ghost">
                                      <Link href={item.pipeline_history_href}>Histórico</Link>
                                    </Button>
                                  ) : null}
                                </div>
                              </div>
                            ))}
                          </div>
                          {!expandedSections.queues && items.length > 3 ? (
                            <div className="mt-3 flex justify-center">
                              <Button onClick={() => toggleSection("queues")} size="sm" variant="ghost">
                                Ver mais desta fila
                              </Button>
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4 text-sm text-text-body">Nenhuma fila nesta categoria no momento.</div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className={sectionCardClassName()}>
          <CardContent className="space-y-4 p-5">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-muted" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Falhas recentes</p>
                <h3 className="mt-1 text-lg font-semibold text-text">Processamentos que precisam de atenção</h3>
              </div>
            </div>
            <div className="space-y-4">
              {visibleFailures.map(([key, items]) => (
                <div className="space-y-3" key={key}>
                  <p className="text-sm font-medium text-text-body">{metricLabel(key)}</p>
                  {items.length ? (
                    items.slice(0, expandedSections.failures ? items.length : 5).map((item) => (
                      <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4" key={`${key}-${item.id}`}>
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-medium text-text">#{item.id}</p>
                          <Badge tone="warning">{item.status}</Badge>
                        </div>
                        <p className="mt-2 text-sm text-text-body">
                          {item.table_fqn ? `${item.table_fqn} · ` : ""}
                          {item.datasource_id ? `Datasource ${item.datasource_id} · ` : ""}
                          {item.job_type ? `${item.job_type} · ` : ""}
                          {item.created_at ? formatDateTime(item.created_at) : "Sem data"}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {item.datasource_id ? (
                            <Button
                              disabled={acting === `scan-${item.datasource_id}`}
                              onClick={() => onReprocessScan(item.datasource_id!)}
                              size="sm"
                              variant="outline"
                            >
                              {acting === `scan-${item.datasource_id}` ? "Reprocessando..." : "Reprocessar scan"}
                            </Button>
                          ) : null}
                          {item.table_id ? (
                            <Button
                              disabled={acting === `profiling-${item.table_id}`}
                              onClick={() => onRerunProfiling(item.table_id!)}
                              size="sm"
                              variant="outline"
                            >
                              {acting === `profiling-${item.table_id}` ? "Reexecutando..." : "Reexecutar profiling"}
                            </Button>
                          ) : null}
                          {item.target_url ? (
                            <Button asChild size="sm" variant="ghost">
                              <Link href={item.target_url}>Abrir contexto</Link>
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-success-200 bg-success-50 p-4 text-sm text-success-700">Nenhuma falha recente em {metricLabel(key).toLowerCase()}.</div>
                  )}
                </div>
              ))}
            </div>
            {failureGroups.length > 3 ? (
              <div className="flex justify-center">
                <Button onClick={() => toggleSection("failures")} size="sm" variant="ghost">
                  {expandedSections.failures ? "Mostrar menos falhas" : "Ver mais falhas"}
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className={sectionCardClassName()}>
            <CardContent className="space-y-4 p-5">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-muted" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Adoção da plataforma</p>
                  <h3 className="mt-1 text-lg font-semibold text-text">Uso dos módulos e interações registradas na janela atual</h3>
                </div>
              </div>
              <p className="text-sm text-text-body">Estas métricas ajudam a entender uso e engajamento, mas não representam falha operacional.</p>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {visibleAdoptionMetrics.map(([label, value, helper]) => (
                  <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4" key={String(label)}>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">{label}</p>
                    <p className="mt-2 text-xl font-semibold text-text">{value}</p>
                    <p className="mt-2 text-sm text-text-body">{helper}</p>
                  </div>
                ))}
              </div>
              {adoptionMetrics.length > visibleAdoptionMetrics.length ? (
                <div className="flex justify-center">
                  <Button onClick={() => setShowAllAdoption((current) => !current)} size="sm" variant="ghost">
                    {showAllAdoption ? "Mostrar menos adoção" : "Ver todos"}
                  </Button>
                </div>
              ) : null}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-3">
                  {visibleTopModules.map((item) => (
                    <div className="flex items-center justify-between rounded-2xl border border-border/80 bg-bg-subtle/80 px-4 py-3" key={`module-${item.label}`}>
                      <span className="text-sm font-medium text-text-body">{item.label}</span>
                      <span className="text-sm font-semibold text-text">{item.value}</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-3">
                  {visibleTopEvents.map((item) => (
                    <div className="flex items-center justify-between rounded-2xl border border-border/80 bg-bg-subtle/80 px-4 py-3" key={`event-${item.label}`}>
                      <span className="text-sm font-medium text-text-body">{item.label}</span>
                      <span className="text-sm font-semibold text-text">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
              {visibleTopLegacyModules.length ? (
                <div className="space-y-3 border-t border-border/70 pt-4">
                  <p className="text-sm font-medium text-text-body">
                    Uso restante da API legada por módulo na janela de {cockpitSummary.analytics.legacy_api_cutoff_window_days} dia(s)
                  </p>
                  <div className="grid gap-3 md:grid-cols-2">
                    {visibleTopLegacyModules.map((item) => (
                      <div className="flex items-center justify-between rounded-2xl border border-warning-200 bg-warning-50 px-4 py-3" key={`legacy-${item.label}`}>
                        <span className="text-sm font-medium text-warning-900">{item.label}</span>
                        <span className="text-sm font-semibold text-warning-950">{item.value}</span>
                      </div>
                    ))}
                  </div>
                  {cockpitSummary.analytics.top_legacy_modules.length === 1 && cockpitSummary.analytics.top_legacy_modules[0].label.toLowerCase() === "auth" ? (
                    <p className="text-sm text-warning-700">Ainda existe uso residual em auth.</p>
                  ) : null}
                </div>
              ) : null}
              <div className="grid gap-3 border-t border-border/70 pt-4 md:grid-cols-2">
                <div className="rounded-2xl border border-success-200 bg-success-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-success-700">Elegíveis para corte</p>
                  <p className="mt-2 text-sm text-success-900">
                    {cockpitSummary.analytics.eligible_legacy_modules_to_disable.length
                      ? cockpitSummary.analytics.eligible_legacy_modules_to_disable.join(", ")
                      : "Nenhum módulo elegível para desligamento automático nesta janela."}
                  </p>
                </div>
                <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-body">Legado já desligado</p>
                  <p className="mt-2 text-sm text-text">
                    {cockpitSummary.analytics.disabled_legacy_modules.length ? cockpitSummary.analytics.disabled_legacy_modules.join(", ") : "Nenhum módulo desligado no momento."}
                  </p>
                </div>
              </div>
              {cockpitSummary.analytics.force_enabled_legacy_modules.length ? (
                <div className="rounded-2xl border border-brand-200 bg-brand-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-700">Exceções mantidas no legado</p>
                  <p className="mt-2 text-sm text-brand-900">{cockpitSummary.analytics.force_enabled_legacy_modules.join(", ")}</p>
                </div>
              ) : null}
              {visibleTopAssets.length ? (
                <div className="space-y-3 border-t border-border/70 pt-4">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-muted" />
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Ativos mais acessados</p>
                      <h4 className="mt-1 text-base font-semibold text-text">Uso real via busca</h4>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {visibleTopAssets.map((asset) => (
                      <div className="flex items-center justify-between rounded-2xl border border-border/80 bg-bg-subtle/80 px-4 py-3" key={`${asset.asset_type}-${asset.asset_id}`}>
                        <div>
                          <p className="text-sm font-medium text-text-body">{asset.qualified_name || asset.asset_name}</p>
                          <p className="text-xs text-muted">
                            {asset.asset_type}
                            {asset.source_name ? ` · ${asset.source_name}` : ""}
                            {asset.schema_name ? ` · ${asset.schema_name}` : ""}
                          </p>
                        </div>
                        <Badge tone="accent">{asset.total_clicks}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className={sectionCardClassName()}>
            <CardContent className="space-y-4 p-5">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-muted" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Runtime técnico</p>
                  <h3 className="mt-1 text-lg font-semibold text-text">Sinais da API</h3>
                </div>
              </div>
              <p className="text-sm text-text-body">Sinais técnicos da API. Use para detectar lentidão, aumento de erro ou tráfego inesperado.</p>
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Volume</p>
                  <div className="mt-3 grid gap-3 md:grid-cols-3">
                    {runtimeByGroup.volume.map(([key, value]) => (
                      <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4" key={key}>
                        <p className="text-xs uppercase tracking-[0.16em] text-muted">{formatRuntimeEntryKey(key)}</p>
                        <p className="mt-2 text-xl font-semibold text-text">{key === "uptime_seconds" ? formatDurationSeconds(Number(value)) : formatRuntimeValue(value)}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Latência</p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {runtimeByGroup.latency.map(([key, value]) => (
                        <div className="rounded-xl border border-border/70 bg-surface px-3 py-2" key={key}>
                          <p className="text-xs uppercase tracking-[0.14em] text-muted">{formatRuntimeEntryKey(key)}</p>
                          <p className="mt-1 text-lg font-semibold text-text">{formatRuntimeValue(value)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Erros</p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {runtimeByGroup.errors.map(([key, value]) => (
                        <div className="rounded-xl border border-border/70 bg-surface px-3 py-2" key={key}>
                          <p className="text-xs uppercase tracking-[0.14em] text-muted">{formatRuntimeEntryKey(key)}</p>
                          <p className="mt-1 text-lg font-semibold text-text">{formatRuntimeValue(value)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Distribuição</p>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    {runtimeByGroup.distribution.map(([key, value]) => (
                      <div className="rounded-xl border border-border/70 bg-surface px-3 py-2" key={key}>
                        <p className="text-xs uppercase tracking-[0.14em] text-muted">{formatRuntimeEntryKey(key)}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {isPlainObject(value)
                            ? Object.entries(value).length
                              ? Object.entries(value)
                                  .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
                                  .map(([subKey, subValue]) => (
                                    <Badge key={subKey} tone="neutral">
                                      {subKey}: {formatRuntimeValue(subValue)}
                                    </Badge>
                                  ))
                              : "Sem dados estruturados."
                            : Array.isArray(value)
                              ? value.length
                                ? value.map((entry, index) => (
                                    <Badge key={`${key}-${index}`} tone="neutral">
                                      {formatRuntimeValue(entry)}
                                    </Badge>
                                  ))
                                : "Lista vazia."
                              : formatRuntimeValue(value)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
