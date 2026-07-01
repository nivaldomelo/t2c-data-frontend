import { apiRequest } from "@/lib/client-api";

import type {
  PlatformAutomationAction,
  PlatformAutomationActionsResponse,
  PlatformAutomationEvaluationResponse,
  PlatformAutomationExecuteInput,
  PlatformAutomationExecution,
  PlatformAutomationExecutionsResponse,
  PlatformAutomationRule,
  PlatformAutomationRuleInput,
  PlatformAutomationRulesResponse,
  ExternalApiKey,
  ExternalApiKeyCreateInput,
  ExternalApiKeyCreated,
  ExternalApiKeyRotate,
  ExternalApiKeyUpdateInput,
  ExternalApiScope,
  PlatformDomainEvent,
  PlatformDomainEventsResponse,
  PlatformSupportedEventsResponse,
  PlatformAnalyticsSummary,
  PlatformCockpitQueuePage,
  PlatformCockpitRecommendedActionsResponse,
  PlatformJobsHistoryFilters,
  PlatformJobsHistoryResponse,
  PlatformJobsRunInput,
  PlatformJobsStatus,
  PlatformIntegrationSyncJob,
  PlatformUsageEventInput,
} from "./types";

type PageResponse<T> = {
  items?: T[];
  total?: number;
  page?: number;
  page_size?: number;
  has_more?: boolean;
};

export type PlatformDomainEventFilters = {
  days?: number;
  limit?: number;
  table_id?: number | null;
  entity_type?: string | null;
  event_key?: string | null;
  category?: string | null;
  severity?: string | null;
  q?: string | null;
};

function queryString(params: Record<string, string | number | boolean | null | undefined>): string {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === null || value === undefined || value === "") return;
    searchParams.set(key, String(value));
  });
  return searchParams.toString();
}

export async function listPlatformDomainEvents(filters: PlatformDomainEventFilters = {}): Promise<PlatformDomainEventsResponse> {
  const params = queryString({
    days: filters.days ?? 30,
    limit: filters.limit ?? 100,
    table_id: filters.table_id ?? undefined,
    entity_type: filters.entity_type ?? undefined,
    event_key: filters.event_key ?? undefined,
    category: filters.category ?? undefined,
    severity: filters.severity ?? undefined,
    q: filters.q ?? undefined,
  });
  return apiRequest<PlatformDomainEventsResponse>(`/v1/platform/events${params ? `?${params}` : ""}`);
}

export async function getPlatformDomainEvent(eventId: number): Promise<PlatformDomainEvent> {
  return apiRequest<PlatformDomainEvent>(`/v1/platform/events/${eventId}`);
}

export async function listSupportedPlatformEvents(): Promise<PlatformSupportedEventsResponse> {
  return apiRequest<PlatformSupportedEventsResponse>("/v1/platform/events/catalog");
}

export async function listAutomationActions(): Promise<PlatformAutomationActionsResponse> {
  return apiRequest<PlatformAutomationActionsResponse>("/v1/platform/automations/actions");
}

export async function listAutomationRules(): Promise<PlatformAutomationRulesResponse> {
  return apiRequest<PlatformAutomationRulesResponse>("/v1/platform/automations/rules");
}

export async function createAutomationRule(payload: PlatformAutomationRuleInput): Promise<PlatformAutomationRule> {
  return apiRequest<PlatformAutomationRule>("/v1/platform/automations/rules", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateAutomationRule(ruleId: number, payload: PlatformAutomationRuleInput): Promise<PlatformAutomationRule> {
  return apiRequest<PlatformAutomationRule>(`/v1/platform/automations/rules/${ruleId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteAutomationRule(ruleId: number): Promise<void> {
  await apiRequest(`/v1/platform/automations/rules/${ruleId}`, { method: "DELETE" });
}

export async function runAutomationRule(ruleId: number): Promise<PlatformAutomationExecution> {
  return apiRequest<PlatformAutomationExecution>(`/v1/platform/automations/rules/${ruleId}/run`, {
    method: "POST",
  });
}

export async function evaluateAutomationRules(): Promise<PlatformAutomationEvaluationResponse> {
  return apiRequest<PlatformAutomationEvaluationResponse>("/v1/platform/automations/evaluate", {
    method: "POST",
  });
}

export async function listAutomationExecutions(limit = 50): Promise<PlatformAutomationExecutionsResponse> {
  return apiRequest<PlatformAutomationExecutionsResponse>(`/v1/platform/automations/executions?limit=${encodeURIComponent(String(limit))}`);
}

export async function executeAutomationAction(payload: PlatformAutomationExecuteInput): Promise<PlatformAutomationExecution> {
  return apiRequest<PlatformAutomationExecution>("/v1/platform/automations/execute", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function trackPlatformEvent(payload: PlatformUsageEventInput): Promise<void> {
  try {
    await apiRequest("/v1/platform/analytics/events", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  } catch {
    // Analytics should never block the primary UX flow.
  }
}

export async function getPlatformAnalyticsSummary(days = 30): Promise<PlatformAnalyticsSummary> {
  return apiRequest<PlatformAnalyticsSummary>(`/v1/platform/analytics/summary?days=${encodeURIComponent(String(days))}`);
}

export async function getPlatformJobsStatus(limit = 12): Promise<PlatformJobsStatus> {
  return apiRequest<PlatformJobsStatus>(`/v1/platform/jobs/status?limit=${encodeURIComponent(String(limit))}`);
}

export async function getPlatformCockpitRecommendedActions(limit = 10): Promise<PlatformCockpitRecommendedActionsResponse> {
  return apiRequest<PlatformCockpitRecommendedActionsResponse>(
    `/v1/platform/cockpit/recommended-actions?limit=${encodeURIComponent(String(limit))}`,
  );
}

export async function getPlatformCockpitQueues(
  params: {
    category?: string | null;
    status?: string | null;
    severity?: string | null;
    q?: string | null;
    page?: number;
    pageSize?: number;
  } = {},
): Promise<PlatformCockpitQueuePage> {
  const query = queryString({
    category: params.category ?? undefined,
    status: params.status ?? undefined,
    severity: params.severity ?? undefined,
    q: params.q ?? undefined,
    page: params.page ?? 1,
    page_size: params.pageSize ?? 20,
  });
  return apiRequest<PlatformCockpitQueuePage>(`/v1/platform/cockpit/queues${query ? `?${query}` : ""}`);
}

export async function listPlatformJobsHistory(
  page = 1,
  pageSize = 20,
  filters: PlatformJobsHistoryFilters = {},
): Promise<PlatformJobsHistoryResponse> {
  const params = queryString({
    page,
    page_size: pageSize,
    source: filters.source ?? undefined,
    job_type: filters.job_type ?? undefined,
    status: filters.status ?? undefined,
  });
  return apiRequest<PlatformJobsHistoryResponse>(`/v1/platform/jobs/history${params ? `?${params}` : ""}`);
}

export async function runPlatformJob(payload: PlatformJobsRunInput): Promise<PlatformIntegrationSyncJob> {
  return apiRequest<PlatformIntegrationSyncJob>("/v1/platform/jobs/run", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function listExternalApiScopes(): Promise<ExternalApiScope[]> {
  const response = await apiRequest<ExternalApiScope[] | PageResponse<ExternalApiScope>>(
    "/v1/platform/api-keys/scopes?page=1&page_size=100",
  );
  return Array.isArray(response) ? response : response.items ?? [];
}

export async function listExternalApiKeys(): Promise<ExternalApiKey[]> {
  const pageSize = 100;
  const items: ExternalApiKey[] = [];
  let page = 1;
  while (true) {
    const response = await apiRequest<ExternalApiKey[] | PageResponse<ExternalApiKey>>(
      `/v1/platform/api-keys?page=${page}&page_size=${pageSize}`,
    );
    const pageItems = Array.isArray(response) ? response : response.items ?? [];
    items.push(...pageItems);
    if (Array.isArray(response) || !response.has_more || pageItems.length === 0) {
      break;
    }
    page += 1;
  }
  return items;
}

export async function getExternalApiKey(keyId: number): Promise<ExternalApiKey> {
  return apiRequest<ExternalApiKey>(`/v1/platform/api-keys/${keyId}`);
}

export async function createExternalApiKey(payload: ExternalApiKeyCreateInput): Promise<ExternalApiKeyCreated> {
  return apiRequest<ExternalApiKeyCreated>("/v1/platform/api-keys", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateExternalApiKey(keyId: number, payload: ExternalApiKeyUpdateInput): Promise<ExternalApiKey> {
  return apiRequest<ExternalApiKey>(`/v1/platform/api-keys/${keyId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function rotateExternalApiKey(keyId: number): Promise<ExternalApiKeyRotate> {
  return apiRequest<ExternalApiKeyRotate>(`/v1/platform/api-keys/${keyId}/rotate`, {
    method: "POST",
  });
}

export async function revokeExternalApiKey(keyId: number): Promise<ExternalApiKey> {
  return apiRequest<ExternalApiKey>(`/v1/platform/api-keys/${keyId}/revoke`, {
    method: "POST",
  });
}

export const platformSdk = {
  listPlatformDomainEvents,
  getPlatformDomainEvent,
  listSupportedPlatformEvents,
  listAutomationActions,
  listAutomationRules,
  createAutomationRule,
  updateAutomationRule,
  deleteAutomationRule,
  runAutomationRule,
  evaluateAutomationRules,
  listAutomationExecutions,
  executeAutomationAction,
  getPlatformJobsStatus,
  getPlatformCockpitRecommendedActions,
  getPlatformCockpitQueues,
  listPlatformJobsHistory,
  runPlatformJob,
  listDomainEvents: listPlatformDomainEvents,
  getDomainEvent: getPlatformDomainEvent,
  trackPlatformEvent,
  getPlatformAnalyticsSummary,
  listExternalApiScopes,
  listExternalApiKeys,
  getExternalApiKey,
  createExternalApiKey,
  updateExternalApiKey,
  rotateExternalApiKey,
  revokeExternalApiKey,
};
