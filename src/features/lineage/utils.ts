import type { Edge, Node } from "reactflow";

import type { LineageFlowNodeData } from "@/components/lineage/lineage-flow-canvas";

import type {
  LineageAssetRef,
  LineageAssetListItem,
  LineageRelationListResponse,
  LineageSummary,
  RelationFormSide,
} from "./types";

export const EMPTY_SIDE = (): RelationFormSide => ({
  mode: "candidate",
  assetId: null,
  catalogTableId: null,
  label: "",
  manual: {
    asset_name: "",
    asset_type: "table",
    layer: "gold",
    schema_name: "",
    object_name: "",
    system_name: "",
    description: "",
  },
});

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export function assetDisplayName(asset: LineageAssetRef): string {
  if (asset.schema_name && asset.object_name) return `${asset.schema_name}.${asset.object_name}`;
  if (asset.object_name) return asset.object_name;
  return asset.asset_name;
}

export function explorerHrefFromAsset(asset: LineageAssetRef): string | null {
  if (!asset.catalog_table_id) return null;
  return `/explorer?tableId=${asset.catalog_table_id}&tab=lineage`;
}

export function buildLineageAssets(list: LineageRelationListResponse | null): LineageAssetListItem[] {
  if (!list) return [];
  const assetMap = new Map<string, LineageAssetListItem>();

  const mergeOrigin = (
    current: "manual" | "automatic" | "merged",
    next: "manual" | "automatic" | "merged",
  ): "manual" | "automatic" | "merged" => {
    if (current === next) return current;
    if (current === "merged" || next === "merged") return "merged";
    return "merged";
  };

  const upsertAsset = (asset: LineageAssetRef, relation: LineageRelationListResponse["items"][number]) => {
    if (!["table", "view", "dashboard", "question", "source", "job", "incident", "certification", "dq_rule"].includes(asset.asset_type)) return;
    const key = asset.catalog_table_id
      ? `table-${asset.catalog_table_id}`
      : asset.schema_name && asset.object_name
        ? `logical-${asset.asset_type}-${asset.layer}-${asset.schema_name}-${asset.object_name}`
        : asset.id
          ? `asset-${asset.id}`
          : asset.asset_key;
    const existing = assetMap.get(key);
    if (existing) {
      existing.relation_count += 1;
      existing.updated_at = existing.updated_at > relation.updated_at ? existing.updated_at : relation.updated_at;
      existing.lineage_origin = mergeOrigin(existing.lineage_origin, relation.lineage_origin);
      return;
    }
    assetMap.set(key, {
      key,
      asset,
      lineage_origin: relation.lineage_origin,
      relation_count: 1,
      updated_at: relation.updated_at,
    });
  };

  list.items.forEach((relation) => {
    upsertAsset(relation.source_asset, relation);
    upsertAsset(relation.target_asset, relation);
  });

  return Array.from(assetMap.values()).sort((left, right) => assetDisplayName(left.asset).localeCompare(assetDisplayName(right.asset)));
}

export function buildFlowNodes(summary: LineageSummary | null): Node<LineageFlowNodeData>[] {
  if (!summary) return [];
  return summary.graph_nodes.map((node) => ({
    id: node.id,
    type: "lineageNode",
    position: { x: 0, y: 0 },
    data: {
      assetId: node.asset_id,
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
}

export function buildFlowEdges(summary: LineageSummary | null): Edge[] {
  if (!summary) return [];
  return summary.graph_edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    animated: edge.relation_type === "consumption" || edge.relation_type === "consumed_by",
    data: {
      relationType: edge.relation_type,
      confidenceScore: edge.confidence_score ?? null,
      confidenceTier: edge.confidence_tier ?? null,
      isVerified: edge.is_verified ?? null,
      version: edge.version ?? null,
      evidence: edge.evidence ?? null,
    },
  }));
}
