import { useEffect, useMemo, useState } from "react";
import { Database, RefreshCw } from "lucide-react";
import { useRouter } from "@/lib/next-shims";

import { AssetExplorerShell, CompactFilterBar, CompactFilterChip, CompactFilterReset, CompactFilterToggle } from "@/features/asset-explorer-shell";
import { DataLakeTableDetailPage } from "@/features/integrations/components/data-lake-table-detail";
import { listDataLakeCatalog } from "@/features/integrations/sdk";
import type { DataLakeCatalogPage, DataLakeCatalogTable } from "@/features/integrations/types";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { DataLakeTreePanel, buildDataLakeTree } from "./components/data-lake-tree-panel";

type TreeFilters = {
  search: string;
  connectionId: string;
  bucket: string;
  layer: string;
  status: string;
  hasPartitions: string;
  hasParquet: string;
  freshnessState: string;
  sortBy: string;
  sortDir: string;
};

type CatalogLoadState = {
  summary: DataLakeCatalogPage["summary"] | null;
  items: DataLakeCatalogTable[];
  truncated: boolean;
};

// Safety ceiling for the sequential catalog fetch (pages of 100). If the catalog is
// larger, we stop and flag `truncated` so the UI can warn instead of silently hiding tables.
const CATALOG_MAX_PAGES = 100;

type TreeNodeState = Record<string, boolean>;

const DEFAULT_FILTERS: TreeFilters = {
  search: "",
  connectionId: "",
  bucket: "",
  layer: "",
  status: "",
  hasPartitions: "",
  hasParquet: "",
  freshnessState: "",
  sortBy: "last_modified",
  sortDir: "desc",
};

function toBooleanFilter(value: string): boolean | null {
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}

async function loadCatalogAll(filters: TreeFilters): Promise<CatalogLoadState> {
  const pageSize = 100;
  const items: DataLakeCatalogTable[] = [];
  let summary: DataLakeCatalogPage["summary"] | null = null;
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const payload = await listDataLakeCatalog({
      page,
      page_size: pageSize,
      connection_id: filters.connectionId ? Number(filters.connectionId) : null,
      bucket: filters.bucket || null,
      layer: filters.layer || null,
      status: filters.status || null,
      has_partitions: toBooleanFilter(filters.hasPartitions),
      has_parquet: toBooleanFilter(filters.hasParquet),
      freshness_state: filters.freshnessState || null,
      search: filters.search.trim() || null,
      sort_by: filters.sortBy,
      sort_dir: filters.sortDir,
    });

    if (!summary) {
      summary = payload.summary;
    }
    items.push(...payload.items);
    hasMore = payload.has_more;
    page += 1;
    if (page > CATALOG_MAX_PAGES) {
      return { summary, items, truncated: hasMore };
    }
  }

  return { summary, items, truncated: false };
}

function buildOptions(items: DataLakeCatalogTable[], keySelector: (item: DataLakeCatalogTable) => string): string[] {
  return Array.from(new Set(items.map(keySelector).filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

export function DatalakesPageClient({ tableId }: { tableId?: number | null }) {
  const auth = useAuth();
  const router = useRouter();
  // Catalog browser is read-only and viewable by admin/editor/viewer; the connection
  // console and write actions live under Integrations (admin-only).
  const canView = auth.canAction("read", "dataLake");
  const [filters, setFilters] = useState<TreeFilters>(DEFAULT_FILTERS);
  const [searchDraft, setSearchDraft] = useState(DEFAULT_FILTERS.search);
  const [state, setState] = useState<CatalogLoadState>({ summary: null, items: [], truncated: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [expandedNodes, setExpandedNodes] = useState<TreeNodeState>({});
  const [treeCollapsed, setTreeCollapsed] = useState(Boolean(tableId));

  useEffect(() => {
    setTreeCollapsed(Boolean(tableId));
  }, [tableId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setFilters((current) => {
        const nextSearch = searchDraft.trim();
        if (current.search === nextSearch) {
          return current;
        }
        return { ...current, search: nextSearch };
      });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [searchDraft]);

  useEffect(() => {
    if (!canView) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError("");
    void (async () => {
      try {
        const payload = await loadCatalogAll(filters);
        if (!cancelled) {
          setState(payload);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Não foi possível carregar o explorer de Datalakes.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canView, filters, reloadToken]);

  const tree = useMemo(() => buildDataLakeTree(state.items), [state.items]);
  const connectionOptions = useMemo(
    () => buildOptions(state.items, (item) => `${item.connection_id}::${item.connection_name}`),
    [state.items],
  );
  const bucketOptions = useMemo(() => buildOptions(state.items, (item) => item.bucket), [state.items]);

  function setFilter<K extends keyof TreeFilters>(key: K, value: TreeFilters[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function clearFilter<K extends keyof TreeFilters>(key: K) {
    if (key === "search") {
      setSearchDraft("");
    }
    setFilters((current) => ({ ...current, [key]: DEFAULT_FILTERS[key] }));
  }

  function resetFilters() {
    setFilters(DEFAULT_FILTERS);
    setSearchDraft(DEFAULT_FILTERS.search);
  }

  const activeFilters = useMemo(
    () =>
      [
        filters.search ? { key: "search" as const, label: `Busca: ${filters.search}` } : null,
        filters.layer ? { key: "layer" as const, label: `Camada: ${filters.layer}` } : null,
        filters.freshnessState
          ? { key: "freshnessState" as const, label: `Atualização: ${filters.freshnessState === "recent" ? "Recente" : "Sem atualização recente"}` }
          : null,
        filters.connectionId
          ? {
              key: "connectionId" as const,
              label: `Conexão: ${connectionOptions.find((value) => value.startsWith(`${filters.connectionId}::`))?.split("::")[1] ?? filters.connectionId}`,
            }
          : null,
        filters.bucket ? { key: "bucket" as const, label: `Bucket: ${filters.bucket}` } : null,
        filters.hasPartitions ? { key: "hasPartitions" as const, label: `Partições: ${filters.hasPartitions === "true" ? "Sim" : "Não"}` } : null,
        filters.hasParquet ? { key: "hasParquet" as const, label: `Parquet: ${filters.hasParquet === "true" ? "Sim" : "Não"}` } : null,
      ].filter(Boolean) as Array<{ key: keyof TreeFilters; label: string }>,
    [connectionOptions, filters.bucket, filters.connectionId, filters.freshnessState, filters.hasParquet, filters.hasPartitions, filters.layer, filters.search],
  );

  function toggleNode(key: string) {
    setExpandedNodes((current) => ({ ...current, [key]: !(current[key] ?? true) }));
  }

  function openTable(item: DataLakeCatalogTable) {
    router.push(`/datalakes/${item.id}`);
  }

  if (!canView) {
    return (
      <EmptyState
        title="Acesso restrito"
        description="Você não tem acesso à navegação de Datalakes."
      />
    );
  }

  return (
    <div className="w-full min-w-0">
      {error ? <div className="mb-4 rounded-2xl border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700">{error}</div> : null}

      {state.truncated ? (
        <div className="mb-4 rounded-2xl border border-warning-200 bg-warning-50 px-4 py-3 text-sm text-warning-700">
          Mostrando as primeiras {state.items.length.toLocaleString("pt-BR")} tabelas do catálogo (limite de exibição atingido).
          Use os filtros (conexão, bucket, layer, busca) para reduzir o resultado e ver as demais.
        </div>
      ) : null}

      <AssetExplorerShell
        sidebarCollapsed={treeCollapsed}
        sidebarCollapsedClassName="xl:w-[104px]"
        sidebarExpandedClassName="xl:w-[360px]"
        top={
          <Card className="w-full">
            <CardHeader>
              <CompactFilterBar
                actions={
                  <>
                    <Select className="h-8 w-full sm:w-[144px]" onChange={(event) => setFilter("sortBy", event.target.value)} value={filters.sortBy}>
                      <option value="last_modified">Última atualização</option>
                      <option value="volume">Volume</option>
                      <option value="files_count">Arquivos</option>
                      <option value="layer">Camada</option>
                      <option value="table_name">Nome</option>
                    </Select>
                    <Select className="h-8 w-[86px]" onChange={(event) => setFilter("sortDir", event.target.value)} value={filters.sortDir}>
                      <option value="desc">Desc</option>
                      <option value="asc">Asc</option>
                    </Select>
                    <Button
                      className="h-8 px-2.5"
                      disabled={loading || refreshing}
                      onClick={() => {
                        setRefreshing(true);
                        setReloadToken((current) => current + 1);
                      }}
                      size="sm"
                      variant="ghost"
                    >
                      <RefreshCw className={cn("h-4 w-4", loading || refreshing ? "animate-spin" : "")} />
                    </Button>
                  </>
                }
                chips={
                  activeFilters.length > 0 ? (
                    <>
                      {activeFilters.map((filter) => (
                        <CompactFilterChip key={`${filter.key}:${filter.label}`} onRemove={() => clearFilter(filter.key)}>
                          {filter.label}
                        </CompactFilterChip>
                      ))}
                      <CompactFilterReset onClick={resetFilters} />
                    </>
                  ) : (
                    <span className="text-xs text-muted">Filtros ativos aparecerão aqui como chips removíveis.</span>
                  )
                }
                description="Buscar conexão, bucket, camada, tabela ou path base."
                icon={<Database className="h-4 w-4 text-info-700" />}
                meta={loading ? "Carregando..." : `${state.items.length} resultado(s)`}
                primary={
                  <Input
                    className="h-9"
                    onChange={(event) => setSearchDraft(event.target.value)}
                    placeholder="Buscar conexão, bucket, camada, tabela ou path"
                    value={searchDraft}
                  />
                }
                secondary={
                  <>
                    <Select className="h-8 w-full sm:w-[112px]" onChange={(event) => setFilter("layer", event.target.value)} value={filters.layer}>
                      <option value="">Camada</option>
                      <option value="bronze">bronze</option>
                      <option value="silver">silver</option>
                      <option value="gold">gold</option>
                    </Select>
                    <Select className="h-8 w-full sm:w-[136px]" onChange={(event) => setFilter("freshnessState", event.target.value)} value={filters.freshnessState}>
                      <option value="">Atualização</option>
                      <option value="recent">Recente</option>
                      <option value="stale">Sem atualização</option>
                    </Select>
                    <Select className="h-8 w-full sm:w-[180px]" onChange={(event) => setFilter("connectionId", event.target.value)} value={filters.connectionId}>
                      <option value="">Conexão</option>
                      {connectionOptions.map((value) => {
                        const [id, label] = value.split("::");
                        return (
                          <option key={id} value={id}>
                            {label}
                          </option>
                        );
                      })}
                    </Select>
                    <Select className="h-8 w-full sm:w-[220px]" onChange={(event) => setFilter("bucket", event.target.value)} value={filters.bucket}>
                      <option value="">Bucket</option>
                      {bucketOptions.map((bucket) => (
                        <option key={bucket} value={bucket}>
                          {bucket}
                        </option>
                      ))}
                    </Select>
                    <CompactFilterToggle active={filters.hasPartitions === "true"} onClick={() => setFilter("hasPartitions", filters.hasPartitions === "true" ? "" : "true")}>
                      Partições
                    </CompactFilterToggle>
                    <CompactFilterToggle active={filters.hasParquet === "true"} onClick={() => setFilter("hasParquet", filters.hasParquet === "true" ? "" : "true")}>
                      Parquet
                    </CompactFilterToggle>
                  </>
                }
                title="Explorer de Datalakes"
              />
            </CardHeader>
          </Card>
        }
        detail={
          tableId != null ? (
            <div className="flex w-full min-w-0 flex-1 flex-col items-stretch">
              <DataLakeTableDetailPage tableId={tableId} embedded backHref="/datalakes" />
            </div>
          ) : (
            <EmptyState
              className="h-full min-h-[72vh] rounded-[2rem] border border-border bg-surface shadow-[0_12px_40px_rgba(15,23,42,0.05)]"
              title="Nenhuma tabela selecionada"
              description="Selecione uma tabela na árvore para visualizar os detalhes, arquivos, partições e governança operacional."
            />
          )
        }
        sidebar={
          <DataLakeTreePanel
            expandedNodes={expandedNodes}
            loading={loading}
            onOpenTable={openTable}
            onToggleNode={toggleNode}
            searchQuery={filters.search}
            selectedTableId={tableId ?? null}
            setTreeCollapsed={setTreeCollapsed}
            tree={tree}
            treeCollapsed={treeCollapsed}
          />
        }
      />
    </div>
  );
}
