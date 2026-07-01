import type { Edge, Node } from "reactflow";
import { RefreshCcw } from "lucide-react";

import { LineageFlowCanvas, type LineageFlowNodeData } from "@/components/lineage/lineage-flow-canvas";
import { LineageLayerBadge, LineageOriginBadge, LineageRelationBadge } from "@/components/lineage/lineage-badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";

import type { LineageSummary } from "../types";
import { formatDateTime, lineageAssetDisplayName, lineageAssetExplorerHref } from "../utils";

type ExplorerLineageTabContentProps = {
  canEdit: boolean;
  flowEdges: Edge[];
  flowNodes: Node<LineageFlowNodeData>[];
  hasSavedLineage: boolean;
  lineageLoading: boolean;
  lineageSummary: LineageSummary | null;
  onCreateRelation: () => void;
  onImportSpreadsheet: () => void;
  onManageLineage: () => void;
  onNodeActivate: (node: Node<LineageFlowNodeData>) => void;
  onOpenRelatedAsset: (href: string) => void;
  onRefreshAutomaticLineage: () => void;
  onLoadFullGraph: () => void;
};

export function ExplorerLineageTabContent({
  canEdit,
  flowEdges,
  flowNodes,
  hasSavedLineage,
  lineageLoading,
  lineageSummary,
  onCreateRelation,
  onImportSpreadsheet,
  onManageLineage,
  onNodeActivate,
  onOpenRelatedAsset,
  onRefreshAutomaticLineage,
  onLoadFullGraph,
}: ExplorerLineageTabContentProps) {
  return (
    <div className="space-y-3">
      {lineageLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, idx) => (
            <Skeleton className="h-10 w-full" key={idx} />
          ))}
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-bg-subtle/80 p-4">
            <div>
              <p className="text-sm font-semibold text-text">Resumo da linhagem</p>
              <p className="mt-1 text-xs text-muted">
                Veja de onde os dados vêm, onde são consumidos e quais processos e jobs estão conectados ao ativo selecionado.
              </p>
              {lineageSummary?.graph_truncated ? (
                <p className="mt-2 text-xs text-warning-700">
                  Exibindo uma amostra das relações. Carregue a linhagem completa para ver todos os vínculos.
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={onRefreshAutomaticLineage} size="sm" variant="outline">
                <RefreshCcw className="h-4 w-4" />
                Atualizar linhagem
              </Button>
              {lineageSummary?.graph_truncated ? (
                <Button onClick={onLoadFullGraph} size="sm" variant="outline">
                  Carregar completa
                </Button>
              ) : null}
              {canEdit ? (
                <>
                  <Button onClick={onImportSpreadsheet} size="sm" variant="outline">
                    Importar planilha
                  </Button>
                  <Button onClick={onCreateRelation} size="sm" variant="outline">
                    Criar relação
                  </Button>
                  <Button onClick={onManageLineage} size="sm">
                    Gerenciar linhagem
                  </Button>
                </>
              ) : null}
            </div>
          </div>

          {hasSavedLineage && lineageSummary ? (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                {[
                  { title: "Origem", value: lineageSummary.impact.upstream_count },
                  { title: "Impacto", value: lineageSummary.impact.downstream_count },
                  { title: "Processos", value: lineageSummary.impact.process_count },
                  { title: "Dashboards", value: lineageSummary.impact.dashboard_count },
                  { title: "Nível de impacto", value: lineageSummary.impact.impact_level },
                ].map((item) => (
                  <div className="rounded-2xl border border-border bg-surface p-4" key={item.title}>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">{item.title}</p>
                    <p className="mt-2 text-2xl font-semibold text-text">{item.value}</p>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                <LineageOriginBadge origin={lineageSummary.lineage_origin} />
                {lineageSummary.lineage_sources.map((item) => (
                  <Badge key={`lineage-source-${item}`} tone="neutral">
                    {item}
                  </Badge>
                ))}
                <Badge tone="neutral">{lineageSummary.related_jobs.length} jobs</Badge>
                <Badge tone="neutral">{lineageSummary.recent_runs.length} execuções recentes</Badge>
              </div>

              <LineageFlowCanvas edges={flowEdges} nodes={flowNodes} onNodeActivate={onNodeActivate} />

              <div className="grid gap-4 xl:grid-cols-2">
                <Card className="border-border/80">
                  <CardContent className="space-y-3 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Origem</p>
                    {lineageSummary.upstream.length ? (
                      lineageSummary.upstream.map((item) => (
                        <div className="rounded-2xl border border-border bg-bg-subtle/70 p-3" key={`lineage-up-${item.asset_key}`}>
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-text">{lineageAssetDisplayName(item)}</p>
                              <p className="truncate text-xs text-muted">{item.system_name || item.asset_type}</p>
                            </div>
                            <LineageLayerBadge layer={item.layer} />
                          </div>
                          {lineageAssetExplorerHref(item) ? (
                            <button
                              className="mt-2 text-xs font-medium text-info-700"
                              onClick={() => onOpenRelatedAsset(lineageAssetExplorerHref(item)!)}
                              type="button"
                            >
                              Abrir no Explorer
                            </button>
                          ) : null}
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted">Ainda não há relações de origem definidas para este ativo.</p>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-border/80">
                  <CardContent className="space-y-3 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Impacto</p>
                    {lineageSummary.downstream.length ? (
                      lineageSummary.downstream.map((item) => (
                        <div className="rounded-2xl border border-border bg-bg-subtle/70 p-3" key={`lineage-down-${item.asset_key}`}>
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-text">{lineageAssetDisplayName(item)}</p>
                              <p className="truncate text-xs text-muted">{item.system_name || item.asset_type}</p>
                            </div>
                            <LineageLayerBadge layer={item.layer} />
                          </div>
                          {lineageAssetExplorerHref(item) ? (
                            <button
                              className="mt-2 text-xs font-medium text-info-700"
                              onClick={() => onOpenRelatedAsset(lineageAssetExplorerHref(item)!)}
                              type="button"
                            >
                              Abrir no Explorer
                            </button>
                          ) : null}
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted">Ainda não há relações de impacto definidas para este ativo.</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <Card className="border-border/80">
                  <CardContent className="space-y-3 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Processos / pipelines</p>
                    {lineageSummary.related_processes.length ? (
                      lineageSummary.related_processes.map((item) => (
                        <div className="rounded-2xl border border-border bg-surface p-3" key={`${item.process_name}-${item.relation_type}`}>
                          <p className="text-sm font-medium text-text">{item.process_name}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <Badge tone="neutral">{item.process_type || "manual"}</Badge>
                            <LineageRelationBadge relationType={item.relation_type} />
                            <Badge tone="neutral">{item.count} relação(ões)</Badge>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted">Ainda não há processos relacionados ligados a este ativo.</p>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-border/80">
                  <CardContent className="space-y-3 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Dashboards</p>
                    {lineageSummary.related_dashboards.length ? (
                      lineageSummary.related_dashboards.map((item) => (
                        <div className="rounded-2xl border border-border bg-surface p-3" key={`lineage-dash-${item.asset_key}`}>
                          <p className="text-sm font-medium text-text">{item.asset_name}</p>
                          <p className="mt-1 text-xs text-muted">{item.system_name || "Dashboard"}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted">Ainda não há dashboards consumindo este ativo.</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <Card className="border-border/80">
                  <CardContent className="space-y-3 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Jobs</p>
                    {lineageSummary.related_jobs.length ? (
                      lineageSummary.related_jobs.map((item) => (
                        <div className="rounded-2xl border border-border bg-surface p-3" key={`lineage-job-${item.id ?? item.job_name}`}>
                          <p className="text-sm font-medium text-text">{item.display_name}</p>
                          <p className="mt-1 text-xs text-muted">
                            {item.namespace || "N/D"} • {item.job_type || "job"} • {item.latest_run_status || "Sem execução recente"}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted">Ainda não há jobs relacionados a este ativo.</p>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-border/80">
                  <CardContent className="space-y-3 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Execuções recentes</p>
                    {lineageSummary.recent_runs.length ? (
                      lineageSummary.recent_runs.map((item) => (
                        <div className="rounded-2xl border border-border bg-surface p-3" key={`lineage-run-${item.external_run_id}`}>
                          <p className="text-sm font-medium text-text">{item.external_run_id}</p>
                          <p className="mt-1 text-xs text-muted">
                            {item.status || "status N/D"} • {formatDateTime(item.started_at || item.nominal_start_time || item.ended_at)}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted">Ainda não há execuções recentes registradas.</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            <EmptyState
              title="Linhagem indisponível"
              description="Use o módulo Linhagem para cadastrar relações manuais e desbloquear análise de origem, impacto e dependências."
            />
          )}
        </>
      )}
    </div>
  );
}
