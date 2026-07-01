import { Link } from "@/lib/next-shims";
import type { Edge, Node } from "reactflow";
import { Activity, Copy, ExternalLink, GitBranch, Pencil, Plus, Trash2, X } from "lucide-react";

import { DatabaseTechLogo } from "@/components/database-tech-logo";
import { LineageLayerBadge, LineageOriginBadge } from "@/components/lineage/lineage-badges";
import { LineageFlowCanvas, type LineageFlowNodeData } from "@/components/lineage/lineage-flow-canvas";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useModalDismiss } from "@/lib/use-modal-dismiss";

import type { LineageAssetListItem, LineageColumnEdge, LineageSummary } from "../types";
import { assetDisplayName } from "../utils";

type Props = {
  open: boolean;
  summary: LineageSummary | null;
  summaryLoading: boolean;
  summaryError: string | null;
  columns: LineageColumnEdge[];
  columnsLoading: boolean;
  columnsError: string | null;
  flowNodes: Node<LineageFlowNodeData>[];
  flowEdges: Edge[];
  comparisonSummary: LineageSummary | null;
  comparisonLoading: boolean;
  comparisonError: string | null;
  comparisonCandidates: LineageAssetListItem[];
  comparisonAssetId: number | null;
  onClose: () => void;
  onNodeActivate: (node: Node<LineageFlowNodeData>) => void;
  onComparisonChange: (assetId: number | null) => void;
  onCreateColumnEdge?: () => void;
  onEditColumnEdge?: (edge: LineageColumnEdge) => void;
  onDeactivateColumnEdge?: (edge: LineageColumnEdge) => void;
  onLoadFullGraph: () => void;
  selectedAssetId: number | null;
};

export function LineageDetailDialog({
  open,
  summary,
  summaryLoading,
  summaryError,
  columns,
  columnsLoading,
  columnsError,
  flowNodes,
  flowEdges,
  comparisonSummary,
  comparisonLoading,
  comparisonError,
  comparisonCandidates,
  comparisonAssetId,
  onClose,
  onNodeActivate,
  onComparisonChange,
  onCreateColumnEdge,
  onEditColumnEdge,
  onDeactivateColumnEdge,
  onLoadFullGraph,
  selectedAssetId,
}: Props) {
  useModalDismiss({ open, onClose });

  if (!open) return null;
  const hasLineageContext =
    !!summary && (summary.graph_nodes.length > 0 || summary.upstream.length > 0 || summary.downstream.length > 0 || summary.related_jobs.length > 0);
  const sourceLabel = summary?.lineage_sources.length
    ? summary.lineage_sources.join(", ")
    : hasLineageContext
      ? "Linhagem interna"
      : "Sem linhagem interna";
  const assetPath = summary?.asset.schema_name && summary?.asset.object_name ? `${summary.asset.schema_name}.${summary.asset.object_name}` : summary?.asset.asset_name || "";
  const comparisonAsset = comparisonCandidates.find((item) => item.asset.id === comparisonAssetId) || null;
  const comparisonLabel = comparisonAsset ? assetDisplayName(comparisonAsset.asset) : "Selecione um ativo para comparar";
  const columnGroups = summary
    ? columns.reduce<Map<string, { key: string; localColumn: string; items: LineageColumnEdge[] }>>((groups, edge) => {
        const localColumn = edge.local_column_name || edge.related_column_name || "Coluna sem nome";
        const key = edge.local_column_name || edge.related_column_name || `edge-${edge.id}`;
        const current = groups.get(key) || { key, localColumn, items: [] };
        current.items.push(edge);
        groups.set(key, current);
        return groups;
      }, new Map<string, { key: string; localColumn: string; items: LineageColumnEdge[] }>())
    : new Map<string, { key: string; localColumn: string; items: LineageColumnEdge[] }>();
  const columnGroupsList = Array.from(columnGroups.values()).sort((left, right) => left.localColumn.localeCompare(right.localColumn, "pt-BR"));
  const upstreamColumnEdges = columns.filter((edge) => edge.relative_direction === "upstream").length;
  const downstreamColumnEdges = columns.length - upstreamColumnEdges;
  const visibleColumnGroups = columnGroupsList.slice(0, 12);
  const evidenceCounts = columns.reduce(
    (acc, edge) => {
      const source = (edge.evidence_source || edge.discovery_method || "").toLowerCase();
      if (source === "openlineage") acc.openlineage += 1;
      else if (source === "inferred_sql") acc.inferredSql += 1;
      else if (source === "manual") acc.manual += 1;
      else acc.other += 1;
      return acc;
    },
    { openlineage: 0, inferredSql: 0, manual: 0, other: 0 },
  );
  const topColumnDependencies = columnGroupsList.slice(0, 3);

  function copyAssetName() {
    if (!summary?.asset.asset_name || typeof navigator === "undefined") return;
    void navigator.clipboard.writeText(summary.asset.asset_name);
  }

  function copyAssetPath() {
    if (!assetPath || typeof navigator === "undefined") return;
    void navigator.clipboard.writeText(assetPath);
  }

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-3 sm:p-5 backdrop-blur-[2px]"
      onClick={onClose}
      role="dialog"
    >
      <div
        className="h-[94dvh] w-full max-w-[1520px] overflow-hidden rounded-[28px] border border-border/80 bg-surface shadow-[0_32px_90px_rgba(15,23,42,0.28)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-start justify-between gap-4 border-b border-border/70 px-6 py-5">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Detalhe da linhagem</p>
              {summary ? (
                <div className="mt-2 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border/80 bg-surface shadow-sm">
                    <DatabaseTechLogo engine={(summary.asset.system_name || "external").toLowerCase()} variant="default" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-2xl font-semibold text-text">{summary.asset.asset_name}</p>
                    <p className="mt-1 truncate text-sm text-muted">{assetPath}</p>
                    <div className="mt-1 flex flex-wrap gap-2">
                      <LineageLayerBadge layer={summary.asset.layer} />
                      <Badge tone="neutral">{summary.asset.asset_type}</Badge>
                      <LineageOriginBadge origin={summary.lineage_origin} />
                    </div>
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-sm text-muted">Carregando detalhe da linhagem.</p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {summary?.asset.catalog_table_id ? (
                <Button asChild size="sm" variant="outline">
                  <Link href={`/explorer?tableId=${summary.asset.catalog_table_id}&tab=lineage`}>
                    Abrir no Explorer
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              ) : null}
              <Button size="sm" variant="outline" onClick={copyAssetName} disabled={!summary?.asset.asset_name}>
                <Copy className="h-3.5 w-3.5" />
                Copiar nome
              </Button>
              <Button size="sm" variant="outline" onClick={copyAssetPath} disabled={!assetPath}>
                <Copy className="h-3.5 w-3.5" />
                Copiar caminho
              </Button>
              <Button
                aria-label="Fechar"
                onClick={onClose}
                size="sm"
                variant="ghost"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            {summaryLoading ? (
              <div className="space-y-5">
                <div className="grid gap-3 md:grid-cols-5">
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <Skeleton className="h-24 w-full rounded-2xl" key={idx} />
                  ))}
                </div>
                <Skeleton className="h-[80vh] w-full rounded-3xl" />
              </div>
            ) : summaryError ? (
              <EmptyState title="Falha ao carregar a linhagem" description={summaryError} />
            ) : !summary ? (
              <EmptyState title="Selecione um ativo" description="Abra um item da lista ou clique em um nó do grafo para visualizar o detalhe da linhagem." />
            ) : (
              <div className="space-y-4">
                <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-5">
                  {[
                    { title: "Entradas", value: summary.impact.upstream_count },
                    { title: "Saídas", value: summary.impact.downstream_count },
                    { title: "Processos", value: summary.impact.process_count },
                    { title: "Painéis", value: summary.impact.dashboard_count },
                    { title: "Origem", value: sourceLabel },
                  ].map((item) => (
                    <div className="rounded-2xl border border-border/80 bg-surface px-3 py-3 shadow-sm" key={item.title}>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">{item.title}</p>
                      {typeof item.value === "number" ? (
                        <p className="mt-1 text-xl font-semibold text-text">{item.value}</p>
                      ) : (
                        <p
                          className="mt-1 max-h-10 overflow-hidden text-sm font-semibold leading-5 text-text"
                          title={item.value}
                          style={{
                            display: "-webkit-box",
                            WebkitBoxOrient: "vertical",
                            WebkitLineClamp: 2,
                          }}
                        >
                          {item.value}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                <Card className="flex h-[80vh] flex-col overflow-hidden border-border/80 shadow-card">
                  <CardHeader className="shrink-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                      <h3 className="text-sm font-semibold text-text">Grafo de linhagem</h3>
                      <p className="mt-1 text-xs text-muted">Visualização principal da linhagem do ativo, com entradas, saídas, processos e dashboards consumidores.</p>
                      {summary.graph_truncated ? (
                        <p className="mt-2 text-xs text-warning-700">
                          Exibindo uma amostra das relações. Carregue a linhagem completa para ver todos os vínculos.
                        </p>
                      ) : null}
                      </div>
                      {summary.graph_truncated ? (
                        <Button size="sm" variant="outline" onClick={onLoadFullGraph}>
                          Carregar completa
                        </Button>
                      ) : null}
                    </div>
                  </CardHeader>
                  <CardContent className="min-h-0 flex-1">
                    {summary.graph_nodes.length > 0 ? (
                      <LineageFlowCanvas
                        className="h-full min-h-0"
                        edges={flowEdges}
                        nodes={flowNodes}
                        onNodeActivate={onNodeActivate}
                        selectedAssetId={selectedAssetId}
                      />
                    ) : (
                      <EmptyState title="Ainda sem grafo de linhagem" description="Este ativo ainda não possui conexões suficientes para renderizar o grafo." />
                    )}
                  </CardContent>
                </Card>

                <div className="flex flex-col gap-4">
                  <Card className="w-full border-border/80 shadow-[0_12px_34px_rgba(15,23,42,0.04)]">
                    <CardHeader>
                      <div>
                        <h3 className="text-sm font-semibold text-text">Contexto do ativo</h3>
                        <p className="mt-1 text-xs text-muted">Visão resumida do objeto selecionado para facilitar navegação e governança.</p>
                      </div>
                    </CardHeader>
                    <CardContent className="grid gap-3 sm:grid-cols-2">
                      {[
                        ["Fonte de dados", summary.asset.system_name || "N/A"],
                        ["Schema", summary.asset.schema_name || "N/A"],
                        ["Objeto", summary.asset.object_name || "N/A"],
                        ["Tipo", summary.asset.asset_type],
                        ["Layer", summary.asset.layer],
                        ["ID do catálogo", summary.asset.catalog_table_id ? String(summary.asset.catalog_table_id) : "N/A"],
                      ].map(([label, value]) => (
                        <div className="rounded-2xl border border-border bg-bg-subtle/70 p-3" key={label}>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">{label}</p>
                          <p className="mt-1 text-sm font-semibold text-text">{value}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  <Card className="w-full border-border/80 shadow-[0_12px_34px_rgba(15,23,42,0.04)]">
                    <CardHeader>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-semibold text-text">Colunas relacionadas</h3>
                          <p className="mt-1 text-xs text-muted">Relações conhecidas entre colunas de origem, destino, direção e evidência de linhagem.</p>
                        </div>
                        {onCreateColumnEdge && summary.asset.catalog_table_id ? (
                          <Button size="sm" variant="outline" onClick={onCreateColumnEdge}>
                            <Plus className="h-3.5 w-3.5" />
                            Nova relação manual
                          </Button>
                        ) : null}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {columnsLoading ? (
                        <div className="space-y-2">
                          {Array.from({ length: 3 }).map((_, idx) => (
                            <Skeleton className="h-12 w-full rounded-2xl" key={idx} />
                          ))}
                        </div>
                      ) : columnsError ? (
                        <EmptyState title="Não foi possível carregar colunas" description={columnsError} />
                      ) : columns.length > 0 ? (
                        <div className="space-y-3">
                          <div className="grid gap-2 md:grid-cols-3">
                            <div className="rounded-2xl border border-border bg-bg-subtle/80 p-3">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Relações</p>
                              <p className="mt-1 text-lg font-semibold text-text">{columns.length}</p>
                            </div>
                            <div className="rounded-2xl border border-border bg-bg-subtle/80 p-3">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Colunas cobertas</p>
                              <p className="mt-1 text-lg font-semibold text-text">{columnGroupsList.length}</p>
                            </div>
                            <div className="rounded-2xl border border-border bg-bg-subtle/80 p-3">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Direção predominante</p>
                              <p className="mt-1 text-lg font-semibold text-text">{upstreamColumnEdges >= downstreamColumnEdges ? "Upstream" : "Downstream"}</p>
                            </div>
                          </div>

                          <div className="grid gap-3 xl:grid-cols-[1.1fr_0.9fr_1fr]">
                            <div className="rounded-3xl border border-border bg-surface p-4 shadow-sm">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Colunas com mais dependências</p>
                              {topColumnDependencies.length > 0 ? (
                                <div className="mt-3 space-y-2">
                                  {topColumnDependencies.map((group, index) => (
                                    <div className="flex items-start justify-between gap-3 rounded-2xl border border-border bg-bg-subtle/70 px-3 py-2" key={`top-${group.key}`}>
                                      <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold text-text">{index + 1}. {group.localColumn}</p>
                                        <p className="mt-0.5 text-xs text-muted">{group.items.length} relação(ões)</p>
                                      </div>
                                      <Badge tone="neutral">{group.items.length}</Badge>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="mt-3 text-sm text-muted">Ainda não há dependências suficientes para compor um ranking.</p>
                              )}
                            </div>

                            <div className="rounded-3xl border border-border bg-surface p-4 shadow-sm">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Fluxo por direção</p>
                              <div className="mt-3 space-y-3">
                                {[
                                  { label: "Upstream", value: upstreamColumnEdges, tone: "success" as const },
                                  { label: "Downstream", value: downstreamColumnEdges, tone: "accent" as const },
                                ].map((item) => {
                                  const total = Math.max(columns.length, 1);
                                  const percent = Math.round((item.value / total) * 100);
                                  return (
                                    <div key={item.label}>
                                      <div className="flex items-center justify-between gap-3">
                                        <p className="text-sm font-semibold text-text">{item.label}</p>
                                        <Badge tone={item.tone}>{item.value}</Badge>
                                      </div>
                                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-bg-subtle">
                                        <div
                                          className={`h-full rounded-full ${item.tone === "success" ? "bg-success-500" : "bg-info-500"}`}
                                          style={{ width: `${percent}%` }}
                                        />
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            <div className="rounded-3xl border border-border bg-surface p-4 shadow-sm">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Origem da evidência</p>
                              <div className="mt-3 grid gap-2">
                                {[
                                  { label: "OpenLineage", value: evidenceCounts.openlineage, tone: "accent" as const },
                                  { label: "SQL inferida", value: evidenceCounts.inferredSql, tone: "warning" as const },
                                  { label: "Manual", value: evidenceCounts.manual, tone: "success" as const },
                                  { label: "Outras", value: evidenceCounts.other, tone: "neutral" as const },
                                ].map((item) => (
                                  <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-bg-subtle/70 px-3 py-2" key={item.label}>
                                    <p className="text-sm font-medium text-text">{item.label}</p>
                                    <Badge tone={item.tone}>{item.value}</Badge>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className="space-y-3">
                            {visibleColumnGroups.map((group) => (
                              <details className="group rounded-3xl border border-border bg-surface shadow-sm" key={group.key} open={group.items.length <= 2}>
                                <summary className="cursor-pointer list-none px-4 py-4">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <p className="truncate text-sm font-semibold text-text">{group.localColumn}</p>
                                      <p className="mt-1 text-xs text-muted">{group.items.length} relação(ões) encontradas para esta coluna</p>
                                    </div>
                                    <Badge tone="neutral">{group.items.length}</Badge>
                                  </div>
                                </summary>
                                <div className="border-t border-border px-4 pb-4">
                                  <div className="space-y-3 pt-4">
                                    {[...group.items]
                                      .sort((left, right) => {
                                        if (left.relative_direction !== right.relative_direction) {
                                          return left.relative_direction === "upstream" ? -1 : 1;
                                        }
                                        return (left.related_asset_name || "").localeCompare(right.related_asset_name || "", "pt-BR");
                                      })
                                      .map((edge) => {
                                        const relatedAsset = edge.relative_direction === "upstream" ? edge.source_asset : edge.target_asset;
                                        const relatedAssetPath = edge.related_asset_path || edge.related_asset_name;
                                        const localAssetPath = edge.local_asset_path || edge.local_asset_name;
                                        const directionLabel = edge.relative_direction === "upstream" ? "Entrada" : "Saída";
                                        const arrow = edge.relative_direction === "upstream" ? "←" : "→";
                                        const relationTone = edge.discovery_method === "manual" ? "accent" : "neutral";
                                        const confidenceTone = edge.confidence_score >= 90 ? "success" : edge.confidence_score >= 70 ? "warning" : "danger";
                                        const confidenceTier = edge.confidence_tier || (edge.confidence_score >= 90 ? "strong" : edge.confidence_score >= 70 ? "moderate" : "weak");

                                        return (
                                          <div className="rounded-2xl border border-border bg-bg-subtle/70 p-3" key={edge.id}>
                                            <div className="flex flex-wrap items-start justify-between gap-3">
                                              <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                  <Badge tone={edge.relative_direction === "upstream" ? "success" : "accent"}>{directionLabel}</Badge>
                                                  <p className="truncate text-sm font-semibold text-text">
                                                    <span title={localAssetPath}>{edge.local_column_name}</span>
                                                    <span className="mx-2 text-slate-300">{arrow}</span>
                                                    <span title={relatedAssetPath}>{edge.related_column_name}</span>
                                                  </p>
                                                </div>
                                                <p className="mt-1 truncate text-xs text-muted" title={relatedAssetPath}>
                                                  {relatedAssetPath}
                                                </p>
                                                <div className="mt-2 flex flex-wrap gap-2">
                                                  <Badge tone={relationTone}>Tipo: {edge.relation_type}</Badge>
                                                  <Badge tone="neutral">Fonte: {edge.evidence_label || "Não informada"}</Badge>
                                                  <Badge tone={confidenceTone}>Confiança: {edge.confidence_label || `${edge.confidence_score}%`}</Badge>
                                                  <Badge tone={edge.is_verified ? "success" : "neutral"}>{edge.is_verified ? "Verificado" : "Não verificado"}</Badge>
                                                  <Badge tone="neutral">Versão {edge.version}</Badge>
                                                  <Badge tone={confidenceTier === "strong" ? "success" : confidenceTier === "moderate" ? "warning" : "danger"}>
                                                    {confidenceTier === "strong" ? "Vínculo forte" : confidenceTier === "moderate" ? "Vínculo moderado" : "Vínculo fraco"}
                                                  </Badge>
                                                </div>
                                              </div>
                                              <div className="flex shrink-0 flex-wrap items-center gap-2">
                                                {onEditColumnEdge ? (
                                                  <Button size="sm" variant="ghost" onClick={() => onEditColumnEdge(edge)}>
                                                    <Pencil className="h-3.5 w-3.5" />
                                                    Editar
                                                  </Button>
                                                ) : null}
                                                {relatedAsset.catalog_table_id ? (
                                                  <Button asChild size="sm" variant="outline">
                                                    <Link href={`/explorer?tableId=${relatedAsset.catalog_table_id}&tab=lineage`}>
                                                      Abrir ativo
                                                      <ExternalLink className="h-3.5 w-3.5" />
                                                    </Link>
                                                  </Button>
                                                ) : null}
                                                {onDeactivateColumnEdge ? (
                                                  <Button size="sm" variant="ghost" onClick={() => onDeactivateColumnEdge(edge)} title="Desativar relação">
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                  </Button>
                                                ) : null}
                                              </div>
                                            </div>
                                            {edge.transform_expression || edge.notes ? (
                                              <div className="mt-3 rounded-2xl border border-border bg-surface px-3 py-2">
                                                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
                                                  {edge.transform_expression ? "Transformação" : "Observação"}
                                                </p>
                                                <p className="mt-1 break-words text-sm text-text-body">
                                                  {edge.transform_expression || edge.notes}
                                                </p>
                                              </div>
                                            ) : null}
                                          </div>
                                        );
                                      })}
                                  </div>
                                </div>
                              </details>
                            ))}
                          </div>

                          {columnGroupsList.length > visibleColumnGroups.length ? (
                            <p className="text-xs text-muted">Mostrando {visibleColumnGroups.length} coluna(s) com relações consolidadas. Use rolagem para ver as demais.</p>
                          ) : null}
                        </div>
                      ) : (
                        <EmptyState
                          title="Ainda sem linhagem de coluna consolidada"
                          description="A linhagem de ativo já existe, mas ainda não há relações por coluna registradas para este objeto. Quando chegarem eventos com columnLineage, importações manuais ou enriquecimento futuro, esta seção passará a exibir origem, destino e transformação por coluna."
                        />
                      )}
                    </CardContent>
                  </Card>

                  <div className="space-y-4">
                    <Card className="border-border/80 shadow-[0_12px_34px_rgba(15,23,42,0.04)]">
                      <CardHeader>
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div>
                            <h3 className="text-sm font-semibold text-text">Comparar ativos</h3>
                            <p className="mt-1 text-xs text-muted">Compare o ativo atual com outro ativo do catálogo, sem sair da tela de linhagem.</p>
                          </div>
                          <div className="min-w-[240px] max-w-[320px]">
                            <select
                              className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm"
                              value={comparisonAssetId ?? ""}
                              onChange={(event) => onComparisonChange(event.target.value ? Number(event.target.value) : null)}
                            >
                              <option value="">Escolha um ativo para comparar</option>
                              {comparisonCandidates.map((candidate) => (
                                <option key={candidate.key} value={candidate.asset.id ?? ""}>
                                  {assetDisplayName(candidate.asset)} • {candidate.asset.layer}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {!comparisonAssetId ? (
                          <EmptyState title="Sem comparação selecionada" description="Escolha um ativo para ver a comparação lado a lado com o ativo atual." />
                        ) : comparisonLoading ? (
                          <div className="grid gap-3 md:grid-cols-2">
                            {Array.from({ length: 2 }).map((_, idx) => (
                              <Skeleton className="h-60 w-full rounded-3xl" key={idx} />
                            ))}
                          </div>
                        ) : comparisonError ? (
                          <EmptyState title="Não foi possível carregar a comparação" description={comparisonError} />
                        ) : comparisonSummary ? (
                          <div className="grid gap-3 xl:grid-cols-2">
                            {[
                              { label: "Ativo atual", data: summary },
                              { label: "Ativo comparado", data: comparisonSummary },
                            ].map((side) => (
                              <div className="rounded-3xl border border-border bg-bg-subtle/70 p-3.5" key={side.label}>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">{side.label}</p>
                                <p className="mt-2 truncate text-base font-semibold text-text">{side.data.asset.asset_name}</p>
                                <p className="mt-1 text-xs text-muted">
                                  {side.data.asset.schema_name || "N/A"} • {side.data.asset.object_name || "N/A"}
                                </p>
                                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                  {[
                                    ["Fonte", side.data.asset.system_name || "N/A"],
                                    ["Tipo", side.data.asset.asset_type],
                                    ["Layer", side.data.asset.layer],
                                    [
                                      "Origem",
                                      side.data.lineage_origin === "automatic"
                                        ? "Automática"
                                        : side.data.lineage_origin === "merged"
                                          ? "Mesclada"
                                          : "Manual",
                                    ],
                                    ["Entradas", String(side.data.impact.upstream_count)],
                                    ["Saídas", String(side.data.impact.downstream_count)],
                                    ["Processos", String(side.data.impact.process_count)],
                                    ["Painéis", String(side.data.impact.dashboard_count)],
                                  ].map(([label, value]) => (
                                    <div className="rounded-2xl border border-border bg-surface p-2.5" key={`${side.label}-${label}`}>
                                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">{label}</p>
                                      <p className="mt-1 text-sm font-semibold text-text">{value}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <EmptyState title="Sem dados comparáveis" description="O ativo escolhido ainda não possui detalhe suficiente para comparação." />
                        )}
                        {comparisonAsset ? <p className="mt-3 text-xs text-muted">Comparando com: {comparisonLabel}</p> : null}
                      </CardContent>
                    </Card>

                    {summary.related_jobs.length > 0 ? (
                      <div className="grid gap-4 xl:grid-cols-[1.3fr_0.9fr]">
                        <Card className="border-border/80 shadow-[0_12px_34px_rgba(15,23,42,0.04)]">
                          <CardHeader>
                            <div>
                              <h3 className="text-sm font-semibold text-text">Pipelines e jobs</h3>
                              <p className="mt-1 text-xs text-muted">Jobs associados ao ativo selecionado, com namespace e status do último run.</p>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            {summary.related_jobs.map((job) => (
                              <div key={`${job.namespace}-${job.job_name}`} className="rounded-2xl border border-border bg-bg-subtle/70 p-4">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      <GitBranch className="h-4 w-4 text-muted" />
                                      <p className="truncate text-sm font-semibold text-text">{job.display_name}</p>
                                    </div>
                                    <p className="mt-1 truncate text-xs text-muted">{job.namespace || job.job_name}</p>
                                  </div>
                                  <div className="flex shrink-0 flex-wrap gap-2">
                                    {job.job_type ? <Badge tone="neutral">{job.job_type}</Badge> : null}
                                    {job.latest_run_status ? (
                                      <Badge
                                        tone={
                                          job.latest_run_status.toLowerCase() === "complete"
                                            ? "success"
                                            : job.latest_run_status.toLowerCase() === "fail"
                                              ? "danger"
                                              : "neutral"
                                        }
                                      >
                                        {job.latest_run_status}
                                      </Badge>
                                    ) : null}
                                  </div>
                                </div>
                                <div className="mt-3 grid gap-3 md:grid-cols-2">
                                  <div>
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Último run</p>
                                    <p className="mt-1 text-sm text-text">{job.latest_run_id || "N/A"}</p>
                                  </div>
                                  <div>
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Última atualização</p>
                                    <p className="mt-1 text-sm text-text">{job.latest_run_at || "N/A"}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </CardContent>
                        </Card>

                        <Card className="border-border/80 shadow-[0_12px_34px_rgba(15,23,42,0.04)]">
                          <CardHeader>
                            <div>
                              <h3 className="text-sm font-semibold text-text">Runs recentes</h3>
                              <p className="mt-1 text-xs text-muted">Últimos eventos processados para os jobs relacionados.</p>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            {summary.recent_runs.length > 0 ? (
                              summary.recent_runs.map((run) => (
                                <div key={`${run.external_run_id}-${run.started_at || run.ended_at || "na"}`} className="rounded-2xl border border-border bg-surface p-4">
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2">
                                        <Activity className="h-4 w-4 text-muted" />
                                        <p className="truncate text-sm font-semibold text-text">{run.external_run_id}</p>
                                      </div>
                                      <p className="mt-1 text-xs text-muted">Início: {run.started_at || "N/A"}</p>
                                      <p className="text-xs text-muted">Fim: {run.ended_at || "N/A"}</p>
                                    </div>
                                    <Badge tone={run.status?.toLowerCase() === "complete" ? "success" : run.status?.toLowerCase() === "fail" ? "danger" : "neutral"}>
                                      {run.status || "UNKNOWN"}
                                    </Badge>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <EmptyState title="Sem runs recentes" description="Os jobs relacionados ainda não publicaram execuções suficientes para este ativo." />
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
