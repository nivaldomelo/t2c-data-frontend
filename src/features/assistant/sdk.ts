import { apiRequest } from "@/lib/client-api";

import type {
  AssistantActionInput,
  AssistantActionResponse,
  AssistantDataOwnerOption,
  AssistantExplainResponse,
} from "./types";

type PageResponse<T> = {
  items?: T[];
  total?: number;
  page?: number;
  page_size?: number;
  has_more?: boolean;
};

export async function explainAssistantAsset(assetRef: string, init?: RequestInit): Promise<AssistantExplainResponse> {
  return apiRequest<AssistantExplainResponse>(`/v1/assistant/explain/${encodeURIComponent(assetRef)}`, {
    method: "POST",
    ...init,
  });
}

export async function executeAssistantAction(
  assetRef: string,
  payload: AssistantActionInput,
  init?: RequestInit,
): Promise<AssistantActionResponse> {
  return apiRequest<AssistantActionResponse>(`/v1/assistant/actions/${encodeURIComponent(assetRef)}`, {
    method: "POST",
    body: JSON.stringify(payload),
    ...init,
  });
}

export async function listAssistantDataOwners(init?: RequestInit): Promise<AssistantDataOwnerOption[]> {
  const response = await apiRequest<AssistantDataOwnerOption[] | PageResponse<AssistantDataOwnerOption>>(
    "/v1/data-owners?active=true&page=1&page_size=100",
    init,
  );
  return Array.isArray(response) ? response : response.items ?? [];
}

export const assistantSdk = {
  explainAssistantAsset,
  executeAssistantAction,
  listAssistantDataOwners,
};
