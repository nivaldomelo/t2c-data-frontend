import { apiRequest } from "@/lib/client-api";

import type {
  CollaborationComment,
  CollaborationCommentInput,
  CollaborationEvent,
  CollaborationListResponse,
  CollaborationSummary,
  CollaborationTask,
  CollaborationTaskInput,
  CollaborationTaskUpdateInput,
} from "./types";

function queryString(params: Record<string, string | number | boolean | null | undefined>): string {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === null || value === undefined || value === "") return;
    searchParams.set(key, String(value));
  });
  return searchParams.toString();
}

export async function getCollaborationSummary(): Promise<CollaborationSummary> {
  return apiRequest<CollaborationSummary>("/v1/collaboration/summary");
}

export async function listCollaborationTasks(filters: {
  entity_type?: string | null;
  entity_id?: number | null;
  status?: string | null;
  limit?: number;
} = {}): Promise<CollaborationListResponse<CollaborationTask>> {
  const params = queryString({
    entity_type: filters.entity_type ?? undefined,
    entity_id: filters.entity_id ?? undefined,
    status: filters.status ?? undefined,
    limit: filters.limit ?? 100,
  });
  return apiRequest<CollaborationListResponse<CollaborationTask>>(`/v1/collaboration/tasks${params ? `?${params}` : ""}`);
}

export async function listCollaborationComments(filters: {
  entity_type?: string | null;
  entity_id?: number | null;
  task_id?: number | null;
  limit?: number;
} = {}): Promise<CollaborationListResponse<CollaborationComment>> {
  const params = queryString({
    entity_type: filters.entity_type ?? undefined,
    entity_id: filters.entity_id ?? undefined,
    task_id: filters.task_id ?? undefined,
    limit: filters.limit ?? 100,
  });
  return apiRequest<CollaborationListResponse<CollaborationComment>>(`/v1/collaboration/comments${params ? `?${params}` : ""}`);
}

export async function listCollaborationEvents(filters: {
  entity_type?: string | null;
  entity_id?: number | null;
  limit?: number;
} = {}): Promise<CollaborationListResponse<CollaborationEvent>> {
  const params = queryString({
    entity_type: filters.entity_type ?? undefined,
    entity_id: filters.entity_id ?? undefined,
    limit: filters.limit ?? 100,
  });
  return apiRequest<CollaborationListResponse<CollaborationEvent>>(`/v1/collaboration/events${params ? `?${params}` : ""}`);
}

export async function createCollaborationComment(payload: CollaborationCommentInput): Promise<CollaborationComment> {
  return apiRequest<CollaborationComment>("/v1/collaboration/comments", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function createCollaborationTask(payload: CollaborationTaskInput): Promise<CollaborationTask> {
  return apiRequest<CollaborationTask>("/v1/collaboration/tasks", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateCollaborationTask(taskId: number, payload: CollaborationTaskUpdateInput): Promise<CollaborationTask> {
  return apiRequest<CollaborationTask>(`/v1/collaboration/tasks/${taskId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export const collaborationApi = {
  getCollaborationSummary,
  listCollaborationTasks,
  listCollaborationComments,
  listCollaborationEvents,
  createCollaborationComment,
  createCollaborationTask,
  updateCollaborationTask,
};
