import { Link } from "@/lib/next-shims";
import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "@/lib/next-shims";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import type { ExecutiveCampaignQueue } from "@/features/dashboard/types";
import { formatDateTime } from "@/features/dashboard/components/shared";
import { trackPlatformEvent } from "@/features/platform/client";
import { useAuth } from "@/lib/auth";
import { downloadApiFile } from "@/lib/client-api";
import { useApiQuery } from "@/lib/use-api-query";

function buildQueryString(searchParams: URLSearchParams, page: number) {
  const params = new URLSearchParams(searchParams.toString());
  params.set("page", String(page));
  params.set("page_size", "25");
  return params.toString() ? `?${params.toString()}` : "";
}

export default function DashboardCampaignPage() {
  const auth = useAuth();
  const canExport = auth.hasPermission("governance:export");
  const params = useParams<{ campaignKey: string }>();
  const searchParams = useSearchParams();
  const [downloading, setDownloading] = useState<string | null>(null);
  const page = Number(searchParams.get("page") || "1") || 1;

  const queryString = useMemo(() => buildQueryString(searchParams, page), [searchParams, page]);
  const exportQuery = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    params.delete("page_size");
    const text = params.toString();
    return text ? `?${text}` : "";
  }, [searchParams]);

  useEffect(() => {
    void trackPlatformEvent({
      event_name: "page_view",
      module_name: "governance_campaign",
      page_path: `/dashboard/campaigns/${params.campaignKey}`,
      metadata: { campaign_key: params.campaignKey },
    });
  }, [params.campaignKey]);

  const { data: payload, isLoading: loading, error: queryError } = useApiQuery<ExecutiveCampaignQueue>(
    ["dashboard", "campaign", params.campaignKey, queryString],
    `/v1/dashboard/executive/campaigns/${params.campaignKey}/items${queryString}`,
  );
  const error = queryError?.message ?? "";

  async function download(href: string, filename: string) {
    setDownloading(filename);
    try {
      void trackPlatformEvent({
        event_name: "campaign_export",
        module_name: "governance_campaign",
        page_path: `/dashboard/campaigns/${params.campaignKey}`,
        target_url: href,
        metadata: { campaign_key: params.campaignKey, filename },
      });
      await downloadApiFile(`${href.replace(/^\/api/, "")}${exportQuery}`, filename, undefined, {
        confirmMessage: "Exportar esta campanha operacional (limite de 2.000 linhas)? A exportação será auditada.",
      });
    } finally {
      setDownloading(null);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="border-border bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_55%,#eef6ff_100%)] shadow-[0_18px_48px_rgba(15,23,42,0.06)]">
        <CardContent className="space-y-5 p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Campanha operacional</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-text">
                {payload?.campaign.label || "Fila de saneamento"}
              </h2>
              <p className="mt-2 max-w-4xl text-sm leading-7 text-text-body">
                {payload?.campaign.hint || "Organizamos os ativos pendentes em uma fila operacional para facilitar saneamento, revisão e acompanhamento."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge tone="neutral">Responsável: {payload?.campaign.responsible || "Governança"}</Badge>
              <Badge tone="accent">{payload?.campaign.progress_pct.toFixed(1) || "0.0"}% concluído</Badge>
              {payload && canExport ? (
                <>
                  <Button onClick={() => void download(payload.campaign.export_csv_href, `${payload.campaign.key}.csv`)} size="sm" variant="outline">
                    {downloading === `${payload.campaign.key}.csv` ? "Exportando..." : "Exportar CSV"}
                  </Button>
                  <Button onClick={() => void download(payload.campaign.export_xlsx_href, `${payload.campaign.key}.xlsx`)} size="sm" variant="outline">
                    {downloading === `${payload.campaign.key}.xlsx` ? "Exportando..." : "Exportar Excel"}
                  </Button>
                </>
              ) : null}
            </div>
          </div>

          {payload ? (
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-border bg-surface p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted">Pendentes</p>
                <p className="mt-2 text-3xl font-semibold text-text">{payload.campaign.count}</p>
              </div>
              <div className="rounded-2xl border border-border bg-surface p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted">Concluídos</p>
                <p className="mt-2 text-3xl font-semibold text-text">{payload.campaign.completed_count}</p>
              </div>
              <div className="rounded-2xl border border-border bg-surface p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted">Backlog total</p>
                <p className="mt-2 text-3xl font-semibold text-text">{payload.total}</p>
              </div>
              <div className="rounded-2xl border border-border bg-surface p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted">Ordenação padrão</p>
                <p className="mt-2 text-lg font-semibold text-text">Menor score primeiro</p>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {loading ? <Skeleton className="h-[420px] w-full" /> : null}
      {!loading && error ? <p className="text-sm text-danger-700">{error}</p> : null}

      {!loading && !error && payload ? (
        payload.items.length ? (
          <Card className="border-border bg-surface shadow-[0_12px_36px_rgba(15,23,42,0.05)]">
            <CardContent className="space-y-4 p-5">
              <div className="overflow-x-auto rounded-2xl border border-border">
                <table className="min-w-full divide-y divide-border text-sm">
                  <thead className="bg-bg-subtle/80 text-left text-xs uppercase tracking-[0.16em] text-muted">
                    <tr>
                      <th className="px-4 py-3">Ativo</th>
                      <th className="px-4 py-3">Fonte</th>
                      <th className="px-4 py-3">Owner</th>
                      <th className="px-4 py-3">Governança</th>
                      <th className="px-4 py-3">Certificação</th>
                      <th className="px-4 py-3">Sensibilidade</th>
                      <th className="px-4 py-3">Última revisão</th>
                      <th className="px-4 py-3">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-surface">
                    {payload.items.map((item) => (
                      <tr key={item.table_id}>
                        <td className="px-4 py-4">
                          <p className="font-medium text-text">{item.table_name}</p>
                          <p className="mt-1 text-xs text-muted">{item.table_fqn}</p>
                        </td>
                        <td className="px-4 py-4 text-text-body">{item.datasource_name} · {item.database_name}.{item.schema_name}</td>
                        <td className="px-4 py-4 text-text-body">{item.owner_name}</td>
                        <td className="px-4 py-4 text-text-body">
                          <div className="flex flex-wrap gap-2">
                            <Badge tone={item.governance_score.tone === "success" ? "success" : item.governance_score.tone === "accent" ? "accent" : item.governance_score.tone === "warning" ? "warning" : "neutral"}>
                              {item.governance_score.score} pts
                            </Badge>
                            <span className="text-xs text-muted">{item.governance_score.label}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-text-body">{item.certification_status_label}</td>
                        <td className="px-4 py-4 text-text-body">{item.sensitivity_label}</td>
                        <td className="px-4 py-4 text-text-body">{item.last_review_at ? formatDateTime(item.last_review_at) : "Não avaliado"}</td>
                        <td className="px-4 py-4">
                          <div className="flex flex-wrap gap-2">
                            <Button asChild size="sm" variant="outline"><Link href={item.links.explorer}>Explorer</Link></Button>
                            <Button asChild size="sm" variant="outline"><Link href={item.links.data_quality}>DQ</Link></Button>
                            <Button asChild size="sm" variant="outline"><Link href={item.links.incidents}>Incidentes</Link></Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between gap-3">
                <Button asChild disabled={page <= 1} variant="outline">
                  <Link href={`/dashboard/campaigns/${params.campaignKey}${buildQueryString(searchParams, Math.max(page - 1, 1))}`}>Página anterior</Link>
                </Button>
                <p className="text-sm text-text-body">
                  Página {payload.page} · {payload.total} item(ns) no backlog · responsável sugerido: {payload.campaign.responsible}
                </p>
                <Button asChild disabled={(payload.page * payload.page_size) >= payload.total} variant="outline">
                  <Link href={`/dashboard/campaigns/${params.campaignKey}${buildQueryString(searchParams, page + 1)}`}>Próxima página</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <EmptyState title="Nenhum item pendente" description="Não há backlog para esta campanha no recorte atual." />
        )
      ) : null}
    </div>
  );
}
