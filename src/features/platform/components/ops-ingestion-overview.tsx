import { Link } from "@/lib/next-shims";
import { Search, Workflow } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ContextualJourneyCard } from "@/components/navigation/contextual-journey-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCompactNumber, formatDateTime, ingestionStatusTone } from "@/features/explorer/utils";
import type { PlatformIngestionOverview, PlatformIngestionOverviewItem } from "@/features/platform/types";

type Props = {
  error: string;
  loading: boolean;
  onClearFilters: () => void;
  onRetry: () => void;
  searchTerm: string;
  statusFilter: string;
  summary: PlatformIngestionOverview | null;
  onSearchTermChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
};

function sectionCardClassName() {
  return "border-border/80 bg-surface shadow-card";
}

function metricLabel(label: string) {
  const map: Record<string, string> = {
    pipelines_total: "Pipelines totais",
    linked_tables: "Tabelas vinculadas",
    unmapped: "Sem pipeline",
    degraded: "Degradados",
    failed: "Falhas",
    running: "Em execução",
    pending: "Pendentes",
    stale: "Sem sucesso recente",
    critical_stale: "Críticos sem sucesso",
  };
  return map[label] || label.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function buildAirflowDrilldownHref(item: PlatformIngestionOverviewItem) {
  const params = new URLSearchParams();
  if (item.dag_id) params.set("dagId", item.dag_id);
  if (item.schema_name && item.table_name) {
    params.set("schema", item.schema_name);
    params.set("table", item.table_name);
  }
  const query = params.toString();
  return query ? `/integrations/airflow?${query}` : "/integrations/airflow";
}

function itemSearchText(item: PlatformIngestionOverviewItem) {
  const values: Array<string | number | boolean | null | undefined> = [
    item.schema_name,
    item.table_name,
    item.table_fqn,
    item.pipeline_name,
    item.dag_id,
    item.task_name,
    item.load_type,
    item.load_type_label,
    item.last_status,
    item.latest_status_label,
    item.last_run_started_at,
    item.last_run_finished_at,
    item.last_watermark,
    item.last_error,
    item.observacao,
    item.watermark_value,
    item.records_processed,
  ];
  return values
    .map((value) => (value === null || value === undefined ? "" : String(value)))
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function normalizedStatus(item: PlatformIngestionOverviewItem) {
  return (item.latest_status_label || item.last_status || "").trim().toLowerCase();
}

function itemHasZeroVolume(item: PlatformIngestionOverviewItem) {
  return Number(item.records_processed ?? item.rows_processed ?? 0) === 0;
}

function itemFocusGroup(item: PlatformIngestionOverviewItem) {
  const status = normalizedStatus(item);
  const hasError = Boolean(item.last_error || item.observacao);
  if (status.includes("falha") || status.includes("error") || hasError) return "failure";
  if (status.includes("degrad")) return "degraded";
  if (status.includes("pend")) return "pending";
  if (status.includes("execução") || status.includes("running")) return "running";
  if (status.includes("sucesso")) {
    if (itemHasZeroVolume(item)) return "zero_volume";
    return "healthy";
  }
  return "neutral";
}

function ingestionBadgeTone(item: PlatformIngestionOverviewItem) {
  const focus = itemFocusGroup(item);
  if (focus === "failure") return "danger";
  if (focus === "degraded" || focus === "pending" || focus === "running" || focus === "zero_volume") return "warning";
  if (focus === "healthy") return "success";
  return "neutral";
}

function volumeStateLabel(item: PlatformIngestionOverviewItem) {
  if (item.records_processed === null && item.rows_processed === null) return "Volume não informado";
  if (!itemHasZeroVolume(item)) return null;
  const loadType = `${item.load_type_label || item.load_type || ""}`.toLowerCase();
  if (loadType.includes("increment") || loadType.includes("append")) return "Volume zero esperado";
  return "Volume zero com atenção";
}

function uniqueByKey(items: PlatformIngestionOverviewItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.table_fqn || ""}|${item.pipeline_name || ""}|${item.dag_id || ""}|${item.latest_status_label || ""}|${item.last_status || ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function OpsIngestionOverview({
  error,
  loading,
  onClearFilters,
  onRetry,
  searchTerm,
  statusFilter,
  summary,
  onSearchTermChange,
  onStatusFilterChange,
}: Props) {
  const [attentionFocus, setAttentionFocus] = useState<"all" | "failure" | "degraded" | "stale" | "zero_volume" | "unmapped">("all");
  const [queueFocus, setQueueFocus] = useState<"falhas" | "degradados" | "sem_sucesso" | "sem_pipeline" | "alto_consumo" | "criticos">("falhas");
  const [healthyPage, setHealthyPage] = useState(1);
  const healthyPageSize = 5;

  const filteredUnmapped = useMemo(() => {
    const items = summary?.unmapped_items ?? [];
    const q = searchTerm.trim().toLowerCase();
    return items.filter((item) => !q || itemSearchText(item).includes(q));
  }, [searchTerm, summary]);

  const filteredDegraded = useMemo(() => {
    const items = summary?.degraded_items ?? [];
    const q = searchTerm.trim().toLowerCase();
    return items.filter((item) => !q || itemSearchText(item).includes(q));
  }, [searchTerm, summary]);

  const filteredFailed = useMemo(() => {
    const items = summary?.failed_items ?? [];
    const q = searchTerm.trim().toLowerCase();
    return items.filter((item) => !q || itemSearchText(item).includes(q));
  }, [searchTerm, summary]);

  const filteredCritical = useMemo(() => {
    const items = summary?.critical_stale_items ?? [];
    const q = searchTerm.trim().toLowerCase();
    return items.filter((item) => !q || itemSearchText(item).includes(q));
  }, [searchTerm, summary]);

  const allIngestionItems = useMemo(() => {
    const combined = uniqueByKey([
      ...(summary?.items ?? []),
      ...(summary?.failed_items ?? []),
      ...(summary?.degraded_items ?? []),
      ...(summary?.critical_stale_items ?? []),
      ...(summary?.high_volume_failed_items ?? []),
      ...(summary?.unmapped_items ?? []),
    ]);
    const q = searchTerm.trim().toLowerCase();
    return combined.filter((item) => !q || itemSearchText(item).includes(q));
  }, [searchTerm, summary]);

  const attentionItems = useMemo(() => {
    const items = allIngestionItems.filter((item) => {
      const focus = itemFocusGroup(item);
      if (attentionFocus === "all") return focus !== "healthy";
      if (attentionFocus === "stale") return focus === "zero_volume" || (focus !== "healthy" && focus !== "neutral");
      return focus === attentionFocus;
    });
    return items.sort((left, right) => {
      const order = { failure: 0, degraded: 1, stale: 2, pending: 3, running: 4, zero_volume: 5, neutral: 6, healthy: 7 } as const;
      return order[itemFocusGroup(left)] - order[itemFocusGroup(right)];
    });
  }, [allIngestionItems, attentionFocus]);

  const healthyItems = useMemo(() => allIngestionItems.filter((item) => itemFocusGroup(item) === "healthy"), [allIngestionItems]);

  const totalHealthyPages = Math.max(Math.ceil(healthyItems.length / healthyPageSize), 1);
  const visibleHealthyItems = healthyItems.slice((healthyPage - 1) * healthyPageSize, healthyPage * healthyPageSize);

  useEffect(() => {
    setHealthyPage(1);
  }, [searchTerm, statusFilter, attentionFocus]);

  if (loading) {
    return (
      <div className="space-y-6 pb-6">
        <Skeleton className="h-32 w-full" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton className="h-28 w-full" key={index} />
          ))}
        </div>
        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <Skeleton className="h-[420px] w-full" />
          <Skeleton className="h-[420px] w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        action={
          <Button onClick={onRetry} size="sm" variant="outline">
            Tentar novamente
          </Button>
        }
        description={error}
        title="Não foi possível carregar a ingestão"
      />
    );
  }

  if (!summary) {
    return <EmptyState title="Painel operacional indisponível" description="Nenhum dado de ingestão foi retornado pela plataforma." />;
  }

  if (!summary.available) {
    return (
      <EmptyState
        action={
          <Button onClick={onRetry} size="sm" variant="outline">
            Recarregar visão
          </Button>
        }
        description={summary.message || "A camada operacional de ingestão ainda não está disponível neste ambiente."}
        title="Camada operacional indisponível"
      />
    );
  }

  const ingestion = summary;

  const topMetrics = [
    ["pipelines_total", ingestion.pipelines_total, "Total de pipelines monitorados pela visão operacional de ingestão."],
    ["linked_tables", ingestion.linked_tables, "Tabelas do catálogo que possuem pipeline operacional associado."],
    ["unmapped", ingestion.unmapped, "Ativos catalogados sem pipeline mapeado."],
    ["degraded", ingestion.degraded, "Pipelines com sinais de instabilidade ou degradação recente."],
    ["failed", ingestion.failed, "Pipelines com status de erro operacional."],
    ["running", ingestion.running, "Pipelines atualmente marcados como running."],
    ["pending", ingestion.pending, "Pipelines aguardando execução, agendamento ou estado final."],
    ["stale", ingestion.stale, "Pipelines sem execução bem-sucedida na janela configurada."],
    ["critical_stale", ingestion.critical_stale, "Ativos críticos sem sucesso recente de ingestão."],
  ] as const;

  const failureGroups: Array<{ label: string; summaryCount: number; items: PlatformIngestionOverviewItem[] }> = [
    { label: "Falhas operacionais", summaryCount: ingestion.failed, items: filteredFailed },
    { label: "Críticos sem sucesso", summaryCount: ingestion.critical_stale, items: filteredCritical },
  ];

  const queueTabs: Array<{
    key: typeof queueFocus;
    label: string;
    summaryCount: number;
    listedCount: number;
    severity: "danger" | "warning" | "success";
    items: PlatformIngestionOverviewItem[];
    emptyTitle: string;
    emptyDescription: string;
  }> = [
    {
      key: "falhas",
      label: "Falhas",
      summaryCount: ingestion.failed,
      listedCount: filteredFailed.length,
      severity: ingestion.failed > 0 ? "danger" : "success",
      items: filteredFailed,
      emptyTitle: "Nenhuma falha operacional",
      emptyDescription: "Não há falhas operacionais nos filtros atuais.",
    },
    {
      key: "degradados",
      label: "Degradados",
      summaryCount: ingestion.degraded,
      listedCount: filteredDegraded.length,
      severity: ingestion.degraded > 0 ? "warning" : "success",
      items: filteredDegraded,
      emptyTitle: "Nenhuma degradação operacional",
      emptyDescription: "Não há pipelines degradados nos filtros atuais.",
    },
    {
      key: "sem_sucesso",
      label: "Sem sucesso recente",
      summaryCount: ingestion.stale,
      listedCount: filteredCritical.length,
      severity: ingestion.stale > 0 ? "warning" : "success",
      items: filteredCritical,
      emptyTitle: "Nenhum item sem sucesso recente",
      emptyDescription: "Não há pipelines fora da janela esperada nos filtros atuais.",
    },
    {
      key: "sem_pipeline",
      label: "Sem pipeline",
      summaryCount: ingestion.unmapped,
      listedCount: filteredUnmapped.length,
      severity: ingestion.unmapped > 0 ? "warning" : "success",
      items: filteredUnmapped,
      emptyTitle: "Nenhum ativo sem pipeline",
      emptyDescription: "Todos os ativos retornados possuem pipeline mapeado nos filtros atuais.",
    },
    {
      key: "alto_consumo",
      label: "Alto consumo",
      summaryCount: ingestion.high_volume_failed,
      listedCount: ingestion.high_volume_failed_items.filter((item) => !searchTerm || itemSearchText(item).includes(searchTerm.trim().toLowerCase())).length,
      severity: ingestion.high_volume_failed > 0 ? "danger" : "success",
      items: ingestion.high_volume_failed_items.filter((item) => !searchTerm || itemSearchText(item).includes(searchTerm.trim().toLowerCase())),
      emptyTitle: "Nenhuma falha de alto consumo",
      emptyDescription: "Não há pipelines de alto consumo com falha nos filtros atuais.",
    },
    {
      key: "criticos",
      label: "Críticos",
      summaryCount: ingestion.critical_stale,
      listedCount: filteredCritical.length,
      severity: ingestion.critical_stale > 0 ? "danger" : "success",
      items: filteredCritical,
      emptyTitle: "Nenhum crítico sem sucesso",
      emptyDescription: "Não há ativos críticos sem sucesso recente nos filtros atuais.",
    },
  ];
  const activeQueueTab = queueTabs.find((tab) => tab.key === queueFocus) ?? queueTabs[0];

  const attentionCards = [
    {
      key: "failure",
      title: "Falhas ativas",
      value: ingestion.failed,
      description: "Pipelines com erro operacional registrado na última leitura.",
      impact: "Indica interrupção ou erro que pode afetar consumo e leitura.",
      action: () => {
        setAttentionFocus("failure");
        onStatusFilterChange("Falha");
      },
      actionLabel: "Ver falhas",
      tone: ingestion.failed > 0 ? "danger" : "success",
    },
    {
      key: "degraded",
      title: "Pipelines degradados",
      value: ingestion.degraded,
      description: "Pipelines com sinais de instabilidade, pendência ou risco recente.",
      impact: "Pode indicar atraso, reprocesso ou execução incompleta.",
      action: () => {
        setAttentionFocus("degraded");
        onStatusFilterChange("Pendente");
      },
      actionLabel: "Ver degradados",
      tone: ingestion.degraded > 0 ? "warning" : "success",
    },
    {
      key: "stale",
      title: "Sem sucesso recente",
      value: ingestion.stale,
      description: "Pipelines sem execução bem-sucedida dentro da janela esperada.",
      impact: `Janela configurada: ${ingestion.stale_threshold_hours}h.`,
      action: () => setAttentionFocus("stale"),
      actionLabel: "Ver sem sucesso",
      tone: ingestion.stale > 0 ? "warning" : "success",
    },
    {
      key: "zero_volume",
      title: "Volume zero",
      value: allIngestionItems.filter((item) => itemFocusGroup(item) === "zero_volume").length,
      description: "Execuções bem-sucedidas que processaram zero registros.",
      impact: "Pode ser normal em cargas incrementais, mas merece revisão quando inesperado.",
      action: () => setAttentionFocus("zero_volume"),
      actionLabel: "Ver volume zero",
      tone: allIngestionItems.some((item) => itemFocusGroup(item) === "zero_volume") ? "warning" : "success",
    },
    {
      key: "unmapped",
      title: "Sem pipeline mapeado",
      value: ingestion.unmapped,
      description: "Ativos catalogados sem pipeline operacional vinculado.",
      impact: "Impede acompanhamento técnico e correlação operacional.",
      action: () => {
        setAttentionFocus("unmapped");
        onStatusFilterChange("Sem execução");
      },
      actionLabel: "Ver sem pipeline",
      tone: ingestion.unmapped > 0 ? "warning" : "success",
    },
    {
      key: "critical",
      title: "Críticos sem sucesso",
      value: ingestion.critical_stale,
      description: "Ativos críticos sem sucesso recente de ingestão.",
      impact: "Pode bloquear consumo ou amplificar falhas em cadeia.",
      action: () => setAttentionFocus("stale"),
      actionLabel: "Priorizar críticos",
      tone: ingestion.critical_stale > 0 ? "danger" : "success",
    },
  ] as const;

  return (
    <div className="space-y-6 pb-6">
      <Card className="border-border/80 bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_55%,#eef6ff_100%)] shadow-card">
        <CardContent className="space-y-4 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Visão geral operacional</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-text">Hub operacional de ingestão</h2>
              <p className="mt-2 max-w-4xl text-sm leading-7 text-text-body">
                Acompanhe a saúde operacional dos pipelines e identifique tabelas com risco, degradação ou ausência de sucesso recente sem depender do detalhe técnico da orquestração.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="neutral">Atualizado em {formatDateTime(ingestion.generated_at)}</Badge>
              <Badge tone="success">Visão operacional ativa</Badge>
              <Button asChild size="sm" variant="outline">
                <Link href="/integrations/airflow">Abrir diagnóstico técnico</Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className={sectionCardClassName()}>
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Atenção imediata</p>
              <h3 className="mt-2 text-lg font-semibold text-text">Pipelines e ativos que exigem ação operacional</h3>
            </div>
            <p className="max-w-3xl text-sm text-text-body">
              Foco em falhas ativas, degradação, ausência de sucesso recente e volume inesperado. Use os filtros para priorizar a próxima ação.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {attentionCards.map((card) => (
              <div
                className={`rounded-2xl border p-4 ${
                  card.tone === "danger"
                    ? "border-danger-200 bg-danger-50"
                    : card.tone === "warning"
                      ? "border-warning-200 bg-warning-50"
                      : "border-success-200 bg-success-50/70"
                }`}
                key={card.key}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-text">{card.title}</p>
                  <Badge tone={card.tone}>{formatCompactNumber(card.value)}</Badge>
                </div>
                <p className="mt-2 text-sm text-text-body">{card.description}</p>
                <p className="mt-2 text-xs text-muted">{card.impact}</p>
                <Button className="mt-3" onClick={card.action} size="sm" variant="outline">
                  {card.actionLabel}
                </Button>
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
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {[
              {
                title: "Investigar pipelines em falha",
                tone: "danger" as const,
                reason: `${ingestion.failed} pipeline(s) com erro operacional registrado.`,
                impact: "Falhas podem interromper consumo e gerar atraso em cadeia.",
                action: () => onStatusFilterChange("Falha"),
                actionLabel: "Ver falhas",
              },
              {
                title: "Revisar ausência de sucesso recente",
                tone: "warning" as const,
                reason: `${ingestion.stale} pipeline(s) fora da janela esperada.`,
                impact: "Pode indicar atraso, scheduler parado ou execução sem finalização.",
                action: () => setAttentionFocus("stale"),
                actionLabel: "Ver sem sucesso",
              },
              {
                title: "Conferir volume zero",
                tone: "warning" as const,
                reason: `${allIngestionItems.filter((item) => itemFocusGroup(item) === "zero_volume").length} pipeline(s) com volume zero.`,
                impact: "Pode ser normal em incremental, mas merece revisão quando inesperado.",
                action: () => setAttentionFocus("zero_volume"),
                actionLabel: "Ver volume zero",
              },
              {
                title: "Mapear pipeline sem vínculo",
                tone: ingestion.unmapped > 0 ? ("warning" as const) : ("success" as const),
                reason: `${ingestion.unmapped} ativo(s) sem pipeline mapeado.`,
                impact: "Sem mapeamento, o ativo fica sem leitura operacional própria.",
                action: () => setAttentionFocus("unmapped"),
                actionLabel: "Ver sem pipeline",
              },
              {
                title: "Abrir diagnóstico técnico",
                tone: "neutral" as const,
                reason: "Use o Airflow para logs, retries e estado da DAG.",
                impact: "Ajuda a verificar causa técnica sem sair da leitura operacional.",
                action: undefined,
                actionLabel: "Abrir Airflow",
              },
            ].map((action) => (
              <div
                className={`rounded-2xl border p-4 ${
                  action.tone === "danger"
                    ? "border-danger-200 bg-danger-50"
                    : action.tone === "warning"
                      ? "border-warning-200 bg-warning-50"
                      : action.tone === "success"
                        ? "border-success-200 bg-success-50/70"
                        : "border-border/80 bg-bg-subtle/80"
                }`}
                key={action.title}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-text">{action.title}</p>
                  <Badge tone={action.tone}>{action.tone === "danger" ? "Crítico" : action.tone === "warning" ? "Atenção" : action.tone === "success" ? "Saudável" : "Informativo"}</Badge>
                </div>
                <p className="mt-2 text-sm text-text-body">{action.reason}</p>
                <p className="mt-2 text-xs text-muted">Impacto: {action.impact}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {action.action ? (
                    <Button onClick={action.action} size="sm" variant="outline">
                      {action.actionLabel}
                    </Button>
                  ) : (
                    <Button asChild size="sm" variant="ghost">
                      <Link href="/integrations/airflow" target="_blank" rel="noreferrer">
                        Abrir no Airflow
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {topMetrics.map(([key, value, description]) => (
          <Card className={sectionCardClassName()} key={key}>
            <CardContent className="space-y-2 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600" title={description}>
                {metricLabel(key)}
              </p>
              <p className="text-3xl font-semibold text-text">{value}</p>
              <p className="text-xs leading-5 text-muted">{description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <ContextualJourneyCard
        description="Use esta tela para priorizar cobertura e risco. Quando precisar diagnosticar a causa, seguir para o ativo ou tratar a falha, estes atalhos levam ao módulo certo."
        links={[
          { description: "Abrir o detalhe técnico do ativo e suas abas de contexto.", href: "/explorer", label: "Explorer", tone: "accent" },
          { description: "Abrir a leitura técnica da orquestração no Apache Airflow.", href: "/integrations/airflow", label: "Apache Airflow", tone: "neutral" },
          { description: "Abrir a fila de incidentes e tickets de dados.", href: "/incidents", label: "Incidentes", tone: "warning" },
          { description: "Rever regras, profiling e sinais de qualidade.", href: "/data-quality", label: "Data Quality", tone: "success" },
        ]}
        title="Jornadas principais"
      />

      <Card className={sectionCardClassName()}>
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Filtros operacionais</p>
              <h3 className="mt-2 text-lg font-semibold text-text">Priorizar tabelas e eventos de ingestão</h3>
            </div>
            <div className="flex items-center gap-2">
              <Badge tone="neutral">Filtro atual: {statusFilter === "all" ? "Todos" : statusFilter}</Badge>
              <Button
                onClick={() => {
                  setAttentionFocus("all");
                  setQueueFocus("falhas");
                  onClearFilters();
                }}
                size="sm"
                variant="ghost"
              >
                Limpar filtros
              </Button>
            </div>
          </div>
          <div className="grid gap-3 xl:grid-cols-[1.6fr_0.8fr]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted" />
              <Input
                className="pl-9"
                onChange={(event) => onSearchTermChange(event.target.value)}
                placeholder="Buscar por tabela, schema, pipeline ou erro"
                value={searchTerm}
              />
            </div>
            <select
              className="h-10 rounded-xl border border-border/70 bg-surface px-3 text-sm text-text-body shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
              onChange={(event) => onStatusFilterChange(event.target.value)}
              value={statusFilter}
            >
              <option value="all">Todos os status</option>
              <option value="Sucesso">Sucesso</option>
              <option value="Falha">Falha</option>
              <option value="Em execução">Em execução</option>
              <option value="Pendente">Pendente</option>
              <option value="Sem execução">Sem execução</option>
            </select>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {[
              ["all", "Todos"],
              ["Falha", "Falha"],
              ["Pendente", "Degradado"],
              ["Sem execução", "Sem sucesso recente"],
              ["Em execução", "Em execução"],
              ["Sucesso", "Sucesso"],
            ].map(([value, label]) => (
              <Button
                key={value}
                onClick={() => onStatusFilterChange(value)}
                size="sm"
                className="shrink-0 whitespace-nowrap"
                variant={statusFilter === value ? "default" : "outline"}
              >
                {label}
              </Button>
            ))}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <Button
              onClick={() => {
                setAttentionFocus("zero_volume");
                onStatusFilterChange("Sucesso");
              }}
              size="sm"
              className="shrink-0 whitespace-nowrap"
              variant={attentionFocus === "zero_volume" ? "default" : "outline"}
            >
              Volume zero
            </Button>
            <Button
              onClick={() => {
                setAttentionFocus("unmapped");
                onStatusFilterChange("Sem execução");
              }}
              size="sm"
              className="shrink-0 whitespace-nowrap"
              variant={attentionFocus === "unmapped" ? "default" : "outline"}
            >
              Sem pipeline
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className={sectionCardClassName()}>
          <CardContent className="space-y-4 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Pipelines com atenção</p>
                <h3 className="mt-2 text-lg font-semibold text-text">Falhas, degradações e ausência de sucesso recente</h3>
              </div>
              <Badge tone="warning">{attentionItems.length}</Badge>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {[
                ["all", "Todas"],
                ["failure", "Falhas"],
                ["degraded", "Degradados"],
                ["stale", "Sem sucesso recente"],
                ["zero_volume", "Volume zero"],
                ["unmapped", "Sem pipeline"],
              ].map(([value, label]) => (
                <Button
                  key={value}
                  onClick={() => setAttentionFocus(value as typeof attentionFocus)}
                  size="sm"
                  className="shrink-0 whitespace-nowrap"
                  variant={attentionFocus === value ? "default" : "outline"}
                >
                  {label}
                </Button>
              ))}
            </div>

            {attentionItems.length ? (
              <div className="space-y-3">
                {attentionItems.slice(0, 10).map((item) => (
                  <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4 shadow-sm" key={`${item.table_fqn}-${item.pipeline_name || item.dag_id || "pipeline"}`}>
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <Workflow className="h-4 w-4 text-brand-700" />
                          <p className="min-w-0 truncate font-medium text-text" title={item.schema_name ? `${item.schema_name}.${item.table_name}` : item.table_name}>
                            {item.schema_name ? `${item.schema_name}.${item.table_name}` : item.table_name}
                          </p>
                          {item.latest_status_label ? <Badge tone={ingestionBadgeTone(item)}>{item.latest_status_label}</Badge> : null}
                          {itemFocusGroup(item) === "zero_volume" ? <Badge tone="warning">Volume zero</Badge> : null}
                        </div>
                        <p className="mt-1 truncate text-xs text-muted" title={item.table_fqn}>
                          {item.table_fqn}
                        </p>
                        <p className="mt-2 truncate text-sm text-text-body" title={`${item.pipeline_name || "Pipeline sem nome"}${item.load_type_label ? ` · ${item.load_type_label}` : ""}`}>
                          {item.pipeline_name || "Pipeline sem nome"}
                          {item.load_type_label ? ` · ${item.load_type_label}` : ""}
                        </p>
                        <p className="mt-1 text-sm text-text-body">
                          Último sucesso: {item.last_success_at ? formatDateTime(item.last_success_at) : "Não disponível"}
                        </p>
                        <p className="mt-1 text-sm text-text-body" title="Watermark representa o último ponto de controle da ingestão incremental.">
                          Ponto de controle: {item.last_watermark || item.watermark_value || "Não aplicável"}
                        </p>
                        <p className="mt-1 text-sm text-text-body" title="Volume zero pode ser normal em cargas incrementais; revise quando for inesperado.">
                          Volume processado: {formatCompactNumber(item.records_processed ?? item.rows_processed)}
                        </p>
                        {volumeStateLabel(item) ? <Badge tone={volumeStateLabel(item) === "Volume zero esperado" ? "success" : "warning"}>{volumeStateLabel(item)}</Badge> : null}
                        {item.observacao || item.last_error ? (
                          <p className="mt-2 truncate text-sm text-danger-700" title={item.observacao || item.last_error || undefined}>
                            {item.observacao || item.last_error}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap gap-2 lg:justify-end">
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
                        {item.dag_id ? (
                          <Button asChild size="sm" variant="outline">
                            <Link href={buildAirflowDrilldownHref(item)} title="Abre a leitura técnica da orquestração para investigar DAG, task, retries, logs e agendamento.">
                              Abrir diagnóstico técnico
                            </Link>
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
                {attentionItems.length > 10 ? (
                  <p className="text-sm text-muted">Mostrando 10 de {attentionItems.length} pipeline(s) com atenção.</p>
                ) : null}
              </div>
            ) : (
              <EmptyState
                className="shadow-none"
                title="Nenhum pipeline com atenção"
                description="Não há falhas, degradações ou ausência de sucesso recente nos filtros atuais."
              />
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className={sectionCardClassName()}>
            <CardContent className="space-y-4 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Pipelines saudáveis recentes</p>
                  <h3 className="mt-2 text-lg font-semibold text-text">Execuções dentro do esperado</h3>
                </div>
                <Badge tone="success">{healthyItems.length}</Badge>
              </div>
              {healthyItems.length ? (
                <div className="space-y-2">
                  {visibleHealthyItems.map((item) => (
                    <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-3 shadow-sm" key={`healthy-${item.table_fqn}-${item.pipeline_name || item.dag_id || "pipeline"}`}>
                      <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex min-w-0 flex-wrap items-center gap-2">
                            <Workflow className="h-4 w-4 text-brand-700" />
                            <p className="min-w-0 truncate font-medium text-text" title={item.schema_name ? `${item.schema_name}.${item.table_name}` : item.table_name}>
                              {item.schema_name ? `${item.schema_name}.${item.table_name}` : item.table_name}
                            </p>
                            <Badge tone="success">{item.latest_status_label || "Sucesso"}</Badge>
                          </div>
                          <p className="mt-1 truncate text-xs text-muted" title={item.table_fqn}>
                            {item.table_fqn}
                          </p>
                          <p className="mt-1 truncate text-sm text-text-body" title={`${item.pipeline_name || "Pipeline sem nome"}${item.load_type_label ? ` · ${item.load_type_label}` : ""}`}>
                            {item.pipeline_name || "Pipeline sem nome"}
                            {item.load_type_label ? ` · ${item.load_type_label}` : ""}
                          </p>
                          <p className="mt-1 text-sm text-text-body">
                            Último sucesso: {item.last_success_at ? formatDateTime(item.last_success_at) : "Não disponível"}
                          </p>
                          <p className="mt-1 text-sm text-text-body" title="Watermark representa o último ponto de controle da ingestão incremental.">
                            Ponto de controle: {item.last_watermark || item.watermark_value || "Não aplicável"}
                          </p>
                          <p className="mt-1 text-sm text-text-body" title="Volume zero pode ser normal em cargas incrementais; revise quando for inesperado.">
                            Volume processado: {formatCompactNumber(item.records_processed ?? item.rows_processed)}
                          </p>
                          {volumeStateLabel(item) ? <Badge tone={volumeStateLabel(item) === "Volume zero esperado" ? "success" : "warning"}>{volumeStateLabel(item)}</Badge> : null}
                          <p className="mt-1 text-xs text-muted">Execução saudável. Use esta lista para conferência rápida.</p>
                        </div>
                        <div className="flex flex-wrap gap-2 lg:justify-end">
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
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <p className="text-sm text-muted">
                      Mostrando {Math.min((healthyPage - 1) * healthyPageSize + 1, healthyItems.length)}-{Math.min(healthyPage * healthyPageSize, healthyItems.length)} de {healthyItems.length} pipelines.
                    </p>
                    <div className="flex gap-2">
                      <Button disabled={healthyPage <= 1} onClick={() => setHealthyPage((current) => Math.max(current - 1, 1))} size="sm" variant="ghost">
                        Anterior
                      </Button>
                      <Button disabled={healthyPage >= totalHealthyPages} onClick={() => setHealthyPage((current) => Math.min(current + 1, totalHealthyPages))} size="sm" variant="ghost">
                        Próxima
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <EmptyState className="shadow-none" title="Nenhum pipeline saudável" description="Nenhum sucesso recente encontrado nos filtros atuais." />
              )}
            </CardContent>
          </Card>

          <Card className={sectionCardClassName()}>
            <CardContent className="space-y-4 p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Filas operacionais</p>
                <h3 className="mt-2 text-lg font-semibold text-text">Atenções prioritárias</h3>
                <p className="mt-1 text-sm text-text-body">
                  As filas mostram itens acionáveis da ingestão. Quando o total do resumo for maior que os itens listados, parte da leitura ainda pode não ter vínculo completo com o catálogo.
                </p>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {queueTabs.map((tab) => (
                  <Button
                    key={tab.key}
                    onClick={() => setQueueFocus(tab.key)}
                    size="sm"
                    className="shrink-0 whitespace-nowrap"
                    variant={queueFocus === tab.key ? "default" : "outline"}
                  >
                    {tab.label} · {tab.summaryCount}
                  </Button>
                ))}
              </div>
              <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-text">{activeQueueTab.label}</p>
                    <p className="mt-1 text-xs text-muted">
                      {activeQueueTab.summaryCount} no resumo · {activeQueueTab.listedCount} item(ns) listados
                    </p>
                  </div>
                  <Badge tone={activeQueueTab.severity}>{activeQueueTab.summaryCount}</Badge>
                </div>
                {activeQueueTab.items.length ? (
                  <div className="mt-3 space-y-2">
                    {activeQueueTab.items.slice(0, 4).map((item) => (
                      <div className="rounded-xl border border-border/80 bg-surface p-3 shadow-sm" key={`${activeQueueTab.key}-${item.table_id ?? item.table_fqn}`}>
                        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0">
                            <p className="min-w-0 truncate font-medium text-text" title={item.schema_name ? `${item.schema_name}.${item.table_name}` : item.table_name}>
                              {item.schema_name ? `${item.schema_name}.${item.table_name}` : item.table_name}
                            </p>
                            <p className="mt-1 truncate text-xs text-muted" title={item.table_fqn}>
                              {item.table_fqn}
                            </p>
                            {item.observacao || item.last_error ? (
                              <p className="mt-1 truncate text-sm text-text-body" title={item.observacao || item.last_error || undefined}>
                                <span className="font-medium text-text-body">Causa/erro:</span> {item.observacao || item.last_error}
                              </p>
                            ) : null}
                          </div>
                          {item.latest_status_label ? <Badge tone={ingestionBadgeTone(item)}>{item.latest_status_label}</Badge> : null}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {item.target_url ? (
                            <Button asChild size="sm" variant="outline">
                              <Link href={item.target_url}>Abrir ativo</Link>
                            </Button>
                          ) : null}
                          {item.pipeline_history_href ? (
                            <Button asChild size="sm" variant="ghost">
                              <Link href={item.pipeline_history_href}>Ver histórico</Link>
                            </Button>
                          ) : null}
                          {item.dag_id ? (
                            <Button asChild size="sm" variant="outline">
                              <Link href={buildAirflowDrilldownHref(item)} title="Abre a leitura técnica da orquestração para investigar DAG, task, retries, logs e agendamento.">
                                Abrir diagnóstico técnico
                              </Link>
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    ))}
                    {activeQueueTab.summaryCount > activeQueueTab.listedCount ? (
                      <p className="text-xs text-muted">
                        O resumo operacional contabiliza {activeQueueTab.summaryCount} item(ns), mas apenas {activeQueueTab.listedCount} entraram na fila detalhada nesta leitura.
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <EmptyState className="mt-3 shadow-none" title={activeQueueTab.emptyTitle} description={activeQueueTab.emptyDescription} />
                )}
              </div>
            </CardContent>
          </Card>

          <Card className={sectionCardClassName()}>
            <CardContent className="space-y-4 p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Falhas recentes</p>
                <h3 className="mt-2 text-lg font-semibold text-text">Últimos eventos que exigem atenção</h3>
              </div>
              <div className="space-y-4">
                {failureGroups.map(({ label, items }) => (
                  <div className="space-y-3" key={label}>
                    <p className="text-sm font-medium text-text-body">{label}</p>
                    {items.length ? (
                      items.map((item) => (
                        <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4 shadow-sm" key={`${label}-${item.table_fqn}-${item.pipeline_name || item.dag_id || "x"}`}>
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-medium text-text">{item.schema_name ? `${item.schema_name}.${item.table_name}` : item.table_name}</p>
                              <p className="mt-1 text-xs text-muted">{item.table_fqn}</p>
                            </div>
                            {item.latest_status_label ? <Badge tone={ingestionStatusTone(item.latest_status_label)}>{item.latest_status_label}</Badge> : null}
                          </div>
                          {item.observacao || item.last_error ? (
                            <p className="mt-2 text-sm text-text-body">
                              <span className="font-medium text-text-body">Causa/erro:</span> {item.observacao || item.last_error}
                            </p>
                          ) : null}
                          <div className="mt-3 flex flex-wrap gap-2">
                            {item.target_url ? (
                              <Button asChild size="sm" variant="ghost">
                                <Link href={item.target_url}>Abrir contexto</Link>
                              </Button>
                            ) : null}
                            {item.pipeline_history_href ? (
                              <Button asChild size="sm" variant="outline">
                                <Link href={item.pipeline_history_href}>Ver histórico</Link>
                              </Button>
                            ) : null}
                            {item.dag_id ? (
                              <Button asChild size="sm" variant="outline">
                                <Link href={buildAirflowDrilldownHref(item)} title="Abre a leitura técnica da orquestração para investigar DAG, task, retries, logs e agendamento.">
                                  Abrir diagnóstico técnico
                                </Link>
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-success-200 bg-success-50 p-4 text-sm text-success-700 shadow-sm">
                        Nenhum evento recente nesta categoria.
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className={sectionCardClassName()}>
        <CardContent className="space-y-4 p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Resumo operacional</p>
            <h3 className="mt-2 text-lg font-semibold text-text">Sinais de atenção da ingestão</h3>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4 shadow-sm">
              <p className="text-xs uppercase tracking-[0.16em] text-muted">Sem sucesso recente</p>
              <p className="mt-2 text-2xl font-semibold text-text">{ingestion.stale}</p>
            </div>
            <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4 shadow-sm">
              <p className="text-xs uppercase tracking-[0.16em] text-muted">Críticos sem sucesso</p>
              <p className="mt-2 text-2xl font-semibold text-text">{ingestion.critical_stale}</p>
            </div>
            <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4 shadow-sm">
              <p className="text-xs uppercase tracking-[0.16em] text-muted">Falhas</p>
              <p className="mt-2 text-2xl font-semibold text-text">{ingestion.failed}</p>
            </div>
            <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4 shadow-sm">
              <p className="text-xs uppercase tracking-[0.16em] text-muted">Em execução</p>
              <p className="mt-2 text-2xl font-semibold text-text">{ingestion.running}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
