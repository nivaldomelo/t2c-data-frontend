import { Link } from "@/lib/next-shims";

import { Badge } from "@/components/ui/badge";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { TrendChart, formatDateTime } from "@/features/dashboard/components/shared";
import type { ExecutiveOperationalIntelligence, ExecutiveOperationalIntelligenceItem } from "@/features/dashboard/types";
import { formatCompactNumber } from "@/features/explorer/utils";

type Props = {
  intelligence: ExecutiveOperationalIntelligence | null;
  loading: boolean;
  error?: string;
};

function sectionCardClassName() {
  return "border-border/80 bg-surface shadow-card";
}

function riskToneToBadgeTone(tone: string): "success" | "accent" | "warning" | "danger" | "neutral" {
  if (tone === "danger") return "danger";
  if (tone === "warning") return "warning";
  if (tone === "accent") return "accent";
  if (tone === "success") return "success";
  return "neutral";
}

function rankLabel(index: number) {
  return index === 0 ? "Prioridade máxima" : index === 1 ? "Alta prioridade" : index === 2 ? "Atenção" : "Em observação";
}

function IntelligenceList({
  title,
  description,
  items,
  emptyText,
}: {
  title: string;
  description: string;
  items: ExecutiveOperationalIntelligenceItem[];
  emptyText: string;
}) {
  return (
    <Card className={sectionCardClassName()}>
      <CardContent className="space-y-4 p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Ranking automático</p>
          <h3 className="mt-2 text-lg font-semibold text-text">{title}</h3>
          <p className="mt-1 text-sm text-text-body">{description}</p>
        </div>
        {items.length ? (
          <div className="space-y-3">
            {items.map((item, index) => (
              <div className="rounded-2xl border border-border bg-bg-subtle/80 p-4" key={item.key}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={riskToneToBadgeTone(item.risk_tone)}>{rankLabel(index)}</Badge>
                      <p className="truncate font-medium text-text">{item.label}</p>
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      {item.entity_kind} · {formatCompactNumber(item.asset_count)} ativo(s) · {formatCompactNumber(item.open_incidents)} incidente(s) aberto(s)
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge tone={riskToneToBadgeTone(item.risk_tone)} className="mb-1">
                      {item.priority_score} pts
                    </Badge>
                    <p className="text-xs text-muted">Risco base {item.score} · {item.search_clicks_30d} acessos</p>
                  </div>
                </div>
                {item.reasons.length ? (
                  <ul className="mt-3 space-y-1 text-xs leading-5 text-text-body">
                    {item.reasons.slice(0, 3).map((reason) => (
                      <li className="flex gap-2" key={reason}>
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-slate-400" />
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button asChild size="sm" variant="outline">
                    <Link href={item.href}>Abrir detalhe</Link>
                  </Button>
                  {item.table_id ? (
                    <Button asChild size="sm" variant="ghost">
                      <Link href={`/incidents/tickets?tableId=${item.table_id}&create=1`}>Abrir incidente</Link>
                    </Button>
                  ) : null}
                  {item.suggested_incident ? <Badge tone="danger">Incidente sugerido</Badge> : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-bg-subtle p-4 text-sm text-text-body">{emptyText}</div>
        )}
      </CardContent>
    </Card>
  );
}

export function OperationalIntelligencePanel({ intelligence, loading, error }: Props) {
  const current = intelligence;
  const ready = Boolean(current?.generated_at);

  if (loading && !ready) {
    return (
      <Card className="border-border/80 bg-surface shadow-card">
        <CardContent className="space-y-4 p-5">
          <div className="h-8 w-56 animate-pulse rounded-full bg-bg-subtle" />
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div className="h-24 animate-pulse rounded-2xl bg-bg-subtle" key={index} />
            ))}
          </div>
          <div className="h-64 animate-pulse rounded-3xl bg-bg-subtle" />
        </CardContent>
      </Card>
    );
  }

  if (!ready) {
    if (error) {
      return <EmptyState title="Inteligência operacional indisponível" description={error} />;
    }
    return <EmptyState title="Consolidando sinais de risco" description="A leitura secundária ainda está sendo carregada para montar a priorização automática." />;
  }

  if (error && !intelligence) {
    return <EmptyState title="Inteligência operacional indisponível" description={error} />;
  }

  if (!current) {
    return <EmptyState title="Consolidando sinais de risco" description="A leitura secundária ainda está sendo carregada para montar a priorização automática." />;
  }

  const updatedLabel = current.generated_at ? formatDateTime(current.generated_at) : "Em processamento";

  return (
    <Card className="overflow-hidden border-border/80 bg-surface shadow-card">
      <CardContent className="space-y-6 p-5 sm:p-6">
        <div className="flex flex-col gap-4 rounded-3xl border border-danger-200/60 bg-[linear-gradient(135deg,#fffdfa_0%,#fff5f6_46%,#ffffff_100%)] p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-danger-200 bg-surface px-3 py-1 text-xs font-medium text-danger-700">
                Inteligência operacional
              </div>
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-text">Onde agir antes da falha virar incidente</h2>
                <p className="mt-2 max-w-4xl text-sm leading-7 text-text-body">
                  A camada heurística combina falhas de DQ, incidentes recentes, ausência de sucesso recente, dependências críticas, consumo e mudanças para priorizar atenção.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge tone="danger">{formatCompactNumber(current.high_risk_assets)} ativos em risco alto</Badge>
              <Badge tone="warning">{formatCompactNumber(current.unstable_pipelines)} pipelines instáveis</Badge>
              <Badge tone="accent">{formatCompactNumber(current.deteriorating_assets)} ativos em deterioração</Badge>
              <Badge tone="neutral">{formatCompactNumber(current.suggested_incidents)} incidentes sugeridos</Badge>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline">
              <Link href="/incidents">Ver incidentes</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/ops/ingestion">Ver operações</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/data-quality">Abrir Data Quality</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/integrations/airflow">Abrir Airflow</Link>
            </Button>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {[
              ["Fila de atenção", current.priority_queue_size, "Itens que precisam de acompanhamento"],
              ["Domínios críticos", current.high_risk_domains, "Domínios com maior concentração de risco"],
              ["Produtos críticos", current.high_risk_products, "Produtos com risco e cobertura frágeis"],
              ["Recorrência", current.recurring_instability, "Sinais repetidos de instabilidade"],
            ].map(([label, value, hint]) => (
              <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm" key={String(label)}>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">{label}</p>
                <p className="mt-2 text-2xl font-semibold text-text">{formatCompactNumber(Number(value))}</p>
                <p className="mt-1 text-sm text-text-body">{String(hint)}</p>
              </div>
            ))}
          </div>
        </div>

        {error ? <Banner description={error} tone="warning" title="Inteligência operacional indisponível" /> : null}

        <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <Card className={sectionCardClassName()}>
            <CardContent className="space-y-4 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Tendência de risco</p>
                  <h3 className="mt-2 text-lg font-semibold text-text">Sinais combinados ao longo do tempo</h3>
                  <p className="mt-1 text-sm text-text-body">
                    A leitura soma incidentes, falhas de DQ e mudanças críticas para indicar deterioração antes do incidente grave.
                  </p>
                </div>
                <Badge tone="neutral">{current.window_days} dias</Badge>
              </div>
              <TrendChart points={current.trend} />
              <p className="text-xs leading-6 text-muted">
                Atualizado em {updatedLabel}. A linha mostra a densidade de sinais de risco, não uma previsão estatística.
              </p>
            </CardContent>
          </Card>

          <Card className={sectionCardClassName()}>
            <CardContent className="space-y-4 p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Alertas inteligentes</p>
                <h3 className="mt-2 text-lg font-semibold text-text">Situações para agir agora</h3>
                <p className="mt-1 text-sm text-text-body">Alertas gerados pelos sinais heurísticos da plataforma.</p>
              </div>
              {current.alerts.length ? (
                <div className="space-y-3">
                  {current.alerts.map((alert) => (
                    <div className="rounded-2xl border border-border bg-bg-subtle/80 p-4" key={alert.key}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge tone={riskToneToBadgeTone(alert.tone)}>{alert.severity}</Badge>
                            <p className="font-medium text-text">{alert.title}</p>
                          </div>
                          <p className="text-sm leading-6 text-text-body">{alert.description}</p>
                        </div>
                        {alert.suggested_incident ? <Badge tone="danger">Incidente sugerido</Badge> : null}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button asChild size="sm" variant="outline">
                          <Link href={alert.href}>Abrir contexto</Link>
                        </Button>
                        {alert.table_id ? (
                          <Button asChild size="sm" variant="ghost">
                            <Link href={`/incidents/tickets?tableId=${alert.table_id}&create=1`}>Abrir incidente</Link>
                          </Button>
                        ) : (
                          <Button asChild size="sm" variant="ghost">
                            <Link href="/incidents/tickets?create=1">Abrir incidente</Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-border bg-bg-subtle p-4 text-sm text-text-body">
                  Nenhum alerta acima do limiar. Isso indica que os sinais atuais estão abaixo do ponto de intervenção automática.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <IntelligenceList
            description="Ativos com maior combinação de falhas, incidentes, mudanças e impacto de consumo."
            emptyText="Sem ativos com prioridade suficiente."
            items={current.by_asset}
            title="Ranking por ativo"
          />
          <IntelligenceList
            description="Domínios com maior concentração de risco operacional e deterioração de confiança."
            emptyText="Sem domínios com risco suficiente."
            items={current.by_domain}
            title="Ranking por domínio"
          />
          <IntelligenceList
            description="Produtos de dados com baixo encadeamento, contratos frágeis ou cobertura insuficiente."
            emptyText="Sem produtos de dados com risco suficiente."
            items={current.by_product}
            title="Ranking por produto de dados"
          />
          <IntelligenceList
            description="Pipelines e DAGs com falhas, degradação ou ausência de sucesso recente."
            emptyText="Sem pipelines com risco suficiente."
            items={current.by_pipeline}
            title="Ranking por pipeline"
          />
        </div>
      </CardContent>
    </Card>
  );
}
