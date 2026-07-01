import type {
  DQRule,
  DQProfilingSchedule,
  DQProfilingScheduleForm,
  ScheduleMode,
} from "@/features/data-quality/types";

export function createDefaultProfilingScheduleForm(scope: "table" | "schema"): DQProfilingScheduleForm {
  return {
    scope,
    execution_engine: "spark",
    name: "",
    schedule_mode: "daily",
    schedule_enabled: true,
    schedule_every_minutes: null,
    schedule_time: "08:00",
    schedule_timezone: "America/Sao_Paulo",
    schedule_day_of_week: 0,
    schedule_day_of_month: 1,
    schedule_anchor_date: new Date().toISOString().slice(0, 10),
    recipient_user_ids: [],
    table_ids: [],
    datasource_id: null,
    schema_name: "",
  };
}

export function profilingScheduleToForm(schedule: DQProfilingSchedule | null, scope: "table" | "schema"): DQProfilingScheduleForm {
  if (!schedule) {
    return createDefaultProfilingScheduleForm(scope);
  }
  return {
    scope: schedule.scope,
    execution_engine: "spark",
    name: schedule.name || "",
    schedule_mode: (schedule.schedule_mode || "manual") as ScheduleMode,
    schedule_enabled: schedule.schedule_enabled,
    schedule_every_minutes: schedule.schedule_every_minutes,
    schedule_time: schedule.schedule_time || "08:00",
    schedule_timezone: schedule.schedule_timezone || "America/Sao_Paulo",
    schedule_day_of_week: schedule.schedule_day_of_week ?? 0,
    schedule_day_of_month: schedule.schedule_day_of_month ?? 1,
    schedule_anchor_date: schedule.schedule_anchor_date ? schedule.schedule_anchor_date.slice(0, 10) : new Date().toISOString().slice(0, 10),
    recipient_user_ids: schedule.notification_recipients.map((recipient) => recipient.id),
    table_ids: schedule.table_ids,
    datasource_id: schedule.datasource_id,
    schema_name: schedule.schema_name || "",
  };
}

export function formatProfilingScheduleSummary(schedule: DQProfilingSchedule | null): string {
  if (!schedule) return "Nenhum agendamento configurado.";
  return schedule.schedule_summary || "Agendamento configurado.";
}

export function formatExecutionTimestamp(value: string | null | undefined): string {
  if (!value) return "Sem informação";
  return new Date(value).toLocaleString("pt-BR");
}

export function formatDurationMs(value: number | null | undefined): string {
  if (value === null || value === undefined) return "Sem duração";
  if (value < 1000) return `${value} ms`;
  return `${(value / 1000).toFixed(1)}s`;
}

export function profilingRunStatusMeta(status: string | null | undefined) {
  switch ((status || "").toLowerCase()) {
    case "queued":
      return { label: "Em fila", tone: "warning" as const, detail: "A execução foi solicitada e aguarda processamento." };
    case "running":
      return { label: "Executando", tone: "accent" as const, detail: "O motor está coletando métricas e persistindo resultados." };
    case "success":
      return { label: "Concluído com sucesso", tone: "success" as const, detail: "Perfilamento finalizado e métricas atualizadas." };
    case "timeout":
      return { label: "Timeout", tone: "danger" as const, detail: "O Spark excedeu o tempo limite antes de concluir o perfilamento." };
    case "failed":
      return { label: "Falhou", tone: "danger" as const, detail: "A execução terminou com erro ou degradação." };
    case "cancelled":
      return { label: "Cancelado", tone: "neutral" as const, detail: "A execução foi interrompida." };
    case "requested":
      return { label: "Solicitado", tone: "warning" as const, detail: "A solicitação foi aceita e será processada em seguida." };
    case "no_data":
      return { label: "Sem dados", tone: "neutral" as const, detail: "Não houve dados suficientes para calcular o perfil." };
    default:
      return { label: "Desconhecido", tone: "neutral" as const, detail: "O backend ainda não retornou um estado final confiável." };
  }
}

export function executionOriginLabel(value: string | null | undefined) {
  switch ((value || "").toLowerCase()) {
    case "manual":
      return "Manual";
    case "scheduled":
      return "Agendada";
    case "automatic":
      return "Automática";
    default:
      return "Não informado";
  }
}

export function tableRuleExecutionLabel(rule: DQRule) {
  if (!rule.is_active) return "Inativa";
  if (!rule.last_run_id || rule.last_run_status === null) return "Não executada";
  if (rule.last_run_status === "queued") return "Em fila";
  if (rule.last_run_status === "running") return "Em execução";
  if (rule.last_run_status === "failed" || rule.last_error_message) return "Erro técnico";
  if (rule.last_violations_count > 0) return "Violada";
  return "Passou";
}

export function tableRuleExecutionTone(rule: DQRule): "success" | "warning" | "neutral" | "danger" {
  if (!rule.is_active) return "neutral";
  if (!rule.last_run_id || rule.last_run_status === null) return "neutral";
  if (rule.last_run_status === "queued" || rule.last_run_status === "running") return "warning";
  if (rule.last_run_status === "failed" || rule.last_error_message) return "danger";
  if (rule.last_violations_count > 0) return "warning";
  return "success";
}

export function ruleSeverityLabel(severity: DQRule["severity"]) {
  switch (severity) {
    case "critical":
      return "Crítica";
    case "high":
      return "Alta";
    case "medium":
      return "Média";
    case "low":
      return "Baixa";
    default:
      return severity;
  }
}

export function ruleTypeLabel(ruleType: DQRule["rule_type"]) {
  switch (ruleType) {
    case "column_validation":
      return "Validação de coluna";
    case "nullability":
      return "Nulidade";
    case "domain":
      return "Domínio de valores";
    case "uniqueness":
      return "Unicidade";
    case "freshness":
      return "Freshness";
    case "column_comparison":
      return "Comparação entre colunas";
    default:
      return ruleType;
  }
}
