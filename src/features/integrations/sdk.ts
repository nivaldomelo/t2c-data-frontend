import { apiRequest } from "@/lib/client-api";

import type {
  DataLakeCatalogPage,
  DataLakeConnection,
  DataLakeConnectionInput,
  DataLakeConnectionTestResult,
  DataLakeInventoryTableGovernanceInput,
  DataLakeInventoryTable,
  DataLakeInventoryPage,
  DataLakeInventoryScanResult,
  DataLakeOperationsSummary,
  DataLakeScanSchedule,
  DataLakeScanScheduleInput,
  DataLakeTableDetail,
  DataLakeTableFreshnessSlaInput,
  DataLakeTableFilesPage,
  DataLakeTroubleshootingSummary,
} from "@/features/integrations/types";

export async function listDataLakeConnections(): Promise<DataLakeConnection[]> {
  return apiRequest<DataLakeConnection[]>("/v1/integrations/data-lake/connections");
}

export async function getDataLakeConnection(connectionId: number): Promise<DataLakeConnection> {
  return apiRequest<DataLakeConnection>(`/v1/integrations/data-lake/connections/${connectionId}`);
}

export async function createDataLakeConnection(payload: DataLakeConnectionInput): Promise<DataLakeConnection> {
  return apiRequest<DataLakeConnection>("/v1/integrations/data-lake/connections", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateDataLakeConnection(connectionId: number, payload: DataLakeConnectionInput): Promise<DataLakeConnection> {
  return apiRequest<DataLakeConnection>(`/v1/integrations/data-lake/connections/${connectionId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteDataLakeConnection(connectionId: number): Promise<void> {
  await apiRequest(`/v1/integrations/data-lake/connections/${connectionId}`, { method: "DELETE" });
}

export async function testDataLakeConnection(connectionId: number): Promise<DataLakeConnectionTestResult> {
  return apiRequest<DataLakeConnectionTestResult>(`/v1/integrations/data-lake/connections/${connectionId}/test`, {
    method: "POST",
  });
}

export async function listDataLakeCatalog(
  params?: {
    page?: number;
    page_size?: number;
    connection_id?: number | null;
    bucket?: string | null;
    layer?: string | null;
    status?: string | null;
    has_partitions?: boolean | null;
    has_parquet?: boolean | null;
    freshness_state?: string | null;
    search?: string | null;
    sort_by?: string | null;
    sort_dir?: string | null;
  },
): Promise<DataLakeCatalogPage> {
  const search = new URLSearchParams();
  if (params?.page) search.set("page", `${params.page}`);
  if (params?.page_size) search.set("page_size", `${params.page_size}`);
  if (params?.connection_id) search.set("connection_id", `${params.connection_id}`);
  if (params?.bucket) search.set("bucket", params.bucket);
  if (params?.layer) search.set("layer", params.layer);
  if (params?.status) search.set("status", params.status);
  if (params?.has_partitions !== undefined && params?.has_partitions !== null) search.set("has_partitions", `${params.has_partitions}`);
  if (params?.has_parquet !== undefined && params?.has_parquet !== null) search.set("has_parquet", `${params.has_parquet}`);
  if (params?.freshness_state) search.set("freshness_state", params.freshness_state);
  if (params?.search) search.set("search", params.search);
  if (params?.sort_by) search.set("sort_by", params.sort_by);
  if (params?.sort_dir) search.set("sort_dir", params.sort_dir);
  const query = search.toString();
  return apiRequest<DataLakeCatalogPage>(`/v1/integrations/data-lake/catalog${query ? `?${query}` : ""}`);
}

export async function listDataLakeInventory(
  connectionId: number,
  params?: {
    page?: number;
    page_size?: number;
    layer?: string | null;
    name?: string | null;
    status?: string | null;
    has_partitions?: boolean | null;
    freshness_state?: string | null;
  },
): Promise<DataLakeInventoryPage> {
  const search = new URLSearchParams();
  if (params?.page) search.set("page", `${params.page}`);
  if (params?.page_size) search.set("page_size", `${params.page_size}`);
  if (params?.layer) search.set("layer", params.layer);
  if (params?.name) search.set("name", params.name);
  if (params?.status) search.set("status", params.status);
  if (params?.has_partitions !== undefined && params?.has_partitions !== null) search.set("has_partitions", `${params.has_partitions}`);
  if (params?.freshness_state) search.set("freshness_state", params.freshness_state);
  const query = search.toString();
  return apiRequest<DataLakeInventoryPage>(`/v1/integrations/data-lake/connections/${connectionId}/inventory${query ? `?${query}` : ""}`);
}

export async function scanDataLakeInventory(connectionId: number): Promise<DataLakeInventoryScanResult> {
  return apiRequest<DataLakeInventoryScanResult>(`/v1/integrations/data-lake/connections/${connectionId}/inventory/scan`, {
    method: "POST",
  });
}

export async function getDataLakeTableDetail(connectionId: number, tableId: number): Promise<DataLakeTableDetail> {
  return apiRequest<DataLakeTableDetail>(`/v1/integrations/data-lake/connections/${connectionId}/inventory/tables/${tableId}`);
}

export async function getDataLakeTableDetailById(tableId: number): Promise<DataLakeTableDetail> {
  return apiRequest<DataLakeTableDetail>(`/v1/integrations/data-lake/tables/${tableId}`);
}

export async function listDataLakeTableFiles(
  tableId: number,
  params?: {
    page?: number;
    page_size?: number;
  },
): Promise<DataLakeTableFilesPage> {
  const search = new URLSearchParams();
  if (params?.page) search.set("page", `${params.page}`);
  if (params?.page_size) search.set("page_size", `${params.page_size}`);
  const query = search.toString();
  return apiRequest<DataLakeTableFilesPage>(`/v1/integrations/data-lake/tables/${tableId}/files${query ? `?${query}` : ""}`);
}

export async function updateDataLakeTableFreshnessSla(
  connectionId: number,
  tableId: number,
  payload: DataLakeTableFreshnessSlaInput,
): Promise<DataLakeInventoryTable> {
  return apiRequest<DataLakeInventoryTable>(`/v1/integrations/data-lake/connections/${connectionId}/inventory/tables/${tableId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function updateDataLakeTableGovernance(
  connectionId: number,
  tableId: number,
  payload: DataLakeInventoryTableGovernanceInput,
): Promise<DataLakeInventoryTable> {
  return apiRequest<DataLakeInventoryTable>(`/v1/integrations/data-lake/connections/${connectionId}/inventory/tables/${tableId}/governance`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function getDataLakeScanSchedule(connectionId: number): Promise<DataLakeScanSchedule | null> {
  return apiRequest<DataLakeScanSchedule | null>(`/v1/integrations/data-lake/connections/${connectionId}/schedule`);
}

export async function upsertDataLakeScanSchedule(connectionId: number, payload: DataLakeScanScheduleInput): Promise<DataLakeScanSchedule> {
  return apiRequest<DataLakeScanSchedule>(`/v1/integrations/data-lake/connections/${connectionId}/schedule`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteDataLakeScanSchedule(connectionId: number): Promise<void> {
  await apiRequest(`/v1/integrations/data-lake/connections/${connectionId}/schedule`, { method: "DELETE" });
}

export async function getDataLakeOperationsSummary(connectionId: number): Promise<DataLakeOperationsSummary> {
  return apiRequest<DataLakeOperationsSummary>(`/v1/integrations/data-lake/connections/${connectionId}/operations/summary`);
}

export async function getDataLakeTroubleshooting(connectionId: number): Promise<DataLakeTroubleshootingSummary> {
  return apiRequest<DataLakeTroubleshootingSummary>(`/v1/integrations/data-lake/connections/${connectionId}/troubleshooting`);
}
