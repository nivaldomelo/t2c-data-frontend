import { apiRequest } from "@/lib/client-api";

import {
  listDataSourceSchemas,
  listDataSourceTables,
  listDataSources,
  type DataSource,
} from "@/features/datasources/api";

import type {
  ObservabilityAssetRecord,
  ObservabilityDataSourceOption,
  ObservabilityPageResult,
  ObservabilitySchemaOption,
  ObservabilityTableOption,
} from "./types";

export type ObservabilityOverviewQuery = {
  datasource_id: number;
  schema?: string;
  table?: string;
  domain?: string;
  layer?: string;
  criticality?: string;
  status?: string;
  period?: string;
  only_critical?: boolean;
  only_incidents?: boolean;
  only_out_of_sla?: boolean;
  page?: number;
  page_size?: number;
};

export async function listObservabilityDataSources(): Promise<ObservabilityDataSourceOption[]> {
  const sources = await listDataSources();
  return sources
    .map((source: DataSource) => ({
      id: source.id,
      name: source.name,
      db_type: source.db_type,
      database: source.database,
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

export async function listObservabilitySchemas(datasourceId: number): Promise<ObservabilitySchemaOption[]> {
  const payload = await listDataSourceSchemas(datasourceId);
  return (payload.schemas ?? []).map((schema, index) => ({ id: index + 1, name: schema }));
}

export async function listObservabilityTables(datasourceId: number, schema?: string): Promise<ObservabilityTableOption[]> {
  const payload = await listDataSourceTables(datasourceId, schema);
  return (payload.tables ?? []).map((table, index) => ({ id: index + 1, name: table, kind: "table" }));
}

export async function listObservabilityAssets(query: ObservabilityOverviewQuery): Promise<ObservabilityPageResult> {
  const params = new URLSearchParams();
  params.set("datasource_id", String(query.datasource_id));
  if (query.schema) params.set("schema", query.schema);
  if (query.table) params.set("table", query.table);
  if (query.domain) params.set("domain", query.domain);
  if (query.layer) params.set("layer", query.layer);
  if (query.criticality) params.set("criticality", query.criticality);
  if (query.status) params.set("status", query.status);
  if (query.period) params.set("period", query.period);
  if (query.only_critical) params.set("only_critical", "true");
  if (query.only_incidents) params.set("only_incidents", "true");
  if (query.only_out_of_sla) params.set("only_out_of_sla", "true");
  params.set("page", String(query.page ?? 1));
  params.set("page_size", String(query.page_size ?? 10));
  return apiRequest<ObservabilityPageResult>(`/v1/dq/observability/overview?${params.toString()}`);
}

export async function getObservabilityAssetById(tableId: number): Promise<ObservabilityAssetRecord> {
  return apiRequest<ObservabilityAssetRecord>(`/v1/dq/observability/assets/${tableId}`);
}
