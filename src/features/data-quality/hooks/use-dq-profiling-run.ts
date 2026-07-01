import { useCallback, useEffect, useMemo, useState } from "react";

import { apiRequest } from "@/lib/client-api";

import type {
  DatasourceNode,
  DQProfilingLaunch,
  DQJobRun,
  DQProfilingRunItem,
  DQProfilingRunProgress,
} from "../types";

const TERMINAL_JOB_STATUSES = new Set(["success", "failed", "no_data", "timeout"]);

type SchemaOption = {
  datasourceId: number;
  datasourceName: string;
  schemaName: string;
};

type UseDQProfilingRunParams = {
  allSchemaOptions: SchemaOption[];
  nodes: DatasourceNode[];
  onMessage: (message: string) => void;
  onTableProfiled: () => Promise<void>;
  selectedTableId: number | null;
  selectedTableName: string;
};

export function useDQProfilingRun({
  allSchemaOptions,
  nodes,
  onMessage,
  onTableProfiled,
  selectedTableId,
  selectedTableName,
}: UseDQProfilingRunParams) {
  const [runLoading, setRunLoading] = useState(false);
  const [runModalOpen, setRunModalOpen] = useState(false);
  const [runScope, setRunScope] = useState<"table" | "schema">("table");
  const [runSchemaDatasourceId, setRunSchemaDatasourceId] = useState<number | "">("");
  const [runSchemaName, setRunSchemaName] = useState("");
  const [runSchemaLimit, setRunSchemaLimit] = useState(200);
  const [runSchemaConcurrency, setRunSchemaConcurrency] = useState(5);
  const [runSchemaIncludeCsv, setRunSchemaIncludeCsv] = useState("");
  const [runSchemaExcludeCsv, setRunSchemaExcludeCsv] = useState("");
  const [runExecutionEngine, setRunExecutionEngine] = useState<"spark">("spark");
  const [schemaRunProgress, setSchemaRunProgress] = useState<DQProfilingRunProgress | null>(null);
  const [schemaRunItems, setSchemaRunItems] = useState<DQProfilingRunItem[]>([]);
  const [schemaRunPollingId, setSchemaRunPollingId] = useState<number | null>(null);
  const [tableRunPollingId, setTableRunPollingId] = useState<number | null>(null);
  const [currentTableRun, setCurrentTableRun] = useState<DQJobRun | null>(null);
  const [profilingHistory, setProfilingHistory] = useState<DQJobRun[]>([]);
  const [profilingHistoryLoading, setProfilingHistoryLoading] = useState(false);
  const [profilingHistoryError, setProfilingHistoryError] = useState("");

  const loadProfilingHistory = useCallback(
    async (tableId: number) => {
      setProfilingHistoryLoading(true);
      setProfilingHistoryError("");
      try {
        const payload = await apiRequest<DQJobRun[]>(
          `/v1/dq/runs?limit=20&table_id=${tableId}&job_type=profiling`,
        );
        setProfilingHistory(payload);
        const firstActive = payload.find((run) => run.status === "queued" || run.status === "running") ?? null;
        setCurrentTableRun(firstActive ?? payload[0] ?? null);
        setTableRunPollingId(firstActive?.id ?? null);
      } catch (error) {
        setProfilingHistory([]);
        setProfilingHistoryError(error instanceof Error ? error.message : "Não foi possível carregar o histórico de perfilamento.");
      } finally {
        setProfilingHistoryLoading(false);
      }
    },
    [],
  );

  async function runProfile() {
    if (runScope === "table" && !selectedTableId) return;
    if (runScope === "table" && tableRunPollingId) return;
    if (runScope === "schema" && !runSchemaName.trim()) return;
    setRunLoading(true);
    try {
      const safeRunSchemaLimit = Math.max(1, Number(runSchemaLimit) || 200);
      const safeRunSchemaConcurrency = Math.min(20, Math.max(1, Number(runSchemaConcurrency) || 5));
      const payload =
        runScope === "table"
          ? { scope: "table", table_id: selectedTableId, table_fqn: selectedTableName, execution_engine: runExecutionEngine }
          : {
              scope: "schema",
              schema: runSchemaName,
              datasource_id: runSchemaDatasourceId === "" ? undefined : Number(runSchemaDatasourceId),
              limit: safeRunSchemaLimit,
              concurrency: safeRunSchemaConcurrency,
              execution_engine: runExecutionEngine,
              include_tables: runSchemaIncludeCsv
                .split(",")
                .map((v) => v.trim())
                .filter(Boolean),
              exclude_tables: runSchemaExcludeCsv
                .split(",")
                .map((v) => v.trim())
                .filter(Boolean),
            };
      const launch = await apiRequest<DQProfilingLaunch>("/v1/dq/profiling/run", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setRunModalOpen(false);
      if (launch.scope === "schema") {
        setSchemaRunProgress({
          id: launch.run_id,
          scope: "schema",
          schema: launch.schema ?? runSchemaName,
          status: launch.status,
          execution_engine: launch.execution_engine,
          total_items: launch.tables_total,
          queued_items: launch.tables_total,
          running_items: 0,
          success_items: 0,
          failed_items: 0,
        });
        setSchemaRunItems([]);
        setSchemaRunPollingId(launch.run_id);
        onMessage(`Perfilamento de schema enfileirado (${launch.tables_total} tabelas).`);
      } else if (selectedTableId) {
        setCurrentTableRun({
          id: launch.job_run_id ?? launch.run_id,
          job_type: "profiling",
          status: "queued",
          execution_engine: launch.execution_engine,
          dq_run_id: launch.run_id,
          profiling_schedule_id: null,
          spark_app_id: null,
          error_message: null,
          log_tail: null,
          duration_ms: null,
          queued_at: null,
          started_at: null,
          finished_at: null,
          violations_count: null,
          requested_by_user_id: null,
          requested_by_user_name: null,
          requested_by_user_email: null,
          trigger_source: "manual",
        });
        setTableRunPollingId(launch.job_run_id ?? null);
        onMessage("Solicitando execução de perfilamento...");
      }
    } catch (e) {
      onMessage((e as Error).message);
    } finally {
      setRunLoading(false);
    }
  }

  useEffect(() => {
    if (!schemaRunPollingId) return;
    let cancelled = false;
    const tick = async () => {
      try {
        const [progress, items] = await Promise.all([
          apiRequest<DQProfilingRunProgress>(`/v1/dq/profiling/runs/${schemaRunPollingId}`),
          apiRequest<DQProfilingRunItem[]>(`/v1/dq/profiling/runs/${schemaRunPollingId}/items`),
        ]);
        if (cancelled) return;
        setSchemaRunProgress(progress);
        setSchemaRunItems(items);
        if (TERMINAL_JOB_STATUSES.has(String(progress.status || "").toLowerCase())) {
          setSchemaRunPollingId(null);
          onMessage(
            progress.status === "success"
              ? `Perfilamento do schema concluído (${progress.success_items}/${progress.total_items}).`
              : progress.status === "no_data"
                ? `Perfilamento do schema concluído sem dados relevantes (${progress.success_items}/${progress.total_items}).`
                : `Perfilamento do schema finalizou com falhas (${progress.failed_items}/${progress.total_items}).`,
          );
          return;
        }
      } catch (e) {
        if (!cancelled) {
          onMessage((e as Error).message);
          setSchemaRunPollingId(null);
        }
      }
      if (!cancelled) window.setTimeout(tick, 1500);
    };
    void tick();
    return () => {
      cancelled = true;
    };
  }, [onMessage, schemaRunPollingId]);

  useEffect(() => {
    if (!selectedTableId) {
      setProfilingHistory([]);
      setProfilingHistoryError("");
      setTableRunPollingId(null);
      setCurrentTableRun(null);
      return;
    }
    void loadProfilingHistory(selectedTableId);
  }, [loadProfilingHistory, selectedTableId]);

  useEffect(() => {
    if (!tableRunPollingId) return;
    let cancelled = false;
    const tick = async () => {
      try {
        const run = await apiRequest<DQJobRun>(`/v1/dq/runs/${tableRunPollingId}`);
        if (cancelled) return;
        setCurrentTableRun(run);
        setProfilingHistory((current) => {
          const next = [run, ...current.filter((item) => item.id !== run.id)];
          return next.sort((a, b) => b.id - a.id);
        });
        if (TERMINAL_JOB_STATUSES.has(String(run.status || "").toLowerCase())) {
          setTableRunPollingId(null);
          if (run.status === "success") {
            onMessage("Perfilamento de DQ concluído com sucesso.");
            await onTableProfiled();
          } else if (run.status === "no_data") {
            onMessage("Perfilamento concluído sem dados para calcular métricas.");
            await onTableProfiled();
          } else if (run.status === "timeout") {
            onMessage(run.error_message || "Tempo limite excedido ao executar profiling Spark.");
          } else {
            onMessage(run.error_message || "Perfilamento de DQ finalizou com falha.");
          }
          if (selectedTableId) {
            await loadProfilingHistory(selectedTableId);
          }
          return;
        }
      } catch (error) {
        if (!cancelled) {
          setProfilingHistoryError(error instanceof Error ? error.message : "Não foi possível acompanhar a execução.");
          setTableRunPollingId(null);
        }
      }
      if (!cancelled) window.setTimeout(tick, 1500);
    };
    void tick();
    return () => {
      cancelled = true;
    };
  }, [loadProfilingHistory, onMessage, onTableProfiled, selectedTableId, tableRunPollingId]);

  const profilingBusy = useMemo(
    () => runLoading || schemaRunPollingId !== null || tableRunPollingId !== null,
    [runLoading, schemaRunPollingId, tableRunPollingId],
  );
  const profilingBusyReason = useMemo(() => {
    if (tableRunPollingId !== null) return "table";
    if (schemaRunPollingId !== null) return "schema";
    if (runLoading) return "launch";
    return null;
  }, [runLoading, schemaRunPollingId, tableRunPollingId]);
  const refreshProfilingHistory = useCallback(async () => {
    if (selectedTableId) {
      await loadProfilingHistory(selectedTableId);
    }
  }, [loadProfilingHistory, selectedTableId]);

  return {
    allSchemaOptions,
    nodes,
    runLoading,
    profilingBusy,
    profilingBusyReason,
    runModalOpen,
    runScope,
    runSchemaDatasourceId,
    runSchemaName,
    runSchemaLimit,
    runSchemaConcurrency,
    runSchemaIncludeCsv,
    runSchemaExcludeCsv,
    runExecutionEngine,
    currentTableRun,
    profilingHistory,
    profilingHistoryLoading,
    profilingHistoryError,
    refreshProfilingHistory,
    schemaRunProgress,
    schemaRunItems,
    setRunModalOpen,
    setRunScope,
    setRunSchemaDatasourceId,
    setRunSchemaName,
    setRunSchemaLimit,
    setRunSchemaConcurrency,
    setRunSchemaIncludeCsv,
    setRunSchemaExcludeCsv,
    setRunExecutionEngine,
    runProfile,
  };
}
