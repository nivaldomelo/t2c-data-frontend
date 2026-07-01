import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Pencil, Trash2, X } from "lucide-react";
import { Link } from "@/lib/next-shims";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Incident, IncidentEntityType, IncidentEvent, IncidentSeverity, IncidentStatus } from "@/features/incidents/types";
import { apiRequest } from "@/lib/client-api";

type UserOption = { id: number; label: string };

const STATUS_OPTIONS: IncidentStatus[] = ["open", "investigating", "mitigated", "resolved", "closed", "reopened", "recurring"];
const STATUS_LABELS: Record<IncidentStatus, string> = {
  open: "Aberto",
  investigating: "Investigando",
  mitigated: "Mitigado",
  resolved: "Resolvido",
  closed: "Fechado",
  reopened: "Reaberto",
  recurring: "Recorrente",
};
const EVENT_TYPES = [
  { value: "comment", label: "Comentário" },
  { value: "triage", label: "Triagem" },
  { value: "status_change", label: "Mudança de status" },
  { value: "mitigation", label: "Mitigação" },
  { value: "evidence", label: "Evidência" },
];
const TIMELINE_EVENT_LABELS: Record<string, string> = {
  acknowledged: "Reconhecimento",
  triaged: "Triagem",
  mitigated: "Mitigação",
  resolved: "Resolução",
  closed: "Fechamento",
  reopened: "Reabertura",
  recurring: "Recorrência",
};
const SEVERITY_OPTIONS: IncidentSeverity[] = ["sev1", "sev2", "sev3", "sev4"];
const SEVERITY_LABELS: Record<IncidentSeverity, string> = {
  sev1: "Crítico",
  sev2: "Alto",
  sev3: "Médio",
  sev4: "Baixo",
};

type IncidentForm = {
  title: string;
  description: string;
  entity_type: IncidentEntityType;
  table_fqn: string;
  airflow_dag_id: string;
  detected_at: string;
  last_seen_at: string;
  status: IncidentStatus;
  severity: IncidentSeverity;
  owner_user_id: string;
  reporter_user_id: string;
  tags_text: string;
  domain_name: string;
  owner_team: string;
  squad_name: string;
  sla_due_at: string;
  root_cause: string;
  impact_summary: string;
  mitigation_summary: string;
  postmortem_summary: string;
};

function toLocalInputDate(value: string): string {
  const date = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatDate(value: string | null): string {
  if (!value) return "-";
  return new Date(value).toLocaleString("pt-BR");
}

function toForm(item: Incident): IncidentForm {
  return {
    title: item.title,
    description: item.description || "",
    entity_type: item.entity_type,
    table_fqn: item.table_fqn || "",
    airflow_dag_id: item.airflow_dag_id || "",
    detected_at: toLocalInputDate(item.detected_at),
    last_seen_at: item.last_seen_at ? toLocalInputDate(item.last_seen_at) : "",
    status: item.status,
    severity: item.severity,
    owner_user_id: item.owner_user_id ? String(item.owner_user_id) : "",
    reporter_user_id: item.reporter_user_id ? String(item.reporter_user_id) : "",
    tags_text: (item.tags || []).join(", "),
    domain_name: item.domain_name || "",
    owner_team: item.owner_team || "",
    squad_name: item.squad_name || "",
    sla_due_at: item.sla_due_at ? toLocalInputDate(item.sla_due_at) : "",
    root_cause: item.root_cause || "",
    impact_summary: item.impact_summary || "",
    mitigation_summary: item.mitigation_summary || "",
    postmortem_summary: item.postmortem_summary || "",
  };
}

function normalizeForm(form: IncidentForm): IncidentForm {
  return {
    ...form,
    title: form.title.trim(),
    description: form.description.trim(),
    table_fqn: form.table_fqn.trim(),
    airflow_dag_id: form.airflow_dag_id.trim(),
    domain_name: form.domain_name.trim(),
    owner_team: form.owner_team.trim(),
    squad_name: form.squad_name.trim(),
    sla_due_at: form.sla_due_at,
    root_cause: form.root_cause.trim(),
    impact_summary: form.impact_summary.trim(),
    mitigation_summary: form.mitigation_summary.trim(),
    postmortem_summary: form.postmortem_summary.trim(),
    tags_text: form.tags_text
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean)
      .join(","),
  };
}

function userLabel(user: Incident["owner_user"] | Incident["reporter_user"]): string {
  if (!user) return "-";
  return user.name || user.email;
}

function statusLabel(value: string | null | undefined): string {
  if (!value) return "";
  return STATUS_LABELS[value as IncidentStatus] || TIMELINE_EVENT_LABELS[value] || value;
}

type Props = {
  open: boolean;
  ticketId: number | null;
  canEdit: boolean;
  userOptions: UserOption[];
  onClose: () => void;
  onUpdated: (item: Incident) => void;
  onDeleted: (ticketId: number) => void;
  onToast: (tone: "success" | "error", message: string) => void;
};

export function TicketDetailsDrawer({
  open,
  ticketId,
  canEdit,
  userOptions,
  onClose,
  onUpdated,
  onDeleted,
  onToast,
}: Props) {
  const [item, setItem] = useState<Incident | null>(null);
  const [form, setForm] = useState<IncidentForm | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [eventType, setEventType] = useState("comment");
  const [eventTitle, setEventTitle] = useState("Comentário interno");
  const [eventDetail, setEventDetail] = useState("");
  const [eventStatusFrom, setEventStatusFrom] = useState("");
  const [eventStatusTo, setEventStatusTo] = useState("");
  const [eventSaving, setEventSaving] = useState(false);
  const [eventError, setEventError] = useState("");

  useEffect(() => {
    if (!open || ticketId === null) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    setIsEditing(false);
    setDeleteConfirmOpen(false);
    setDeleteConfirmText("");
    setEventType("comment");
    setEventTitle("Comentário interno");
    setEventDetail("");
    setEventStatusFrom("");
    setEventStatusTo("");
    setEventError("");

    void (async () => {
      try {
        const details = await apiRequest<Incident>(`/v1/incidents/${ticketId}`);
        if (cancelled) return;
        setItem(details);
        setForm(toForm(details));
      } catch (err) {
        if (cancelled) return;
        setError((err as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, ticketId]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeAndReset();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const dirty = useMemo(() => {
    if (!item || !form) return false;
    const base = JSON.stringify(normalizeForm(toForm(item)));
    const current = JSON.stringify(normalizeForm(form));
    return base !== current;
  }, [item, form]);

  function closeAndReset() {
    setIsEditing(false);
    setDeleteConfirmOpen(false);
    setDeleteConfirmText("");
    setEventType("comment");
    setEventTitle("Comentário interno");
    setEventDetail("");
    setEventStatusFrom("");
    setEventStatusTo("");
    setEventError("");
    onClose();
  }

  function validateFormState(current: IncidentForm): string | null {
    if (!current.title.trim()) return "Título é obrigatório.";
    if (!current.detected_at) return "Data de detecção é obrigatória.";
    if (current.entity_type === "table" && !current.table_fqn.trim()) return "table_fqn é obrigatório.";
    if (current.entity_type === "airflow_dag" && !current.airflow_dag_id.trim()) return "airflow_dag_id é obrigatório.";
    return null;
  }

  async function save() {
    if (!item || !form || !canEdit) return;
    const formError = validateFormState(form);
    if (formError) {
      setError(formError);
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        entity_type: form.entity_type,
        table_fqn: form.entity_type === "table" ? form.table_fqn.trim() : null,
        airflow_dag_id: form.entity_type === "airflow_dag" ? form.airflow_dag_id.trim() : null,
        detected_at: new Date(form.detected_at).toISOString(),
        last_seen_at: form.last_seen_at ? new Date(form.last_seen_at).toISOString() : null,
        status: form.status,
        severity: form.severity,
        owner_user_id: form.owner_user_id ? Number(form.owner_user_id) : null,
        reporter_user_id: form.reporter_user_id ? Number(form.reporter_user_id) : null,
        tags: form.tags_text
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean),
        domain_name: form.domain_name.trim() || null,
        owner_team: form.owner_team.trim() || null,
        squad_name: form.squad_name.trim() || null,
        sla_due_at: form.sla_due_at ? new Date(form.sla_due_at).toISOString() : null,
        root_cause: form.root_cause.trim() || null,
        impact_summary: form.impact_summary.trim() || null,
        mitigation_summary: form.mitigation_summary.trim() || null,
        postmortem_summary: form.postmortem_summary.trim() || null,
      };
      const updated = await apiRequest<Incident>(`/v1/incidents/${item.id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      setItem(updated);
      setForm(toForm(updated));
      setIsEditing(false);
      onUpdated(updated);
      onToast("success", "Ticket atualizado com sucesso.");
    } catch (err) {
      setError((err as Error).message);
      onToast("error", (err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function submitEvent() {
    if (!item) return;
    if (!eventTitle.trim()) {
      setEventError("Título do evento é obrigatório.");
      return;
    }
    setEventSaving(true);
    setEventError("");
    try {
      const payload = {
        event_type: eventType.trim() || "comment",
        title: eventTitle.trim(),
        detail: eventDetail.trim() || null,
        status_from: eventStatusFrom.trim() || null,
        status_to: eventStatusTo.trim() || null,
      };
      const updatedEvent = await apiRequest<IncidentEvent>(`/v1/incidents/${item.id}/events`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const refreshed = await apiRequest<Incident>(`/v1/incidents/${item.id}`);
      setItem(refreshed);
      setForm(toForm(refreshed));
      setEventDetail("");
      setEventTitle("Comentário interno");
      setEventType("comment");
      setEventStatusFrom("");
      setEventStatusTo("");
      onUpdated(refreshed);
      onToast("success", `Evento registrado: ${updatedEvent.title}`);
    } catch (err) {
      const message = (err as Error).message;
      setEventError(message);
      onToast("error", message);
    } finally {
      setEventSaving(false);
    }
  }

  async function deleteCurrent() {
    if (!item || !canEdit) return;
    if (deleteConfirmText.trim().toUpperCase() !== "DELETE") {
      setError('Digite "DELETE" para confirmar.');
      return;
    }
    setDeleting(true);
    setError("");
    try {
      await apiRequest<void>(`/v1/incidents/${item.id}`, { method: "DELETE" });
      onDeleted(item.id);
      onToast("success", "Ticket excluído com sucesso.");
      closeAndReset();
    } catch (err) {
      setError((err as Error).message);
      onToast("error", (err as Error).message);
    } finally {
      setDeleting(false);
    }
  }

  if (!open) return null;

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-3 sm:p-6 backdrop-blur-md"
      role="dialog"
      onClick={closeAndReset}
    >
      <div
        className="relative flex h-[min(92vh,980px)] w-full max-w-5xl flex-col overflow-hidden rounded-[28px] border border-border/80 bg-surface shadow-card"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-r from-brand-50 via-white to-accent-50" />

        <div className="sticky top-0 z-10 border-b border-border/70 bg-surface/95 px-5 py-4 backdrop-blur sm:px-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Detalhes do ticket</p>
              <h3 className="truncate text-xl font-semibold tracking-tight text-text sm:text-2xl">
                {item ? `Ticket #${item.id}` : "Ticket"}
              </h3>
              <p className="mt-1 truncate text-sm text-text-body">{item?.title || "Carregando..."}</p>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              {canEdit ? (
                <Button onClick={() => setIsEditing((prev) => !prev)} size="sm" variant="outline">
                  <Pencil className="mr-1 h-4 w-4" />
                  {isEditing ? "Visualizar" : "Editar"}
                </Button>
              ) : null}
              {canEdit && isEditing ? (
                <>
                  <Button onClick={() => (item && form ? setForm(toForm(item)) : null)} size="sm" variant="ghost">
                    Cancelar
                  </Button>
                  <Button disabled={!dirty || saving} onClick={() => void save()} size="sm">
                    {saving ? "Salvando..." : "Salvar"}
                  </Button>
                </>
              ) : null}
              {canEdit ? (
                <Button
                  className="text-danger-700 hover:bg-danger-50"
                  onClick={() => setDeleteConfirmOpen((prev) => !prev)}
                  size="sm"
                  variant="ghost"
                >
                  <Trash2 className="mr-1 h-4 w-4" />
                  Excluir
                </Button>
              ) : null}
              <Button aria-label="Fechar detalhes do ticket" onClick={closeAndReset} size="sm" variant="ghost" className="h-9 w-9 px-0">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {dirty && isEditing ? (
            <p className="mt-3 inline-flex items-center rounded-full border border-warning-200 bg-warning-50 px-2.5 py-1 text-xs text-warning-700">
              Alterações não salvas
            </p>
          ) : null}
          {error ? (
            <p className="mt-2 inline-flex items-center gap-1 text-xs text-danger-700">
              <AlertTriangle className="h-3.5 w-3.5" />
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
          {loading ? (
            <p className="text-sm text-muted">Carregando detalhes...</p>
          ) : !item || !form ? (
            <p className="text-sm text-danger-700">Não foi possível carregar o ticket.</p>
          ) : (
            <div className="space-y-5">
              {isEditing ? (
                <>
                  <div className="rounded-3xl border border-border/80 bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_58%,#eef6ff_100%)] p-5 shadow-sm">
                    <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Informações editáveis</p>
                    <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-text-body">Título</label>
                        <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-text-body">Status</label>
                        <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as IncidentStatus })}>
                          {STATUS_OPTIONS.map((value) => (
                            <option key={value} value={value}>
                              {STATUS_LABELS[value]}
                            </option>
                          ))}
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-border/80 bg-surface p-5 shadow-sm">
                    <label className="mb-1 block text-xs font-medium text-text-body">Descrição</label>
                    <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-3xl border border-border/80 bg-surface p-5 shadow-sm">
                      <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Contexto do ativo</p>
                      <div className="space-y-4">
                        <div>
                          <label className="mb-1 block text-xs font-medium text-text-body">Tipo</label>
                          <Select value={form.entity_type} onChange={(e) => setForm({ ...form, entity_type: e.target.value as IncidentEntityType })}>
                            <option value="table">Tabela</option>
                            <option value="airflow_dag">Airflow DAG</option>
                          </Select>
                        </div>
                        {form.entity_type === "table" ? (
                          <div>
                            <label className="mb-1 block text-xs font-medium text-text-body">table_fqn</label>
                            <Input value={form.table_fqn} onChange={(e) => setForm({ ...form, table_fqn: e.target.value })} />
                          </div>
                        ) : (
                          <div>
                            <label className="mb-1 block text-xs font-medium text-text-body">airflow_dag_id</label>
                            <Input value={form.airflow_dag_id} onChange={(e) => setForm({ ...form, airflow_dag_id: e.target.value })} />
                          </div>
                        )}
                        <div>
                          <label className="mb-1 block text-xs font-medium text-text-body">Tags (CSV)</label>
                          <Input value={form.tags_text} onChange={(e) => setForm({ ...form, tags_text: e.target.value })} />
                        </div>
                      </div>
                    </div>

                    <div className="rounded-3xl border border-border/80 bg-surface p-5 shadow-sm">
                      <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Status e responsáveis</p>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-xs font-medium text-text-body">Severidade</label>
                          <Select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value as IncidentSeverity })}>
                            {SEVERITY_OPTIONS.map((value) => (
                              <option key={value} value={value}>
                                {SEVERITY_LABELS[value]}
                              </option>
                            ))}
                          </Select>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-text-body">Detectado em</label>
                          <Input type="datetime-local" value={form.detected_at} onChange={(e) => setForm({ ...form, detected_at: e.target.value })} />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-text-body">Owner</label>
                          <Select value={form.owner_user_id} onChange={(e) => setForm({ ...form, owner_user_id: e.target.value })}>
                            <option value="">Não definido</option>
                            {userOptions.map((opt) => (
                              <option key={opt.id} value={String(opt.id)}>
                                {opt.label}
                              </option>
                            ))}
                          </Select>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-text-body">Reporter</label>
                          <Select value={form.reporter_user_id} onChange={(e) => setForm({ ...form, reporter_user_id: e.target.value })}>
                            <option value="">Não definido</option>
                            {userOptions.map((opt) => (
                              <option key={opt.id} value={String(opt.id)}>
                                {opt.label}
                              </option>
                            ))}
                          </Select>
                        </div>
                        <div className="sm:col-span-2">
                          <label className="mb-1 block text-xs font-medium text-text-body">Última ocorrência</label>
                          <Input type="datetime-local" value={form.last_seen_at} onChange={(e) => setForm({ ...form, last_seen_at: e.target.value })} />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-text-body">Domínio</label>
                          <Input value={form.domain_name} onChange={(e) => setForm({ ...form, domain_name: e.target.value })} />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-text-body">Owner team</label>
                          <Input value={form.owner_team} onChange={(e) => setForm({ ...form, owner_team: e.target.value })} />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-text-body">Squad</label>
                          <Input value={form.squad_name} onChange={(e) => setForm({ ...form, squad_name: e.target.value })} />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-text-body">SLA devido em</label>
                          <Input type="datetime-local" value={form.sla_due_at} onChange={(e) => setForm({ ...form, sla_due_at: e.target.value })} />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-3xl border border-border/80 bg-surface p-5 shadow-sm">
                    <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Causa raiz e postmortem</p>
                    <div className="grid gap-4">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-text-body">Causa raiz</label>
                        <Textarea value={form.root_cause} onChange={(e) => setForm({ ...form, root_cause: e.target.value })} />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-text-body">Resumo do impacto</label>
                        <Textarea value={form.impact_summary} onChange={(e) => setForm({ ...form, impact_summary: e.target.value })} />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-text-body">Mitigação</label>
                        <Textarea value={form.mitigation_summary} onChange={(e) => setForm({ ...form, mitigation_summary: e.target.value })} />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-text-body">Postmortem</label>
                        <Textarea value={form.postmortem_summary} onChange={(e) => setForm({ ...form, postmortem_summary: e.target.value })} />
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="rounded-3xl border border-border/80 bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_58%,#eef6ff_100%)] p-5 shadow-sm sm:p-6">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <p className="text-2xl font-semibold tracking-tight text-text">{item.title}</p>
                        <p className="mt-2 text-sm text-text-body">
                          {item.asset_context?.table_fqn || (item.entity_type === "table" ? item.table_fqn || "-" : item.airflow_dag_id || "-")}
                        </p>
                        {item.origin ? <p className="mt-2 text-xs font-medium text-muted">{item.origin.label}</p> : null}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge tone="neutral">{STATUS_LABELS[item.status]}</Badge>
                        <Badge tone="warning">{item.severity_label || SEVERITY_LABELS[item.severity]}</Badge>
                        <Badge tone="accent">{item.entity_type}</Badge>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-5 xl:grid-cols-[1.3fr_0.9fr]">
                    <div className="space-y-5">
                      <div className="rounded-3xl border border-border/80 bg-surface p-5 shadow-sm">
                        <h4 className="text-sm font-semibold text-text">Descrição</h4>
                        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-text-body">
                          {item.description || "Sem descrição detalhada."}
                        </p>
                      </div>

                      <div className="rounded-3xl border border-border/80 bg-surface p-5 shadow-sm">
                        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Impacto</p>
                        <div className="space-y-3">
                          <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4 text-sm text-text-body">
                            {item.impact?.summary || "Sem resumo adicional de impacto."}
                          </div>
                          {item.impact?.operational ? (
                            <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4">
                              <p className="text-xs text-muted">Operacional</p>
                              <p className="mt-1 text-sm font-medium text-text">{item.impact.operational}</p>
                            </div>
                          ) : null}
                          {item.impact?.governance ? (
                            <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4">
                              <p className="text-xs text-muted">Governança</p>
                              <p className="mt-1 text-sm font-medium text-text">{item.impact.governance}</p>
                            </div>
                          ) : null}
                        </div>
                      </div>

                      <div className="rounded-3xl border border-border/80 bg-surface p-5 shadow-sm">
                        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Tags</p>
                        <div className="flex flex-wrap gap-2">
                          {(item.tags || []).length ? (
                            item.tags!.map((tag) => (
                              <Badge key={tag} tone="neutral">
                                {tag}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-sm text-muted">Sem tags</span>
                          )}
                        </div>
                      </div>

                      <div className="rounded-3xl border border-border/80 bg-surface p-5 shadow-sm">
                        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Evidence JSON</p>
                        <pre className="max-h-80 overflow-auto rounded-2xl border border-border/80 bg-bg-subtle/80 p-4 text-xs leading-6 text-text-body">
                          {JSON.stringify(item.evidence_json, null, 2)}
                        </pre>
                      </div>
                    </div>

                    <div className="space-y-5">
                      <div className="rounded-3xl border border-border/80 bg-surface p-5 shadow-sm">
                        <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Contexto operacional</p>
                        <div className="grid gap-3 text-sm">
                          <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4">
                            <p className="text-xs text-muted">Owner</p>
                            <p className="mt-1 font-medium text-text">{item.asset_context?.owner_name || userLabel(item.owner_user)}</p>
                          </div>
                          <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4">
                            <p className="text-xs text-muted">Reporter</p>
                            <p className="mt-1 font-medium text-text">{userLabel(item.reporter_user)}</p>
                          </div>
                          {item.asset_context ? (
                            <>
                              <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4">
                                <p className="text-xs text-muted">Ativo impactado</p>
                                <p className="mt-1 font-medium text-text">{item.asset_context.table_name || "-"}</p>
                                <p className="mt-1 text-xs text-muted">
                                  {item.asset_context.datasource_name} • {item.asset_context.database_name}.{item.asset_context.schema_name}
                                </p>
                              </div>
                              <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4">
                                <p className="text-xs text-muted">Criticidade do ativo</p>
                                <p className="mt-1 font-medium text-text">
                                  {item.asset_context.criticality_label || "Não avaliado"}
                                  {item.asset_context.criticality_score !== null && item.asset_context.criticality_score !== undefined ? ` · ${item.asset_context.criticality_score} pts` : ""}
                                </p>
                              </div>
                              <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4">
                                <p className="text-xs text-muted">Sensibilidade</p>
                                <p className="mt-1 font-medium text-text">{item.asset_context.sensitivity_label || "Não informada"}</p>
                              </div>
                            </>
                          ) : null}
                          <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4">
                            <p className="text-xs text-muted">Ocorrências</p>
                            <p className="mt-1 font-medium text-text">{item.occurrences}</p>
                          </div>
                          <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4">
                            <p className="text-xs text-muted">Domínio</p>
                            <p className="mt-1 font-medium text-text">{item.domain_name || item.asset_context?.domain_name || "Sem domínio"}</p>
                          </div>
                          <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4">
                            <p className="text-xs text-muted">Owner team / Squad</p>
                            <p className="mt-1 font-medium text-text">{item.owner_team || item.squad_name || "Sem time definido"}</p>
                          </div>
                          {item.sla_due_at ? (
                            <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4">
                              <p className="text-xs text-muted">SLA devido em</p>
                              <p className="mt-1 font-medium text-text">{formatDate(item.sla_due_at)}</p>
                            </div>
                          ) : null}
                          <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4">
                            <p className="text-xs text-muted">Entity</p>
                            <p className="mt-1 truncate font-medium text-text">
                              {item.entity_type === "table" ? item.table_fqn || "-" : item.airflow_dag_id || "-"}
                            </p>
                          </div>
                        </div>
                        {item.asset_context?.links ? (
                          <div className="mt-4 grid gap-2 sm:grid-cols-2">
                            <Button asChild size="sm" variant="outline"><Link href={item.asset_context.links.explorer}>Abrir ativo</Link></Button>
                            <Button asChild size="sm" variant="outline"><Link href={item.asset_context.links.data_quality}>Abrir Data Quality</Link></Button>
                            <Button asChild size="sm" variant="outline"><Link href={item.asset_context.links.incidents}>Fila do ativo</Link></Button>
                            <Button asChild size="sm" variant="outline"><Link href={item.asset_context.links.audit}>Histórico</Link></Button>
                          </div>
                        ) : null}
                      </div>

                      <div className="rounded-3xl border border-border/80 bg-surface p-5 shadow-sm">
                        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Causa raiz e postmortem</p>
                        <div className="space-y-3 text-sm">
                          <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4">
                            <p className="text-xs text-muted">Causa raiz</p>
                            <p className="mt-1 whitespace-pre-wrap font-medium text-text">{item.root_cause || "Ainda não registrada."}</p>
                          </div>
                          <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4">
                            <p className="text-xs text-muted">Impacto resumido</p>
                            <p className="mt-1 whitespace-pre-wrap font-medium text-text">{item.impact_summary || item.impact?.summary || "Sem resumo."}</p>
                          </div>
                          <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4">
                            <p className="text-xs text-muted">Mitigação</p>
                            <p className="mt-1 whitespace-pre-wrap font-medium text-text">{item.mitigation_summary || "Ainda não registrada."}</p>
                          </div>
                          <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4">
                            <p className="text-xs text-muted">Postmortem</p>
                            <p className="mt-1 whitespace-pre-wrap font-medium text-text">{item.postmortem_summary || "Ainda não registrado."}</p>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-3xl border border-border/80 bg-surface p-5 shadow-sm">
                        <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Linha do tempo</p>
                        <div className="space-y-3 text-sm">
                          {(item.timeline || []).length ? (
                            item.timeline.map((event) => (
                              <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4" key={event.id}>
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="text-sm font-medium text-text">{event.title}</p>
                                    <p className="mt-1 text-xs text-muted">{formatDate(event.created_at)}</p>
                                  </div>
                                  <Badge tone="neutral">{event.event_type}</Badge>
                                </div>
                                {event.detail ? <p className="mt-2 whitespace-pre-wrap text-sm text-text-body">{event.detail}</p> : null}
                                {event.status_from || event.status_to ? (
                                  <p className="mt-2 text-xs text-muted">
                                    {event.status_from ? `${statusLabel(event.status_from)} → ` : ""}
                                    {statusLabel(event.status_to)}
                                  </p>
                                ) : null}
                                {event.actor_name || event.actor_email ? (
                                  <p className="mt-2 text-xs text-muted">
                                    {event.actor_name || event.actor_email}
                                  </p>
                                ) : null}
                              </div>
                            ))
                          ) : (
                            <>
                              <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4">
                                <p className="text-xs text-muted">Detectado em</p>
                                <p className="mt-1 font-medium text-text">{formatDate(item.detected_at)}</p>
                              </div>
                              <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4">
                                <p className="text-xs text-muted">Última ocorrência</p>
                                <p className="mt-1 font-medium text-text">{formatDate(item.last_seen_at)}</p>
                              </div>
                              <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4">
                                <p className="text-xs text-muted">Criado em</p>
                                <p className="mt-1 font-medium text-text">{formatDate(item.created_at)}</p>
                              </div>
                              <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4">
                                <p className="text-xs text-muted">Atualizado em</p>
                                <p className="mt-1 font-medium text-text">{formatDate(item.updated_at)}</p>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="rounded-3xl border border-border/80 bg-surface p-5 shadow-sm">
                        <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Adicionar evento</p>
                        <div className="space-y-3">
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                              <label className="mb-1 block text-xs font-medium text-text-body">Tipo</label>
                              <Select value={eventType} onChange={(e) => setEventType(e.target.value)}>
                                {EVENT_TYPES.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </Select>
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-medium text-text-body">Título</label>
                              <Input value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} />
                            </div>
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium text-text-body">Detalhe</label>
                            <Textarea value={eventDetail} onChange={(e) => setEventDetail(e.target.value)} />
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                              <label className="mb-1 block text-xs font-medium text-text-body">Status anterior</label>
                              <Select value={eventStatusFrom} onChange={(e) => setEventStatusFrom(e.target.value)}>
                                <option value="">Não informar</option>
                                {STATUS_OPTIONS.map((value) => (
                                  <option key={value} value={value}>
                                    {STATUS_LABELS[value]}
                                  </option>
                                ))}
                              </Select>
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-medium text-text-body">Status novo</label>
                              <Select value={eventStatusTo} onChange={(e) => setEventStatusTo(e.target.value)}>
                                <option value="">Não informar</option>
                                {STATUS_OPTIONS.map((value) => (
                                  <option key={value} value={value}>
                                    {STATUS_LABELS[value]}
                                  </option>
                                ))}
                              </Select>
                            </div>
                          </div>
                          {eventError ? <p className="text-xs text-danger-700">{eventError}</p> : null}
                          <div className="flex items-center justify-end gap-2">
                            <Button disabled={eventSaving} onClick={() => void submitEvent()} size="sm">
                              {eventSaving ? "Registrando..." : "Registrar evento"}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {deleteConfirmOpen && canEdit ? (
                <div className="rounded-3xl border border-danger-200 bg-danger-50 p-4">
                  <p className="text-sm font-medium text-danger-700">Confirma exclusão do ticket?</p>
                  <p className="mt-1 text-xs text-danger-700">
                    Digite <strong>DELETE</strong> para confirmar.
                  </p>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Input
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      placeholder='Digite "DELETE"'
                    />
                    <Button
                      variant="danger"
                      size="sm"
                      disabled={deleting || deleteConfirmText.trim().toUpperCase() !== "DELETE"}
                      onClick={() => void deleteCurrent()}
                    >
                      {deleting ? "Excluindo..." : "Excluir"}
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
