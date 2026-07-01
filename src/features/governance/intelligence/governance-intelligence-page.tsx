import { Link } from "@/lib/next-shims";
import { useEffect } from "react";
import { ArrowRight, BarChart3, RefreshCcw, Sparkles } from "lucide-react";

import { ContextualJourneyCard } from "@/components/navigation/contextual-journey-card";
import { Badge } from "@/components/ui/badge";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateTime } from "@/features/dashboard/components/shared";
import { formatCompactNumber } from "@/features/explorer/utils";
import { trackPlatformEvent } from "@/features/platform/client";

import { ActionTracks } from "./components/action-tracks";
import { AssetRiskList } from "./components/asset-risk-list";
import { AttentionNow } from "./components/attention-now";
import { DomainRisk } from "./components/domain-risk";
import { IntelligentTimeline } from "./components/intelligent-timeline";
import { NextBestActions } from "./components/next-best-actions";
import { asTone } from "./types";
import { useIntelligenceFeed } from "./use-intelligence-feed";
import { useIntelligenceTimeline } from "./use-intelligence-timeline";

const JOURNEY_LINKS = [
  {
    label: "Explorer",
    href: "/explorer",
    description: "Abrir a visão principal de ativos e seguir para detalhe, Jornada, qualidade e consumo.",
    tone: "accent" as const,
  },
  {
    label: "Cockpit operacional",
    href: "/ops/cockpit",
    description: "Acompanhar jobs, falhas, ingestão e read models atualizados.",
    tone: "warning" as const,
  },
  {
    label: "Pendências",
    href: "/governance/pending-center",
    description: "Priorizar owner, classificação, qualidade e operação em aberto.",
    tone: "warning" as const,
  },
  {
    label: "Privacidade & Acesso",
    href: "/privacy-access",
    description: "Classificar dados sensíveis e revisar acessos.",
    tone: "neutral" as const,
  },
];

export function GovernanceIntelligencePage() {
  const { data, isLoading, error, refetch } = useIntelligenceFeed();
  const timeline = useIntelligenceTimeline();

  useEffect(() => {
    void trackPlatformEvent({
      event_name: "page_view",
      module_name: "governance_intelligence",
      page_path: "/governance/intelligence",
    });
  }, []);

  const kpis = data?.kpis ?? [];

  return (
    <div className="space-y-6 pb-6">
      <Card className="border-border bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_46%,#eef6ff_100%)] shadow-[0_18px_48px_rgba(15,23,42,0.06)]">
        <CardContent className="space-y-5 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-surface px-3 py-1 text-xs font-medium text-brand-700">
                <Sparkles className="h-3.5 w-3.5" />
                Inteligência operacional de dados
              </div>
              <div>
                <h2 className="text-3xl font-semibold tracking-tight text-text">Central de Decisão de Governança</h2>
                <p className="mt-2 max-w-4xl text-sm leading-7 text-text-body">
                  Diagnóstico, priorização e próxima melhor ação cruzando catálogo, qualidade, owners, privacidade,
                  linhagem, incidentes e consumo. Tabelas usadas em dashboards do Metabase entram como prioridade.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                <span className="rounded-full border border-border bg-surface px-2.5 py-1">
                  {data ? `${formatCompactNumber(data.total_assets)} ativos monitorados` : "Ativos: —"}
                </span>
                {data && data.metabase_priority_count > 0 ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-accent-200 bg-surface px-2.5 py-1 text-accent-700">
                    <BarChart3 className="h-3.5 w-3.5" />
                    {data.metabase_priority_count} no topo por uso no Metabase
                  </span>
                ) : null}
                {data?.generated_at ? (
                  <span className="rounded-full border border-border bg-surface px-2.5 py-1">
                    Atualizado {formatDateTime(data.generated_at)}
                  </span>
                ) : null}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button disabled={isLoading} onClick={() => void refetch()} size="sm" variant="outline">
                <RefreshCcw className="mr-2 h-4 w-4" />
                Recarregar
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href="/governance/pending-center">
                  Ver pendências
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>

          {error ? (
            <Banner
              description="Não foi possível carregar a inteligência de governança agora. Os atalhos abaixo continuam disponíveis."
              icon={<RefreshCcw className="h-4 w-4" />}
              tone="warning"
              title="Inteligência indisponível"
            />
          ) : null}

          {kpis.length ? (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {kpis.slice(0, 5).map((kpi) => (
                <div className="rounded-2xl border border-border bg-surface px-3 py-2.5" key={kpi.key}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-xs text-muted">{kpi.label}</p>
                    <Badge tone={asTone(kpi.tone)}>
                      {formatCompactNumber(Number(kpi.value) || 0)}
                      {kpi.unit ? ` ${kpi.unit}` : ""}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {!error ? (
        <>
          <AttentionNow items={data?.attention_now ?? []} loading={isLoading} />

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <AssetRiskList items={data?.asset_risk ?? []} loading={isLoading} />
            </div>
            <div className="space-y-6">
              <NextBestActions items={data?.next_best_actions ?? []} loading={isLoading} />
              <DomainRisk items={data?.by_domain ?? []} loading={isLoading} />
            </div>
          </div>

          <ActionTracks items={data?.tracks ?? []} loading={isLoading} />

          {!timeline.error ? (
            <IntelligentTimeline episodes={timeline.data?.episodes ?? []} loading={timeline.isLoading} />
          ) : null}
        </>
      ) : null}

      <ContextualJourneyCard
        description="Atalhos de apoio para abrir rapidamente os hubs relacionados a risco, governança e operação."
        links={JOURNEY_LINKS}
        title="Atalhos de apoio"
        eyebrow="Navegação"
      />
    </div>
  );
}
