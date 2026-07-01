import { Link } from "@/lib/next-shims";
import { ArrowRight, ChartNoAxesCombined } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { DashboardCoverageAttentionSection } from "@/features/dashboard/components/coverage-attention-section";
import { DashboardOverviewSection } from "@/features/dashboard/components/overview-section";
import { DashboardQualityIncidentsSection } from "@/features/dashboard/components/quality-incidents-section";
import { DashboardLoadingState, formatDateTime } from "@/features/dashboard/components/shared";
import type { DashboardSummary } from "@/features/dashboard/types";

type DashboardViewProps = {
  summary: DashboardSummary | null;
  loading: boolean;
  error: string;
};

export function DashboardView({ summary, loading, error }: DashboardViewProps) {
  const generatedAt = summary ? formatDateTime(summary.generated_at) : "-";

  return (
    <div className="space-y-6 pb-6">
      <Card className="border-border/80 bg-gradient-to-br from-white via-slate-50 to-accent-50 shadow-[0_18px_48px_rgba(15,23,42,0.05)]">
        <CardContent className="space-y-6 p-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-info-200 bg-surface px-3 py-1 text-xs font-medium text-info-700">
                <ChartNoAxesCombined className="h-3.5 w-3.5" />
                Visão executiva e operacional
              </div>
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-text">Dashboard</h2>
                <p className="mt-2 max-w-3xl text-sm leading-7 text-text-body">
                  Um painel único para enxergar saúde, cobertura, risco e prioridades do ambiente de dados.
                  Reunimos certificação, governança, qualidade, documentação e operação em uma leitura rápida.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge tone="neutral">Atualizado em {generatedAt}</Badge>
              <Badge tone="accent">Resumo executivo</Badge>
              <Button asChild size="sm" variant="outline">
                <Link href="/explorer">
                  Abrir Explorer
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Governança</p>
              <p className="mt-3 text-2xl font-semibold text-text">Responsáveis, tags, termos e certificação</p>
              <p className="mt-1 text-sm text-text-body">Cobertura crítica para confiança e descoberta.</p>
            </div>
            <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Qualidade</p>
              <p className="mt-3 text-2xl font-semibold text-text">Saúde do ambiente em uma visão única</p>
              <p className="mt-1 text-sm text-text-body">Scores, atualização e lacunas de monitoramento lado a lado.</p>
            </div>
            <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Operação</p>
              <p className="mt-3 text-2xl font-semibold text-text">Fila priorizada do que precisa de atenção</p>
              <p className="mt-1 text-sm text-text-body">Incidentes, ativos reprovados e backlog de cobertura.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {error ? <p className="text-sm text-danger-700">{error}</p> : null}

      {loading ? (
        <DashboardLoadingState />
      ) : !summary ? (
        <EmptyState title="Sem dados para o dashboard" description="Não foi possível carregar a visão consolidada do ambiente." />
      ) : (
        <>
          <DashboardOverviewSection summary={summary} />
          <DashboardQualityIncidentsSection summary={summary} />
          <DashboardCoverageAttentionSection summary={summary} />
        </>
      )}
    </div>
  );
}
