export type InboxStateFilter = "all" | "unread" | "read" | "archived";

export type InboxCategoryCount = {
  key: string;
  count: number;
};

export type InboxSummaryResponse = {
  total: number;
  unread: number;
  due_delivery: number;
  by_category: InboxCategoryCount[];
};

export type InboxNotification = {
  id: number;
  category: string;
  severity: string;
  source_module: string;
  source_entity_type: string;
  source_entity_id: string;
  title: string;
  message: string;
  href?: string | null;
  state: string;
  delivery_state: string;
  context_json?: Record<string, unknown> | null;
  forwarded_from_notification_id?: number | null;
  forwarded_by_user_id?: number | null;
  forwarded_by_user_name?: string | null;
  forwarded_by_user_email?: string | null;
  forwarded_at?: string | null;
  first_seen_at: string;
  last_seen_at: string;
  last_notified_at?: string | null;
  next_delivery_at?: string | null;
  read_at?: string | null;
  archived_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type InboxListResponse = {
  generated_at: string;
  total: number;
  page: number;
  page_size: number;
  has_more: boolean;
  items: InboxNotification[];
};

export type InboxRecipientOption = {
  id: number;
  display_name: string;
  email: string;
};
