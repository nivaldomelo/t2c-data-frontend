import { FormEvent, useEffect, useMemo, useState } from "react";
import { Eye, Loader2, Pencil, Play, Plus, Search, TestTube, Trash2 } from "lucide-react";
import { Link } from "@/lib/next-shims";
import { useSearchParams } from "@/lib/next-shims";

import { DQSubnav } from "@/components/data-quality/dq-subnav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { DeleteRuleDialog } from "@/features/data-quality/components/delete-rule-dialog";
import { RuleDetailsDialog } from "@/features/data-quality/components/rule-details-dialog";
import { RulesEditorDrawer } from "@/features/data-quality/components/rules-editor-drawer";
import { RuleRunLogDialog } from "@/features/data-quality/components/rule-run-log-dialog";
import type {
  DQRuleCondition,
  DQJobRun,
  DQRule,
  DQRuleForm,
  RuleLogic,
  DQSchedulerStatus,
  RuleExecutionStatus,
  RuleRun,
  RuleSeverity,
  RuleStatus,
  RuleTest,
  RuleType,
  ScheduleMode,
} from "@/features/data-quality/types";
import { apiRequest } from "@/lib/client-api";
import { useAuth } from "@/lib/auth";
import { normalizePageItems, type PageResponse } from "@/lib/pagination";

const severityLabel: Record<RuleSeverity, string> = {
  critical: "Crítico",
  high: "Alto",
  medium: "Médio",
  low: "Baixo",
};

const severityTone: Record<RuleSeverity, "warning" | "neutral" | "success"> = {
  critical: "warning",
  high: "warning",
  medium: "neutral",
  low: "success",
};

const statusTone: Record<RuleStatus, "warning" | "success" | "neutral"> = {
  fail: "warning",
  pass: "success",
  error: "neutral",
};

const scheduleModeLabel: Record<ScheduleMode, string> = {
  manual: "Manual",
  interval: "Intervalo",
  daily: "Diário",
  weekly: "Semanal",
  biweekly: "Quinzenal",
  monthly: "Mensal",
};

const weekdayLabel = [
  "segunda-feira",
  "terça-feira",
  "quarta-feira",
  "quinta-feira",
  "sexta-feira",
  "sábado",
  "domingo",
];

function executionBadge(status: RuleExecutionStatus | null, violationsCount: number, errorMessage: string | null) {
  if (!status) return <span className="text-xs text-muted">Sem execução</span>;
  if (status === "queued" || status === "running") {
    return <Badge tone="neutral">{status === "queued" ? "NA FILA" : "EM EXECUÇÃO"}</Badge>;
  }
  if (status === "failed") {
    return <Badge tone="warning">ERRO</Badge>;
  }
  if (status === "success" && violationsCount > 0) {
    return <Badge tone="warning">VIOLAÇÃO</Badge>;
  }
  if (status === "success") {
    return <Badge tone="success">OK</Badge>;
  }
  return <Badge tone="neutral">{String(status).toUpperCase()}</Badge>;
}

function ruleEngineBadge(engine: string | null | undefined) {
  const normalized = (engine || "spark").toLowerCase();
  return normalized === "spark" ? <Badge tone="warning">Spark cluster</Badge> : <Badge tone="neutral">Histórico legado</Badge>;
}

function engineBadge(run: RuleRun) {
  const engine = (run.execution_engine || "spark").toLowerCase();
  if (engine === "spark") {
    return <Badge tone="warning">Spark cluster</Badge>;
  }
  return <Badge tone="neutral">Histórico legado</Badge>;
}

function jobStatusBadge(job: DQJobRun) {
  const s = (job.status || "").toLowerCase();
  if (s === "queued") return <Badge tone="neutral">Na fila</Badge>;
  if (s === "running") return <Badge tone="neutral">Executando</Badge>;
  if (s === "success") return <Badge tone="success">Concluída</Badge>;
  if (s === "failed") return <Badge tone="warning">Falhou</Badge>;
  return <Badge tone="neutral">{String(job.status).toUpperCase()}</Badge>;
}

function formatDurationMs(ms: number | null | undefined) {
  if (!ms || ms < 0) return "—";
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function formatRuleScheduleSummary(item: DQRule) {
  if (!item.schedule_enabled) return "Desativado";
  const mode = item.schedule_mode || "manual";
  if (mode === "interval") {
    const interval = item.schedule_every_minutes ?? 0;
    if (!interval) return "Intervalo técnico";
    if (interval % 60 === 0) {
      const hours = interval / 60;
      return hours === 1 ? "A cada 1 hora" : `A cada ${hours} horas`;
    }
    return `A cada ${interval} minutos`;
  }
  if (mode === "daily") {
    return `Diário às ${item.schedule_time || "08:00"}`;
  }
  if (mode === "weekly") {
    const weekday = weekdayLabel[Math.max(0, Math.min(6, item.schedule_day_of_week ?? 0))];
    return `Semanal na ${weekday} às ${item.schedule_time || "08:00"}`;
  }
  if (mode === "biweekly") {
    return `Quinzenal às ${item.schedule_time || "08:00"}`;
  }
  if (mode === "monthly") {
    return `Mensal no dia ${item.schedule_day_of_month ?? 1} às ${item.schedule_time || "08:00"}`;
  }
  return "Manual";
}

const emptyCondition: DQRuleCondition = {
  column: "",
  operator: "",
  value: "",
  value_to: "",
  values: [],
  compare_column: null,
  value_type: "none",
  time_unit: "days",
};

const ruleTypeLabel: Record<RuleType, string> = {
  column_validation: "Validação de coluna",
  nullability: "Nulidade",
  domain: "Domínio de valores",
  uniqueness: "Unicidade",
  freshness: "Freshness",
  column_comparison: "Comparação entre colunas",
  reconciliation: "Reconciliação",
};

const emptyComparison = {
  table_id: null,
  datasource_id: null,
  schema_name: "",
  table_name: "",
  table_fqn: "",
  metric: "count" as const,
  column: "",
  key_columns: [] as string[],
  tolerance_abs: null as number | null,
  tolerance_pct: null as number | null,
};

const emptyForm: DQRuleForm = {
  name: "",
  description: "",
  datasource_id: null,
  datasource_name: "",
  schema_id: null,
  schema_name: "",
  table_id: null,
  table_name: "",
  table_fqn: "",
  execution_engine: "spark",
  notification_recipient_user_id: null,
  notification_recipient_user_ids: [],
  schedule_mode: "daily",
  schedule_enabled: true,
  schedule_every_minutes: 60,
  schedule_time: "08:00",
  schedule_day_of_week: 0,
  schedule_day_of_month: 1,
  schedule_anchor_date: new Date().toISOString().slice(0, 10),
  rule_type: "column_validation" as RuleType,
  quality_dimension: null,
  rule_category: null,
  template_key: "",
  severity: "medium" as RuleSeverity,
  logic: "AND" as RuleLogic,
  conditions: [{ ...emptyCondition }],
  unique_columns: [],
  comparison_target: null,
  is_active: true,
};

export default function DQRulesPage() {
  const searchParams = useSearchParams();
  const auth = useAuth();
  const canWrite = auth.canAction("write", "dataQuality");
  const initialRuleId = searchParams.get("rule_id")?.trim() || "";
  const initialTableId = searchParams.get("tableId")?.trim() || searchParams.get("table_id")?.trim() || "";

  const [items, setItems] = useState<DQRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [schedulerStatus, setSchedulerStatus] = useState<DQSchedulerStatus | null>(null);
  const [toast, setToast] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  const [q, setQ] = useState("");
  const [tableFqnFilter, setTableFqnFilter] = useState("");
  const [severityFilter, setSeverityFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [lastStatusFilter, setLastStatusFilter] = useState("");
  const [ruleIdFilter, setRuleIdFilter] = useState(initialRuleId);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsRule, setDetailsRule] = useState<DQRule | null>(null);
  const [editingItem, setEditingItem] = useState<DQRule | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState<DQRule | null>(null);
  const [isDeletingRule, setIsDeletingRule] = useState(false);
  const [runningRuleId, setRunningRuleId] = useState<number | null>(null);
  const [testingRuleId, setTestingRuleId] = useState<number | null>(null);
  const [testResult, setTestResult] = useState<RuleTest | null>(null);
  const [runResult, setRunResult] = useState<RuleRun | null>(null);
  const [runJob, setRunJob] = useState<DQJobRun | null>(null);
  const [runHistory, setRunHistory] = useState<RuleRun[]>([]);
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [ruleJobs, setRuleJobs] = useState<Record<number, DQJobRun>>({});
  const [logViewerJob, setLogViewerJob] = useState<DQJobRun | null>(null);

  const currentLogJob = logViewerJob || runJob;

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set("page", "1");
    params.set("page_size", "100");
    if (ruleIdFilter.trim()) params.set("rule_id", ruleIdFilter.trim());
    if (q.trim()) params.set("q", q.trim());
    if (initialTableId.trim()) params.set("table_id", initialTableId.trim());
    if (tableFqnFilter.trim()) params.set("table_fqn", tableFqnFilter.trim());
    if (severityFilter) params.set("severity", severityFilter);
    if (activeFilter) params.set("is_active", activeFilter);
    if (lastStatusFilter) params.set("last_status", lastStatusFilter);
    const raw = params.toString();
    return raw ? `?${raw}` : "";
  }, [ruleIdFilter, q, initialTableId, tableFqnFilter, severityFilter, activeFilter, lastStatusFilter]);

  useEffect(() => {
    setRuleIdFilter(initialRuleId);
  }, [initialRuleId]);

  useEffect(() => {
    void loadRules();
  }, [queryString]);

  useEffect(() => {
    void loadSchedulerStatus();
  }, []);

  useEffect(() => {
    for (const item of items) {
      if ((item.last_job_status === "queued" || item.last_job_status === "running") && item.last_job_run_id) {
        if (!ruleJobs[item.id] || ruleJobs[item.id].id !== item.last_job_run_id) {
          void pollJobRun(item.last_job_run_id, item.id);
        }
      }
    }
  }, [items]);

  async function loadRules() {
    setLoading(true);
    try {
      const data = await apiRequest<DQRule[] | PageResponse<DQRule>>(`/v1/dq/rules${queryString}`);
      setItems(normalizePageItems(data));
      setStatus("");
    } catch {
      setStatus("Não foi possível carregar as regras de Data Quality no momento.");
    } finally {
      setLoading(false);
    }
  }

  async function loadSchedulerStatus() {
    try {
      const data = await apiRequest<DQSchedulerStatus>("/v1/dq/scheduler/status");
      setSchedulerStatus(data);
    } catch {
      setSchedulerStatus(null);
    }
  }

  function openCreateDrawer() {
    setEditingItem(null);
    setForm(emptyForm);
    setTestResult(null);
    setRunResult(null);
    setRunHistory([]);
    setDrawerOpen(true);
  }

  function openDetails(rule: DQRule) {
    setDetailsRule(rule);
    setDetailsOpen(true);
  }

  function openEditDrawer(item: DQRule) {
    const definition = item.rule_definition_json;
    setDetailsOpen(false);
    setEditingItem(item);
    setForm({
      name: item.name,
      description: item.description || "",
      datasource_id: item.datasource_id ?? item.rule_definition_json?.target.datasource_id ?? null,
      datasource_name: item.datasource_name || item.rule_definition_json?.target.datasource_name || "",
      schema_id: null,
      schema_name: item.schema_name || item.rule_definition_json?.target.schema_name || "",
      table_id: item.table_id,
      table_name: item.table_name || item.rule_definition_json?.target.table_name || "",
      table_fqn: item.table_fqn,
      execution_engine: "spark",
      notification_recipient_user_id: item.notification_recipient_user_id ?? null,
      notification_recipient_user_ids: item.notification_recipient_users.map((recipient) => recipient.id),
      schedule_mode: item.schedule_mode || (item.schedule_enabled ? (item.schedule_every_minutes ? "interval" : "daily") : "manual"),
      schedule_enabled: item.schedule_enabled,
      schedule_every_minutes: item.schedule_every_minutes,
      schedule_time: item.schedule_time || "08:00",
      schedule_day_of_week: item.schedule_day_of_week ?? 0,
      schedule_day_of_month: item.schedule_day_of_month ?? 1,
      schedule_anchor_date: item.schedule_anchor_date?.slice(0, 10) || new Date().toISOString().slice(0, 10),
      rule_type: item.rule_type,
      quality_dimension: definition?.dimension || null,
      rule_category: definition?.category || null,
      template_key: definition?.template_key || "",
      severity: item.severity,
      logic: item.rule_definition_json?.logic || "AND",
      conditions: item.rule_definition_json?.conditions?.length ? item.rule_definition_json.conditions : [{ ...emptyCondition }],
      unique_columns: item.rule_definition_json?.unique_columns || [],
      comparison_target: item.rule_definition_json?.comparison || null,
      is_active: item.is_active,
    });
    setTestResult(null);
    setRunResult(null);
    setRunHistory([]);
    setDrawerOpen(true);
    void loadRuleRuns(item.id);
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setRunJob(null);
  }

  async function saveRule(event: FormEvent) {
    event.preventDefault();
    if (!canWrite) return;

    setIsSaving(true);
    setToast(null);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        table_id: form.table_id,
        table_fqn: form.table_fqn.trim(),
        execution_engine: form.execution_engine,
        quality_dimension: form.quality_dimension,
        template_key: form.template_key || null,
        notification_recipient_user_id: form.notification_recipient_user_id,
        notification_recipient_user_ids: form.notification_recipient_user_ids,
        schedule_mode: form.schedule_mode,
        schedule_enabled: form.schedule_enabled,
        schedule_every_minutes: form.schedule_every_minutes,
        schedule_time: form.schedule_time || null,
        schedule_day_of_week: form.schedule_day_of_week,
        schedule_day_of_month: form.schedule_day_of_month,
        schedule_anchor_date: form.schedule_anchor_date || null,
        rule_type: form.rule_type,
        severity: form.severity,
        logic: form.logic,
        conditions: form.conditions,
        unique_columns: form.unique_columns,
        comparison_target: form.comparison_target,
        is_active: form.is_active,
      };

      if (editingItem) {
        await apiRequest<DQRule>(`/v1/dq/rules/${editingItem.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        setToast({ tone: "success", message: "Regra atualizada com sucesso." });
      } else {
        await apiRequest<DQRule>("/v1/dq/rules", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setToast({ tone: "success", message: "Regra criada com sucesso." });
      }

      closeDrawer();
      await loadRules();
    } catch (error) {
      setToast({ tone: "error", message: (error as Error).message });
    } finally {
      setIsSaving(false);
    }
  }

  async function testRule(item: DQRule) {
    if (!canWrite) return;
    setTestingRuleId(item.id);
    setTestResult(null);
    try {
      const data = await apiRequest<RuleTest>(`/v1/dq/rules/${item.id}/test`, { method: "POST" });
      setTestResult(data);
      setToast({ tone: "success", message: "Validação estrutural concluída." });
    } catch (error) {
      setToast({ tone: "error", message: (error as Error).message });
    } finally {
      setTestingRuleId(null);
    }
  }

  async function pollJobRun(jobId: number, ruleId: number) {
    let attempts = 0;
    while (attempts < 180) {
      attempts += 1;
      try {
        const data = await apiRequest<DQJobRun>(`/v1/dq/runs/${jobId}`);
        setRuleJobs((prev) => ({ ...prev, [ruleId]: data }));
        setRunJob(data);
        if (data.status === "success" || data.status === "failed") {
          setRunningRuleId(null);
          await loadRuleRuns(ruleId);
          await loadRules();
          return;
        }
      } catch (error) {
        setToast({ tone: "error", message: (error as Error).message });
        setRunningRuleId(null);
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
    setRunningRuleId(null);
    setToast({ tone: "error", message: "Timeout ao aguardar execução Spark." });
  }

  async function runRule(item: DQRule) {
    if (!canWrite) return;
    const activeJob = ruleJobs[item.id];
    if (activeJob && (activeJob.status === "queued" || activeJob.status === "running")) return;
    setRunningRuleId(item.id);
    setRunResult(null);
    setRunJob(null);
    try {
      const job = await apiRequest<DQJobRun>(`/v1/dq/rules/${item.id}/run`, {
        method: "POST",
        body: JSON.stringify({ execution_engine: "spark" }),
      });
      setRuleJobs((prev) => ({ ...prev, [item.id]: job }));
      setRunJob(job);
      setToast({
        tone: "success",
        message: "Execução enfileirada (Spark).",
      });
      void pollJobRun(job.id, item.id);
    } catch (error) {
      setToast({ tone: "error", message: (error as Error).message });
      setRunningRuleId(null);
    }
  }

  function effectiveRowJob(item: DQRule): DQJobRun | null {
    const live = ruleJobs[item.id];
    if (live) return live;
    if (item.last_job_run_id) {
      return {
        id: item.last_job_run_id,
        job_type: "rules",
        status: item.last_job_status || "queued",
        execution_engine: item.last_job_engine || "spark",
        dq_run_id: item.last_run_id ?? null,
        spark_app_id: item.last_job_spark_app_id ?? null,
        error_message: item.last_job_error_message ?? null,
        log_tail: item.last_job_log_tail ?? null,
        duration_ms: item.last_job_duration_ms ?? null,
        queued_at: null,
        started_at: null,
        finished_at: null,
        violations_count: item.last_violations_count ?? 0,
      };
    }
    return null;
  }

  async function loadRuleRuns(ruleId: number) {
    try {
      const data = await apiRequest<RuleRun[]>(`/v1/dq/rules/${ruleId}/runs?limit=20`);
      setRunHistory(data);
    } catch {
      setRunHistory([]);
    }
  }

  async function deleteRuleConfirmed() {
    if (!deleteCandidate || !canWrite) return;
    setIsDeletingRule(true);
    setToast(null);
    try {
      await apiRequest<void>(`/v1/dq/rules/${deleteCandidate.id}`, { method: "DELETE" });
      setItems((prev) => prev.filter((item) => item.id !== deleteCandidate.id));
      if (editingItem?.id === deleteCandidate.id) {
        closeDrawer();
      }
      setToast({ tone: "success", message: "Regra excluída com sucesso." });
      setDeleteCandidate(null);
    } catch (error) {
      setToast({
        tone: "error",
        message: `Não foi possível excluir a regra. ${(error as Error).message}`,
      });
    } finally {
      setIsDeletingRule(false);
    }
  }

  return (
    <div className="space-y-4">
      <DQSubnav />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Regras de Data Quality</h2>
          <p className="text-sm text-text-body">Crie validações visuais por fonte, tabela, coluna, operador e valor. Toda execução roda no cluster Spark.</p>
        </div>
        <div className="flex items-center gap-2">
          {canWrite ? (
            <Button data-doc-anchor="dq-rules-create" onClick={openCreateDrawer}>
              <Plus className="mr-2 h-4 w-4" />
              Criar regra
            </Button>
          ) : null}
        </div>
      </div>

      <Card data-doc-anchor="dq-rules-scheduler">
        <CardHeader className="text-sm font-semibold">Agendamento automático</CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted">Estado</p>
            <p className="mt-1 text-sm font-medium text-text">
              {schedulerStatus ? (schedulerStatus.is_enabled ? "Ativo" : "Desativado") : "Indisponível"}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted">Modo</p>
            <p className="mt-1 text-sm font-medium text-text">{schedulerStatus?.mode || "—"}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted">Health</p>
            <div className="mt-1">
              <Badge
                tone={
                  schedulerStatus?.health === "healthy"
                    ? "success"
                    : schedulerStatus?.health === "disabled" || schedulerStatus?.health === "idle"
                      ? "neutral"
                      : "warning"
                }
              >
                {schedulerStatus?.health ? schedulerStatus.health.toUpperCase() : "SEM STATUS"}
              </Badge>
            </div>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted">Última execução</p>
            <p className="mt-1 text-sm font-medium text-text">
              {schedulerStatus?.last_success_at
                ? new Date(schedulerStatus.last_success_at).toLocaleString("pt-BR")
                : schedulerStatus?.scheduled_rules_total
                  ? "Aguardando primeira execução"
                  : "Sem execuções registradas ainda"}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted">Regras agendadas</p>
            <p className="mt-1 text-sm font-medium text-text">{schedulerStatus?.scheduled_rules_total ?? 0}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted">Próxima execução</p>
            <p className="mt-1 text-sm font-medium text-text">
              {schedulerStatus?.next_expected_run_at ? new Date(schedulerStatus.next_expected_run_at).toLocaleString("pt-BR") : "Sem previsão ainda"}
            </p>
          </div>
          <div className="md:col-span-4">
            <p className="text-xs text-muted">
              A frequência é configurada por regra. Todos os administradores recebem automaticamente as notificações de violação.
            </p>
            {schedulerStatus?.last_error ? (
              <p className="mt-2 text-xs text-muted">
                {schedulerStatus.last_error.includes("table unavailable")
                  ? "O scheduler ainda está inicializando a camada de persistência."
                  : schedulerStatus.last_error}
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card data-doc-anchor="dq-rules-filters">
        <CardHeader className="text-sm font-semibold">Filtros</CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <Input onChange={(e) => setRuleIdFilter(e.target.value)} placeholder="ID da regra" value={ruleIdFilter} />
          <Input onChange={(e) => setQ(e.target.value)} placeholder="Busca por nome/descrição" value={q} />
          <Input onChange={(e) => setTableFqnFilter(e.target.value)} placeholder="Tabela (fqn)" value={tableFqnFilter} />
          <select className="h-10 rounded-md border border-border-strong px-3 text-sm" onChange={(e) => setSeverityFilter(e.target.value)} value={severityFilter}>
            <option value="">Severidade</option>
            <option value="critical">Crítico</option>
            <option value="high">Alto</option>
            <option value="medium">Médio</option>
            <option value="low">Baixo</option>
          </select>
          <select className="h-10 rounded-md border border-border-strong px-3 text-sm" onChange={(e) => setActiveFilter(e.target.value)} value={activeFilter}>
            <option value="">Ativa?</option>
            <option value="true">Ativa</option>
            <option value="false">Inativa</option>
          </select>
          <select className="h-10 rounded-md border border-border-strong px-3 text-sm" onChange={(e) => setLastStatusFilter(e.target.value)} value={lastStatusFilter}>
            <option value="">Status último run</option>
            <option value="queued">Queued</option>
            <option value="running">Running</option>
            <option value="success">Sucesso</option>
            <option value="failed">Failed</option>
          </select>
        </CardContent>
      </Card>

      {status ? <p className="text-sm text-danger-700">{status}</p> : null}

      {loading ? (
        <Card><CardContent className="p-5 text-sm text-muted">Carregando regras...</CardContent></Card>
      ) : items.length === 0 ? (
        <EmptyState
          title="Nenhuma regra cadastrada ainda"
          description="Crie a primeira regra visual para começar a monitorar nulidade, domínio, unicidade e freshness."
        />
      ) : (
        <Card data-doc-anchor="dq-rules-list">
          <CardHeader className="text-sm font-semibold">Regras</CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <table className="min-w-full text-sm">
              <thead className="bg-bg-subtle text-left text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3">Nome</th>
                  <th className="px-4 py-3">Tabela</th>
                  <th className="px-4 py-3">Agendamento</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Resumo</th>
                  <th className="px-4 py-3">Severidade</th>
                  <th className="px-4 py-3">Ativa</th>
                  <th className="px-4 py-3">Último run</th>
                  <th className="px-4 py-3">Incidente</th>
                  <th className="px-4 py-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr className="border-t border-border" key={item.id}>
                    <td className="px-4 py-3">
                      <button className="font-medium text-text underline-offset-2 hover:text-info-700 hover:underline" onClick={() => openDetails(item)} type="button">
                        {item.name}
                      </button>
                      <p className="truncate text-xs text-muted">{item.description || "-"}</p>
                    </td>
                    <td className="px-4 py-3 text-text-body">{item.table_fqn}</td>
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        <Badge tone={item.schedule_enabled ? "accent" : "neutral"}>{scheduleModeLabel[item.schedule_mode || "manual"]}</Badge>
                        {item.legacy_mode ? <Badge tone="neutral">Legada arquivada</Badge> : null}
                        <p className="max-w-[220px] truncate text-xs text-muted" title={item.schedule_summary || formatRuleScheduleSummary(item)}>
                          {item.schedule_summary || formatRuleScheduleSummary(item)}
                        </p>
                        <p className="text-xs text-muted">
                          Engine: {ruleEngineBadge(item.execution_engine)}
                        </p>
                        <p className="text-xs text-muted">
                          Próxima: {item.schedule_next_run_at ? new Date(item.schedule_next_run_at).toLocaleString("pt-BR") : "—"}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        <p>{ruleTypeLabel[item.rule_type] || item.rule_type}</p>
                        <p className="text-xs text-muted">{item.quality_dimension ? `Dimensão: ${item.quality_dimension}` : "Dimensão não informada"}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-text-body">{item.rule_summary || "Sem resumo"}</td>
                    <td className="px-4 py-3"><Badge tone={severityTone[item.severity]}>{severityLabel[item.severity]}</Badge></td>
                    <td className="px-4 py-3">{item.is_active ? "Sim" : "Não"}</td>
                    <td className="px-4 py-3">
                      {(() => {
                        const rowJob = effectiveRowJob(item);
                        const isJobActive = rowJob && (rowJob.status === "queued" || rowJob.status === "running");
                        if (rowJob) {
                          return (
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                {jobStatusBadge(rowJob)}
                                {ruleEngineBadge(rowJob.execution_engine)}
                                {(rowJob.status === "queued" || rowJob.status === "running") ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin text-muted" />
                                ) : null}
                              </div>
                              {rowJob.status === "failed" ? (
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="max-w-[220px] truncate text-xs text-danger-600" title={rowJob.error_message || "Falha na execução"}>
                                    {rowJob.error_message || "Falha na execução"}
                                  </p>
                                  <Button
                                    onClick={() => {
                                      setLogViewerJob(rowJob);
                                      setLogModalOpen(true);
                                    }}
                                    size="sm"
                                    type="button"
                                    variant="ghost"
                                  >
                                    Ver log
                                  </Button>
                                </div>
                              ) : rowJob.status === "success" ? (
                                <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                                  <span>{rowJob.violations_count ?? item.last_violations_count ?? 0} violações</span>
                                  <span>•</span>
                                  <span>duração {formatDurationMs(rowJob.duration_ms)}</span>
                                </div>
                              ) : (
                                <p className="text-xs text-muted">Aguardando processamento no cluster...</p>
                              )}
                            </div>
                          );
                        }
                        return item.last_run_status ? (
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            {executionBadge(item.last_run_status, item.last_violations_count ?? 0, item.last_error_message)}
                            {ruleEngineBadge(item.last_run_engine)}
                          </div>
                          {item.last_run_status === "failed" ? (
                            <p className="max-w-[220px] truncate text-xs text-danger-600" title={item.last_error_message || "Falha na execução"}>
                              {item.last_error_message || "Falha na execução"}
                            </p>
                          ) : (
                            <p className="text-xs text-muted">{item.last_violations_count ?? 0} violações</p>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted">Sem execução</span>
                      );
                      })()}
                    </td>
                    <td className="px-4 py-3">
                      {item.open_incident_id ? (
                        <Link
                          className="text-sm font-medium text-orange-700 underline-offset-2 hover:underline"
                          href={`/incidents?source_type=dq_rule&source_ref_id=${item.id}`}
                        >
                          {item.open_incident_status ? item.open_incident_status.toUpperCase() : "OPEN"} #{item.open_incident_id}
                        </Link>
                      ) : (
                        <span className="text-xs text-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Button onClick={() => openDetails(item)} size="sm" variant="ghost">
                          <Eye className="mr-1 h-4 w-4" />
                          Detalhes
                        </Button>
                        <Button disabled={!canWrite || item.legacy_mode} onClick={() => openEditDrawer(item)} size="sm" variant="outline">
                          <Pencil className="mr-1 h-4 w-4" />
                          Editar
                        </Button>
                        <Button
                          disabled={
                            !canWrite ||
                            item.legacy_mode ||
                            runningRuleId === item.id ||
                            ((effectiveRowJob(item)?.status === "queued") || (effectiveRowJob(item)?.status === "running"))
                          }
                          onClick={() => void runRule(item)}
                          size="sm"
                          variant="outline"
                        >
                          {runningRuleId === item.id ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Play className="mr-1 h-4 w-4" />}
                          Run
                        </Button>
                        <Button
                          disabled={!canWrite || item.legacy_mode || testingRuleId === item.id}
                          onClick={() => void testRule(item)}
                          size="sm"
                          variant="ghost"
                        >
                          {testingRuleId === item.id ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <TestTube className="mr-1 h-4 w-4" />}
                          Testar
                        </Button>
                        <Button
                          aria-label="Excluir regra"
                          disabled={!canWrite || isDeletingRule}
                          onClick={() => setDeleteCandidate(item)}
                          size="sm"
                          title="Excluir regra"
                          variant="ghost"
                        >
                          <Trash2 className="mr-1 h-4 w-4" />
                          Excluir
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {drawerOpen ? (
        <RulesEditorDrawer
          canWrite={canWrite}
          editingItem={editingItem}
          engineBadge={engineBadge}
          formatDurationMs={formatDurationMs}
          form={form}
          isSaving={isSaving}
          jobStatusBadge={jobStatusBadge}
          onClose={closeDrawer}
          onFormChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
          onOpenRunLog={() => setLogModalOpen(true)}
          onRunRule={(item) => void runRule(item)}
          onSubmit={saveRule}
          onTestRule={(item) => void testRule(item)}
          recipientUserId={form.notification_recipient_user_id}
          recipientUserLabel={editingItem?.notification_recipient_user_name || editingItem?.notification_recipient_user_email || null}
          recipientUserEmail={editingItem?.notification_recipient_user_email || null}
          open={drawerOpen}
          runHistory={runHistory}
          runJob={runJob}
          runResult={runResult}
          testResult={testResult}
          testingRuleId={testingRuleId}
        />
      ) : null}

      <RuleDetailsDialog
        canWrite={canWrite}
        initialRule={detailsRule}
        onClose={() => setDetailsOpen(false)}
        onEdit={(rule) => openEditDrawer(rule)}
        onRun={(rule) => void runRule(rule)}
        open={detailsOpen}
        ruleId={detailsRule?.id ?? null}
      />

      <DeleteRuleDialog
        candidate={deleteCandidate}
        isDeleting={isDeletingRule}
        onClose={() => setDeleteCandidate(null)}
        onConfirm={() => void deleteRuleConfirmed()}
        open={Boolean(deleteCandidate)}
      />

      {toast ? (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm rounded-lg border border-border bg-surface p-3 shadow-lg">
          <p className={`text-sm ${toast.tone === "success" ? "text-success-700" : "text-danger-700"}`}>{toast.message}</p>
          <button className="mt-2 text-xs text-muted underline" onClick={() => setToast(null)} type="button">Fechar</button>
        </div>
      ) : null}

      <RuleRunLogDialog
        job={currentLogJob}
        onClose={() => {
          setLogModalOpen(false);
          setLogViewerJob(null);
        }}
        open={logModalOpen}
      />
    </div>
  );
}
