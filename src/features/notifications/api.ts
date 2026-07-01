import { apiRequest } from "@/lib/client-api";

import type {
  InboxListResponse,
  InboxNotification,
  InboxRecipientOption,
  InboxStateFilter,
  InboxSummaryResponse,
} from "./types";

type InboxListParams = {
  state?: InboxStateFilter;
  category?: string | null;
  page?: number;
  limit?: number;
};

function buildInboxQuery(params: InboxListParams = {}): string {
  const query = new URLSearchParams();
  if (params.state && params.state !== "all") query.set("state", params.state);
  if (params.category) query.set("category", params.category);
  query.set("page", String(params.page ?? 1));
  query.set("limit", String(params.limit ?? 100));
  const qs = query.toString();
  return qs ? `?${qs}` : "";
}

export async function fetchInbox(params: InboxListParams = {}): Promise<InboxListResponse> {
  return apiRequest<InboxListResponse>(`/v1/me/inbox${buildInboxQuery(params)}`);
}

export async function fetchInboxSummary(): Promise<InboxSummaryResponse> {
  return apiRequest<InboxSummaryResponse>("/v1/me/inbox/summary");
}

export async function fetchInboxRecipients(query = "", limit = 20): Promise<InboxRecipientOption[]> {
  const params = new URLSearchParams();
  if (query.trim()) params.set("q", query.trim());
  params.set("limit", String(limit));
  const qs = params.toString();
  return apiRequest<InboxRecipientOption[]>(`/v1/me/inbox/recipients${qs ? `?${qs}` : ""}`);
}

async function updateInboxState(notificationId: number, action: "read" | "unread" | "archive"): Promise<InboxNotification> {
  return apiRequest<InboxNotification>(`/v1/me/inbox/${notificationId}/${action}`, { method: "POST" });
}

export async function markInboxRead(notificationId: number): Promise<InboxNotification> {
  return updateInboxState(notificationId, "read");
}

export async function markInboxUnread(notificationId: number): Promise<InboxNotification> {
  return updateInboxState(notificationId, "unread");
}

export async function archiveInbox(notificationId: number): Promise<InboxNotification> {
  return updateInboxState(notificationId, "archive");
}

export async function forwardInbox(notificationId: number, recipientUserId: number): Promise<InboxNotification> {
  return apiRequest<InboxNotification>(`/v1/me/inbox/${notificationId}/forward`, {
    method: "POST",
    body: JSON.stringify({ recipient_user_id: recipientUserId }),
  });
}
