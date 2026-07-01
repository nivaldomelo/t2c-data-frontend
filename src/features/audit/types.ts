export type AuditFilterOption = {
  value: string;
  label: string;
};

export type AuditHistoryEvent = {
  id: number;
  change_set_id: string | null;
  changed_at: string;
  actor_user_id: number | null;
  actor_name: string | null;
  actor_email: string | null;
  action: string;
  change_type: string | null;
  field_name: string | null;
  entity_type: string | null;
  entity_id: string | null;
  parent_entity_type: string | null;
  parent_entity_id: string | null;
  source_module: string | null;
  is_sensitive_change: boolean;
  sensitive_category: string | null;
  before_value: unknown;
  after_value: unknown;
  metadata_json: Record<string, unknown> | null;
  route: string | null;
  method: string | null;
  status_code: number | null;
  table_id: number | null;
  table_name: string | null;
  schema_name: string | null;
  database_name: string | null;
  datasource_name: string | null;
};

export type AuditHistoryPage = {
  items: AuditHistoryEvent[];
  total: number;
  page: number;
  page_size: number;
};

export type AuditHistoryFilterOptions = {
  entity_types: AuditFilterOption[];
  change_types: AuditFilterOption[];
  field_names: AuditFilterOption[];
  source_modules: AuditFilterOption[];
  users: AuditFilterOption[];
};
