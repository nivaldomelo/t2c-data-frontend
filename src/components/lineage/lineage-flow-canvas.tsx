import dagre from "dagre";
import { MouseEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Boxes, Cloud, Database, FolderArchive, Network, RotateCcw, Search, Sparkles, Workflow, ZoomIn, ZoomOut } from "lucide-react";
import ReactFlow, {
  Background,
  Controls,
  Edge,
  EdgeProps,
  Handle,
  Node,
  NodeProps,
  Panel,
  Position,
  ReactFlowInstance,
  BaseEdge,
  MarkerType,
  getSmoothStepPath,
  MiniMap,
} from "reactflow";
import "reactflow/dist/style.css";

import { dbEngineMeta, normalizeDbEngine } from "@/lib/database-engine";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type LineageFlowNodeData = {
  kind: "source" | "process" | "current" | "target" | "dashboard";
  title: string;
  subtitle: string;
  lines: string[];
  assetId?: number | null;
  isSelected?: boolean;
  isFocused?: boolean;
  isPath?: boolean;
  isDimmed?: boolean;
  iconSrc?: string;
  iconAlt?: string;
  layer?: string | null;
  nodeType?: string | null;
  lineageOrigin?: "manual" | "automatic" | "merged";
  catalogTableId?: number | null;
  databaseEngine?: string | null;
  sourceType?: string | null;
  processType?: string | null;
};

const NODE_WIDTH = 260;
const NODE_HEIGHT = 132;
const HORIZONTAL_GAP = 320;
const TOP_PADDING = 30;
const LINEAGE_SUPPORTED_DATABASE_ENGINES = new Set([
  "postgres",
  "mysql",
  "mariadb",
  "sqlserver",
  "oracle",
  "snowflake",
  "bigquery",
  "redshift",
  "databricks",
  "sqlite",
]);

function originTone(origin: LineageFlowNodeData["lineageOrigin"]) {
  switch (origin) {
    case "automatic":
      return "border-info-200 bg-info-50 text-info-700";
    case "merged":
      return "border-violet-200 bg-violet-50 text-violet-700";
    default:
      return "border-border bg-bg-subtle text-text-body";
  }
}

function kindCardTone(kind: LineageFlowNodeData["kind"]) {
  switch (kind) {
    case "current":
      return "border-info-200 bg-gradient-to-br from-accent-50 via-white to-cyan-50 shadow-[0_12px_30px_-18px_rgba(14,116,144,0.45)]";
    case "process":
      return "border-violet-200 bg-gradient-to-br from-violet-50 via-white to-fuchsia-50";
    case "dashboard":
      return "border-success-200 bg-gradient-to-br from-emerald-50 via-white to-teal-50";
    case "source":
      return "border-warning-200 bg-gradient-to-br from-amber-50 via-white to-orange-50";
    default:
      return "border-border bg-surface";
  }
}

function relationEdgeColor(relationType: string | undefined) {
  switch (relationType) {
    case "consumption":
    case "consumed_by":
      return "#0f766e";
    case "load":
    case "loaded_to":
      return "#2563eb";
    case "ingestion":
    case "extracted_from":
      return "#b45309";
    case "transformation":
    case "transformed_to":
    case "derived_from":
      return "#7c3aed";
    case "validates":
      return "#059669";
    case "impacts":
      return "#dc2626";
    case "depends_on":
      return "#475569";
    default:
      return "#475569";
  }
}

function confidenceTone(confidenceTier: string | undefined, isVerified?: boolean | null) {
  if (confidenceTier === "strong" || isVerified) return "#0f766e";
  if (confidenceTier === "moderate") return "#b45309";
  return "#64748b";
}

function layerTone(layer: string | null | undefined) {
  switch (layer) {
    case "source":
      return "#f59e0b";
    case "bronze":
      return "#c2410c";
    case "silver":
      return "#64748b";
    case "gold":
      return "#d4a017";
    case "mart":
      return "#0f766e";
    case "dashboard":
      return "#059669";
    default:
      return "#94a3b8";
  }
}

function translateOrigin(origin: LineageFlowNodeData["lineageOrigin"]) {
  switch (origin) {
    case "automatic":
      return "Automática";
    case "merged":
      return "Mesclada";
    default:
      return "Manual";
  }
}

function normalizeSearchValue(value: string | null | undefined) {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function nodeMatchesSearch(node: Node<LineageFlowNodeData>, query: string) {
  const searchable = normalizeSearchValue(
    [
      node.data.title,
      node.data.subtitle,
      node.data.lines.join(" "),
      node.data.layer,
      node.data.nodeType,
      node.data.sourceType,
      node.data.processType,
      node.data.catalogTableId ? String(node.data.catalogTableId) : null,
    ]
      .filter(Boolean)
      .join(" "),
  );
  return searchable.includes(query);
}

function buildNeighborMap(edges: Edge[]) {
  const neighbors = new Map<string, Set<string>>();
  for (const edge of edges) {
    const source = neighbors.get(edge.source) ?? new Set<string>();
    source.add(edge.target);
    neighbors.set(edge.source, source);

    const target = neighbors.get(edge.target) ?? new Set<string>();
    target.add(edge.source);
    neighbors.set(edge.target, target);
  }
  return neighbors;
}

function buildDirectedNeighborMaps(edges: Edge[]) {
  const forward = new Map<string, Set<string>>();
  const reverse = new Map<string, Set<string>>();
  for (const edge of edges) {
    const source = forward.get(edge.source) ?? new Set<string>();
    source.add(edge.target);
    forward.set(edge.source, source);

    const target = reverse.get(edge.target) ?? new Set<string>();
    target.add(edge.source);
    reverse.set(edge.target, target);
  }
  return { forward, reverse };
}

function collectWithinDepth(seeds: string[], neighbors: Map<string, Set<string>>, depth: number) {
  const visited = new Set<string>(seeds);
  if (!seeds.length) return visited;
  if (depth === Number.POSITIVE_INFINITY) {
    const queue = [...seeds];
    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) continue;
      for (const next of Array.from(neighbors.get(current) ?? [])) {
        if (visited.has(next)) continue;
        visited.add(next);
        queue.push(next);
      }
    }
    return visited;
  }
  const queue: Array<{ id: string; depth: number }> = seeds.map((id) => ({ id, depth: 0 }));
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || current.depth >= depth) continue;
    for (const next of Array.from(neighbors.get(current.id) ?? [])) {
      if (visited.has(next)) continue;
      visited.add(next);
      queue.push({ id: next, depth: current.depth + 1 });
    }
  }
  return visited;
}

function collectDirectionalDepth(seeds: string[], neighbors: Map<string, Set<string>>, depth: number) {
  return collectWithinDepth(seeds, neighbors, depth);
}

function shortestPath(startId: string, endId: string, neighbors: Map<string, Set<string>>) {
  if (startId === endId) return [startId];
  const queue = [startId];
  const seen = new Set<string>([startId]);
  const parent = new Map<string, string | null>();
  parent.set(startId, null);

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;
    for (const next of Array.from(neighbors.get(current) ?? [])) {
      if (seen.has(next)) continue;
      seen.add(next);
      parent.set(next, current);
      if (next === endId) {
        const path = [endId];
        let cursor: string | null = current;
        while (cursor) {
          path.push(cursor);
          cursor = parent.get(cursor) || null;
        }
        return path.reverse();
      }
      queue.push(next);
    }
  }
  return [];
}

function labelsForPath(pathIds: string[], edges: Edge[]) {
  const ids = new Set<string>();
  if (pathIds.length < 2) return ids;
  for (let index = 1; index < pathIds.length; index += 1) {
    const source = pathIds[index - 1];
    const target = pathIds[index];
    const edge = edges.find((candidate) => (candidate.source === source && candidate.target === target) || (candidate.source === target && candidate.target === source));
    if (edge) ids.add(edge.id);
  }
  return ids;
}

function matchesLayerFilter(node: Node<LineageFlowNodeData>, layerFilter: string) {
  if (!layerFilter || layerFilter === "all") return true;
  return (node.data.layer || "").toLowerCase() === layerFilter.toLowerCase();
}

function matchesKindFilter(node: Node<LineageFlowNodeData>, kindFilter: string) {
  if (!kindFilter || kindFilter === "all") return true;
  return node.data.kind === kindFilter;
}

function semanticRank(node: Node<LineageFlowNodeData>) {
  if (node.data.kind === "source" || node.data.layer === "source" || node.data.layer === "bronze") return 0;
  if (node.data.kind === "process") return 1;
  if (node.data.kind === "current") return 2;
  if (node.data.layer === "silver") return 1;
  if (node.data.layer === "gold" || node.data.layer === "mart") return 3;
  if (node.data.kind === "dashboard" || node.data.layer === "dashboard") return 4;
  return 3;
}

function resolveNodeTechnology(data: LineageFlowNodeData): { imageSrc?: string; imageAlt?: string; icon?: typeof Database } {
  if (data.kind === "dashboard") {
    return { imageSrc: "/icons/metabase.svg", imageAlt: "Painel" };
  }

  if (data.kind === "process") {
    const processType = (data.processType || "").toLowerCase();
    if (processType.includes("airflow") || processType.includes("openlineage")) {
      return { imageSrc: "/icons/airflow.svg", imageAlt: "Airflow" };
    }
    if (processType.includes("spark")) {
      return { icon: Sparkles };
    }
    return { icon: Workflow };
  }

  const dbEngine = normalizeDbEngine(data.databaseEngine);
  if (dbEngine && LINEAGE_SUPPORTED_DATABASE_ENGINES.has(dbEngine)) {
    const meta = dbEngineMeta(dbEngine);
    if (meta.id !== "other" || dbEngine === "other") {
      return { imageSrc: meta.logoSrc, imageAlt: meta.iconAlt };
    }
  }

  const sourceType = (data.sourceType || "").toLowerCase();
  if (sourceType === "api") return { icon: Network };
  if (sourceType === "s3") return { icon: Cloud };
  if (sourceType === "file") return { icon: FolderArchive };
  if (sourceType === "source") return { icon: Boxes };

  if (data.kind === "source") return { icon: Boxes };
  return { icon: Database };
}

function LineageEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  style,
  markerEnd,
}: EdgeProps<{ relationType?: string; confidenceTier?: string | null; confidenceScore?: number | null; isVerified?: boolean | null }>) {
  const stroke = relationEdgeColor(data?.relationType);
  const confidenceStroke = confidenceTone(data?.confidenceTier ?? undefined, data?.isVerified);
  const [path] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 18,
  });
  return (
    <BaseEdge
      id={id}
      markerEnd={markerEnd}
      path={path}
      style={{
        ...style,
        stroke: data?.confidenceTier === "weak" && !data?.isVerified ? confidenceStroke : stroke,
        strokeDasharray: data?.confidenceTier === "weak" && !data?.isVerified ? "6 4" : style?.strokeDasharray,
        strokeWidth: style?.strokeWidth ?? 2,
      }}
    />
  );
}

function layoutNodes(
  nodes: Node<LineageFlowNodeData>[],
  edges: Edge[],
  selectedAssetId?: number | null,
): Node<LineageFlowNodeData>[] {
  if (!nodes.length) return [];
  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({
    rankdir: "LR",
    nodesep: 40,
    ranksep: 96,
    marginx: 24,
    marginy: 24,
  });

  const validNodeIds = new Set(nodes.map((node) => node.id));
  const validEdges = edges.filter((edge) => validNodeIds.has(edge.source) && validNodeIds.has(edge.target));

  for (const node of nodes) {
    graph.setNode(node.id, {
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
      rank: semanticRank(node),
    });
  }

  for (const edge of validEdges) {
    graph.setEdge(edge.source, edge.target);
  }

  dagre.layout(graph);

  const nodesByRank = new Map<number, Array<{ node: Node<LineageFlowNodeData>; y: number }>>();
  for (const node of nodes) {
    const graphNode = graph.node(node.id);
    const rank = semanticRank(node);
    const bucket = nodesByRank.get(rank) ?? [];
    bucket.push({ node, y: graphNode?.y ?? 0 });
    nodesByRank.set(rank, bucket);
  }

  for (const bucket of Array.from(nodesByRank.values())) {
    bucket.sort((left, right) => left.y - right.y || left.node.id.localeCompare(right.node.id));
  }

  return nodes.map((node) => {
    const rank = semanticRank(node);
    const bucket = nodesByRank.get(rank) ?? [{ node, y: 0 }];
    const row = bucket.findIndex((entry) => entry.node.id === node.id);
    const graphNode = graph.node(node.id);
    return {
      ...node,
      data: {
        ...node.data,
        isSelected: selectedAssetId != null && node.data.assetId === selectedAssetId,
      },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      position: {
        x: rank * HORIZONTAL_GAP + 40,
        y: Math.max(TOP_PADDING, (graphNode?.y ?? TOP_PADDING) - NODE_HEIGHT / 2 + row * 2),
      },
      style: {
        width: NODE_WIDTH,
      },
    };
  });
}

function LineageGraphNodeCard({ data }: NodeProps<LineageFlowNodeData>) {
  const technology = resolveNodeTechnology(data);
  const FallbackIcon = technology.icon;
  const originLabel = translateOrigin(data.lineageOrigin);
  const isSelected = Boolean(data.isSelected);
  const isFocused = Boolean(data.isFocused);
  const isPath = Boolean(data.isPath);
  const isDimmed = Boolean(data.isDimmed);
  return (
    <div
      className={`relative min-w-[240px] rounded-2xl border px-3 py-3 text-left shadow-sm transition ${
        kindCardTone(data.kind)
      } ${isSelected ? "ring-2 ring-info-500 ring-offset-2" : ""} ${isFocused ? "ring-2 ring-violet-500 ring-offset-2" : ""} ${
        isPath && !isSelected && !isFocused ? "ring-2 ring-warning-500 ring-offset-2" : ""
      } ${isDimmed ? "opacity-55" : "opacity-100"}`}
    >
      <Handle position={Position.Left} type="target" />
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/80 bg-surface p-2 shadow-sm">
          {technology.imageSrc ? (
            <img alt={technology.imageAlt || data.iconAlt || data.title} className="h-6 w-6 object-contain" src={technology.imageSrc} />
          ) : FallbackIcon ? (
            <FallbackIcon className="h-5 w-5 text-text-body" />
          ) : (
            <Database className="h-5 w-5 text-text-body" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="truncate text-sm font-semibold text-text">{data.title}</p>
            {isSelected ? (
              <span className="rounded-full border border-info-200 bg-info-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-info-700">
                Selecionado
              </span>
            ) : null}
            {isFocused && !isSelected ? (
              <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-violet-700">
                Foco
              </span>
            ) : null}
            {isPath && !isSelected && !isFocused ? (
              <span className="rounded-full border border-warning-200 bg-warning-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-warning-700">
                Caminho
              </span>
            ) : null}
            {data.layer ? (
              <span className="rounded-full border border-border bg-surface/90 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-text-body">
                {data.layer}
              </span>
            ) : null}
            {data.lineageOrigin ? (
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${originTone(data.lineageOrigin)}`}>
                {originLabel}
              </span>
            ) : null}
          </div>
          <p className="mt-1 truncate text-xs text-muted">{data.subtitle || "-"}</p>
        </div>
      </div>
      {data.lines.length > 0 ? (
        <div className="mt-3 space-y-1 border-t border-white/70 pt-2">
          {data.lines.map((line, idx) => (
            <p className="truncate text-[11px] text-text-body" key={`${data.kind}-${idx}`}>
              {line}
            </p>
          ))}
        </div>
      ) : null}
      <Handle position={Position.Right} type="source" />
    </div>
  );
}

export function LineageFlowCanvas({
  nodes,
  edges,
  className = "h-[460px]",
  onNodeActivate,
  selectedAssetId,
}: {
  nodes: Node<LineageFlowNodeData>[];
  edges: Edge[];
  className?: string;
  onNodeActivate?: (node: Node<LineageFlowNodeData>) => void;
  selectedAssetId?: number | null;
}) {
  const [instance, setInstance] = useState<ReactFlowInstance | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [focusNodeId, setFocusNodeId] = useState<string | null>(null);
  const [depthLimit, setDepthLimit] = useState<number>(2);
  const [directionMode, setDirectionMode] = useState<"all" | "upstream" | "downstream" | "principal">("all");
  const [kindFilter, setKindFilter] = useState<"all" | LineageFlowNodeData["kind"]>("all");
  const [layerFilter, setLayerFilter] = useState<string>("all");
  const nodeTypes = useMemo(() => ({ lineageNode: LineageGraphNodeCard }), []);
  const edgeTypes = useMemo(() => ({ lineageEdge: LineageEdge }), []);
  const validNodeIds = useMemo(() => new Set(nodes.map((node) => node.id)), [nodes]);
  const safeEdges = useMemo(
    () => edges.filter((edge) => validNodeIds.has(edge.source) && validNodeIds.has(edge.target)),
    [edges, validNodeIds],
  );
  const layoutedNodes = useMemo(() => layoutNodes(nodes, safeEdges, selectedAssetId), [nodes, safeEdges, selectedAssetId]);
  const nodeById = useMemo(() => new Map(layoutedNodes.map((node) => [node.id, node] as const)), [layoutedNodes]);
  const neighbors = useMemo(() => buildNeighborMap(safeEdges), [safeEdges]);
  const directedNeighbors = useMemo(() => buildDirectedNeighborMaps(safeEdges), [safeEdges]);
  const searchResults = useMemo(() => {
    const query = normalizeSearchValue(searchQuery);
    if (!query) return [];
    return layoutedNodes.filter((node) => matchesKindFilter(node, kindFilter) && matchesLayerFilter(node, layerFilter) && nodeMatchesSearch(node, query)).slice(0, 8);
  }, [kindFilter, layerFilter, layoutedNodes, searchQuery]);
  const anchorNodeId = useMemo(() => {
    const selectedNode = layoutedNodes.find((node) => node.data.assetId != null && node.data.assetId === selectedAssetId);
    if (selectedNode) return selectedNode.id;
    return layoutedNodes.find((node) => node.data.kind === "current")?.id ?? layoutedNodes[0]?.id ?? null;
  }, [layoutedNodes, selectedAssetId]);
  const effectiveFocusNodeId = focusNodeId && nodeById.has(focusNodeId) ? focusNodeId : null;
  const pathNodeIds = useMemo(() => {
    if (!anchorNodeId) return new Set<string>();
    if (!effectiveFocusNodeId || effectiveFocusNodeId === anchorNodeId) return new Set<string>([anchorNodeId]);
    const path = shortestPath(anchorNodeId, effectiveFocusNodeId, neighbors);
    return new Set(path.length > 0 ? path : [anchorNodeId, effectiveFocusNodeId]);
  }, [anchorNodeId, effectiveFocusNodeId, neighbors]);
  const visibleNodeIds = useMemo(() => {
    if (!anchorNodeId) return new Set<string>();
    const includePath = effectiveFocusNodeId && effectiveFocusNodeId !== anchorNodeId;

    if (directionMode === "principal") {
      return includePath ? new Set(pathNodeIds) : new Set<string>([anchorNodeId]);
    }

    if (depthLimit === Number.POSITIVE_INFINITY) {
      const all = new Set(layoutedNodes.map((node) => node.id));
      Array.from(pathNodeIds).forEach((id) => all.add(id));
      return all;
    }

    const forwardSeeds = [anchorNodeId].filter(Boolean) as string[];
    const reverseSeeds = [anchorNodeId].filter(Boolean) as string[];
    const base =
      directionMode === "upstream"
        ? collectDirectionalDepth(reverseSeeds, directedNeighbors.reverse, depthLimit)
        : directionMode === "downstream"
          ? collectDirectionalDepth(forwardSeeds, directedNeighbors.forward, depthLimit)
          : collectWithinDepth(forwardSeeds, neighbors, depthLimit);

    if (includePath) {
      Array.from(pathNodeIds).forEach((id) => base.add(id));
    }

    return base;
  }, [anchorNodeId, depthLimit, directionMode, directedNeighbors.forward, directedNeighbors.reverse, effectiveFocusNodeId, layoutedNodes, neighbors, pathNodeIds]);
  const filteredNodeIds = useMemo(() => {
    const ids = new Set<string>();
    for (const node of layoutedNodes) {
      if (!visibleNodeIds.has(node.id)) continue;
      const keepBecauseContext = node.id === anchorNodeId || node.id === effectiveFocusNodeId || pathNodeIds.has(node.id);
      const matchesFilters = matchesKindFilter(node, kindFilter) && matchesLayerFilter(node, layerFilter);
      if (keepBecauseContext || matchesFilters) {
        ids.add(node.id);
      }
    }
    return ids;
  }, [anchorNodeId, effectiveFocusNodeId, kindFilter, layerFilter, layoutedNodes, pathNodeIds, visibleNodeIds]);
  const visibleEdgeIds = useMemo(() => {
    const ids = new Set<string>();
    for (const edge of safeEdges) {
      if (filteredNodeIds.has(edge.source) && filteredNodeIds.has(edge.target)) {
        ids.add(edge.id);
      }
    }
    return ids;
  }, [filteredNodeIds, safeEdges]);
  const pathEdgeIds = useMemo(() => labelsForPath(Array.from(pathNodeIds), safeEdges), [pathNodeIds, safeEdges]);
  const pathHighlightActive = Boolean(effectiveFocusNodeId && effectiveFocusNodeId !== anchorNodeId && pathNodeIds.size > 1);
  const renderedNodes = useMemo(
    () =>
      layoutedNodes
        .filter((node) => filteredNodeIds.has(node.id))
        .map((node) => ({
          ...node,
          data: {
            ...node.data,
            isSelected: selectedAssetId != null && node.data.assetId === selectedAssetId,
            isFocused: effectiveFocusNodeId === node.id && effectiveFocusNodeId !== anchorNodeId,
            isPath: pathNodeIds.has(node.id),
            isDimmed:
              pathHighlightActive && !pathNodeIds.has(node.id) && depthLimit !== Number.POSITIVE_INFINITY && directionMode !== "principal",
          },
        })),
    [anchorNodeId, depthLimit, directionMode, effectiveFocusNodeId, filteredNodeIds, layoutedNodes, pathHighlightActive, pathNodeIds, selectedAssetId],
  );
  const renderedEdges = useMemo(
    () =>
      safeEdges
        .filter((edge) => visibleEdgeIds.has(edge.id))
        .map((edge) => ({
          ...edge,
          type: "lineageEdge",
          animated: pathEdgeIds.has(edge.id) || edge.animated || edge.data?.relationType === "consumption" || edge.data?.relationType === "consumed_by",
          data: {
            ...edge.data,
            relationType: edge.data?.relationType,
          },
          style: {
            opacity: pathHighlightActive ? (pathEdgeIds.has(edge.id) ? 1 : 0.28) : 1,
            strokeWidth: pathEdgeIds.has(edge.id) ? 3 : 2,
            strokeDasharray: edge.data?.confidenceTier === "weak" && !edge.data?.isVerified ? "6 4" : undefined,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: relationEdgeColor(edge.data?.relationType),
          },
        })),
    [pathEdgeIds, pathHighlightActive, safeEdges, visibleEdgeIds],
  );

  const focusedLabel = useMemo(() => {
    if (!effectiveFocusNodeId) return null;
    return nodeById.get(effectiveFocusNodeId)?.data.title || null;
  }, [effectiveFocusNodeId, nodeById]);
  const anchorLabel = useMemo(() => {
    if (!anchorNodeId) return null;
    return nodeById.get(anchorNodeId)?.data.title || null;
  }, [anchorNodeId, nodeById]);
  const depthLabel = depthLimit === Number.POSITIVE_INFINITY ? "Completo" : `${depthLimit} salto${depthLimit === 1 ? "" : "s"}`;
  useEffect(() => {
    if (!instance || renderedNodes.length === 0) return;
    const id = requestAnimationFrame(() => {
      if (effectiveFocusNodeId && nodeById.has(effectiveFocusNodeId)) {
        const focusNode = nodeById.get(effectiveFocusNodeId);
        if (focusNode) {
          instance.setCenter(
            focusNode.position.x + NODE_WIDTH / 2,
            focusNode.position.y + NODE_HEIGHT / 2,
            {
              zoom: 1.08,
              duration: 260,
            },
          );
          return;
        }
      }
      instance.fitView({ padding: 0.18, duration: 260, minZoom: 0.4 });
    });
    return () => cancelAnimationFrame(id);
  }, [effectiveFocusNodeId, instance, nodeById, renderedNodes, visibleNodeIds]);

  const handleNodeClick = (_event: MouseEvent, node: Node<LineageFlowNodeData>) => {
    setFocusNodeId(node.id);
    onNodeActivate?.(node);
  };

  const handleResultFocus = useCallback((node: Node<LineageFlowNodeData>) => {
    setFocusNodeId(node.id);
    setSearchQuery(node.data.title);
  }, []);

  const clearGraphFocus = useCallback(() => {
    setSearchQuery("");
    setFocusNodeId(null);
    setDepthLimit(2);
    setDirectionMode("all");
    setKindFilter("all");
    setLayerFilter("all");
  }, []);

  return (
    <div className={`${className} overflow-hidden rounded-2xl border border-border bg-surface`} tabIndex={-1}>
      <ReactFlow
        edges={renderedEdges}
        edgeTypes={edgeTypes}
        nodes={renderedNodes}
        nodeTypes={nodeTypes}
        nodesFocusable={false}
        edgesFocusable={false}
        onInit={setInstance}
        onNodeClick={handleNodeClick}
        fitView
        proOptions={{ hideAttribution: true }}
        minZoom={0.35}
        maxZoom={1.6}
      >
        <Background color="#e2e8f0" gap={24} />
        <MiniMap
          pannable
          zoomable
          className="!rounded-xl !border !border-border !bg-surface"
          maskColor="rgba(248, 250, 252, 0.68)"
          nodeBorderRadius={14}
          nodeColor={(node) => {
            const nodeData = node.data as LineageFlowNodeData;
            if (selectedAssetId != null && nodeData.assetId === selectedAssetId) return "#0f172a";
            if (effectiveFocusNodeId && node.id === effectiveFocusNodeId) return "#7c3aed";
            if (pathNodeIds.has(node.id)) return "#0284c7";
            return layerTone(nodeData.layer);
          }}
        />
        <Controls />
        <Panel position="top-left">
          <div className="rounded-2xl border border-border bg-surface/95 px-3 py-2 shadow-sm backdrop-blur">
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-text-body">
              {[
                ["Fonte", "source"],
                ["Bronze", "bronze"],
                ["Silver", "silver"],
                ["Gold", "gold"],
                ["Painéis", "dashboard"],
              ].map(([label, layer]) => (
                <span className="inline-flex items-center gap-1.5" key={label}>
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: layerTone(layer) }} />
                  {label}
                </span>
              ))}
            </div>
          </div>
        </Panel>
        <Panel position="top-right">
          <div className="max-h-[calc(100vh-10rem)] w-[560px] max-w-[calc(100vw-3rem)] overflow-y-auto rounded-2xl border border-border bg-surface/95 px-3 py-3 shadow-sm backdrop-blur">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Busca no grafo</p>
                <p className="mt-1 text-[11px] leading-4 text-muted">Localize nós e ajuste o contexto.</p>
              </div>
              <Button size="sm" variant="ghost" onClick={clearGraphFocus}>
                <RotateCcw className="h-4 w-4" />
                Limpar
              </Button>
            </div>
            <div className="mt-3 space-y-2.5">
              <Input
                placeholder="Buscar ativo, processo ou dashboard"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
              <div className="grid grid-cols-2 gap-2">
                <select className="rounded-xl border border-border bg-surface px-2 py-2 text-xs" value={kindFilter} onChange={(event) => setKindFilter(event.target.value as typeof kindFilter)}>
                  <option value="all">Todos os tipos</option>
                  <option value="source">Fonte</option>
                  <option value="process">Processo</option>
                  <option value="current">Ativo atual</option>
                  <option value="target">Relacionado</option>
                  <option value="dashboard">Painéis</option>
                </select>
                <select className="rounded-xl border border-border bg-surface px-2 py-2 text-xs" value={layerFilter} onChange={(event) => setLayerFilter(event.target.value)}>
                  <option value="all">Todas as camadas</option>
                  <option value="source">Fonte</option>
                  <option value="bronze">Bronze</option>
                  <option value="silver">Silver</option>
                  <option value="gold">Gold</option>
                  <option value="mart">Mart</option>
                  <option value="dashboard">Painéis</option>
                </select>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setDepthLimit((current) => Math.max(1, current === Number.POSITIVE_INFINITY ? 4 : current - 1))}
                  disabled={depthLimit === 1}
                >
                  <ZoomOut className="h-4 w-4" />
                  Recolher
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setDepthLimit((current) => (current === Number.POSITIVE_INFINITY ? Number.POSITIVE_INFINITY : current + 1))}
                >
                  <ZoomIn className="h-4 w-4" />
                  Expandir
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setDepthLimit(Number.POSITIVE_INFINITY)}>
                  Ver tudo
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Tudo", value: "all" as const },
                  { label: "Up", value: "upstream" as const },
                  { label: "Down", value: "downstream" as const },
                  { label: "Caminho", value: "principal" as const },
                ].map((item) => (
                  <Button key={item.value} size="sm" variant={directionMode === item.value ? "default" : "outline"} onClick={() => setDirectionMode(item.value)}>
                    {item.label}
                  </Button>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5 text-[11px] text-muted">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-bg-subtle px-2.5 py-1">
                  <Search className="h-3.5 w-3.5" />
                  {searchResults.length} resultado{searchResults.length === 1 ? "" : "s"}
                </span>
                <span className="rounded-full bg-bg-subtle px-2.5 py-1">Nível: {depthLabel}</span>
                <span className="rounded-full bg-bg-subtle px-2.5 py-1">
                  {filteredNodeIds.size}/{layoutedNodes.length} nós
                </span>
              </div>
              {focusedLabel ? (
                <div className="grid gap-2 md:grid-cols-2">
                  <div className="rounded-2xl border border-border bg-surface px-2.5 py-2 text-[11px] text-text-body">
                    <p className="font-semibold uppercase tracking-[0.12em] text-muted">Foco atual</p>
                    <p className="mt-1 truncate text-sm font-medium leading-5 text-text" title={focusedLabel}>
                      {focusedLabel}
                    </p>
                  </div>
                  {anchorLabel ? (
                    <div className="rounded-2xl border border-border bg-bg-subtle/80 px-2.5 py-2 text-[11px] text-text-body">
                      <p className="font-semibold text-text-body">Âncora</p>
                      <p className="mt-1 truncate text-text" title={anchorLabel}>
                        {anchorLabel}
                      </p>
                    </div>
                  ) : null}
                </div>
              ) : null}
              <div className="max-h-[96px] space-y-1.5 overflow-y-auto pr-1">
                {searchQuery.trim() ? (
                  searchResults.length > 0 ? (
                    searchResults.map((node) => (
                      <div
                        className={`rounded-2xl border px-2.5 py-2 text-left transition ${
                          effectiveFocusNodeId === node.id
                            ? "border-violet-300 bg-violet-50/70"
                            : "border-border bg-surface hover:border-info-200 hover:bg-info-50/50"
                        }`}
                        key={node.id}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <button className="min-w-0 flex-1 text-left" onClick={() => handleResultFocus(node)} type="button">
                            <p className="truncate text-sm font-semibold text-text">{node.data.title}</p>
                            <p className="mt-1 truncate text-xs text-muted">{node.data.subtitle || node.data.nodeType || "-"}</p>
                          </button>
                          {node.data.assetId ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                handleResultFocus(node);
                                onNodeActivate?.(node);
                              }}
                            >
                              Detalhe
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-border bg-bg-subtle/70 px-3 py-3 text-sm text-muted">
                      Nenhum resultado para essa busca.
                    </div>
                  )
                ) : (
                  <div className="rounded-2xl border border-dashed border-border bg-bg-subtle/70 px-3 py-3 text-sm text-muted">
                    Digite um termo para buscar.
                  </div>
                )}
              </div>
            </div>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}
