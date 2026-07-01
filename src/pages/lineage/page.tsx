import { useEffect, useMemo, useState } from "react";
import { ArrowRightLeft, Download, GitBranch, Layers3, Loader2, Workflow } from "lucide-react";

import { LineageLayerBadge, LineageOriginBadge } from "@/components/lineage/lineage-badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { downloadApiFile } from "@/lib/client-api";
import { useApiQuery } from "@/lib/use-api-query";
import { useAuth } from "@/lib/auth";
import { LineageDetailDialog } from "@/features/lineage/components/lineage-detail-dialog";
import { OpenLineageManager } from "@/features/lineage/components/openlineage-manager";
import { useLineageColumns } from "@/features/lineage/hooks/use-lineage-columns";
import { useLineageRelations } from "@/features/lineage/hooks/use-lineage-relations";
import { useLineageSources } from "@/features/lineage/hooks/use-lineage-sources";
import type { LineageSummary } from "@/features/lineage/types";
import { assetDisplayName, buildFlowEdges, buildFlowNodes, buildLineageAssets } from "@/features/lineage/utils";

export default function LineagePage() {
  const auth = useAuth();
  const canExport = auth.hasPermission("lineage:export");
  const canManageSources = auth.primaryRole === "admin";
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [graphLimit, setGraphLimit] = useState<number | null>(200);
  const graphDepth = 6;
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null);
  const [comparisonAssetId, setComparisonAssetId] = useState<number | null>(null);
  const [comparisonTableId, setComparisonTableId] = useState<number | null>(null);

  function buildSummaryUrl(assetId: number | null, tableId: number | null): string {
    const params = new URLSearchParams();
    if (graphLimit) params.set("max_relations", String(graphLimit));
    params.set("max_depth", String(graphDepth));
    const base = assetId ? `/v1/lineage/assets/${assetId}/summary` : `/v1/lineage/tables/${tableId}/summary`;
    return params.toString() ? `${base}?${params.toString()}` : base;
  }

  const {
    loading,
    filters,
    list,
    selectedAssetId,
    setFilters,
    setSelectedAssetId,
    loadRelations,
    loadMore,
    defaultFilters,
  } = useLineageRelations({ onError: setMessage });

  const { sources, sourceSyncing, syncSource, createSource, updateSource } = useLineageSources({
    onMessage: setMessage,
    onSynced: loadRelations,
  });

  const summaryEnabled = Boolean(selectedAssetId || selectedTableId);
  const summaryQuery = useApiQuery<LineageSummary>(
    ["lineage", "summary", selectedAssetId, selectedTableId, graphLimit],
    summaryEnabled ? buildSummaryUrl(selectedAssetId, selectedTableId) : "",
    undefined,
    { enabled: summaryEnabled },
  );
  const summary = summaryEnabled ? summaryQuery.data ?? null : null;
  const summaryLoading = summaryEnabled && summaryQuery.isLoading;
  const summaryError = summaryEnabled && summaryQuery.error ? summaryQuery.error.message : null;

  const { columns, error: columnsError, loading: columnsLoading } = useLineageColumns({
    assetId: summary?.asset.id ?? null,
    tableId: summary?.asset.catalog_table_id ?? null,
    refreshToken: 0,
    onError: () => {},
  });

  useEffect(() => {
    setGraphLimit(200);
  }, [selectedAssetId, selectedTableId]);

  const comparisonEnabled = Boolean(comparisonAssetId || comparisonTableId);
  const comparisonQuery = useApiQuery<LineageSummary>(
    ["lineage", "comparison", comparisonAssetId, comparisonTableId, graphLimit],
    comparisonEnabled ? buildSummaryUrl(comparisonAssetId, comparisonTableId) : "",
    undefined,
    { enabled: comparisonEnabled },
  );
  const comparisonSummary = comparisonEnabled ? comparisonQuery.data ?? null : null;
  const comparisonLoading = comparisonEnabled && comparisonQuery.isLoading;
  const comparisonError = comparisonEnabled && comparisonQuery.error ? comparisonQuery.error.message : null;

  // Deep-link: ?tableId=N opens the lineage detail for that table.
  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search);
    const tableId = fromUrl.get("tableId");
    if (!tableId) return;
    const parsed = Number(tableId);
    if (!Number.isFinite(parsed)) return;
    setSelectedAssetId(null);
    setSelectedTableId(parsed);
    setDetailOpen(true);
  }, [setSelectedAssetId]);

  const lineageAssets = useMemo(() => buildLineageAssets(list), [list]);
  const comparisonCandidates = useMemo(
    () => lineageAssets.filter((item) => item.asset.id != null && item.asset.id !== summary?.asset.id),
    [lineageAssets, summary?.asset.id],
  );
  const flowNodes = useMemo(() => buildFlowNodes(summary), [summary]);
  const flowEdges = useMemo(() => buildFlowEdges(summary), [summary]);

  async function exportSpreadsheet() {
    try {
      setExporting(true);
      await downloadApiFile("/v1/lineage/export", "lineage_export.xlsx", undefined, {
        confirmMessage:
          "Exportar a linhagem em Excel (limite de 2.500 ativos e 2.500 relações)? A exportação será auditada e notas sensíveis permanecem mascaradas.",
      });
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setExporting(false);
    }
  }

  function openDetail(assetId: number | null) {
    if (!assetId) return;
    setSelectedTableId(null);
    setSelectedAssetId(assetId);
    setComparisonAssetId(null);
    setComparisonTableId(null);
    setDetailOpen(true);
  }

  return (
    <div className="space-y-6">
      <Card className="border-border/80 bg-gradient-to-r from-white via-slate-50 to-accent-50 shadow-[0_16px_44px_rgba(15,23,42,0.05)]">
        <CardContent className="flex flex-col gap-5 p-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Linhagem</p>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-text">Linhagem</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-text-body">
                Linhagem consolidada do catálogo, montada automaticamente a partir de eventos OpenLineage e do consumo
                detectado (ex.: Metabase). Sem cadastro manual — conecte produtores no gerenciador abaixo.
              </p>
            </div>
          </div>
          {canExport ? (
            <Button onClick={() => void exportSpreadsheet()} disabled={exporting} variant="outline">
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Exportar planilha
            </Button>
          ) : null}
        </CardContent>
      </Card>

      {message ? (
        <div className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-text-body shadow-sm">{message}</div>
      ) : null}

      <OpenLineageManager
        sources={sources}
        sourceSyncing={sourceSyncing}
        canManage={canManageSources}
        onSync={(sourceId) => void syncSource(sourceId)}
        onCreate={createSource}
        onToggle={(sourceId, enabled) => updateSource(sourceId, { enabled })}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { title: "Total de ativos", value: list?.summary.total_assets ?? 0, icon: Layers3 },
          { title: "Total de relações", value: list?.summary.total_relations ?? 0, icon: GitBranch },
          { title: "Tabelas gold com linhagem", value: list?.summary.total_gold_tables_with_lineage ?? 0, icon: Workflow },
          { title: "Dashboards relacionados", value: list?.summary.total_dashboards_related ?? 0, icon: ArrowRightLeft },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Card className="border-border/80 shadow-[0_12px_34px_rgba(15,23,42,0.04)]" key={item.title}>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-text-body">{item.title}</p>
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-bg-subtle text-text-body">
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
                <p className="text-3xl font-semibold tracking-tight text-text">{item.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border-border/80 shadow-[0_12px_34px_rgba(15,23,42,0.04)]">
        <CardHeader className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-text">Ativos monitorados</p>
              <p className="mt-1 text-sm text-muted">Selecione um ativo para abrir o detalhe da linhagem, com o grafo como foco principal.</p>
            </div>
            <Badge tone="neutral">{lineageAssets.length} ativos</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-7">
            <Input placeholder="Buscar ativo ou processo" value={filters.q} onChange={(e) => setFilters((prev) => ({ ...prev, q: e.target.value }))} />
            <Input placeholder="Camada" value={filters.layer} onChange={(e) => setFilters((prev) => ({ ...prev, layer: e.target.value }))} />
            <Input placeholder="Tipo de ativo" value={filters.asset_type} onChange={(e) => setFilters((prev) => ({ ...prev, asset_type: e.target.value }))} />
            <Input placeholder="Tipo de relação" value={filters.relation_type} onChange={(e) => setFilters((prev) => ({ ...prev, relation_type: e.target.value }))} />
            <select className="rounded-xl border border-border bg-surface px-3 py-2 text-sm" value={filters.origin} onChange={(e) => setFilters((prev) => ({ ...prev, origin: e.target.value }))}>
              <option value="">Origem</option>
              <option value="automatic">Automática</option>
              <option value="merged">Mesclada</option>
            </select>
            <Input placeholder="Processo" value={filters.process} onChange={(e) => setFilters((prev) => ({ ...prev, process: e.target.value }))} />
            <Input placeholder="Dashboard" value={filters.dashboard} onChange={(e) => setFilters((prev) => ({ ...prev, dashboard: e.target.value }))} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => void loadRelations()}>
              Aplicar filtros
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                const next = { ...defaultFilters };
                setFilters(next);
                void loadRelations(next);
              }}
            >
              Limpar
            </Button>
          </div>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 7 }).map((_, idx) => (
                <Skeleton className="h-16 w-full rounded-2xl" key={idx} />
              ))}
            </div>
          ) : !list || list.items.length === 0 || lineageAssets.length === 0 ? (
            <EmptyState
              title="Ainda não há relações de linhagem"
              description="Conecte um produtor OpenLineage no gerenciador acima ou sincronize o Metabase para que a linhagem de consumo seja montada automaticamente."
            />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border bg-surface">
              <div className="divide-y divide-border">
                {lineageAssets.map((item) => (
                  <button
                    className={`flex w-full items-center justify-between gap-4 border border-transparent px-4 py-4 text-left transition-colors duration-150 ease-out ${
                      detailOpen && selectedAssetId === item.asset.id
                        ? "border-info-200 bg-info-50/70 ring-1 ring-inset ring-info-200"
                        : "bg-surface hover:bg-bg-subtle hover:border-border"
                    }`}
                    key={item.key}
                    onClick={() => openDetail(item.asset.id)}
                    type="button"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-text">{assetDisplayName(item.asset)}</p>
                      <p className="mt-1 truncate text-xs text-muted">
                        {item.asset.asset_type} • {item.asset.layer}
                        {item.asset.system_name ? ` • ${item.asset.system_name}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                      <LineageLayerBadge layer={item.asset.layer} />
                      <LineageOriginBadge origin={item.lineage_origin} />
                      <Badge tone="neutral">{item.relation_count} relações</Badge>
                    </div>
                  </button>
                ))}
              </div>
              {list?.has_more ? (
                <div className="border-t border-border p-3">
                  <Button onClick={() => void loadMore()} size="sm" variant="outline">
                    Carregar mais relações
                  </Button>
                </div>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>

      <LineageDetailDialog
        columns={columns}
        columnsError={columnsError}
        columnsLoading={columnsLoading}
        comparisonAssetId={comparisonAssetId}
        comparisonCandidates={comparisonCandidates}
        comparisonError={comparisonError}
        comparisonLoading={comparisonLoading}
        comparisonSummary={comparisonSummary}
        flowEdges={flowEdges}
        flowNodes={flowNodes}
        onClose={() => setDetailOpen(false)}
        onNodeActivate={(node) => {
          if (node.data.assetId) {
            setSelectedTableId(null);
            setSelectedAssetId(node.data.assetId);
            setDetailOpen(true);
            return;
          }
          const targetTableId = node.data.catalogTableId;
          if (targetTableId) {
            setSelectedAssetId(null);
            setSelectedTableId(targetTableId);
            setDetailOpen(true);
          }
        }}
        onLoadFullGraph={() => setGraphLimit(null)}
        open={detailOpen}
        summary={summary}
        summaryError={summaryError}
        summaryLoading={summaryLoading}
        onComparisonChange={(assetId) => {
          setComparisonAssetId(assetId);
          setComparisonTableId(null);
        }}
        selectedAssetId={selectedAssetId}
      />
    </div>
  );
}
