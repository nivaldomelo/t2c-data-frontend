import { Link } from "@/lib/next-shims";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Search as SearchIcon, Workflow } from "lucide-react";

import { ContextualJourneyCard } from "@/components/navigation/contextual-journey-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/client-api";
import { useAuth } from "@/lib/auth";
import { platformSdk } from "@/features/platform/sdk";
import { listDataLakeConnections } from "@/features/integrations/sdk";
import { IntegrationMetricCard } from "@/features/integrations/components/integration-metric-card";
import type { AirflowIntegrationSummary, MetabaseIntegrationSummary } from "@/features/integrations/types";
import { formatStatusLabel, formatStatusTone } from "@/features/integrations/utils";

function sectionClassName() {
  return "border-border/80 bg-surface shadow-card";
}

export default function IntegrationsHubPage() {
  const [airflowSummary, setAirflowSummary] = useState<AirflowIntegrationSummary | null>(null);
  const [metabaseSummary, setMetabaseSummary] = useState<MetabaseIntegrationSummary | null>(null);
  const [supportedEventsTotal, setSupportedEventsTotal] = useState(0);
  const [apiKeysTotal, setApiKeysTotal] = useState(0);
  const [apiKeysHighRisk, setApiKeysHighRisk] = useState(0);
  const [dataLakeConnectionsTotal, setDataLakeConnectionsTotal] = useState(0);
  const [dataLakeConnectionsActive, setDataLakeConnectionsActive] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const auth = useAuth();
  const canAccessDataLake = auth.canAccessPath("/integrations/data-lake");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    void (async () => {
      const requests = [
        apiRequest<AirflowIntegrationSummary>("/v1/integrations/airflow/summary"),
        apiRequest<MetabaseIntegrationSummary>("/v1/integrations/metabase/summary"),
        platformSdk.listSupportedPlatformEvents(),
        platformSdk.listExternalApiKeys(),
      ] as const;
      const settled = await Promise.allSettled(requests);
      const [airflowResult, metabaseResult, eventsResult, apiKeysResult] = settled;
      let dataLakeConnections: Awaited<ReturnType<typeof listDataLakeConnections>> = [];
      let dataLakeError: unknown = null;
      if (canAccessDataLake) {
        try {
          dataLakeConnections = await listDataLakeConnections();
        } catch (err) {
          dataLakeError = err;
        }
      }

      if (cancelled) return;

      if (airflowResult.status === "fulfilled") {
        setAirflowSummary(airflowResult.value);
      }
      if (metabaseResult.status === "fulfilled") {
        setMetabaseSummary(metabaseResult.value);
      }
      if (eventsResult.status === "fulfilled") {
        setSupportedEventsTotal(eventsResult.value.total);
      }
      if (apiKeysResult.status === "fulfilled") {
        setApiKeysTotal(apiKeysResult.value.length);
        setApiKeysHighRisk(apiKeysResult.value.filter((item) => item.permission_summary.risk_level === "high").length);
      }
      if (canAccessDataLake) {
        setDataLakeConnectionsTotal(dataLakeConnections.length);
        setDataLakeConnectionsActive(dataLakeConnections.filter((item) => item.is_active).length);
      }

      let firstError: unknown = null;
      if (airflowResult.status === "rejected") {
        firstError = airflowResult.reason;
      } else if (metabaseResult.status === "rejected") {
        firstError = metabaseResult.reason;
      } else if (eventsResult.status === "rejected") {
        firstError = eventsResult.reason;
      } else if (apiKeysResult.status === "rejected") {
        firstError = apiKeysResult.reason;
      } else if (dataLakeError) {
        firstError = dataLakeError;
      }
      if (firstError) {
        setError(firstError instanceof Error ? firstError.message : "Não foi possível carregar o hub de integrações.");
      }
    })().finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [canAccessDataLake, reloadKey]);

  const integrationCards = useMemo(
    () => [
      {
        label: "Apache Airflow",
        value: formatStatusLabel(airflowSummary?.operational_status || airflowSummary?.integration_status),
        tone: formatStatusTone(airflowSummary?.operational_status || airflowSummary?.integration_status),
        hint: `${airflowSummary?.total_dags ?? 0} DAG(s) · ${airflowSummary?.failed_runs_24h ?? 0} falha(s) em 24h`,
        href: "/integrations/airflow",
      },
      {
        label: "Metabase",
        value: formatStatusLabel(metabaseSummary?.sync_status || metabaseSummary?.integration_status),
        tone: formatStatusTone(metabaseSummary?.sync_status || metabaseSummary?.integration_status),
        hint: `${metabaseSummary?.dashboards_count ?? 0} dashboards · ${metabaseSummary?.tables_with_consumption_count ?? 0} tabelas com consumo`,
        href: "/integrations/metabase",
      },
      {
        label: "API externa",
        value: `${apiKeysTotal}`,
        tone: apiKeysHighRisk > 0 ? ("warning" as const) : ("success" as const),
        hint: `${apiKeysHighRisk} chave(s) com risco alto`,
        href: "/integrations/api",
      },
    ],
    [
      airflowSummary?.failed_runs_24h,
      airflowSummary?.integration_status,
      airflowSummary?.operational_status,
      airflowSummary?.total_dags,
      apiKeysHighRisk,
      apiKeysTotal,
      canAccessDataLake,
      metabaseSummary?.dashboards_count,
      metabaseSummary?.integration_status,
      metabaseSummary?.sync_status,
      metabaseSummary?.tables_with_consumption_count,
      dataLakeConnectionsActive,
      dataLakeConnectionsTotal,
    ],
  );

  if (loading) {
    return (
      <div className="space-y-6 pb-6">
        <Skeleton className="h-36 w-full" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton className="h-28 w-full" key={index} />
          ))}
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          <Skeleton className="h-72 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6">
      <Card className="border-border/80 bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_55%,#eef6ff_100%)] shadow-card">
        <CardContent className="space-y-4 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-surface px-3 py-1 text-xs font-medium text-brand-700">
                <Workflow className="h-3.5 w-3.5" />
                Integrações e automação
              </div>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-text">Hub operacional de integrações</h2>
              <p className="mt-2 max-w-4xl text-sm leading-7 text-text-body">
                Acompanhe o estado, o impacto e o próximo passo para Airflow, Metabase, Data Lake e API externa em uma superfície única. O hub mostra saúde e atalhos de ação.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge tone="neutral">Eventos suportados: {supportedEventsTotal}</Badge>
              <Button onClick={() => setReloadKey((current) => current + 1)} size="sm" variant="outline">
                <SearchIcon className="mr-2 h-4 w-4" />
                Recarregar
              </Button>
            </div>
          </div>
          {error ? <div className="rounded-2xl border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700">{error}</div> : null}
        </CardContent>
      </Card>

      <ContextualJourneyCard
        description="Use esta página como o mapa de entrada das integrações. Cada atalho leva ao diagnóstico operacional ou ao console correspondente."
        links={[
          { label: "Apache Airflow", href: "/integrations/airflow", description: "Ver saúde da orquestração, causa provável e próxima ação.", tone: "accent" },
          { label: "Metabase", href: "/integrations/metabase", description: "Ver sync, erro recente e impacto no consumo analítico.", tone: "success" },
          { label: "Fontes de dados", href: "/datasources", description: "Conexões, scans, última leitura e próximos passos.", tone: "accent" },
          { label: "Data Lake", href: "/integrations/data-lake", description: "Conexões S3, freshness, drift e revisão operacional.", tone: "warning" },
          { label: "API externa", href: "/integrations/api", description: "Chaves, escopos por ação e risco operacional atual.", tone: "neutral" },
        ]}
        title="Atalhos da plataforma"
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {integrationCards.map((item) => (
          <IntegrationMetricCard className="min-h-[146px]" hint={item.hint} key={item.label} label={item.label} value={item.value} />
        ))}
        {canAccessDataLake ? (
          <IntegrationMetricCard
            className="min-h-[146px]"
            hint={`${dataLakeConnectionsActive} ativa(s) · ${dataLakeConnectionsTotal - dataLakeConnectionsActive} inativa(s)`}
            label="Data Lake"
            value={`${dataLakeConnectionsTotal}`}
          />
        ) : null}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className={sectionClassName()}>
          <CardContent className="space-y-4 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Troubleshooting</p>
                <h3 className="mt-1 text-lg font-semibold text-text">Estado operacional das integrações</h3>
              </div>
              <Badge tone="neutral">Visão consolidada</Badge>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-border bg-bg-subtle/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Airflow</p>
                <p className="mt-2 text-sm font-medium text-text">{formatStatusLabel(airflowSummary?.operational_status || airflowSummary?.integration_status)}</p>
                <p className="mt-1 text-sm text-text-body">{airflowSummary?.message || "Sem mensagem adicional."}</p>
              </div>
              <div className="rounded-2xl border border-border bg-bg-subtle/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Metabase</p>
                <p className="mt-2 text-sm font-medium text-text">{formatStatusLabel(metabaseSummary?.sync_status || metabaseSummary?.integration_status)}</p>
                <p className="mt-1 text-sm text-text-body">{metabaseSummary?.message || "Sem mensagem adicional."}</p>
              </div>
              <div className="rounded-2xl border border-border bg-bg-subtle/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">API externa</p>
                <p className="mt-2 text-sm font-medium text-text">{apiKeysTotal} chave(s)</p>
                <p className="mt-1 text-sm text-text-body">{apiKeysHighRisk} chaves com risco alto e atenção operacional.</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm" variant="outline">
                <Link href="/integrations/airflow">
                  Abrir Airflow
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href="/integrations/metabase">
                  Abrir Metabase
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href="/datasources">
                  Fontes de dados
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              {canAccessDataLake ? (
                <Button asChild size="sm" variant="outline">
                  <Link href="/integrations/data-lake">
                    Abrir Data Lake
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              ) : null}
              <Button asChild size="sm" variant="outline">
                <Link href="/integrations/api">
                  API externa
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className={sectionClassName()}>
          <CardContent className="space-y-4 p-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Conectores preparados</p>
              <h3 className="mt-1 text-lg font-semibold text-text">Base de extensão operacional</h3>
              <p className="mt-2 text-sm leading-6 text-text-body">
                A plataforma já possui eventos, contratos e canais oficiais para integrar sinais operacionais. Novos conectores podem reutilizar essa base sem inventar um modelo paralelo.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ["Slack", "Notificações e alertas operacionais."],
                ["Teams", "Ações de equipe e acompanhamento."],
                ["Jira", "Abertura e atualização de tickets."],
                ["Email", "Disparo formal para owners e stewards."],
              ].map(([label, description]) => (
                <div className="rounded-2xl border border-border bg-bg-subtle/80 p-4" key={label}>
                  <p className="font-medium text-text">{label}</p>
                  <p className="mt-1 text-sm text-text-body">{description}</p>
                  <Badge className="mt-3 border" tone="neutral">
                    Estrutura pronta
                  </Badge>
                </div>
              ))}
            </div>
            <div className="rounded-2xl border border-border/80 bg-surface p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Catálogo de eventos</p>
              <p className="mt-2 text-sm text-text-body">
                {supportedEventsTotal} evento(s) suportado(s), subscriptions versionadas e payloads de exemplo para testar integrações sem sair da plataforma.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
