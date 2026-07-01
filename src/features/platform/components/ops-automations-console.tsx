import { Link } from "@/lib/next-shims";
import { useEffect, useMemo, useState, type FormEvent, type HTMLAttributes } from "react";
import { Bot, CheckCircle2, Clock3, Play, RefreshCw, ShieldAlert, Sparkles, TriangleAlert, WandSparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime } from "@/features/dashboard/components/shared";
import { platformSdk } from "@/features/platform/sdk";
import type {
  PlatformAutomationAction,
  PlatformAutomationActionsResponse,
  PlatformAutomationExecution,
  PlatformAutomationEvaluationResponse,
  PlatformAutomationExecuteInput,
  PlatformAutomationRule,
  PlatformAutomationRuleInput,
  PlatformAutomationRulesResponse,
} from "@/features/platform/types";
import { cn } from "@/lib/cn";

type RuleFormState = PlatformAutomationRuleInput & {
  id?: number | null;
  action_target_json_text: string;
};

type ExecuteFormState = {
  action_key: string;
  table_id: string;
  datasource_id: string;
  dq_rule_id: string;
  delivery_id: string;
  incident_id: string;
  data_owner_id: string;
  request_type: string;
  scope_kind: string;
  scope_value: string;
  target_json: Record<string, unknown> | null;
  target_json_text: string;
  notes: string;
};

const EMPTY_RULE_FORM: RuleFormState = {
  id: null,
  name: "",
  description: "",
  status: "active",
  scope_kind: "asset",
  scope_value: "",
  condition_kind: "risk_score",
  condition_operator: "gte",
  threshold_value: 60,
  window_days: 7,
  action_key: "open_incident",
  action_target_json: null,
  action_target_json_text: "{\n  \"table_id\": null\n}",
  execution_mode: "automatic",
  notify_owner: true,
  open_incident: false,
  schedule_enabled: true,
  notes: "",
};

const EMPTY_EXECUTE_FORM: ExecuteFormState = {
  action_key: "open_incident",
  table_id: "",
  datasource_id: "",
  dq_rule_id: "",
  delivery_id: "",
  incident_id: "",
  data_owner_id: "",
  request_type: "owner_review",
  scope_kind: "asset",
  scope_value: "",
  target_json: null,
  target_json_text: "{\n  \"table_id\": null\n}",
  notes: "",
};

function severityBadgeClass(status: string) {
  if (status === "succeeded") return "border-success-200 bg-success-50 text-success-700";
  if (status === "failed") return "border-danger-200 bg-danger-50 text-danger-700";
  if (status === "running") return "border-warning-200 bg-warning-50 text-warning-700";
  if (status === "suggested") return "border-info-200 bg-info-50 text-info-700";
  return "border-border bg-bg-subtle text-text-body";
}

function normalizeResponse<T>(payload: T[] | { items?: T[] } | null | undefined): T[] {
  if (Array.isArray(payload)) return payload;
  return payload?.items ?? [];
}

function parseJsonOrNull(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = JSON.parse(trimmed);
  if (parsed === null || typeof parsed !== "object") return null;
  return parsed as Record<string, unknown>;
}

function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-lg font-semibold tracking-tight text-text", className)} {...props} />;
}

function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-text-body", className)} {...props} />;
}

function toRuleForm(rule: PlatformAutomationRule): RuleFormState {
  return {
    id: rule.id,
    name: rule.name,
    description: rule.description ?? "",
    status: rule.status,
    scope_kind: rule.scope_kind,
    scope_value: rule.scope_value ?? "",
    condition_kind: rule.condition_kind,
    condition_operator: rule.condition_operator,
    threshold_value: rule.threshold_value,
    window_days: rule.window_days,
    action_key: rule.action_key,
    action_target_json: rule.action_target_json ?? null,
    action_target_json_text: JSON.stringify(rule.action_target_json ?? { table_id: null }, null, 2),
    execution_mode: rule.execution_mode,
    notify_owner: rule.notify_owner,
    open_incident: rule.open_incident,
    schedule_enabled: rule.schedule_enabled,
    notes: rule.notes ?? "",
  };
}

function actionForKey(actions: PlatformAutomationAction[], key: string) {
  return actions.find((action) => action.key === key) || null;
}

export function OpsAutomationsConsole() {
  const [actionsPayload, setActionsPayload] = useState<PlatformAutomationActionsResponse | null>(null);
  const [rulesPayload, setRulesPayload] = useState<PlatformAutomationRulesResponse | null>(null);
  const [executionsPayload, setExecutionsPayload] = useState<{ items?: PlatformAutomationExecution[]; generated_at?: string; total?: number } | null>(null);
  const [evaluationPayload, setEvaluationPayload] = useState<PlatformAutomationEvaluationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [executing, setExecuting] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [ruleEditorOpen, setRuleEditorOpen] = useState(false);
  const [ruleForm, setRuleForm] = useState<RuleFormState>({ ...EMPTY_RULE_FORM });
  const [executeForm, setExecuteForm] = useState<ExecuteFormState>({ ...EMPTY_EXECUTE_FORM });

  const actions = normalizeResponse(actionsPayload);
  const rules = normalizeResponse(rulesPayload);
  const executions = normalizeResponse(executionsPayload);

  const activeRules = useMemo(() => rules.filter((item) => item.status === "active"), [rules]);
  const automaticRules = useMemo(() => rules.filter((item) => item.execution_mode === "automatic"), [rules]);
  const suggestedExecutions = useMemo(() => executions.filter((item) => item.status === "suggested"), [executions]);
  const failedExecutions = useMemo(() => executions.filter((item) => item.status === "failed"), [executions]);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const [actionsData, rulesData, executionsData] = await Promise.all([
        platformSdk.listAutomationActions(),
        platformSdk.listAutomationRules(),
        platformSdk.listAutomationExecutions(30),
      ]);
      setActionsPayload(actionsData);
      setRulesPayload(rulesData);
      setExecutionsPayload(executionsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar as automações.");
      setActionsPayload(null);
      setRulesPayload(null);
      setExecutionsPayload(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  function openRuleCreate() {
    setRuleForm({ ...EMPTY_RULE_FORM });
    setRuleEditorOpen(true);
    setMessage("");
    setError("");
  }

  function openRuleEdit(rule: PlatformAutomationRule) {
    setRuleForm(toRuleForm(rule));
    setRuleEditorOpen(true);
    setMessage("");
    setError("");
  }

  async function saveRule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const actionTargetJson = parseJsonOrNull(ruleForm.action_target_json_text);
      const payload: PlatformAutomationRuleInput = {
        name: ruleForm.name.trim(),
        description: (ruleForm.description ?? "").trim() || null,
        status: ruleForm.status,
        scope_kind: ruleForm.scope_kind,
        scope_value: (ruleForm.scope_value ?? "").trim() || null,
        condition_kind: ruleForm.condition_kind,
        condition_operator: ruleForm.condition_operator,
        threshold_value: ruleForm.threshold_value === null || ruleForm.threshold_value === undefined ? null : Number(ruleForm.threshold_value),
        window_days: Number(ruleForm.window_days || 7),
        action_key: ruleForm.action_key,
        action_target_json: actionTargetJson,
        execution_mode: ruleForm.execution_mode,
        notify_owner: ruleForm.notify_owner,
        open_incident: ruleForm.open_incident,
        schedule_enabled: ruleForm.schedule_enabled,
        notes: (ruleForm.notes ?? "").trim() || null,
      };
      if (ruleForm.id) {
        await platformSdk.updateAutomationRule(ruleForm.id, payload);
      } else {
        await platformSdk.createAutomationRule(payload);
      }
      setRuleEditorOpen(false);
      setRuleForm({ ...EMPTY_RULE_FORM });
      setMessage("Regra salva com sucesso.");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar a regra.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteRule(ruleId: number) {
    if (!window.confirm("Confirma remover esta regra de automação?")) return;
    setExecuting(`delete:${ruleId}`);
    setError("");
    try {
      await platformSdk.deleteAutomationRule(ruleId);
      setMessage("Regra removida.");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível remover a regra.");
    } finally {
      setExecuting(null);
    }
  }

  async function runRule(ruleId: number) {
    setExecuting(`run:${ruleId}`);
    setError("");
    try {
      await platformSdk.runAutomationRule(ruleId);
      setMessage("Ação executada pela regra.");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível executar a regra.");
    } finally {
      setExecuting(null);
    }
  }

  async function evaluateRules() {
    setExecuting("evaluate");
    setError("");
    try {
      const result = await platformSdk.evaluateAutomationRules();
      setEvaluationPayload(result);
      setMessage(`Avaliação concluída: ${result.actions_executed} ação(ões) executada(s) e ${result.suggestions_created} sugestão(ões).`);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível avaliar as regras.");
    } finally {
      setExecuting(null);
    }
  }

  async function executeAction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setExecuting("manual");
    setError("");
    try {
      const payload = parseJsonOrNull(executeForm.target_json_text);
      const request: PlatformAutomationExecuteInput = {
        action_key: executeForm.action_key,
        table_id: executeForm.table_id ? Number(executeForm.table_id) : null,
        datasource_id: executeForm.datasource_id ? Number(executeForm.datasource_id) : null,
        dq_rule_id: executeForm.dq_rule_id ? Number(executeForm.dq_rule_id) : null,
        delivery_id: executeForm.delivery_id ? Number(executeForm.delivery_id) : null,
        incident_id: executeForm.incident_id ? Number(executeForm.incident_id) : null,
        data_owner_id: executeForm.data_owner_id ? Number(executeForm.data_owner_id) : null,
        request_type: executeForm.request_type || null,
        scope_kind: executeForm.scope_kind || null,
        scope_value: executeForm.scope_value.trim() || null,
        target_json: payload,
        notes: executeForm.notes.trim() || null,
      };
      await platformSdk.executeAutomationAction(request);
      setMessage("Ação executada com sucesso.");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível executar a ação.");
    } finally {
      setExecuting(null);
    }
  }

  const selectedAction = useMemo(() => actionForKey(actions, executeForm.action_key), [actions, executeForm.action_key]);
  const selectedRuleAction = useMemo(() => actionForKey(actions, ruleForm.action_key), [actions, ruleForm.action_key]);

  return (
    <div className="space-y-8 p-6 lg:p-8">
      <header className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Badge className="border-border bg-bg-subtle text-text-body">Automação operacional</Badge>
          <Badge className="border-success-200 bg-success-50 text-success-700">{activeRules.length} regras ativas</Badge>
          <Badge className="border-info-200 bg-info-50 text-info-700">{automaticRules.length} automáticas</Badge>
          <Badge className="border-warning-200 bg-warning-50 text-warning-700">{suggestedExecutions.length} sugestões</Badge>
        </div>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-text">Automações</h1>
            <p className="max-w-3xl text-sm leading-6 text-text-body">
              Configure regras do tipo "se condição, então ação", execute manualmente quando precisar e deixe o
              scheduler da plataforma avaliar o que já pode ser resolvido antes de virar incidente.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={evaluateRules} disabled={executing === "evaluate" || loading} className="gap-2">
              <RefreshCw className={cn("h-4 w-4", executing === "evaluate" ? "animate-spin" : "")} />
              Avaliar agora
            </Button>
            <Button onClick={openRuleCreate} variant="outline" className="gap-2">
              <WandSparkles className="h-4 w-4" />
              Nova regra
            </Button>
            <Button asChild variant="ghost">
              <Link href="/ops/cockpit" className="gap-2">
                <ShieldAlert className="h-4 w-4" />
                Voltar ao cockpit
              </Link>
            </Button>
          </div>
        </div>
        {(error || message || evaluationPayload) && (
          <div className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-text-body shadow-sm">
            {error ? <span className="text-danger-700">{error}</span> : null}
            {!error && message ? <span>{message}</span> : null}
            {!error && !message && evaluationPayload ? (
              <span>
                Avaliação em {formatDateTime(evaluationPayload.generated_at)}: {evaluationPayload.actions_executed} ação(ões) executada(s),
                {` `}{evaluationPayload.suggestions_created} sugestão(ões).
              </span>
            ) : null}
          </div>
        )}
      </header>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="border-border/80 bg-surface shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="h-4 w-4 text-info-600" />
              Execução assistida
            </CardTitle>
            <CardDescription>Executar ações operacionais de forma controlada a partir de um contexto explícito.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={executeAction} className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted">Ação</label>
                <Select value={executeForm.action_key} onChange={(event) => setExecuteForm((prev) => ({ ...prev, action_key: event.target.value }))}>
                  {actions.map((action) => (
                    <option key={action.key} value={action.key}>
                      {action.label}
                    </option>
                  ))}
                </Select>
                {selectedAction ? (
                  <p className="mt-2 text-xs text-muted">
                    {selectedAction.description}
                    {selectedAction.suggestion_only ? " Esta ação é sugerida e não executa uma escrita direta." : ""}
                  </p>
                ) : null}
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted">Table ID</label>
                <Input value={executeForm.table_id} onChange={(event) => setExecuteForm((prev) => ({ ...prev, table_id: event.target.value }))} placeholder="Ex.: 123" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted">Datasource ID</label>
                <Input value={executeForm.datasource_id} onChange={(event) => setExecuteForm((prev) => ({ ...prev, datasource_id: event.target.value }))} placeholder="Ex.: 5" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted">DQ Rule ID</label>
                <Input value={executeForm.dq_rule_id} onChange={(event) => setExecuteForm((prev) => ({ ...prev, dq_rule_id: event.target.value }))} placeholder="Ex.: 11" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted">Webhook Delivery ID</label>
                <Input value={executeForm.delivery_id} onChange={(event) => setExecuteForm((prev) => ({ ...prev, delivery_id: event.target.value }))} placeholder="Ex.: 44" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted">Incident ID</label>
                <Input value={executeForm.incident_id} onChange={(event) => setExecuteForm((prev) => ({ ...prev, incident_id: event.target.value }))} placeholder="Ex.: 18" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted">Data Owner ID</label>
                <Input value={executeForm.data_owner_id} onChange={(event) => setExecuteForm((prev) => ({ ...prev, data_owner_id: event.target.value }))} placeholder="Ex.: 21" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted">Request Type</label>
                <Input value={executeForm.request_type || ""} onChange={(event) => setExecuteForm((prev) => ({ ...prev, request_type: event.target.value }))} placeholder="owner_review" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted">Escopo</label>
                <Input value={executeForm.scope_kind || ""} onChange={(event) => setExecuteForm((prev) => ({ ...prev, scope_kind: event.target.value }))} placeholder="asset / domain / product" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted">Valor do escopo</label>
                <Input value={executeForm.scope_value || ""} onChange={(event) => setExecuteForm((prev) => ({ ...prev, scope_value: event.target.value }))} placeholder="orders, finance..." />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted">Payload JSON</label>
                <Textarea
                  value={executeForm.target_json_text}
                  onChange={(event) => setExecuteForm((prev) => ({ ...prev, target_json_text: event.target.value }))}
                  rows={6}
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted">Notas</label>
                <Textarea
                  value={executeForm.notes || ""}
                  onChange={(event) => setExecuteForm((prev) => ({ ...prev, notes: event.target.value }))}
                  rows={3}
                />
              </div>
              <div className="md:col-span-2 flex flex-wrap gap-2">
                <Button type="submit" disabled={executing === "manual"} className="gap-2">
                  <Play className="h-4 w-4" />
                  Executar ação
                </Button>
                <Button type="button" variant="outline" onClick={() => setExecuteForm({ ...EMPTY_EXECUTE_FORM, action_key: executeForm.action_key })}>
                  Limpar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-surface shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-violet-600" />
              Resumo operacional
            </CardTitle>
            <CardDescription>Leitura curta do que já está configurado e do que a plataforma está sugerindo.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <SummaryTile label="Regras ativas" value={activeRules.length} tone="sky" />
                  <SummaryTile label="Execuções sugeridas" value={suggestedExecutions.length} tone="amber" />
                  <SummaryTile label="Execuções com falha" value={failedExecutions.length} tone="rose" />
                  <SummaryTile label="Ações disponíveis" value={actions.length} tone="emerald" />
                </div>
                <div className="rounded-2xl border border-dashed border-border bg-bg-subtle p-4 text-sm text-text-body">
                  O scheduler da plataforma avalia as regras de automação em cada ciclo de manutenção da plataforma. A
                  execução assistida e o histórico ficam disponíveis nesta tela para operação diária.
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/80 bg-surface shadow-card">
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-text-body" />
              Regras de automação
            </CardTitle>
            <CardDescription>Configure "se condição, então ação" para risco operacional, DQ, integração e governança.</CardDescription>
          </div>
          <Button onClick={openRuleCreate} variant="outline">
            Nova regra
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : rules.length === 0 ? (
            <EmptyState
              title="Nenhuma regra cadastrada"
              description="Crie uma regra para transformar sinais operacionais em ações controladas."
              action={<Button onClick={openRuleCreate}>Criar primeira regra</Button>}
            />
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {rules.map((rule) => {
                const action = actionForKey(actions, rule.action_key);
                return (
                  <div key={rule.id} className="rounded-3xl border border-border bg-bg-subtle p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-semibold text-text">{rule.name}</h3>
                          <Badge className={cn("border", severityBadgeClass(rule.execution_mode === "automatic" ? "succeeded" : "suggested"))}>
                            {rule.execution_mode}
                          </Badge>
                          <Badge className="border-border bg-surface text-text-body">{rule.status}</Badge>
                        </div>
                        <p className="text-sm text-text-body">{rule.description || "Sem descrição."}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" onClick={() => void runRule(rule.id)} disabled={executing === `run:${rule.id}`}>
                          Executar agora
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => openRuleEdit(rule)}>
                          Editar
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => void deleteRule(rule.id)}>
                          Remover
                        </Button>
                      </div>
                    </div>
                    <div className="mt-4 grid gap-3 text-sm text-text-body sm:grid-cols-2">
                      <div>
                        <span className="font-medium text-text">Condição:</span>{" "}
                        {rule.condition_kind} {rule.condition_operator} {rule.threshold_value ?? "auto"}
                      </div>
                      <div>
                        <span className="font-medium text-text">Escopo:</span> {rule.scope_kind}
                        {rule.scope_value ? ` · ${rule.scope_value}` : ""}
                      </div>
                      <div>
                        <span className="font-medium text-text">Ação:</span> {action?.label || rule.action_key}
                      </div>
                      <div>
                        <span className="font-medium text-text">Janela:</span> {rule.window_days} dias
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Badge className="border-border bg-surface text-text-body">{rule.execution_count} execuções</Badge>
                      <Badge className="border-info-200 bg-info-50 text-info-700">{rule.suggested_count} sugeridas</Badge>
                      <Badge className="border-success-200 bg-success-50 text-success-700">{rule.succeeded_count} concluídas</Badge>
                      <Badge className="border-danger-200 bg-danger-50 text-danger-700">{rule.failed_count} falharam</Badge>
                    </div>
                    {rule.last_triggered_summary_json ? (
                      <pre className="mt-4 overflow-auto rounded-2xl border border-border bg-surface p-3 text-xs text-text-body">
                        {JSON.stringify(rule.last_triggered_summary_json, null, 2)}
                      </pre>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card className="border-border/80 bg-surface shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <WandSparkles className="h-4 w-4 text-fuchsia-600" />
              Catálogo de ações
            </CardTitle>
            <CardDescription>O que a plataforma pode executar ou sugerir hoje.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {actions.map((action) => (
              <div key={action.key} className="rounded-2xl border border-border bg-bg-subtle p-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-text">{action.label}</h3>
                  <Badge className={cn("border", action.suggestion_only ? "border-info-200 bg-info-50 text-info-700" : action.destructive ? "border-danger-200 bg-danger-50 text-danger-700" : "border-border bg-surface text-text-body")}>
                    {action.suggestion_only ? "sugestão" : action.destructive ? "risco" : "execução"}
                  </Badge>
                </div>
                <p className="mt-2 text-xs leading-5 text-text-body">{action.description}</p>
                <p className="mt-2 text-[11px] uppercase tracking-wide text-muted">{action.category_label}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-surface shadow-card">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock3 className="h-4 w-4 text-text-body" />
                Histórico de execução
              </CardTitle>
              <CardDescription>Últimas ações, sugestões e falhas geradas pelo motor de automação.</CardDescription>
            </div>
            <Button variant="ghost" onClick={() => void loadData()}>
              Atualizar
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : executions.length === 0 ? (
              <EmptyState title="Sem histórico" description="As execuções aparecerão aqui após a primeira avaliação ou execução manual." />
            ) : (
              executions.slice(0, 10).map((execution) => (
                <div key={execution.id} className="rounded-2xl border border-border bg-bg-subtle p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold text-text">{execution.action_label}</h3>
                        <Badge className={cn("border", severityBadgeClass(execution.status))}>{execution.status}</Badge>
                        <Badge className="border-border bg-surface text-text-body">{execution.execution_mode}</Badge>
                      </div>
                      <p className="text-xs text-text-body">
                        {execution.scope_kind}
                        {execution.scope_value ? ` · ${execution.scope_value}` : ""}
                        {execution.table_id ? ` · table #${execution.table_id}` : ""}
                      </p>
                    </div>
                    <div className="text-right text-xs text-muted">{execution.created_at ? formatDateTime(execution.created_at) : "agora"}</div>
                  </div>
                  <p className="mt-3 text-xs text-text-body">
                    {execution.error_message || (typeof execution.result_json === "object" && execution.result_json
                      ? JSON.stringify(execution.result_json)
                      : "Sem detalhes adicionais.")}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {ruleEditorOpen ? (
        <Card className="border-border/80 bg-surface shadow-card">
          <CardHeader>
            <CardTitle>{ruleForm.id ? "Editar regra" : "Nova regra"}</CardTitle>
            <CardDescription>
              Use a regra para reagir automaticamente a sinais de risco. A execução automática é avaliada pelo scheduler da plataforma.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={saveRule} className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted">Nome</label>
                <Input value={ruleForm.name} onChange={(event) => setRuleForm((prev) => ({ ...prev, name: event.target.value }))} />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted">Descrição</label>
                <Textarea value={ruleForm.description ?? ""} onChange={(event) => setRuleForm((prev) => ({ ...prev, description: event.target.value }))} rows={3} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted">Status</label>
                <Select value={ruleForm.status} onChange={(event) => setRuleForm((prev) => ({ ...prev, status: event.target.value }))}>
                  <option value="active">active</option>
                  <option value="paused">paused</option>
                  <option value="draft">draft</option>
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted">Modo de execução</label>
                <Select value={ruleForm.execution_mode} onChange={(event) => setRuleForm((prev) => ({ ...prev, execution_mode: event.target.value }))}>
                  <option value="automatic">automatic</option>
                  <option value="manual">manual</option>
                  <option value="suggested">suggested</option>
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted">Escopo</label>
                <Select value={ruleForm.scope_kind} onChange={(event) => setRuleForm((prev) => ({ ...prev, scope_kind: event.target.value }))}>
                  <option value="asset">asset</option>
                  <option value="domain">domain</option>
                  <option value="product">product</option>
                  <option value="pipeline">pipeline</option>
                  <option value="global">global</option>
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted">Escopo valor</label>
                <Input value={ruleForm.scope_value ?? ""} onChange={(event) => setRuleForm((prev) => ({ ...prev, scope_value: event.target.value }))} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted">Condição</label>
                <Select value={ruleForm.condition_kind} onChange={(event) => setRuleForm((prev) => ({ ...prev, condition_kind: event.target.value }))}>
                  <option value="risk_score">risk_score</option>
                  <option value="priority_score">priority_score</option>
                  <option value="open_incidents">open_incidents</option>
                  <option value="critical_open_incidents">critical_open_incidents</option>
                  <option value="dq_failures">dq_failures</option>
                  <option value="stale_hours">stale_hours</option>
                  <option value="owner_missing">owner_missing</option>
                  <option value="contract_validation_failed">contract_validation_failed</option>
                  <option value="pipeline_failed">pipeline_failed</option>
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted">Operador</label>
                <Select value={ruleForm.condition_operator} onChange={(event) => setRuleForm((prev) => ({ ...prev, condition_operator: event.target.value }))}>
                  <option value="gte">gte</option>
                  <option value="gt">gt</option>
                  <option value="lte">lte</option>
                  <option value="lt">lt</option>
                  <option value="eq">eq</option>
                  <option value="ne">ne</option>
                  <option value="exists">exists</option>
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted">Threshold</label>
                <Input
                  type="number"
                  value={ruleForm.threshold_value ?? ""}
                  onChange={(event) =>
                    setRuleForm((prev) => ({
                      ...prev,
                      threshold_value: event.target.value === "" ? null : Number(event.target.value),
                    }))
                  }
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted">Janela (dias)</label>
                <Input
                  type="number"
                  value={ruleForm.window_days}
                  onChange={(event) => setRuleForm((prev) => ({ ...prev, window_days: Number(event.target.value || 7) }))}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted">Ação</label>
                <Select value={ruleForm.action_key} onChange={(event) => setRuleForm((prev) => ({ ...prev, action_key: event.target.value }))}>
                  {actions.map((action) => (
                    <option key={action.key} value={action.key}>
                      {action.label}
                    </option>
                  ))}
                </Select>
                {selectedRuleAction ? <p className="mt-2 text-xs text-muted">{selectedRuleAction.description}</p> : null}
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted">Payload JSON da ação</label>
                <Textarea
                  value={ruleForm.action_target_json_text}
                  onChange={(event) => setRuleForm((prev) => ({ ...prev, action_target_json_text: event.target.value }))}
                  rows={5}
                />
              </div>
              <div className="flex items-center gap-4 md:col-span-2">
                <label className="flex items-center gap-2 text-sm text-text-body">
                  <input
                    checked={ruleForm.notify_owner}
                    onChange={(event) => setRuleForm((prev) => ({ ...prev, notify_owner: event.target.checked }))}
                    type="checkbox"
                  />
                  Notificar owner
                </label>
                <label className="flex items-center gap-2 text-sm text-text-body">
                  <input
                    checked={ruleForm.open_incident}
                    onChange={(event) => setRuleForm((prev) => ({ ...prev, open_incident: event.target.checked }))}
                    type="checkbox"
                  />
                  Abrir incidente
                </label>
                <label className="flex items-center gap-2 text-sm text-text-body">
                  <input
                    checked={ruleForm.schedule_enabled}
                    onChange={(event) => setRuleForm((prev) => ({ ...prev, schedule_enabled: event.target.checked }))}
                    type="checkbox"
                  />
                  Scheduler habilitado
                </label>
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted">Notas</label>
                <Textarea value={ruleForm.notes ?? ""} onChange={(event) => setRuleForm((prev) => ({ ...prev, notes: event.target.value }))} rows={3} />
              </div>
              <div className="md:col-span-2 flex flex-wrap gap-2">
                <Button type="submit" disabled={saving} className="gap-2">
                  {saving ? <CheckCircle2 className="h-4 w-4 animate-pulse" /> : <WandSparkles className="h-4 w-4" />}
                  Salvar regra
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setRuleEditorOpen(false);
                    setRuleForm({ ...EMPTY_RULE_FORM });
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function SummaryTile({ label, value, tone }: { label: string; value: number; tone: "sky" | "amber" | "rose" | "emerald" }) {
  const toneClass =
    tone === "sky"
      ? "border-info-200 bg-info-50 text-info-700"
      : tone === "amber"
        ? "border-warning-200 bg-warning-50 text-warning-700"
        : tone === "rose"
          ? "border-danger-200 bg-danger-50 text-danger-700"
          : "border-success-200 bg-success-50 text-success-700";
  return (
    <div className={cn("rounded-2xl border p-4", toneClass)}>
      <div className="text-xs uppercase tracking-wide opacity-80">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}
