import { Link } from "@/lib/next-shims";
import { ArrowRight, Sparkles } from "lucide-react";

import { ContextualJourneyCard } from "@/components/navigation/contextual-journey-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { TrendChart, formatDateTime, formatPercent } from "@/features/dashboard/components/shared";
import type { StrategicBenchmarkItem, StrategicMetric, StrategicRoadmapStage, StrategicSummary } from "@/features/dashboard/types";
import { cn } from "@/lib/cn";

type Props = {
  summary: StrategicSummary | null;
  loading: boolean;
  error: string;
  days: number;
  onDaysChange: (days: number) => void;
};

function sectionCardClassName() {
  return "border-border/80 bg-surface shadow-card";
}

function scoreTone(score: number) {
  if (score >= 85) return "success";
  if (score >= 70) return "accent";
  if (score >= 50) return "warning";
  return "danger";
}

function formatNumber(value: number, decimals = 1) {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: decimals,
    minimumFractionDigits: value % 1 === 0 ? 0 : decimals,
  }).format(value);
}

function deltaBadgeTone(metric: StrategicMetric): "success" | "accent" | "warning" | "danger" | "neutral" {
  if (metric.delta === 0) return "neutral";
  const improved = metric.reverse_trend ? metric.delta < 0 : metric.delta > 0;
  if (improved) return metric.tone === "danger" ? "warning" : "success";
  return metric.tone === "danger" ? "danger" : "warning";
}

function StrategicMetricCard({ metric }: { metric: StrategicMetric }) {
  const deltaTone = deltaBadgeTone(metric);
  const deltaLabel = metric.delta === 0 ? "Estável" : `${metric.reverse_trend ? (metric.delta < 0 ? "↓" : "↑") : metric.delta > 0 ? "↑" : "↓"} ${formatNumber(Math.abs(metric.delta))}${metric.unit ? ` ${metric.unit}` : ""}`;
  return (
    <Card className={sectionCardClassName()}>
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-text-body">{metric.label}</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-text">
              {formatNumber(metric.current)}
              {metric.unit ? <span className="ml-1 text-base font-medium text-muted">{metric.unit}</span> : null}
            </p>
          </div>
          <Badge tone={deltaTone}>{deltaLabel}</Badge>
        </div>
        <p className="text-sm text-text-body">{metric.hint || "Sem detalhe adicional."}</p>
        <div className="grid gap-2 rounded-2xl border border-border bg-bg-subtle/80 p-3 text-xs text-text-body sm:grid-cols-2">
          <p>Atual: {formatNumber(metric.current)}{metric.unit ? ` ${metric.unit}` : ""}</p>
          <p>Anterior: {formatNumber(metric.previous)}{metric.unit ? ` ${metric.unit}` : ""}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function BenchmarkList({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items: StrategicBenchmarkItem[];
}) {
  return (
    <Card className={sectionCardClassName()}>
      <CardContent className="space-y-4 p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Benchmark interno</p>
          <h3 className="mt-2 text-lg font-semibold text-text">{title}</h3>
          <p className="mt-1 text-sm text-text-body">{description}</p>
        </div>
        {items.length ? (
          <div className="space-y-3">
            {items.map((item) => (
              <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4" key={item.key}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-text">{item.label}</p>
                      <Badge tone={scoreTone(item.maturity_score)}>{item.maturity_label}</Badge>
                    </div>
                    <p className="text-xs text-muted">{item.asset_count} ativos · {item.open_incidents} incidentes abertos</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-text">Score {item.maturity_score.toFixed(1)}</p>
                    <p className="text-xs text-muted">DQ {item.quality_score.toFixed(1)} · Gov {item.governance_score.toFixed(1)} · Cobertura {item.coverage_score.toFixed(1)}</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {item.href ? (
                    <Button asChild size="sm" variant="outline">
                      <Link href={item.href}>
                        Abrir
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  ) : null}
                  {item.domain_href ? (
                    <Button asChild size="sm" variant="ghost">
                      <Link href={item.domain_href}>Ver domínio</Link>
                    </Button>
                  ) : null}
                  <Badge tone="neutral">Adoção {formatNumber(item.adoption_score)}</Badge>
                  <Badge tone="neutral">Confiabilidade {formatNumber(item.reliability_score)}</Badge>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-bg-subtle p-4 text-sm text-text-body">Sem dados suficientes para benchmark.</div>
        )}
      </CardContent>
    </Card>
  );
}

function RoadmapCard({ stage }: { stage: StrategicRoadmapStage }) {
  return (
    <Card className={cn(sectionCardClassName(), "h-full")}>
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">{stage.label}</p>
            <h3 className="mt-2 text-lg font-semibold text-text">{stage.minimum_score}+ pontos</h3>
          </div>
          <Badge tone={scoreTone(stage.minimum_score)}>{formatPercent(stage.current_pct)}</Badge>
        </div>
        <p className="text-sm leading-6 text-text-body">{stage.description}</p>
        <div className="space-y-2">
          {stage.criteria.map((criterion) => (
            <div className="rounded-2xl border border-border bg-bg-subtle/80 px-3 py-2 text-sm text-text-body" key={criterion}>
              {criterion}
            </div>
          ))}
        </div>
        <p className="text-xs text-muted">{stage.current_count} domínio(s) nesta etapa</p>
      </CardContent>
    </Card>
  );
}

export function PlatformStrategicReport({ summary, loading, error, days, onDaysChange }: Props) {
  if (loading && !summary) {
    return <div className="rounded-3xl border border-border/80 bg-surface p-6 shadow-card"><div className="h-64 animate-pulse rounded-3xl bg-bg-subtle" /></div>;
  }

  if (error && !summary) {
    return <EmptyState title="Relatório estratégico indisponível" description={error} />;
  }

  if (!summary) {
    return <EmptyState title="Sem relatório estratégico" description="Não foi possível consolidar a leitura estratégica agora." />;
  }

  return (
    <div className="space-y-6 pb-6">
      <Card className="border-border bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_55%,#eef6ff_100%)] shadow-[0_18px_48px_rgba(15,23,42,0.06)]">
        <CardContent className="space-y-5 p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-surface px-3 py-1 text-xs font-medium text-brand-700">
                <Sparkles className="h-3.5 w-3.5" />
                Camada estratégica
              </div>
              <div>
                <h2 className="text-3xl font-semibold tracking-tight text-text">Valor, adoção e maturidade por domínio</h2>
                <p className="mt-2 max-w-4xl text-sm leading-7 text-text-body">
                  O relatório consolida incidentes, qualidade, ownership, documentação, uso e benchmark interno para mostrar a evolução do produto como ativo estratégico da empresa.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge tone={scoreTone(summary.value_score)}>Valor {summary.value_score.toFixed(1)} pts</Badge>
              <Badge tone={summary.value_score_delta >= 0 ? "success" : "danger"}>{summary.value_score_delta >= 0 ? "↑" : "↓"} {Math.abs(summary.value_score_delta).toFixed(1)} pts</Badge>
              <Badge tone="neutral">Janela {summary.window_days} dias</Badge>
              <Badge tone="neutral">Atualizado em {formatDateTime(summary.generated_at)}</Badge>
            </div>
          </div>

          <ContextualJourneyCard
            title="Jornada estratégica"
            description="Use este relatório para explicar valor para liderança e abrir o contexto operacional quando precisar investigar um domínio, produto ou ativo."
            links={[
              { description: "Abrir o cockpit executivo da plataforma.", href: "/dashboard", label: "Dashboard executivo", tone: "accent" },
              { description: "Explorar domínios organizacionais.", href: "/governance/domains", label: "Domínios", tone: "neutral" },
              { description: "Abrir produtos de dados.", href: "/governance/data-products", label: "Produtos de dados", tone: "neutral" },
              { description: "Revisar qualidade e contratos.", href: "/data-quality", label: "Data Quality", tone: "success" },
              { description: "Abrir ativos e contexto técnico.", href: "/explorer", label: "Explorer", tone: "accent" },
              { description: "Investigar incidentes ou risco operacional.", href: "/incidents/tickets", label: "Incidentes", tone: "warning" },
            ]}
          />

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Janela</span>
            {[30, 90, 180].map((value) => (
              <Button key={value} onClick={() => onDaysChange(value)} size="sm" variant={value === days ? "default" : "outline"}>
                {value} dias
              </Button>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {summary.value_metrics.map((metric) => (
              <StrategicMetricCard key={metric.key} metric={metric} />
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className={sectionCardClassName()}>
          <CardContent className="space-y-5 p-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Tendência</p>
              <h3 className="mt-2 text-lg font-semibold text-text">Evolução da confiança</h3>
              <p className="mt-1 text-sm text-text-body">Acompanhe o comportamento do valor estratégico ao longo da janela selecionada.</p>
            </div>
            <TrendChart points={summary.reports.value_trend} />
          </CardContent>
        </Card>
        <Card className={sectionCardClassName()}>
          <CardContent className="space-y-5 p-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Tendência</p>
              <h3 className="mt-2 text-lg font-semibold text-text">Adoção e uso</h3>
              <p className="mt-1 text-sm text-text-body">Interações, buscas e consultas por dia dentro do período estratégico.</p>
            </div>
            <TrendChart points={summary.reports.adoption_trend} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className={sectionCardClassName()}>
          <CardContent className="space-y-4 p-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Narrativa</p>
              <h3 className="mt-2 text-lg font-semibold text-text">Leitura executiva</h3>
            </div>
            <div className="space-y-3">
              {summary.narrative.map((line) => (
                <div className="rounded-2xl border border-border bg-bg-subtle/80 p-4 text-sm leading-6 text-text-body" key={line}>
                  {line}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className={sectionCardClassName()}>
          <CardContent className="space-y-4 p-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Top usos</p>
              <h3 className="mt-2 text-lg font-semibold text-text">Usuários mais ativos</h3>
            </div>
            <div className="space-y-3">
              {summary.adoption.top_users.length ? (
                summary.adoption.top_users.map((item) => (
                  <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4" key={item.user_id}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-text">{item.label}</p>
                        <p className="text-xs text-muted">{item.usage_count} usos · {item.search_count} buscas</p>
                      </div>
                      <Badge tone="neutral">{item.total_count}</Badge>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-border bg-bg-subtle p-4 text-sm text-text-body">Sem atividade suficiente no período.</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <BenchmarkList
          description="Ranking de domínios para leitura executiva e benchmark."
          items={summary.benchmark.by_domain}
          title="Domínios"
        />
        <BenchmarkList
          description="Comparação de áreas organizacionais a partir dos responsáveis dos ativos."
          items={summary.benchmark.by_area}
          title="Áreas"
        />
        <BenchmarkList
          description="Benchmark dos produtos de dados já modelados na camada semântica."
          items={summary.benchmark.by_product}
          title="Produtos de dados"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <BenchmarkList
          description="Mapa de maturidade, confiabilidade e cobertura dos domínios."
          items={summary.reports.maturity_by_domain}
          title="Maturidade por domínio"
        />
        <BenchmarkList
          description="Domínios com melhor confiabilidade e menor concentração de risco."
          items={summary.reports.reliability_by_domain}
          title="Confiabilidade por domínio"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <BenchmarkList
          description="Revisão de qualidade, governança e cobertura documental."
          items={summary.reports.quality_by_domain}
          title="Qualidade por domínio"
        />
        <BenchmarkList
          description="Leitura de governança e cobertura operacional por domínio."
          items={summary.reports.governance_by_domain}
          title="Governança por domínio"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <BenchmarkList
          description="Cobertura de owner, documentação, tags, glossário e pipeline."
          items={summary.reports.coverage_by_domain}
          title="Cobertura operacional por domínio"
        />
        <Card className={sectionCardClassName()}>
          <CardContent className="space-y-4 p-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Adesão</p>
              <h3 className="mt-2 text-lg font-semibold text-text">Domínios, áreas e produtos mais consultados</h3>
            </div>
            <div className="grid gap-4">
              {[
                { title: "Domínios", items: summary.adoption.top_domains },
                { title: "Áreas", items: summary.adoption.top_areas },
                { title: "Produtos", items: summary.adoption.top_products },
              ].map((section) => (
                <div key={section.title} className="space-y-2 rounded-2xl border border-border bg-bg-subtle/80 p-4">
                  <p className="text-sm font-semibold text-text">{section.title}</p>
                  {section.items.length ? (
                    section.items.slice(0, 4).map((item) => (
                      <div className="flex items-center justify-between gap-3 text-sm text-text-body" key={item.key}>
                        <span className="truncate">{item.label}</span>
                        <span className="font-semibold text-text">{formatNumber(item.adoption_score)} pts</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-text-body">Sem dados suficientes.</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Roadmap de maturidade</p>
          <h3 className="mt-2 text-lg font-semibold text-text">Como a plataforma evolui de forma organizacional</h3>
        </div>
        <div className="grid gap-4 xl:grid-cols-5">
          {summary.roadmap.map((stage) => (
            <RoadmapCard key={stage.key} stage={stage} />
          ))}
        </div>
      </div>
    </div>
  );
}
