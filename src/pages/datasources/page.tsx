import { FormEvent, useEffect, useMemo, useState } from "react";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DatabaseTechLogo } from "@/components/database-tech-logo";
import { EmptyState } from "@/components/ui/empty-state";
import { DeleteDatasourceDialog } from "@/features/datasources/components/delete-dialog";
import { DatasourceEditorDrawer } from "@/features/datasources/components/editor-drawer";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { presentStatus } from "@/lib/presentation/status-copy";
import {
  createDataSource,
  deleteDataSourceScanSchedule,
  deleteDataSource,
  getDataSourceScanSchedulerStatus,
  getDataSourceDetail,
  getScanRunDetail,
  getScanRunDiffs,
  listDataSourceScanSchedules,
  listDataSources,
  listScanRuns,
  runDataSourceScan,
  saveDataSourceScanSchedule,
  testDataSourceConnection,
  testExistingDataSourceConnection,
  updateDataSource,
  type ConnectionTestResponse,
  type DataSource,
  type DataSourceDetail,
  type DataSourceScanSchedule,
  type DataSourceScanScheduleForm,
  type DataSourceScanSchedulerStatus,
  type ScanDiff,
  type ScanRunDetail,
  type ScanRun,
} from "@/features/datasources/api";
import { useAuth } from "@/lib/auth";
import {
  DATASOURCE_GROUP_META,
  DATASOURCE_OPTIONS_BY_GROUP,
  type DataSourceField,
  type DataSourceTypeId,
  getDataSourceOption,
  isSupportedDataSourceType,
} from "@/lib/datasource-types";
import { DatasourceScheduleModal } from "@/features/datasources/components/schedule-modal";

type FieldState = Record<string, string | boolean>;

const DEFAULT_PORTS: Partial<Record<DataSourceTypeId, number>> = {
  postgres: 5432,
  mysql: 3306,
  sqlserver: 1433,
  oracle: 1521,
  redshift: 5439,
};

function buildDefaultFieldState(type: DataSourceTypeId): FieldState {
  const option = getDataSourceOption(type);
  if (!option) return {};
  const entries = [...option.connectionFields, ...option.secretFields].map((field) => {
    if (field.kind === "checkbox") return [field.key, false] as const;
    if (field.key === "port" && DEFAULT_PORTS[type] != null) return [field.key, String(DEFAULT_PORTS[type])] as const;
    if (field.kind === "select" && field.options?.length) return [field.key, field.options[0].value] as const;
    return [field.key, ""] as const;
  });
  return Object.fromEntries(entries);
}

function scanRunMessage(run: ScanRun): string | null {
  const summary = run.summary ?? {};
  const error = typeof summary.error === "string" ? summary.error.trim() : "";
  const message = typeof summary.error_message === "string" ? summary.error_message.trim() : "";
  const detail = typeof summary.error_detail === "string" ? summary.error_detail.trim() : "";
  const generic = new Set(["falha ao executar o scan da fonte de dados.", "scan_failed", "falha na execução"]);
  const detailLine = detail
    .split("\n")
    .map((line) => line.trim())
    .find((line) => /exception|error|failed|denied|refused|unknownhost|attributeerror|jdbc/i.test(line))
    || detail.split("\n").map((line) => line.trim()).find(Boolean)
    || "";

  if (detail && (!message || generic.has(message.toLowerCase()) || message === error)) {
    return detailLine || detail;
  }
  if (message) return message;
  if (error) return error;
  return detailLine || detail || null;
}

function scanRunEngine(run: ScanRun): string {
  const value = typeof run.summary?.execution_engine === "string" ? run.summary.execution_engine : "spark";
  return value.toLowerCase() === "spark" ? "Spark cluster" : presentStatus(value, "Motor não informado");
}

function scanRunFailureStage(run: ScanRun | ScanRunDetail): string | null {
  const summary = run.summary ?? {};
  const raw =
    typeof summary.failure_stage === "string"
      ? summary.failure_stage
      : run.status?.toLowerCase() === "failed" && typeof summary.current_stage === "string"
        ? summary.current_stage
        : "failure_stage" in run && typeof run.failure_stage === "string"
          ? run.failure_stage
          : null;
  return raw?.trim() || null;
}

function scanRunSparkAppId(run: ScanRun | ScanRunDetail): string | null {
  const summary = run.summary ?? {};
  const raw =
    typeof summary.spark_app_id === "string"
      ? summary.spark_app_id
      : "spark_application_id" in run && typeof run.spark_application_id === "string"
        ? run.spark_application_id
        : null;
  return raw?.trim() || null;
}

function scanRunSparkDriverId(run: ScanRun | ScanRunDetail): string | null {
  const summary = run.summary ?? {};
  const raw =
    typeof summary.spark_driver_id === "string"
      ? summary.spark_driver_id
      : "spark_driver_id" in run && typeof run.spark_driver_id === "string"
        ? run.spark_driver_id
        : null;
  return raw?.trim() || null;
}

function scanRunLogsUrl(run: ScanRunDetail | null | undefined): string | null {
  if (!run) return null;
  return run.spark_logs_url || `/api/v1/scan-runs/${run.id}/logs`;
}

function scanRunDiscoverySummary(run: ScanRun | ScanRunDetail): string | null {
  const summary = run.summary ?? {};
  const discovery = typeof summary.discovery === "object" ? (summary.discovery as Record<string, unknown>) : null;
  const source: Record<string, unknown> | null =
    "discovery" in run && run.discovery
      ? run.discovery
      : discovery && typeof discovery === "object"
        ? discovery
        : null;
  if (!source) return null;
  const schemas = typeof source["schemas"] === "number" ? (source["schemas"] as number) : null;
  const tables = typeof source["tables"] === "number" ? (source["tables"] as number) : null;
  const columns = typeof source["columns"] === "number" ? (source["columns"] as number) : null;
  const parts = [
    schemas != null ? `${schemas} schemas` : null,
    tables != null ? `${tables} tabelas` : null,
    columns != null ? `${columns} colunas` : null,
  ].filter((value): value is string => Boolean(value));
  return parts.length ? parts.join(" • ") : null;
}

function scanRunHeartbeat(run: ScanRun): string | null {
  if (typeof run.summary?.worker_heartbeat_at === "string") return run.summary.worker_heartbeat_at;
  if (typeof run.summary?.heartbeat_at === "string") return run.summary.heartbeat_at;
  if (typeof run.summary?.submitted_at === "string") return run.summary.submitted_at;
  return null;
}

function scanStatusTone(status: string): "neutral" | "warning" | "success" | "danger" {
  const normalized = status.trim().toLowerCase();
  if (normalized === "failed" || normalized === "error") return "danger";
  if (normalized === "running" || normalized === "submitted" || normalized === "queued") return "warning";
  if (normalized === "succeeded" || normalized === "success" || normalized === "partial_success") return "success";
  return "neutral";
}

function parseSchemas(text: string): string[] {
  const deduped = new Set(
    text
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
  return Array.from(deduped);
}

function schemasToText(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).join(", ");
}

function toggleSchemaInText(text: string, schema: string, checked: boolean) {
  const schemas = new Set(parseSchemas(text));
  if (checked) {
    schemas.add(schema);
  } else {
    schemas.delete(schema);
  }
  return schemasToText(Array.from(schemas));
}

function fieldIsRequired(optionId: DataSourceTypeId, field: DataSourceField, values: FieldState, mode: "create" | "edit") {
  if (!field.required) return false;
  if (field.kind === "password" && mode === "edit") return false;
  if (optionId === "bigquery" && field.key === "service_account_json") {
    return values.use_adc !== true;
  }
  return true;
}

function stringifyValue(value: string | boolean | undefined) {
  if (typeof value === "boolean") return value ? "true" : "false";
  return value ?? "";
}

function buildConnectionPayload(type: DataSourceTypeId, values: FieldState) {
  const option = getDataSourceOption(type);
  const payload: Record<string, string | number | boolean> = {};
  if (!option) return payload;
  for (const field of option.connectionFields) {
    const raw = values[field.key];
    if (field.kind === "checkbox") {
      if (raw === true) payload[field.key] = true;
      continue;
    }
    const stringValue = stringifyValue(raw).trim();
    if (!stringValue) continue;
    if (field.kind === "number") {
      payload[field.key] = Number(stringValue);
      continue;
    }
    payload[field.key] = stringValue;
  }
  return payload;
}

function buildSecretsPayload(type: DataSourceTypeId, values: FieldState) {
  const option = getDataSourceOption(type);
  const payload: Record<string, string> = {};
  if (!option) return payload;
  for (const field of option.secretFields) {
    const stringValue = stringifyValue(values[field.key]).trim();
    if (!stringValue) continue;
    payload[field.key] = stringValue;
  }
  return payload;
}

function summarizeConnection(item: DataSource) {
  if (item.db_type === "mongodb") {
    return `mongodb://${item.host}:${item.port}/${item.database}`;
  }
  if (item.port > 0) {
    return `${item.username}@${item.host}:${item.port}/${item.database}`;
  }
  return `${item.host} • ${item.database}`;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleString("pt-BR");
}

function todayDateInputValue() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function buildDefaultScheduleForm(datasourceId: number): DataSourceScanScheduleForm {
  return {
    datasource_id: datasourceId,
    schedule_mode: "manual",
    schedule_enabled: false,
    schedule_every_minutes: null,
    schedule_time: "08:00",
    schedule_day_of_week: 0,
    schedule_day_of_month: 1,
    schedule_anchor_date: todayDateInputValue(),
    recipient_user_ids: [],
  };
}

function buildScheduleForm(schedule: DataSourceScanSchedule): DataSourceScanScheduleForm {
  return {
    datasource_id: schedule.datasource_id,
    schedule_mode: schedule.schedule_mode,
    schedule_enabled: schedule.schedule_enabled,
    schedule_every_minutes: schedule.schedule_every_minutes,
    schedule_time: schedule.schedule_time ?? "08:00",
    schedule_day_of_week: schedule.schedule_day_of_week,
    schedule_day_of_month: schedule.schedule_day_of_month,
    schedule_anchor_date: schedule.schedule_anchor_date ? schedule.schedule_anchor_date.slice(0, 10) : todayDateInputValue(),
    recipient_user_ids: schedule.notification_recipients.map((item) => item.id),
  };
}

function formatScheduleSummary(schedule: DataSourceScanSchedule | undefined) {
  if (!schedule || !schedule.schedule_enabled || schedule.schedule_mode === "manual") {
    return "Sem agendamento";
  }
  if (schedule.schedule_mode === "interval") {
    const minutes = schedule.schedule_every_minutes ?? 0;
    if (!minutes) return "Intervalo técnico";
    if (minutes % 60 === 0) {
      const hours = minutes / 60;
      return hours === 1 ? "A cada 1 hora" : `A cada ${hours} horas`;
    }
    return `A cada ${minutes} minutos`;
  }
  if (schedule.schedule_mode === "daily") {
    return `Executa diariamente às ${schedule.schedule_time || "08:00"}`;
  }
  if (schedule.schedule_mode === "weekly") {
    const weekday = ["segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado", "domingo"][Math.max(0, Math.min(6, schedule.schedule_day_of_week ?? 0))];
    return `Executa semanalmente na ${weekday} às ${schedule.schedule_time || "08:00"}`;
  }
  if (schedule.schedule_mode === "biweekly") {
    return `Executa quinzenalmente às ${schedule.schedule_time || "08:00"}`;
  }
  if (schedule.schedule_mode === "monthly") {
    return `Executa mensalmente no dia ${schedule.schedule_day_of_month ?? 1} às ${schedule.schedule_time || "08:00"}`;
  }
  return schedule.schedule_summary || "Agendamento configurado";
}

export default function DatasourcesPage() {
  const { t } = useTranslation();
  const auth = useAuth();
  const [items, setItems] = useState<DataSource[]>([]);
  const [scanRuns, setScanRuns] = useState<ScanRun[]>([]);
  const [scanSchedules, setScanSchedules] = useState<DataSourceScanSchedule[]>([]);
  const [schedulerStatus, setSchedulerStatus] = useState<DataSourceScanSchedulerStatus | null>(null);
  const [scanDiffs, setScanDiffs] = useState<ScanDiff[]>([]);
  const [scanRunDetail, setScanRunDetail] = useState<ScanRunDetail | null>(null);
  const [selectedScanRunId, setSelectedScanRunId] = useState<number | null>(null);
  const [isLoadingDiffs, setIsLoadingDiffs] = useState(false);
  const [status, setStatus] = useState("");
  const [toast, setToast] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [selectedScheduleDatasourceId, setSelectedScheduleDatasourceId] = useState<number | null>(null);
  const [scheduleForm, setScheduleForm] = useState<DataSourceScanScheduleForm>(() => buildDefaultScheduleForm(0));
  const [isScheduleSaving, setIsScheduleSaving] = useState(false);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingTarget, setDeletingTarget] = useState<DataSource | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [step, setStep] = useState<"type" | "form">("type");

  const [selectedTypeId, setSelectedTypeId] = useState<DataSourceTypeId>("postgres");
  const [name, setName] = useState("local-datasource");
  const [isActive, setIsActive] = useState(true);
  const [includeSchemasText, setIncludeSchemasText] = useState("");
  const [excludeSchemasText, setExcludeSchemasText] = useState("");
  const [fieldValues, setFieldValues] = useState<FieldState>(() => buildDefaultFieldState("postgres"));
  const [configuredSecretKeys, setConfiguredSecretKeys] = useState<string[]>([]);

  const [testState, setTestState] = useState<"idle" | "loading" | "done">("idle");
  const [testMessage, setTestMessage] = useState("");
  const [formError, setFormError] = useState("");
  const [availableSchemas, setAvailableSchemas] = useState<string[]>([]);
  const [schemaFallbackSuggestion, setSchemaFallbackSuggestion] = useState<string>("");

  const selectedOption = useMemo(() => getDataSourceOption(selectedTypeId), [selectedTypeId]);
  const selectedTypeIsSupported = isSupportedDataSourceType(selectedTypeId) && Boolean(selectedOption?.enabled);
  const canManageDatasource = auth.canAction("write", "datasources");
  const includedSchemas = useMemo(() => parseSchemas(includeSchemasText), [includeSchemasText]);
  const excludedSchemas = useMemo(() => parseSchemas(excludeSchemasText), [excludeSchemasText]);
  const finalSchemas = useMemo(
    () => includedSchemas.filter((schema) => !excludedSchemas.includes(schema)),
    [excludedSchemas, includedSchemas],
  );

  async function load() {
    try {
      const [dataResult, runsResult, schedulesResult, schedulerStatusResult] = await Promise.allSettled([
        listDataSources(),
        listScanRuns(),
        listDataSourceScanSchedules(),
        getDataSourceScanSchedulerStatus(),
      ]);

      if (dataResult.status === "fulfilled") setItems(dataResult.value);
      if (runsResult.status === "fulfilled") setScanRuns(runsResult.value);
      if (schedulesResult.status === "fulfilled") setScanSchedules(schedulesResult.value);
      if (schedulerStatusResult.status === "fulfilled") setSchedulerStatus(schedulerStatusResult.value);

      if (runsResult.status === "fulfilled") {
        const recentFailedRuns = runsResult.value.filter((run) => run.status === "failed").slice(0, 8);
        if (recentFailedRuns.length) {
          const detailResults = await Promise.allSettled(recentFailedRuns.map((run) => getScanRunDetail(run.id)));
          const detailById = new Map<number, ScanRunDetail>();
          for (const result of detailResults) {
            if (result.status === "fulfilled") {
              detailById.set(result.value.id, result.value);
            }
          }
          if (detailById.size) {
            setScanRuns(
              runsResult.value.map((run) => {
                const detail = detailById.get(run.id);
                if (!detail) return run;
                const summary = { ...(run.summary ?? {}) };
                if (detail.error_message) summary.error_message = detail.error_message;
                if (detail.error_detail) summary.error_detail = detail.error_detail;
                if (detail.failure_stage) summary.failure_stage = detail.failure_stage;
                if (detail.spark_application_id) summary.spark_app_id = detail.spark_application_id;
                if (detail.spark_driver_id) summary.spark_driver_id = detail.spark_driver_id;
                if (detail.spark_logs_url) summary.logs_url = detail.spark_logs_url;
                if (detail.duration_seconds != null) summary.duration_seconds = detail.duration_seconds;
                if (detail.discovery) summary.discovery = detail.discovery;
                return { ...run, summary };
              }),
            );
          }
        }
      }

      const rejection = [dataResult, runsResult, schedulesResult, schedulerStatusResult].find(
        (result): result is PromiseRejectedResult => result.status === "rejected",
      );
      if (rejection) {
        setStatus((rejection.reason as Error).message);
      } else {
        setStatus("");
      }
      setToast(null);
    } catch (error) {
      setStatus((error as Error).message);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const datasourceById = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  const scheduleByDatasourceId = useMemo(() => new Map(scanSchedules.map((schedule) => [schedule.datasource_id, schedule])), [scanSchedules]);
  const recentScanRuns = useMemo(() => scanRuns.slice(0, 8), [scanRuns]);
  const hasActiveScan = useMemo(
    () => scanRuns.some((run) => ["running", "queued", "submitted"].includes((run.status || "").toLowerCase())),
    [scanRuns],
  );

  // Auto-refresh while a scan is queued/running so status updates without a manual reload.
  useEffect(() => {
    if (!hasActiveScan) return;
    let cancelled = false;
    const interval = window.setInterval(() => {
      void (async () => {
        try {
          const runs = await listScanRuns();
          if (cancelled) return;
          setScanRuns(runs);
          const stillActive = runs.some((run) => ["running", "queued", "submitted"].includes((run.status || "").toLowerCase()));
          if (!stillActive) {
            // One full refresh to pull enriched failure details (error stage, spark ids, etc.).
            void load();
          }
        } catch {
          // Ignore transient polling errors; next tick retries.
        }
      })();
    }, 6000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasActiveScan]);

  function latestScanInfo(datasourceId: number): string {
    const run = scanRuns.find((r) => r.datasource_id === datasourceId);
    if (!run) return "Nenhuma varredura executada";
    const when = new Date(run.created_at).toLocaleString();
    const message = scanRunMessage(run);
    const parts = [scanRunEngine(run), presentStatus(run.status, "Na fila"), when];
    const heartbeat = scanRunHeartbeat(run);
    const sparkAppId = scanRunSparkAppId(run);
    const sparkDriverId = scanRunSparkDriverId(run);
    const failureStage = scanRunFailureStage(run);
    if (heartbeat) {
      parts.push(`heartbeat ${formatDateTime(heartbeat)}`);
    }
    if (sparkAppId) {
      parts.push(`app ${sparkAppId}`);
    }
    if (sparkDriverId) {
      parts.push(`driver ${sparkDriverId}`);
    }
    if (failureStage) {
      parts.push(`etapa ${failureStage}`);
    }
    if (run.status === "failed" && message) {
      parts.push(message);
    }
    return parts.join(" • ");
  }

  async function openScanDiffs(scanRunId: number) {
    setSelectedScanRunId(scanRunId);
    setIsLoadingDiffs(true);
    setScanDiffs([]);
    setScanRunDetail(null);
    try {
      const [diffsResult, detailResult] = await Promise.allSettled([getScanRunDiffs(scanRunId), getScanRunDetail(scanRunId)]);
      if (diffsResult.status === "fulfilled") {
        setScanDiffs(diffsResult.value);
      } else {
        setScanDiffs([]);
        setStatus((diffsResult.reason as Error).message);
      }
      if (detailResult.status === "fulfilled") {
        setScanRunDetail(detailResult.value);
      } else {
        setScanRunDetail(null);
        setStatus((detailResult.reason as Error).message);
      }
    } catch (error) {
      const message = (error as Error).message;
      setScanDiffs([]);
      setScanRunDetail(null);
      setStatus(message);
      setToast({ tone: "error", message });
    } finally {
      setIsLoadingDiffs(false);
    }
  }

  function resetForm(type: DataSourceTypeId) {
    setSelectedTypeId(type);
    setName("local-datasource");
    setIsActive(true);
    setIncludeSchemasText("");
    setExcludeSchemasText("");
    setFieldValues(buildDefaultFieldState(type));
    setConfiguredSecretKeys([]);
    setTestState("idle");
    setTestMessage("");
    setFormError("");
    setAvailableSchemas([]);
    setSchemaFallbackSuggestion("");
  }

  function openDrawer() {
    setFormMode("create");
    setEditingId(null);
    setIsDrawerOpen(true);
    setStep("type");
    resetForm("postgres");
  }

  async function openEditDrawer(item: DataSource) {
    setFormMode("edit");
    setEditingId(item.id);
    setIsDrawerOpen(true);
    setStep("form");
    setIsLoadingDetail(true);
    setToast(null);
    try {
      const detail = await getDataSourceDetail(item.id);
      const defaults = buildDefaultFieldState(detail.db_type);
      const nextValues: FieldState = { ...defaults };
      Object.entries(detail.connection || {}).forEach(([key, value]) => {
        nextValues[key] = typeof value === "boolean" ? value : String(value ?? "");
      });
      setSelectedTypeId(detail.db_type);
      setName(detail.name);
      setIsActive(detail.is_active);
      const detected = detail.detected_schemas ?? [];
      setAvailableSchemas(detected);
      setIncludeSchemasText(schemasToText(detail.include_schemas ?? detected));
      setExcludeSchemasText(schemasToText(detail.exclude_schemas ?? []));
      setFieldValues(nextValues);
      setConfiguredSecretKeys(detail.configured_secrets ?? []);
      setTestState("idle");
      setTestMessage("");
      setFormError("");
    } catch (error) {
      setToast({ tone: "error", message: (error as Error).message });
      setIsDrawerOpen(false);
    } finally {
      setIsLoadingDetail(false);
    }
  }

  function openScheduleModal(item: DataSource) {
    const schedule = scheduleByDatasourceId.get(item.id);
    setSelectedScheduleDatasourceId(item.id);
    setScheduleForm(schedule ? buildScheduleForm(schedule) : buildDefaultScheduleForm(item.id));
    setIsScheduleModalOpen(true);
  }

  function closeScheduleModal() {
    setIsScheduleModalOpen(false);
    setSelectedScheduleDatasourceId(null);
    setIsScheduleSaving(false);
  }

  function updateScheduleForm(patch: Partial<DataSourceScanScheduleForm>) {
    setScheduleForm((prev) => ({ ...prev, ...patch }));
  }

  async function saveSchedule() {
    if (selectedScheduleDatasourceId == null) return;
    setIsScheduleSaving(true);
    try {
      await saveDataSourceScanSchedule({ ...scheduleForm, datasource_id: selectedScheduleDatasourceId });
      setToast({ tone: "success", message: "Agendamento salvo com sucesso." });
      closeScheduleModal();
      await load();
    } catch (error) {
      const message = (error as Error).message;
      setToast({ tone: "error", message });
      setIsScheduleSaving(false);
    }
  }

  async function deleteSchedule() {
    const schedule = selectedScheduleDatasourceId == null ? null : scheduleByDatasourceId.get(selectedScheduleDatasourceId);
    if (!schedule) return;
    setIsScheduleSaving(true);
    try {
      await deleteDataSourceScanSchedule(schedule.id);
      setToast({ tone: "success", message: "Agendamento removido com sucesso." });
      closeScheduleModal();
      await load();
    } catch (error) {
      const message = (error as Error).message;
      setToast({ tone: "error", message });
      setIsScheduleSaving(false);
    }
  }

  function closeDrawer() {
    setIsDrawerOpen(false);
  }

  function updateField(key: string, value: string | boolean) {
    setFieldValues((prev) => ({ ...prev, [key]: value }));
    setTestState("idle");
    setTestMessage("");
    setFormError("");
  }

  function updateIncludedSchema(schema: string, checked: boolean) {
    setIncludeSchemasText((prev) => toggleSchemaInText(prev, schema, checked));
    setSchemaFallbackSuggestion("");
    setFormError("");
  }

  function updateExcludedSchema(schema: string, checked: boolean) {
    setExcludeSchemasText((prev) => toggleSchemaInText(prev, schema, checked));
    setSchemaFallbackSuggestion("");
    setFormError("");
  }

  function selectAllDetectedSchemas() {
    setIncludeSchemasText(schemasToText(availableSchemas));
    setFormError("");
  }

  function clearSchemaSelection() {
    setIncludeSchemasText("");
    setExcludeSchemasText("");
    setSchemaFallbackSuggestion("");
    setFormError("");
  }

  function useDefaultSchemaFallback() {
    const defaultSchema = stringifyValue(fieldValues.default_schema).trim();
    if (!defaultSchema) return;
    setIncludeSchemasText(defaultSchema);
    setAvailableSchemas((prev) => (prev.includes(defaultSchema) ? prev : [defaultSchema]));
    setSchemaFallbackSuggestion("");
    setFormError("");
    setTestMessage(`Usando schema padrão informado: ${defaultSchema}.`);
    setToast({ tone: "success", message: `Schema padrão "${defaultSchema}" aplicado para catalogação.` });
  }

  function validateConnectionForm(mode: "create" | "edit"): string | null {
    if (!name.trim()) return "Preencha o nome da fonte de dados.";
    if (!selectedOption) return "Escolha um tipo de fonte de dados.";
    for (const field of [...selectedOption.connectionFields, ...selectedOption.secretFields]) {
      if (!fieldIsRequired(selectedTypeId, field, fieldValues, mode)) continue;
      const raw = fieldValues[field.key];
      if (field.kind === "checkbox") continue;
      if (!stringifyValue(raw).trim()) return `Preencha o campo ${field.label}.`;
    }

    return null;
  }

  function validateSaveForm(mode: "create" | "edit"): string | null {
    const baseError = validateConnectionForm(mode);
    if (baseError) return baseError;
    if (selectedTypeId === "postgres" && finalSchemas.length === 0) {
      const defaultSchema = stringifyValue(fieldValues.default_schema).trim();
      return defaultSchema
        ? "Nenhum schema foi selecionado. Reteste a conexão para carregar os schemas ou use o schema padrão informado."
        : "Nenhum schema foi selecionado. Reteste a conexão para carregar os schemas.";
    }
    return null;
  }

  async function testConnection() {
    const validationError = validateConnectionForm(formMode);
    if (validationError) {
      setFormError(validationError);
      setTestMessage(validationError);
      return;
    }
    if (!selectedOption) return;

    setFormError("");
    setTestState("loading");
    setTestMessage("");

    try {
      if (formMode === "edit" && editingId === null) {
        throw new Error("Não foi possível identificar a fonte de dados em edição.");
      }
      const payload = {
        db_type: selectedTypeId,
        connection: buildConnectionPayload(selectedTypeId, fieldValues),
        secrets: buildSecretsPayload(selectedTypeId, fieldValues),
      };
      const result = formMode === "edit" && editingId !== null
        ? await testExistingDataSourceConnection(editingId)
        : await testDataSourceConnection(payload);
      setTestState("done");
      setTestMessage(result.warning || result.message);
      setAvailableSchemas(result.schemas ?? []);
      if (selectedTypeId === "postgres" && result.success && !includeSchemasText && result.schemas?.length) {
        setIncludeSchemasText(schemasToText(result.schemas));
        setSchemaFallbackSuggestion("");
      } else if (selectedTypeId === "postgres" && result.success && (result.schemas?.length ?? 0) === 0) {
        const defaultSchema = stringifyValue(fieldValues.default_schema).trim();
        setSchemaFallbackSuggestion(defaultSchema);
      }
      setToast({ tone: result.success ? "success" : "error", message: result.message });
    } catch (error) {
      const message = (error as Error).message;
      setTestState("done");
      setTestMessage(message);
      setAvailableSchemas([]);
      setSchemaFallbackSuggestion("");
      setToast({ tone: "error", message });
    }
  }

  async function saveDatasource(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationError = validateSaveForm(formMode);
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        name,
        db_type: selectedTypeId,
        connection: buildConnectionPayload(selectedTypeId, fieldValues),
        secrets: buildSecretsPayload(selectedTypeId, fieldValues),
        detected_schemas: availableSchemas,
        include_schemas: includedSchemas,
        exclude_schemas: excludedSchemas,
        is_active: isActive,
      };

      if (formMode === "create") {
        await createDataSource(payload);
        setStatus("Fonte de dados criada");
        setToast({ tone: "success", message: "Fonte de dados criada com sucesso." });
      } else {
        if (editingId === null) {
          throw new Error("Não foi possível identificar a fonte de dados em edição.");
        }
        await updateDataSource(editingId, payload);
        setStatus("Fonte de dados atualizada");
        setToast({ tone: "success", message: "Fonte de dados atualizada com sucesso." });
      }

      closeDrawer();
      await load();
    } catch (error) {
      const message = (error as Error).message;
      setStatus(message);
      setToast({ tone: "error", message });
    } finally {
      setIsSaving(false);
    }
  }

  async function runScan(id: number) {
    try {
      const data = await runDataSourceScan(id);
      const message = scanRunMessage(data);
      setStatus(`Varredura #${data.id}: ${data.status}`);
      setToast({
        tone: data.status === "failed" ? "error" : "success",
        message:
          data.status === "failed"
            ? message ?? `A varredura #${data.id} falhou.`
            : data.status === "queued"
              ? `Varredura #${data.id} enfileirada para execução no Spark.`
              : `Varredura #${data.id} concluída com status ${data.status}.`,
      });
      await load();
    } catch (error) {
      const message = (error as Error).message;
      setStatus(message);
      setToast({ tone: "error", message });
    }
  }

  async function deleteDatasource() {
    if (!deletingTarget) return;
    setIsDeleting(true);
    try {
      await deleteDataSource(deletingTarget.id);
      setItems((prev) => prev.filter((item) => item.id !== deletingTarget.id));
      setScanRuns((prev) => prev.filter((run) => run.datasource_id !== deletingTarget.id));
      setToast({ tone: "success", message: `Fonte de dados "${deletingTarget.name}" excluída com sucesso.` });
      setDeletingTarget(null);
    } catch (error) {
      setToast({ tone: "error", message: (error as Error).message || "Não foi possível excluir a fonte de dados." });
    } finally {
      setIsDeleting(false);
    }
  }

  function renderField(field: DataSourceField, section: "connection" | "secret") {
    const value = fieldValues[field.key];
    const required = fieldIsRequired(selectedTypeId, field, fieldValues, formMode);
    const isConfiguredSecret = section === "secret" && configuredSecretKeys.includes(field.key);

    const sharedHint = field.helperText ? <p className="mt-1 text-xs text-muted">{field.helperText}</p> : null;
    const configuredHint =
      isConfiguredSecret && !stringifyValue(value).trim() ? (
        <p className="mt-1 text-xs text-muted">Segredo já configurado. Preencha apenas se quiser substituir.</p>
      ) : null;

    if (field.kind === "checkbox") {
      return (
        <label className="flex items-center gap-2 rounded-xl border border-border bg-bg-subtle/60 px-3 py-2 text-sm" key={field.key}>
          <input
            checked={value === true}
            onChange={(e) => updateField(field.key, e.target.checked)}
            type="checkbox"
          />
          <span>{field.label}</span>
        </label>
      );
    }

    return (
      <div key={field.key}>
        <label className="mb-1 block text-sm font-medium" htmlFor={field.key}>
          {field.label}
        </label>
        {field.kind === "textarea" ? (
          <Textarea
            id={field.key}
            onChange={(e) => updateField(field.key, e.target.value)}
            placeholder={field.placeholder}
            required={required}
            value={stringifyValue(value)}
          />
        ) : field.kind === "select" ? (
          <Select
            id={field.key}
            onChange={(e) => updateField(field.key, e.target.value)}
            required={required}
            value={stringifyValue(value)}
          >
            {(field.options ?? []).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        ) : (
          <Input
            id={field.key}
            inputMode={field.kind === "number" ? "numeric" : undefined}
            onChange={(e) => updateField(field.key, e.target.value)}
            placeholder={field.placeholder}
            required={required}
            type={field.kind === "number" ? "number" : field.kind === "password" ? "password" : "text"}
            value={stringifyValue(value)}
          />
        )}
        {sharedHint}
        {configuredHint}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">{t("pages.datasources.title")}</h2>
          <p className="text-sm text-text-body">Gerencie conexões, testes e varreduras de catálogo.</p>
        </div>
        {canManageDatasource ? (
          <Button data-doc-anchor="datasources-create" onClick={openDrawer}>
            <Plus className="mr-2 h-4 w-4" />
            Nova fonte de dados
          </Button>
        ) : (
          <Badge tone="neutral">Modo somente leitura</Badge>
        )}
      </div>

      {status ? <p className="text-sm text-text-body">{status}</p> : null}

      <Card className="overflow-hidden">
        <CardHeader className="space-y-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-text">Agendamento automático</h3>
              <p className="text-sm font-normal text-text-body">
                O scan das fontes segue a mesma experiência de agendamento do Data Quality.
              </p>
            </div>
            <Badge tone={schedulerStatus?.health === "degraded" ? "warning" : schedulerStatus?.is_enabled ? "success" : "neutral"}>
              {schedulerStatus?.health === "degraded" ? "Atenção" : schedulerStatus?.is_enabled ? "Ativo" : "Desativado"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-border bg-bg-subtle/70 p-4">
            <div className="text-xs uppercase tracking-wide text-muted">Estado</div>
            <div className="mt-1 text-sm font-semibold text-text">{schedulerStatus?.is_enabled ? "Ativo" : "Desativado"}</div>
          </div>
          <div className="rounded-2xl border border-border bg-bg-subtle/70 p-4">
            <div className="text-xs uppercase tracking-wide text-muted">Modo</div>
            <div className="mt-1 text-sm font-semibold text-text">{schedulerStatus?.mode || "embedded"}</div>
          </div>
          <div className="rounded-2xl border border-border bg-bg-subtle/70 p-4">
            <div className="text-xs uppercase tracking-wide text-muted">Health</div>
            <div className="mt-1 text-sm font-semibold text-text">{schedulerStatus?.health || "idle"}</div>
            {schedulerStatus?.last_error ? <p className="mt-1 text-xs text-danger-600">{schedulerStatus.last_error}</p> : null}
          </div>
          <div className="rounded-2xl border border-border bg-bg-subtle/70 p-4">
            <div className="text-xs uppercase tracking-wide text-muted">Fontes agendadas</div>
            <div className="mt-1 text-sm font-semibold text-text">{schedulerStatus?.scheduled_sources_total ?? 0}</div>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-4 md:col-span-2">
            <div className="text-xs uppercase tracking-wide text-muted">Última execução</div>
            <div className="mt-1 text-sm font-medium text-text">
              {schedulerStatus?.last_success_at
                ? formatDateTime(schedulerStatus.last_success_at)
                : schedulerStatus?.last_failure_at
                  ? formatDateTime(schedulerStatus.last_failure_at)
                  : "Sem registros"}
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-4 md:col-span-2">
            <div className="text-xs uppercase tracking-wide text-muted">Próxima execução</div>
            <div className="mt-1 text-sm font-medium text-text">
              {schedulerStatus?.next_expected_run_at ? formatDateTime(schedulerStatus.next_expected_run_at) : "Aguardando configuração"}
            </div>
          </div>
        </CardContent>
      </Card>

      {items.length === 0 ? (
        <EmptyState title="Nenhuma fonte de dados" description="Cadastre uma fonte de dados para iniciar a ingestão do catálogo." />
      ) : (
        <Card data-doc-anchor="datasources-list">
          <CardHeader className="text-sm font-semibold">{t("pages.datasources.title")}</CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <table className="min-w-full text-sm">
              <thead className="bg-bg-subtle text-left text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3">Nome</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Conexão</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Último scan</th>
                  <th className="px-4 py-3">Agendamento</th>
                  <th className="px-4 py-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const option = getDataSourceOption(item.db_type);
                  const schedule = scheduleByDatasourceId.get(item.id);
                  return (
                    <tr className="border-t border-border" key={item.id}>
                      <td className="px-4 py-3 font-medium">{item.name}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-bg-subtle px-3 py-1.5 text-text-body">
                          <DatabaseTechLogo className="h-7 w-7" engine={item.db_type} variant="compact" />
                          {option?.label ?? item.db_type.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-text-body">{summarizeConnection(item)}</td>
                      <td className="px-4 py-3">
                        <Badge tone={item.is_active ? "success" : "warning"}>{item.is_active ? "Ativa" : "Inativa"}</Badge>
                      </td>
                      <td className="px-4 py-3 text-muted">{latestScanInfo(item.id)}</td>
                      <td className="px-4 py-3">
                        {schedule ? (
                          <div className="space-y-1">
                            <Badge tone={schedule.schedule_enabled ? "success" : "neutral"}>
                              {schedule.schedule_enabled ? schedule.schedule_summary || "Agendamento configurado" : "Agendamento desativado"}
                            </Badge>
                            <p className="text-xs text-muted">
                              Próxima execução: {schedule.schedule_next_run_at ? formatDateTime(schedule.schedule_next_run_at) : "Aguardando cálculo"}
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <Badge tone="neutral">Sem agendamento</Badge>
                            <p className="text-xs text-muted">Configure um scan automático para esta fonte.</p>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {canManageDatasource ? (
                            <>
                              <Button disabled={isSaving || isDeleting} onClick={() => void openEditDrawer(item)} size="sm" variant="outline">
                                <Pencil className="mr-2 h-4 w-4" />
                                Editar
                              </Button>
                              <Button disabled={isSaving || isDeleting} onClick={() => openScheduleModal(item)} size="sm" variant="outline">
                                {schedule ? "Editar agendamento" : "Agendar scan"}
                              </Button>
                              <Button disabled={isSaving || isDeleting} onClick={() => setDeletingTarget(item)} size="sm" variant="ghost">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Excluir
                              </Button>
                              <Button disabled={isSaving || isDeleting} onClick={() => void runScan(item.id)} size="sm" variant="outline">
                                Executar varredura
                              </Button>
                            </>
                          ) : (
                            <Badge tone="neutral">Somente leitura</Badge>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <section id="scan-history">
        <Card>
          <CardHeader className="space-y-1">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-text">Histórico recente de scans</h3>
                <p className="text-sm font-normal text-text-body">
                  Acompanhe as últimas varreduras por fonte de dados sem depender da tela legada de execuções.
                </p>
              </div>
              <Badge tone="neutral">Superfície canônica: Fontes de dados</Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="overflow-x-auto">
              {recentScanRuns.length ? (
                <table className="min-w-full text-sm">
                  <thead className="bg-bg-subtle text-left text-xs uppercase tracking-wide text-muted">
                    <tr>
                      <th className="px-4 py-3">Execução</th>
                      <th className="px-4 py-3">Fonte</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Quando</th>
                      <th className="px-4 py-3 text-right">Diferenças</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentScanRuns.map((run) => {
                      const datasource = datasourceById.get(run.datasource_id);
                      const errorMessage = scanRunMessage(run);
                      return (
                        <tr className="border-t border-border" key={run.id}>
                          <td className="px-4 py-3 font-medium text-text">#{run.id}</td>
                          <td className="px-4 py-3 text-text-body">{datasource?.name ?? `Fonte #${run.datasource_id}`}</td>
                          <td className="px-4 py-3">
                            <div className="space-y-1">
                              <Badge tone={scanStatusTone(run.status)}>{presentStatus(run.status, "Na fila")}</Badge>
                              <p className="text-xs text-muted">{scanRunEngine(run)}</p>
                              {scanRunHeartbeat(run) ? <p className="text-xs text-muted">Heartbeat: {formatDateTime(scanRunHeartbeat(run))}</p> : null}
                              {errorMessage ? <p className="max-w-md text-xs text-muted">{errorMessage}</p> : null}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-muted">{new Date(run.created_at).toLocaleString()}</td>
                          <td className="px-4 py-3 text-right">
                            <Button onClick={() => void openScanDiffs(run.id)} size="sm" variant="outline">
                              Ver diffs
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <EmptyState title="Sem scans recentes" description="Quando uma fonte de dados executar uma varredura, o histórico aparecerá aqui." />
              )}
            </div>

            <div className="rounded-2xl border border-border bg-bg-subtle/70 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Diferenças do scan</p>
                  <h4 className="mt-1 text-sm font-semibold text-text">
                    {selectedScanRunId ? `Execução #${selectedScanRunId}` : "Selecione uma execução"}
                  </h4>
                </div>
                {isLoadingDiffs ? <Loader2 className="h-4 w-4 animate-spin text-muted" /> : null}
              </div>

              {scanRunDetail ? (
                <div className="mt-4 space-y-3 rounded-2xl border border-border bg-surface p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <Badge tone={scanStatusTone(scanRunDetail.status)}>{presentStatus(scanRunDetail.status, "Na fila")}</Badge>
                      <p className="text-sm font-medium text-text">{scanRunDetail.execution_engine || "Spark cluster"}</p>
                      {scanRunDetail.datasource_name ? <p className="text-xs text-muted">{scanRunDetail.datasource_name}</p> : null}
                    </div>
                    {scanRunLogsUrl(scanRunDetail) ? (
                      <a
                        className="inline-flex items-center rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-body transition hover:bg-bg-subtle"
                        href={scanRunLogsUrl(scanRunDetail) || undefined}
                        rel="noreferrer"
                        target="_blank"
                      >
                        Abrir logs
                      </a>
                    ) : null}
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-xl border border-border bg-bg-subtle/70 p-3">
                      <div className="text-[11px] uppercase tracking-wide text-muted">Spark app</div>
                      <div className="mt-1 text-sm font-medium text-text">{scanRunDetail.spark_application_id || "—"}</div>
                      <div className="mt-1 text-xs text-muted">{scanRunSparkDriverId(scanRunDetail) || "Driver não identificado"}</div>
                    </div>
                    <div className="rounded-xl border border-border bg-bg-subtle/70 p-3">
                      <div className="text-[11px] uppercase tracking-wide text-muted">Duração</div>
                      <div className="mt-1 text-sm font-medium text-text">
                        {scanRunDetail.duration_seconds != null ? `${scanRunDetail.duration_seconds}s` : "—"}
                      </div>
                      <div className="mt-1 text-xs text-muted">
                        {scanRunDetail.finished_at ? formatDateTime(scanRunDetail.finished_at) : "Em execução"}
                      </div>
                    </div>
                    <div className="rounded-xl border border-border bg-bg-subtle/70 p-3">
                      <div className="text-[11px] uppercase tracking-wide text-muted">Descoberta</div>
                      <div className="mt-1 text-sm font-medium text-text">{scanRunDiscoverySummary(scanRunDetail) || "Sem dados de descoberta"}</div>
                    </div>
                    <div className="rounded-xl border border-border bg-bg-subtle/70 p-3">
                      <div className="text-[11px] uppercase tracking-wide text-muted">Falha</div>
                      <div className="mt-1 text-sm font-medium text-text">{scanRunFailureStage(scanRunDetail) || "Sem falha registrada"}</div>
                      <div className="mt-1 text-xs text-muted">{scanRunDetail.error_code || "—"}</div>
                    </div>
                  </div>

                  {scanRunDetail.error_message ? (
                    <div className="rounded-xl border border-danger-200 bg-danger-50 px-3 py-2 text-sm text-danger-700">
                      <strong>Erro:</strong> {scanRunDetail.error_message}
                    </div>
                  ) : null}
                  {scanRunDetail.error_detail ? <p className="text-xs leading-5 text-muted">{scanRunDetail.error_detail}</p> : null}
                  {scanRunDetail.error_stacktrace ? (
                    <details className="rounded-xl border border-border bg-bg-subtle/70 px-3 py-2">
                      <summary className="cursor-pointer text-xs font-medium text-text-body">Stack trace</summary>
                      <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap text-[11px] leading-5 text-text-body">
                        {scanRunDetail.error_stacktrace}
                      </pre>
                    </details>
                  ) : null}
                </div>
              ) : null}

              {selectedScanRunId == null ? (
                <p className="mt-4 text-sm text-text-body">Abra uma execução recente para revisar as diferenças detectadas pelo scanner.</p>
              ) : scanDiffs.length ? (
                <div className="mt-4 space-y-2">
                  {scanDiffs.slice(0, 12).map((diff) => (
                    <div className="rounded-xl border border-border bg-surface px-3 py-2" key={diff.id}>
                      <div className="flex items-center justify-between gap-3">
                        <Badge tone="neutral">{diff.diff_type}</Badge>
                        <span className="text-xs uppercase tracking-wide text-muted">{diff.entity_type}</span>
                      </div>
                      <p className="mt-2 text-sm font-medium text-text">{diff.entity_key}</p>
                      {diff.details ? <p className="mt-1 text-xs text-muted">{diff.details}</p> : null}
                    </div>
                  ))}
                  {scanDiffs.length > 12 ? (
                    <p className="text-xs text-muted">Mostrando as 12 primeiras diferenças desta execução.</p>
                  ) : null}
                </div>
              ) : !isLoadingDiffs ? (
                <p className="mt-4 text-sm text-text-body">Esta execução não registrou diferenças ou ainda não publicou diffs.</p>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </section>

      <DatasourceEditorDrawer
        availableSchemas={availableSchemas}
        excludeSchemasText={excludeSchemasText}
        excludedSchemas={excludedSchemas}
        formError={formError}
        formMode={formMode}
        includeSchemasText={includeSchemasText}
        includedSchemas={includedSchemas}
        isActive={isActive}
        isDeleting={isDeleting}
        isLoadingDetail={isLoadingDetail}
        isSaving={isSaving}
        name={name}
        onClose={closeDrawer}
        onClearSchemaSelection={clearSchemaSelection}
        onExcludeSchemasChange={setExcludeSchemasText}
        onIncludeSchemasChange={setIncludeSchemasText}
        onIsActiveChange={setIsActive}
        onNameChange={setName}
        onUseDefaultSchemaFallback={useDefaultSchemaFallback}
        onSelectAllSchemas={selectAllDetectedSchemas}
        onStepChange={setStep}
        onSubmit={saveDatasource}
        onTestConnection={testConnection}
        onTypeSelect={(type) => {
          setSelectedTypeId(type);
          setFieldValues(buildDefaultFieldState(type));
          setConfiguredSecretKeys([]);
          setAvailableSchemas([]);
          setIncludeSchemasText("");
          setExcludeSchemasText("");
          setSchemaFallbackSuggestion("");
          setTestState("idle");
          setTestMessage("");
          setFormError("");
        }}
        onToggleExcludedSchema={updateExcludedSchema}
        onToggleIncludedSchema={updateIncludedSchema}
        open={isDrawerOpen}
        renderField={renderField}
        selectedOption={selectedOption}
        selectedTypeId={selectedTypeId}
        selectedTypeIsSupported={selectedTypeIsSupported}
        step={step}
        testMessage={testMessage}
        testState={testState}
        schemaFallbackSuggestion={schemaFallbackSuggestion}
      />

      <DeleteDatasourceDialog
        datasourceName={deletingTarget?.name ?? null}
        isDeleting={isDeleting}
        onClose={() => setDeletingTarget(null)}
        onConfirm={() => void deleteDatasource()}
        open={Boolean(deletingTarget)}
      />

      <DatasourceScheduleModal
        datasourceName={selectedScheduleDatasourceId ? datasourceById.get(selectedScheduleDatasourceId)?.name ?? "Fonte de dados" : "Fonte de dados"}
        form={scheduleForm}
        loading={isScheduleSaving}
        onClose={closeScheduleModal}
        onDelete={() => void deleteSchedule()}
        onFormChange={updateScheduleForm}
        onSave={() => void saveSchedule()}
        open={isScheduleModalOpen}
        schedule={selectedScheduleDatasourceId ? scheduleByDatasourceId.get(selectedScheduleDatasourceId) ?? null : null}
      />

      {toast ? (
        <div className="fixed bottom-4 right-4 z-[60] rounded-lg border border-border bg-surface px-4 py-3 text-sm shadow-lg">
          <div className="font-medium">{toast.tone === "success" ? "Sucesso" : "Atenção"}</div>
          <div className="text-text-body">{toast.message}</div>
        </div>
      ) : null}
    </div>
  );
}
