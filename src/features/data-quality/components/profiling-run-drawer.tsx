import { ExternalLink, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";
import { useModalDismiss } from "@/lib/use-modal-dismiss";

import type { DQHistoricalArtifactSet, DQJobRun } from "../types";

type ProfilingRunDrawerProps = {
  open: boolean;
  loading: boolean;
  error: string;
  run: DQJobRun | null;
  artifacts: DQHistoricalArtifactSet | null;
  tableName: string;
  onClose: () => void;
  onTroubleshoot: () => void;
};

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "Sem informação";
  return new Date(value).toLocaleString("pt-BR");
}

function formatDuration(value: number | null | undefined): string {
  if (value === null || value === undefined) return "Sem duração";
  if (value < 1000) return `${value} ms`;
  return `${(value / 1000).toFixed(1)}s`;
}

function statusTone(status: string | null | undefined): "success" | "warning" | "danger" | "neutral" {
  switch ((status || "").toLowerCase()) {
    case "success":
      return "success";
    case "running":
    case "queued":
      return "warning";
    case "failed":
      return "danger";
    default:
      return "neutral";
  }
}

function statusLabel(status: string | null | undefined): string {
  switch ((status || "").toLowerCase()) {
    case "queued":
      return "Em fila";
    case "running":
      return "Executando";
    case "success":
      return "Concluído";
    case "failed":
      return "Falhou";
    default:
      return "Desconhecido";
  }
}

export function ProfilingRunDrawer({
  open,
  loading,
  error,
  run,
  artifacts,
  tableName,
  onClose,
  onTroubleshoot,
}: ProfilingRunDrawerProps) {
  useModalDismiss({ open, onClose });
  if (!open) return null;

  const baselineCount = artifacts?.baselines?.length ?? 0;
  const eventCount = artifacts?.events?.length ?? 0;
  const evidenceCount = artifacts?.evidence_samples?.length ?? 0;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/55 backdrop-blur-md">
      <div
        aria-modal="true"
        className="ml-auto flex h-full w-full max-w-3xl flex-col overflow-hidden border-l border-border/80 bg-surface shadow-card"
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border/70 bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_58%,#eef6ff_100%)] px-6 py-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Detalhe da execução</p>
            <h3 className="mt-2 text-xl font-semibold tracking-[-0.02em] text-text">{run ? `Execução #${run.id}` : "Execução de perfilamento"}</h3>
            <p className="mt-1 text-sm text-text-body">
              {tableName || "Tabela selecionada"} · motor {run?.execution_engine === "spark" ? "Spark cluster" : run?.execution_engine === "python" ? "Histórico legado" : run?.execution_engine || "—"} · {run?.trigger_source ? `disparo ${run.trigger_source}` : "disparo não informado"}
            </p>
          </div>
          <Button aria-label="Fechar" className="h-10 w-10 shrink-0 p-0" onClick={onClose} size="md" variant="ghost">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          ) : null}

          {!loading && error ? (
            <div className="rounded-2xl border border-danger-200 bg-danger-50 p-4 text-sm text-danger-700">
              Não foi possível carregar o detalhe desta execução. {error}
            </div>
          ) : null}

          {!loading && !error && run ? (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Estado da execução</p>
                  <Badge className="mt-2" tone={statusTone(run.status)}>
                    {statusLabel(run.status)}
                  </Badge>
                </div>
                <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Motor de execução</p>
                  <p className="mt-2 text-sm font-medium text-text">
                    {run.execution_engine === "spark" ? "Spark cluster" : run.execution_engine === "python" ? "Histórico legado (antes do Spark)" : run.execution_engine}
                  </p>
                </div>
                <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Tempo total</p>
                  <p className="mt-2 text-sm font-medium text-text">{formatDuration(run.duration_ms)}</p>
                </div>
                <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Como foi disparada</p>
                  <p className="mt-2 text-sm font-medium text-text">{run.trigger_source || "Não informada"}</p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-border/80 bg-surface p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Linha do tempo</p>
                  <p className="mt-1 text-xs text-muted">Mostra quando a execução foi enfileirada, iniciada e finalizada.</p>
                  <div className="mt-3 space-y-2 text-sm text-text-body">
                    <div className="flex items-center justify-between gap-3">
                      <span>Enfileirada</span>
                      <span className="font-medium">{formatDateTime(run.queued_at)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span>Início</span>
                      <span className="font-medium">{formatDateTime(run.started_at)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span>Fim</span>
                      <span className="font-medium">{formatDateTime(run.finished_at)}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-border/80 bg-surface p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Contexto operacional</p>
                  <p className="mt-1 text-xs text-muted">Identifica a origem da execução e o vínculo com o run de Data Quality.</p>
                  <div className="mt-3 space-y-2 text-sm text-text-body">
                    <div className="flex items-center justify-between gap-3">
                      <span>DQ run id</span>
                      <span className="font-medium">{run.dq_run_id ?? "—"}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span>Agendamento</span>
                      <span className="font-medium">{run.profiling_schedule_id ?? "manual"}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span>Solicitado por</span>
                      <span className="font-medium">{run.requested_by_user_name || run.requested_by_user_email || "Sistema"}</span>
                    </div>
                  </div>
                </div>
              </div>

              {run.error_message ? (
                <div className="rounded-2xl border border-danger-200 bg-danger-50/80 p-4 text-sm text-danger-700">
                  <p className="font-semibold">Resumo do erro</p>
                  <p className="mt-1">{run.error_message}</p>
                </div>
              ) : null}

              <div className="rounded-2xl border border-border/80 bg-surface p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Diagnóstico</p>
                    <h4 className="mt-1 text-sm font-semibold text-text">Histórico filtrado desta execução</h4>
                    <p className="mt-1 text-xs text-muted">Use esta área para comparar baselines, drift e evidências do mesmo run.</p>
                  </div>
                  <Button onClick={onTroubleshoot} size="sm" variant="outline">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Abrir diagnóstico
                  </Button>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-border bg-bg-subtle/70 p-3">
                    <p className="text-xs text-muted">Baselines</p>
                    <p className="mt-1 text-lg font-semibold text-text">{baselineCount}</p>
                  </div>
                  <div className="rounded-2xl border border-border bg-bg-subtle/70 p-3">
                    <p className="text-xs text-muted">Anomalias / drift</p>
                    <p className="mt-1 text-lg font-semibold text-text">{eventCount}</p>
                  </div>
                  <div className="rounded-2xl border border-border bg-bg-subtle/70 p-3">
                    <p className="text-xs text-muted">Evidências</p>
                    <p className="mt-1 text-lg font-semibold text-text">{evidenceCount}</p>
                  </div>
                </div>
                {artifacts?.events?.length ? (
                  <div className="mt-4 space-y-2">
                    {artifacts.events.slice(0, 4).map((event, index) => (
                      <div className="rounded-2xl border border-border/80 bg-bg-subtle/70 px-3 py-2" key={`${event.metric_key}-${event.event_type}-${index}`}>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge tone={statusTone(event.status)}>{event.event_type}</Badge>
                            <span className="text-sm font-medium text-text">{event.metric_key}</span>
                          </div>
                          <span className="text-xs text-muted">{event.severity}</span>
                        </div>
                        <p className="mt-1 text-sm text-text-body">{event.details_json && typeof event.details_json === "object" ? JSON.stringify(event.details_json) : event.delta_pct !== null ? `Delta ${event.delta_pct.toFixed(2)}%` : "Sem detalhes adicionais."}</p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="rounded-2xl border border-border/80 bg-slate-950 p-4 text-slate-100">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Logs resumidos</p>
                <p className="mt-1 text-xs text-muted">Trechos finais do log para apoiar diagnóstico sem sair do modal.</p>
                <pre className={cn("mt-3 max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-slate-900 p-4 text-xs leading-6 text-slate-100")}>
                  {run.log_tail || run.stdout_log || run.stderr_log || "Sem logs resumidos disponíveis."}
                </pre>
              </div>
            </div>
          ) : null}

          {!loading && !error && !run ? (
            <EmptyState
              title="Sem detalhe disponível"
              description="Selecione uma execução recente para ver status, linha do tempo, logs e contexto operacional."
            />
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border/70 bg-surface/95 px-6 py-4 backdrop-blur">
          <Button onClick={onClose} variant="outline">
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
}
