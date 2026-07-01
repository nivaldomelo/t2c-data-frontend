import { useMemo } from "react";
import type { Edge, Node } from "reactflow";
import { BarChart3, BookOpen, Table as TableIcon, Tags as TagsIcon } from "lucide-react";

import type { LineageFlowNodeData } from "@/components/lineage/lineage-flow-canvas";
import type {
  DatasourceNode,
  DQLatest,
  DbType,
  SchemaNode,
  TableColumn,
  TableDetailInfo,
  TableColumnSummary,
} from "@/features/explorer/types";
import { formatCompactNumber, formatPercent, preferredColumnDescription } from "@/features/explorer/utils";

type ExplorerDerivedStateParams = {
  breadcrumb: string[];
  columns: TableColumn[];
  columnSummary: TableColumnSummary | null;
  datasources: DatasourceNode[];
  dqLatest: DQLatest | null;
  dqState: "idle" | "loading" | "ready" | "empty" | "error";
  query: string;
  selectedDbType: DbType | null;
  selectedTableName: string;
  tableInfo: TableDetailInfo | null;
  taxonomyManagement: {
    hasUnsavedChanges: boolean;
    tableTags: Array<{ id: number; name: string; slug: string }>;
    tableTerms: Array<{ id: number; name: string }>;
  };
  lineageManagement: {
    lineageSpec: {
      upstreams?: unknown[];
      downstreams?: unknown[];
      process?: { name?: string | null } | null;
    } | null;
    lineageSummary: {
      impact: { direct_dependencies_count: number };
      graph_nodes: Array<{
        id: string;
        kind: string;
        label: string;
        layer: string | null;
        subtitle: string | null;
        node_type: string | null;
        asset_type: string | null;
        lineage_origin: "manual" | "automatic" | "merged";
        catalog_table_id: number | null;
        database_engine: string | null;
        source_type: string | null;
        process_type: string | null;
      }>;
      graph_edges: Array<{
        id: string;
        source: string;
        target: string;
        relation_type: string;
      }>;
    } | null;
  };
};

export function useExplorerDerivedState({
  breadcrumb,
  columns,
  columnSummary,
  datasources,
  dqLatest,
  dqState,
  query,
  selectedDbType,
  selectedTableName,
  tableInfo,
  taxonomyManagement,
  lineageManagement,
}: ExplorerDerivedStateParams) {
  const queryLower = query.trim().toLowerCase();

  const filteredTree = useMemo(() => {
    if (!queryLower) return datasources;
    return datasources
      .map((datasource) => {
        const datasourceMatch = datasource.name.toLowerCase().includes(queryLower);
        const schemas = (datasource.schemas || [])
          .map((schema) => {
            const schemaMatch = schema.name.toLowerCase().includes(queryLower);
            const tables = (schema.tables || []).filter((table) => table.name.toLowerCase().includes(queryLower));
            if (schemaMatch || tables.length > 0) {
              return { ...schema, expanded: true, tables };
            }
            return null;
          })
          .filter(Boolean) as SchemaNode[];

        if (datasourceMatch || schemas.length > 0) {
          return { ...datasource, expanded: true, schemas };
        }
        return null;
      })
      .filter(Boolean) as DatasourceNode[];
  }, [datasources, queryLower]);

  const selectedTableFullName = useMemo(() => {
    if (selectedDbType === "mongodb" && breadcrumb.length >= 4 && breadcrumb[2] === "default") {
      return `${breadcrumb[1]}.${breadcrumb[3]}`;
    }
    if (breadcrumb.length >= 4) return `${breadcrumb[2]}.${breadcrumb[3]}`;
    return selectedTableName;
  }, [breadcrumb, selectedDbType, selectedTableName]);

  const selectedDatabaseName = breadcrumb[1] || "-";
  const selectedSchemaName = breadcrumb[2] || "-";
  const tableDescription = tableInfo?.description_manual || tableInfo?.description_source || null;
  const rowCountMetrics = tableInfo?.row_count_metrics ?? null;
  const hasUnsavedChanges = taxonomyManagement.hasUnsavedChanges;
  const headerTags = taxonomyManagement.tableTags.slice(0, 3);
  const headerTerms = taxonomyManagement.tableTerms.slice(0, 3);
  const extraTags = Math.max(0, taxonomyManagement.tableTags.length - headerTags.length);
  const extraTerms = Math.max(0, taxonomyManagement.tableTerms.length - headerTerms.length);
  const lineageUpstreams = Array.isArray(lineageManagement.lineageSpec?.upstreams) ? lineageManagement.lineageSpec.upstreams : [];
  const lineageDownstreams = Array.isArray(lineageManagement.lineageSpec?.downstreams) ? lineageManagement.lineageSpec.downstreams : [];
  const hasLineageProcess = Boolean(lineageManagement.lineageSpec?.process?.name?.trim());
  const hasSavedLineage =
    (lineageManagement.lineageSummary?.impact.direct_dependencies_count || 0) > 0 ||
    hasLineageProcess ||
    lineageUpstreams.length > 0 ||
    lineageDownstreams.length > 0;

  const documentedColumns = useMemo(
    () => columns.filter((column) => Boolean(preferredColumnDescription(column))),
    [columns],
  );
  const commentedColumns = useMemo(
    () => columns.filter((column) => Boolean(column.dictionary_comment || column.existing_comment)),
    [columns],
  );
  const primaryKeyColumns = useMemo(() => columns.filter((column) => column.is_primary_key), [columns]);
  const requiredColumns = useMemo(() => columns.filter((column) => !column.is_nullable), [columns]);
  const nullableColumns = useMemo(() => columns.filter((column) => column.is_nullable), [columns]);
  const totalColumns = columnSummary?.total ?? columns.length;
  const documentedCount = columnSummary?.documented ?? documentedColumns.length;
  const commentedCount = columnSummary?.commented ?? commentedColumns.length;
  const primaryKeyCount = columnSummary?.primary_keys ?? primaryKeyColumns.length;
  const requiredCount = columnSummary?.required ?? requiredColumns.length;
  const nullableCount = columnSummary?.nullable ?? nullableColumns.length;
  const dictionaryCoveragePct = totalColumns > 0 ? Math.round((documentedCount / totalColumns) * 100) : 0;
  const glossaryCoveragePct = totalColumns > 0 ? Math.round((commentedCount / totalColumns) * 100) : 0;

  const summaryColumnsPreview = useMemo(
    () => {
      if (columnSummary?.preview?.length) {
        return columnSummary.preview;
      }
      return [...columns]
        .sort(
          (left, right) =>
            Number(right.is_primary_key) - Number(left.is_primary_key) || left.ordinal_position - right.ordinal_position,
        )
        .slice(0, 6);
    },
    [columnSummary, columns],
  );

  const summaryStats = useMemo(
    () => [
      {
        title: "Colunas",
        value: String(totalColumns),
        subtitle: `${requiredCount} obrigatórias`,
        icon: TableIcon,
        accent: "from-slate-50 via-accent-50 to-white",
        border: "border-info-200/80",
        iconClassName: "bg-info-100 text-info-700",
      },
      {
        title: "Cobertura do dicionário",
        value: `${dictionaryCoveragePct}%`,
        subtitle: `${documentedCount} descritas`,
        icon: BookOpen,
        accent: "from-emerald-50 via-teal-50 to-white",
        border: "border-success-200/80",
        iconClassName: "bg-success-100 text-success-700",
      },
      {
        title: "Classificações",
        value: String(taxonomyManagement.tableTags.length),
        subtitle: `${taxonomyManagement.tableTerms.length} termos relacionados`,
        icon: TagsIcon,
        accent: "from-violet-50 via-fuchsia-50 to-white",
        border: "border-violet-200/80",
        iconClassName: "bg-violet-100 text-violet-700",
      },
      {
        title: "Qualidade",
        value: dqLatest ? `${dqLatest.dq_score.toFixed(1)}` : "-",
        subtitle: dqLatest
          ? `${dqLatest.failed_rules} issues na última leitura`
          : dqState === "loading"
            ? "Carregando DQ"
            : "Sem snapshot DQ",
        icon: BarChart3,
        accent: "from-blue-50 via-cyan-50 to-white",
        border: "border-blue-200/80",
        iconClassName: "bg-blue-100 text-blue-700",
      },
      {
        title: "Linhas",
        value: rowCountMetrics?.current_row_count !== null && rowCountMetrics?.current_row_count !== undefined
          ? formatCompactNumber(rowCountMetrics.current_row_count)
          : "—",
        subtitle:
          rowCountMetrics?.current_row_count !== null && rowCountMetrics?.current_row_count !== undefined
            ? rowCountMetrics.growth_absolute !== null && rowCountMetrics.growth_absolute !== undefined
              ? rowCountMetrics.growth_percent !== null && rowCountMetrics.growth_percent !== undefined
                ? `${formatPercent(rowCountMetrics.growth_percent)} vs anterior`
                : `${formatCompactNumber(rowCountMetrics.growth_absolute)} de variação`
              : rowCountMetrics.has_history
                ? "Sem variação ainda"
                : "Sem snapshots coletados"
            : "Sem snapshots coletados",
        icon: TableIcon,
        accent: "from-amber-50 via-orange-50 to-white",
        border: "border-warning-200/80",
        iconClassName: "bg-warning-100 text-warning-700",
      },
    ],
    [
      totalColumns,
      dictionaryCoveragePct,
      documentedCount,
      dqLatest,
      dqState,
      requiredCount,
      rowCountMetrics?.current_row_count,
      rowCountMetrics?.growth_absolute,
      rowCountMetrics?.growth_percent,
      rowCountMetrics?.has_history,
      taxonomyManagement.tableTags.length,
      taxonomyManagement.tableTerms.length,
    ],
  );

  const flowNodes = useMemo<Node<LineageFlowNodeData>[]>(() => {
    if (!lineageManagement.lineageSummary || !hasSavedLineage) return [];
    return lineageManagement.lineageSummary.graph_nodes.map((node) => ({
      id: node.id,
      type: "lineageNode",
      position: { x: 0, y: 0 },
      data: {
        kind:
          node.kind === "current"
            ? "current"
            : node.kind === "process"
              ? "process"
              : node.kind === "dashboard"
                ? "dashboard"
                : node.kind === "source"
                  ? "source"
                  : "target",
        title: node.label,
        subtitle: [node.layer, node.subtitle].filter(Boolean).join(" • "),
        lines: [node.node_type || node.asset_type || undefined, node.subtitle || undefined].filter(Boolean) as string[],
        layer: node.layer,
        nodeType: node.node_type || node.asset_type,
        lineageOrigin: node.lineage_origin,
        catalogTableId: node.catalog_table_id,
        databaseEngine: node.database_engine,
        sourceType: node.source_type,
        processType: node.process_type,
      },
    }));
  }, [hasSavedLineage, lineageManagement.lineageSummary]);

  const flowEdges = useMemo<Edge[]>(() => {
    if (!lineageManagement.lineageSummary || !hasSavedLineage) return [];
    return lineageManagement.lineageSummary.graph_edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      animated: edge.relation_type === "consumption",
      data: { relationType: edge.relation_type },
    }));
  }, [hasSavedLineage, lineageManagement.lineageSummary]);

  return {
    columnCounts: {
      total: totalColumns,
      documented: documentedCount,
      commented: commentedCount,
      primaryKeys: primaryKeyCount,
      required: requiredCount,
      nullable: nullableCount,
    },
    dictionaryCoveragePct,
    extraTags,
    extraTerms,
    filteredTree,
    flowEdges,
    flowNodes,
    glossaryCoveragePct,
    hasLineageProcess,
    hasSavedLineage,
    hasUnsavedChanges,
    headerTags,
    headerTerms,
    selectedDatabaseName,
    selectedSchemaName,
    selectedTableFullName,
    summaryColumnsPreview,
    summaryStats,
    tableDescription,
  };
}
