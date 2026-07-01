import { apiRequest } from "@/lib/client-api";
import type {
  MetabaseConsumptionSummary,
  TableColumnPage,
  TableLocator,
} from "@/features/explorer/types";
import type { TimelinePage } from "@/features/timeline/types";

export async function fetchTableLocator(tableId: number) {
  return apiRequest<TableLocator>(`/v1/catalog/tables/${tableId}/locator`);
}

export async function fetchColumnsPage(tableId: number, page: number) {
  return apiRequest<TableColumnPage>(`/v1/catalog/tables/${tableId}/columns/page?page=${page}&page_size=60`);
}

export async function fetchTimeline(tableId: number) {
  return apiRequest<TimelinePage>(`/v1/catalog/tables/${tableId}/timeline?page=1&page_size=20`);
}

export async function fetchMetabaseConsumption(tableId: number) {
  return apiRequest<MetabaseConsumptionSummary>(`/v1/catalog/tables/${tableId}/metabase-consumption`);
}
