import { ChevronDown, ChevronRight, FileStack, FolderTree, Layers3, PanelLeftClose, PanelLeftOpen, Table as TableIcon } from "lucide-react";

import { CertificationStatusBadge } from "@/components/certification/certification-badge";
import { DatabaseTechLogo } from "@/components/database-tech-logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";
import { dbEngineMeta } from "@/lib/database-engine";

import type { DatasourceNode, DbType } from "../types";

type CatalogTreePanelProps = {
  nodes: DatasourceNode[];
  treeCollapsed: boolean;
  selectedTableId: number | null;
  onToggleCollapsed: () => void;
  onToggleDatasource: (index: number) => void;
  onToggleSchema: (datasourceIndex: number, schemaIndex: number) => void;
  onSelectTable: (tableId: number, tableName: string, context: { datasourceName: string; databaseName: string; schemaName: string; dbType: DbType }) => void;
};

export function CatalogTreePanel({
  nodes,
  treeCollapsed,
  selectedTableId,
  onToggleCollapsed,
  onToggleDatasource,
  onToggleSchema,
  onSelectTable,
}: CatalogTreePanelProps) {
  return (
    <Card className="h-fit overflow-hidden border-border/80 bg-surface shadow-card">
      <CardHeader className="border-b border-border/70 bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_58%,#eef6ff_100%)]">
        <div className="flex items-center justify-between gap-3">
          <div className={cn("min-w-0", treeCollapsed && "xl:hidden")}>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Catálogo DQ</p>
            <p className="mt-1 text-sm font-semibold text-text">Árvore de bancos e tabelas</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="rounded-2xl bg-brand-50 p-2 text-brand-700">
              <Layers3 className="h-4 w-4" />
            </div>
            <Button onClick={onToggleCollapsed} size="sm" variant="ghost">
              {treeCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className={cn("space-y-2 p-3", treeCollapsed && "xl:hidden")}>
        {nodes.map((ds, i) => (
          <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-1.5 shadow-sm" key={ds.id}>
            <button
              aria-label={`Toggle datasource ${ds.name}`}
              className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${
                ds.expanded ? "border border-border/80 bg-surface shadow-sm" : "hover:border hover:border-border/60 hover:bg-surface/80 hover:shadow-sm"
              }`}
              onClick={() => onToggleDatasource(i)}
              type="button"
            >
              <span className="text-muted transition group-hover:text-text-body">
                {ds.expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-border/80 bg-surface shadow-sm">
                <DatabaseTechLogo engine={ds.db_type} variant="compact" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-text">{ds.name}</p>
                <p className="truncate text-xs text-muted">{dbEngineMeta(ds.db_type).label} • {ds.database}</p>
              </div>
              <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${dbEngineMeta(ds.db_type).chipClassName}`}>
                {dbEngineMeta(ds.db_type).label}
              </span>
            </button>
            {ds.expanded && ds.loading ? <Skeleton className="mt-2 h-10 w-full rounded-xl" /> : null}
            {ds.expanded && ds.schemas ? (
              <div className="mt-2 ml-4 space-y-1 border-l border-dashed border-border pl-4">
                {ds.schemas.map((schema, j) => (
                  <div className="space-y-1" key={schema.id}>
                    <button
                      aria-label={`Toggle schema ${schema.name}`}
                      className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition-all duration-200 ease-out ${
                        schema.expanded ? "border border-border/80 bg-surface shadow-sm" : "hover:border hover:border-border/60 hover:bg-surface/80 hover:shadow-sm"
                      }`}
                      onClick={() => onToggleSchema(i, j)}
                      type="button"
                    >
                      <span className="text-muted transition group-hover:text-text-body">
                        {schema.expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </span>
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-info-50 text-info-700">
                          <FolderTree className="h-4 w-4" />
                        </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-text-body">{schema.name}</p>
                        <p className="text-xs text-muted">Schema</p>
                      </div>
                    </button>
                    {schema.expanded && schema.loading ? <Skeleton className="ml-3 mt-2 h-8 w-full rounded-xl" /> : null}
                    {schema.expanded && schema.tables ? (
              <div className="ml-3 space-y-1 border-l border-dashed border-border pl-4">
                        {schema.tables.map((table) => (
                          <button
                            className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition ${
                              selectedTableId === table.id
                              ? "border border-brand-200/80 bg-gradient-to-r from-brand-50 via-white to-accent-50 text-brand-800 shadow-sm"
                                : "hover:border hover:border-border/60 hover:bg-surface/80 hover:shadow-sm"
                            }`}
                            key={table.id}
                            onClick={() =>
                              onSelectTable(table.id, `${schema.name}.${table.name}`, {
                                datasourceName: ds.name,
                                databaseName: ds.database,
                                schemaName: schema.name,
                                dbType: ds.db_type,
                              })
                            }
                            type="button"
                          >
                            <div
                              className={`flex h-8 w-8 items-center justify-center rounded-xl ${
                              selectedTableId === table.id ? "bg-brand-100 text-brand-700" : "bg-bg-subtle text-text-body"
                            }`}
                            >
                              {table.kind === "view" ? <FileStack className="h-4 w-4" /> : <TableIcon className="h-4 w-4" />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-medium">{table.name}</p>
                              <p className="text-xs text-muted">{table.kind === "view" ? "View" : "Table"} • {schema.name}</p>
                              <div className="mt-1 flex flex-wrap gap-1.5">
                                {table.certification_status ? <CertificationStatusBadge className="scale-[0.88]" status={table.certification_status} /> : null}
                                {table.readiness_score != null ? (
                                  <Badge tone={table.readiness_score >= 80 ? "success" : table.readiness_score >= 50 ? "accent" : "neutral"}>
                                    Prontidão para uso {table.readiness_score}%
                                  </Badge>
                                ) : null}
                                {table.active_dq_violation ? <Badge tone="warning">DQ ativa</Badge> : null}
                              </div>
                            </div>
                            {selectedTableId === table.id ? (
                              <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[11px] font-semibold text-brand-700">Selecionada</span>
                            ) : null}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
