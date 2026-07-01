import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateTime, MiniBarList, SectionTitle, TableList, TrendChart } from "@/features/dashboard/components/shared";
import type { DashboardSummary } from "@/features/dashboard/types";

type DashboardQualityIncidentsSectionProps = {
  summary: DashboardSummary;
};

export function DashboardQualityIncidentsSection({ summary }: DashboardQualityIncidentsSectionProps) {
  return (
    <>
      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="border-border/90 bg-surface shadow-[0_14px_36px_rgba(15,23,42,0.05)]">
          <CardHeader>
            <SectionTitle
              eyebrow="Qualidade de dados"
              title="Saúde geral da Qualidade de dados"
              description="Score médio, faixas de qualidade, atualização e evolução recente para entender os maiores riscos de confiabilidade."
            />
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-violet-200 bg-violet-50/60 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-700">Score médio</p>
                <p className="mt-3 text-3xl font-semibold tracking-tight text-text">{summary.dq.avg_score.toFixed(1)}</p>
              </div>
              <div className="rounded-2xl border border-warning-200 bg-warning-50/70 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-warning-700">Abaixo do mínimo</p>
                <p className="mt-3 text-3xl font-semibold tracking-tight text-text">{summary.dq.below_minimum}</p>
              </div>
              <div className="rounded-2xl border border-border bg-bg-subtle p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Sem métricas</p>
                <p className="mt-3 text-3xl font-semibold tracking-tight text-text">{summary.dq.without_metrics}</p>
              </div>
            </div>
            <TrendChart points={summary.dq.trend} />
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-3xl border border-border bg-bg-subtle/70 p-4">
                <p className="text-sm font-semibold text-text">Faixas de score</p>
                <p className="mt-1 text-sm text-text-body">Distribuição dos ativos monitorados por saúde atual.</p>
                <div className="mt-4">
                  <MiniBarList items={summary.dq.score_bands} />
                </div>
              </div>
              <div className="rounded-3xl border border-border bg-bg-subtle/70 p-4">
                <p className="text-sm font-semibold text-text">Freshness resumida</p>
                <p className="mt-1 text-sm text-text-body">Última janela de execução observada nas tabelas monitoradas.</p>
                <div className="mt-4">
                  <MiniBarList items={summary.dq.freshness_bands} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <TableList
          title="Piores tabelas por DQ"
          subtitle="Uma fila pronta para orientar correção, reexecução de regras ou reforço de responsabilidade."
          items={summary.dq.worst_tables}
          empty="Nenhuma tabela com score disponivel."
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="border-border/90 bg-surface shadow-[0_14px_36px_rgba(15,23,42,0.05)] xl:col-span-1">
          <CardHeader>
            <SectionTitle
              eyebrow="Incidentes"
              title="Operação e riscos abertos"
              description="Leitura de volume, criticidade e prioridades para o time reagir rápido."
            />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <div className="rounded-2xl border border-danger-200 bg-danger-50/70 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-danger-700">Abertos</p>
                <p className="mt-3 text-3xl font-semibold tracking-tight text-text">{summary.incidents.total_open}</p>
              </div>
              <div className="rounded-2xl border border-border bg-bg-subtle p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Tempo médio</p>
                <p className="mt-3 text-3xl font-semibold tracking-tight text-text">{summary.incidents.avg_open_age_hours.toFixed(1)}h</p>
              </div>
            </div>
            <div className="rounded-3xl border border-border bg-bg-subtle/70 p-4">
              <p className="text-sm font-semibold text-text">Por status</p>
              <div className="mt-4">
                <MiniBarList items={summary.incidents.by_status} />
              </div>
            </div>
            <div className="rounded-3xl border border-border bg-bg-subtle/70 p-4">
              <p className="text-sm font-semibold text-text">Por prioridade</p>
              <div className="mt-4">
                <MiniBarList items={summary.incidents.by_priority} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/90 bg-surface shadow-[0_14px_36px_rgba(15,23,42,0.05)] xl:col-span-2">
          <CardHeader>
            <SectionTitle
              eyebrow="Tickets"
              title="Itens que merecem atenção imediata"
              description="Incidentes mais relevantes do momento, combinando severidade, status e ativos afetados."
            />
          </CardHeader>
          <CardContent className="space-y-3">
            {!summary.incidents.top_items.length ? (
              <p className="text-sm text-muted">Não há incidentes relevantes para destacar agora.</p>
            ) : (
              summary.incidents.top_items.map((item) => (
                <div key={item.id} className="rounded-2xl border border-border bg-bg-subtle/70 px-4 py-3">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-text">{item.title}</p>
                      <p className="mt-1 truncate text-xs text-muted">{item.table_fqn || item.airflow_dag_id || item.entity_type}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge tone={item.severity === "sev1" ? "warning" : "neutral"}>{item.severity.toUpperCase()}</Badge>
                      <Badge tone={item.status === "open" ? "warning" : "neutral"}>{item.status}</Badge>
                      <Badge tone="neutral">{formatDateTime(item.detected_at)}</Badge>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
