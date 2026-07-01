import { apiRequest } from "@/lib/client-api";

import type {
  GovernanceChangeManagementAssetSla,
  GovernanceChangeManagementAssetSlaInput,
  GovernanceChangeManagementAssetSlaList,
  GovernanceChangeManagementRequest,
  GovernanceChangeManagementRequestInput,
  GovernanceChangeManagementRequestList,
  GovernanceChangeManagementTransitionInput,
} from "./change-management/types";
import type {
  GovernanceAssistantActionInput,
  GovernanceAssistantActionResponse,
  GovernancePlaybooksResponse,
  GovernanceRecommendationContextResponse,
  GovernanceRecommendationFeedbackInput,
  GovernanceRecommendationFeedbackResponse,
  GovernanceRecommendationListResponse,
  GovernanceRecommendationResolutionResponse,
} from "./recommendations/types";

function queryString(params: Record<string, string | number | boolean | null | undefined>): string {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === null || value === undefined || value === "") return;
    searchParams.set(key, String(value));
  });
  return searchParams.toString();
}

export async function listGovernancePlaybooks(params: { table_id?: number | null; include_inactive?: boolean } = {}): Promise<GovernancePlaybooksResponse> {
  const qs = queryString({
    table_id: params.table_id ?? undefined,
    include_inactive: params.include_inactive ?? undefined,
  });
  return apiRequest<GovernancePlaybooksResponse>(`/v1/governance/playbooks${qs ? `?${qs}` : ""}`);
}

export async function listGovernanceAssetSlas(params: { asset_type: string; asset_id: number }): Promise<GovernanceChangeManagementAssetSlaList> {
  const qs = queryString({
    asset_type: params.asset_type,
    asset_id: params.asset_id,
  });
  return apiRequest<GovernanceChangeManagementAssetSlaList>(`/v1/governance/change-management/asset-slas${qs ? `?${qs}` : ""}`);
}

export async function upsertGovernanceAssetSla(payload: GovernanceChangeManagementAssetSlaInput): Promise<GovernanceChangeManagementAssetSla> {
  return apiRequest<GovernanceChangeManagementAssetSla>("/v1/governance/change-management/asset-slas", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function listGovernanceChangeRequests(params: {
  asset_type?: string | null;
  asset_id?: number | null;
  status?: string | null;
  page?: number;
  page_size?: number;
} = {}): Promise<GovernanceChangeManagementRequestList> {
  const qs = queryString({
    asset_type: params.asset_type ?? undefined,
    asset_id: params.asset_id ?? undefined,
    status: params.status ?? undefined,
    page: params.page ?? undefined,
    page_size: params.page_size ?? undefined,
  });
  return apiRequest<GovernanceChangeManagementRequestList>(`/v1/governance/change-management/requests${qs ? `?${qs}` : ""}`);
}

export async function createGovernanceChangeRequest(
  payload: GovernanceChangeManagementRequestInput,
): Promise<GovernanceChangeManagementRequest> {
  return apiRequest<GovernanceChangeManagementRequest>("/v1/governance/change-management/requests", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getGovernanceChangeRequest(requestRef: string): Promise<GovernanceChangeManagementRequest> {
  return apiRequest<GovernanceChangeManagementRequest>(`/v1/governance/change-management/requests/${encodeURIComponent(requestRef)}`);
}

async function transitionGovernanceChangeRequest(
  requestRef: string,
  transition: "review" | "approve" | "apply" | "reject",
  payload?: GovernanceChangeManagementTransitionInput,
): Promise<GovernanceChangeManagementRequest> {
  return apiRequest<GovernanceChangeManagementRequest>(
    `/v1/governance/change-management/requests/${encodeURIComponent(requestRef)}/${transition}`,
    {
      method: "POST",
      body: JSON.stringify(payload || {}),
    },
  );
}

export async function reviewGovernanceChangeRequest(
  requestRef: string,
  payload?: GovernanceChangeManagementTransitionInput,
): Promise<GovernanceChangeManagementRequest> {
  return transitionGovernanceChangeRequest(requestRef, "review", payload);
}

export async function approveGovernanceChangeRequest(
  requestRef: string,
  payload?: GovernanceChangeManagementTransitionInput,
): Promise<GovernanceChangeManagementRequest> {
  return transitionGovernanceChangeRequest(requestRef, "approve", payload);
}

export async function applyGovernanceChangeRequest(
  requestRef: string,
  payload?: GovernanceChangeManagementTransitionInput,
): Promise<GovernanceChangeManagementRequest> {
  return transitionGovernanceChangeRequest(requestRef, "apply", payload);
}

export async function rejectGovernanceChangeRequest(
  requestRef: string,
  payload?: GovernanceChangeManagementTransitionInput,
): Promise<GovernanceChangeManagementRequest> {
  return transitionGovernanceChangeRequest(requestRef, "reject", payload);
}

export async function listGovernanceRecommendations(
  path: string,
  init?: RequestInit,
): Promise<GovernanceRecommendationListResponse> {
  return apiRequest<GovernanceRecommendationListResponse>(path, init);
}

export async function getGovernanceRecommendationContext(
  recommendationRef: string,
  init?: RequestInit,
): Promise<GovernanceRecommendationContextResponse> {
  return apiRequest<GovernanceRecommendationContextResponse>(
    `/v1/governance/recommendations/${encodeURIComponent(recommendationRef)}/context`,
    init,
  );
}

export async function resolveGovernanceRecommendations(payload: {
  recommendation_ids: number[];
  resolution_action: string;
  resolution_note?: string | null;
}): Promise<GovernanceRecommendationResolutionResponse> {
  return apiRequest<GovernanceRecommendationResolutionResponse>("/v1/governance/recommendations/batch/resolve", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function applyGovernancePolicyRecommendations(payload: {
  recommendation_ids: number[];
  resolution_action: string;
  resolution_note?: string | null;
}): Promise<GovernanceRecommendationResolutionResponse> {
  return apiRequest<GovernanceRecommendationResolutionResponse>("/v1/governance/recommendations/batch/apply-policy", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function submitGovernanceRecommendationFeedback(
  recommendationRef: string,
  payload: GovernanceRecommendationFeedbackInput,
): Promise<GovernanceRecommendationFeedbackResponse> {
  return apiRequest<GovernanceRecommendationFeedbackResponse>(
    `/v1/governance/recommendations/${encodeURIComponent(recommendationRef)}/feedback`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function executeGovernanceAssistantAction(
  recommendationRef: string,
  payload: GovernanceAssistantActionInput,
): Promise<GovernanceAssistantActionResponse> {
  return apiRequest<GovernanceAssistantActionResponse>(
    `/v1/governance/recommendations/${encodeURIComponent(recommendationRef)}/assistant/execute`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export const governanceSdk = {
  listGovernancePlaybooks,
  listGovernanceRecommendations,
  getGovernanceRecommendationContext,
  resolveGovernanceRecommendations,
  applyGovernancePolicyRecommendations,
  submitGovernanceRecommendationFeedback,
  executeGovernanceAssistantAction,
  listGovernanceAssetSlas,
  upsertGovernanceAssetSla,
  listGovernanceChangeRequests,
  createGovernanceChangeRequest,
  getGovernanceChangeRequest,
  reviewGovernanceChangeRequest,
  approveGovernanceChangeRequest,
  applyGovernanceChangeRequest,
  rejectGovernanceChangeRequest,
};
