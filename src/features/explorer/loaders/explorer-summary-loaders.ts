import { apiRequest } from "@/lib/client-api";
import type {
  CanonicalAssetContext,
  DQLatest,
  LineageSpec,
  LineageSummary,
  TableIngestionDetail,
  TableColumnSummary,
  TableDetailInfo,
  TableCorrelationSummary,
  TableOperationalContext,
  TableStewardshipRequest,
} from "@/features/explorer/types";

export async function fetchTableMetadata(tableId: number) {
  const [summary, tableInfo] = await Promise.all([
    apiRequest<TableColumnSummary>(`/v1/catalog/tables/${tableId}/columns/summary`),
    apiRequest<TableDetailInfo>(`/v1/catalog/tables/${tableId}`),
  ]);

  return { summary, tableInfo };
}

export async function fetchOperationalContext(tableId: number) {
  return apiRequest<TableOperationalContext>(`/v1/catalog/tables/${tableId}/operational-context`);
}

export async function fetchCanonicalAsset(tableId: number) {
  return apiRequest<CanonicalAssetContext>(`/v1/catalog/tables/${tableId}/canonical-summary`);
}

export async function fetchCorrelationSummary(tableId: number) {
  return apiRequest<TableCorrelationSummary>(`/v1/catalog/tables/${tableId}/correlation-summary`);
}

export async function fetchStewardshipRequests(tableId: number) {
  const payload = await apiRequest<{ items: TableStewardshipRequest[] }>(`/v1/stewardship/requests?table_id=${tableId}`);
  return payload.items || [];
}

export async function fetchDQLatest(tableId: number) {
  return apiRequest<DQLatest>(`/v1/dq/tables/id/${tableId}/latest?history_runs=14`);
}

export async function fetchIngestionDetail(tableId: number) {
  return apiRequest<TableIngestionDetail>(`/v1/ingestion/tables/${tableId}?page=1&page_size=8`);
}

export async function fetchLineageSummary(tableId: number, maxRelations: number | null) {
  const params = new URLSearchParams();
  if (maxRelations) params.set("max_relations", String(maxRelations));
  const summaryUrl = `/v1/lineage/tables/${tableId}/summary${params.toString() ? `?${params.toString()}` : ""}`;
  const [lineage, lineageSummary] = await Promise.all([
    apiRequest<LineageSpec>(`/v1/lineage/spec/tables/${tableId}`),
    apiRequest<LineageSummary>(summaryUrl),
  ]);
  return { lineage, lineageSummary };
}
