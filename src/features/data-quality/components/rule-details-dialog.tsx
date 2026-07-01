import { Link } from "@/lib/next-shims";
import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Loader2, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/client-api";
import { useModalDismiss } from "@/lib/use-modal-dismiss";
import type { DQRule, DQRuleCondition, RuleType } from "@/features/data-quality/types";

type RuleDetailsDialogProps = {
  open: boolean;
  ruleId: number | null;
  initialRule: DQRule | null;
  canWrite: boolean;
  onClose: () => void;
  onEdit: (rule: DQRule) => void;
  onRun: (rule: DQRule) => void;
};

const RULE_TYPE_LABELS: Record<RuleType, string> = {
  column_validation: "Validação de coluna",
  nullability: "Validação de nulidade",
  domain: "Domínio de valores",
  uniqueness: "Validação de unicidade",
  freshness: "Validação de freshness",
  column_comparison: "Comparação entre colunas",
  reconciliation: "Reconciliação",
};

const SEVERITY_LABELS: Record<string, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  critical: "Crítica",
};

function formatDateTime(value: string | null | undefined) {
  if (!value) return "Não disponível";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Não disponível";
  return parsed.toLocaleString("pt-BR");
}

function formatExecutionStatus(rule: DQRule) {
  const jobStatus = (rule.last_job_status || "").toLowerCase();
  if (jobStatus === "queued") return "Na fila";
  if (jobStatus === "running") return "Em execução";
  if (jobStatus === "success") return rule.last_violations_count > 0 ? "Concluída com violações" : "Concluída";
  if (jobStatus === "failed") return "Falhou";
  const runStatus = (rule.last_run_status || "").toLowerCase();
  if (runStatus === "success") return rule.last_violations_count > 0 ? "Concluída com violações" : "Concluída";
  if (runStatus === "failed") return "Falhou";
  if (runStatus === "running") return "Em execução";
  return "Sem execução";
}

function formatActorDisplay(name: string | null | undefined, email: string | null | undefined) {
  if (name && email) return `${name} (${email})`;
  return name || email || "Não disponível";
}

function formatDuration(value: number | null | undefined) {
  if (value == null) return "Não disponível";
  if (value < 1000) return `${value} ms`;
  return `${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)} s`;
}

function formatOperatorLabel(operator: string) {
  const labels: Record<string, string> = {
    equal: "igual a",
    not_equal: "diferente de",
    greater_than: "maior que",
    greater_or_equal: "maior ou igual a",
    less_than: "menor que",
    less_or_equal: "menor ou igual a",
    between: "entre",
    not_between: "fora do intervalo",
    contains: "contém",
    not_contains: "não contém",
    starts_with: "começa com",
    ends_with: "termina com",
    is_null: "é nulo",
    not_null: "não é nulo",
    matches_regex: "corresponde ao padrão",
    not_matches_regex: "não corresponde ao padrão",
    in_list: "está em lista",
    not_in_list: "não está em lista",
    unique: "deve ser único",
    freshness_within_last: "atualizada nos últimos",
    not_future: "não pode estar no futuro",
    column_greater_than_column: "maior que a coluna",
    column_less_than_column: "menor que a coluna",
    column_equal_to_column: "igual à coluna",
    column_required_when_other_present: "preenchida quando a coluna",
  };
  return labels[operator] || operator;
}

function summarizeCondition(condition: DQRuleCondition) {
  if (condition.operator === "is_null" || condition.operator === "not_null" || condition.operator === "unique") {
    return `${condition.column} ${formatOperatorLabel(condition.operator)}`;
  }
  if (condition.operator === "matches_regex" || condition.operator === "not_matches_regex") {
    return `${condition.column} ${formatOperatorLabel(condition.operator)} ${String(condition.value ?? "—")}`;
  }
  if (condition.operator === "not_future") {
    return `${condition.column} ${formatOperatorLabel(condition.operator)}`;
  }
  if (condition.operator === "between" || condition.operator === "not_between") {
    return `${condition.column} ${formatOperatorLabel(condition.operator)} ${condition.value} e ${condition.value_to}`;
  }
  if (condition.operator === "in_list" || condition.operator === "not_in_list") {
    return `${condition.column} ${formatOperatorLabel(condition.operator)}: ${(condition.values || []).join(", ")}`;
  }
  if (condition.operator === "freshness_within_last") {
    return `${condition.column} ${formatOperatorLabel(condition.operator)} ${condition.value} ${condition.time_unit === "hours" ? "horas" : "dias"}`;
  }
  if (
    condition.operator === "column_greater_than_column" ||
    condition.operator === "column_less_than_column" ||
    condition.operator === "column_equal_to_column" ||
    condition.operator === "column_required_when_other_present"
  ) {
    return `${condition.column} ${formatOperatorLabel(condition.operator)} ${condition.compare_column}`;
  }
  return `${condition.column} ${formatOperatorLabel(condition.operator)} ${String(condition.value ?? "—")}`;
}

export function RuleDetailsDialog({
  open,
  ruleId,
  initialRule,
  canWrite,
  onClose,
  onEdit,
  onRun,
}: RuleDetailsDialogProps) {
  useModalDismiss({ open, onClose });

  const [rule, setRule] = useState<DQRule | null>(initialRule);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!open || !ruleId) return;
    let active = true;
    setLoading(true);
    setError("");
    void (async () => {
      try {
        const data = await apiRequest<DQRule>(`/v1/dq/rules/${ruleId}`);
        if (active) setRule(data);
      } catch (err) {
        if (active) {
          setRule(initialRule);
          setError((err as Error).message || "Não foi possível carregar os detalhes da regra.");
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [open, ruleId, initialRule, reloadToken]);

  useEffect(() => {
    if (!open) {
      setRule(initialRule);
      setError("");
    }
  }, [open, initialRule]);

  const conditions = useMemo(() => rule?.rule_definition_json?.conditions || [], [rule]);
  const comparison = rule?.rule_definition_json?.comparison || null;

  if (!open) return null;

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-md"
      role="dialog"
    >
      <div className="flex h-[92dvh] w-full max-w-5xl flex-col overflow-hidden rounded-[28px] border border-border/80 bg-surface shadow-card">
        <div className="flex items-start justify-between gap-4 border-b border-border/70 bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_58%,#eef6ff_100%)] px-6 py-5">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold">Detalhes da regra</h3>
            <p className="mt-1 text-sm text-muted">Visualização somente leitura da regra de Data Quality.</p>
          </div>
          <button aria-label="Fechar" className="rounded-full border border-border/70 p-2 text-muted transition hover:border-border-strong hover:bg-bg-subtle hover:text-text" onClick={onClose} type="button">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="flex h-full items-center justify-center text-sm text-muted">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Carregando detalhes da regra...
            </div>
          ) : error && !rule ? (
            <div className="rounded-2xl border border-danger-200 bg-danger-50 p-4">
              <p className="text-sm text-danger-700">Não foi possível carregar os detalhes da regra.</p>
              <p className="mt-1 text-xs text-danger-600">{error}</p>
              <Button className="mt-3" onClick={() => setReloadToken((current) => current + 1)} type="button" variant="outline">
                Tentar novamente
              </Button>
            </div>
          ) : rule ? (
            <div className="space-y-5">
              {error ? (
                <div className="rounded-2xl border border-warning-200 bg-warning-50 p-4 text-sm text-warning-700">
                  Exibindo os dados já carregados da lista. A atualização completa do detalhe falhou agora.
                  <div className="mt-3">
                    <Button onClick={() => setReloadToken((current) => current + 1)} type="button" variant="outline">
                      Tentar novamente
                    </Button>
                  </div>
                </div>
              ) : null}

              <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4 shadow-sm xl:col-span-2">
                  <p className="text-xs uppercase tracking-wide text-muted">Regra</p>
                  <p className="mt-1 text-lg font-semibold text-text">{rule.name}</p>
                  <p className="mt-2 text-sm text-text-body">{rule.description || "Sem descrição."}</p>
                </div>
                <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4 shadow-sm">
                  <p className="text-xs uppercase tracking-wide text-muted">Status</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge tone={rule.is_active ? "success" : "neutral"}>{rule.is_active ? "Ativa" : "Inativa"}</Badge>
                    <Badge tone={rule.severity === "critical" || rule.severity === "high" ? "warning" : "neutral"}>
                      {SEVERITY_LABELS[rule.severity] || rule.severity}
                    </Badge>
                    {rule.legacy_mode ? <Badge tone="neutral">Legada arquivada</Badge> : null}
                  </div>
                </div>
                <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4 shadow-sm">
                  <p className="text-xs uppercase tracking-wide text-muted">Engine</p>
                  <p className="mt-1 text-sm font-medium text-text">{rule.legacy_mode ? "Legada arquivada" : "Spark cluster"}</p>
                </div>
                <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4 shadow-sm">
                  <p className="text-xs uppercase tracking-wide text-muted">Dimensão</p>
                  <p className="mt-1 text-sm font-medium text-text">{rule.quality_dimension || "Não informada"}</p>
                  <p className="mt-1 text-xs text-muted">{rule.template_key || "Sem template"}</p>
                </div>
              </section>

              <section className="rounded-2xl border border-border/80 bg-surface p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-text">Ativo monitorado</p>
                    <p className="text-xs text-muted">Contexto do ativo associado à regra.</p>
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div><p className="text-xs uppercase tracking-wide text-muted">Fonte</p><p className="mt-1 text-sm text-text">{rule.datasource_name || "Não disponível"}</p></div>
                  <div><p className="text-xs uppercase tracking-wide text-muted">Schema</p><p className="mt-1 text-sm text-text">{rule.schema_name || "Não disponível"}</p></div>
                  <div><p className="text-xs uppercase tracking-wide text-muted">Tabela</p><p className="mt-1 text-sm text-text">{rule.table_name || "Não disponível"}</p></div>
                  <div><p className="text-xs uppercase tracking-wide text-muted">table_id</p><p className="mt-1 text-sm text-text">{rule.table_id ?? "Não disponível"}</p></div>
                  <div className="xl:col-span-4"><p className="text-xs uppercase tracking-wide text-muted">FQN</p><p className="mt-1 text-sm text-text">{rule.table_fqn}</p></div>
                  <div className="xl:col-span-4 flex flex-wrap gap-3 text-sm">
                    {rule.table_id ? (
                      <>
                        <Link className="inline-flex items-center gap-1 font-medium text-info-700 hover:text-info-700" href={`/explorer?tableId=${rule.table_id}`}>
                          Abrir Explorer <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                        <Link className="inline-flex items-center gap-1 font-medium text-info-700 hover:text-info-700" href={`/explorer/data-journey?tableId=${rule.table_id}`}>
                          Abrir Jornada <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      </>
                    ) : (
                      <span className="text-muted">Links indisponíveis porque a tabela não está resolvida no payload atual.</span>
                    )}
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-border/80 bg-surface p-4 shadow-sm">
                <p className="text-sm font-semibold text-text">Definição da regra</p>
                <p className="mt-1 text-xs text-muted">Prioriza a definição estruturada em linguagem humana, sem exibir SQL livre.</p>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div><p className="text-xs uppercase tracking-wide text-muted">Tipo</p><p className="mt-1 text-sm text-text">{RULE_TYPE_LABELS[rule.rule_type] || rule.rule_type}</p></div>
                  <div><p className="text-xs uppercase tracking-wide text-muted">Lógica</p><p className="mt-1 text-sm text-text">{rule.rule_definition_json?.logic || "Não disponível"}</p></div>
                  <div><p className="text-xs uppercase tracking-wide text-muted">Resumo</p><p className="mt-1 text-sm text-text">{rule.rule_summary || "Não disponível"}</p></div>
                </div>
                <div className="mt-4 space-y-3">
                  {conditions.length > 0 ? (
                    conditions.map((condition, index) => (
                      <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4 shadow-sm" key={`${condition.column}-${condition.operator}-${index}`}>
                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                          <div><p className="text-xs uppercase tracking-wide text-muted">Coluna</p><p className="mt-1 text-sm text-text">{condition.column}</p></div>
                          <div><p className="text-xs uppercase tracking-wide text-muted">Tipo da coluna</p><p className="mt-1 text-sm text-text">{condition.column_data_type || "Não disponível"}</p></div>
                          <div><p className="text-xs uppercase tracking-wide text-muted">Operador</p><p className="mt-1 text-sm text-text">{formatOperatorLabel(condition.operator)}</p></div>
                          <div><p className="text-xs uppercase tracking-wide text-muted">Valor</p><p className="mt-1 text-sm text-text">{condition.values?.length ? condition.values.join(", ") : String(condition.value ?? condition.compare_column ?? "Não aplicável")}</p></div>
                          <div className="xl:col-span-4"><p className="text-xs uppercase tracking-wide text-muted">Interpretação</p><p className="mt-1 text-sm text-text">{summarizeCondition(condition)}</p></div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted">Nenhuma condição estruturada disponível.</p>
                  )}
                </div>
              </section>

              {comparison ? (
                <section className="rounded-2xl border border-border/80 bg-surface p-4 shadow-sm">
                  <p className="text-sm font-semibold text-text">Reconciliação / acurácia</p>
                  <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <div><p className="text-xs uppercase tracking-wide text-muted">Tabela comparada</p><p className="mt-1 text-sm text-text">{comparison.table_fqn || comparison.table_name || "Não disponível"}</p></div>
                    <div><p className="text-xs uppercase tracking-wide text-muted">Métrica</p><p className="mt-1 text-sm text-text">{comparison.metric || "count"}</p></div>
                    <div><p className="text-xs uppercase tracking-wide text-muted">Coluna</p><p className="mt-1 text-sm text-text">{comparison.column || "—"}</p></div>
                    <div><p className="text-xs uppercase tracking-wide text-muted">Chaves</p><p className="mt-1 text-sm text-text">{(comparison.key_columns || []).join(", ") || "—"}</p></div>
                  </div>
                </section>
              ) : null}

              <section className="grid gap-5 xl:grid-cols-2">
                <div className="rounded-2xl border border-border/80 bg-surface p-4 shadow-sm">
                  <p className="text-sm font-semibold text-text">Agendamento</p>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div><p className="text-xs uppercase tracking-wide text-muted">Modo</p><p className="mt-1 text-sm text-text">{rule.schedule_summary || "Manual"}</p></div>
                    <div><p className="text-xs uppercase tracking-wide text-muted">Ativo</p><p className="mt-1 text-sm text-text">{rule.schedule_enabled ? "Sim" : "Não"}</p></div>
                    <div><p className="text-xs uppercase tracking-wide text-muted">Próxima execução</p><p className="mt-1 text-sm text-text">{formatDateTime(rule.schedule_next_run_at)}</p></div>
                    <div><p className="text-xs uppercase tracking-wide text-muted">Última execução agendada</p><p className="mt-1 text-sm text-text">{formatDateTime(rule.schedule_last_run_at)}</p></div>
                  </div>
                </div>

                <div className="rounded-2xl border border-border/80 bg-surface p-4 shadow-sm">
                  <p className="text-sm font-semibold text-text">Execução</p>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div><p className="text-xs uppercase tracking-wide text-muted">Último status</p><p className="mt-1 text-sm text-text">{formatExecutionStatus(rule)}</p></div>
                    <div><p className="text-xs uppercase tracking-wide text-muted">Última execução</p><p className="mt-1 text-sm text-text">{formatDateTime(rule.last_job_finished_at || rule.last_job_started_at || rule.last_run_at || rule.schedule_last_run_at)}</p></div>
                    <div><p className="text-xs uppercase tracking-wide text-muted">Violações recentes</p><p className="mt-1 text-sm text-text">{rule.last_job_violations_count ?? rule.last_violations_count ?? 0}</p></div>
                    <div><p className="text-xs uppercase tracking-wide text-muted">Duração</p><p className="mt-1 text-sm text-text">{formatDuration(rule.last_job_duration_ms)}</p></div>
                    <div><p className="text-xs uppercase tracking-wide text-muted">execution_id</p><p className="mt-1 text-sm text-text">{rule.last_job_run_id ?? rule.last_run_id ?? "Não disponível"}</p></div>
                    <div><p className="text-xs uppercase tracking-wide text-muted">Linhas avaliadas</p><p className="mt-1 text-sm text-text">{rule.last_rows_checked ?? "Não disponível"}</p></div>
                    <div><p className="text-xs uppercase tracking-wide text-muted">Disparo</p><p className="mt-1 text-sm text-text">{rule.last_job_trigger_source === "scheduled" ? "Agendado" : rule.last_job_trigger_source === "manual" ? "Manual" : rule.last_job_trigger_source === "automatic" ? "Automático" : "Não disponível"}</p></div>
                    <div><p className="text-xs uppercase tracking-wide text-muted">Solicitado por</p><p className="mt-1 text-sm text-text">{formatActorDisplay(rule.last_job_requested_by_user_name, rule.last_job_requested_by_user_email)}</p></div>
                    <div><p className="text-xs uppercase tracking-wide text-muted">Resumo do job</p><p className="mt-1 text-sm text-text">{rule.last_job_total_rules != null ? `${rule.last_job_passed_rules ?? 0} passaram, ${rule.last_job_failed_rules ?? 0} falharam, ${rule.last_job_error_rules ?? 0} com erro` : "Não disponível"}</p></div>
                    {rule.last_job_error_message || rule.last_error_message ? (
                      <div className="md:col-span-2">
                        <p className="text-xs uppercase tracking-wide text-muted">Erro</p>
                        <p className="mt-1 text-sm text-danger-700">{rule.last_job_error_message || rule.last_error_message}</p>
                      </div>
                    ) : null}
                  </div>
                </div>
              </section>

              <section className="grid gap-5 xl:grid-cols-2">
                <div className="rounded-2xl border border-border/80 bg-surface p-4 shadow-sm">
                  <p className="text-sm font-semibold text-text">Incidente</p>
                  {rule.open_incident_id ? (
                    <div className="mt-4 space-y-2 text-sm">
                      <p>Status: <strong>{rule.open_incident_status || "open"}</strong></p>
                      <Link className="inline-flex items-center gap-1 font-medium text-info-700 hover:text-info-700" href={`/incidents?source_type=dq_rule&source_ref_id=${rule.id}`}>
                        Abrir ticket <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-muted">Nenhum incidente vinculado a esta regra.</p>
                  )}
                </div>

                <div className="rounded-2xl border border-border/80 bg-surface p-4 shadow-sm">
                  <p className="text-sm font-semibold text-text">Auditoria básica</p>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div><p className="text-xs uppercase tracking-wide text-muted">Criada em</p><p className="mt-1 text-sm text-text">{formatDateTime(rule.created_at)}</p></div>
                    <div><p className="text-xs uppercase tracking-wide text-muted">Atualizada em</p><p className="mt-1 text-sm text-text">{formatDateTime(rule.updated_at)}</p></div>
                    <div><p className="text-xs uppercase tracking-wide text-muted">Criada por</p><p className="mt-1 text-sm text-text">{formatActorDisplay(rule.created_by_user_name, rule.created_by_user_email)}</p></div>
                    <div><p className="text-xs uppercase tracking-wide text-muted">Atualizada por</p><p className="mt-1 text-sm text-text">{formatActorDisplay(rule.updated_by_user_name, rule.updated_by_user_email)}</p></div>
                    <div><p className="text-xs uppercase tracking-wide text-muted">Última alteração relevante</p><p className="mt-1 text-sm text-text">{rule.last_audit_action ? `${rule.last_audit_action} em ${formatDateTime(rule.last_audit_at)}` : "Use o histórico de auditoria para detalhes adicionais."}</p></div>
                  </div>
                </div>
              </section>
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border/70 bg-surface/95 px-6 py-4 backdrop-blur">
          {rule?.table_id ? (
            <Link href={`/data-quality?tableId=${rule.table_id}`}>
              <Button type="button" variant="outline">Abrir Data Quality</Button>
            </Link>
          ) : null}
          {rule?.table_id ? (
            <Link href={`/explorer/data-journey?tableId=${rule.table_id}`}>
              <Button type="button" variant="outline">Abrir Jornada</Button>
            </Link>
          ) : null}
          {canWrite && rule && !rule.legacy_mode ? (
            <Button onClick={() => onRun(rule)} type="button" variant="outline">Executar agora</Button>
          ) : null}
          {canWrite && rule && !rule.legacy_mode ? (
            <Button onClick={() => onEdit(rule)} type="button" variant="outline">Editar regra</Button>
          ) : null}
          <Button onClick={onClose} type="button">Fechar</Button>
        </div>
      </div>
    </div>
  );
}
