import { Link } from "@/lib/next-shims";
import { AlertTriangle, Workflow } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { TableCorrelationSummary } from "@/features/explorer/types";
import { buildOperationalIncidentCreateHref } from "@/features/incidents/prefill";
import { formatDateTime } from "@/features/dashboard/components/shared";
import { formatCompactNumber } from "@/features/explorer/utils";

type AssetCorrelationCardProps = {
  summary: TableCorrelationSummary;
  onAutoOpenIncident?: (() => void) | null;
  autoOpening?: boolean;
  onOpenLogs?: (() => void) | null;
  onRerunProfiling?: (() => void) | null;
  profilingRerunLoading?: boolean;
  openLogsLabel?: string;
  title?: string;
  subtitle?: string;
};

export function AssetCorrelationCard({
  summary,
  onAutoOpenIncident,
  autoOpening = false,
  onOpenLogs,
  onRerunProfiling,
  profilingRerunLoading = false,
  openLogsLabel = "Abrir logs da última execução",
  title = "Operação, qualidade e incidentes no mesmo contexto",
  subtitle,
}: AssetCorrelationCardProps) {
  const pipeline = summary.ingestion?.primary_pipeline ?? null;
  const stability = summary.stability;
  const governanceTrend = summary.governance_trend;
  const dqScore = summary.dq.dq_score;
  const correlationSummary = summary.summary || summary.signals.summary;
  const createHref = summary.incident_prefill
    ? buildOperationalIncidentCreateHref({
        tableId: summary.table_id,
        schemaName: summary.locator.schema_name,
        tableName: summary.locator.table_name,
        pipelineName: pipeline?.pipeline_name,
        dagId: pipeline?.dag_id,
        taskName: pipeline?.task_name,
        latestStatusLabel: pipeline?.latest_status_label,
        lastError: pipeline?.last_error,
        lastSuccessAt: pipeline?.last_success_at,
        dqScore,
        failedRules: summary.dq.failed_rules,
        sourceType: summary.incident_prefill.source_type,
        sourceRefId: summary.incident_prefill.source_ref_id,
        origin:
          typeof summary.incident_prefill.evidence_json?.origin === "string"
            ? String(summary.incident_prefill.evidence_json.origin)
            : "explorer_ingestion",
        operationalSlaDueAt: summary.operational_sla?.due_at ?? null,
        recurrentDegradation: summary.operational_sla?.recurrent_degradation,
      })
    : `${summary.operational_context?.links.incidents || `/incidents/tickets?tableId=${summary.table_id}`}&create=1`;

  const operationalLabel =
    pipeline?.latest_status_label || (summary.signals.stale_pipeline ? "Sem sucesso recente" : "Sem status operacional");
  const governanceOpsHref = "/governance/pending-center?origin=operations";
  const governanceImpactSummary = summary.signals.operational_failure || summary.signals.stale_pipeline
    ? summary.signals.open_incident || summary.signals.dq_below_threshold
      ? "Este ativo já cruza operação com governança: entra em pendências operacionais, pode puxar campanhas automáticas e merece revisão coordenada com DQ e incidentes."
      : "A situação operacional já entra na central de pendências com origem Operação e ajuda a antecipar saneamento antes de virar incidente maior."
    : "Sem impacto operacional crítico em governança neste momento.";

  return (
    <div className="rounded-3xl border border-border/80 bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_55%,#eef6ff_100%)] p-5 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Correlação entre módulos</p>
          <div>
            <h5 className="text-base font-semibold text-text">{title}</h5>
            <p className="mt-1 max-w-3xl text-sm text-text-body">{subtitle || correlationSummary}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {summary.incidents.open_count > 0 ? (
            <Badge tone={summary.incidents.critical_open_count > 0 ? "warning" : "neutral"}>
              {summary.incidents.open_count} incidente(s) aberto(s)
            </Badge>
          ) : null}
          {dqScore !== null ? (
            <Badge tone={summary.signals.dq_below_threshold ? "warning" : "success"}>DQ {dqScore.toFixed(0)} pts</Badge>
          ) : null}
          <Badge tone={summary.signals.operational_failure || summary.signals.stale_pipeline ? "warning" : "success"}>
            {operationalLabel}
          </Badge>
          {summary.operational_sla ? <Badge tone="neutral">{summary.operational_sla.status_label}</Badge> : null}
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-border/80 bg-surface p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Motivo principal</p>
            <p className="mt-2 text-sm font-medium text-text">{summary.summary || summary.signals.summary}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Erro resumido</p>
            <p className="mt-2 text-sm font-medium text-text">{pipeline?.last_error || summary.operational_sla?.issue_label || "Sem erro destacado"}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Aging</p>
            <p className="mt-2 text-sm font-medium text-text">
              {summary.operational_sla ? `${summary.operational_sla.aging_hours}h` : "Não informado"}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Ação recomendada</p>
            <p className="mt-2 text-sm font-medium text-text">
              {summary.signals.operational_failure || summary.signals.stale_pipeline ? "Priorizar investigação operacional" : "Manter acompanhamento"}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-border/80 bg-surface p-4 shadow-sm">
          <div className="flex items-start gap-2">
            <Workflow className="mt-0.5 h-4 w-4 text-brand-700" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-text">{pipeline?.pipeline_name || "Pipeline sem nome"}</p>
              <p className="mt-1 text-sm text-text-body">
                {pipeline ? `DAG ${pipeline.dag_id || "-"} · task ${pipeline.task_name || "-"}` : "Sem pipeline mapeado"}
              </p>
              {summary.operational_sla ? (
                <p className="mt-2 text-xs text-muted">
                  {summary.operational_sla.issue_label} · aging {summary.operational_sla.aging_hours}h
                  {summary.operational_sla.due_at ? ` · vence em ${formatDateTime(summary.operational_sla.due_at)}` : ""}
                  {summary.operational_sla.recurrent_degradation ? " · degradação recorrente" : ""}
                </p>
              ) : null}
              {stability ? (
                <p className="mt-2 text-xs text-muted">
                  Estabilidade recente: {stability.success_rate_pct.toFixed(1)}% de sucesso em {stability.window_runs} execução(ões)
                  {stability.recurrent_degradation ? " · tendência de degradação recorrente" : ""}
                </p>
              ) : null}
              {governanceTrend ? (
                <p className="mt-2 text-xs text-muted">
                  Governança {governanceTrend.label.toLowerCase()} · {governanceTrend.current_score} pts
                  {governanceTrend.delta !== 0 ? ` · variação ${governanceTrend.delta > 0 ? "+" : ""}${governanceTrend.delta} pts` : " · sem variação relevante"}
                </p>
              ) : null}
              {pipeline?.last_error ? <p className="mt-2 text-xs text-danger-700">{pipeline.last_error}</p> : null}
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Última atualização</p>
              <p className="mt-2 text-sm font-medium text-text">
                {pipeline?.last_execution_finished_at || pipeline?.last_execution_started_at
                  ? formatDateTime(pipeline.last_execution_finished_at || pipeline.last_execution_started_at || "")
                  : "Não disponível"}
              </p>
            </div>
            <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Último sucesso</p>
              <p className="mt-2 text-sm font-medium text-text">
                {pipeline?.last_success_at ? formatDateTime(pipeline.last_success_at) : "Não disponível"}
              </p>
            </div>
            <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Status atual</p>
              <p className="mt-2 text-sm font-medium text-text">{operationalLabel}</p>
            </div>
            <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">DAG responsável</p>
              <p className="mt-2 text-sm font-medium text-text">{pipeline?.dag_id || "Não informada"}</p>
            </div>
            <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Task principal</p>
              <p className="mt-2 text-sm font-medium text-text">{pipeline?.task_name || "Não informada"}</p>
            </div>
            <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Watermark</p>
              <p className="mt-2 text-sm font-medium text-text">{pipeline?.watermark_value || "Não informado"}</p>
            </div>
            <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-3 sm:col-span-2 xl:col-span-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Volume processado</p>
              <p className="mt-2 text-sm font-medium text-text">{formatCompactNumber(pipeline?.rows_processed)}</p>
            </div>
            {stability?.points?.length ? (
              <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-3 sm:col-span-2 xl:col-span-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Tendência operacional recente</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {stability.points.slice(0, 8).map((point) => (
                    <Badge key={point.execution_id} tone={point.success ? "success" : "warning"}>
                      {point.status_label}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}
            {governanceTrend?.history?.length ? (
              <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-3 sm:col-span-2 xl:col-span-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Tendência de governança</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {governanceTrend.history.slice(-8).map((point) => (
                    <Badge key={point.bucket_date} tone={point.tone === "success" ? "success" : point.tone === "warning" ? "warning" : point.tone === "accent" ? "accent" : "neutral"}>
                      {new Date(point.bucket_date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} · {point.score} pts
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
        <div className="rounded-2xl border border-border/80 bg-surface p-4 shadow-sm">
          <p className="text-sm font-semibold text-text">Regras correlacionadas de DQ</p>
          {summary.dq.correlated_rules.length ? (
            <div className="mt-3 space-y-2">
              {summary.dq.correlated_rules.slice(0, 2).map((rule) => (
                <div className="rounded-xl border border-border/80 bg-bg-subtle/80 p-3" key={rule.id}>
                  <p className="text-xs font-semibold text-text">{rule.name}</p>
                  <p className="mt-1 text-[11px] text-muted">
                    {rule.last_violations_count} violação(ões) · {rule.severity.toUpperCase()}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-border/80 bg-bg-subtle/80 p-3 text-sm text-text-body">
              <AlertTriangle className="mt-0.5 h-4 w-4 text-muted" />
              <span>Não há regra específica correlacionada automaticamente com evidência suficiente neste momento.</span>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-border/80 bg-surface p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-text">Impacto em governança</p>
            <p className="mt-1 text-sm text-text-body">{governanceImpactSummary}</p>
          </div>
          <Badge tone={summary.signals.operational_failure || summary.signals.stale_pipeline ? "warning" : "neutral"}>
            {summary.signals.operational_failure || summary.signals.stale_pipeline ? "Operação em atenção" : "Sem impacto crítico"}
          </Badge>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {summary.operational_context ? (
          <Button asChild size="sm" variant="outline">
            <Link href={summary.operational_context.links.incidents}>Ver incidentes do ativo</Link>
          </Button>
        ) : null}
        <Button asChild size="sm" variant="outline">
          <Link href={createHref}>Abrir incidente contextual</Link>
        </Button>
        {onAutoOpenIncident ? (
          <Button disabled={autoOpening} onClick={onAutoOpenIncident} size="sm" variant="outline">
            {autoOpening ? "Abrindo..." : "Abrir incidente automaticamente"}
          </Button>
        ) : null}
        {summary.operational_context ? (
          <Button asChild size="sm" variant="outline">
            <Link href={summary.operational_context.links.data_quality}>Ver impacto em DQ</Link>
          </Button>
        ) : null}
        {pipeline?.pipeline_history_href ? (
          <Button asChild size="sm" variant="outline">
            <Link href={pipeline.pipeline_history_href}>Ver histórico operacional</Link>
          </Button>
        ) : null}
        {pipeline?.airflow_dag_href ? (
          <Button asChild size="sm" variant="outline">
            <Link href={pipeline.airflow_dag_href} rel="noreferrer" target="_blank">Abrir DAG no Airflow</Link>
          </Button>
        ) : null}
        {pipeline?.airflow_task_href ? (
          <Button asChild size="sm" variant="outline">
            <Link href={pipeline.airflow_task_href} rel="noreferrer" target="_blank">Abrir task no Airflow</Link>
          </Button>
        ) : null}
        {onOpenLogs ? (
          <Button onClick={onOpenLogs} size="sm" variant="outline">
            {openLogsLabel}
          </Button>
        ) : null}
        {onRerunProfiling ? (
          <Button disabled={profilingRerunLoading} onClick={onRerunProfiling} size="sm" variant="outline">
            {profilingRerunLoading ? "Reexecutando..." : "Reexecutar profiling DQ"}
          </Button>
        ) : null}
        <Button asChild size="sm" variant="outline">
          <Link href={`/explorer?tableId=${summary.table_id}&tab=lineage`}>Ver dependências e linhagem</Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href={governanceOpsHref}>Ver pendências operacionais</Link>
        </Button>
      </div>
    </div>
  );
}
