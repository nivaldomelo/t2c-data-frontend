import type { PageResponse } from "@/lib/pagination";

export type UserAuditSummaryCount = {
  label: string;
  value: number;
};

export type UserAuditSummary = {
  generated_at: string;
  period_days: number;
  users_active_today: number;
  logins_last_24h: number;
  open_sessions: number;
  avg_session_seconds: number | null;
  page_views_last_24h: number;
  asset_views_last_24h: number;
  changes_last_24h: number;
  exports_last_24h: number;
  sensitive_access_last_24h: number;
  denied_requests_last_24h: number;
  top_pages: UserAuditSummaryCount[];
  top_assets: UserAuditSummaryCount[];
  top_users: UserAuditSummaryCount[];
};

export type UserAuditSession = {
  id: number;
  user_id: number;
  user_name: string | null;
  user_email: string | null;
  session_jti: string;
  started_at: string;
  last_seen_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  end_reason: string | null;
  status: string;
  ip_address: string | null;
  user_agent: string | null;
  device_type: string | null;
  browser: string | null;
  os: string | null;
  country: string | null;
  city: string | null;
  auth_method: string | null;
  mfa_used: boolean;
  success: boolean;
  failure_reason: string | null;
};

export type UserAuditAccessEvent = {
  id: number;
  created_at: string;
  user_id: number | null;
  user_name: string | null;
  user_email: string | null;
  session_id: number | null;
  session_jti: string | null;
  event_type: string;
  page_key: string | null;
  route_path: string | null;
  http_method: string | null;
  resource_type: string | null;
  resource_id: string | null;
  resource_fqn: string | null;
  datasource_id: number | null;
  schema_name: string | null;
  table_id: number | null;
  table_name: string | null;
  column_id: number | null;
  column_name: string | null;
  action: string | null;
  sensitivity_level: string | null;
  has_personal_data: boolean;
  has_sensitive_data: boolean;
  privacy_classification: string | null;
  metadata_json: Record<string, unknown> | unknown[] | null;
  ip_address: string | null;
  user_agent: string | null;
  request_id: string | null;
  correlation_id: string | null;
};

export type UserAuditChangeEvent = {
  id: number;
  created_at: string;
  user_id: number | null;
  actor_name: string | null;
  user_email: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  parent_entity_type: string | null;
  parent_entity_id: string | null;
  change_set_id: string | null;
  change_type: string | null;
  field_name: string | null;
  source_module: string | null;
  is_sensitive_change: boolean;
  sensitive_category: string | null;
  route: string | null;
  method: string | null;
  status_code: number | null;
  request_id: string | null;
  before_json: Record<string, unknown> | unknown[] | null;
  after_json: Record<string, unknown> | unknown[] | null;
  metadata_json: Record<string, unknown> | unknown[] | null;
};

export type UserAuditSessionPage = PageResponse<UserAuditSession>;
export type UserAuditAccessEventPage = PageResponse<UserAuditAccessEvent>;
export type UserAuditChangeEventPage = PageResponse<UserAuditChangeEvent>;

export type UserAuditListFilters = {
  page?: number;
  pageSize?: number;
  periodDays?: number;
  q?: string | null;
  userId?: number | null;
  eventType?: string | null;
  pageKey?: string | null;
  resourceType?: string | null;
  datasourceId?: number | null;
  schemaName?: string | null;
  tableId?: number | null;
  action?: string | null;
  sensitivityLevel?: string | null;
  status?: string | null;
  authMethod?: string | null;
  sensitiveOnly?: boolean;
  exportOnly?: boolean;
  module?: string | null;
};
