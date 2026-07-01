import { Link } from "@/lib/next-shims";
import { ArrowRight, CircleAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";

import type { DQPlatformScorecardSummary } from "../types";

type Props = {
  summary: DQPlatformScorecardSummary | null;
  loading: boolean;
  error: string;
  compact?: boolean;
  title?: string;
  description?: string;
};

function metricTone(score: number | null | undefined): "success" | "accent" | "warning" | "neutral" | "danger" {
  if (score === null || score === undefined) return "neutral";
  if (score >= 90) return "success";
  if (score >= 75) return "accent";
  if (score >= 60) return "warning";
  return "danger";
}

export function DQPlatformScorecard({
  summary,
  loading,
  error,
  compact = false,
  title = "Qualidade e mudança",
  description = "Resumo transversal da cobertura de regras, contratos validados e ativos que precisam de atenção.",
}: Props) {
  if (loading && !summary) {
    return <Skeleton className={cn("h-64 w-full rounded-3xl", compact && "h-56")} />;
  }

  if (!loading && error && !summary) {
    return (
      <Banner description={error} icon={<CircleAlert className="h-4 w-4" />} tone="warning" title="Scorecard indisponível" />
    );
  }

  if (!summary) {
    return <EmptyState title="Sem scorecard disponível" description="Não foi possível consolidar a leitura transversal agora. Tente novamente em alguns instantes." />;
  }

  const topDomains = summary.by_domain.slice(0, compact ? 3 : 4);
  const topRules = summary.failing_rules.slice(0, compact ? 3 : 4);
  const topRisks = summary.top_risks.slice(0, compact ? 4 : 6);
  return (
    <Card className="overflow-hidden border-border/80 bg-surface shadow-card">
      <CardHeader className="border-b border-border/60 bg-gradient-to-r from-slate-50 via-white to-accent-50 px-5 py-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Pilar transversal</p>
            <h3 className="text-lg font-semibold text-text">{title}</h3>
            <p className="max-w-3xl text-sm text-text-body">{description}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone={metricTone(summary.totals.avg_dq_score)} className="border">
              Pontuação média {summary.totals.avg_dq_score !== null ? summary.totals.avg_dq_score.toFixed(1) : "—"}
            </Badge>
            <Badge tone={summary.totals.contract_coverage_pct !== null && summary.totals.contract_coverage_pct >= 80 ? "success" : "warning"} className="border">
              Contratos validados {summary.totals.contract_coverage_pct !== null ? `${summary.totals.contract_coverage_pct.toFixed(1)}%` : "—"}
            </Badge>
            <Badge tone={summary.totals.tables_without_rules > 0 ? "warning" : "success"} className="border">
              {summary.totals.tables_without_rules} sem regra
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 p-5">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Cobertura de regras</p>
            <p className="mt-2 text-2xl font-semibold text-text">{summary.totals.tables_with_rules}/{summary.totals.tables}</p>
            <p className="mt-1 text-sm text-text-body">{summary.totals.active_rules} regras ativas sobre o total de tabelas monitoradas</p>
          </div>
          <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Score médio</p>
            <p className="mt-2 text-2xl font-semibold text-text">{summary.totals.avg_dq_score !== null ? summary.totals.avg_dq_score.toFixed(1) : "—"}</p>
            <p className="mt-1 text-sm text-text-body">Leitura agregada para comparar saúde entre domínios e identificar queda de qualidade</p>
          </div>
          <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Contratos validados</p>
            <p className="mt-2 text-2xl font-semibold text-text">{summary.totals.contracts_with_validation}</p>
            <p className="mt-1 text-sm text-text-body">{summary.totals.breaking_contracts} com quebra · {summary.totals.warning_contracts} com atenção na validação recente</p>
          </div>
          <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Ativos em risco</p>
            <p className="mt-2 text-2xl font-semibold text-text">{summary.totals.high_risk_tables}</p>
            <p className="mt-1 text-sm text-text-body">Ativos com score baixo, falhas ou contrato pedindo ação imediata</p>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge tone="neutral" className="border">
                Domínios com cobertura: {summary.by_domain.length}
              </Badge>
              <Badge tone={summary.totals.critical_tables_without_rules > 0 ? "danger" : "success"} className="border">
                {summary.totals.critical_tables_without_rules} críticos sem regra
              </Badge>
              <Badge tone={summary.totals.sensitive_tables_without_rules > 0 ? "warning" : "success"} className="border">
                {summary.totals.sensitive_tables_without_rules} sensíveis sem regra
              </Badge>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {topDomains.map((item) => (
                <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4" key={item.key}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-text">{item.label}</p>
                      <p className="mt-1 text-xs text-muted">
                        {item.count} ativo(s) · {item.rules_coverage_pct !== null ? `${item.rules_coverage_pct.toFixed(1)}% de cobertura` : "Sem cobertura calculada"}
                      </p>
                    </div>
                    <Badge tone={item.tone as "neutral" | "accent" | "success" | "warning" | "danger"}>{item.avg_dq_score !== null ? item.avg_dq_score.toFixed(1) : "—"}</Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full border border-border bg-surface px-2.5 py-1 text-text-body">{item.tables_without_rules} sem regra</span>
                    <span className="rounded-full border border-border bg-surface px-2.5 py-1 text-text-body">{item.contract_breaking} contratos quebrados</span>
                    <span className="rounded-full border border-border bg-surface px-2.5 py-1 text-text-body">{item.open_incidents} incidente(s)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-border/80 bg-surface p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Regras com falha</p>
                  <h4 className="mt-1 text-sm font-semibold text-text">Últimos problemas detectados</h4>
                  <p className="mt-1 text-xs text-muted">Essas regras apontam onde houve quebra recente e ajudam a iniciar a investigação.</p>
                </div>
                <Badge tone="neutral">{topRules.length}</Badge>
              </div>
              <div className="mt-3 space-y-2">
                {topRules.length ? (
                  topRules.map((rule) => (
                    <div className="rounded-xl border border-border bg-bg-subtle/80 p-3" key={rule.key}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-text">{rule.name}</p>
                          <p className="mt-0.5 text-xs text-muted">{rule.table_fqn}</p>
                        </div>
                        <Badge tone={rule.tone as "neutral" | "accent" | "success" | "warning" | "danger"}>{rule.violations_count}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted">
                        {rule.severity} · {rule.status}{rule.last_run_at ? ` · ${new Date(rule.last_run_at).toLocaleString("pt-BR")}` : ""}
                      </p>
                    </div>
                  ))
                ) : (
                    <EmptyState title="Sem falhas recentes" description="As regras ativas não registraram falhas recentes no recorte atual. Ainda assim, vale revisar a cobertura das regras críticas." />
                  )}
                </div>
              </div>

            {!compact ? (
              <div className="rounded-2xl border border-border/80 bg-surface p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Ativos em risco</p>
                    <h4 className="mt-1 text-sm font-semibold text-text">Prioridade para ação</h4>
                    <p className="mt-1 text-xs text-muted">Tabelas que precisam de atenção porque combinam score baixo, falha ou contrato com problema.</p>
                  </div>
                  <Badge tone="neutral">{topRisks.length}</Badge>
                </div>
                <div className="mt-3 space-y-2">
                  {topRisks.map((asset) => (
                    <div className="rounded-xl border border-border bg-bg-subtle/80 p-3" key={asset.table_id}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-text">{asset.table_name}</p>
                          <p className="mt-0.5 text-xs text-muted">{asset.domain_name || "Sem domínio"} · {asset.owner_name || "Sem owner"}</p>
                        </div>
                        <Badge tone={asset.dq_score !== null && asset.dq_score >= 90 ? "success" : asset.dq_score !== null && asset.dq_score >= 70 ? "warning" : "danger"}>
                          DQ {asset.dq_score !== null ? asset.dq_score.toFixed(1) : "—"}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted">
                        {asset.reasons.join(" · ") || "Sem risco explícito"} · {asset.contract_validation_status || asset.contract_status || "Sem contrato"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href="/data-quality/rules">
              Catálogo de regras
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/governance/pending-center">
              Revisar governança
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/data-quality">
              Abrir Data Quality
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
