import { UX_COPY } from "@/lib/presentation/status-copy";
import type { DQRule } from "@/features/data-quality/types";

export function dqRuleTypeLabel(value: DQRule["rule_type"] | string | null | undefined): string {
  const normalized = (value || "").toLowerCase();
  if (normalized === "column_validation") return "Validação de coluna";
  if (normalized === "nullability") return "Nulidade";
  if (normalized === "domain") return "Domínio de valores";
  if (normalized === "uniqueness") return "Unicidade";
  if (normalized === "freshness") return "Freshness";
  if (normalized === "column_comparison") return "Comparação entre colunas";
  return UX_COPY.notDefined;
}

export function dqRuleSeverityLabel(value: DQRule["severity"] | string | null | undefined): string {
  const normalized = (value || "").toLowerCase();
  if (normalized === "critical") return "Crítico";
  if (normalized === "high") return "Alto";
  if (normalized === "medium") return "Médio";
  if (normalized === "low") return "Baixo";
  return UX_COPY.notDefined;
}

export function dqRuleRunLabel(rule: DQRule): string {
  const jobStatus = (rule.last_job_status || "").toLowerCase();
  if (jobStatus === "queued") return "Na fila";
  if (jobStatus === "running") return "Em execução";
  if (jobStatus === "success") return "Concluída";
  if (jobStatus === "failed") return "Falhou";

  const runStatus = (rule.last_run_status || "").toLowerCase();
  if (runStatus === "queued") return "Na fila";
  if (runStatus === "running") return "Em execução";
  if (runStatus === "failed") return "Falhou";
  if (runStatus === "success") return rule.last_violations_count > 0 ? "Concluída com violações" : "Concluída";
  return "Sem status";
}

export function dqRuleHasFailure(rule: DQRule): boolean {
  const jobStatus = (rule.last_job_status || "").toLowerCase();
  const runStatus = (rule.last_run_status || "").toLowerCase();
  return rule.last_violations_count > 0 || jobStatus === "failed" || runStatus === "failed" || runStatus === "error";
}
