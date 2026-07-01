import { useEffect, useMemo, useState } from "react";
import { Loader2, Search, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useModalDismiss } from "@/lib/use-modal-dismiss";
import {
  type DataSourceScanSchedule,
  type DataSourceScanScheduleForm,
  type DataSourceScheduleUserOption,
  searchDataSourceScheduleUsers,
} from "@/features/datasources/api";
import type { ScheduleMode } from "@/features/data-quality/types";

type Props = {
  open: boolean;
  loading: boolean;
  datasourceName: string;
  schedule: DataSourceScanSchedule | null;
  form: DataSourceScanScheduleForm;
  onClose: () => void;
  onDelete: () => void;
  onFormChange: (patch: Partial<DataSourceScanScheduleForm>) => void;
  onSave: () => void;
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

function formatScheduleSummary(form: DataSourceScanScheduleForm) {
  if (!form.schedule_enabled || form.schedule_mode === "manual") return "Manual";
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

function formatScheduleModeLabel(mode: ScheduleMode | string | null | undefined) {
  if (!mode) return "Não definido";
  return SCHEDULE_MODE_LABELS[mode as ScheduleMode] || String(mode);
}

export function DatasourceScheduleModal({
  open,
  loading,
  datasourceName,
  schedule,
  form,
  onClose,
  onDelete,
  onFormChange,
  onSave,
}: Props) {
  useModalDismiss({ open, onClose });

  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<DataSourceScheduleUserOption[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [selectedRecipients, setSelectedRecipients] = useState<DataSourceScheduleUserOption[]>([]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setOptions([]);
      setSearching(false);
      setSearchError("");
      setSelectedRecipients([]);
      return;
    }
    setSelectedRecipients(schedule?.notification_recipients ?? []);
  }, [open, schedule?.notification_recipients]);

  useEffect(() => {
    if (!open) return;
    let active = true;
    const timeout = window.setTimeout(() => {
      setSearching(true);
      setSearchError("");
      void (async () => {
        try {
          const data = await searchDataSourceScheduleUsers(query, 20);
          if (!active) return;
          setOptions(data);
        } catch (error) {
          if (!active) return;
          setOptions([]);
          setSearchError((error as Error).message || "Não foi possível buscar usuários");
        } finally {
          if (active) setSearching(false);
        }
      })();
    }, 250);
    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [open, query]);

  const summary = useMemo(() => formatScheduleSummary(form), [form]);
  const nextRun = schedule?.schedule_next_run_at ? formatDateTime(schedule.schedule_next_run_at) : form.schedule_enabled ? "Aguardando primeira execução" : "Agendamento desativado";
  const lastRun = schedule?.schedule_last_run_at ? formatDateTime(schedule.schedule_last_run_at) : "Sem execução anterior";
  const lastStatus = schedule?.schedule_last_status || (form.schedule_enabled ? "Sem execução" : "Desativado");

  function syncRecipients(next: DataSourceScheduleUserOption[]) {
    setSelectedRecipients(next);
    onFormChange({ recipient_user_ids: next.map((item) => item.id) });
  }

  function toggleRecipient(option: DataSourceScheduleUserOption) {
    const exists = selectedRecipients.some((item) => item.id === option.id);
    if (exists) {
      syncRecipients(selectedRecipients.filter((item) => item.id !== option.id));
      return;
    }
    syncRecipients([...selectedRecipients, option]);
  }

  if (!open) return null;

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-3 backdrop-blur-md"
      role="dialog"
    >
      <div className="flex h-[92dvh] w-full max-w-[1120px] flex-col overflow-hidden rounded-[28px] border border-border/80 bg-surface shadow-card">
        <div className="flex items-start justify-between gap-4 border-b border-border/70 bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_58%,#eef6ff_100%)] px-6 py-5">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold tracking-[-0.01em] text-text">Agendamento do scan da fonte</h3>
            <p className="mt-1 text-sm leading-6 text-text-body">
              Configuração de recorrência para a fonte <span className="font-medium text-text">{datasourceName}</span>.
            </p>
          </div>
          <button aria-label="Fechar" className="rounded-full border border-border/70 p-2 text-muted transition hover:border-border-strong hover:bg-bg-subtle hover:text-text" onClick={onClose} type="button">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 gap-0 xl:grid-cols-[minmax(0,1.25fr)_minmax(340px,0.75fr)]">
          <div className="min-h-0 overflow-y-auto px-6 py-5">
            <div className="space-y-5">
              <section className="rounded-3xl border border-border/80 bg-bg-subtle/80 p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-text">Status e resumo</p>
                    <p className="text-xs text-muted">O mesmo padrão de recorrência do Data Quality, agora aplicado ao scan da fonte.</p>
                  </div>
                  <Badge tone={form.schedule_enabled ? "success" : "neutral"}>{form.schedule_enabled ? "Ativo" : "Desativado"}</Badge>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-border/80 bg-surface p-3">
                    <div className="text-[11px] uppercase tracking-wide text-muted">Resumo</div>
                    <div className="mt-1 text-sm font-medium text-text">{summary}</div>
                  </div>
                  <div className="rounded-2xl border border-border/80 bg-surface p-3">
                    <div className="text-[11px] uppercase tracking-wide text-muted">Modo</div>
                    <div className="mt-1 text-sm font-medium text-text">{formatScheduleModeLabel(form.schedule_mode)}</div>
                  </div>
                </div>
              </section>

              <section className="space-y-3 rounded-3xl border border-border/80 bg-surface p-4 shadow-sm">
                <div>
                  <p className="text-sm font-semibold text-text">Execução e recorrência</p>
                  <p className="text-xs text-muted">Escolha uma periodicidade amigável sem precisar escrever cron manualmente.</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-text-body">Agendamento ativo</label>
                      <label className="flex items-center gap-2 rounded-2xl border border-border/80 bg-bg-subtle/70 px-3 py-2.5 text-sm text-text-body">
                        <input
                          checked={form.schedule_enabled}
                          onChange={(event) => {
                            const enabled = event.target.checked;
                            onFormChange({
                              schedule_enabled: enabled,
                              schedule_mode: enabled ? (form.schedule_mode === "manual" ? "daily" : form.schedule_mode) : "manual",
                              schedule_time: enabled && form.schedule_mode === "manual" ? form.schedule_time || "08:00" : form.schedule_time,
                            });
                          }}
                          type="checkbox"
                        />
                      <span>Executar automaticamente</span>
                    </label>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-text-body" htmlFor="datasource-schedule-mode">
                      Tipo de recorrência
                    </label>
                      <Select
                        id="datasource-schedule-mode"
                        onChange={(event) => {
                          const nextMode = event.target.value as ScheduleMode;
                          const patch: Partial<DataSourceScanScheduleForm> = {
                            schedule_mode: nextMode,
                            schedule_enabled: nextMode !== "manual",
                          };
                          if (nextMode === "interval") {
                            patch.schedule_every_minutes = form.schedule_every_minutes ?? 60;
                          } else {
                            patch.schedule_every_minutes = null;
                          }
                          if (nextMode === "daily") {
                            patch.schedule_time = form.schedule_time || "08:00";
                          }
                          if (nextMode === "weekly") {
                            patch.schedule_time = form.schedule_time || "08:00";
                            patch.schedule_day_of_week = form.schedule_day_of_week ?? 0;
                          }
                          if (nextMode === "monthly") {
                            patch.schedule_time = form.schedule_time || "08:00";
                            patch.schedule_day_of_month = form.schedule_day_of_month ?? 1;
                          }
                          if (nextMode === "biweekly") {
                            patch.schedule_time = form.schedule_time || "08:00";
                            patch.schedule_anchor_date = form.schedule_anchor_date || todayDateInputValue();
                          }
                          onFormChange(patch);
                        }}
                        value={form.schedule_mode}
                      >
                      <option value="manual">Manual</option>
                      <option value="daily">Diário</option>
                      <option value="weekly">Semanal</option>
                      <option value="biweekly">Quinzenal</option>
                      <option value="monthly">Mensal</option>
                      <option value="interval">A cada X minutos</option>
                    </Select>
                  </div>
                  {form.schedule_mode === "interval" ? (
                    <div>
                      <label className="mb-1 block text-sm font-medium text-text-body" htmlFor="datasource-schedule-interval">
                        Intervalo em minutos
                      </label>
                      <Input
                        id="datasource-schedule-interval"
                        min={1}
                        onChange={(event) => onFormChange({ schedule_every_minutes: Number(event.target.value || 0) })}
                        type="number"
                        value={form.schedule_every_minutes ?? ""}
                      />
                    </div>
                  ) : null}
                  {form.schedule_mode !== "manual" && form.schedule_mode !== "interval" ? (
                    <div>
                      <label className="mb-1 block text-sm font-medium text-text-body" htmlFor="datasource-schedule-time">
                        Horário
                      </label>
                      <Input
                        id="datasource-schedule-time"
                        onChange={(event) => onFormChange({ schedule_time: event.target.value })}
                        type="time"
                        value={form.schedule_time}
                      />
                    </div>
                  ) : null}
                  {form.schedule_mode === "weekly" ? (
                    <div>
                      <label className="mb-1 block text-sm font-medium text-text-body" htmlFor="datasource-schedule-weekday">
                        Dia da semana
                      </label>
                      <Select
                        id="datasource-schedule-weekday"
                        onChange={(event) => onFormChange({ schedule_day_of_week: Number(event.target.value) })}
                        value={form.schedule_day_of_week ?? 0}
                      >
                        {WEEKDAY_OPTIONS.map((label, index) => (
                          <option key={label} value={index}>
                            {label}
                          </option>
                        ))}
                      </Select>
                    </div>
                  ) : null}
                  {form.schedule_mode === "monthly" ? (
                    <div>
                      <label className="mb-1 block text-sm font-medium text-text-body" htmlFor="datasource-schedule-monthday">
                        Dia do mês
                      </label>
                      <Input
                        id="datasource-schedule-monthday"
                        min={1}
                        max={31}
                        onChange={(event) => onFormChange({ schedule_day_of_month: Number(event.target.value || 1) })}
                        type="number"
                        value={form.schedule_day_of_month ?? 1}
                      />
                    </div>
                  ) : null}
                  {form.schedule_mode === "biweekly" ? (
                    <div>
                      <label className="mb-1 block text-sm font-medium text-text-body" htmlFor="datasource-schedule-anchor">
                        Data âncora
                      </label>
                      <Input
                        id="datasource-schedule-anchor"
                        onChange={(event) => onFormChange({ schedule_anchor_date: event.target.value })}
                        type="date"
                        value={form.schedule_anchor_date}
                      />
                    </div>
                  ) : null}
                </div>
              </section>

              <section className="space-y-3 rounded-3xl border border-border/80 bg-surface p-4 shadow-sm">
                <div>
                  <p className="text-sm font-semibold text-text">Destinatários</p>
                  <p className="text-xs text-muted">Selecione usuários cadastrados para receber notificações desta fonte.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedRecipients.length ? (
                    selectedRecipients.map((item) => (
                      <button
                        className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-bg-subtle/80 px-3 py-1.5 text-xs text-text-body transition hover:border-border-strong hover:bg-surface"
                        key={item.id}
                        onClick={() => toggleRecipient(item)}
                        type="button"
                      >
                        <span>{item.display_name}</span>
                        <span className="text-muted">×</span>
                      </button>
                    ))
                  ) : (
                    <p className="text-sm text-muted">Nenhum destinatário selecionado.</p>
                  )}
                </div>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted" />
                  <Input className="pl-9" onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nome ou e-mail" value={query} />
                </div>
                {searchError ? <p className="text-sm text-danger-600">{searchError}</p> : null}
                <div className="max-h-56 overflow-y-auto rounded-2xl border border-border/80 bg-surface">
                  {searching ? (
                    <div className="flex items-center justify-center p-4">
                      <Loader2 className="h-4 w-4 animate-spin text-muted" />
                    </div>
                  ) : options.length ? (
                    options.map((item) => {
                      const selected = selectedRecipients.some((recipient) => recipient.id === item.id);
                      return (
                        <button
                          className={[
                            "flex w-full items-center justify-between gap-3 border-b border-border/60 px-4 py-3 text-left text-sm last:border-b-0",
                            selected ? "bg-brand-50/70 text-brand-900" : "bg-surface text-text-body hover:bg-bg-subtle/70",
                          ].join(" ")}
                          key={item.id}
                          onClick={() => toggleRecipient(item)}
                          type="button"
                        >
                          <div className="min-w-0">
                            <div className="truncate font-medium">{item.display_name}</div>
                            <div className="truncate text-xs text-muted">{item.email}</div>
                          </div>
                          <Badge tone={selected ? "success" : "neutral"}>{selected ? "Selecionado" : "Adicionar"}</Badge>
                        </button>
                      );
                    })
                  ) : (
                    <div className="p-4 text-sm text-muted">Nenhum usuário encontrado.</div>
                  )}
                </div>
              </section>
            </div>
          </div>

          <div className="min-h-0 overflow-y-auto border-t border-border/70 bg-bg-subtle/80 px-6 py-5 xl:border-l xl:border-t-0">
            <div className="space-y-4">
              <section className="rounded-3xl border border-border/80 bg-surface p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Operação</p>
                <div className="mt-3 space-y-2 text-sm text-text-body">
                  <p>
                    <span className="font-medium text-text">Última execução:</span> {lastRun}
                  </p>
                  <p>
                    <span className="font-medium text-text">Próxima execução:</span> {nextRun}
                  </p>
                  <p>
                    <span className="font-medium text-text">Último status:</span> {lastStatus}
                  </p>
                </div>
              </section>

              <section className="rounded-3xl border border-border/80 bg-surface p-4 shadow-sm">
                <p className="text-sm font-semibold text-text">Orientação</p>
                <p className="mt-2 text-sm leading-6 text-text-body">
                  O agendamento seguirá esta configuração até que você a altere explicitamente. O mesmo padrão de recorrência do Data Quality foi reaproveitado para manter a experiência consistente.
                </p>
              </section>

              {schedule ? (
                <section className="rounded-3xl border border-border/80 bg-surface p-4 shadow-sm">
                  <p className="text-sm font-semibold text-text">Agendamento existente</p>
                  <p className="mt-2 text-sm text-text-body">
                    {schedule.schedule_summary || "Configuração salva"} • {schedule.schedule_enabled ? "Ativo" : "Desativado"}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button disabled={loading} onClick={onDelete} type="button" variant="outline">
                      Excluir agendamento
                    </Button>
                  </div>
                </section>
              ) : (
                <div className="rounded-3xl border border-dashed border-border/80 bg-surface p-4 text-sm text-muted">
                  Nenhum agendamento configurado ainda. Salve para ativar o scan periódico desta fonte.
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-border/70 bg-surface/95 px-6 py-4 backdrop-blur">
          <Button onClick={onClose} type="button" variant="ghost">
            Fechar
          </Button>
          <Button disabled={loading} onClick={onSave} type="button">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Salvar agendamento
          </Button>
        </div>
      </div>
    </div>
  );
}
