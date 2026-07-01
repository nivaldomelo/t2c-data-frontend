import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Database, RefreshCw, Search as SearchIcon } from "lucide-react";
import { useRouter } from "@/lib/next-shims";

import { ContextualJourneyCard } from "@/components/navigation/contextual-journey-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { listDataLakeCatalog, listDataLakeConnections } from "@/features/integrations/sdk";
import { formatDateTime, formatStatusLabel, formatStatusTone } from "@/features/integrations/utils";
import type { DataLakeCatalogPage, DataLakeConnection } from "@/features/integrations/types";

function formatBytes(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = value;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

export function DatalakesPageClient() {
  const auth = useAuth();
  const router = useRouter();
  const canManage = auth.primaryRole === "admin";
  const [connections, setConnections] = useState<DataLakeConnection[]>([]);
  const [catalogPage, setCatalogPage] = useState<DataLakeCatalogPage | null>(null);
  const [connectionsLoading, setConnectionsLoading] = useState(true);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloading, setReloading] = useState(false);
  const [selectedConnectionId, setSelectedConnectionId] = useState("");
  const [selectedBucket, setSelectedBucket] = useState("");
  const [layerFilter, setLayerFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [partitionFilter, setPartitionFilter] = useState("");
  const [parquetFilter, setParquetFilter] = useState("");
  const [freshnessFilter, setFreshnessFilter] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("last_modified");
  const [sortDir, setSortDir] = useState("desc");
  const [pageIndex, setPageIndex] = useState(1);
  const [pageSize] = useState(24);

  const connectionOptions = useMemo(
    () => [...connections].sort((a, b) => a.name.localeCompare(b.name)),
    [connections],
  );
  const bucketOptions = useMemo(
    () =>
      Array.from(new Set(connections.map((item) => item.bucket).filter(Boolean)))
        .sort((a, b) => a.localeCompare(b)),
    [connections],
  );

  useEffect(() => {
    if (!canManage) {
      setConnectionsLoading(false);
      setCatalogLoading(false);
      return;
    }
    let cancelled = false;
    setConnectionsLoading(true);
    setError("");
    void (async () => {
      try {
        const payload = await listDataLakeConnections();
        if (!cancelled) {
          setConnections(payload);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Não foi possível carregar as conexões do Data Lake.");
        }
      } finally {
        if (!cancelled) {
          setConnectionsLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canManage, reloading]);

  useEffect(() => {
    if (!canManage) {
      setCatalogPage(null);
      setError("");
      setCatalogLoading(false);
      return;
    }
    let cancelled = false;
    setCatalogLoading(true);
    setError("");
    void (async () => {
      try {
        const payload = await listDataLakeCatalog({
          page: pageIndex,
          page_size: pageSize,
          connection_id: selectedConnectionId ? Number(selectedConnectionId) : null,
          bucket: selectedBucket || null,
          layer: layerFilter || null,
          status: statusFilter || null,
          has_partitions:
            partitionFilter === "true" ? true : partitionFilter === "false" ? false : null,
          has_parquet:
            parquetFilter === "true" ? true : parquetFilter === "false" ? false : null,
          freshness_state: freshnessFilter || null,
          search: search.trim() || null,
          sort_by: sortBy,
          sort_dir: sortDir,
        });
        if (!cancelled) {
          setCatalogPage(payload);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Não foi possível carregar o catálogo de Data Lakes.");
        }
      } finally {
        if (!cancelled) {
          setCatalogLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    canManage,
    pageIndex,
    pageSize,
    selectedConnectionId,
    selectedBucket,
    layerFilter,
    statusFilter,
    partitionFilter,
    parquetFilter,
    freshnessFilter,
    search,
    sortBy,
    sortDir,
    reloading,
  ]);

  useEffect(() => {
    setPageIndex(1);
  }, [selectedConnectionId, selectedBucket, layerFilter, statusFilter, partitionFilter, parquetFilter, freshnessFilter, search, sortBy, sortDir]);

  if (!canManage) {
    return (
      <EmptyState
        title="Acesso restrito"
        description="A navegação de Datalakes é reservada ao administrador."
        action={
          <Button onClick={() => router.push("/integrations/data-lake")} size="sm" variant="outline">
            Voltar
          </Button>
        }
      />
    );
  }

  const summary = catalogPage?.summary;
  const pageCount = Math.max(1, Math.ceil((catalogPage?.total ?? 0) / pageSize));
  const isLoading = connectionsLoading || catalogLoading;

  return (
    <div className="space-y-6 pb-6">
      <Card className="border-border/80 bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_58%,#eef6ff_100%)] shadow-card">
        <CardContent className="space-y-4 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-surface px-3 py-1 text-xs font-medium text-brand-700">
                <Database className="h-3.5 w-3.5" />
                Uso diário
              </div>
              <h2 className="text-3xl font-semibold tracking-tight text-text">Datalakes</h2>
              <p className="max-w-4xl text-sm leading-7 text-text-body">
                Catálogo navegável das tabelas descobertas via S3/Data Lake, com conexão, bucket, path base, partições e sinais operacionais persistidos pelo inventário.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge tone="neutral">Conexões ativas: {summary?.active_connections ?? 0}</Badge>
              <Button disabled={isLoading} onClick={() => setReloading((current) => !current)} size="sm" variant="outline">
                <RefreshCw className={cn("mr-2 h-4 w-4", isLoading ? "animate-spin" : "")} />
                Recarregar
              </Button>
            </div>
          </div>
          <ContextualJourneyCard
            title="Próximos passos"
            description="Use esta listagem para abrir tabelas descobertas no Data Lake, revisar o path base e continuar a navegação no detalhe especializado."
            links={[
              { label: "Console técnico do Data Lake", href: "/integrations/data-lake", description: "Abrir conexões, testar bucket e reprocessar inventário.", tone: "accent" },
              { label: "Explorer", href: "/explorer", description: "Comparar o ativo de Data Lake com o catálogo relacional.", tone: "neutral" },
            ]}
          />
        </CardContent>
      </Card>

      {error ? <div className="rounded-2xl border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700">{error}</div> : null}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-3xl border-border shadow-[0_12px_36px_rgba(15,23,42,0.04)]">
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Tabelas</p>
            <p className="mt-2 text-3xl font-semibold text-text">{summary?.total_tables ?? 0}</p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-border shadow-[0_12px_36px_rgba(15,23,42,0.04)]">
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Bronze / Silver / Gold</p>
            <p className="mt-2 text-3xl font-semibold text-text">
              {summary?.bronze_tables ?? 0} / {summary?.silver_tables ?? 0} / {summary?.gold_tables ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-border shadow-[0_12px_36px_rgba(15,23,42,0.04)]">
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Sem parquet</p>
            <p className="mt-2 text-3xl font-semibold text-text">{summary?.tables_without_parquet ?? 0}</p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-border shadow-[0_12px_36px_rgba(15,23,42,0.04)]">
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Sem atualização recente</p>
            <p className="mt-2 text-3xl font-semibold text-text">{summary?.tables_without_recent_update ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-3xl border-border shadow-[0_12px_36px_rgba(15,23,42,0.04)]">
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Volume total</p>
            <p className="mt-2 text-2xl font-semibold text-text">{formatBytes(summary?.total_bytes ?? 0)}</p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-border shadow-[0_12px_36px_rgba(15,23,42,0.04)]">
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Arquivos parquet</p>
            <p className="mt-2 text-2xl font-semibold text-text">{summary?.total_parquet_files ?? 0}</p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-border shadow-[0_12px_36px_rgba(15,23,42,0.04)]">
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Conexões ativas</p>
            <p className="mt-2 text-2xl font-semibold text-text">{summary?.active_connections ?? 0}</p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-border shadow-[0_12px_36px_rgba(15,23,42,0.04)]">
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Último scan</p>
            <p className="mt-2 text-sm font-semibold text-text">{formatDateTime(summary?.last_scan_at)}</p>
            <p className="mt-1 text-xs text-muted">{formatStatusLabel(summary?.latest_scan_status)}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/80 bg-surface shadow-card">
        <CardContent className="space-y-4 p-5">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-body" htmlFor="datalake-search">
                Buscar
              </label>
              <Input
                id="datalake-search"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="tabela, bucket, conexão ou path"
                value={search}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-body" htmlFor="datalake-connection">
                Conexão
              </label>
              <Select id="datalake-connection" onChange={(event) => setSelectedConnectionId(event.target.value)} value={selectedConnectionId}>
                <option value="">Todas</option>
                {connectionOptions.map((connection) => (
                  <option key={connection.id} value={connection.id}>
                    {connection.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-body" htmlFor="datalake-bucket">
                Bucket
              </label>
              <Select id="datalake-bucket" onChange={(event) => setSelectedBucket(event.target.value)} value={selectedBucket}>
                <option value="">Todos</option>
                {bucketOptions.map((bucket) => (
                  <option key={bucket} value={bucket}>
                    {bucket}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-body" htmlFor="datalake-layer">
                Camada
              </label>
              <Select id="datalake-layer" onChange={(event) => setLayerFilter(event.target.value)} value={layerFilter}>
                <option value="">Todas</option>
                <option value="bronze">Bronze</option>
                <option value="silver">Silver</option>
                <option value="gold">Gold</option>
              </Select>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-body" htmlFor="datalake-status">
                Status
              </label>
              <Select id="datalake-status" onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}>
                <option value="">Todos</option>
                <option value="scanned">Com parquet</option>
                <option value="no_parquet">Sem parquet</option>
                <option value="empty">Vazio</option>
                <option value="error">Com erro</option>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-body" htmlFor="datalake-partitions">
                Partições
              </label>
              <Select id="datalake-partitions" onChange={(event) => setPartitionFilter(event.target.value)} value={partitionFilter}>
                <option value="">Todas</option>
                <option value="true">Com partição</option>
                <option value="false">Sem partição</option>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-body" htmlFor="datalake-parquet">
                Parquet
              </label>
              <Select id="datalake-parquet" onChange={(event) => setParquetFilter(event.target.value)} value={parquetFilter}>
                <option value="">Todos</option>
                <option value="true">Com parquet</option>
                <option value="false">Sem parquet</option>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-body" htmlFor="datalake-freshness">
                Atualização
              </label>
              <Select id="datalake-freshness" onChange={(event) => setFreshnessFilter(event.target.value)} value={freshnessFilter}>
                <option value="">Todas</option>
                <option value="recent">Atualizadas recentemente</option>
                <option value="stale">Sem atualização recente</option>
              </Select>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-body" htmlFor="datalake-sort-by">
                Ordenar por
              </label>
              <Select id="datalake-sort-by" onChange={(event) => setSortBy(event.target.value)} value={sortBy}>
                <option value="last_modified">Última atualização</option>
                <option value="name">Nome</option>
                <option value="volume">Volume</option>
                <option value="files_count">Quantidade de arquivos</option>
                <option value="layer">Camada</option>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-body" htmlFor="datalake-sort-dir">
                Direção
              </label>
              <Select id="datalake-sort-dir" onChange={(event) => setSortDir(event.target.value)} value={sortDir}>
                <option value="desc">Descendente</option>
                <option value="asc">Ascendente</option>
              </Select>
            </div>
            <div className="flex items-end justify-end">
          <Button disabled={isLoading} onClick={() => setReloading((current) => !current)} size="sm" variant="outline">
            <SearchIcon className="mr-2 h-4 w-4" />
            Atualizar lista
          </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/80 bg-surface shadow-card">
        <CardContent className="space-y-4 p-5">
          {catalogLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton className="h-28 w-full" key={index} />
              ))}
            </div>
          ) : catalogPage && catalogPage.items.length > 0 ? (
            <div className="space-y-3">
              {catalogPage.items.map((item) => (
                <div className="rounded-3xl border border-border bg-surface p-4 shadow-sm" key={item.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-base font-semibold text-text">{item.table_name}</h3>
                        <Badge tone="neutral">{item.layer}</Badge>
                        <Badge tone={formatStatusTone(item.status_scan)}>{formatStatusLabel(item.status_scan)}</Badge>
                        {item.has_partitions ? <Badge tone="accent">Particionado</Badge> : <Badge tone="neutral">Sem partição</Badge>}
                      </div>
                      <p className="mt-1 text-sm text-text-body">
                        <span className="font-medium text-text">{item.connection_name}</span> · {item.bucket}
                      </p>
                      <p className="mt-1 truncate text-sm text-muted">{item.path_base}</p>
                      <p className="mt-1 text-xs text-muted">
                        Última atualização: {formatDateTime(item.last_modified_at)} · Último scan: {formatDateTime(item.data_last_scan_at)}
                      </p>
                    </div>
                    <div className="text-right text-sm text-text-body">
                      <p className="font-medium text-text">{item.parquet_files_count} parquet(s)</p>
                      <p>{formatBytes(item.size_total_bytes)}</p>
                      <Button
                        className="mt-3"
                        onClick={() => router.push(`/datalakes/${item.id}`)}
                        size="sm"
                        variant="outline"
                      >
                        Ver detalhe
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-3 text-sm md:grid-cols-4">
                    <div className="rounded-2xl border border-border bg-bg-subtle px-4 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Arquivos</p>
                      <p className="mt-1 font-medium text-text">{item.files_count}</p>
                    </div>
                    <div className="rounded-2xl border border-border bg-bg-subtle px-4 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Volume</p>
                      <p className="mt-1 font-medium text-text">{formatBytes(item.size_total_bytes)}</p>
                    </div>
                    <div className="rounded-2xl border border-border bg-bg-subtle px-4 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Partição</p>
                      <p className="mt-1 font-medium text-text">{item.partition_pattern_detected || "Não detectada"}</p>
                    </div>
                    <div className="rounded-2xl border border-border bg-bg-subtle px-4 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Quality</p>
                      <p className="mt-1 font-medium text-text">{item.last_quality_score?.toFixed(1) ?? "N/D"}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
              <EmptyState
                title="Catálogo vazio"
                description="Nenhuma tabela do Data Lake foi encontrada para os filtros atuais."
                action={
                  <Button disabled={isLoading} onClick={() => setReloading((current) => !current)} size="sm" variant="outline">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Recarregar
                  </Button>
              }
            />
          )}

          {catalogPage ? (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4 text-sm text-text-body">
              <div>
                Página {catalogPage.page} de {pageCount}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button disabled={catalogPage.page <= 1 || isLoading} onClick={() => setPageIndex((current) => Math.max(1, current - 1))} size="sm" variant="outline">
                  Anterior
                </Button>
                <Button disabled={!catalogPage.has_more || isLoading} onClick={() => setPageIndex((current) => current + 1)} size="sm" variant="outline">
                  Próxima
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
