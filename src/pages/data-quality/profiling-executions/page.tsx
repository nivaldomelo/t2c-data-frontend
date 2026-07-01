import { Loader2, Play, RefreshCw, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { DQSubnav } from "@/components/data-quality/dq-subnav";
import { AssetSearchInput, type AssetSuggestion } from "@/components/ui/asset-search-input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import type {
  DQProfilingExecutionDetail,
  DQProfilingExecutionPage,
  DQProfilingExecutionSummary,
  DQProfilingLaunch,
  DQProfilingSchedule,
  TreeChildren,
  TreeDatasource,
  TreeTable,
} from "@/features/data-quality/types";
import { apiRequest } from "@/lib/client-api";
import { useAuth } from "@/lib/auth";

type TableProfilingSetting = {
  table_id: number;
  table_fqn: string | null;
  start_date: string | null;
  watermark_column: string | null;
  detected_watermark_column: string | null;
  effective_watermark_column: string | null;
  has_previous_success: boolean;
  updated_at: string | null;
};

const ACTIVE_STATUSES = new Set(["queued", "running", "executando"]);
const PAGE_SIZE = 10;
const BATCH_SCOPE_LABELS: Record<"datasource" | "schema" | "tables", string> = {
  datasource: "Data Source inteiro",
  schema: "Schema inteiro",
  tables: "Tabelas específicas",
};
const SCHEDULE_MODE_LABELS: Record<string, string> = {
  manual: "Manual",
  interval: "Intervalo técnico",
  daily: "Diário",
  weekly: "Semanal",
  biweekly: "Quinzenal",
  monthly: "Mensal",
};
const FINAL_STATUSES = new Set([
  "success",
  "concluido",
  "concluído",
  "failed",
  "falhou",
  "error",
  "timeout",
  "empty",
  "sem_dados",
  "no_data",
  "canceled",
  "cancelled",
  "partial_success",
]);

function normalizeStatus(status: string | null | undefined) {
  return String(status || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function isActiveStatus(status: string | null | undefined) {
  return ACTIVE_STATUSES.has(normalizeStatus(status));
}

function isFinalStatus(status: string | null | undefined) {
  return FINAL_STATUSES.has(normalizeStatus(status));
}

function formatDateTime(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("pt-BR");
}

function formatDuration(value: number | null) {
  if (value === null || value === undefined) return "—";
  if (value < 1000) return `${value} ms`;
  return `${(value / 1000).toFixed(1)}s`;
}

function formatScopeLabel(scope: string | null | undefined) {
  if (!scope) return "Não definido";
  return BATCH_SCOPE_LABELS[scope as keyof typeof BATCH_SCOPE_LABELS] || scope;
}

function formatScheduleModeLabel(mode: string | null | undefined) {
  if (!mode) return "Não definido";
  return SCHEDULE_MODE_LABELS[mode] || mode;
}

function formatExecutionTarget(
  execution: Pick<DQProfilingExecutionSummary, "scope" | "datasource_name" | "schema_name" | "table_fqn">,
) {
  if (execution.scope === "datasource") {
    return execution.datasource_name || "Data Source";
  }
  if (execution.scope === "schema") {
    return `${execution.datasource_name || "Data Source"} · ${execution.schema_name || "schema"}`;
  }
  if (execution.scope === "tables") {
    return execution.table_fqn || `${execution.datasource_name || "Data Source"} · tabelas específicas`;
  }
  return execution.table_fqn || "Tabela";
}

function statusBadge(status: string) {
  const normalized = normalizeStatus(status);
  if (normalized === "success" || normalized === "concluido") return <Badge tone="success">Concluído</Badge>;
  if (normalized === "no_data" || normalized === "sem_dados" || normalized === "empty") return <Badge tone="neutral">Sem dados</Badge>;
  if (normalized === "failed" || normalized === "falhou" || normalized === "error" || normalized === "timeout") {
    return <Badge tone="warning">Falhou</Badge>;
  }
  if (normalized === "partial_success") return <Badge tone="warning">Parcial</Badge>;
  if (normalized === "running" || normalized === "executando") return <Badge tone="accent">Executando</Badge>;
  if (normalized === "queued") return <Badge tone="neutral">Na fila</Badge>;
  if (normalized === "canceled" || normalized === "cancelled") return <Badge tone="neutral">Cancelado</Badge>;
  return <Badge tone="neutral">{status || "Desconhecido"}</Badge>;
}

function engineBadge(engine: string | null | undefined) {
  const normalized = String(engine || "").trim().toLowerCase();
  if (normalized === "spark") return <Badge tone="success">Spark cluster</Badge>;
  if (normalized === "python") return <Badge tone="warning">Histórico legado</Badge>;
  return <Badge tone="neutral">{engine || "Não informado"}</Badge>;
}

function profilingModeBadge(mode: string | null | undefined) {
  const normalized = String(mode || "").trim().toLowerCase();
  if (normalized === "delta") return <Badge tone="accent">Delta (incremental)</Badge>;
  if (normalized === "full") return <Badge tone="neutral">Full (completo)</Badge>;
  return null;
}

type ProfilingExecutionDetailModalProps = {
  detail: DQProfilingExecutionDetail | null;
  loading: boolean;
  open: boolean;
  onClose: () => void;
};

function ProfilingExecutionDetailModal({ detail, loading, open, onClose }: ProfilingExecutionDetailModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-md">
      <div className="w-full max-w-6xl rounded-[28px] border border-border bg-surface shadow-2xl">
        <div className="flex items-center justify-between border-b border-border bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_58%,#eef6ff_100%)] px-5 py-4">
          <div>
            <h3 className="text-base font-semibold text-text">Detalhe da execução</h3>
            <p className="text-sm text-text-body">
              Veja status, duração, erro, observações e métricas principais por tabela processada.
            </p>
          </div>
          <button
            aria-label="Fechar detalhe da execução"
            className="rounded-full border border-border p-1 hover:border-border-strong hover:bg-bg-subtle"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[80vh] overflow-auto px-5 py-4">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted">
              <Loader2 className="h-4 w-4 animate-spin" />
              Atualizando detalhe...
            </div>
          ) : detail === null ? (
            <EmptyState title="Nenhuma execução selecionada" description="Escolha uma execução na lista para abrir o detalhe." />
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-4">
                <div className="rounded-2xl border border-border bg-surface p-4">
                  <p className="text-xs uppercase tracking-wide text-muted">Execução</p>
                  <p className="mt-1 text-base font-semibold text-text">#{detail.id}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {statusBadge(detail.status)}
                    {profilingModeBadge(detail.profiling_mode)}
                  </div>
                </div>
                <div className="rounded-2xl border border-border bg-surface p-4">
                  <p className="text-xs uppercase tracking-wide text-muted">Escopo</p>
                  <p className="mt-1 text-base font-semibold text-text">
                    {formatScopeLabel(detail.scope)}
                  </p>
                  <p className="mt-2 text-sm text-text-body">
                    {formatExecutionTarget(detail)}
                  </p>
                </div>
                <div className="rounded-2xl border border-border bg-surface p-4">
                  <p className="text-xs uppercase tracking-wide text-muted">Itens processados</p>
                  <p className="mt-1 text-base font-semibold text-text">{detail.total_items}</p>
                  <p className="mt-2 text-sm text-text-body">
                    {detail.success_items} sucesso · {detail.failed_items} falha
                  </p>
                </div>
                <div className="rounded-2xl border border-border bg-surface p-4">
                  <p className="text-xs uppercase tracking-wide text-muted">Duração</p>
                  <p className="mt-1 text-base font-semibold text-text">{formatDuration(detail.duration_ms)}</p>
                  <p className="mt-2 text-sm text-text-body">{formatDateTime(detail.finished_at || detail.started_at)}</p>
                </div>
              </div>

              {detail.profiling_mode ? (
                <div className="rounded-2xl border border-border bg-bg-subtle px-4 py-3 text-sm text-text-body">
                  {detail.profiling_mode === "delta" ? (
                    <>
                      <span className="font-medium text-text">Profiling incremental (delta)</span> por{" "}
                      <span className="font-mono">{detail.watermark_column}</span> — leu apenas as linhas entre{" "}
                      {formatDateTime(detail.window_start)} e {formatDateTime(detail.window_end)}.
                    </>
                  ) : (
                    <>
                      <span className="font-medium text-text">Profiling completo (full)</span>
                      {detail.watermark_column
                        ? <> — primeira execução; as próximas serão incrementais por <span className="font-mono">{detail.watermark_column}</span>.</>
                        : <> — leitura integral da tabela (sem coluna de data/hora detectada para incremento).</>}
                    </>
                  )}
                </div>
              ) : null}

              {detail.error_message ? (
                <div className="rounded-2xl border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700">
                  {detail.error_message}
                </div>
              ) : null}

              <div className="overflow-hidden rounded-2xl border border-border">
                <div className="overflow-x-auto">
                  <div className="min-w-[760px]">
                    <div className="grid grid-cols-[minmax(220px,1.4fr)_140px_90px_90px_110px_120px] gap-3 border-b border-border bg-bg-subtle px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted">
                      <span>Tabela</span>
                      <span>Status</span>
                      <span>Linhas</span>
                      <span>DQ</span>
                      <span>Completude</span>
                      <span>Duração</span>
                    </div>
                    <div className="divide-y divide-border bg-surface">
                      {detail.items.map((item) => (
                        <div className="space-y-2 px-4 py-4" key={item.id}>
                          <div className="grid grid-cols-[minmax(220px,1.4fr)_140px_90px_90px_110px_120px] gap-3 text-sm text-text-body">
                        <div>
                          <p className="font-medium text-text">{item.table_fqn || `${item.schema_name || "schema"}.*`}</p>
                          {item.observation ? <p className="mt-1 text-xs text-muted">{item.observation}</p> : null}
                        </div>
                        <div>{statusBadge(item.status)}</div>
                        <div>{item.row_count ?? "—"}</div>
                        <div>{item.dq_score !== null && item.dq_score !== undefined ? item.dq_score.toFixed(1) : "—"}</div>
                        <div>
                          {item.completeness_pct_avg !== null && item.completeness_pct_avg !== undefined
                            ? `${item.completeness_pct_avg.toFixed(1)}%`
                            : "—"}
                        </div>
                        <div>{formatDuration(item.duration_ms)}</div>
                      </div>
                      {(item.error_message || item.failed_rules_count || item.duplicates_count) ? (
                        <div className="flex flex-wrap gap-2 text-xs text-muted">
                          {item.failed_rules_count ? <span>Regras falhas: {item.failed_rules_count}</span> : null}
                          {item.duplicates_count ? <span>Duplicidades: {item.duplicates_count}</span> : null}
                          {item.error_message ? <span className="text-danger-700">Erro: {item.error_message}</span> : null}
                        </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end border-t border-border bg-surface px-5 py-4">
          <Button onClick={onClose} type="button" variant="outline">
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function DQProfilingExecutionsPage() {
  const auth = useAuth();
  const canWrite = auth.canAction("write", "dataQuality");
  const pollTimerRef = useRef<number | null>(null);

  const [datasources, setDatasources] = useState<TreeDatasource[]>([]);
  const [schemas, setSchemas] = useState<TreeChildren["schemas"]>([]);
  const [tables, setTables] = useState<TreeTable[]>([]);
  const [loadingSources, setLoadingSources] = useState(true);
  const [loadingSchemas, setLoadingSchemas] = useState(false);
  const [loadingTables, setLoadingTables] = useState(false);

  const [selectedDatasourceId, setSelectedDatasourceId] = useState<number | "">("");
  const [batchScope, setBatchScope] = useState<"datasource" | "schema" | "tables">("datasource");
  const [selectedSchemaId, setSelectedSchemaId] = useState<number | "">("");
  const [selectedSchemaName, setSelectedSchemaName] = useState("");
  const [selectedTables, setSelectedTables] = useState<number[]>([]);
  const [tableSearch, setTableSearch] = useState("");
  const [concurrency, setConcurrency] = useState(5);
  const [statusMessage, setStatusMessage] = useState("");
  const [launching, setLaunching] = useState(false);
  const [schedules, setSchedules] = useState<DQProfilingSchedule[]>([]);
  const [schedulesLoading, setSchedulesLoading] = useState(true);
  const [schedulesRefreshing, setSchedulesRefreshing] = useState(false);
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [scheduleError, setScheduleError] = useState("");
  const [editingScheduleId, setEditingScheduleId] = useState<number | null>(null);
  const [scheduleName, setScheduleName] = useState("");
  const [scheduleMode, setScheduleMode] = useState<"manual" | "interval" | "daily" | "weekly" | "biweekly" | "monthly">("daily");
  const [scheduleEnabled, setScheduleEnabled] = useState(true);
  const [scheduleEveryMinutes, setScheduleEveryMinutes] = useState<number | null>(null);
  const [scheduleTime, setScheduleTime] = useState("08:00");
  const [scheduleTimezone, setScheduleTimezone] = useState("America/Sao_Paulo");
  const [scheduleDayOfWeek, setScheduleDayOfWeek] = useState(0);
  const [scheduleDayOfMonth, setScheduleDayOfMonth] = useState(1);

  const [executions, setExecutions] = useState<DQProfilingExecutionSummary[]>([]);
  const [executionsLoading, setExecutionsLoading] = useState(true);
  const [executionsRefreshing, setExecutionsRefreshing] = useState(false);
  const [selectedExecutionId, setSelectedExecutionId] = useState<number | null>(null);
  const [executionDetail, setExecutionDetail] = useState<DQProfilingExecutionDetail | null>(null);
  const [executionDetailLoading, setExecutionDetailLoading] = useState(false);
  const [executionDetailRefreshing, setExecutionDetailRefreshing] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // Per-table profiling settings (start date floor + watermark column) for large tables.
  const [settingsAsset, setSettingsAsset] = useState<AssetSuggestion | null>(null);
  const [settings, setSettings] = useState<TableProfilingSetting | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState("");
  const [settingsStartDate, setSettingsStartDate] = useState("");
  const [settingsColumn, setSettingsColumn] = useState("");

  // Inline per-table start-date config shown in the run-now panel when targeting a single table.
  const [runSetting, setRunSetting] = useState<TableProfilingSetting | null>(null);
  const [runStartDate, setRunStartDate] = useState("");
  const [runColumn, setRunColumn] = useState("");

  const [filterDatasourceId, setFilterDatasourceId] = useState<number | "">("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterScope, setFilterScope] = useState("");
  const [filterSearch, setFilterSearch] = useState("");
  const [filterStartedFrom, setFilterStartedFrom] = useState("");
  const [filterStartedTo, setFilterStartedTo] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalExecutions, setTotalExecutions] = useState(0);

  const filteredTables = useMemo(() => {
    const q = tableSearch.trim().toLowerCase();
    if (!q) return tables;
    return tables.filter((table) => table.name.toLowerCase().includes(q));
  }, [tableSearch, tables]);

  const selectedTableNames = useMemo(
    () => tables.filter((table) => selectedTables.includes(table.id)).map((table) => table.name),
    [selectedTables, tables],
  );
  const activeSchemaName = useMemo(
    () => (selectedSchemaId === "" ? "" : schemas.find((item) => item.id === Number(selectedSchemaId))?.name || ""),
    [schemas, selectedSchemaId],
  );
  const selectedSchemaLabel = selectedSchemaName || activeSchemaName;

  const visibleSchedules = useMemo(() => {
    if (!selectedDatasourceId) return schedules;
    return schedules.filter((schedule) => schedule.datasource_id === Number(selectedDatasourceId));
  }, [schedules, selectedDatasourceId]);

  const hasActiveExecutions = useMemo(
    () => executions.some((item) => !isFinalStatus(item.status) && isActiveStatus(item.status)),
    [executions],
  );
  const totalPages = useMemo(() => Math.max(1, Math.ceil(totalExecutions / PAGE_SIZE)), [totalExecutions]);
  const visibleRangeLabel = useMemo(() => {
    if (totalExecutions === 0) return "0 de 0 carregadas";
    return `${executions.length} de ${totalExecutions} carregadas`;
  }, [executions.length, totalExecutions]);
  const pageNumbers = useMemo(() => {
    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, start + 4);
    const adjustedStart = Math.max(1, end - 4);
    return Array.from({ length: end - adjustedStart + 1 }, (_, index) => adjustedStart + index);
  }, [currentPage, totalPages]);

  // Keep the current page within bounds if the total shrinks (e.g. after filtering
  // or when running executions complete and drop off the list).
  useEffect(() => {
    if (currentPage > totalPages) {
      void loadExecutions({ silent: true, page: totalPages });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalPages]);

  async function loadDatasources() {
    setLoadingSources(true);
    try {
      const payload = await apiRequest<TreeDatasource[]>("/v1/dq/tree");
      setDatasources(payload);
    } finally {
      setLoadingSources(false);
    }
  }

  async function loadSchemas(datasourceId: number) {
    setLoadingSchemas(true);
    try {
      const payload = await apiRequest<TreeChildren>(`/v1/dq/tree/datasources/${datasourceId}`);
      setSchemas(payload.schemas);
    } finally {
      setLoadingSchemas(false);
    }
  }

  async function loadTables(schemaId: number) {
    setLoadingTables(true);
    try {
      const payload = await apiRequest<TreeTable[]>(`/v1/dq/tree/schemas/${schemaId}/tables`);
      setTables(payload);
    } finally {
      setLoadingTables(false);
    }
  }

  async function loadSchedules(options?: { silent?: boolean }) {
    const silent = options?.silent ?? false;
    if (silent) {
      setSchedulesRefreshing(true);
    } else {
      setSchedulesLoading(true);
    }
    try {
      const payload = await apiRequest<DQProfilingSchedule[]>("/v1/dq/profiling/schedules");
      setSchedules(payload);
    } finally {
      if (silent) {
        setSchedulesRefreshing(false);
      } else {
        setSchedulesLoading(false);
      }
    }
  }

  function clearScheduleForm() {
    setEditingScheduleId(null);
    setScheduleName("");
    setScheduleMode("daily");
    setScheduleEnabled(true);
    setScheduleEveryMinutes(null);
    setScheduleTime("08:00");
    setScheduleTimezone("America/Sao_Paulo");
    setScheduleDayOfWeek(0);
    setScheduleDayOfMonth(1);
    setScheduleError("");
  }

  function hydrateScheduleForm(schedule: DQProfilingSchedule) {
    setEditingScheduleId(schedule.id);
    setScheduleName(schedule.name || schedule.target_label || "");
    setScheduleMode(schedule.schedule_mode || "daily");
    setScheduleEnabled(schedule.schedule_enabled);
    setScheduleEveryMinutes(schedule.schedule_every_minutes);
    setScheduleTime(schedule.schedule_time || "08:00");
    setScheduleTimezone(schedule.schedule_timezone || "America/Sao_Paulo");
    setScheduleDayOfWeek(schedule.schedule_day_of_week ?? 0);
    setScheduleDayOfMonth(schedule.schedule_day_of_month ?? 1);
    setScheduleError("");
  }

  async function saveSchedule() {
    if (!selectedDatasourceId) {
      setScheduleError("Selecione um Data Source antes de salvar o agendamento.");
      return;
    }
    if (batchScope !== "datasource" && batchScope !== "schema" && batchScope !== "tables") {
      setScheduleError("Escolha um escopo válido para o agendamento.");
      return;
    }
    if ((batchScope === "schema" || batchScope === "tables") && !selectedSchemaLabel) {
      setScheduleError("Selecione um schema para salvar este agendamento.");
      return;
    }
    if (batchScope === "tables" && selectedTables.length === 0) {
      setScheduleError("Selecione ao menos uma tabela para agendar este escopo.");
      return;
    }

    setScheduleSaving(true);
    setScheduleError("");
    try {
      const payload = {
        scope_type: batchScope,
        name: scheduleName.trim() || null,
        datasource_id: Number(selectedDatasourceId),
        schema_name: batchScope === "datasource" ? null : selectedSchemaLabel || null,
        table_ids: batchScope === "tables" ? selectedTables : [],
        execution_engine: "spark",
        schedule_mode: scheduleMode,
        schedule_enabled: scheduleEnabled,
        schedule_every_minutes: scheduleMode === "interval" ? Math.max(1, scheduleEveryMinutes || 60) : null,
        schedule_time: scheduleMode === "interval" ? null : scheduleTime || null,
        schedule_timezone: scheduleTimezone || null,
        schedule_day_of_week: scheduleMode === "weekly" ? scheduleDayOfWeek : null,
        schedule_day_of_month: scheduleMode === "monthly" ? scheduleDayOfMonth : null,
        schedule_anchor_date: new Date().toISOString(),
        recipient_user_ids: [],
      };
      if (editingScheduleId) {
        await apiRequest(`/v1/dq/profiling/schedules/${editingScheduleId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest(`/v1/dq/profiling/schedules`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      await loadSchedules({ silent: true });
      clearScheduleForm();
    } catch (error) {
      setScheduleError((error as Error).message || "Não foi possível salvar o agendamento.");
    } finally {
      setScheduleSaving(false);
    }
  }

  async function pauseSchedule(scheduleId: number) {
    try {
      await apiRequest(`/v1/dq/profiling/schedules/${scheduleId}/pause`, { method: "POST" });
      await loadSchedules({ silent: true });
    } catch (error) {
      setScheduleError((error as Error).message || "Não foi possível pausar o agendamento.");
    }
  }

  async function resumeSchedule(scheduleId: number) {
    try {
      await apiRequest(`/v1/dq/profiling/schedules/${scheduleId}/resume`, { method: "POST" });
      await loadSchedules({ silent: true });
    } catch (error) {
      setScheduleError((error as Error).message || "Não foi possível reativar o agendamento.");
    }
  }

  async function runScheduleNow(scheduleId: number) {
    try {
      await apiRequest(`/v1/dq/profiling/schedules/${scheduleId}/run-now`, { method: "POST" });
      await refreshVisibleExecutions({ silent: true });
      await loadSchedules({ silent: true });
    } catch (error) {
      setScheduleError((error as Error).message || "Não foi possível executar o agendamento agora.");
    }
  }

  async function deleteSchedule(scheduleId: number) {
    try {
      await apiRequest(`/v1/dq/profiling/schedules/${scheduleId}`, { method: "DELETE" });
      await loadSchedules({ silent: true });
    } catch (error) {
      setScheduleError((error as Error).message || "Não foi possível excluir o agendamento.");
    }
  }

  function buildExecutionsParams(limit: number, offset: number) {
    const params = new URLSearchParams();
    params.set("limit", String(limit));
    params.set("offset", String(offset));
    if (filterDatasourceId !== "") params.set("datasource_id", String(filterDatasourceId));
    if (filterStatus) params.set("status", filterStatus);
    if (filterScope) params.set("scope", filterScope);
    if (filterSearch.trim()) params.set("search", filterSearch.trim());
    if (filterStartedFrom) params.set("started_from", filterStartedFrom);
    if (filterStartedTo) params.set("started_to", filterStartedTo);
    return params;
  }

  async function fetchExecutionPage(limit: number, offset: number) {
    const params = buildExecutionsParams(limit, offset);
    return apiRequest<DQProfilingExecutionPage>(`/v1/dq/profiling/executions?${params.toString()}`);
  }

  async function loadExecutions(options?: { silent?: boolean; page?: number }) {
    const silent = options?.silent ?? false;
    const page = options?.page ?? currentPage;
    if (silent) {
      setExecutionsRefreshing(true);
    } else {
      setExecutionsLoading(true);
    }

    try {
      const nextOffset = (page - 1) * PAGE_SIZE;
      const payload = await fetchExecutionPage(PAGE_SIZE, nextOffset);
      const nextItems = payload.items;

      setExecutions(nextItems);
      setTotalExecutions(payload.total);
      setCurrentPage(page);
      setSelectedExecutionId((current) => {
        if (current !== null && nextItems.some((item) => item.id === current)) return current;
        return current === null && nextItems.length > 0 ? nextItems[0].id : current;
      });
    } finally {
      if (silent) {
        setExecutionsRefreshing(false);
      } else {
        setExecutionsLoading(false);
      }
    }
  }

  async function refreshVisibleExecutions(options?: { silent?: boolean }) {
    await loadExecutions({ silent: options?.silent, page: currentPage });
  }

  async function loadExecutionDetail(runId: number, options?: { silent?: boolean }) {
    const silent = options?.silent ?? false;
    if (silent) {
      setExecutionDetailRefreshing(true);
    } else {
      setExecutionDetailLoading(true);
    }

    try {
      const payload = await apiRequest<DQProfilingExecutionDetail>(`/v1/dq/profiling/executions/${runId}`);
      setExecutionDetail(payload);
    } finally {
      if (silent) {
        setExecutionDetailRefreshing(false);
      } else {
        setExecutionDetailLoading(false);
      }
    }
  }

  useEffect(() => {
    void loadDatasources();
    void loadSchedules();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
    void loadExecutions({ page: 1 });
  }, [filterDatasourceId, filterScope, filterStatus, filterSearch, filterStartedFrom, filterStartedTo]);

  useEffect(() => {
    if (batchScope === "datasource") {
      setSelectedSchemaId("");
      setSelectedSchemaName("");
      setSelectedTables([]);
    }
    if (batchScope === "schema") {
      setSelectedTables([]);
    }
  }, [batchScope]);

  useEffect(() => {
    if (selectedDatasourceId === "") {
      setSchemas([]);
      setSelectedSchemaId("");
      setSelectedSchemaName("");
      setTables([]);
      setSelectedTables([]);
      return;
    }
    setSelectedSchemaId("");
    setSelectedSchemaName("");
    setTables([]);
    setSelectedTables([]);
    void loadSchemas(Number(selectedDatasourceId));
  }, [selectedDatasourceId]);

  useEffect(() => {
    if (selectedSchemaId === "" || batchScope === "datasource") {
      setTables([]);
      setSelectedTables([]);
      return;
    }
    const schema = schemas.find((item) => item.id === Number(selectedSchemaId));
    setSelectedSchemaName(schema?.name || "");
    void loadTables(Number(selectedSchemaId));
  }, [batchScope, schemas, selectedSchemaId]);

  useEffect(() => {
    if (!detailModalOpen || selectedExecutionId === null) return;
    void loadExecutionDetail(selectedExecutionId);
  }, [detailModalOpen, selectedExecutionId]);

  useEffect(() => {
    if (pollTimerRef.current !== null) {
      window.clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }

    if (!hasActiveExecutions) return;

    pollTimerRef.current = window.setTimeout(() => {
      void refreshVisibleExecutions({ silent: true });
      if (detailModalOpen && selectedExecutionId !== null) {
        void loadExecutionDetail(selectedExecutionId, { silent: true });
      }
    }, 5000);

    return () => {
      if (pollTimerRef.current !== null) {
        window.clearTimeout(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [detailModalOpen, hasActiveExecutions, selectedExecutionId]);

  async function launchBatchProfiling() {
    if (!canWrite) return;
    if (selectedDatasourceId === "") {
      setStatusMessage("Selecione um Data Source antes de disparar o profiling.");
      return;
    }
    if ((batchScope === "schema" || batchScope === "tables") && !selectedSchemaLabel) {
      setStatusMessage("Selecione um schema para carregar as tabelas.");
      return;
    }
    if (batchScope === "tables" && selectedTables.length === 0) {
      setStatusMessage("Selecione ao menos uma tabela para o profiling por tabelas específicas.");
      return;
    }
    setLaunching(true);
    setStatusMessage("");
    try {
      // For a single-table run, persist the start-date/column first so the run honors it.
      if (singleRunTableId != null) {
        const startIso = runStartDate ? new Date(`${runStartDate}T00:00:00Z`).toISOString() : null;
        try {
          await apiRequest<TableProfilingSetting>(`/v1/dq/profiling/table-settings`, {
            method: "PUT",
            body: JSON.stringify({
              table_id: singleRunTableId,
              start_date: startIso,
              watermark_column: runColumn.trim() || null,
            }),
          });
        } catch (error) {
          setStatusMessage((error as Error).message);
          setLaunching(false);
          return;
        }
      }
      const payload = {
        scope_type: batchScope,
        datasource_id: Number(selectedDatasourceId),
        schema: batchScope === "datasource" ? null : selectedSchemaLabel || null,
        table_ids: batchScope === "tables" ? selectedTables : [],
        limit: batchScope === "tables" ? Math.max(1, selectedTables.length || filteredTables.length || 1) : 5000,
        concurrency: Math.max(1, concurrency),
        include_tables: batchScope === "schema" ? selectedTableNames : [],
        exclude_tables: [],
        execution_engine: "spark",
      };
      const launch = await apiRequest<DQProfilingLaunch>("/v1/dq/profiling/batch/run", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setStatusMessage(
        `Execução em lote enfileirada para ${launch.tables_total} tabela(s) no Spark. Escopo: ${formatScopeLabel(launch.scope)}`,
      );
      await refreshVisibleExecutions({ silent: true });
      setSelectedExecutionId(launch.run_id);
      setDetailModalOpen(true);
    } catch (error) {
      setStatusMessage((error as Error).message);
    } finally {
      setLaunching(false);
    }
  }

  function toggleTable(tableId: number) {
    setSelectedTables((current) =>
      current.includes(tableId) ? current.filter((value) => value !== tableId) : [...current, tableId],
    );
  }

  function selectAllVisibleTables() {
    setSelectedTables(filteredTables.map((table) => table.id));
  }

  function openExecutionDetail(runId: number) {
    setSelectedExecutionId(runId);
    setDetailModalOpen(true);
  }

  useEffect(() => {
    const asset = settingsAsset;
    if (!asset) {
      setSettings(null);
      setSettingsMessage("");
      return;
    }
    let active = true;
    setSettingsLoading(true);
    setSettingsMessage("");
    void (async () => {
      try {
        const data = await apiRequest<TableProfilingSetting>(`/v1/dq/profiling/table-settings?table_id=${asset.id}`);
        if (!active) return;
        setSettings(data);
        setSettingsStartDate(data.start_date ? data.start_date.slice(0, 10) : "");
        setSettingsColumn(data.watermark_column || "");
      } catch (error) {
        if (active) setSettingsMessage((error as Error).message);
      } finally {
        if (active) setSettingsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [settingsAsset]);

  const singleRunTableId = batchScope === "tables" && selectedTables.length === 1 ? selectedTables[0] : null;

  useEffect(() => {
    if (singleRunTableId == null) {
      setRunSetting(null);
      setRunStartDate("");
      setRunColumn("");
      return;
    }
    let active = true;
    void (async () => {
      try {
        const data = await apiRequest<TableProfilingSetting>(`/v1/dq/profiling/table-settings?table_id=${singleRunTableId}`);
        if (!active) return;
        setRunSetting(data);
        setRunStartDate(data.start_date ? data.start_date.slice(0, 10) : "");
        setRunColumn(data.watermark_column || "");
      } catch {
        if (active) setRunSetting(null);
      }
    })();
    return () => {
      active = false;
    };
  }, [singleRunTableId]);

  async function saveTableSettings() {
    if (!settingsAsset) return;
    setSettingsSaving(true);
    setSettingsMessage("");
    try {
      const startIso = settingsStartDate ? new Date(`${settingsStartDate}T00:00:00Z`).toISOString() : null;
      const data = await apiRequest<TableProfilingSetting>(`/v1/dq/profiling/table-settings`, {
        method: "PUT",
        body: JSON.stringify({
          table_id: settingsAsset.id,
          start_date: startIso,
          watermark_column: settingsColumn.trim() || null,
        }),
      });
      setSettings(data);
      setSettingsStartDate(data.start_date ? data.start_date.slice(0, 10) : "");
      setSettingsColumn(data.watermark_column || "");
      setSettingsMessage("Configuração salva.");
    } catch (error) {
      setSettingsMessage((error as Error).message);
    } finally {
      setSettingsSaving(false);
    }
  }

  return (
    <>
      <div className="space-y-6">
        <DQSubnav />

        <Card className="border-border/80">
          <CardHeader>
            <div>
              <h2 className="text-base font-semibold text-text">Início do profiling para tabelas grandes</h2>
              <p className="mt-1 text-sm text-muted">
                Defina uma data inicial para a tabela: a primeira execução lê a partir dessa data (em vez de tudo) e as
                seguintes continuam em delta. Se a coluna de data não for detectada automaticamente, informe-a aqui.
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <AssetSearchInput
              selected={settingsAsset}
              onSelect={setSettingsAsset}
              placeholder="Buscar a tabela por nome, schema ou fonte…"
            />
            {settingsAsset ? (
              settingsLoading ? (
                <p className="flex items-center gap-2 text-sm text-muted">
                  <Loader2 className="h-4 w-4 animate-spin" /> Carregando configuração…
                </p>
              ) : (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-text-body">Data inicial (piso)</label>
                      <Input
                        type="date"
                        value={settingsStartDate}
                        disabled={!canWrite}
                        onChange={(event) => setSettingsStartDate(event.target.value)}
                      />
                      <p className="mt-1 text-xs text-muted">
                        Vazio = primeira execução full (lê a tabela inteira).
                      </p>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-text-body">Coluna de data/hora</label>
                      <Input
                        type="text"
                        value={settingsColumn}
                        disabled={!canWrite}
                        placeholder={settings?.detected_watermark_column || "ex.: updated_at, dt_carga"}
                        onChange={(event) => setSettingsColumn(event.target.value)}
                      />
                      <p className="mt-1 text-xs text-muted">
                        {settings?.detected_watermark_column
                          ? `Detectada automaticamente: ${settings.detected_watermark_column}. Preencha só para sobrescrever.`
                          : "Nenhuma coluna detectada automaticamente — informe a coluna para usar início por data e delta."}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    {settings?.has_previous_success ? (
                      <Badge tone="neutral">Já houve profiling — a data inicial vale apenas para a primeira execução</Badge>
                    ) : (
                      <Badge tone="accent">Sem execução anterior — a data inicial será aplicada no próximo profiling</Badge>
                    )}
                    {settings?.effective_watermark_column ? (
                      <span className="text-xs text-muted">
                        Coluna efetiva: <span className="font-mono">{settings.effective_watermark_column}</span>
                      </span>
                    ) : null}
                  </div>
                  {settingsMessage ? <p className="text-sm text-text-body">{settingsMessage}</p> : null}
                  {canWrite ? (
                    <div className="flex justify-end">
                      <Button type="button" onClick={() => void saveTableSettings()} disabled={settingsSaving}>
                        {settingsSaving ? "Salvando…" : "Salvar configuração"}
                      </Button>
                    </div>
                  ) : (
                    <p className="text-xs text-muted">Você tem acesso de leitura: pode consultar, mas não alterar a configuração.</p>
                  )}
                </div>
              )
            ) : (
              <p className="text-sm text-muted">Selecione uma tabela para configurar a data inicial e a coluna de data.</p>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <Card className="border-border/80">
            <CardHeader>
              <div className="space-y-1">
                <h2 className="text-xl font-semibold text-text">Profiling em lote no Spark</h2>
                <p className="text-sm text-text-body">
                  Selecione o Data Source, escolha um schema inteiro ou restrinja o lote para tabelas específicas.
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-text-body">Escopo</span>
                  <select
                    className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                    value={batchScope}
                    onChange={(event) => setBatchScope(event.target.value as "datasource" | "schema" | "tables")}
                  >
                    <option value="datasource">Data Source inteiro</option>
                    <option value="schema">Schema inteiro</option>
                    <option value="tables">Tabelas específicas</option>
                  </select>
                  <p className="text-xs text-muted">
                    {batchScope === "datasource"
                      ? "O profiling será executado para todas as tabelas elegíveis do Data Source selecionado."
                      : batchScope === "schema"
                        ? "O profiling será executado para todas as tabelas elegíveis do schema selecionado."
                        : "O profiling será executado apenas para as tabelas selecionadas."}
                  </p>
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-text-body">Data Source</span>
                  <select
                    className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                    value={selectedDatasourceId}
                    onChange={(event) => setSelectedDatasourceId(event.target.value ? Number(event.target.value) : "")}
                  >
                    <option value="">Selecione</option>
                    {datasources.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-[1fr_160px]">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-text-body">Schema</span>
                  <select
                    className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm disabled:bg-bg-subtle"
                    disabled={!selectedDatasourceId || batchScope === "datasource"}
                    value={batchScope === "datasource" ? "" : selectedSchemaId}
                    onChange={(event) => setSelectedSchemaId(event.target.value ? Number(event.target.value) : "")}
                  >
                    <option value="">{!selectedDatasourceId ? "Selecione um Data Source" : batchScope === "datasource" ? "Não aplicável" : "Selecione"}</option>
                    {schemas.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-text-body">Concorrência</span>
                  <Input
                    type="number"
                    min={1}
                    max={20}
                    value={concurrency}
                    onChange={(event) => setConcurrency(Math.max(1, Number(event.target.value) || 1))}
                  />
                </label>
              </div>

              <div className="rounded-2xl border border-border bg-bg-subtle/70 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-text">Tabelas do lote</p>
                    <p className="text-xs text-muted">
                      {batchScope === "datasource"
                        ? "Todas as tabelas elegíveis serão processadas automaticamente."
                        : batchScope === "schema"
                          ? "O Spark vai resolver automaticamente todas as tabelas elegíveis do schema selecionado."
                          : "Escolha as tabelas que serão perfiladas neste agendamento."}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {batchScope === "tables" ? (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={selectAllVisibleTables}
                          disabled={filteredTables.length === 0}
                        >
                          Selecionar visíveis
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setSelectedTables([])}
                          disabled={selectedTables.length === 0}
                        >
                          Limpar
                        </Button>
                      </>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4 max-h-72 space-y-2 overflow-auto rounded-xl border border-border bg-surface p-3">
                  {!selectedDatasourceId ? (
                    <EmptyState
                      title="Selecione um Data Source"
                      description="O lote usa o catálogo real do Data Source para carregar schemas e tabelas."
                    />
                  ) : (batchScope === "schema" || batchScope === "tables") && !selectedSchemaLabel ? (
                    <EmptyState
                      title="Selecione um schema"
                      description="Escolha um schema para carregar as tabelas disponíveis para profiling."
                    />
                  ) : batchScope === "datasource" ? (
                    <EmptyState
                      title="Escopo em Data Source inteiro"
                      description="Não é necessário selecionar tabelas. O Spark vai considerar todas as tabelas elegíveis do Data Source selecionado."
                    />
                  ) : batchScope === "schema" ? (
                    <EmptyState
                      title="Escopo em schema inteiro"
                      description={
                        loadingTables
                          ? "As tabelas elegíveis serão resolvidas pelo backend no momento da execução."
                          : `${tables.length} tabela(s) elegível(is) carregada(s) para o schema ${selectedSchemaLabel || "selecionado"}. O Spark vai considerar todas as tabelas elegíveis no momento da execução.`
                      }
                    />
                  ) : loadingTables ? (
                    <div className="flex items-center gap-2 text-sm text-muted">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Carregando tabelas...
                    </div>
                  ) : filteredTables.length === 0 ? (
                    <p className="text-sm text-muted">Nenhuma tabela encontrada para o filtro atual.</p>
                  ) : (
                    filteredTables.map((table) => (
                      <label className="flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm text-text-body hover:bg-bg-subtle" key={table.id}>
                        <input
                          checked={selectedTables.includes(table.id)}
                          className="h-4 w-4 rounded border-border-strong"
                          disabled={false}
                          type="checkbox"
                          onChange={() => toggleTable(table.id)}
                        />
                        <span>{table.name}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              {singleRunTableId != null ? (
                <div className="space-y-3 rounded-2xl border border-info-200 bg-info-50/60 p-4">
                  <div>
                    <p className="text-sm font-medium text-text">Início por data (tabela grande)</p>
                    <p className="text-xs text-muted">
                      Opcional. Na primeira execução desta tabela, lê a partir da data informada (em vez de tudo); as
                      próximas seguem em delta. A configuração é salva para a tabela ao disparar.
                    </p>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-text-body">Data inicial</label>
                      <Input
                        type="date"
                        value={runStartDate}
                        disabled={!canWrite}
                        onChange={(event) => setRunStartDate(event.target.value)}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-text-body">Coluna de data/hora</label>
                      <Input
                        type="text"
                        value={runColumn}
                        disabled={!canWrite}
                        placeholder={runSetting?.detected_watermark_column || "ex.: updated_at, dt_carga"}
                        onChange={(event) => setRunColumn(event.target.value)}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted">
                    {runSetting?.has_previous_success
                      ? "Já houve profiling desta tabela — a data inicial vale só para a 1ª execução; as próximas continuam em delta automaticamente."
                      : runSetting?.detected_watermark_column
                        ? `Coluna detectada automaticamente: ${runSetting.detected_watermark_column}. Vazio na data = full (lê tudo).`
                        : "Nenhuma coluna de data detectada — informe a coluna para usar início por data e delta."}
                  </p>
                </div>
              ) : batchScope === "tables" && selectedTables.length > 1 ? (
                <p className="text-xs text-muted">
                  Selecione apenas 1 tabela para definir uma data inicial específica (tabelas grandes).
                </p>
              ) : null}

              {statusMessage ? (
                <div className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text-body">
                  {statusMessage}
                </div>
              ) : null}

                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    type="button"
                    onClick={() => void launchBatchProfiling()}
                    disabled={
                      !canWrite ||
                      launching ||
                      loadingSources ||
                      loadingSchemas ||
                      !selectedDatasourceId ||
                      ((batchScope === "schema" || batchScope === "tables") && !selectedSchemaLabel) ||
                      (batchScope === "tables" && selectedTables.length === 0)
                    }
                  >
                    {launching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                    Disparar agora
                  </Button>
                <p className="text-xs text-muted">
                  Execução sempre orquestrada no cluster Spark. O backend apenas registra, monitora e persiste resultados.
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <h3 className="text-base font-semibold text-text">Agendamento recorrente</h3>
                    <p className="text-sm text-text-body">
                      {editingScheduleId ? "Editando o agendamento selecionado." : "Crie um agendamento para repetir o mesmo escopo no Spark."}
                    </p>
                  </div>
                  <Badge tone={scheduleEnabled ? "accent" : "neutral"}>{scheduleEnabled ? "Ativo" : "Pausado"}</Badge>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <label className="space-y-2 md:col-span-2">
                    <span className="text-sm font-medium text-text-body">Nome do agendamento</span>
                    <Input value={scheduleName} onChange={(event) => setScheduleName(event.target.value)} placeholder="Ex.: Profiling diário do Data Source" />
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-medium text-text-body">Frequência</span>
                    <select
                      className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                      value={scheduleMode}
                      onChange={(event) => setScheduleMode(event.target.value as typeof scheduleMode)}
                    >
                      <option value="daily">Diário</option>
                      <option value="weekly">Semanal</option>
                      <option value="biweekly">Quinzenal</option>
                      <option value="monthly">Mensal</option>
                      <option value="interval">Intervalo técnico</option>
                      <option value="manual">Manual</option>
                    </select>
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-medium text-text-body">
                      {scheduleMode === "interval" ? "Intervalo" : "Horário"}
                    </span>
                    {scheduleMode === "interval" ? (
                      <Input
                        min={1}
                        type="number"
                        value={scheduleEveryMinutes ?? ""}
                        onChange={(event) => setScheduleEveryMinutes(Math.max(1, Number(event.target.value) || 1))}
                      />
                    ) : (
                      <Input type="time" value={scheduleTime} onChange={(event) => setScheduleTime(event.target.value)} />
                    )}
                  </label>

                  {scheduleMode === "weekly" ? (
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-text-body">Dia da semana</span>
                      <select
                        className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                        value={scheduleDayOfWeek}
                        onChange={(event) => setScheduleDayOfWeek(Number(event.target.value))}
                      >
                        <option value={0}>Segunda-feira</option>
                        <option value={1}>Terça-feira</option>
                        <option value={2}>Quarta-feira</option>
                        <option value={3}>Quinta-feira</option>
                        <option value={4}>Sexta-feira</option>
                        <option value={5}>Sábado</option>
                        <option value={6}>Domingo</option>
                      </select>
                    </label>
                  ) : null}

                  {scheduleMode === "monthly" ? (
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-text-body">Dia do mês</span>
                      <Input min={1} max={31} type="number" value={scheduleDayOfMonth} onChange={(event) => setScheduleDayOfMonth(Math.max(1, Math.min(31, Number(event.target.value) || 1)))} />
                    </label>
                  ) : null}

                  <label className="space-y-2">
                    <span className="text-sm font-medium text-text-body">Timezone</span>
                    <Input value={scheduleTimezone} onChange={(event) => setScheduleTimezone(event.target.value)} placeholder="America/Sao_Paulo" />
                  </label>

                  <label className="flex items-center gap-2 rounded-xl border border-border bg-bg-subtle px-3 py-2 text-sm md:col-span-2">
                    <input checked={scheduleEnabled} onChange={(event) => setScheduleEnabled(event.target.checked)} type="checkbox" />
                    Agendamento ativo
                  </label>
                </div>

                <p className="mt-3 rounded-xl border border-border bg-bg-subtle px-3 py-2 text-xs text-text-body">
                  Escopo atual: {formatScopeLabel(batchScope)} · {selectedDatasourceId ? datasources.find((item) => item.id === Number(selectedDatasourceId))?.name || "Data Source selecionado" : "Selecione um Data Source"}{batchScope !== "datasource" && selectedSchemaLabel ? ` · ${selectedSchemaLabel}` : ""}
                </p>

                {scheduleError ? <p className="mt-3 text-sm text-danger-700">{scheduleError}</p> : null}

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    onClick={() => void saveSchedule()}
                    disabled={
                      !canWrite ||
                      scheduleSaving ||
                      !selectedDatasourceId ||
                      ((batchScope === "schema" || batchScope === "tables") && !selectedSchemaLabel) ||
                      (batchScope === "tables" && selectedTables.length === 0)
                    }
                  >
                    {scheduleSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {editingScheduleId ? "Salvar alterações" : "Salvar agendamento"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      clearScheduleForm();
                    }}
                  >
                    Limpar
                  </Button>
                </div>

                <div className="mt-6 border-t border-border pt-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-text">Agendamentos existentes</p>
                      <p className="text-xs text-muted">
                        {schedulesRefreshing ? "Atualizando..." : "Pausar, reativar ou executar imediatamente."}
                      </p>
                    </div>
                    <Button type="button" variant="outline" onClick={() => void loadSchedules({ silent: true })} disabled={schedulesRefreshing}>
                      <RefreshCw className={`mr-2 h-4 w-4 ${schedulesRefreshing ? "animate-spin" : ""}`} />
                      Atualizar
                    </Button>
                  </div>

                  <div className="mt-4 space-y-3">
                    {schedulesLoading ? (
                      <div className="flex items-center gap-2 text-sm text-muted">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Carregando agendamentos...
                      </div>
                    ) : visibleSchedules.length === 0 ? (
                      <EmptyState
                        title="Nenhum agendamento encontrado"
                        description="Crie um agendamento para este escopo ou ajuste os filtros do Data Source."
                      />
                    ) : (
                      visibleSchedules.map((schedule) => {
                        const paused = !schedule.schedule_enabled;
                        return (
                          <div key={schedule.id} className="rounded-2xl border border-border bg-bg-subtle/70 p-4">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="min-w-0 space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="truncate text-sm font-semibold text-text">
                                    {schedule.name || schedule.target_label || `Agendamento #${schedule.id}`}
                                  </p>
                                  {paused ? <Badge tone="neutral">Pausado</Badge> : <Badge tone="success">Ativo</Badge>}
                                  <Badge tone="accent">{formatScopeLabel(schedule.scope)}</Badge>
                                </div>
                                <p className="text-xs text-muted">
                                  {formatScheduleModeLabel(schedule.schedule_mode)} · Próxima execução: {formatDateTime(schedule.schedule_next_run_at)}
                                </p>
                                <p className="text-xs text-muted">
                                  Última execução: {formatDateTime(schedule.schedule_last_run_at)} · Último status: {schedule.schedule_last_status || "—"}
                                </p>
                              </div>
                              {canWrite ? (
                                <div className="flex flex-wrap items-center gap-2">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                      hydrateScheduleForm(schedule);
                                      setBatchScope(schedule.scope as "datasource" | "schema" | "tables");
                                    }}
                                  >
                                    Editar
                                  </Button>
                                  <Button type="button" variant="outline" onClick={() => void (paused ? resumeSchedule(schedule.id) : pauseSchedule(schedule.id))}>
                                    {paused ? "Reativar" : "Pausar"}
                                  </Button>
                                  <Button type="button" variant="outline" onClick={() => void runScheduleNow(schedule.id)}>
                                    Executar agora
                                  </Button>
                                  <Button type="button" variant="outline" onClick={() => void deleteSchedule(schedule.id)}>
                                    Excluir
                                  </Button>
                                </div>
                              ) : null}
                            </div>
                            <p className="mt-3 text-xs text-muted">
                              {schedule.schedule_summary || "Agendamento configurado."}
                            </p>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/80">
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <h2 className="text-xl font-semibold text-text">Execuções de profiling</h2>
                  <p className="text-sm text-text-body">Acompanhe o histórico operacional das execuções em lote e por tabela.</p>
                </div>
                <div className="flex items-center gap-3">
                  {executionsRefreshing ? <span className="text-xs text-muted">Atualizando...</span> : null}
                  <Button type="button" variant="outline" onClick={() => void refreshVisibleExecutions({ silent: true })} disabled={executionsRefreshing}>
                    <RefreshCw className={`mr-2 h-4 w-4 ${executionsRefreshing ? "animate-spin" : ""}`} />
                    Atualizar
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-6">
                <select
                  className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                  value={filterDatasourceId}
                  onChange={(event) => setFilterDatasourceId(event.target.value ? Number(event.target.value) : "")}
                >
                  <option value="">Todos os Data Sources</option>
                  {datasources.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>

                <select
                  className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                  value={filterScope}
                  onChange={(event) => setFilterScope(event.target.value)}
                >
                  <option value="">Todos os escopos</option>
                  <option value="datasource">Data Source</option>
                  <option value="schema">Schema</option>
                  <option value="table">Tabela</option>
                  <option value="tables">Tabelas específicas</option>
                </select>

                <select
                  className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                  value={filterStatus}
                  onChange={(event) => setFilterStatus(event.target.value)}
                >
                  <option value="">Todos os status</option>
                  <option value="queued">Na fila</option>
                  <option value="running">Executando</option>
                  <option value="success">Concluído</option>
                  <option value="no_data">Sem dados</option>
                  <option value="failed">Falhou</option>
                  <option value="timeout">Timeout</option>
                </select>

                <Input
                  value={filterSearch}
                  onChange={(event) => setFilterSearch(event.target.value)}
                  placeholder="Buscar por execução, schema ou tabela"
                />

                <Input
                  type="date"
                  value={filterStartedFrom}
                  onChange={(event) => setFilterStartedFrom(event.target.value)}
                />

                <Input
                  type="date"
                  value={filterStartedTo}
                  onChange={(event) => setFilterStartedTo(event.target.value)}
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-text-body">
                <span>{visibleRangeLabel}</span>
                <span>
                  Página {currentPage} de {totalPages}
                </span>
              </div>

              {executionsLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Carregando execuções...
                </div>
              ) : executions.length === 0 ? (
                <EmptyState
                  title="Nenhuma execução encontrada"
                  description="Ainda não há execuções de profiling para os filtros atuais."
                />
              ) : (
                <div className="space-y-3">
                  {executions.map((execution) => {
                    const legacyEngine = normalizeStatus(execution.execution_engine) === "python";
                    return (
                      <button
                        className="w-full rounded-2xl border border-border bg-surface px-4 py-4 text-left transition hover:border-border-strong hover:bg-bg-subtle"
                        key={execution.id}
                        type="button"
                        onClick={() => openExecutionDetail(execution.id)}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-semibold text-text">
                                {formatExecutionTarget(execution)}
                              </span>
                              {statusBadge(execution.status)}
                              {engineBadge(execution.execution_engine)}
                              {profilingModeBadge(execution.profiling_mode)}
                              {legacyEngine ? <Badge tone="warning">Histórico legado</Badge> : null}
                            </div>
                            <p className="text-xs text-muted">
                              Execução #{execution.id} · {execution.total_items} item(ns) · início {formatDateTime(execution.started_at || execution.queued_at)}
                            </p>
                            {legacyEngine ? (
                              <p className="text-xs text-warning-700">
                                Execução anterior ao padrão atual em Spark. Mantida apenas para histórico.
                              </p>
                            ) : null}
                          </div>
                          <div className="grid min-w-[220px] grid-cols-2 gap-3 text-sm text-text-body">
                            <div>
                              <p className="text-xs uppercase tracking-wide text-muted">Sucesso / falha</p>
                              <p className="font-medium text-text">
                                {execution.success_items} / {execution.failed_items}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs uppercase tracking-wide text-muted">Duração</p>
                              <p className="font-medium text-text">{formatDuration(execution.duration_ms)}</p>
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}

                  {totalPages > 1 ? (
                    <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => void loadExecutions({ silent: true, page: Math.max(1, currentPage - 1) })}
                        disabled={executionsRefreshing || currentPage === 1}
                      >
                        Anterior
                      </Button>

                      {pageNumbers.map((pageNumber) => (
                        <Button
                          key={pageNumber}
                          type="button"
                          variant={pageNumber === currentPage ? "default" : "outline"}
                          onClick={() => void loadExecutions({ silent: true, page: pageNumber })}
                          disabled={executionsRefreshing}
                        >
                          {pageNumber}
                        </Button>
                      ))}

                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => void loadExecutions({ silent: true, page: Math.min(totalPages, currentPage + 1) })}
                        disabled={executionsRefreshing || currentPage === totalPages}
                      >
                        {executionsRefreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Próxima
                      </Button>
                    </div>
                  ) : null}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <ProfilingExecutionDetailModal
        detail={executionDetail}
        loading={executionDetailLoading || executionDetailRefreshing}
        open={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
      />
    </>
  );
}
