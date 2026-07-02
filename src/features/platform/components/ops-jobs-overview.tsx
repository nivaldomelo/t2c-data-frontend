import { useMemo, useState } from "react";
import { safeHref } from "@/lib/safe-href";
import { Clock3, Database, History, RefreshCw, Workflow } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime } from "@/features/dashboard/components/shared";
import { formatCompactNumber } from "@/features/explorer/utils";
import type { PlatformIntegrationSyncJob, PlatformJobsHistoryResponse, PlatformJobsStatus } from "@/features/platform/types";

type Props = {
  jobsStatus: PlatformJobsStatus | null;
  jobsHistory: PlatformJobsHistoryResponse | null;
  loading: boolean;
  error: string;
  onRefresh: () => void;
};

export type JobDiagnostic = {
  badge: string;
  tone: "success" | "warning" | "danger" | "neutral";
  message: string;
  action: string;
  impact: string | null;
  recurrenceLabel: string | null;
  ageLabel: string | null;
  overdue: boolean;
  stalled: boolean;
};

function sectionCardClassName() {
  return "border-border/80 bg-surface shadow-card";
}

function diffHours(from: string | null | undefined, to: number = Date.now()) {
  if (!from) return null;
  const value = new Date(from).getTime();
  if (Number.isNaN(value)) return null;
  return (to - value) / (1000 * 60 * 60);
}

function toneForStatus(status?: string | null): "success" | "warning" | "danger" | "neutral" {
  switch ((status || "").toLowerCase()) {
    case "running":
      return "warning";
    case "success":
      return "success";
    case "failed":
      return "danger";
    case "skipped":
      return "neutral";
    default:
      return "neutral";
  }
}

function labelForSource(source?: string | null): string {
  const normalized = (source || "").toLowerCase();
  if (normalized === "s3") return "Data Lake";
  if (normalized === "metabase") return "Metabase";
  if (normalized === "dq") return "Data Quality";
  if (normalized === "datasource") return "Datasource";
  return normalized || "Integração";
}

function labelForJobType(jobType?: string | null): string {
  const normalized = (jobType || "").toLowerCase();
  const map: Record<string, string> = {
    inventory_scan: "Scan do Data Lake",
    data_lake_scan: "Scan do Data Lake",
    scan: "Scan",
    sync: "Sincronização",
    rules_scheduler: "Scheduler de regras",
    profiling_scheduler: "Scheduler de profiling",
    datasource_scan: "Scan de datasource",
    scheduler: "Scheduler",
    rules: "Regras",
    profiling: "Profiling",
  };
  return map[normalized] || normalized.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function jobTitle(job: PlatformIntegrationSyncJob): string {
  const source = labelForSource(job.source);
  const type = labelForJobType(job.job_type);
  return `${source} · ${type}`;
}

export function getJobDiagnostic(job: PlatformIntegrationSyncJob): JobDiagnostic {
  if (job.diagnostic_label && job.diagnostic_severity && job.diagnostic_status) {
    return {
      badge: job.diagnostic_label,
      tone:
        job.diagnostic_severity === "critical"
          ? "danger"
          : job.diagnostic_severity === "warning"
            ? "warning"
            : job.diagnostic_severity === "healthy"
              ? "success"
              : "neutral",
      message: job.diagnostic_description || "Diagnóstico operacional fornecido pelo backend.",
      action: job.diagnostic_recommended_action || "Acompanhar a execução.",
      impact: job.diagnostic_impact || null,
      recurrenceLabel:
        job.diagnostic_recurrence_count != null
          ? job.diagnostic_recurrence_count === 1
            ? "Ocorrência única"
            : `${job.diagnostic_recurrence_count} ocorrências recentes`
          : null,
      ageLabel:
        job.running_duration_seconds != null
          ? job.running_duration_seconds < 60
            ? `${Math.max(1, Math.floor(job.running_duration_seconds))}s em execução`
            : job.running_duration_seconds < 3600
              ? `${Math.max(1, Math.floor(job.running_duration_seconds / 60))}m em execução`
              : `${Math.max(1, Math.floor(job.running_duration_seconds / 3600))}h em execução`
          : null,
      overdue: Boolean(job.is_overdue_next_run),
      stalled: Boolean(job.is_stalled),
    };
  }
  const now = Date.now();
  const startedHours = diffHours(job.started_at, now);
  const nextExpectedHours = diffHours(job.next_expected_run_at, now);
  const isRunning = (job.status || "").toLowerCase() === "running";
  const overdue = nextExpectedHours != null && nextExpectedHours > 0;
  const runningTooLong = startedHours != null && startedHours > 24;
  const attention = Boolean(isRunning && ((startedHours != null && startedHours > 2) || overdue));
  const stalled = Boolean(isRunning && (runningTooLong || overdue));

  if (isRunning && overdue) {
    return {
      badge: "Execução prevista atrasada",
      tone: "danger",
      message: "A próxima execução esperada está no passado ou não foi recalculada a tempo.",
      action: "Verificar scheduler, lock e heartbeat.",
      impact: "O ciclo pode atrasar a atualização dos sinais operacionais.",
      recurrenceLabel: null,
      ageLabel: startedHours != null ? `${Math.max(1, Math.floor(startedHours))}h em execução` : null,
      overdue: true,
      stalled: true,
    };
  }

  if (runningTooLong) {
    const days = Math.max(1, Math.floor((startedHours || 0) / 24));
    return {
      badge: `Travado há ${days} dia${days > 1 ? "s" : ""}`,
      tone: "danger",
      message: "Este job está em running há muito tempo e merece revisão imediata.",
      action: "Revisar scheduler, lock e encerramento seguro.",
      impact: "A automação fica sem atualização confiável enquanto a execução permanece presa.",
      recurrenceLabel: null,
      ageLabel: startedHours != null ? `${Math.max(1, Math.floor(startedHours))}h em execução` : null,
      overdue,
      stalled: true,
    };
  }

  if (attention) {
    return {
      badge: "Possivelmente travado",
      tone: "warning",
      message: "Este job está em execução há mais tempo do que o habitual ou com previsão atrasada.",
      action: "Validar scheduler, checkpoint e última atualização.",
      impact: "Há risco de atraso operacional até a próxima reconciliação.",
      recurrenceLabel: null,
      ageLabel: startedHours != null ? `${Math.max(1, Math.floor(startedHours))}h em execução` : null,
      overdue,
      stalled: false,
    };
  }

  if (isRunning) {
    return {
      badge: "Em execução",
      tone: "warning",
      message: "Execução ativa dentro da janela esperada.",
      action: "Acompanhar até a conclusão.",
      impact: null,
      recurrenceLabel: null,
      ageLabel: startedHours != null ? `${Math.max(1, Math.floor(startedHours))}h em execução` : null,
      overdue,
      stalled: false,
    };
  }

  if ((job.status || "").toLowerCase() === "failed") {
    return {
      badge: "Falha",
      tone: "danger",
      message: "A última execução falhou e precisa de triagem operacional.",
      action: "Abrir histórico e revisar a causa.",
      impact: "O job não entregou os sinais esperados para o produto.",
      recurrenceLabel: null,
      ageLabel: null,
      overdue: false,
      stalled: false,
    };
  }

  return {
    badge: job.status || "Sem status",
    tone: "success",
    message: "Execução saudável na última leitura disponível.",
    action: "Manter monitoramento.",
    impact: null,
    recurrenceLabel: null,
    ageLabel: null,
    overdue: false,
    stalled: false,
  };
}

function JobSummaryCard({ job }: { job: PlatformIntegrationSyncJob }) {
  const tone = toneForStatus(job.status);
  const diagnostic = getJobDiagnostic(job);
  const nextExpectedPast = job.next_expected_run_at ? diffHours(job.next_expected_run_at) != null && diffHours(job.next_expected_run_at)! > 0 : false;
  return (
    <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Workflow className="h-4 w-4 text-muted" />
            <p className="font-medium text-text">{jobTitle(job)}</p>
            <Badge tone={tone}>{job.status}</Badge>
            <Badge tone={diagnostic.tone}>{diagnostic.badge}</Badge>
          </div>
          <p className="text-xs text-muted">
            {job.target_name || job.target_type || "Sem destino"}
            {job.target_id != null ? ` · #${job.target_id}` : ""}
          </p>
        </div>
        {job.records_processed != null ? <Badge tone="neutral">{formatCompactNumber(job.records_processed)} registros</Badge> : null}
      </div>
      <div className="mt-3 grid gap-2 text-xs text-text-body md:grid-cols-2">
        <p>Início: {formatDateTime(job.started_at)}</p>
        <p>Fim: {job.finished_at ? formatDateTime(job.finished_at) : "Em andamento"}</p>
        <p>
          Próxima execução:{" "}
          {job.next_expected_run_at ? (
            nextExpectedPast ? (
              <span className="font-medium text-danger-700">Execução prevista atrasada ({formatDateTime(job.next_expected_run_at)})</span>
            ) : (
              formatDateTime(job.next_expected_run_at)
            )
          ) : (
            "Não prevista"
          )}
        </p>
        <p>Modo: {job.trigger_mode || "manual"}</p>
      </div>
      <p className="mt-3 text-sm text-text-body">{diagnostic.message}</p>
      <p className="mt-1 text-xs text-muted">
        <span className="font-medium text-text-body">Ação recomendada:</span> {diagnostic.action}
      </p>
      {diagnostic.impact ? (
        <p className="mt-1 text-xs text-text-body">
          <span className="font-medium text-text-body">Impacto:</span> {diagnostic.impact}
        </p>
      ) : null}
      {job.diagnostic_probable_cause ? (
        <p className="mt-1 text-xs text-text-body">
          <span className="font-medium text-text-body">Causa provável:</span> {job.diagnostic_probable_cause}
        </p>
      ) : diagnostic.tone !== "success" ? (
        <p className="mt-1 text-xs text-muted">
          <span className="font-medium text-text-body">Causa provável:</span> ainda não classificada pelo backend.
        </p>
      ) : null}
      {diagnostic.recurrenceLabel ? (
        <p className="mt-1 text-xs text-muted">
          <span className="font-medium text-text-body">Recorrência:</span> {diagnostic.recurrenceLabel}
        </p>
      ) : null}
      {job.diagnostic_evidence ? (
        <p className="mt-1 text-xs text-muted">
          <span className="font-medium text-text-body">Evidência:</span> {job.diagnostic_evidence}
        </p>
      ) : null}
      {(job.diagnostic_runbook_url || job.diagnostic_correlation_id) ? (
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted">
          {job.diagnostic_runbook_url ? (
            <a className="font-medium text-primary hover:underline" href={safeHref(job.diagnostic_runbook_url)} target="_blank" rel="noreferrer">
              Abrir runbook
            </a>
          ) : null}
          {job.diagnostic_correlation_id ? <span>correlation_id: {job.diagnostic_correlation_id}</span> : null}
        </div>
      ) : null}
      {job.error ? <p className="mt-3 rounded-xl border border-danger-200 bg-danger-50 p-3 text-sm text-danger-700">{job.error}</p> : null}
    </div>
  );
}

export function OpsJobsOverview({ jobsStatus, jobsHistory, loading, error, onRefresh }: Props) {
  const [showAllJobs, setShowAllJobs] = useState(false);
  const [showAllHistory, setShowAllHistory] = useState(false);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton className="h-24 w-full" key={index} />
          ))}
        </div>
        <Skeleton className="h-[280px] w-full" />
      </div>
    );
  }

  if (error) {
    return <EmptyState description={error} title="Não foi possível carregar os jobs" />;
  }

  if (!jobsStatus) {
    return <EmptyState description="Nenhuma execução de job foi retornada pela plataforma." title="Jobs indisponíveis" />;
  }

  const items = jobsStatus.items ?? [];
  const historyItems = jobsHistory?.items ?? [];
  const jobDiagnostics = useMemo(() => items.map((job) => ({ job, diagnostic: getJobDiagnostic(job) })), [items]);
  const visibleJobs = showAllJobs ? jobDiagnostics : jobDiagnostics.slice(0, 6);
  const visibleHistory = showAllHistory ? historyItems : historyItems.slice(0, 6);
  const counts = [
    ["total", jobsStatus.total],
    ["running", jobsStatus.running],
    ["success", jobsStatus.success],
    ["failed", jobsStatus.failed],
    ["skipped", jobsStatus.skipped],
  ] as const;

  return (
    <div className="space-y-4">
      <Card className={sectionCardClassName()}>
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Automação base</p>
              <h3 className="mt-2 text-lg font-semibold text-text">Jobs centralizados e observáveis</h3>
              <p className="mt-1 max-w-3xl text-sm text-text-body">
                Monitoramos jobs centrais de Data Lake, Metabase, Data Quality e fontes de dados. Use os diagnósticos para entender o que aconteceu, o impacto e o próximo passo.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="neutral">Atualizado em {formatDateTime(jobsStatus.generated_at)}</Badge>
              <Button onClick={onRefresh} size="sm" variant="outline">
                <RefreshCw className="mr-2 h-4 w-4" />
                Recarregar jobs
              </Button>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {counts.map(([label, value]) => (
              <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4" key={label}>
                <p className="text-xs uppercase tracking-[0.16em] text-muted">
                  {label === "total"
                    ? "Execuções"
                    : label === "running"
                      ? "Em execução"
                      : label === "success"
                        ? "Sucesso"
                        : label === "failed"
                          ? "Falhas"
                          : "Ignorados"}
                </p>
                <p className="mt-2 text-2xl font-semibold text-text">{value}</p>
              </div>
            ))}
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {[
              ["Em execução", jobDiagnostics.filter(({ diagnostic }) => diagnostic.badge === "Em execução").length, "warning"],
              ["Possivelmente travados", jobDiagnostics.filter(({ diagnostic }) => diagnostic.badge === "Possivelmente travado").length, "warning"],
              ["Travados", jobDiagnostics.filter(({ diagnostic }) => diagnostic.stalled).length, "danger"],
              ["Previsão atrasada", jobDiagnostics.filter(({ diagnostic }) => diagnostic.overdue).length, "danger"],
            ].map(([label, value, tone]) => (
              <div className={`rounded-2xl border p-4 ${tone === "danger" ? "border-danger-200 bg-danger-50" : "border-warning-200 bg-warning-50"}`} key={String(label)}>
                <p className="text-xs uppercase tracking-[0.16em] text-muted">{label}</p>
                <p className="mt-2 text-2xl font-semibold text-text">{value}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm text-text-body">
            <Clock3 className="h-4 w-4 text-muted" />
            <span>
              Próxima execução prevista:{" "}
              {jobsStatus.next_expected_run_at ? (
                diffHours(jobsStatus.next_expected_run_at) != null && diffHours(jobsStatus.next_expected_run_at)! > 0 ? (
                  <span className="font-medium text-danger-700">Execução prevista atrasada ({formatDateTime(jobsStatus.next_expected_run_at)})</span>
                ) : (
                  formatDateTime(jobsStatus.next_expected_run_at)
                )
              ) : (
                "Sem próxima execução"
              )}
            </span>
            {jobsHistory ? <span>· Histórico total: {formatCompactNumber(jobsHistory.total)}</span> : null}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className={sectionCardClassName()}>
          <CardContent className="space-y-4 p-5">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-muted" />
              <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Últimas execuções por job</p>
              <h4 className="mt-1 text-lg font-semibold text-text">Estado atual dos fluxos monitorados</h4>
              </div>
            </div>
            {visibleJobs.length ? (
              <div className="space-y-3">
                {visibleJobs.map(({ job }) => (
                  <JobSummaryCard job={job} key={job.id} />
                ))}
              </div>
            ) : (
              <EmptyState description="Ainda não existem jobs registrados nesta janela." title="Sem jobs recentes" />
            )}
            {items.length > 6 ? (
              <div className="flex justify-center pt-1">
                <Button onClick={() => setShowAllJobs((current) => !current)} size="sm" variant="ghost">
                  {showAllJobs ? "Mostrar menos jobs" : "Ver todos os jobs"}
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className={sectionCardClassName()}>
          <CardContent className="space-y-4 p-5">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-muted" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Histórico recente</p>
                <h4 className="mt-1 text-lg font-semibold text-text">Últimas execuções observadas</h4>
              </div>
            </div>
            {visibleHistory.length ? (
              <div className="space-y-3">
                {visibleHistory.map((job) => (
                  <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4" key={job.id}>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-text">{jobTitle(job)}</p>
                        <p className="text-xs text-muted">
                          {job.target_name || job.target_type || "Sem destino"}
                          {job.target_id != null ? ` · #${job.target_id}` : ""} · {formatDateTime(job.started_at)}
                        </p>
                      </div>
                      <Badge tone={toneForStatus(job.status)}>{job.status}</Badge>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-text-body">
                      <span>Registros: {job.records_processed != null ? formatCompactNumber(job.records_processed) : "N/D"}</span>
                      <span>Fim: {job.finished_at ? formatDateTime(job.finished_at) : "Em andamento"}</span>
                    </div>
                    {job.error ? <p className="mt-2 rounded-xl border border-danger-200 bg-danger-50 p-3 text-sm text-danger-700">{job.error}</p> : null}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState description="O histórico ainda não retornou execuções recentes." title="Histórico vazio" />
            )}
            {historyItems.length > 6 ? (
              <div className="flex justify-center pt-1">
                <Button onClick={() => setShowAllHistory((current) => !current)} size="sm" variant="ghost">
                  {showAllHistory ? "Mostrar menos histórico" : "Ver histórico completo"}
                </Button>
              </div>
            ) : null}
            <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4 text-sm text-text-body">
              O histórico vem do endpoint <code className="rounded bg-surface px-1.5 py-0.5 text-xs text-text-body">/platform/jobs/history</code> e mantém a trilha operacional para auditoria e suporte.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
