import { ChevronDown, ChevronRight, Database, Hash, Layers3, PanelLeftClose, PanelLeftOpen, Table2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";
import type { DataLakeCatalogTable } from "@/features/integrations/types";
import { formatDateTime } from "@/features/integrations/utils";

export type DataLakeTreeLayer = {
  layer: string;
  tables: DataLakeCatalogTable[];
};

export type DataLakeTreeBucket = {
  bucket: string;
  region: string;
  prefix: string | null;
  layers: DataLakeTreeLayer[];
};

export type DataLakeTreeConnection = {
  connectionId: number;
  connectionName: string;
  buckets: DataLakeTreeBucket[];
};

export function buildDataLakeTree(items: DataLakeCatalogTable[]): DataLakeTreeConnection[] {
  const connections = new Map<
    number,
    {
      connectionId: number;
      connectionName: string;
      buckets: Map<
        string,
        {
          bucket: string;
          region: string;
          prefix: string | null;
          layers: Map<string, DataLakeCatalogTable[]>;
        }
      >;
    }
  >();

  for (const item of items) {
    const connection = connections.get(item.connection_id) ?? {
      connectionId: item.connection_id,
      connectionName: item.connection_name,
      buckets: new Map(),
    };
    const bucketNode = connection.buckets.get(item.bucket) ?? {
      bucket: item.bucket,
      region: item.region,
      prefix: item.prefix,
      layers: new Map(),
    };
    const tables = bucketNode.layers.get(item.layer) ?? [];
    tables.push(item);
    bucketNode.layers.set(item.layer, tables);
    connection.buckets.set(item.bucket, bucketNode);
    connections.set(item.connection_id, connection);
  }

  return Array.from(connections.values())
    .sort((a, b) => a.connectionName.localeCompare(b.connectionName))
    .map((connection) => ({
      ...connection,
      buckets: Array.from(connection.buckets.values())
        .sort((a, b) => a.bucket.localeCompare(b.bucket))
        .map((bucket) => ({
          ...bucket,
          layers: Array.from(bucket.layers.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([layer, tables]) => ({
              layer,
              tables: [...tables].sort((a, b) => a.table_name.localeCompare(b.table_name)),
            })),
        })),
    }));
}

type DataLakeTreePanelProps = {
  loading: boolean;
  searchQuery: string;
  selectedTableId: number | null;
  tree: DataLakeTreeConnection[];
  treeCollapsed: boolean;
  expandedNodes: Record<string, boolean>;
  onOpenTable: (item: DataLakeCatalogTable) => void;
  onToggleNode: (key: string) => void;
  setTreeCollapsed: (updater: (current: boolean) => boolean) => void;
};

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

function trustTone(score: number | null | undefined): "neutral" | "accent" | "success" | "warning" {
  if (score == null) return "neutral";
  if (score >= 80) return "success";
  if (score >= 60) return "warning";
  return "accent";
}

function trustLabel(score: number | null | undefined): string {
  if (score == null) return "Sem score";
  if (score >= 80) return "Trust alto";
  if (score >= 60) return "Atenção";
  return "Crítico";
}

function highlightText(value: string, query: string) {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) return value;
  const lowerValue = value.toLowerCase();
  const lowerQuery = normalizedQuery.toLowerCase();
  const index = lowerValue.indexOf(lowerQuery);
  if (index < 0) return value;
  return (
    <>
      {value.slice(0, index)}
      <span className="rounded bg-warning-100 px-0.5 text-warning-700">{value.slice(index, index + normalizedQuery.length)}</span>
      {value.slice(index + normalizedQuery.length)}
    </>
  );
}

export function DataLakeTreePanel({
  loading,
  searchQuery,
  selectedTableId,
  tree,
  treeCollapsed,
  expandedNodes,
  onOpenTable,
  onToggleNode,
  setTreeCollapsed,
}: DataLakeTreePanelProps) {
  return (
    <Card className="h-[68vh] min-h-[520px] overflow-hidden border-border/80 shadow-[0_12px_40px_rgba(15,23,42,0.05)]" data-doc-anchor="datalakes-tree">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className={cn("min-w-0", treeCollapsed && "xl:hidden")}>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Datalakes</p>
            <h3 className="mt-1 text-sm font-semibold text-text">Árvore de conexões, buckets e ativos</h3>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="rounded-2xl bg-bg-subtle p-2 text-text-body">
              <Layers3 className="h-4 w-4" />
            </div>
            <Button onClick={() => setTreeCollapsed((current) => !current)} size="sm" variant="ghost">
              {treeCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className={cn("h-[calc(68vh-88px)] overflow-y-auto p-3", treeCollapsed && "xl:hidden")}>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton className="h-24 rounded-2xl" key={index} />
            ))}
          </div>
        ) : tree.length === 0 ? (
          <EmptyState
            className="shadow-none"
            title="Nenhuma tabela encontrada"
            description="Ajuste a busca ou os filtros para localizar conexões, buckets, camadas e tabelas inventariadas."
          />
        ) : (
          <div className="space-y-3 text-sm">
            {tree.map((connection) => {
              const connectionKey = `connection:${connection.connectionId}`;
              const connectionExpanded = expandedNodes[connectionKey] ?? true;
              return (
                <div className="rounded-2xl border border-border bg-bg-subtle/60 p-1.5" key={connectionKey}>
                  <button
                    className={cn(
                      "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition",
                      connectionExpanded ? "bg-surface shadow-sm ring-1 ring-slate-200" : "hover:bg-surface/80 hover:shadow-sm",
                    )}
                    onClick={() => onToggleNode(connectionKey)}
                    type="button"
                  >
                    <span className="text-muted transition group-hover:text-text-body">
                      {connectionExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </span>
                    <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-border bg-surface shadow-sm">
                      <Database className="h-5 w-5 text-text-body" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-text">{highlightText(connection.connectionName, searchQuery)}</p>
                      <p className="truncate text-xs text-muted">{connection.buckets.length} bucket(s)</p>
                    </div>
                    <Badge tone="neutral">Conexão</Badge>
                  </button>

                  {connectionExpanded ? (
                    <div className="mt-2 ml-4 space-y-2 border-l border-dashed border-border pl-4">
                      {connection.buckets.map((bucket) => {
                        const bucketKey = `${connectionKey}:bucket:${bucket.bucket}`;
                        const bucketExpanded = expandedNodes[bucketKey] ?? true;
                        return (
                          <div className="space-y-1" key={bucketKey}>
                            <button
                              className={cn(
                                "group flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition",
                                bucketExpanded ? "bg-surface shadow-sm ring-1 ring-slate-200" : "hover:bg-surface/80 hover:shadow-sm",
                              )}
                              onClick={() => onToggleNode(bucketKey)}
                              type="button"
                            >
                              <span className="text-muted transition group-hover:text-text-body">
                                {bucketExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                              </span>
                              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-bg-subtle text-text-body">
                                <Hash className="h-4 w-4" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-medium text-text-body">{highlightText(bucket.bucket, searchQuery)}</p>
                                <p className="text-xs text-muted">
                                  {bucket.region} {bucket.prefix ? `• ${bucket.prefix}` : ""}
                                </p>
                              </div>
                            </button>

                            {bucketExpanded ? (
                              <div className="ml-3 space-y-1 border-l border-dashed border-border pl-4">
                                {bucket.layers.map((layerGroup) => {
                                  const layerKey = `${bucketKey}:layer:${layerGroup.layer}`;
                                  const layerExpanded = expandedNodes[layerKey] ?? true;
                                  return (
                                    <div className="space-y-1" key={layerKey}>
                                      <button
                                        className={cn(
                                          "group flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition",
                                          layerExpanded ? "bg-surface shadow-sm ring-1 ring-slate-200" : "hover:bg-surface/80 hover:shadow-sm",
                                        )}
                                        onClick={() => onToggleNode(layerKey)}
                                        type="button"
                                      >
                                        <span className="text-muted transition group-hover:text-text-body">
                                          {layerExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                        </span>
                                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                                          <Layers3 className="h-4 w-4" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                          <p className="truncate font-medium text-text-body">{layerGroup.layer}</p>
                                          <p className="text-xs text-muted">{layerGroup.tables.length} tabela(s)</p>
                                        </div>
                                      </button>

                                      {layerExpanded ? (
                                        <div className="ml-3 space-y-1 border-l border-dashed border-border pl-4">
                                          {layerGroup.tables.map((item) => {
                                            const selected = item.id === selectedTableId;
                                            return (
                                              <button
                                                className={cn(
                                                  "group flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition",
                                                  selected
                                                    ? "bg-gradient-to-r from-accent-50 via-cyan-50 to-white text-info-700 ring-1 ring-info-200 shadow-sm"
                                                    : "hover:bg-surface/80 hover:shadow-sm",
                                                )}
                                                key={item.id}
                                                onClick={() => onOpenTable(item)}
                                                type="button"
                                              >
                                                <div
                                                  className={cn(
                                                    "flex h-8 w-8 items-center justify-center rounded-xl",
                                                    selected ? "bg-info-100 text-info-700" : "bg-bg-subtle text-text-body",
                                                  )}
                                                >
                                                  <Table2 className="h-4 w-4" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                  <div className="flex flex-wrap items-center gap-2">
                                                    <p className="truncate font-medium">{highlightText(item.table_name, searchQuery)}</p>
                                                    <Badge tone={trustTone(item.last_quality_score)}>
                                                      {trustLabel(item.last_quality_score)}
                                                      {item.last_quality_score != null ? ` ${item.last_quality_score.toFixed(1)}` : ""}
                                                    </Badge>
                                                    {item.has_partitions ? <Badge tone="accent">Particionada</Badge> : null}
                                                    {item.parquet_files_count > 0 ? <Badge tone="success">Parquet</Badge> : <Badge tone="warning">Sem parquet</Badge>}
                                                    {item.criticality ? (
                                                      <Badge tone={item.criticality === "critical" || item.criticality === "high" ? "warning" : "neutral"}>
                                                        {item.criticality}
                                                      </Badge>
                                                    ) : null}
                                                  </div>
                                                  <p className="truncate text-xs text-muted">{item.path_base}</p>
                                                  <p className="mt-1 text-[11px] text-muted">
                                                    {item.parquet_files_count} parquet • {formatBytes(item.size_total_bytes)} • {formatDateTime(item.last_modified_at)}
                                                  </p>
                                                </div>
                                              </button>
                                            );
                                          })}
                                        </div>
                                      ) : null}
                                    </div>
                                  );
                                })}
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
