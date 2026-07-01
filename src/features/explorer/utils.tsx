import { FolderTree, Layers, Table as TableIcon, View } from "lucide-react";
import type { JSX } from "react";

import { DatabaseTechLogo } from "@/components/database-tech-logo";
import { normalizeDbEngine, dbEngineMeta } from "@/lib/database-engine";

import type {
  DbType,
  LineageSpec,
  LineageSummaryAsset,
  MetabaseImpactAssetType,
  MetabaseImpactConfidenceLevel,
  MetabaseImpactDependencyType,
  MetabaseImpactRiskLevel,
  TableColumn,
  TableKind,
} from "./types";

export function isMongoDefaultSchema(datasourceType: DbType | null | undefined, schemaName: string | null | undefined): boolean {
  return datasourceType === "mongodb" && schemaName === "default";
}

export function lineageAssetDisplayName(asset: LineageSummaryAsset): string {
  if (asset.schema_name && asset.object_name) return `${asset.schema_name}.${asset.object_name}`;
  if (asset.object_name) return asset.object_name;
  return asset.asset_name;
}

export function lineageAssetExplorerHref(asset: LineageSummaryAsset): string | null {
  if (!asset.catalog_table_id) return null;
  return `/explorer?tableId=${asset.catalog_table_id}&tab=lineage`;
}

export function highlightText(value: string, query: string): JSX.Element {
  if (!query.trim()) return <>{value}</>;
  const q = query.toLowerCase();
  const idx = value.toLowerCase().indexOf(q);
  if (idx < 0) return <>{value}</>;
  const head = value.slice(0, idx);
  const mid = value.slice(idx, idx + query.length);
  const tail = value.slice(idx + query.length);
  return (
    <>
      {head}
      <mark className="rounded bg-info-100 px-0.5 text-info-700">{mid}</mark>
      {tail}
    </>
  );
}

export function NodeIcon({ kind, className = "h-4 w-4" }: { kind: string; className?: string }) {
  const normalizedKind = normalizeDbEngine(kind);
  if (normalizedKind && dbEngineMeta(normalizedKind).id !== "other") {
    return <DatabaseTechLogo className={className} engine={normalizedKind} variant="compact" />;
  }
  if (kind === "database") return <Layers className={className} />;
  if (kind === "schema") return <FolderTree className={className} />;
  if (kind === "view") return <View className={className} />;
  if (kind === "collection") return <TableIcon className={className} />;
  return <TableIcon className={className} />;
}

export function tableKindLabel(kind: TableKind | null | undefined): string {
  if (kind === "view") return "View";
  if (kind === "collection") return "Collection";
  return "Table";
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function preferredColumnDescription(column: TableColumn): string | null {
  return column.dictionary_description || column.description_manual || column.description_source || null;
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(parsed);
}

export function formatCompactNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return "-";
  return new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export function formatInteger(value: number | null | undefined): string {
  if (value === null || value === undefined) return "-";
  return new Intl.NumberFormat("pt-BR").format(value);
}

export function formatSignedInteger(value: number | null | undefined): string {
  if (value === null || value === undefined) return "-";
  const formatted = new Intl.NumberFormat("pt-BR").format(Math.abs(value));
  if (value > 0) return `+${formatted}`;
  if (value < 0) return `-${formatted}`;
  return formatted;
}

export function formatPercent(value: number | null | undefined, fractionDigits = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return `${value > 0 ? "+" : value < 0 ? "-" : ""}${new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(Math.abs(value))}%`;
}

export function formatRowCountMethod(value: string | null | undefined): string {
  if (!value) return "-";
  const normalized = value.trim().toLowerCase();
  if (normalized === "exact") return "Exata";
  if (normalized === "estimated") return "Estimativa";
  if (normalized === "approximate") return "Aproximada";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function formatMetabaseImpactAssetType(value: MetabaseImpactAssetType | null | undefined): string {
  if (!value) return "-";
  const normalized = value.trim().toLowerCase();
  if (normalized === "dashboard") return "Dashboard";
  if (normalized === "question") return "Pergunta";
  if (normalized === "collection") return "Coleção";
  if (normalized === "model") return "Modelo";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function formatMetabaseImpactDependencyType(value: MetabaseImpactDependencyType | null | undefined): string {
  if (!value) return "-";
  const normalized = value.trim().toLowerCase();
  if (normalized === "direct") return "Direta";
  if (normalized === "sql_native") return "SQL nativo";
  if (normalized === "indirect") return "Indireta";
  if (normalized === "dashboard_card") return "Dashboard → card";
  if (normalized === "collection_membership") return "Coleção";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function formatMetabaseImpactConfidence(value: MetabaseImpactConfidenceLevel | null | undefined): string {
  if (!value) return "-";
  const normalized = value.trim().toLowerCase();
  if (normalized === "high") return "Alta";
  if (normalized === "medium") return "Média";
  if (normalized === "low") return "Baixa";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function formatMetabaseImpactRisk(value: MetabaseImpactRiskLevel | null | undefined): string {
  if (!value) return "-";
  const normalized = value.trim().toLowerCase();
  if (normalized === "high") return "Alto";
  if (normalized === "medium") return "Médio";
  if (normalized === "low") return "Baixo";
  if (normalized === "none") return "Sem risco";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function metabaseImpactRiskTone(value: MetabaseImpactRiskLevel | null | undefined): "success" | "warning" | "neutral" | "danger" {
  const normalized = (value || "").trim().toLowerCase();
  if (normalized === "high") return "danger";
  if (normalized === "medium") return "warning";
  if (normalized === "low") return "neutral";
  return "success";
}

export function pctBadgeTone(value: number): "success" | "warning" | "neutral" {
  if (value >= 90) return "success";
  if (value >= 75) return "warning";
  return "neutral";
}

export function freshnessLabel(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) return "-";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} h`;
  return `${Math.floor(seconds / 86400)} d`;
}

export function ingestionStatusTone(statusLabel: string | null | undefined): "success" | "warning" | "neutral" {
  const normalized = (statusLabel || "").toLowerCase();
  if (normalized.includes("sucesso")) return "success";
  if (normalized.includes("falha") || normalized.includes("pendente") || normalized.includes("execução")) return "warning";
  return "neutral";
}

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || Number.isNaN(seconds)) return "-";
  if (seconds < 60) return `${seconds}s`;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${remainingSeconds}s`;
  return `${remainingSeconds}s`;
}

export function normalizeLineageSpec(raw: LineageSpec): LineageSpec {
  const rawAny = raw as LineageSpec & {
    sources?: LineageSpec["upstreams"] | null;
    origins?: LineageSpec["upstreams"] | null;
  };
  const upstreams = Array.isArray(rawAny.upstreams)
    ? rawAny.upstreams
    : Array.isArray(rawAny.sources)
      ? rawAny.sources
      : Array.isArray(rawAny.origins)
        ? rawAny.origins
        : [];
  return {
    table_id: raw.table_id,
    upstreams,
    process: raw.process ?? null,
    downstreams: Array.isArray(raw.downstreams) ? raw.downstreams : [],
    notes: raw.notes ?? null,
    updated_at: raw.updated_at ?? null,
  };
}
