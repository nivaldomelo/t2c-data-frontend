import { apiRequest, apiResponse } from "@/lib/client-api";
import type { DataSourceTypeId } from "@/lib/datasource-types";
import type { ScheduleMode } from "@/features/data-quality/types";

type PageResponse<T> = {
  items?: T[];
  total?: number;
  page?: number;
  page_size?: number;
  has_more?: boolean;
};

function normalizeListResponse<T>(response: T[] | PageResponse<T>): T[] {
  return Array.isArray(response) ? response : response.items ?? [];
}

export type ConnectorCapabilities = {
  test_connection: boolean;
  list_schemas: boolean;
  list_tables: boolean;
  get_database_info: boolean;
};

export type DataSource = {
  id: number;
  name: string;
  db_type: DataSourceTypeId;
  host: string;
  port: number;
  database: string;
  username: string;
  detected_schemas: string[] | null;
  include_schemas: string[] | null;
  exclude_schemas: string[] | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  capabilities: ConnectorCapabilities;
};

export type DataSourceDetail = DataSource & {
  connection: Record<string, unknown>;
  configured_secrets: string[];
};

export type DataSourceSchemaList = {
  engine: DataSourceTypeId;
  schemas: string[];
  capabilities: ConnectorCapabilities;
};

export type DataSourceTableList = {
  engine: DataSourceTypeId;
  schema_name: string | null;
  tables: string[];
  capabilities: ConnectorCapabilities;
};

export type ScanRun = {
  id: number;
  datasource_id: number;
  status: string;
  summary?: Record<string, unknown>;
  created_at: string;
  updated_at?: string;
};

export type ScanRunDetail = {
  id: number;
  datasource_id: number;
  datasource_name?: string | null;
  status: string;
  execution_engine?: string | null;
  spark_master_url?: string | null;
  spark_application_id?: string | null;
  spark_driver_id?: string | null;
  spark_logs_path?: string | null;
  spark_logs_url?: string | null;
  failure_stage?: string | null;
  error_code?: string | null;
  error_message?: string | null;
  error_detail?: string | null;
  error_stacktrace?: string | null;
  submitted_at?: string | null;
  running_at?: string | null;
  finished_at?: string | null;
  duration_seconds?: number | null;
  discovery?: {
    schemas?: number;
    tables?: number;
    columns?: number;
  };
  row_counts?: Record<string, unknown>;
  snapshots?: number | null;
  diffs?: number | null;
  legacy_status?: string | null;
  summary?: Record<string, unknown>;
};

export type ScanDiff = {
  id: number;
  scan_run_id: number;
  entity_type: string;
  entity_key: string;
  diff_type: string;
  details: string | null;
};

export type DataSourceScheduleRecipient = {
  id: number;
  display_name: string;
  email: string;
};

export type DataSourceScanSchedule = {
  id: number;
  datasource_id: number;
  datasource_name: string;
  datasource_type: string;
  schedule_mode: ScheduleMode;
  schedule_enabled: boolean;
  schedule_every_minutes: number | null;
  schedule_time: string | null;
  schedule_day_of_week: number | null;
  schedule_day_of_month: number | null;
  schedule_anchor_date: string | null;
  schedule_last_run_at: string | null;
  schedule_last_started_at: string | null;
  schedule_last_finished_at: string | null;
  schedule_last_status: string | null;
  schedule_last_error: string | null;
  schedule_next_run_at: string | null;
  schedule_summary: string | null;
  notification_recipients: DataSourceScheduleRecipient[];
  created_at: string;
  updated_at: string;
};

export type DataSourceScanSchedulerStatus = {
  scheduler_name: string;
  mode: string;
  is_enabled: boolean;
  health: string;
  last_started_at: string | null;
  last_heartbeat_at: string | null;
  last_success_at: string | null;
  last_failure_at: string | null;
  last_error: string | null;
  last_run_summary: Record<string, unknown>;
  scheduled_sources_total: number;
  next_expected_run_at: string | null;
};

export type DataSourceScheduleUserOption = {
  id: number;
  display_name: string;
  email: string;
};

export type DataSourceScanScheduleForm = {
  datasource_id: number;
  schedule_mode: ScheduleMode;
  schedule_enabled: boolean;
  schedule_every_minutes: number | null;
  schedule_time: string;
  schedule_day_of_week: number | null;
  schedule_day_of_month: number | null;
  schedule_anchor_date: string;
  recipient_user_ids: number[];
};

export type ConnectionTestResponse = {
  success: boolean;
  message: string;
  engine: DataSourceTypeId;
  host?: string | null;
  port?: number | null;
  database?: string | null;
  default_schema?: string | null;
  latency_ms: number | null;
  details: Record<string, unknown> | null;
  capabilities: ConnectorCapabilities;
  schemas: string[] | null;
  warning?: string | null;
};

export type DataSourceMutationPayload = {
  name: string;
  db_type: DataSourceTypeId;
  connection: Record<string, string | number | boolean>;
  secrets: Record<string, string>;
  detected_schemas: string[];
  include_schemas: string[];
  exclude_schemas: string[];
  is_active: boolean;
};

export async function listDataSources() {
  const pageSize = 100;
  const collected: DataSource[] = [];
  let page = 1;

  while (true) {
    const response = await apiRequest<DataSource[] | PageResponse<DataSource>>(`/v1/datasources?page=${page}&page_size=${pageSize}`);
    const items = normalizeListResponse(response);
    collected.push(...items);

    const hasMore = !Array.isArray(response) && Boolean(response.has_more);
    if (!hasMore || items.length === 0) break;
    page += 1;
  }

  return collected;
}

export async function getDataSourceDetail(id: number) {
  return apiRequest<DataSourceDetail>(`/v1/datasources/${id}`);
}

export async function listDataSourceSchemas(id: number) {
  return apiRequest<DataSourceSchemaList>(`/v1/datasources/${id}/schemas`);
}

export async function listDataSourceTables(id: number, schema?: string) {
  const suffix = schema ? `?schema=${encodeURIComponent(schema)}` : "";
  return apiRequest<DataSourceTableList>(`/v1/datasources/${id}/tables${suffix}`);
}

export async function testDataSourceConnection(payload: {
  db_type: DataSourceTypeId;
  connection: Record<string, string | number | boolean>;
  secrets: Record<string, string>;
}) {
  return apiRequest<ConnectionTestResponse>("/v1/datasources/test", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function testExistingDataSourceConnection(id: number) {
  return apiRequest<ConnectionTestResponse>(`/v1/datasources/${id}/test`, {
    method: "POST",
  });
}

export async function createDataSource(payload: DataSourceMutationPayload) {
  return apiRequest<DataSource>("/v1/datasources", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateDataSource(id: number, payload: DataSourceMutationPayload) {
  return apiRequest<DataSource>(`/v1/datasources/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteDataSource(id: number) {
  return apiRequest<void>(`/v1/datasources/${id}`, { method: "DELETE" });
}

export async function listScanRuns() {
  // Legacy endpoint preserved while scan-runs is being sunset from the nav.
  return apiRequest<ScanRun[]>("/scan-runs");
}

export async function getScanRunDetail(scanRunId: number) {
  return apiRequest<ScanRunDetail>(`/scan-runs/${scanRunId}`);
}

export async function getScanRunLogs(scanRunId: number) {
  const response = await apiResponse(`/scan-runs/${scanRunId}/logs`);
  return response.text();
}

export async function getScanRunDiffs(scanRunId: number) {
  // Legacy endpoint preserved while scan-runs is being sunset from the nav.
  return apiRequest<ScanDiff[]>(`/scan-runs/${scanRunId}/diffs`);
}

export async function runDataSourceScan(id: number) {
  // Legacy endpoint preserved while scan-runs is being sunset from the nav.
  return apiRequest<ScanRun>(`/scan-runs/datasource/${id}`, {
    method: "POST",
  });
}

export async function getDataSourceScanSchedulerStatus() {
  return apiRequest<DataSourceScanSchedulerStatus>("/v1/datasources/scheduler/status");
}

export async function listDataSourceScanSchedules(datasourceId?: number) {
  const suffix = datasourceId ? `?datasource_id=${datasourceId}` : "";
  const response = await apiRequest<DataSourceScanSchedule[] | PageResponse<DataSourceScanSchedule>>(
    `/v1/datasources/schedules${suffix}`,
  );
  return normalizeListResponse(response);
}

export async function saveDataSourceScanSchedule(payload: DataSourceScanScheduleForm) {
  return apiRequest<DataSourceScanSchedule>("/v1/datasources/schedules", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function deleteDataSourceScanSchedule(scheduleId: number) {
  return apiRequest<void>(`/v1/datasources/schedules/${scheduleId}`, { method: "DELETE" });
}

export async function searchDataSourceScheduleUsers(query = "", limit = 20) {
  const trimmed = query.trim();
  const suffix = trimmed ? `?q=${encodeURIComponent(trimmed)}&limit=${limit}` : `?limit=${limit}`;
  const response = await apiRequest<DataSourceScheduleUserOption[] | PageResponse<DataSourceScheduleUserOption>>(
    `/v1/datasources/schedules/users${suffix}`,
  );
  return normalizeListResponse(response);
}
