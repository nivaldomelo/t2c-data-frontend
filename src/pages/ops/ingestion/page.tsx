import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@/lib/next-shims";
import { useSearchParams } from "@/lib/next-shims";
import { ArrowLeft } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { ExplorerIngestionLogsDialog } from "@/features/explorer/components/ingestion-logs-dialog";
import type { TableIngestionDetail, TableIngestionExecutionLogs } from "@/features/explorer/types";
import { formatCompactNumber, formatDateTime, formatDuration, ingestionStatusTone } from "@/features/explorer/utils";
import { trackPlatformEvent } from "@/features/platform/client";
import { OpsIngestionOverview } from "@/features/platform/components/ops-ingestion-overview";
import type { PlatformIngestionOverview } from "@/features/platform/types";
import { apiRequest } from "@/lib/client-api";

export default function OpsIngestionPage() {
  const searchParams = useSearchParams();
  const schema = searchParams.get("schema");
  const table = searchParams.get("table");
  const dagId = searchParams.get("dagId");
  const pipelineId = searchParams.get("pipelineId");
  const isContextual = Boolean(schema && table);

  const [detail, setDetail] = useState<TableIngestionDetail | null>(null);
  const [overview, setOverview] = useState<PlatformIngestionOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [logs, setLogs] = useState<TableIngestionExecutionLogs["items"]>([]);
  const [logsExecutionId, setLogsExecutionId] = useState<string | null>(null);
  const [logsOpen, setLogsOpen] = useState(false);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsLoadingMore, setLogsLoadingMore] = useState(false);
  const [logsError, setLogsError] = useState("");
  const [logsTotal, setLogsTotal] = useState<number | null>(null);
  const [logsPage, setLogsPage] = useState(1);

  const LOGS_PAGE_SIZE = 200;
  const [reloadKey, setReloadKey] = useState(0);
  const [overviewSearch, setOverviewSearch] = useState("");
  const [overviewStatus, setOverviewStatus] = useState("all");
  const [executionsPage, setExecutionsPage] = useState(1);
  const [executionsReloading, setExecutionsReloading] = useState(false);
  const loadedIdentityRef = useRef<string | null>(null);

  const EXECUTIONS_PAGE_SIZE = 20;

  const requestUrl = useMemo(() => {
    if (!isContextual || !schema || !table) return null;
    return `/v1/ingestion/table/${encodeURIComponent(schema)}/${encodeURIComponent(table)}?page=${executionsPage}&page_size=${EXECUTIONS_PAGE_SIZE}`;
  }, [isContextual, schema, table, executionsPage]);

  useEffect(() => {
    const metadata: Record<string, string> = { mode: isContextual ? "contextual" : "overview" };
    if (schema) metadata.schema = schema;
    if (table) metadata.table = table;
    if (dagId) metadata.dag_id = dagId;
    if (pipelineId) metadata.pipeline_id = pipelineId;
    void trackPlatformEvent({
      event_name: "page_view",
      module_name: "ops_ingestion",
      page_path: "/ops/ingestion",
      metadata,
    });
  }, [isContextual, schema, table, dagId, pipelineId]);

  useEffect(() => {
    let cancelled = false;
    if (!isContextual) {
      setLoading(true);
      setError("");
      setDetail(null);
      setOverview(null);
      void (async () => {
        try {
          const payload = await apiRequest<PlatformIngestionOverview>("/v1/ingestion/overview?limit=8");
          if (!cancelled) setOverview(payload);
        } catch (err) {
          if (!cancelled) {
            setOverview(null);
            setError(err instanceof Error ? err.message : "Não foi possível carregar a visão operacional de ingestão.");
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }
    if (!requestUrl) {
      setLoading(false);
      setDetail(null);
      setError("Não foi possível preparar a consulta do histórico operacional.");
      return;
    }
    // Reset to page 1 when the selected table changes, before fetching the new one.
    const identity = `${schema}|${table}`;
    const isIdentityChange = loadedIdentityRef.current !== identity;
    if (isIdentityChange && executionsPage !== 1) {
      setExecutionsPage(1);
      return;
    }
    if (isIdentityChange) {
      setLoading(true);
      setDetail(null);
    } else {
      setExecutionsReloading(true);
    }
    setError("");
    void (async () => {
      try {
        const payload = await apiRequest<TableIngestionDetail>(requestUrl);
        if (!cancelled) {
          setDetail(payload);
          loadedIdentityRef.current = identity;
        }
      } catch (err) {
        if (!cancelled) {
          if (isIdentityChange) setDetail(null);
          setError(err instanceof Error ? err.message : "Não foi possível carregar o histórico do pipeline.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setExecutionsReloading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isContextual, requestUrl, reloadKey, schema, table, executionsPage]);

  async function openLogs(executionId: string) {
    setLogsOpen(true);
    setLogsExecutionId(executionId);
    setLogsLoading(true);
    setLogsError("");
    setLogs([]);
    setLogsTotal(null);
    setLogsPage(1);
    try {
      const payload = await apiRequest<TableIngestionExecutionLogs>(
        `/v1/ingestion/logs?execucao_id=${encodeURIComponent(executionId)}&page=1&page_size=${LOGS_PAGE_SIZE}`,
      );
      setLogs(payload.items || []);
      setLogsTotal(payload.total ?? null);
    } catch (err) {
      setLogs([]);
      setLogsError(err instanceof Error ? err.message : "Não foi possível carregar os logs desta execução.");
    } finally {
      setLogsLoading(false);
    }
  }

  async function loadMoreLogs() {
    if (!logsExecutionId || logsLoadingMore) return;
    const nextPage = logsPage + 1;
    setLogsLoadingMore(true);
    try {
      const payload = await apiRequest<TableIngestionExecutionLogs>(
        `/v1/ingestion/logs?execucao_id=${encodeURIComponent(logsExecutionId)}&page=${nextPage}&page_size=${LOGS_PAGE_SIZE}`,
      );
      setLogs((current) => [...current, ...(payload.items || [])]);
      setLogsTotal(payload.total ?? logsTotal);
      setLogsPage(nextPage);
    } catch (err) {
      setLogsError(err instanceof Error ? err.message : "Não foi possível carregar mais logs.");
    } finally {
      setLogsLoadingMore(false);
    }
  }

  const summary = detail?.summary ?? null;
  const primaryPipeline = summary?.primary_pipeline ?? null;
  const executions = detail?.executions.items ?? [];
  const executionsTotal = detail?.executions.total ?? 0;
  const executionsTotalPages = Math.max(1, Math.ceil(executionsTotal / EXECUTIONS_PAGE_SIZE));
  const stability = detail?.stability ?? null;
  const history = detail?.history ?? [];

  if (!isContextual) {
    return (
      <OpsIngestionOverview
        error={error}
        loading={loading}
        onClearFilters={() => {
          setOverviewSearch("");
          setOverviewStatus("all");
        }}
        onRetry={() => setReloadKey((current) => current + 1)}
        onSearchTermChange={setOverviewSearch}
        onStatusFilterChange={setOverviewStatus}
        searchTerm={overviewSearch}
        statusFilter={overviewStatus}
        summary={overview}
      />
    );
  }

  return (
    <div className="space-y-6 pb-6">
      <Card className="border-border bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_55%,#eef6ff_100%)] shadow-[0_18px_48px_rgba(15,23,42,0.06)]">
        <CardContent className="space-y-4 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Histórico operacional</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-text">{schema && table ? `${schema}.${table}` : "Pipeline operacional"}</h2>
              <p className="mt-2 max-w-4xl text-sm leading-7 text-text-body">
                Visão dedicada para acompanhar a atualização da tabela, revisar execuções recentes e abrir o diagnóstico técnico do Airflow sem perder o contexto operacional.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {primaryPipeline?.latest_status_label ? <Badge tone={ingestionStatusTone(primaryPipeline.latest_status_label)}>{primaryPipeline.latest_status_label}</Badge> : null}
              {stability?.recurrent_degradation ? <Badge tone="warning">Degradação recorrente</Badge> : null}
              {schema && table ? (
                <Button asChild size="sm" variant="outline">
                  <Link href="/explorer">Voltar ao Explorer</Link>
                </Button>
              ) : null}
              {primaryPipeline?.dag_id ? (
                <Button asChild size="sm" variant="outline">
                  <Link href={`/integrations/airflow?${new URLSearchParams({ dagId: primaryPipeline.dag_id, ...(schema && table ? { schema, table } : {}) }).toString()}`}>
                    Ver diagnóstico no Airflow
                  </Link>
                </Button>
              ) : null}
              <Button asChild size="sm" variant="ghost">
                <Link href="/ops/ingestion">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Voltar à visão geral
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      ) : null}

      {!loading && error ? (
        <EmptyState
          action={
            <Button onClick={() => setReloadKey((current) => current + 1)} size="sm" variant="outline">
              Tentar novamente
            </Button>
          }
          title="Não foi possível carregar a ingestão"
          description={error}
        />
      ) : null}

      {!loading && !error && summary?.linked === false ? (
        <EmptyState title="Sem pipeline vinculado" description={summary.message || "Não há pipeline Airflow associado a esta tabela."} />
      ) : null}

      {!loading && !error && summary?.linked && primaryPipeline ? (
        <>
          <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
            <Card className="border-border bg-surface shadow-[0_12px_36px_rgba(15,23,42,0.05)]">
              <CardContent className="grid gap-4 p-5 sm:grid-cols-2">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Pipeline</p>
                  <p className="mt-2 text-base font-semibold text-text">{primaryPipeline.pipeline_name || "Pipeline sem nome"}</p>
                  <p className="mt-1 text-sm text-text-body">DAG: {primaryPipeline.dag_id || "-"}</p>
                  <p className="mt-1 text-sm text-text-body">Task: {primaryPipeline.task_name || "-"}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {primaryPipeline.airflow_dag_href ? (
                      <Button asChild size="sm" variant="outline">
                        <Link href={primaryPipeline.airflow_dag_href} rel="noreferrer" target="_blank">Abrir DAG no Airflow</Link>
                      </Button>
                    ) : null}
                    {primaryPipeline.airflow_task_href ? (
                      <Button asChild size="sm" variant="outline">
                        <Link href={primaryPipeline.airflow_task_href} rel="noreferrer" target="_blank">Abrir task no Airflow</Link>
                      </Button>
                    ) : null}
                    <Button asChild size="sm" variant="ghost">
                      <Link href="/ops/ingestion">Ver visão geral operacional</Link>
                    </Button>
                  </div>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Atualização</p>
                  <p className="mt-2 text-sm font-medium text-text">Último sucesso {formatDateTime(primaryPipeline.last_success_at)}</p>
                  <p className="mt-1 text-sm text-text-body">Última execução {formatDateTime(primaryPipeline.last_execution_finished_at || primaryPipeline.last_execution_started_at)}</p>
                  <p className="mt-1 text-sm text-text-body">Watermark {primaryPipeline.watermark_value || "-"}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Origem</p>
                  <p className="mt-2 text-sm font-medium text-text">{primaryPipeline.source_connection || "Origem não informada"}</p>
                  <p className="mt-1 text-sm text-text-body">{primaryPipeline.source_database || "-"} · {primaryPipeline.source_table || "-"}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Carga</p>
                  <p className="mt-2 text-sm font-medium text-text">{primaryPipeline.load_type_label || "Tipo não informado"}</p>
                  <p className="mt-1 text-sm text-text-body">Coluna de watermark {primaryPipeline.watermark_column || "-"}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-surface shadow-[0_12px_36px_rgba(15,23,42,0.05)]">
              <CardContent className="space-y-4 p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Situação operacional</p>
                <div className="flex flex-wrap gap-2">
                  <Badge tone={ingestionStatusTone(primaryPipeline.latest_status_label)}>{primaryPipeline.latest_status_label}</Badge>
                  {summary.pipeline_count > 1 ? <Badge tone="warning">{summary.pipeline_count} pipelines vinculados</Badge> : null}
                </div>
                <p className="text-sm text-text-body">Linhas processadas: {formatCompactNumber(primaryPipeline.rows_processed)}</p>
                {primaryPipeline.last_error ? (
                  <div className="rounded-2xl border border-warning-200 bg-warning-50 px-4 py-3 text-sm text-warning-700">
                    {primaryPipeline.last_error}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-success-200 bg-success-50 px-4 py-3 text-sm text-success-700">
                    Nenhum erro recente registrado para o pipeline principal.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="border-border bg-surface shadow-[0_12px_36px_rgba(15,23,42,0.05)]">
            <CardContent className="space-y-4 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Execuções recentes</p>
                  <h3 className="mt-2 text-lg font-semibold text-text">Histórico do pipeline</h3>
                </div>
                {executionsReloading ? <span className="text-xs text-muted">Atualizando…</span> : null}
              </div>
              {executions.length ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-border text-sm">
                    <thead className="bg-bg-subtle/80 text-left text-xs uppercase tracking-[0.16em] text-muted">
                      <tr>
                        <th className="px-4 py-3">Execução</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Janela</th>
                        <th className="px-4 py-3">Volume</th>
                        <th className="px-4 py-3">Watermark</th>
                        <th className="px-4 py-3 text-right">Logs</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border bg-surface">
                      {executions.map((execution) => (
                        <tr key={execution.execution_id}>
                          <td className="px-4 py-4">
                            <p className="font-medium text-text">{execution.pipeline_name || execution.execution_id}</p>
                            <p className="mt-1 text-xs text-muted">{execution.dag_id || execution.execution_id}</p>
                          </td>
                          <td className="px-4 py-4">
                            <Badge tone={ingestionStatusTone(execution.status_label)}>{execution.status_label || "Sem execução"}</Badge>
                          </td>
                          <td className="px-4 py-4 text-text-body">
                            <p>{formatDateTime(execution.started_at)}</p>
                            <p className="mt-1 text-xs text-muted">Fim {formatDateTime(execution.finished_at)} · {formatDuration(execution.duration_seconds)}</p>
                          </td>
                          <td className="px-4 py-4 text-text-body">
                            <p>Extraídas {formatCompactNumber(execution.rows_extracted)}</p>
                            <p className="mt-1">Gravadas {formatCompactNumber(execution.rows_written)}</p>
                          </td>
                          <td className="px-4 py-4 text-text-body">
                            <p>Antes {execution.watermark_before || "-"}</p>
                            <p className="mt-1">Depois {execution.watermark_after || "-"}</p>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <div className="flex flex-wrap justify-end gap-2">
                              {execution.airflow_run_href ? (
                                <Button asChild size="sm" variant="ghost">
                                  <Link href={execution.airflow_run_href} rel="noreferrer" target="_blank">Abrir run</Link>
                                </Button>
                              ) : null}
                              <Button onClick={() => void openLogs(execution.execution_id)} size="sm" variant="outline">
                                Abrir logs
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState title="Sem execuções registradas" description="O pipeline está vinculado, mas ainda não há histórico de execuções para esta tabela." />
              )}
              {executionsTotalPages > 1 ? (
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
                  <p className="text-xs text-muted">
                    Página {executionsPage} de {executionsTotalPages} · {executionsTotal} execução(ões)
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      disabled={executionsReloading || executionsPage <= 1}
                      onClick={() => setExecutionsPage((current) => Math.max(1, current - 1))}
                      size="sm"
                      variant="outline"
                    >
                      Anterior
                    </Button>
                    <Button
                      disabled={executionsReloading || executionsPage >= executionsTotalPages}
                      onClick={() => setExecutionsPage((current) => current + 1)}
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

          {stability ? (
            <Card className="border-border bg-surface shadow-[0_12px_36px_rgba(15,23,42,0.05)]">
              <CardContent className="space-y-4 p-5">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Estabilidade operacional</p>
                  <h3 className="mt-2 text-lg font-semibold text-text">Tendência recente do pipeline</h3>
                  <p className="mt-1 text-sm text-text-body">
                    Janela de {stability.window_runs} execução(ões) com taxa de sucesso de {stability.success_rate_pct.toFixed(1)}%.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge tone={stability.recurrent_degradation ? "warning" : "success"}>
                    {stability.recurrent_degradation ? "Degradação recorrente" : "Sem recorrência crítica"}
                  </Badge>
                  {stability.currently_stale ? <Badge tone="warning">Sem sucesso recente</Badge> : null}
                  <Badge tone="neutral">{stability.failed_runs} falha(s) na janela</Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  {stability.points.map((point) => (
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-medium ${
                        point.success
                          ? "border-success-200 bg-success-50 text-success-700"
                          : point.status_label === "Falha"
                            ? "border-danger-200 bg-danger-50 text-danger-700"
                            : "border-border bg-bg-subtle text-text-body"
                      }`}
                      key={`stability-${point.execution_id}`}
                      title={`${point.status_label} · ${formatDateTime(point.occurred_at)}`}
                    >
                      {point.status_label}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}

          {history.length ? (
            <Card className="border-border bg-surface shadow-[0_12px_36px_rgba(15,23,42,0.05)]">
              <CardContent className="space-y-4 p-5">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Histórico persistente</p>
                  <h3 className="mt-2 text-lg font-semibold text-text">Estabilidade por ativo ao longo do tempo</h3>
                  <p className="mt-1 text-sm text-text-body">
                    Série persistida pelo scheduler da plataforma para acompanhar recorrência, estagnação e recuperação do pipeline principal.
                  </p>
                </div>
                <div className="space-y-3">
                  {history.map((point) => (
                    <div className="rounded-2xl border border-border bg-bg-subtle p-4" key={`history-${point.bucket_start_at}`}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-text">{formatDateTime(point.bucket_start_at)}</p>
                          <p className="mt-1 text-sm text-text-body">
                            {point.pipeline_name || "Pipeline sem nome"}{point.dag_id ? ` · ${point.dag_id}` : ""}{point.task_name ? ` · ${point.task_name}` : ""}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {point.latest_status_label ? <Badge tone={ingestionStatusTone(point.latest_status_label)}>{point.latest_status_label}</Badge> : null}
                          {point.recurrent_degradation ? <Badge tone="warning">Recorrente</Badge> : null}
                          {point.currently_stale ? <Badge tone="warning">Sem sucesso recente</Badge> : null}
                        </div>
                      </div>
                      <div className="mt-3 grid gap-3 md:grid-cols-4">
                        <div className="rounded-2xl border border-border bg-surface px-4 py-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Taxa de sucesso</p>
                          <p className="mt-2 text-sm font-semibold text-text">{point.success_rate_pct.toFixed(1)}%</p>
                        </div>
                        <div className="rounded-2xl border border-border bg-surface px-4 py-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Falhas</p>
                          <p className="mt-2 text-sm font-semibold text-text">{point.failed_runs}</p>
                        </div>
                        <div className="rounded-2xl border border-border bg-surface px-4 py-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Volume</p>
                          <p className="mt-2 text-sm font-semibold text-text">{formatCompactNumber(point.rows_processed)}</p>
                        </div>
                        <div className="rounded-2xl border border-border bg-surface px-4 py-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Último sucesso</p>
                          <p className="mt-2 text-sm font-semibold text-text">{formatDateTime(point.last_success_at)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}
        </>
      ) : null}

      <ExplorerIngestionLogsDialog
        error={logsError}
        executionId={logsExecutionId}
        loading={logsLoading}
        loadingMore={logsLoadingMore}
        logs={logs}
        onClose={() => setLogsOpen(false)}
        onLoadMore={() => void loadMoreLogs()}
        open={logsOpen}
        total={logsTotal}
      />
    </div>
  );
}
