import type {
  ObservabilityAssetRecord,
  ObservabilityHistoryPoint,
  ObservabilityLinkedBy,
  ObservabilitySourceOrigin,
  ObservabilityStatus,
} from "../types";

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleString("pt-BR");
}

export function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("pt-BR").format(value);
}

export function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  const formatted = new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
  return `${formatted}%`;
}

export function formatRowCount(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("pt-BR", {
    notation: "compact",
    compactDisplay: "short",
    maximumFractionDigits: 1,
  }).format(value);
}

export function statusMeta(status: ObservabilityStatus | ObservabilityAssetRecord["reliability_status"]) {
  switch (status) {
    case "healthy":
    case "reliable":
      return { label: "Saudável", tone: "success" as const };
    case "attention":
    case "reliable_with_reservations":
    case "watch":
      return { label: "Atenção", tone: "warning" as const };
    case "critical":
    case "unreliable":
      return { label: "Crítico", tone: "danger" as const };
    case "unreadable":
      return { label: "Sem leitura", tone: "neutral" as const };
    case "late":
      return { label: "Atrasado", tone: "warning" as const };
    case "drift":
      return { label: "Drift", tone: "warning" as const };
    case "blocked":
      return { label: "Bloqueado", tone: "danger" as const };
    default:
      return { label: "Sem leitura", tone: "neutral" as const };
  }
}

export function decisionMeta(asset: ObservabilityAssetRecord) {
  if (asset.reliability_status === "blocked") {
    return { label: "Bloqueado", tone: "danger" as const };
  }
  if (asset.reliability_status === "unreliable") {
    return { label: "Não confiável", tone: "danger" as const };
  }
  if (asset.reliability_status === "watch") {
    return { label: "Em observação", tone: "warning" as const };
  }
  if (asset.reliability_status === "reliable_with_reservations") {
    return { label: "Confiável com ressalvas", tone: "warning" as const };
  }
  return { label: "Confiável", tone: "success" as const };
}

export function decisionReasons(asset: ObservabilityAssetRecord): string[] {
  return asset.reliability_reasons.length
    ? asset.reliability_reasons
    : [asset.summary, asset.recommendation].filter(Boolean);
}

export function sourceOriginMeta(origin: ObservabilitySourceOrigin) {
  switch (origin) {
    case "catalog":
    case "datasource_scan":
      return { label: "Catálogo", tone: "success" as const };
    case "data_lake":
      return { label: "Data Lake", tone: "neutral" as const };
    case "airflow":
      return { label: "Airflow", tone: "warning" as const };
    case "metabase":
      return { label: "Metabase", tone: "accent" as const };
    case "ingestion":
      return { label: "Ingestão", tone: "warning" as const };
    case "dq":
      return { label: "Data Quality", tone: "success" as const };
    case "privacy":
      return { label: "Privacidade", tone: "success" as const };
    case "certification":
      return { label: "Certificação", tone: "success" as const };
    case "incident":
      return { label: "Incidente", tone: "danger" as const };
    case "stale_scan":
      return { label: "Scan antigo", tone: "danger" as const };
    default:
      return { label: "Sem origem", tone: "neutral" as const };
  }
}

export function linkedByLabel(value: ObservabilityLinkedBy) {
  switch (value) {
    case "table_id":
      return "table_id";
    case "datasource_schema_table":
      return "datasource_schema_table";
    case "canonical_asset_id":
      return "canonical_asset_id";
    case "fqn":
      return "fqn";
    case "metabase_sql":
      return "metabase_sql";
    case "airflow_dag":
      return "airflow_dag";
    case "ingestion_log":
      return "ingestion_log";
    case "scan_run_id":
      return "scan_run_id";
    case "name_only":
    default:
      return "name_only";
  }
}

export function confidenceTone(value: number) {
  if (value >= 85) return "success" as const;
  if (value >= 60) return "warning" as const;
  return "danger" as const;
}

export function signalConfidence(asset: ObservabilityAssetRecord) {
  return asset.confidence ?? asset.linked_confidence;
}

export function mainProblemMeta(asset: ObservabilityAssetRecord) {
  if (asset.blocking_incidents_total > 0) {
    return { label: "Incidente bloqueante", tone: "danger" as const };
  }

  if (asset.pipeline_failed || asset.pipeline_status === "critical" || asset.pipeline_status === "blocked") {
    return { label: "Falha de pipeline", tone: "danger" as const };
  }

  if (asset.freshness_status === "late") {
    return { label: "Fora do SLA", tone: "warning" as const };
  }

  if (asset.schema_drift_detected || asset.schema_status === "drift") {
    return { label: "Schema drift", tone: "warning" as const };
  }

  if (asset.volume_status === "critical" || Math.abs(asset.volume_change_pct) >= 20) {
    return { label: "Anomalia de volume", tone: "warning" as const };
  }

  if (asset.partial_failure_detected || asset.reliability_status === "unreliable") {
    return { label: "Confiabilidade baixa", tone: "danger" as const };
  }

  if (asset.reliability_status === "reliable_with_reservations" || asset.open_incidents_total > 0) {
    return { label: "Atenção operacional", tone: "warning" as const };
  }

  return { label: "Sem alerta crítico", tone: "success" as const };
}

export function observabilityAssetKey(asset: ObservabilityAssetRecord, index: number) {
  return [
    asset.table_id,
    asset.datasource_id,
    asset.source_origin,
    asset.linked_by,
    asset.scan_run_id ?? "no-scan",
    asset.table_name,
    index,
  ].join(":");
}

export function observabilityAssetSignature(asset: ObservabilityAssetRecord) {
  return [
    asset.table_id,
    asset.datasource_id,
    asset.source_origin,
    asset.linked_by,
    asset.scan_run_id ?? "no-scan",
    asset.table_name,
  ].join(":");
}

export function historyMax(points: ObservabilityHistoryPoint[]) {
  return Math.max(1, ...points.map((point) => point.value));
}
