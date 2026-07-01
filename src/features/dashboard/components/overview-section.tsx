import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { KpiCard, DonutChart, MiniBarList, ProgressRow, SectionTitle } from "@/features/dashboard/components/shared";
import type { DashboardSummary } from "@/features/dashboard/types";

type DashboardOverviewSectionProps = {
  summary: DashboardSummary;
};

export function DashboardOverviewSection({ summary }: DashboardOverviewSectionProps) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summary.kpis.map((item) => (
          <KpiCard item={item} key={item.key} />
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-border/90 bg-surface shadow-[0_14px_36px_rgba(15,23,42,0.05)]">
          <CardHeader>
            <SectionTitle
              eyebrow="Certificação"
              title="Panorama de certificação"
              description="Distribuição por status, criticidade e selos para entender rapidamente o que está pronto, em revisão e sob risco."
            />
          </CardHeader>
          <CardContent className="space-y-6">
            <DonutChart items={summary.certification.by_status} />
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-3xl border border-border bg-bg-subtle/70 p-4">
                <p className="text-sm font-semibold text-text">Por criticidade</p>
                <p className="mt-1 text-sm text-text-body">Onde estão os ativos mais sensíveis do catálogo.</p>
                <div className="mt-4">
                  <MiniBarList items={summary.certification.by_criticality} />
                </div>
              </div>
              <div className="rounded-3xl border border-border bg-bg-subtle/70 p-4">
                <p className="text-sm font-semibold text-text">Subselos aplicados</p>
                <p className="mt-1 text-sm text-text-body">Leitura rápida sobre uso interno, oficial e dados sensíveis.</p>
                <div className="mt-4">
                  <MiniBarList items={summary.certification.by_badge} />
                </div>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-success-200 bg-success-50/70 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-success-700">Elegíveis</p>
                <p className="mt-3 text-3xl font-semibold tracking-tight text-text">{summary.certification.eligible_tables}</p>
                <p className="mt-1 text-sm text-text-body">Ativos com cobertura suficiente para certificação.</p>
              </div>
              <div className="rounded-2xl border border-danger-200 bg-danger-50/70 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-danger-700">Pendências críticas</p>
                <p className="mt-3 text-3xl font-semibold tracking-tight text-text">{summary.certification.pending_critical}</p>
                <p className="mt-1 text-sm text-text-body">Ativos ainda não certificados com incidente crítico em aberto.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/90 bg-surface shadow-[0_14px_36px_rgba(15,23,42,0.05)]">
          <CardHeader>
            <SectionTitle
              eyebrow="Governança"
              title="Cobertura de governança"
              description="Percentual de ativos com responsável, dicionário, tags, termos, classificação e revisão recente."
            />
          </CardHeader>
          <CardContent className="space-y-4">
            {summary.governance.coverage.map((item) => (
              <ProgressRow item={item} key={item.key} />
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
