import { useEffect, useMemo, useState } from "react";
import { Loader2, Search, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/client-api";
import { useModalDismiss } from "@/lib/use-modal-dismiss";

import type {
  DQProfilingSchedule,
  DQProfilingScheduleForm,
  DQUserOption,
  ScheduleMode,
} from "@/features/data-quality/types";

type ProfilingScheduleModalProps = {
  open: boolean;
  canWrite: boolean;
  loading: boolean;
  targetTableName: string;
  targetDatasourceName: string;
  targetDatabaseName: string;
  targetSchemaName: string;
  schedule: DQProfilingSchedule | null;
  form: DQProfilingScheduleForm;
  onClose: () => void;
  onSave: () => void;
  onDelete: () => void;
  onFormChange: (patch: Partial<DQProfilingScheduleForm>) => void;
};

const WEEKDAY_OPTIONS = [
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
  "Domingo",
] as const;

const SCHEDULE_MODE_LABELS: Record<ScheduleMode, string> = {
  manual: "Manual",
  interval: "Intervalo técnico",
  daily: "Diário",
  weekly: "Semanal",
  biweekly: "Quinzenal",
  monthly: "Mensal",
};

const EXECUTION_ENGINE_LABELS: Record<"python" | "spark", string> = {
  python: "Histórico legado (antes do Spark)",
  spark: "Spark cluster",
};

const RUN_STATUS_LABELS: Record<string, string> = {
  queued: "Na fila",
  running: "Executando",
  success: "Concluído",
  failed: "Falhou",
  pass: "Sem falhas",
  fail: "Falhou",
  error: "Erro",
};

function formatScheduleModeLabel(mode: ScheduleMode | string | null | undefined) {
  if (!mode) return "Não definido";
  return SCHEDULE_MODE_LABELS[mode as ScheduleMode] || String(mode);
}

function formatExecutionEngineLabel(engine: "python" | "spark" | string | null | undefined) {
  if (!engine) return "Não definido";
  const normalized = String(engine).toLowerCase() as "python" | "spark";
  return EXECUTION_ENGINE_LABELS[normalized] || String(engine);
}

function formatRunStatusLabel(status: string | null | undefined) {
  if (!status) return "Sem execução";
  return RUN_STATUS_LABELS[status.toLowerCase()] || status;
}

function formatScheduleSummary(form: DQProfilingScheduleForm) {
  if (!form.schedule_enabled || form.schedule_mode === "manual") {
    return "Manual";
  }
  if (form.schedule_mode === "interval") {
    const minutes = form.schedule_every_minutes ?? 0;
    if (!minutes) return "Intervalo técnico";
    if (minutes % 60 === 0) {
      const hours = minutes / 60;
      return hours === 1 ? "A cada 1 hora" : `A cada ${hours} horas`;
    }
    return `A cada ${minutes} minutos`;
  }
  if (form.schedule_mode === "daily") {
    return `Executa diariamente às ${form.schedule_time || "08:00"}`;
  }
  if (form.schedule_mode === "weekly") {
    const weekday = WEEKDAY_OPTIONS[Math.max(0, Math.min(6, form.schedule_day_of_week ?? 0))];
    return `Executa semanalmente na ${weekday.toLowerCase()} às ${form.schedule_time || "08:00"}`;
  }
  if (form.schedule_mode === "biweekly") {
    return `Executa quinzenalmente às ${form.schedule_time || "08:00"}`;
  }
  if (form.schedule_mode === "monthly") {
    return `Executa mensalmente no dia ${form.schedule_day_of_month ?? 1} às ${form.schedule_time || "08:00"}`;
  }
  return "Manual";
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleString("pt-BR");
}

export function ProfilingScheduleModal({
  open,
  canWrite,
  loading,
  targetTableName,
  targetDatasourceName,
  targetDatabaseName,
  targetSchemaName,
  schedule,
  form,
  onClose,
  onSave,
  onDelete,
  onFormChange,
}: ProfilingScheduleModalProps) {
  useModalDismiss({ open, onClose });
  const [recipientQuery, setRecipientQuery] = useState("");
  const [recipientOptions, setRecipientOptions] = useState<DQUserOption[]>([]);
  const [recipientLoading, setRecipientLoading] = useState(false);
  const [recipientError, setRecipientError] = useState("");
  const [selectedRecipients, setSelectedRecipients] = useState<DQUserOption[]>([]);
  const [intervalUnit, setIntervalUnit] = useState<"minutes" | "hours">("minutes");

  useEffect(() => {
    if (!open) {
      setRecipientQuery("");
      setRecipientOptions([]);
      setRecipientError("");
      setRecipientLoading(false);
      setSelectedRecipients([]);
      setIntervalUnit("minutes");
      return;
    }
    setSelectedRecipients(schedule?.notification_recipients || []);
    setIntervalUnit(
      form.schedule_mode === "interval" && form.schedule_every_minutes && form.schedule_every_minutes % 60 === 0
        ? "hours"
        : "minutes",
    );
  }, [form.schedule_every_minutes, form.schedule_mode, open, schedule?.notification_recipients]);

  useEffect(() => {
    if (!open) return;
    let active = true;
    const timeout = window.setTimeout(() => {
      setRecipientLoading(true);
      setRecipientError("");
      void (async () => {
        try {
          const query = recipientQuery.trim();
          const suffix = query ? `?q=${encodeURIComponent(query)}` : "";
          const data = await apiRequest<DQUserOption[]>(`/v1/dq/users${suffix}`);
          if (!active) return;
          setRecipientOptions(data);
        } catch (error) {
          if (!active) return;
          setRecipientOptions([]);
          setRecipientError((error as Error).message || "Não foi possível buscar usuários");
        } finally {
          if (active) setRecipientLoading(false);
        }
      })();
    }, 250);
    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [open, recipientQuery]);

  const selectedRecipientIds = useMemo(() => selectedRecipients.map((item) => item.id), [selectedRecipients]);
  const scheduleSummary = formatScheduleSummary(form);
  const scheduleLastRunLabel = schedule?.schedule_last_run_at ? formatDateTime(schedule.schedule_last_run_at) : "Sem execução anterior";
  const scheduleNextRunLabel = schedule?.schedule_next_run_at
    ? formatDateTime(schedule.schedule_next_run_at)
    : form.schedule_enabled
      ? "Aguardando primeira execução"
      : "Agendamento desativado";
  const scheduleLastStatusLabel = formatRunStatusLabel(schedule?.schedule_last_status || (form.schedule_enabled ? "Sem execução" : "Desativado"));

  function syncSelectedRecipients(next: DQUserOption[]) {
    setSelectedRecipients(next);
    onFormChange({ recipient_user_ids: next.map((item) => item.id) });
  }

  function toggleRecipient(option: DQUserOption) {
    const exists = selectedRecipients.some((item) => item.id === option.id);
    if (exists) {
      syncSelectedRecipients(selectedRecipients.filter((item) => item.id !== option.id));
      return;
    }
    syncSelectedRecipients([...selectedRecipients, option]);
  }

  if (!open) return null;

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-2 backdrop-blur-md md:p-4"
      role="dialog"
    >
      <div className="flex h-[92dvh] w-full max-w-[1100px] flex-col overflow-hidden rounded-[28px] border border-border/80 bg-surface shadow-card">
        <div className="flex items-start justify-between gap-4 border-b border-border/60 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(241,245,249,0.92))] px-6 py-5">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold">Agendamento de perfilamento</h3>
            <p className="mt-1 text-sm text-muted">Configure quando a tabela ou o schema serão perfilados e quem recebe o aviso quando houver falha.</p>
          </div>
          <button aria-label="Fechar" className="rounded-full border border-border/70 p-2 text-muted transition hover:border-border-strong hover:bg-bg-subtle hover:text-text" onClick={onClose} type="button">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 gap-0 xl:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)]">
          <div className="min-h-0 overflow-y-auto px-6 py-5">
            <div className="space-y-5">
              <section className="space-y-3 rounded-2xl border border-border/80 bg-bg-subtle/80 p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-text">Escopo e destino</p>
                    <p className="text-xs text-muted">Escolha se o agendamento vale para a tabela atual ou para o schema do ativo.</p>
                  </div>
                  <Badge tone={form.schedule_enabled ? "success" : "neutral"}>{form.schedule_enabled ? "Ativo" : "Desativado"}</Badge>
                </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium">Escopo</label>
                    <select
                      className="h-10 w-full rounded-lg border border-border/70 px-3 text-sm shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                      onChange={(e) => onFormChange({ scope: e.target.value as "table" | "schema" })}
                      value={form.scope}
                    >
                      <option value="table">Tabela atual</option>
                        <option value="schema">Schema atual</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">Motor de execução</label>
                      <Input disabled value="Spark cluster" />
                      <p className="mt-1 text-xs text-muted">O profiling distribuído roda sempre no cluster Spark.</p>
                    </div>
                    <div className="rounded-2xl border border-border/80 bg-surface p-4 text-sm shadow-sm">
                    <p className="text-xs uppercase tracking-wide text-muted">Destino</p>
                    <p className="mt-1 font-medium text-text">
                      {form.scope === "table"
                        ? targetTableName || "Tabela selecionada"
                        : `${targetDatasourceName || "Conexão"} • ${targetSchemaName || "Schema"}`
                      }
                    </p>
                    <p className="mt-1 text-xs text-muted">Motor atual: {formatExecutionEngineLabel(form.execution_engine)}</p>
                    <p className="mt-1 text-xs text-muted">Banco: {targetDatabaseName || "-"}</p>
                  </div>
                </div>
              </section>

              <section className="space-y-4 rounded-2xl border border-border/80 bg-bg-subtle/80 p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-text">Recorrência</p>
                    <p className="text-xs text-muted">Sem cron manual. As opções amigáveis viram execução automática.</p>
                  </div>
                  <Badge tone={form.schedule_enabled ? "accent" : "neutral"}>{formatScheduleModeLabel(form.schedule_mode)}</Badge>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  <div className="rounded-2xl border border-border/80 bg-surface p-4 shadow-sm">
                    <p className="text-xs uppercase tracking-wide text-muted">Estado</p>
                    <p className="mt-1 text-sm font-medium text-text">{form.schedule_enabled ? "Ativo" : "Desativado"}</p>
                  </div>
                  <div className="rounded-2xl border border-border/80 bg-surface p-4 shadow-sm">
                    <p className="text-xs uppercase tracking-wide text-muted">Última execução</p>
                    <p className="mt-1 text-sm font-medium text-text">{scheduleLastRunLabel}</p>
                  </div>
                  <div className="rounded-2xl border border-border/80 bg-surface p-4 shadow-sm">
                    <p className="text-xs uppercase tracking-wide text-muted">Próxima execução</p>
                    <p className="mt-1 text-sm font-medium text-text">{scheduleNextRunLabel}</p>
                  </div>
                    <div className="rounded-2xl border border-border/80 bg-surface p-4 shadow-sm">
                      <p className="text-xs uppercase tracking-wide text-muted">Último status</p>
                      <p className="mt-1 text-sm font-medium text-text">{scheduleLastStatusLabel}</p>
                    </div>
                  <div className="rounded-2xl border border-border/80 bg-surface p-4 shadow-sm">
                    <p className="text-xs uppercase tracking-wide text-muted">Resumo</p>
                    <p className="mt-1 text-sm font-medium text-text">{scheduleSummary}</p>
                  </div>
                  <div className="rounded-2xl border border-border/80 bg-surface p-4 shadow-sm">
                    <p className="text-xs uppercase tracking-wide text-muted">Horário</p>
                    <p className="mt-1 text-sm font-medium text-text">
                      {form.schedule_mode === "interval"
                        ? form.schedule_every_minutes
                          ? `${form.schedule_every_minutes} min`
                          : "Não definido"
                        : form.schedule_time || "08:00"}
                    </p>
                  </div>
                </div>

                <label className="flex items-center gap-2 rounded-2xl border border-border/80 bg-surface px-3 py-2 text-sm shadow-sm">
                  <input
                    checked={form.schedule_enabled}
                    onChange={(e) => onFormChange({ schedule_enabled: e.target.checked })}
                    type="checkbox"
                  />
                  Executar automaticamente
                </label>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium">Tipo de agendamento</label>
                    <select
                      className="h-10 w-full rounded-lg border border-border/70 px-3 text-sm shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                      onChange={(e) => onFormChange({ schedule_mode: e.target.value as ScheduleMode })}
                      value={form.schedule_mode}
                    >
                      <option value="manual">Manual</option>
                      <option value="daily">Diário</option>
                      <option value="weekly">Semanal</option>
                      <option value="biweekly">Quinzenal</option>
                      <option value="monthly">Mensal</option>
                      <option value="interval">Intervalo técnico</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      {form.schedule_mode === "interval" ? "Intervalo" : "Horário de execução"}
                    </label>
                    {form.schedule_mode === "interval" ? (
                      <div className="grid grid-cols-[1fr_120px] gap-2">
                        <Input
                          disabled={!form.schedule_enabled}
                          min={1}
                          onChange={(e) => {
                            const raw = e.target.value;
                            const numeric = raw ? Number(raw) : null;
                            if (numeric === null || Number.isNaN(numeric)) {
                              onFormChange({ schedule_every_minutes: null });
                              return;
                            }
                            onFormChange({
                              schedule_every_minutes: intervalUnit === "hours" ? numeric * 60 : numeric,
                            });
                          }}
                          placeholder={intervalUnit === "hours" ? "Ex.: 1, 2, 4" : "Ex.: 15, 60, 1440"}
                          type="number"
                          value={
                            intervalUnit === "hours"
                              ? Math.max(1, Math.round((form.schedule_every_minutes ?? 60) / 60))
                              : form.schedule_every_minutes ?? ""
                          }
                        />
                        <select
                          className="h-10 rounded-lg border border-border/70 px-3 text-sm shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                          onChange={(e) => {
                            const unit = e.target.value as "minutes" | "hours";
                            setIntervalUnit(unit);
                            if (form.schedule_every_minutes) {
                              onFormChange({
                                schedule_every_minutes: unit === "hours" ? Math.max(1, Math.round(form.schedule_every_minutes / 60)) * 60 : form.schedule_every_minutes,
                              });
                            }
                          }}
                          value={intervalUnit}
                        >
                          <option value="minutes">Minutos</option>
                          <option value="hours">Horas</option>
                        </select>
                      </div>
                    ) : (
                      <Input
                        disabled={!form.schedule_enabled}
                        onChange={(e) => onFormChange({ schedule_time: e.target.value })}
                        type="time"
                        value={form.schedule_time}
                      />
                    )}
                  </div>
                </div>

                {form.schedule_mode === "weekly" ? (
                  <div>
                    <label className="mb-1 block text-sm font-medium">Dia da semana</label>
                    <select
                      className="h-10 w-full rounded-lg border border-border/70 px-3 text-sm shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                      onChange={(e) => onFormChange({ schedule_day_of_week: Number(e.target.value) })}
                      value={form.schedule_day_of_week ?? 0}
                    >
                      {WEEKDAY_OPTIONS.map((label, index) => (
                        <option key={label} value={index}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}

                {form.schedule_mode === "monthly" ? (
                  <div>
                    <label className="mb-1 block text-sm font-medium">Dia do mês</label>
                    <Input
                      disabled={!form.schedule_enabled}
                      min={1}
                      max={31}
                      onChange={(e) => onFormChange({ schedule_day_of_month: e.target.value ? Number(e.target.value) : null })}
                      type="number"
                      value={form.schedule_day_of_month ?? ""}
                    />
                  </div>
                ) : null}

                {form.schedule_mode === "biweekly" ? (
                  <div>
                    <label className="mb-1 block text-sm font-medium">Data âncora</label>
                    <Input
                      disabled={!form.schedule_enabled}
                      onChange={(e) => onFormChange({ schedule_anchor_date: e.target.value })}
                      type="date"
                      value={form.schedule_anchor_date}
                    />
                    <p className="mt-1 text-xs text-muted">A primeira execução ocorre a partir desta data base, repetindo a cada 14 dias.</p>
                  </div>
                ) : null}

                <p className="rounded-lg border border-warning-200 bg-warning-50 px-3 py-2 text-xs text-warning-900">
                  {scheduleSummary}. Todos os administradores recebem automaticamente as notificações desta falha.
                </p>
              </section>

              <section className="space-y-3 rounded-2xl border border-border/80 bg-bg-subtle/80 p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-text">Destinatários</p>
                    <p className="text-xs text-muted">Escolha usuários ativos. Admins entram sempre no fluxo final.</p>
                  </div>
                  <Badge tone={selectedRecipients.length ? "accent" : "neutral"}>{selectedRecipients.length ? `${selectedRecipients.length} selecionado(s)` : "Opcional"}</Badge>
                </div>

                <div className="space-y-2 rounded-2xl border border-border/80 bg-surface p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted">Selecionados</p>
                    <p className="text-xs text-muted">{selectedRecipients.length ? `${selectedRecipients.length} usuários` : "Nenhum usuário selecionado"}</p>
                  </div>
                  {selectedRecipients.length ? (
                    <div className="flex flex-wrap gap-2">
                      {selectedRecipients.map((recipient) => (
                        <span
                          className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs text-brand-900"
                          key={recipient.id}
                        >
                          <span className="font-medium">{recipient.display_name}</span>
                          <span className="text-muted">{recipient.email}</span>
                          <button
                            className="rounded-full p-0.5 text-muted hover:bg-brand-100 hover:text-brand-700"
                            onClick={() => toggleRecipient(recipient)}
                            type="button"
                            aria-label={`Remover ${recipient.display_name}`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted">Nenhum destinatário manual selecionado. A notificação usará os fallbacks automáticos e todos os admins.</p>
                  )}
                </div>

                <Input
                  onChange={(e) => setRecipientQuery(e.target.value)}
                  placeholder="Buscar por nome ou e-mail"
                  value={recipientQuery}
                />
                {recipientLoading ? <p className="text-xs text-muted">Buscando usuários...</p> : null}
                {recipientError ? <p className="text-xs text-danger-700">{recipientError}</p> : null}
                <div className="max-h-60 overflow-y-auto rounded-2xl border border-border/80 bg-surface shadow-sm">
                  {recipientOptions.length ? (
                    <div className="divide-y divide-border/60">
                      {recipientOptions.map((option) => {
                        const active = selectedRecipientIds.includes(option.id);
                        return (
                          <button
                            className={`flex w-full items-start justify-between gap-3 px-3 py-2 text-left text-sm transition-colors ${
                              active ? "bg-brand-50" : "hover:bg-bg-subtle"
                            }`}
                            key={option.id}
                            onClick={() => toggleRecipient(option)}
                            type="button"
                          >
                            <div className="min-w-0">
                              <p className="truncate font-medium text-text">{option.display_name}</p>
                              <p className="truncate text-xs text-muted">{option.email}</p>
                            </div>
                            <Badge tone={active ? "accent" : "neutral"}>{active ? "Selecionado" : "Adicionar"}</Badge>
                          </button>
                        );
                      })}
                    </div>
                  ) : recipientLoading ? null : (
                    <p className="px-3 py-2 text-sm text-muted">Nenhum usuário encontrado.</p>
                  )}
                </div>
              </section>
            </div>
          </div>

          <div className="min-h-0 overflow-y-auto border-t border-border/60 bg-bg-subtle/50 px-6 py-5 xl:border-l xl:border-t-0">
            <div className="space-y-4">
              <section className="space-y-3 rounded-2xl border border-border/80 bg-surface p-4 shadow-sm">
                <div>
                  <p className="text-sm font-semibold text-text">Resumo operacional</p>
                  <p className="text-xs text-muted">Status do agendamento e ações rápidas.</p>
                </div>
                <div className="grid gap-3">
                  <div className="rounded-2xl border border-border/70 bg-bg-subtle/80 p-3 text-sm shadow-sm">
                    <p className="text-xs uppercase tracking-wide text-muted">Estado</p>
                    <p className="mt-1 font-medium text-text">{form.schedule_enabled ? "Ativo" : "Desativado"}</p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-bg-subtle/80 p-3 text-sm shadow-sm">
                    <p className="text-xs uppercase tracking-wide text-muted">Tipo</p>
                    <p className="mt-1 font-medium text-text">{formatScheduleModeLabel(form.schedule_mode)}</p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-bg-subtle/80 p-3 text-sm shadow-sm">
                    <p className="text-xs uppercase tracking-wide text-muted">Resumo</p>
                    <p className="mt-1 font-medium text-text">{scheduleSummary}</p>
                  </div>
                </div>
              </section>

              {schedule?.schedule_last_error ? (
                <section className="rounded-2xl border border-danger-200 bg-danger-50 p-4 text-sm text-danger-700 shadow-sm">
                  <p className="font-semibold">Último erro</p>
                  <p className="mt-1">{schedule.schedule_last_error}</p>
                </section>
              ) : null}

              <div className="flex flex-col gap-2">
                {schedule ? (
                  <Button disabled={!canWrite || loading} onClick={onDelete} type="button" variant="outline">
                    Excluir agendamento
                  </Button>
                ) : null}
                <Button disabled={!canWrite || loading} onClick={onSave} type="button">
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Salvar agendamento
                </Button>
                <Button onClick={onClose} type="button" variant="outline">
                  Fechar
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
