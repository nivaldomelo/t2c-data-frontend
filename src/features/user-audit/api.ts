import { apiRequest } from "@/lib/client-api";

import type {
  UserAuditAccessEvent,
  UserAuditAccessEventPage,
  UserAuditChangeEventPage,
  UserAuditListFilters,
  UserAuditSessionPage,
  UserAuditSummary,
} from "./types";

function queryString(params: Record<string, string | number | boolean | null | undefined>): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === null || value === undefined || value === "") return;
    search.set(key, String(value));
  });
  return search.toString();
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const target = `${name}=`;
  const cookies = document.cookie.split(";");
  for (const raw of cookies) {
    const item = raw.trim();
    if (item.startsWith(target)) {
      return decodeURIComponent(item.slice(target.length));
    }
  }
  return null;
}

export async function getUserAuditSummary(periodDays = 30): Promise<UserAuditSummary> {
  return apiRequest<UserAuditSummary>(`/v1/admin/user-audit/summary?period_days=${encodeURIComponent(String(periodDays))}`);
}

export async function listUserAuditSessions(filters: UserAuditListFilters = {}): Promise<UserAuditSessionPage> {
  const query = queryString({
    page: filters.page ?? 1,
    page_size: filters.pageSize ?? 25,
    period_days: filters.periodDays ?? 30,
    q: filters.q ?? undefined,
    user_id: filters.userId ?? undefined,
    status: filters.status ?? undefined,
    auth_method: filters.authMethod ?? undefined,
  });
  return apiRequest<UserAuditSessionPage>(`/v1/admin/user-audit/sessions${query ? `?${query}` : ""}`);
}

export async function listUserAuditEvents(filters: UserAuditListFilters = {}): Promise<UserAuditAccessEventPage> {
  const query = queryString({
    page: filters.page ?? 1,
    page_size: filters.pageSize ?? 25,
    period_days: filters.periodDays ?? 30,
    q: filters.q ?? undefined,
    user_id: filters.userId ?? undefined,
    event_type: filters.eventType ?? undefined,
    page_key: filters.pageKey ?? undefined,
    resource_type: filters.resourceType ?? undefined,
    datasource_id: filters.datasourceId ?? undefined,
    schema_name: filters.schemaName ?? undefined,
    table_id: filters.tableId ?? undefined,
    action: filters.action ?? undefined,
    sensitivity_level: filters.sensitivityLevel ?? undefined,
    sensitive_only: filters.sensitiveOnly ?? undefined,
    export_only: filters.exportOnly ?? undefined,
  });
  return apiRequest<UserAuditAccessEventPage>(`/v1/admin/user-audit/events${query ? `?${query}` : ""}`);
}

export async function listUserAuditChanges(filters: UserAuditListFilters = {}): Promise<UserAuditChangeEventPage> {
  const query = queryString({
    page: filters.page ?? 1,
    page_size: filters.pageSize ?? 25,
    period_days: filters.periodDays ?? 30,
    q: filters.q ?? undefined,
    user_id: filters.userId ?? undefined,
    module: filters.module ?? undefined,
    action: filters.action ?? undefined,
    sensitive_only: filters.sensitiveOnly ?? undefined,
  });
  return apiRequest<UserAuditChangeEventPage>(`/v1/admin/user-audit/changes${query ? `?${query}` : ""}`);
}

export async function listUserAuditSensitiveAccess(filters: UserAuditListFilters = {}): Promise<UserAuditAccessEventPage> {
  const query = queryString({
    page: filters.page ?? 1,
    page_size: filters.pageSize ?? 25,
    period_days: filters.periodDays ?? 30,
    q: filters.q ?? undefined,
    user_id: filters.userId ?? undefined,
  });
  return apiRequest<UserAuditAccessEventPage>(`/v1/admin/user-audit/sensitive-access${query ? `?${query}` : ""}`);
}

export async function listUserAuditExports(filters: UserAuditListFilters = {}): Promise<UserAuditChangeEventPage> {
  const query = queryString({
    page: filters.page ?? 1,
    page_size: filters.pageSize ?? 25,
    period_days: filters.periodDays ?? 30,
    q: filters.q ?? undefined,
    user_id: filters.userId ?? undefined,
  });
  return apiRequest<UserAuditChangeEventPage>(`/v1/admin/user-audit/exports${query ? `?${query}` : ""}`);
}

export async function exportUserAuditEvents(filters: UserAuditListFilters = {}): Promise<string> {
  const query = queryString({
    period_days: filters.periodDays ?? 30,
    q: filters.q ?? undefined,
    user_id: filters.userId ?? undefined,
    event_type: filters.eventType ?? undefined,
    page_key: filters.pageKey ?? undefined,
    resource_type: filters.resourceType ?? undefined,
    datasource_id: filters.datasourceId ?? undefined,
    schema_name: filters.schemaName ?? undefined,
    table_id: filters.tableId ?? undefined,
    action: filters.action ?? undefined,
    sensitivity_level: filters.sensitivityLevel ?? undefined,
    sensitive_only: filters.sensitiveOnly ?? undefined,
  });
  const response = await fetch(`/api/v1/admin/user-audit/events/export.csv${query ? `?${query}` : ""}`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(readCookie("auth_csrf_token") ? { "X-CSRF-Token": readCookie("auth_csrf_token") as string } : {}),
    },
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.text();
}

export async function recordUserAuditPageView(payload: {
  routePath: string;
  pageKey?: string | null;
  eventType?: "page_view" | "asset_view" | "search" | "filter_apply" | "export" | "api_access" | "sensitive_view";
  action?: string;
  resourceType?: string | null;
  resourceId?: string | number | null;
  resourceFqn?: string | null;
  datasourceId?: number | null;
  schemaName?: string | null;
  tableId?: number | null;
  tableName?: string | null;
  columnId?: number | null;
  columnName?: string | null;
  sensitivityLevel?: string | null;
  hasPersonalData?: boolean;
  hasSensitiveData?: boolean;
  privacyClassification?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await apiRequest("/v1/activity/page-view", {
      method: "POST",
      body: JSON.stringify({
        route_path: payload.routePath,
        page_key: payload.pageKey ?? null,
        event_type: payload.eventType ?? "page_view",
        action: payload.action ?? "view",
        resource_type: payload.resourceType ?? null,
        resource_id: payload.resourceId ?? null,
        resource_fqn: payload.resourceFqn ?? null,
        datasource_id: payload.datasourceId ?? null,
        schema_name: payload.schemaName ?? null,
        table_id: payload.tableId ?? null,
        table_name: payload.tableName ?? null,
        column_id: payload.columnId ?? null,
        column_name: payload.columnName ?? null,
        sensitivity_level: payload.sensitivityLevel ?? null,
        has_personal_data: Boolean(payload.hasPersonalData),
        has_sensitive_data: Boolean(payload.hasSensitiveData),
        privacy_classification: payload.privacyClassification ?? null,
        metadata: payload.metadata ?? {},
      }),
    });
  } catch {
    // Telemetry must never block the UX.
  }
}

export async function recordUserAuditHeartbeat(): Promise<void> {
  try {
    await apiRequest("/v1/activity/heartbeat", { method: "POST" });
  } catch {
    // best effort
  }
}
