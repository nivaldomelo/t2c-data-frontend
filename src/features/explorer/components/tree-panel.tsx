import { ChevronDown, ChevronRight, Layers, PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { CertificationStatusBadge, certificationStatusFrameClass } from "@/components/certification/certification-badge";
import { TagBadgeList } from "@/components/tags/tag-badges";
import { cn } from "@/lib/cn";
import { dbEngineMeta } from "@/lib/database-engine";

import type { DatasourceNode, DbType, SchemaNode, TableKind } from "../types";
import { NodeIcon, highlightText, isMongoDefaultSchema, tableKindLabel } from "../utils";

type ExplorerTreePanelProps = {
  filteredTree: DatasourceNode[];
  query: string;
  selectedTableId: number | null;
  selectedTableCertificationStatus?: string | null;
  selectTable: (tableId: number, tableName: string, path: string[], kind?: TableKind, dbType?: DbType, datasourceId?: number) => Promise<void>;
  status: string;
  toggleDatasource: (datasourceId: number) => Promise<void>;
  toggleSchema: (datasourceId: number, schemaId: number) => Promise<void>;
  loadMoreSchemaTables: (datasourceId: number, schemaId: number) => Promise<void>;
  treeCollapsed: boolean;
  setTreeCollapsed: (updater: (current: boolean) => boolean) => void;
};

export function ExplorerTreePanel({
  filteredTree,
  query,
  selectedTableId,
  selectedTableCertificationStatus,
  selectTable,
  toggleDatasource,
  toggleSchema,
  loadMoreSchemaTables,
  treeCollapsed,
  setTreeCollapsed,
}: ExplorerTreePanelProps) {
  return (
    <Card
      className="h-[68vh] min-h-[520px] overflow-hidden border-border/80 shadow-[0_12px_40px_rgba(15,23,42,0.05)]"
      data-doc-anchor="explorer-tree"
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className={cn("min-w-0", treeCollapsed && "xl:hidden")}>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Explorer</p>
            <h3 className="mt-1 text-sm font-semibold text-text">Árvore de bancos e ativos</h3>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="rounded-2xl bg-bg-subtle p-2 text-text-body">
              <Layers className="h-4 w-4" />
            </div>
            <Button onClick={() => setTreeCollapsed((current) => !current)} size="sm" variant="ghost">
              {treeCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className={cn("h-[calc(68vh-88px)] overflow-y-auto p-3", treeCollapsed && "xl:hidden")}>
        {filteredTree.length === 0 ? (
          <EmptyState
            className="shadow-none"
            title="Nenhum ativo encontrado"
            description="Execute uma varredura ou ajuste a busca do Explorer para localizar bancos, schemas e tabelas."
          />
        ) : (
          <div className="space-y-2 text-sm">
            {filteredTree.map((ds) => (
              <div className="rounded-2xl border border-border bg-bg-subtle/60 p-1.5" key={ds.id}>
                <button
                  aria-label={`Toggle datasource ${ds.name}`}
                  className={cn(
                    "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition",
                    ds.expanded ? "bg-surface shadow-sm ring-1 ring-slate-200" : "hover:bg-surface/80 hover:shadow-sm",
                  )}
                  onClick={() => void toggleDatasource(ds.id)}
                  type="button"
                >
                  <span className="text-muted transition group-hover:text-text-body">
                    {ds.expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </span>
                  <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-border bg-surface shadow-sm">
                    <NodeIcon className="h-5 w-5" kind={ds.db_type} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-text">{highlightText(ds.name, query)}</p>
                    <p className="truncate text-xs text-muted">
                      {dbEngineMeta(ds.db_type).label} • {ds.database_name}
                    </p>
                  </div>
                  <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-medium", dbEngineMeta(ds.db_type).chipClassName)}>
                    {dbEngineMeta(ds.db_type).label}
                  </span>
                </button>

                {ds.expanded ? (
                  <div className="mt-2 ml-4">
                    <div className="mb-2 flex items-center gap-2 rounded-xl bg-surface px-3 py-2 text-xs text-muted shadow-sm ring-1 ring-slate-200">
                      <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-bg-subtle text-text-body">
                        <NodeIcon className="h-4 w-4" kind="database" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-text-body">{ds.database_name}</p>
                        <p className="text-[11px] text-muted">Banco</p>
                      </div>
                    </div>
                    {ds.loading ? <Skeleton className="h-8 w-full" /> : null}

                    <div className="space-y-1 border-l border-dashed border-border pl-4">
                      {(ds.schemas || []).map((schema) => (
                        <ExplorerTreeSchemaNode
                          ds={ds}
                          key={schema.id}
                          query={query}
                          schema={schema}
                          selectedTableId={selectedTableId}
                          selectedTableCertificationStatus={selectedTableCertificationStatus}
                          selectTable={selectTable}
                          toggleSchema={toggleSchema}
                          loadMoreSchemaTables={loadMoreSchemaTables}
                        />
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

type ExplorerTreeSchemaNodeProps = {
  ds: DatasourceNode;
  query: string;
  schema: SchemaNode;
  selectedTableId: number | null;
  selectedTableCertificationStatus?: string | null;
  selectTable: (tableId: number, tableName: string, path: string[], kind?: TableKind, dbType?: DbType, datasourceId?: number) => Promise<void>;
  toggleSchema: (datasourceId: number, schemaId: number) => Promise<void>;
  loadMoreSchemaTables: (datasourceId: number, schemaId: number) => Promise<void>;
};

function ExplorerTreeSchemaNode({
  ds,
  query,
  schema,
  selectedTableId,
  selectedTableCertificationStatus,
  selectTable,
  toggleSchema,
  loadMoreSchemaTables,
}: ExplorerTreeSchemaNodeProps) {
  return (
    <div className="space-y-1">
      <button
        aria-label={`Toggle schema ${schema.name}`}
        className={cn(
          "group flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition",
          schema.expanded ? "bg-surface shadow-sm ring-1 ring-slate-200" : "hover:bg-surface/80 hover:shadow-sm",
        )}
        onClick={() => void toggleSchema(ds.id, schema.id)}
        type="button"
      >
        <span className="text-muted transition group-hover:text-text-body">
          {schema.expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </span>
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
          <NodeIcon className="h-4 w-4" kind="schema" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-text-body">
            {highlightText(isMongoDefaultSchema(ds.db_type, schema.name) ? "Coleções" : schema.name, query)}
          </p>
          <p className="text-xs text-muted">
            {isMongoDefaultSchema(ds.db_type, schema.name) ? "Coleções" : "Schema"}
          </p>
        </div>
      </button>

      {schema.expanded ? (
        <div className="ml-3 mb-1 space-y-1 border-l border-dashed border-border pl-4">
          {schema.loading ? <Skeleton className="h-8 w-full" /> : null}
          {(schema.tables || []).map((table) => {
            const isSelected = selectedTableId === table.id;
            const isCertified = isSelected && selectedTableCertificationStatus === "certified";

            return (
              <button
                className={cn(
                  "group flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition",
                  isCertified ? certificationStatusFrameClass(selectedTableCertificationStatus) : null,
                  isSelected
                    ? "bg-gradient-to-r from-accent-50 via-cyan-50 to-white text-info-700 ring-1 ring-info-200 shadow-sm"
                    : "hover:bg-surface/80 hover:shadow-sm",
                )}
                key={table.id}
                onClick={() =>
                  void selectTable(table.id, table.name, [ds.name, ds.database_name, schema.name, table.name], table.kind, ds.db_type, ds.id)
                }
                type="button"
              >
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-xl",
                    isSelected ? "bg-info-100 text-info-700" : "bg-bg-subtle text-text-body",
                  )}
                >
                  <NodeIcon className="h-4 w-4" kind={table.kind} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-medium">{highlightText(table.name, query)}</p>
                  </div>
                  <p className="text-xs text-muted">
                    {tableKindLabel(table.kind)} • {ds.db_type === "mongodb" && schema.name === "default" ? "Coleções" : schema.name}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {table.certification_status ? <CertificationStatusBadge className="scale-[0.88]" status={table.certification_status} /> : null}
                    {table.readiness_score != null ? (
                      <Badge tone={table.readiness_score >= 80 ? "success" : table.readiness_score >= 50 ? "accent" : "neutral"}>
                        Prontidão {table.readiness_score}%
                      </Badge>
                    ) : null}
                    {table.active_dq_violation ? <Badge tone="warning">DQ ativa</Badge> : null}
                  </div>
                  {table.governance_score != null ? (
                    <p className="mt-1 text-[11px] text-muted">
                      {table.governance_label} · {table.governance_score} pts
                    </p>
                  ) : null}
                  {table.tags?.length ? <TagBadgeList className="mt-2" maxVisible={2} tags={table.tags} /> : null}
                </div>
                {isSelected ? (
                  <span className="rounded-full bg-info-100 px-2 py-0.5 text-[11px] font-semibold text-info-700">
                    Selecionada
                  </span>
                ) : null}
              </button>
            );
          })}
          {schema.tablesHasMore ? (
            <div className="pt-2">
              <Button
                className="w-full"
                disabled={schema.tablesLoadingMore}
                onClick={() => void loadMoreSchemaTables(ds.id, schema.id)}
                size="sm"
                variant="ghost"
              >
                {schema.tablesLoadingMore ? "Carregando..." : "Carregar mais tabelas"}
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
