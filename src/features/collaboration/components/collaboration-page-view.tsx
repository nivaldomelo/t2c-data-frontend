import { Link } from "@/lib/next-shims";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "@/lib/next-shims";
import {
  ArrowRight,
  Bell,
  Clock3,
  MessageSquare,
  Plus,
  ShieldCheck,
  Users,
  Workflow,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { AssetSearchInput, type AssetSuggestion } from "@/components/ui/asset-search-input";
import { ContextualJourneyCard } from "@/components/navigation/contextual-journey-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import { collaborationApi, getCollaborationSummary } from "../api";
import type {
  CollaborationCommentInput,
  CollaborationSummary,
  CollaborationTask,
  CollaborationTaskInput,
  CollaborationTaskUpdateInput,
  CollaborationEntityType,
} from "../types";

const ENTITY_OPTIONS: Array<{ value: CollaborationEntityType; label: string; hint: string }> = [
  { value: "table", label: "Ativo / tabela", hint: "Contexto operacional e catálogo" },
  { value: "incident", label: "Incidente", hint: "Casos e triagem operacional" },
  { value: "dq_rule", label: "Regra DQ", hint: "Qualidade e validação" },
  { value: "semantic_domain", label: "Domínio", hint: "Organização semântica" },
  { value: "semantic_product", label: "Produto de dados", hint: "Unidade lógica do negócio" },
];

const TASK_TYPES: Array<{ value: string; label: string }> = [
  { value: "governance_task", label: "Tarefa de governança" },
  { value: "update_documentation", label: "Atualizar documentação" },
  { value: "define_owner", label: "Definir owner" },
  { value: "review_contract", label: "Revisar contrato" },
  { value: "validate_quality", label: "Validar qualidade" },
  { value: "request_review", label: "Solicitar revisão" },
];

const RESPONSIBILITY_ROLES: Array<{ value: string; label: string }> = [
  { value: "", label: "Sem papel definido" },
  { value: "owner", label: "Owner" },
  { value: "steward", label: "Steward" },
  { value: "quality", label: "Qualidade" },
  { value: "domain_owner", label: "Responsável por domínio" },
  { value: "product_owner", label: "Responsável por produto" },
];

const TASK_STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "open", label: "Aberta" },
  { value: "in_progress", label: "Em andamento" },
  { value: "blocked", label: "Bloqueada" },
  { value: "done", label: "Concluída" },
];

const TASK_PRIORITY_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "low", label: "Baixa" },
  { value: "medium", label: "Média" },
  { value: "high", label: "Alta" },
  { value: "critical", label: "Crítica" },
];

const COMMENT_KINDS = [
  { value: "comment", label: "Comentário" },
  { value: "note", label: "Observação" },
  { value: "decision", label: "Decisão" },
  { value: "resolution", label: "Resolução" },
];

const STATUS_TONES: Record<string, "neutral" | "accent" | "warning" | "success"> = {
  open: "warning",
  in_progress: "accent",
  blocked: "warning",
  done: "success",
};

function formatDate(value?: string | null): string {
  if (!value) return "Sem data";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function fromDateTimeLocalValue(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function labelForEntityType(value: CollaborationEntityType | string): string {
  return ENTITY_OPTIONS.find((item) => item.value === value)?.label || value;
}

function labelForRole(value?: string | null): string {
  return RESPONSIBILITY_ROLES.find((item) => item.value === (value || ""))?.label || value || "Sem papel definido";
}

function labelForPriority(value?: string | null): string {
  return TASK_PRIORITY_OPTIONS.find((item) => item.value === (value || ""))?.label || value || "Prioridade";
}

function taskTypeLabel(value?: string | null): string {
  return TASK_TYPES.find((item) => item.value === (value || ""))?.label || value || "Tarefa";
}

function commentKindLabel(value?: string | null): string {
  return COMMENT_KINDS.find((item) => item.value === (value || ""))?.label || value || "Comentário";
}

function statusTone(status: string): "neutral" | "accent" | "warning" | "success" {
  return STATUS_TONES[status] || "neutral";
}

type TaskFormState = {
  entity_type: CollaborationEntityType;
  entity_id: string;
  entity_label: string;
  title: string;
  description: string;
  task_type: string;
  status: string;
  priority: string;
  responsibility_role: string;
  assigned_to_user_id: string;
  due_at: string;
  comment: string;
};

type CommentFormState = {
  entity_type: CollaborationEntityType;
  entity_id: string;
  entity_label: string;
  body: string;
  comment_kind: string;
  task_id: string;
  parent_comment_id: string;
};

const EMPTY_TASK_FORM: TaskFormState = {
  entity_type: "table",
  entity_id: "",
  entity_label: "",
  title: "",
  description: "",
  task_type: "governance_task",
  status: "open",
  priority: "medium",
  responsibility_role: "",
  assigned_to_user_id: "",
  due_at: "",
  comment: "",
};

const EMPTY_COMMENT_FORM: CommentFormState = {
  entity_type: "table",
  entity_id: "",
  entity_label: "",
  body: "",
  comment_kind: "comment",
  task_id: "",
  parent_comment_id: "",
};

function toTaskFormFromSummary(searchParams: URLSearchParams): TaskFormState {
  const entityType = (searchParams.get("entity_type") as CollaborationEntityType | null) || "table";
  const entityId = searchParams.get("entity_id") || "";
  const entityLabel = searchParams.get("entity_label") || "";
  const title = searchParams.get("title") || "";
  const description = searchParams.get("description") || "";
  const responsibilityRole = searchParams.get("responsibility_role") || "";
  return {
    ...EMPTY_TASK_FORM,
    entity_type: entityType,
    entity_id: entityId,
    entity_label: entityLabel,
    title,
    description,
    responsibility_role: responsibilityRole,
  };
}

function toCommentFormFromSummary(searchParams: URLSearchParams): CommentFormState {
  const entityType = (searchParams.get("entity_type") as CollaborationEntityType | null) || "table";
  const entityId = searchParams.get("entity_id") || "";
  const entityLabel = searchParams.get("entity_label") || "";
  return {
    ...EMPTY_COMMENT_FORM,
    entity_type: entityType,
    entity_id: entityId,
    entity_label: entityLabel,
  };
}

export function CollaborationPageView() {
  const searchParams = useSearchParams();
  const [summary, setSummary] = useState<CollaborationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [taskForm, setTaskForm] = useState<TaskFormState>(EMPTY_TASK_FORM);
  const [commentForm, setCommentForm] = useState<CommentFormState>(EMPTY_COMMENT_FORM);
  const [taskSelectedAsset, setTaskSelectedAsset] = useState<AssetSuggestion | null>(null);
  const [commentSelectedAsset, setCommentSelectedAsset] = useState<AssetSuggestion | null>(null);
  const [savingTask, setSavingTask] = useState(false);
  const [savingComment, setSavingComment] = useState(false);
  const [updatingTaskId, setUpdatingTaskId] = useState<number | null>(null);

  useEffect(() => {
    setTaskForm(toTaskFormFromSummary(searchParams));
    setCommentForm(toCommentFormFromSummary(searchParams));
  }, [searchParams]);

  async function loadSummary() {
    setLoading(true);
    setError("");
    try {
      const payload = await getCollaborationSummary();
      setSummary(payload);
    } catch (err) {
      setSummary(null);
      setError(err instanceof Error ? err.message : "Não foi possível carregar a colaboração.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSummary();
  }, []);

  const taskGroups = useMemo(() => {
    const groups = new Map<string, CollaborationTask[]>();
    for (const task of summary?.items || []) {
      const key = task.status || "open";
      const current = groups.get(key) || [];
      current.push(task);
      groups.set(key, current);
    }
    return groups;
  }, [summary?.items]);
  const orderedTaskGroups = useMemo(
    () =>
      TASK_STATUS_OPTIONS.map((option) => ({
        status: option.value,
        label: option.label,
        tasks: taskGroups.get(option.value) || [],
      })).filter((group) => group.tasks.length > 0),
    [taskGroups],
  );

  const responsibilitySummary = useMemo(() => {
    const counts = new Map<string, number>();
    for (const task of summary?.items || []) {
      const key = task.responsibility_role || "sem_papel";
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([key, count]) => ({ key, count, label: labelForRole(key === "sem_papel" ? "" : key) }))
      .sort((a, b) => b.count - a.count);
  }, [summary?.items]);
  const hasDefinedResponsibilities = responsibilitySummary.some((item) => item.key !== "sem_papel");

  const metrics = [
    { label: "Tarefas abertas", value: summary?.open_tasks ?? 0, hint: "fila colaborativa em andamento", icon: Workflow },
    { label: "Tarefas atrasadas", value: summary?.overdue_tasks ?? 0, hint: "precisam de atenção", icon: Clock3 },
    { label: "Comentários recentes", value: summary?.recent_comments ?? 0, hint: "últimos 7 dias", icon: MessageSquare },
    { label: "Eventos recentes", value: summary?.recent_events ?? 0, hint: "timeline colaborativa", icon: Bell },
    { label: "Ativos sem owner", value: summary?.assets_without_owner ?? 0, hint: "lacuna de responsabilidade", icon: Users },
    { label: "Domínios sem steward", value: summary?.domains_without_steward ?? 0, hint: "governança distribuída", icon: ShieldCheck },
  ];

  async function handleCreateTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingTask(true);
    setActionMessage("");
    try {
      const entityId = Number(taskForm.entity_id);
      if (!Number.isFinite(entityId) || entityId < 1) {
        throw new Error("Informe um identificador de ativo válido.");
      }
      if (!taskForm.entity_label.trim()) {
        throw new Error("Informe o nome do ativo ou contexto.");
      }
      if (!taskForm.title.trim()) {
        throw new Error("Informe um título para a tarefa.");
      }
      const payload: CollaborationTaskInput = {
        entity_type: taskForm.entity_type,
        entity_id: entityId,
        entity_label: taskForm.entity_label.trim(),
        title: taskForm.title.trim(),
        description: taskForm.description.trim() || null,
        task_type: taskForm.task_type || "governance_task",
        status: taskForm.status || "open",
        priority: taskForm.priority || "medium",
        responsibility_role: taskForm.responsibility_role || null,
        assigned_to_user_id: taskForm.assigned_to_user_id ? Number(taskForm.assigned_to_user_id) : null,
        due_at: fromDateTimeLocalValue(taskForm.due_at),
        comment: taskForm.comment.trim() || null,
      };
      await collaborationApi.createCollaborationTask(payload);
      setActionMessage("Tarefa criada com sucesso.");
      setTaskForm((current) => ({ ...current, title: "", description: "", comment: "" }));
      await loadSummary();
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : "Não foi possível criar a tarefa.");
    } finally {
      setSavingTask(false);
    }
  }

  async function handleCreateComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingComment(true);
    setActionMessage("");
    try {
      const entityId = Number(commentForm.entity_id);
      if (!Number.isFinite(entityId) || entityId < 1) {
        throw new Error("Informe um identificador de entidade válido.");
      }
      if (!commentForm.entity_label.trim()) {
        throw new Error("Informe o nome do ativo, incidente ou contexto.");
      }
      if (!commentForm.body.trim()) {
        throw new Error("Digite um comentário antes de enviar.");
      }
      await collaborationApi.createCollaborationComment({
        entity_type: commentForm.entity_type,
        entity_id: entityId,
        entity_label: commentForm.entity_label.trim(),
        body: commentForm.body.trim(),
        comment_kind: commentForm.comment_kind || "comment",
        task_id: commentForm.task_id ? Number(commentForm.task_id) : null,
        parent_comment_id: commentForm.parent_comment_id ? Number(commentForm.parent_comment_id) : null,
      });
      setActionMessage("Comentário registrado com sucesso.");
      setCommentForm((current) => ({ ...current, body: "" }));
      await loadSummary();
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : "Não foi possível registrar o comentário.");
    } finally {
      setSavingComment(false);
    }
  }

  async function handleUpdateTask(taskId: number, payload: CollaborationTaskUpdateInput) {
    setUpdatingTaskId(taskId);
    setActionMessage("");
    try {
      await collaborationApi.updateCollaborationTask(taskId, payload);
      setActionMessage("Tarefa atualizada.");
      await loadSummary();
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : "Não foi possível atualizar a tarefa.");
    } finally {
      setUpdatingTaskId(null);
    }
  }

  const entityHint = useMemo(() => {
    const entityType = searchParams.get("entity_type");
    const entityId = searchParams.get("entity_id");
    const entityLabel = searchParams.get("entity_label");
    if (!entityType && !entityId && !entityLabel) return "";
    return [entityType ? labelForEntityType(entityType as CollaborationEntityType) : "", entityLabel, entityId ? `#${entityId}` : ""]
      .filter(Boolean)
      .join(" · ");
  }, [searchParams]);

  if (loading && !summary) {
    return <div className="space-y-4">{Array.from({ length: 4 }).map((_, index) => <Card className="h-24 animate-pulse bg-bg-subtle" key={index} />)}</div>;
  }

  return (
    <div className="space-y-6 pb-8">
      <Card className="border-border bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_55%,#eef6ff_100%)] shadow-[0_18px_48px_rgba(15,23,42,0.06)]">
        <CardContent className="space-y-3 p-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-info-200 bg-surface px-3 py-1 text-xs font-medium text-info-700">
            <Workflow className="h-3.5 w-3.5" />
            Colaboração distribuída
          </div>
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-semibold tracking-tight text-text">Governança colaborativa</h1>
            <p className="max-w-4xl text-sm leading-7 text-text-body">
              Distribua curadoria e responsabilidade entre áreas com tarefas, comentários, timeline e notificações internas.
              Use esta central para solicitar revisão, documentar decisões e acompanhar pendências.
            </p>
            {entityHint ? <p className="text-xs font-medium uppercase tracking-[0.18em] text-brand-600">Contexto atual: {entityHint}</p> : null}
          </div>
        </CardContent>
      </Card>

      <ContextualJourneyCard
        title="Jornada colaborativa"
        description="Abra a colaboração a partir do ativo, incidente, regra de qualidade, domínio ou produto de dados para coordenar revisão, comentários e responsabilidades."
        links={[
          {
            label: "Explorer",
            href: "/explorer",
            description: "Abrir o ativo e entrar na colaboração a partir do contexto do catálogo.",
            tone: "accent",
          },
          {
            label: "Incidentes",
            href: "/incidents",
            description: "Conectar falhas, comentários e tarefas de acompanhamento.",
            tone: "warning",
          },
          {
            label: "Data Quality",
            href: "/data-quality",
            description: "Solicitar revisão de regras e cobertura de qualidade.",
            tone: "accent",
          },
          {
            label: "Domínios",
            href: "/governance/domains",
            description: "Distribuir responsabilidade e stewardship por domínio.",
            tone: "success",
          },
          {
            label: "Produtos de dados",
            href: "/governance/data-products",
            description: "Coordenar produto, contrato, consumidores e mudanças.",
            tone: "success",
          },
          {
            label: "Timeline",
            href: "/governance/timeline",
            description: "Ver a linha do tempo curada de governança e operação.",
            tone: "neutral",
          },
        ]}
      />

      {error ? (
        <Card className="border-danger-200 bg-danger-50">
          <CardContent className="p-5 text-sm text-danger-700">{error}</CardContent>
        </Card>
      ) : null}

      {actionMessage ? (
        <Card className="border-info-200 bg-info-50">
          <CardContent className="p-5 text-sm text-info-700">{actionMessage}</CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Card className="border-border bg-surface shadow-[0_12px_36px_rgba(15,23,42,0.05)]" key={metric.label}>
              <CardContent className="space-y-3 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted">{metric.label}</p>
                    <p className="text-3xl font-semibold tracking-tight text-text">{metric.value}</p>
                  </div>
                  <div className="rounded-2xl border border-border bg-bg-subtle p-3 text-text-body">
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
                <p className="text-xs text-muted">{metric.hint}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-border bg-surface shadow-[0_12px_36px_rgba(15,23,42,0.05)]">
          <CardHeader className="flex flex-row items-center justify-between gap-3 border-b border-border px-5 py-4">
            <div>
              <h2 className="text-lg font-semibold text-text">Fila colaborativa</h2>
              <p className="text-sm text-text-body">Tarefas abertas, bloqueadas e em andamento por responsabilidade.</p>
            </div>
            <Badge tone="accent">{summary?.total_tasks ?? 0} tarefas</Badge>
          </CardHeader>
          <CardContent className="space-y-5 p-5">
            {summary?.items?.length ? (
              <div className="grid gap-4">
                {orderedTaskGroups.map(({ status, label, tasks }) => (
                  <div className="space-y-3" key={status}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Badge tone={statusTone(status)}>{label}</Badge>
                        <span className="text-sm text-text-body">{tasks.length} tarefas</span>
                      </div>
                      <span className="text-xs uppercase tracking-[0.16em] text-muted">
                        {hasDefinedResponsibilities ? "Distribuição de responsabilidade" : "Sem papel"}
                      </span>
                    </div>
                    <div className="grid gap-3">
                      {tasks.map((task) => (
                        <div className="rounded-2xl border border-border bg-bg-subtle/80 p-4" key={task.id}>
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div className="space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge tone="neutral">{taskTypeLabel(task.task_type)}</Badge>
                                <Badge tone="accent">{labelForRole(task.responsibility_role)}</Badge>
                                <Badge tone={task.priority === "critical" || task.priority === "high" ? "warning" : "neutral"}>
                                  {labelForPriority(task.priority)}
                                </Badge>
                              </div>
                              <div>
                                <p className="text-base font-semibold text-text">{task.title}</p>
                                <p className="text-sm leading-6 text-text-body">{task.description || task.entity_label}</p>
                              </div>
                              <p className="text-xs text-muted">
                                {task.entity_label} · {labelForEntityType(task.entity_type)} · vence {formatDate(task.due_at)}
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {task.status !== "in_progress" ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => void handleUpdateTask(task.id, { status: "in_progress" })}
                                  disabled={updatingTaskId === task.id}
                                >
                                  Em andamento
                                </Button>
                              ) : null}
                              {task.status !== "done" ? (
                                <Button
                                  size="sm"
                                  onClick={() => void handleUpdateTask(task.id, { status: "done" })}
                                  disabled={updatingTaskId === task.id}
                                >
                                  Concluir
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => void handleUpdateTask(task.id, { status: "open" })}
                                  disabled={updatingTaskId === task.id}
                                >
                                  Reabrir
                                </Button>
                              )}
                            </div>
                          </div>
                          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted">
                            <span>Comentários: {task.comments_count}</span>
                            <span>Eventos: {task.event_count}</span>
                            {task.assigned_to_user_id ? <span>Responsável definido</span> : <span>Sem atribuição explícita</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="Nenhuma tarefa colaborativa"
                description="Crie uma tarefa para distribuir revisão, documentação, contratação de qualidade ou validação de owner."
                icon={<Plus className="h-5 w-5" />}
              />
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="border-border bg-surface shadow-[0_12px_36px_rgba(15,23,42,0.05)]">
            <CardHeader className="border-b border-border px-5 py-4">
              <h2 className="text-lg font-semibold text-text">Responsabilidades</h2>
              <p className="text-sm text-text-body">Distribuição por papel de curadoria e accountability.</p>
            </CardHeader>
            <CardContent className="space-y-3 p-5">
              {responsibilitySummary.length ? (
                responsibilitySummary.map((item) => (
                  <div className="flex items-center justify-between rounded-2xl border border-border px-4 py-3" key={item.key}>
                    <span className="text-sm font-medium text-text-body">{item.label}</span>
                    <Badge tone="neutral">{item.count}</Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted">Sem tarefas distribuídas ainda.</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-border bg-surface shadow-[0_12px_36px_rgba(15,23,42,0.05)]">
            <CardHeader className="border-b border-border px-5 py-4">
              <h2 className="text-lg font-semibold text-text">Ações rápidas</h2>
              <p className="text-sm text-text-body">Marque responsabilidade e siga para o ativo relacionado.</p>
            </CardHeader>
            <CardContent className="space-y-3 p-5">
              <Button asChild className="w-full justify-between" variant="outline">
                <Link href="/governance/pending-center">
                  Abrir pendências de governança
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild className="w-full justify-between" variant="outline">
                <Link href="/governance/timeline">
                  Ver timeline de governança
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild className="w-full justify-between" variant="outline">
                <Link href="/inbox">
                  Ver notificações internas
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Card className="border-border bg-surface shadow-[0_12px_36px_rgba(15,23,42,0.05)]">
          <CardHeader className="border-b border-border px-5 py-4">
            <h2 className="text-lg font-semibold text-text">Criar tarefa de governança</h2>
            <p className="text-sm text-text-body">Solicite revisão de ativo, documentação, owner, contrato ou qualidade.</p>
          </CardHeader>
          <CardContent className="space-y-4 p-5">
            <form className="grid gap-4" onSubmit={handleCreateTask}>
              <label className="space-y-2">
                <span className="text-sm font-medium text-text-body">Tipo de entidade</span>
                <Select
                  value={taskForm.entity_type}
                  onChange={(event) => setTaskForm((current) => ({ ...current, entity_type: event.target.value as CollaborationEntityType }))}
                >
                  {ENTITY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-text-body">Ativo / contexto</span>
                <AssetSearchInput
                  selected={taskSelectedAsset}
                  onSelect={(asset) => {
                    setTaskSelectedAsset(asset);
                    if (asset) {
                      setTaskForm((current) => ({
                        ...current,
                        entity_type: "table",
                        entity_id: String(asset.id),
                        entity_label: asset.table_fqn || asset.name,
                      }));
                    } else {
                      setTaskForm((current) => ({ ...current, entity_id: "", entity_label: "" }));
                    }
                  }}
                  placeholder="Ex.: public.sales.orders"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-text-body">Título da tarefa</span>
                <Input
                  value={taskForm.title}
                  onChange={(event) => setTaskForm((current) => ({ ...current, title: event.target.value }))}
                  placeholder="Ex.: Revisar owner e documentação"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-text-body">Descrição</span>
                <Textarea
                  value={taskForm.description}
                  onChange={(event) => setTaskForm((current) => ({ ...current, description: event.target.value }))}
                  placeholder="Explique o que precisa ser revisado e por quê."
                  rows={4}
                />
              </label>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-text-body">Tipo de tarefa</span>
                  <Select value={taskForm.task_type} onChange={(event) => setTaskForm((current) => ({ ...current, task_type: event.target.value }))}>
                    {TASK_TYPES.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-text-body">Papel responsável</span>
                  <Select
                    value={taskForm.responsibility_role}
                    onChange={(event) => setTaskForm((current) => ({ ...current, responsibility_role: event.target.value }))}
                  >
                    {RESPONSIBILITY_ROLES.map((option) => (
                      <option key={option.value || "empty"} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </label>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-text-body">Status inicial</span>
                  <Select value={taskForm.status} onChange={(event) => setTaskForm((current) => ({ ...current, status: event.target.value }))}>
                    {TASK_STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-text-body">Prioridade</span>
                  <Select value={taskForm.priority} onChange={(event) => setTaskForm((current) => ({ ...current, priority: event.target.value }))}>
                    {TASK_PRIORITY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-text-body">Responsável usuário ID</span>
                  <Input
                    type="number"
                    min={1}
                    value={taskForm.assigned_to_user_id}
                    onChange={(event) => setTaskForm((current) => ({ ...current, assigned_to_user_id: event.target.value }))}
                    placeholder="Opcional"
                  />
                </label>
              </div>
              <label className="space-y-2">
                <span className="text-sm font-medium text-text-body">Prazo</span>
                <Input
                  type="datetime-local"
                  value={taskForm.due_at}
                  onChange={(event) => setTaskForm((current) => ({ ...current, due_at: event.target.value }))}
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-text-body">Comentário inicial</span>
                <Textarea
                  value={taskForm.comment}
                  onChange={(event) => setTaskForm((current) => ({ ...current, comment: event.target.value }))}
                  placeholder="Contextualize a solicitação e registre o primeiro passo."
                  rows={4}
                />
              </label>
              <div className="flex items-center gap-3">
                <Button type="submit" disabled={savingTask}>
                  {savingTask ? "Criando..." : "Criar tarefa"}
                </Button>
              <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setTaskForm(toTaskFormFromSummary(searchParams));
                    setTaskSelectedAsset(null);
                  }}
                >
                  Redefinir
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="border-border bg-surface shadow-[0_12px_36px_rgba(15,23,42,0.05)]">
          <CardHeader className="border-b border-border px-5 py-4">
            <h2 className="text-lg font-semibold text-text">Registrar comentário</h2>
            <p className="text-sm text-text-body">Comente em ativo, incidente, regra DQ, domínio ou produto de dados.</p>
          </CardHeader>
          <CardContent className="space-y-4 p-5">
            <form className="grid gap-4" onSubmit={handleCreateComment}>
              <label className="space-y-2">
                <span className="text-sm font-medium text-text-body">Tipo de entidade</span>
                <Select
                  value={commentForm.entity_type}
                  onChange={(event) => setCommentForm((current) => ({ ...current, entity_type: event.target.value as CollaborationEntityType }))}
                >
                  {ENTITY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-text-body">Ativo / contexto</span>
                <AssetSearchInput
                  selected={commentSelectedAsset}
                  onSelect={(asset) => {
                    setCommentSelectedAsset(asset);
                    if (asset) {
                      setCommentForm((current) => ({
                        ...current,
                        entity_type: "table",
                        entity_id: String(asset.id),
                        entity_label: asset.table_fqn || asset.name,
                      }));
                    } else {
                      setCommentForm((current) => ({ ...current, entity_id: "", entity_label: "" }));
                    }
                  }}
                  placeholder="Ex.: public.sales.orders"
                />
              </label>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-text-body">Tipo de comentário</span>
                  <Select value={commentForm.comment_kind} onChange={(event) => setCommentForm((current) => ({ ...current, comment_kind: event.target.value }))}>
                    {COMMENT_KINDS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-text-body">Tarefa associada ID</span>
                  <Input
                    type="number"
                    min={1}
                    value={commentForm.task_id}
                    onChange={(event) => setCommentForm((current) => ({ ...current, task_id: event.target.value }))}
                    placeholder="Opcional"
                  />
                </label>
              </div>
              <label className="space-y-2">
                <span className="text-sm font-medium text-text-body">Comentário</span>
                <Textarea
                  value={commentForm.body}
                  onChange={(event) => setCommentForm((current) => ({ ...current, body: event.target.value }))}
                  placeholder="Descreva a decisão, contexto, evidência ou pendência."
                  rows={5}
                />
              </label>
              <div className="flex items-center gap-3">
                <Button type="submit" disabled={savingComment}>
                  {savingComment ? "Registrando..." : "Registrar comentário"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setCommentForm(toCommentFormFromSummary(searchParams));
                    setCommentSelectedAsset(null);
                  }}
                >
                  Redefinir
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Card className="border-border bg-surface shadow-[0_12px_36px_rgba(15,23,42,0.05)]">
          <CardHeader className="border-b border-border px-5 py-4">
            <h2 className="text-lg font-semibold text-text">Comentários recentes</h2>
            <p className="text-sm text-text-body">Discussões, notas e decisões ligadas aos ativos e tarefas.</p>
          </CardHeader>
          <CardContent className="space-y-3 p-5">
            {summary?.comments?.length ? (
              summary.comments.map((comment) => (
                <div className="rounded-2xl border border-border bg-bg-subtle/80 p-4" key={comment.id}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="neutral">{commentKindLabel(comment.comment_kind)}</Badge>
                      {comment.task_id ? <Badge tone="accent">Tarefa #{comment.task_id}</Badge> : null}
                    </div>
                    <span className="text-xs text-muted">{formatDate(comment.created_at)}</span>
                  </div>
                  <p className="mt-3 text-sm font-medium text-text">{comment.entity_label}</p>
                  <p className="mt-1 text-sm leading-6 text-text-body">{comment.body}</p>
                  <p className="mt-3 text-xs text-muted">
                    {comment.author_name || comment.author_email || "Autor não identificado"}
                  </p>
                </div>
              ))
            ) : (
              <EmptyState
                title="Sem comentários recentes"
                description="Registre comentários em ativos, regras, incidentes ou produtos de dados para criar histórico colaborativo."
                icon={<MessageSquare className="h-5 w-5" />}
              />
            )}
          </CardContent>
        </Card>

        <Card className="border-border bg-surface shadow-[0_12px_36px_rgba(15,23,42,0.05)]">
          <CardHeader className="border-b border-border px-5 py-4">
            <h2 className="text-lg font-semibold text-text">Timeline colaborativa</h2>
            <p className="text-sm text-text-body">Eventos de tarefa, comentário, aprovação e mudança de status.</p>
          </CardHeader>
          <CardContent className="space-y-3 p-5">
            {summary?.events?.length ? (
              summary.events.map((event) => (
                <div className="rounded-2xl border border-border bg-bg-subtle/80 p-4" key={event.id}>
                  <div className="flex items-center justify-between gap-3">
                    <Badge tone={event.status_to === "done" ? "success" : event.event_type.includes("task") ? "accent" : "neutral"}>
                      {event.event_type.replaceAll("_", " ")}
                    </Badge>
                    <span className="text-xs text-muted">{formatDate(event.created_at)}</span>
                  </div>
                  <p className="mt-3 text-sm font-medium text-text">{event.title}</p>
                  {event.detail ? <p className="mt-1 text-sm leading-6 text-text-body">{event.detail}</p> : null}
                  <p className="mt-3 text-xs text-muted">
                    {event.actor_name || event.actor_email || "Ação registrada"} · {labelForEntityType(event.entity_type)} · {event.entity_id}
                  </p>
                </div>
              ))
            ) : (
              <EmptyState
                title="Timeline vazia"
                description="A timeline passa a ser preenchida quando tarefas, comentários e decisões forem criados."
                icon={<Clock3 className="h-5 w-5" />}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
