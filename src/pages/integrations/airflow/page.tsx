import { Link } from "@/lib/next-shims";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "@/lib/next-shims";
import { ArrowLeft, RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ContextualJourneyCard } from "@/components/navigation/contextual-journey-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/client-api";
import { formatCompactNumber } from "@/features/explorer/utils";
import { IntegrationMetricCard } from "@/features/integrations/components/integration-metric-card";
import type {
  AirflowIntegrationDagSummary,
  AirflowIntegrationFailures,
  AirflowIntegrationPipelines,
  AirflowIntegrationSummary,
  AirflowIntegrationTaskFailure,
} from "@/features/integrations/types";
import {
  formatDateTime,
  formatDurationSeconds,
  formatStatusLabel,
  formatStatusTone,
} from "@/features/integrations/utils";

function normalizedBaseUrl(value: string | null | undefined) {
  return (value || "").trim().replace(/\/+$/, "") || null;
}

function buildAirflowDagHref(baseUrl: string | null | undefined, dagId: string | null | undefined) {
  const normalizedBase = normalizedBaseUrl(baseUrl);
  const normalizedDagId = (dagId || "").trim();
  if (!normalizedBase || !normalizedDagId) return null;
  return `${normalizedBase}/dags/${encodeURIComponent(normalizedDagId)}/grid`;
}

function buildAirflowTaskHref(baseUrl: string | null | undefined, dagId: string | null | undefined, taskId: string | null | undefined) {
  const dagHref = buildAirflowDagHref(baseUrl, dagId);
  const normalizedTaskId = (taskId || "").trim();
  if (!dagHref || !normalizedTaskId) return null;
  return `${dagHref}?task_id=${encodeURIComponent(normalizedTaskId)}`;
}

function buildAirflowRunHref(baseUrl: string | null | undefined, dagId: string | null | undefined, runId: string | null | undefined) {
  const dagHref = buildAirflowDagHref(baseUrl, dagId);
  const normalizedRunId = (runId || "").trim();
  if (!dagHref || !normalizedRunId) return null;
  return `${dagHref}?dag_run_id=${encodeURIComponent(normalizedRunId)}`;
}

function buildOperationalHref(schema: string | null, table: string | null) {
  if (!schema || !table) return "/ops/ingestion";
  const params = new URLSearchParams({ schema, table });
  return `/ops/ingestion?${params.toString()}`;
}

function buildSearchHref(schema: string | null, table: string | null) {
  if (!schema || !table) return "/search";
  const params = new URLSearchParams({ q: `${schema}.${table}` });
  return `/search?${params.toString()}`;
}

function pipelineStateTone(isPaused: boolean, latestState: string | null | undefined) {
  if (isPaused) return "neutral" as const;
  switch ((latestState || "").toLowerCase()) {
    case "failed":
    case "upstream_failed":
      return "warning" as const;
    case "success":
      return "success" as const;
    case "running":
      return "accent" as const;
    default:
      return "neutral" as const;
  }
}

function normalizeText(value: string | null | undefined) {
  return (value || "").trim().toLowerCase();
}

function isWithinHours(value: string | null | undefined, hours: number) {
  if (!value) return false;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return false;
  return Date.now() - parsed.getTime() <= hours * 60 * 60 * 1000;
}

function failureCategory(item: AirflowIntegrationTaskFailure) {
  const state = normalizeText(item.state);
  if (state === "upstream_failed") return "Falha upstream";
  if (state === "failed") return "Falha real";
  return "Falha técnica";
}

function failureTone(item: AirflowIntegrationTaskFailure) {
  return normalizeText(item.state) === "upstream_failed" ? "warning" : "danger";
}

function truncateRunId(value: string | null | undefined) {
  if (!value) return "Sem run_id";
  return value.length > 42 ? `${value.slice(0, 42)}...` : value;
}

function cleanScheduleInterval(value: string | null | undefined) {
  if (!value) return null;
  let normalized = value.trim();
  // schedule_interval is frequently JSON-encoded, e.g. "\"*/20 * * * *\"".
  if (normalized.startsWith("\"") && normalized.endsWith("\"")) {
    normalized = normalized.slice(1, -1);
  }
  return normalized.trim() || null;
}

function formatScheduleLabel(dag: AirflowIntegrationDagSummary) {
  return dag.timetable_description || cleanScheduleInterval(dag.schedule_interval) || "Sem agendamento";
}

export default function AirflowIntegrationPage() {
  const searchParams = useSearchParams();
  const dagId = searchParams.get("dagId")?.trim() || null;
  const schema = searchParams.get("schema")?.trim() || null;
  const table = searchParams.get("table")?.trim() || null;

  const [summary, setSummary] = useState<AirflowIntegrationSummary | null>(null);
  const [pipelines, setPipelines] = useState<AirflowIntegrationPipelines | null>(null);
  const [failures, setFailures] = useState<AirflowIntegrationFailures | null>(null);
  const [error, setError] = useState("");
  const [pipelinesError, setPipelinesError] = useState("");
  const [failuresError, setFailuresError] = useState("");
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [runFilter, setRunFilter] = useState<"all" | "success" | "running" | "failed">("all");
  const [failureFilter, setFailureFilter] = useState<"all" | "task" | "upstream" | "recent24h" | "recent7d">("all");
  const [runSearch, setRunSearch] = useState("");
  const [failureSearch, setFailureSearch] = useState("");
  const [showAllRuns, setShowAllRuns] = useState(false);
  const [showAllFailures, setShowAllFailures] = useState(false);
  const [dagPage, setDagPage] = useState(1);
  const [dagSearchInput, setDagSearchInput] = useState("");
  const [dagSearch, setDagSearch] = useState("");
  const [dagStatus, setDagStatus] = useState<"all" | "active" | "paused" | "failing">("all");
  const [pipelinesLoading, setPipelinesLoading] = useState(false);
  const dagPageSize = 10;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setSummary(null);
    setPipelines(null);
    setFailures(null);
    setError("");
    setPipelinesError("");
    setFailuresError("");

    void (async () => {
      try {
        const [summaryResult, failuresResult] = await Promise.allSettled([
          apiRequest<AirflowIntegrationSummary>("/v1/integrations/airflow/summary"),
          apiRequest<AirflowIntegrationFailures>("/v1/integrations/airflow/failures?limit=20"),
        ]);
        if (cancelled) return;
        if (summaryResult.status === "fulfilled") {
          setSummary(summaryResult.value);
        } else {
          throw summaryResult.reason;
        }
        if (failuresResult.status === "fulfilled") {
          setFailures(failuresResult.value);
        } else {
          setFailuresError(failuresResult.reason instanceof Error ? failuresResult.reason.message : "Não foi possível carregar as tasks com erro.");
        }
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Não foi possível carregar o resumo do Airflow.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  // Debounce the DAG search box and reset to the first page on a new query.
  useEffect(() => {
    const handle = setTimeout(() => {
      setDagSearch(dagSearchInput.trim());
      setDagPage(1);
    }, 350);
    return () => clearTimeout(handle);
  }, [dagSearchInput]);

  // Reset to the first page whenever the status filter changes.
  useEffect(() => {
    setDagPage(1);
  }, [dagStatus]);

  // Dedicated, paginated fetch for the DAG catalog.
  useEffect(() => {
    let cancelled = false;
    setPipelinesLoading(true);
    setPipelinesError("");
    void (async () => {
      try {
        const params = new URLSearchParams({ page: String(dagPage), page_size: String(dagPageSize) });
        if (dagSearch) params.set("search", dagSearch);
        if (dagStatus !== "all") params.set("status", dagStatus);
        const data = await apiRequest<AirflowIntegrationPipelines>(`/v1/integrations/airflow/pipelines?${params.toString()}`);
        if (!cancelled) setPipelines(data);
      } catch (err) {
        if (!cancelled) setPipelinesError(err instanceof Error ? err.message : "Não foi possível carregar os DAGs detalhados.");
      } finally {
        if (!cancelled) setPipelinesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey, dagPage, dagSearch, dagStatus]);

  const pipelineItems = summary?.recent_runs || [];
  const failureItems = summary?.recent_failures || [];
  const detailedFailureItems = failures?.items || failureItems;
  const operationalFailures = detailedFailureItems.filter((item) => normalizeText(item.state) === "failed");
  const upstreamFailures = detailedFailureItems.filter((item) => normalizeText(item.state) === "upstream_failed");
  const recentFailureCount = detailedFailureItems.filter((item) => isWithinHours(item.failure_at || item.last_task_fail_at || item.updated_at, 24)).length;
  const runningRunCount = pipelineItems.filter((item) => normalizeText(item.state) === "running").length;
  const filteredPipelineItems = useMemo(() => {
    if (!dagId) return pipelineItems;
    return pipelineItems.filter((item) => item.dag_id === dagId);
  }, [dagId, pipelineItems]);
  const filteredFailureItems = useMemo(() => {
    if (!dagId) return failureItems;
    return failureItems.filter((item) => item.dag_id === dagId);
  }, [dagId, failureItems]);
  const operationalStatus = summary?.operational_status || "unavailable";
  const operationalMessage =
    operationalStatus === "unavailable"
      ? summary?.message || "A integração ainda não está disponível para leitura."
      : operationalStatus === "connected_empty"
        ? summary?.message || "Airflow conectado, sem DAGs cadastradas."
        : operationalStatus === "connected_no_runs"
          ? summary?.message || "Existem DAGs cadastradas, mas ainda sem execuções."
        : summary?.message ||
            (summary?.operational_status === "error"
              ? "Há falhas recentes nas últimas 24 horas e o diagnóstico técnico destaca os runs e tasks afetados."
              : summary?.operational_status === "healthy"
                ? "O Airflow está com execuções bem-sucedidas recentes e a camada modelada está estável."
              : summary?.operational_status === "running"
                ? "Há atividade recente no Airflow, e o diagnóstico técnico acompanha a movimentação mais atual."
                  : "A integração ainda está em evolução ou sem dados suficientes para um diagnóstico mais completo.");
  const technicalPendings = detailedFailureItems.length > 0 || (summary?.task_failures_24h ?? 0) > 0 || (summary?.paused_dags ?? 0) > 0;
  const integrationStatusMessage =
    summary?.message ||
    (summary?.operational_status === "error"
      ? "Há falhas recentes nas últimas 24 horas e o diagnóstico técnico destaca os runs e tasks afetados."
      : summary?.operational_status === "healthy"
        ? "O Airflow está com execuções bem-sucedidas recentes e a camada modelada está estável."
        : summary?.operational_status === "running"
          ? "Há atividade recente no Airflow, e o diagnóstico técnico acompanha a movimentação mais atual."
          : "A integração ainda está em evolução ou sem dados suficientes para um diagnóstico mais completo.");
  const overallReading =
    !summary
      ? { label: "Sem leitura", tone: "neutral" as const, message: "Carregando o diagnóstico técnico." }
    : summary.integration_status === "unavailable" || summary.integration_status === "misconfigured"
        ? { label: formatStatusLabel(summary.integration_status), tone: formatStatusTone(summary.integration_status), message: integrationStatusMessage }
        : technicalPendings
          ? {
              label: summary.failed_runs_24h > 0 || recentFailureCount > 0 ? "Atenção técnica" : "Saudável com pendências técnicas",
              tone: summary.failed_runs_24h > 0 || recentFailureCount > 0 ? ("warning" as const) : ("accent" as const),
              message:
                summary.failed_runs_24h > 0 || recentFailureCount > 0
                  ? "A integração responde, mas há falhas técnicas recentes ou materializadas para revisar."
                  : "A integração responde, mas existem DAGs pausadas ou tasks com erro histórico para investigar.",
          }
          : {
              label: "Saudável",
              tone: "success" as const,
              message: "A integração responde e não há pendências técnicas recentes no recorte carregado.",
            };
  const operationalCause =
    summary?.error_summary ||
    summary?.status_message ||
    summary?.message ||
    (recentFailureCount > 0 ? "Há falhas recentes na leitura carregada." : "Sem causa classificada no recorte atual.");
  const operationalAction =
    summary?.integration_status === "unavailable" || summary?.integration_status === "misconfigured"
      ? "Validar conexão, credenciais e disponibilidade da instância."
      : (summary?.failed_runs_24h ?? 0) > 0 || recentFailureCount > 0
        ? "Abrir a DAG ou a execução afetada e revisar a task com erro."
        : summary?.operational_status === "running"
          ? "Acompanhar a execução ativa e revisar o histórico se ela não avançar."
          : summary?.operational_status === "error"
            ? "Revisar as falhas recentes e abrir a DAG afetada."
            : "Manter monitoramento e usar o histórico para comparar a próxima atualização.";
  const operationalRunbookHref = summary?.airflow_ui_base_url
    ? buildAirflowDagHref(summary.airflow_ui_base_url, dagId)
    : "/integrations/airflow";

  const displayedRuns = useMemo(() => {
    const q = normalizeText(runSearch);
    return filteredPipelineItems.filter((item) => {
      const matchesFilter =
        runFilter === "all" ||
        (runFilter === "success" && normalizeText(item.state) === "success") ||
        (runFilter === "running" && normalizeText(item.state) === "running") ||
        (runFilter === "failed" && ["failed", "upstream_failed"].includes(normalizeText(item.state)));
      const matchesSearch =
        !q ||
        [item.dag_id, item.dag_display_name, item.run_id, item.run_type, item.state]
          .map((value) => normalizeText(value))
          .join(" ")
          .includes(q);
      return matchesFilter && matchesSearch;
    });
  }, [filteredPipelineItems, runFilter, runSearch]);

  const displayedFailures = useMemo(() => {
    const q = normalizeText(failureSearch);
    return filteredFailureItems.filter((item) => {
      const category = normalizeText(failureCategory(item));
      const matchesFilter =
        failureFilter === "all" ||
        (failureFilter === "task" && normalizeText(item.state) === "failed") ||
        (failureFilter === "upstream" && normalizeText(item.state) === "upstream_failed") ||
        (failureFilter === "recent24h" && isWithinHours(item.failure_at || item.last_task_fail_at || item.updated_at, 24)) ||
        (failureFilter === "recent7d" && isWithinHours(item.failure_at || item.last_task_fail_at || item.updated_at, 24 * 7));
      const matchesSearch =
        !q ||
        [item.dag_id, item.dag_display_name, item.task_id, item.run_id, item.operator, item.queue, item.hostname, item.troubleshooting_context, item.log_event, category]
          .map((value) => normalizeText(value))
          .join(" ")
          .includes(q);
      return matchesFilter && matchesSearch;
    });
  }, [filteredFailureItems, failureFilter, failureSearch]);

  if (loading) {
    return (
      <div className="space-y-6 pb-6">
        <Skeleton className="h-36 w-full" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton className="h-28 w-full" key={index} />
          ))}
        </div>
        <Skeleton className="h-72 w-full" />
        <div className="grid gap-4 xl:grid-cols-2">
          <Skeleton className="h-72 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6">
      <Card className="border-border/80 bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_55%,#eef6ff_100%)] shadow-card">
        <CardContent className="space-y-4 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Integrações · Apache Airflow</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-text">Diagnóstico técnico da integração</h2>
              <p className="mt-2 max-w-4xl text-sm leading-7 text-text-body">
                Monitore a integração com o Apache Airflow, acompanhe execuções recentes, falhas técnicas e o estado das DAGs sem consultar diretamente o ambiente bruto.
              </p>
              <div className="mt-4 rounded-2xl border border-border/80 bg-surface/70 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Importante</p>
                <p className="mt-1 text-sm leading-6 text-text-body">
                  “Saudável” aqui significa que a integração respondeu. Isso não garante ausência de falhas históricas, DAGs pausadas ou pendências operacionais.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge tone={formatStatusTone(summary?.integration_status)}>{formatStatusLabel(summary?.integration_status)}</Badge>
              <Badge tone={overallReading.tone}>{overallReading.label}</Badge>
              <Button onClick={() => setReloadKey((current) => current + 1)} size="sm" variant="outline">
                <RefreshCw className="mr-2 h-4 w-4" />
                Recarregar
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href={buildOperationalHref(schema, table)}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Voltar para visão operacional
                </Link>
              </Button>
            </div>
          </div>
          {dagId || schema || table ? (
            <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Contexto em foco</p>
                  <p className="mt-2 text-sm font-medium text-text">
                    {dagId ? `DAG ${dagId}` : "Diagnóstico sem DAG em foco"}
                    {schema && table ? ` · Tabela ${schema}.${table}` : ""}
                  </p>
                  <p className="mt-1 text-sm text-text-body">
                    {dagId
                      ? "A lista abaixo prioriza runs e falhas dessa DAG; use o botão de retorno para voltar à cobertura operacional."
                      : "Use esta tela para investigar a saúde técnica da integração e o comportamento recente do orquestrador."}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {schema && table ? (
                    <Button asChild size="sm" variant="outline">
                      <Link href={buildOperationalHref(schema, table)}>Ver cobertura operacional</Link>
                    </Button>
                  ) : null}
                  <Button asChild size="sm" variant="ghost">
                    <Link href="/ops/ingestion">Ir para visão operacional</Link>
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
          {summary ? (
            <div className="grid gap-3 text-sm text-text-body md:grid-cols-3">
              <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Última checagem</p>
                <p className="mt-2 font-medium text-text">{formatDateTime(summary.checked_at || summary.generated_at)}</p>
                <p className="mt-1">Status semântico: {formatStatusLabel(summary.integration_status)}</p>
              </div>
              <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Último sucesso</p>
                <p className="mt-2 font-medium text-text">{formatDateTime(summary.last_success_at)}</p>
                <p className="mt-1">Falhas consecutivas: {formatCompactNumber(summary?.consecutive_failures)}</p>
              </div>
              <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Última falha</p>
                <p className="mt-2 font-medium text-text">{formatDateTime(summary.last_failure_at)}</p>
                <p className="mt-1">Tipo de erro: {summary.error_type || "Sem erro recente"}</p>
              </div>
            </div>
          ) : null}
          {summary ? <p className="text-sm leading-6 text-text-body">{overallReading.message}</p> : null}
        </CardContent>
      </Card>

      <Card className="border-border/80 bg-surface shadow-card">
        <CardContent className="space-y-4 p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Leitura operacional</p>
              <h3 className="text-2xl font-semibold tracking-tight text-text">Causa, ação e severidade</h3>
              <p className="text-sm leading-6 text-text-body">Resumo prático para decidir se vale investigar no Airflow, aguardar o ciclo atual ou tratar uma falha histórica.</p>
            </div>
            <Badge tone={overallReading.tone}>{overallReading.label}</Badge>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Causa provável</p>
              <p className="mt-2 text-sm leading-6 text-text-body">{operationalCause}</p>
            </div>
            <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Ação recomendada</p>
              <p className="mt-2 text-sm leading-6 text-text-body">{operationalAction}</p>
            </div>
            <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Runbook / próximo passo</p>
              <p className="mt-2 text-sm leading-6 text-text-body">
                {operationalRunbookHref ? (
                  <Link className="font-medium text-info-700 hover:text-info-700" href={operationalRunbookHref}>
                    Abrir o diagnóstico no Airflow
                  </Link>
                ) : (
                  "Sem link de execução disponível nesta leitura."
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <ContextualJourneyCard
        description="Esta tela é o diagnóstico técnico do orquestrador. Use os atalhos para voltar ao contexto operacional, pesquisar o ativo relacionado ou continuar a investigação no Explorer."
        links={[
          { description: "Retornar à cobertura de tabelas, risco e filas priorizadas.", href: buildOperationalHref(schema, table), label: "Visão operacional", tone: "neutral" },
          { description: "Pesquisar rapidamente o ativo relacionado por schema e tabela.", href: buildSearchHref(schema, table), label: "Busca global", tone: "accent" },
          { description: "Abrir o Explorer para seguir a investigação do ativo.", href: "/explorer", label: "Explorer", tone: "success" },
        ]}
        title="Próximos passos"
      />

      {error ? (
        <EmptyState
          action={
            <Button onClick={() => setReloadKey((current) => current + 1)} size="sm" variant="outline">
              Tentar novamente
            </Button>
          }
          description={error}
          title="Não foi possível carregar o Airflow"
        />
      ) : null}

      {summary ? (
        <>
          <Card className="border-border/80 bg-surface shadow-card">
            <CardContent className="space-y-4 p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Leitura rápida</p>
                  <h3 className="mt-1 text-2xl font-semibold tracking-tight text-text">O que este diagnóstico indica agora</h3>
                </div>
                <Badge tone={overallReading.tone}>{overallReading.label}</Badge>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <IntegrationMetricCard
                  hint={summary.status_message || "Respondeu na última leitura técnica."}
                  label="Integração Airflow"
                  value={formatStatusLabel(summary.integration_status)}
                />
                <IntegrationMetricCard
                  hint="Execuções com erro na janela recente."
                  label="Falhas nas últimas 24h"
                  value={formatCompactNumber(summary.failed_runs_24h)}
                />
                <IntegrationMetricCard
                  hint={
                    summary.task_failures_24h > 0
                      ? "Falhas novas materializadas nas últimas 24h."
                      : "Pode incluir falhas históricas já materializadas nas views operacionais."
                  }
                  label="Tasks com erro no histórico"
                  value={formatCompactNumber(detailedFailureItems.length)}
                />
                <IntegrationMetricCard
                  hint="Pipelines pausadas podem deixar tabelas sem atualização."
                  label="DAGs pausadas"
                  value={formatCompactNumber(summary.paused_dags)}
                />
                <IntegrationMetricCard
                  hint="Últimas execuções observadas na janela atual."
                  label="Runs recentes com sucesso"
                  value={formatCompactNumber(summary.success_runs_24h)}
                />
                <IntegrationMetricCard
                  hint="Execuções ativas na leitura atual."
                  label="Runs em execução"
                  value={formatCompactNumber(runningRunCount)}
                />
              </div>
              {summary.failed_runs_24h === 0 && detailedFailureItems.length > 0 ? (
                <div className="rounded-2xl border border-warning-200 bg-warning-50 px-4 py-3 text-sm text-warning-800">
                  Não há falhas novas nas últimas 24h, mas existem tasks com erro no histórico técnico. Revise se essas falhas já foram tratadas ou se ainda
                  impactam a operação.
                </div>
              ) : null}
              <p className="text-sm leading-6 text-text-body">{overallReading.message}</p>
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-surface shadow-card">
            <CardContent className="space-y-4 p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Catálogo de DAGs</p>
                  <h3 className="mt-1 text-2xl font-semibold tracking-tight text-text">DAGs do Airflow</h3>
                  <p className="text-sm leading-6 text-text-body">
                    Lista paginada das DAGs com descrição, agendamento, tags, próximo disparo e estado da última execução.
                  </p>
                </div>
                <Badge tone="neutral">{formatCompactNumber(pipelines?.total ?? 0)} DAG(s)</Badge>
              </div>

              <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Buscar DAG</p>
                  <input
                    className="mt-2 h-10 w-full rounded-xl border border-border/70 bg-surface px-3 text-sm text-text-body outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                    onChange={(event) => setDagSearchInput(event.target.value)}
                    placeholder="Buscar por dag_id, descrição, owner..."
                    value={dagSearchInput}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {([
                    ["all", "Todas"],
                    ["active", "Ativas"],
                    ["paused", "Pausadas"],
                    ["failing", "Com falha 24h"],
                  ] as const).map(([value, label]) => (
                    <Button
                      className={dagStatus === value ? "border-brand-700 bg-brand-700 text-white hover:bg-brand-700" : ""}
                      key={value}
                      onClick={() => setDagStatus(value)}
                      size="sm"
                      variant={dagStatus === value ? "default" : "outline"}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>

              {pipelinesError ? (
                <div className="rounded-2xl border border-warning-200 bg-warning-50 px-4 py-3 text-sm text-warning-800">{pipelinesError}</div>
              ) : null}

              {pipelinesLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <Skeleton className="h-28 w-full" key={index} />
                  ))}
                </div>
              ) : pipelines && pipelines.items.length > 0 ? (
                <div className="space-y-3">
                  {pipelines.items.map((dag) => {
                    const dagHref = buildAirflowDagHref(summary.airflow_ui_base_url, dag.dag_id);
                    return (
                      <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4" key={dag.dag_id}>
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-semibold text-text">{dag.dag_display_name || dag.dag_id}</p>
                            <p className="truncate font-mono text-xs text-muted" title={dag.dag_id}>{dag.dag_id}</p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge tone={dag.is_paused ? "neutral" : "success"}>{dag.is_paused ? "Pausada" : "Ativa"}</Badge>
                            {dag.latest_state ? <Badge tone={pipelineStateTone(dag.is_paused, dag.latest_state)}>{formatStatusLabel(dag.latest_state)}</Badge> : null}
                            {dag.has_import_errors ? <Badge tone="danger">Erro de import</Badge> : null}
                            {dag.recent_failures_count_24h > 0 ? <Badge tone="warning">{formatCompactNumber(dag.recent_failures_count_24h)} falha(s) 24h</Badge> : null}
                          </div>
                        </div>
                        {dag.description ? <p className="mt-2 text-sm leading-6 text-text-body">{dag.description}</p> : null}
                        <div className="mt-3 grid gap-3 text-sm text-text-body md:grid-cols-2 xl:grid-cols-4">
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Agendamento</p>
                            <p className="mt-1 font-medium text-text">{formatScheduleLabel(dag)}</p>
                            <p className="mt-1 text-xs text-muted">Owner: {dag.owner || "Sem owner"}</p>
                          </div>
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Última execução</p>
                            <p className="mt-1 font-medium text-text">{formatDateTime(dag.latest_execution_at)}</p>
                            <p className="mt-1 text-xs text-muted">Duração: {formatDurationSeconds(dag.latest_duration_seconds)}</p>
                          </div>
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Próximo disparo</p>
                            <p className="mt-1 font-medium text-text">{dag.next_dagrun_at ? formatDateTime(dag.next_dagrun_at) : "Sem previsão"}</p>
                            <p className="mt-1 text-xs text-muted">Runs 24h: {formatCompactNumber(dag.recent_runs_count_24h)}</p>
                          </div>
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Tags</p>
                            <div className="mt-1 flex flex-wrap gap-1.5">
                              {dag.tags.length > 0 ? (
                                dag.tags.slice(0, 6).map((tag) => (
                                  <span className="inline-flex items-center rounded-md border border-border bg-surface px-2 py-0.5 text-[11px] text-text-body" key={tag}>
                                    {tag}
                                  </span>
                                ))
                              ) : (
                                <span className="text-xs text-muted">Sem tags</span>
                              )}
                              {dag.tags.length > 6 ? <span className="text-[11px] text-muted">+{dag.tags.length - 6}</span> : null}
                            </div>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/integrations/airflow?dagId=${encodeURIComponent(dag.dag_id)}`}>Ver execuções e falhas</Link>
                          </Button>
                          {dagHref ? (
                            <Button asChild size="sm" variant="ghost">
                              <Link href={dagHref} rel="noreferrer" target="_blank">Abrir DAG no Airflow</Link>
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState
                  title={dagSearch || dagStatus !== "all" ? "Nenhuma DAG para o filtro" : "Sem DAGs cadastradas"}
                  description={
                    dagSearch || dagStatus !== "all"
                      ? "Ajuste a busca ou o filtro de status para encontrar a DAG desejada."
                      : "A integração está conectada, mas ainda não há DAGs na camada modelada."
                  }
                />
              )}

              {pipelines && pipelines.total_pages > 1 ? (
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-4">
                  <p className="text-sm text-text-body">
                    Página {formatCompactNumber(pipelines.page)} de {formatCompactNumber(pipelines.total_pages)} · {formatCompactNumber(pipelines.total)} DAG(s)
                  </p>
                  <div className="flex gap-2">
                    <Button
                      disabled={pipelines.page <= 1 || pipelinesLoading}
                      onClick={() => setDagPage((current) => Math.max(current - 1, 1))}
                      size="sm"
                      variant="outline"
                    >
                      Anterior
                    </Button>
                    <Button
                      disabled={pipelines.page >= pipelines.total_pages || pipelinesLoading}
                      onClick={() => setDagPage((current) => current + 1)}
                      size="sm"
                      variant="outline"
                    >
                      Próxima
                    </Button>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-surface shadow-card">
            <CardContent className="space-y-4 p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Atenção técnica</p>
                  <h3 className="mt-1 text-2xl font-semibold tracking-tight text-text">Itens que merecem investigação no Airflow</h3>
                </div>
                <Badge tone={detailedFailureItems.length > 0 ? "warning" : "success"}>{formatCompactNumber(detailedFailureItems.length)} item(ns)</Badge>
              </div>

              <div className="grid gap-4 xl:grid-cols-[1fr_0.85fr]">
                <div className="space-y-3 rounded-2xl border border-border/80 bg-bg-subtle/80 p-4">
                  <div className="grid gap-3 md:grid-cols-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">DAG</p>
                      <input
                        className="mt-2 h-10 w-full rounded-xl border border-border/70 bg-surface px-3 text-sm text-text-body outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                        onChange={(event) => setRunSearch(event.target.value)}
                        placeholder="Buscar DAG / run"
                        value={runSearch}
                      />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Task</p>
                      <input
                        className="mt-2 h-10 w-full rounded-xl border border-border/70 bg-surface px-3 text-sm text-text-body outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                        onChange={(event) => setFailureSearch(event.target.value)}
                        placeholder="Buscar task / erro"
                        value={failureSearch}
                      />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Filtro</p>
                      <select
                        className="mt-2 h-10 w-full rounded-xl border border-border/70 bg-surface px-3 text-sm text-text-body outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                        onChange={(event) => setFailureFilter(event.target.value as typeof failureFilter)}
                        value={failureFilter}
                      >
                        <option value="all">Todas as falhas</option>
                        <option value="task">Falha da task</option>
                        <option value="upstream">Falha upstream</option>
                        <option value="recent24h">Últimas 24h</option>
                        <option value="recent7d">Últimos 7 dias</option>
                        </select>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Run</p>
                      <select
                        className="mt-2 h-10 w-full rounded-xl border border-border/70 bg-surface px-3 text-sm text-text-body outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                        onChange={(event) => setRunFilter(event.target.value as typeof runFilter)}
                        value={runFilter}
                      >
                        <option value="all">Todas as runs</option>
                        <option value="success">Sucesso</option>
                        <option value="running">Em execução</option>
                        <option value="failed">Falha</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[
                      ["all", "Tudo"],
                      ["task", "Task principal"],
                      ["upstream", "Upstream"],
                      ["recent24h", "24h"],
                      ["recent7d", "7 dias"],
                    ].map(([value, label]) => (
                      <Button
                        className={failureFilter === value ? "border-brand-700 bg-brand-700 text-white hover:bg-brand-700" : ""}
                        key={value}
                        onClick={() => setFailureFilter(value as typeof failureFilter)}
                        size="sm"
                        variant={failureFilter === value ? "default" : "outline"}
                      >
                        {label}
                      </Button>
                    ))}
                    <Button
                      onClick={() => {
                        setFailureFilter("all");
                        setFailureSearch("");
                        setRunSearch("");
                        setRunFilter("all");
                        setShowAllFailures(false);
                        setShowAllRuns(false);
                      }}
                      size="sm"
                      variant="ghost"
                    >
                      Limpar filtros
                    </Button>
                  </div>
                  <p className="text-sm leading-6 text-text-body">
                    Falhas 24h considera as execuções com erro na janela recente. Tasks com erro pode incluir histórico técnico materializado fora da janela.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Falhas recentes x históricas</p>
                    <div className="mt-3 space-y-2 text-sm text-text-body">
                      <p>Falhas 24h: {formatCompactNumber(summary.failed_runs_24h)}.</p>
                      <p>Tasks com erro no histórico: {formatCompactNumber(detailedFailureItems.length)}.</p>
                      <p>Falhas reais da task: {formatCompactNumber(operationalFailures.length)}.</p>
                      <p>Falhas upstream: {formatCompactNumber(upstreamFailures.length)}.</p>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">O que investigar agora</p>
                    <div className="mt-3 space-y-2 text-sm leading-6 text-text-body">
                      <p>• Task principal falhou: abrir DAG, revisar logs e parâmetros.</p>
                      <p>• Falha upstream: investigar a task anterior com erro real.</p>
                      <p>• DAG pausada: validar se há pipelines sem atualização por decisão operacional.</p>
                      <p>• Integração conectada, mas com pendências: comparar com Ingestion e Ops Cockpit.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
                <IntegrationMetricCard label="Total de DAGs" value={formatCompactNumber(summary.total_dags)} hint="Quantidade de DAGs conhecidas pela integração." />
                <IntegrationMetricCard label="DAGs ativas" value={formatCompactNumber(summary.active_dags)} hint="DAGs liberadas para execução." />
                <IntegrationMetricCard label="DAGs pausadas" value={formatCompactNumber(summary.paused_dags)} hint="Pipelines pausadas na origem." />
                <IntegrationMetricCard label="Sucessos 24h" value={formatCompactNumber(summary.success_runs_24h)} hint="Execuções bem-sucedidas nas últimas 24 horas." />
                <IntegrationMetricCard label="Falhas 24h" value={formatCompactNumber(summary.failed_runs_24h)} hint="Execuções com falha nas últimas 24 horas." />
              </div>
              {failuresError ? <div className="rounded-2xl border border-warning-200 bg-warning-50 px-4 py-3 text-sm text-warning-800">{failuresError}</div> : null}
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-surface shadow-card">
            <CardContent className="space-y-4 p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Saúde da integração</p>
                  <h3 className="mt-1 text-2xl font-semibold tracking-tight text-text">Estado do orquestrador</h3>
                </div>
                <Badge tone={formatStatusTone(summary.operational_status)}>{formatStatusLabel(summary.operational_status)}</Badge>
              </div>
              <p className="text-sm leading-7 text-text-body">{operationalMessage}</p>
            </CardContent>
          </Card>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card className="border-border/80 bg-surface shadow-card">
              <CardContent className="space-y-4 p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Runs recentes</p>
                    <h3 className="mt-1 text-2xl font-semibold tracking-tight text-text">Runs recentes</h3>
                  </div>
                  <Badge tone="neutral">
                    {formatCompactNumber(displayedRuns.length)} de {formatCompactNumber(filteredPipelineItems.length)} run(s)
                  </Badge>
                </div>
                {displayedRuns.length > 0 ? (
                  <div className="space-y-3">
                    {displayedRuns.slice(0, showAllRuns ? displayedRuns.length : 5).map((item) => {
                      const dagHref = buildAirflowDagHref(summary.airflow_ui_base_url, item.dag_id);
                      const runHref = buildAirflowRunHref(summary.airflow_ui_base_url, item.dag_id, item.run_id);
                      return (
                        <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4" key={`${item.dag_id}-${item.run_id}`}>
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-semibold text-text">{item.dag_display_name || item.dag_id}</p>
                              <p className="truncate text-sm text-muted" title={item.run_id}>
                                {truncateRunId(item.run_id)}
                              </p>
                            </div>
                            <Badge tone={pipelineStateTone(item.is_paused, item.state)}>{formatStatusLabel(item.state)}</Badge>
                          </div>
                          <div className="mt-3 grid gap-3 text-sm text-text-body md:grid-cols-2">
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Execução</p>
                              <p className="mt-1 font-medium text-text">{formatDateTime(item.end_date || item.start_date || item.logical_date || item.execution_date)}</p>
                              <p className="mt-1 text-xs text-muted">Run type: {item.run_type || "Sem informação"}</p>
                              <p className="mt-1 text-xs text-muted">Logical date: {item.logical_date ? formatDateTime(item.logical_date) : "Sem logical date informada"}</p>
                            </div>
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Duração</p>
                              <p className="mt-1 font-medium text-text">{formatDurationSeconds(item.duration_seconds)}</p>
                              <p className="mt-1 text-xs text-muted">Queued at: {formatDateTime(item.queued_at)}</p>
                              <p className="mt-1 text-xs text-muted">External trigger: {item.external_trigger ? "Sim" : "Não"}</p>
                            </div>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {runHref ? (
                              <Button asChild size="sm" variant="outline">
                                <Link href={runHref} rel="noreferrer" target="_blank">
                                  Abrir execução no Airflow
                                </Link>
                              </Button>
                            ) : null}
                            {dagHref ? (
                              <Button asChild size="sm" variant="ghost">
                                <Link href={dagHref} rel="noreferrer" target="_blank">
                                  Abrir DAG no Airflow
                                </Link>
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      );})}
                  </div>
                ) : (
                  <EmptyState
                    title={dagId ? "Nenhuma DAG correspondente" : "Sem DAGs cadastradas"}
                    description={
                      dagId
                        ? "Não encontramos execuções recentes para a DAG em foco. Volte ao resumo global para visualizar todas as integrações."
                        : "A integração está saudável, mas ainda não há pipelines disponíveis para exibição."
                      }
                    />
                  )}
                {displayedRuns.length > 5 ? (
                  <div className="flex justify-center">
                    <Button onClick={() => setShowAllRuns((current) => !current)} size="sm" variant="outline">
                      {showAllRuns ? "Mostrar menos" : "Ver mais runs"}
                    </Button>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card className="border-border/80 bg-surface shadow-card">
              <CardContent className="space-y-4 p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Histórico técnico</p>
                    <h3 className="mt-1 text-2xl font-semibold tracking-tight text-text">Tasks com erro</h3>
                  </div>
                  <Badge tone="warning">
                    {formatCompactNumber(displayedFailures.length)} de {formatCompactNumber(filteredFailureItems.length)} task(s)
                  </Badge>
                </div>
                {displayedFailures.length > 0 ? (
                  <div className="space-y-3">
                    {displayedFailures.slice(0, showAllFailures ? displayedFailures.length : 5).map((item) => {
                      const taskHref = buildAirflowTaskHref(summary.airflow_ui_base_url, item.dag_id, item.task_id);
                      const dagHref = buildAirflowDagHref(summary.airflow_ui_base_url, item.dag_id);
                      const isUpstream = normalizeText(item.state) === "upstream_failed";
                      return (
                      <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4" key={`${item.dag_id}-${item.task_id}-${item.run_id}`}>
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-semibold text-text">{item.task_display_name || item.task_id}</p>
                            <p className="truncate text-sm text-muted" title={`${item.dag_id} · ${item.run_id}`}>
                              {item.dag_id} · {truncateRunId(item.run_id)}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Badge tone={failureTone(item)}>{failureCategory(item)}</Badge>
                            <Badge tone="warning">{formatStatusLabel(item.state)}</Badge>
                          </div>
                        </div>
                        <div className="mt-3 grid gap-3 text-sm text-text-body md:grid-cols-2">
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Detalhes técnicos</p>
                            {item.operator ? <p className="mt-1">Operator: {item.operator}</p> : null}
                            {item.queue ? <p className="mt-1">Queue: {item.queue}</p> : null}
                            {item.hostname ? <p className="mt-1">Hostname: {item.hostname}</p> : null}
                            <p className="mt-1">Retries: {item.try_number ?? 0} tentativa(s)</p>
                            {item.job_id != null ? <p className="mt-1">Job ID: {item.job_id}</p> : null}
                          </div>
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Falha</p>
                            {item.failure_at ? <p className="mt-1">Failure at: {formatDateTime(item.failure_at)}</p> : null}
                            {item.last_task_fail_at ? <p className="mt-1">Last fail: {formatDateTime(item.last_task_fail_at)}</p> : null}
                            <p className="mt-1">Task fail count: {item.task_fail_count}</p>
                            {item.log_dttm ? <p className="mt-1">Log at: {formatDateTime(item.log_dttm)}</p> : null}
                          </div>
                        </div>
                        <p className="mt-3 text-sm leading-7 text-text-body">
                          {item.troubleshooting_context || item.log_event || (isUpstream ? "Falha upstream: investigue primeiro a task anterior com erro real." : "Falha recente materializada nas views operacionais.")}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {taskHref ? (
                            <Button asChild size="sm" variant="outline">
                              <Link href={taskHref} rel="noreferrer" target="_blank">
                                Abrir task no Airflow
                              </Link>
                            </Button>
                          ) : null}
                          {dagHref ? (
                            <Button asChild size="sm" variant="ghost">
                              <Link href={dagHref} rel="noreferrer" target="_blank">
                                Abrir DAG no Airflow
                              </Link>
                            </Button>
                          ) : null}
                          <Button asChild size="sm" variant="ghost">
                            <Link href="/ops/ingestion">Voltar para Ingestion</Link>
                          </Button>
                        </div>
                      </div>
                    );})}
                  </div>
                ) : (
                  <EmptyState
                    title={dagId ? "Nenhuma falha na DAG em foco" : "Sem falhas recentes"}
                    description={
                      dagId
                        ? "Não há tasks falhadas nas últimas execuções dessa DAG nas views modeladas em t2c_data."
                        : "Não há tasks falhadas nas últimas execuções materializadas no Airflow."
                    }
                    />
                  )}
                {displayedFailures.length > 5 ? (
                  <div className="flex justify-center">
                    <Button onClick={() => setShowAllFailures((current) => !current)} size="sm" variant="outline">
                      {showAllFailures ? "Mostrar menos" : "Ver mais tasks"}
                    </Button>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <EmptyState
          action={
            <Button onClick={() => setReloadKey((current) => current + 1)} size="sm" variant="outline">
              Recarregar visão
            </Button>
          }
          description="Não foi possível carregar os dados operacionais do Airflow neste momento."
          title="Integração em evolução"
        />
      )}
    </div>
  );
}
