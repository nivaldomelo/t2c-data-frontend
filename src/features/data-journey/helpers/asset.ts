import { presentStatus, UX_COPY } from "@/lib/presentation/status-copy";
import type {
  CanonicalAssetContext,
  DatasourceNode,
  RowCountMetrics,
  SchemaNode,
  TableDetailInfo,
  TableLocator,
  TableNode,
} from "@/features/explorer/types";
import { formatCompactNumber, formatDateTime, tableKindLabel } from "@/features/explorer/utils";

import type { JourneyTone } from "../types";

export function assetKindLabel(tableDetail: TableDetailInfo | null, locator: TableLocator | null): string {
  if (!tableDetail && !locator) return UX_COPY.notAvailable;
  if (locator) return tableKindLabel(locator.kind);
  return "Tabela";
}

export function sourceSummary(locator: TableLocator | null, canonical: CanonicalAssetContext | null): string {
  if (canonical) {
    const source = canonical.source;
    return [source.datasource_name, source.database_name, source.schema_name].filter(Boolean).join(" · ");
  }
  if (!locator) return UX_COPY.notAvailable;
  return [locator.datasource_name, locator.database_name, locator.schema_name].filter(Boolean).join(" · ");
}

export function sourceBadgeTone(canonical: CanonicalAssetContext | null, locator: TableLocator | null): JourneyTone {
  if (canonical?.owner.owner_defined || locator) return "accent";
  return "neutral";
}

export function identityColumnMeta(column: CanonicalAssetContext["columns"][number]): string {
  const tags = column.tags.slice(0, 2).map((tag) => tag.name);
  return [
    column.is_primary_key ? "chave" : null,
    column.description_complete ? "documentada" : "pendente",
    ...tags,
  ]
    .filter(Boolean)
    .join(" · ");
}

export function resolveIdentityVolume({
  rowCountMetrics,
}: {
  rowCountMetrics: RowCountMetrics | null;
}): {
  label: string;
  valueText: string;
  tone: JourneyTone;
  detail: string;
  sourceLabel: string;
} {
  if (!rowCountMetrics) {
    return {
      label: "Volume de dados",
      valueText: UX_COPY.notAvailable,
      tone: "neutral",
      detail: "Ainda não existe medição registrada para estimar o volume desta tabela.",
      sourceLabel: "Sem medição registrada",
    };
  }

  const rowCount = rowCountMetrics.current_row_count ?? null;
  const status = (rowCountMetrics.status || rowCountMetrics.collection_status || "").toLowerCase();
  const measurementSource = (rowCountMetrics.measurement_source || "").trim().toLowerCase();
  const measurementType = (rowCountMetrics.measurement_type || rowCountMetrics.collection_method || "").trim().toLowerCase();
  const sourceLabelMap: Record<string, string> = {
    postgres_count: "COUNT na fonte Postgres",
    mysql_count: "COUNT na fonte MySQL",
    sql_count: "COUNT na fonte SQL",
    catalog_profile: "Perfil do catálogo",
    datalake_footer: "Footer do Data Lake",
    manual: "Medição manual",
  };
  const sourceLabel = sourceLabelMap[measurementSource] || "Sem medição registrada";
  const isExact = Boolean(measurementType && /exact|exato|precis/i.test(measurementType));

  if (status === "error") {
    return {
      label: "Volume de dados",
      valueText: "Indisponível",
      tone: "danger",
      detail: rowCountMetrics.error_message || "A última medição de linhas falhou.",
      sourceLabel,
    };
  }

  if (status === "skipped") {
    return {
      label: "Volume de dados",
      valueText: UX_COPY.notAvailable,
      tone: "neutral",
      detail: rowCountMetrics.error_message || "A tentativa de medição foi ignorada para esta leitura.",
      sourceLabel,
    };
  }

  if (status === "success" && measurementSource) {
    const measuredAt = rowCountMetrics.measured_at || rowCountMetrics.snapshot_at || null;
    return {
      label: "Volume de dados",
      valueText: rowCount !== null ? `${formatCompactNumber(rowCount)} linhas` : UX_COPY.notAvailable,
      tone: isExact ? "success" : "warning",
      detail: measuredAt
        ? `${isExact ? "Medição exata" : "Medição estimada"} em ${formatDateTime(measuredAt)}.${rowCount === 0 ? " A tabela estava vazia no momento da medição." : ""}`
        : `${isExact ? "Medição exata" : "Medição estimada"}${rowCount === 0 ? " A tabela estava vazia no momento da medição." : ""}`,
      sourceLabel,
    };
  }

  return {
      label: "Volume de dados",
    valueText: UX_COPY.notAvailable,
    tone: "neutral",
    detail: "Ainda não existe medição registrada para estimar o volume desta tabela.",
    sourceLabel,
  };
}

export function sourceLabel(node: DatasourceNode | null | undefined): string {
  if (!node) return "Selecione uma fonte";
  return `${node.name} · ${node.database_name}`;
}

export function schemaLabel(node: SchemaNode | null | undefined): string {
  if (!node) return "Selecione um schema";
  return node.name;
}

export function tableLabel(node: TableNode | null | undefined): string {
  if (!node) return "Selecione uma tabela";
  return node.name;
}

export function artifactTypeLabel(type: string | null | undefined): string {
  switch ((type || "").toLowerCase()) {
    case "dashboard":
      return "Dashboard";
    case "question":
      return "Question";
    case "collection":
      return "Coleção";
    default:
      return type || "Artefato";
  }
}

export function lineageImpactLabel(level: string | null | undefined): string {
  const normalized = (level || "").trim().toLowerCase();
  if (!normalized) return UX_COPY.notAvailable;
  if (normalized.includes("high")) return "Alto";
  if (normalized.includes("medium")) return "Médio";
  if (normalized.includes("low")) return "Baixo";
  return presentStatus(level, UX_COPY.notAvailable);
}
