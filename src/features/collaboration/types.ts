export type CollaborationEntityType = "table" | "incident" | "dq_rule" | "semantic_domain" | "semantic_product";

export type CollaborationComment = {
  id: number;
  entity_type: CollaborationEntityType;
  entity_id: number;
  entity_label: string;
  body: string;
  comment_kind: string;
  task_id?: number | null;
  parent_comment_id?: number | null;
  visibility_scope: string;
  is_resolved: boolean;
  resolved_at?: string | null;
  author_user_id?: number | null;
  author_name?: string | null;
  author_email?: string | null;
  resolved_by_user_id?: number | null;
  context_json?: Record<string, unknown> | unknown[] | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type CollaborationTask = {
  id: number;
  entity_type: CollaborationEntityType;
  entity_id: number;
  entity_label: string;
  title: string;
  description?: string | null;
  task_type: string;
  status: string;
  priority: string;
  responsibility_role?: string | null;
  assigned_to_user_id?: number | null;
  assigned_by_user_id?: number | null;
  due_at?: string | null;
  completed_at?: string | null;
  completed_by_user_id?: number | null;
  linked_request_type?: string | null;
  context_json?: Record<string, unknown> | unknown[] | null;
  comments_count: number;
  event_count: number;
  created_at?: string | null;
  updated_at?: string | null;
};

export type CollaborationEvent = {
  id: number;
  entity_type: CollaborationEntityType;
  entity_id: number;
  event_type: string;
  title: string;
  detail?: string | null;
  status_from?: string | null;
  status_to?: string | null;
  actor_user_id?: number | null;
  actor_name?: string | null;
  actor_email?: string | null;
  comment_id?: number | null;
  task_id?: number | null;
  payload_json?: Record<string, unknown> | unknown[] | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type CollaborationSummary = {
  generated_at: string;
  total_comments: number;
  total_tasks: number;
  open_tasks: number;
  overdue_tasks: number;
  completed_tasks: number;
  assets_without_owner: number;
  domains_without_steward: number;
  documentation_stale: number;
  pending_governance_tasks: number;
  recent_comments: number;
  recent_events: number;
  items: CollaborationTask[];
  comments: CollaborationComment[];
  events: CollaborationEvent[];
};

export type CollaborationListResponse<T> = {
  generated_at: string;
  total: number;
  items: T[];
};

export type CollaborationCommentInput = {
  entity_type: CollaborationEntityType;
  entity_id: number;
  entity_label: string;
  body: string;
  comment_kind?: string;
  task_id?: number | null;
  parent_comment_id?: number | null;
  visibility_scope?: string;
  context_json?: Record<string, unknown> | unknown[] | null;
};

export type CollaborationTaskInput = {
  entity_type: CollaborationEntityType;
  entity_id: number;
  entity_label: string;
  title: string;
  description?: string | null;
  task_type?: string;
  status?: string;
  priority?: string;
  responsibility_role?: string | null;
  assigned_to_user_id?: number | null;
  due_at?: string | null;
  linked_request_type?: string | null;
  context_json?: Record<string, unknown> | unknown[] | null;
  comment?: string | null;
};

export type CollaborationTaskUpdateInput = {
  title?: string | null;
  description?: string | null;
  task_type?: string | null;
  status?: string | null;
  priority?: string | null;
  responsibility_role?: string | null;
  assigned_to_user_id?: number | null;
  due_at?: string | null;
  context_json?: Record<string, unknown> | unknown[] | null;
};
