export type PlatformMetricItem = {
  label: string;
  value: number;
};

export type PlatformAnalyticsTopAsset = {
  asset_id: number;
  asset_type: string;
  asset_name: string;
  schema_name?: string | null;
  qualified_name: string;
  source_name?: string | null;
  total_clicks: number;
  entity_type?: string | null;
  entity_id?: number | null;
  count?: number | null;
};

export type PlatformAnalyticsTrendPoint = {
  label: string;
  search_queries: number;
  search_clicks: number;
  usage_events: number;
  explorer_page_views: number;
  incidents_page_views: number;
  certification_page_views: number;
  privacy_page_views: number;
  legacy_api_hits: number;
};

export type PlatformAnalyticsSummary = {
  generated_at: string;
  window_days: number;
  search_queries: number;
  search_clicks: number;
  usage_events: number;
  search_to_asset_conversion_pct: number;
  dashboard_to_action_count: number;
  campaign_to_update_count: number;
  explorer_page_views: number;
  incidents_page_views: number;
  certification_page_views: number;
  privacy_page_views: number;
  legacy_api_hits: number;
  legacy_api_cutoff_window_days: number;
  managed_legacy_modules: string[];
  disabled_legacy_modules: string[];
  force_enabled_legacy_modules: string[];
  eligible_legacy_modules_to_disable: string[];
  top_modules: PlatformMetricItem[];
  top_events: PlatformMetricItem[];
  top_legacy_modules: PlatformMetricItem[];
  top_assets: PlatformAnalyticsTopAsset[];
  trend: PlatformAnalyticsTrendPoint[];
};

export type PlatformLegacyApiSurfaceItem = {
  module: string;
  legacy_prefixes: string[];
  canonical_prefixes: string[];
  hits_total: number;
  hits_in_window: number;
  last_hit_at?: string | null;
  managed: boolean;
  disabled: boolean;
  forced_enabled: boolean;
  physically_removed: boolean;
  sunset_status: string;
  note: string;
};

export type PlatformLegacyApiSurface = {
  window_days: number;
  official_surface: string;
  temporary_surface: string;
  items: PlatformLegacyApiSurfaceItem[];
};

export type PlatformIntegrationSyncJob = {
  id: number;
  job_key: string;
  source: string;
  job_type: string;
  target_type?: string | null;
  target_id?: number | null;
  target_name?: string | null;
  trigger_mode: string;
  status: string;
  queued_at?: string | null;
  started_at: string;
  finished_at?: string | null;
  next_expected_run_at?: string | null;
  records_processed?: number | null;
  progress_pct?: number | null;
  correlation_id?: string | null;
  requested_by_user_id?: number | null;
  error?: string | null;
  context_json?: Record<string, unknown> | unknown[] | null;
  result_summary_json?: Record<string, unknown> | unknown[] | null;
  artifact_public_id?: string | null;
  artifact_filename?: string | null;
  artifact_content_type?: string | null;
  artifact_storage_path?: string | null;
  artifact_available_at?: string | null;
  artifact_expires_at?: string | null;
  artifact_size_bytes?: number | null;
  artifact_download_count?: number;
  artifact_last_downloaded_at?: string | null;
  export_status_href?: string | null;
  export_download_href?: string | null;
  export_download_available?: boolean;
  created_at?: string | null;
  updated_at?: string | null;
  diagnostic_status?: string | null;
  diagnostic_severity?: string | null;
  diagnostic_label?: string | null;
  diagnostic_description?: string | null;
  diagnostic_impact?: string | null;
  diagnostic_recommended_action?: string | null;
  diagnostic_module?: string | null;
  diagnostic_probable_cause?: string | null;
  diagnostic_probable_cause_code?: string | null;
  diagnostic_evidence?: string | null;
  diagnostic_runbook_url?: string | null;
  diagnostic_correlation_id?: string | null;
  diagnostic_generated_at?: string | null;
  diagnostic_recurrence_count?: number | null;
  is_stalled?: boolean;
  is_overdue_next_run?: boolean;
  running_duration_seconds?: number | null;
};

export type PlatformJobsStatus = {
  generated_at: string;
  total: number;
  queued: number;
  running: number;
  success: number;
  failed: number;
  skipped: number;
  next_expected_run_at?: string | null;
  items: PlatformIntegrationSyncJob[];
};

export type PlatformJobsRunInput = {
  source: string;
  job_type: string;
  target_type?: string | null;
  target_id?: number | null;
  target_name?: string | null;
  trigger_mode?: string;
};

export type PlatformJobsHistoryResponse = {
  page: number;
  page_size: number;
  total: number;
  has_more: boolean;
  items: PlatformIntegrationSyncJob[];
};

export type PlatformJobsHistoryFilters = {
  source?: string | null;
  job_type?: string | null;
  status?: string | null;
};

export type PlatformAssetQueueItem = {
  table_id: number;
  table_name: string;
  table_fqn: string;
  target_url: string;
  status_label?: string | null;
  last_success_at?: string | null;
  pipeline_history_href?: string | null;
  hint?: string | null;
  pipeline_name?: string | null;
  dag_id?: string | null;
  rows_processed?: number | null;
  airflow_dag_href?: string | null;
  airflow_task_href?: string | null;
};

export type PlatformCockpitQueueItem = {
  id: string;
  type: string;
  category: string;
  title: string;
  subtitle?: string | null;
  severity: string;
  status: string;
  description: string;
  asset_id?: number | null;
  asset_name?: string | null;
  connection?: string | null;
  database?: string | null;
  schema?: string | null;
  pipeline_name?: string | null;
  dag_id?: string | null;
  task_id?: string | null;
  recommended_action?: string | null;
  route?: string | null;
  updated_at?: string | null;
  metadata?: Record<string, unknown>;
};

export type PlatformCockpitQueuePage = {
  generated_at: string;
  category?: string | null;
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
  has_more: boolean;
  items: PlatformCockpitQueueItem[];
};

export type PlatformCockpitRecommendedAction = {
  id: string;
  title: string;
  severity: string;
  origin: string;
  impact: string;
  reason: string;
  suggested_route?: string | null;
  primary_action_label: string;
  secondary_action_label?: string | null;
  context?: Record<string, unknown>;
  priority: number;
};

export type PlatformCockpitRecommendedActionsResponse = {
  generated_at: string;
  total: number;
  items: PlatformCockpitRecommendedAction[];
};

export type PlatformCorrelationPriorityItem = {
  asset_id: number;
  table_id: number;
  asset_name: string;
  qualified_name: string;
  schema_name: string;
  source_name: string;
  has_operational_failure: boolean;
  has_dq_degradation: boolean;
  has_open_incident: boolean;
  priority_score: number;
  correlation_type: string;
  summary: string;
  table_fqn?: string | null;
  total_clicks?: number | null;
  target_url?: string | null;
};

export type PlatformFailureItem = {
  id: number;
  status: string;
  created_at?: string | null;
  datasource_id?: number | null;
  table_id?: number | null;
  job_type?: string | null;
  table_fqn?: string | null;
  target_url?: string | null;
};

export type PlatformIngestionItem = {
  table_id?: number | null;
  schema_name?: string | null;
  table_name: string;
  table_fqn: string;
  pipeline_name?: string | null;
  dag_id?: string | null;
  task_name?: string | null;
  load_type?: string | null;
  load_type_label?: string | null;
  latest_status_label?: string | null;
  last_status?: string | null;
  last_success_at?: string | null;
  last_execution_finished_at?: string | null;
  last_run_started_at?: string | null;
  last_run_finished_at?: string | null;
  last_watermark?: string | null;
  watermark_value?: string | null;
  records_processed?: number | null;
  rows_processed?: number | null;
  observacao?: string | null;
  last_error?: string | null;
  pipeline_history_href?: string | null;
  airflow_dag_href?: string | null;
  airflow_task_href?: string | null;
  target_url?: string | null;
};

export type PlatformIngestionOverviewItem = PlatformIngestionItem;

export type PlatformIngestionOverview = {
  available: boolean;
  message?: string | null;
  generated_at?: string | null;
  pipelines_total: number;
  linked_tables: number;
  unmapped: number;
  degraded: number;
  failed: number;
  running: number;
  pending: number;
  stale: number;
  critical_stale: number;
  high_volume_failed: number;
  high_volume_failed_threshold_rows: number;
  stale_threshold_hours: number;
  items: PlatformIngestionOverviewItem[];
  unmapped_items: PlatformIngestionOverviewItem[];
  degraded_items: PlatformIngestionOverviewItem[];
  failed_items: PlatformIngestionOverviewItem[];
  critical_stale_items: PlatformIngestionOverviewItem[];
  high_volume_failed_items: PlatformIngestionOverviewItem[];
};

export type PlatformIngestionSummary = {
  available: boolean;
  message?: string | null;
  pipelines_total: number;
  linked_tables: number;
  unmapped: number;
  degraded: number;
  failed: number;
  running: number;
  pending: number;
  stale: number;
  critical_stale: number;
  high_volume_failed: number;
  high_volume_failed_threshold_rows: number;
  stale_threshold_hours: number;
  items: PlatformIngestionItem[];
  high_volume_failed_items: PlatformIngestionItem[];
};

export type PlatformCockpitSummary = {
  generated_at: string;
  runtime: Record<string, unknown>;
  health: Record<string, number>;
  correlation_priority: PlatformCorrelationPriorityItem[];
  queues: Record<string, PlatformAssetQueueItem[]>;
  recent_failures: Record<string, PlatformFailureItem[]>;
  ingestion: PlatformIngestionSummary;
  analytics: PlatformAnalyticsSummary;
};

export type ReadModelRefresh = {
  refreshed_at: string;
  search_entries: number;
  dashboard_entries: number;
};

export type AssetVisibilityRule = {
  id: number;
  entity_type: string;
  entity_id?: number | null;
  rule_scope: string;
  match_value?: string | null;
  allowed_role?: string | null;
  allowed_user_id?: number | null;
  visibility_scope: string;
  mask_sensitive_fields: boolean;
  reason?: string | null;
  is_active: boolean;
  created_at?: string | null;
};

export type AssetVisibilityRuleInput = {
  entity_type: string;
  entity_id?: number | null;
  rule_scope: string;
  match_value?: string | null;
  allowed_role?: string | null;
  allowed_user_id?: number | null;
  visibility_scope: string;
  mask_sensitive_fields?: boolean;
  reason?: string | null;
  is_active?: boolean;
};

export type PlatformUsageEventInput = {
  event_name: string;
  module_name: string;
  page_path?: string | null;
  entity_type?: string | null;
  entity_id?: number | null;
  target_url?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type PlatformAutomationAction = {
  key: string;
  label: string;
  description: string;
  category: string;
  category_label: string;
  executable: boolean;
  destructive: boolean;
  suggestion_only: boolean;
  requires_target: boolean;
  target_types: string[];
  scope_kinds: string[];
  hints: string[];
  default_payload_json?: Record<string, unknown> | null;
};

export type PlatformAutomationActionsResponse = {
  generated_at: string;
  total: number;
  items: PlatformAutomationAction[];
};

export type PlatformAutomationRuleInput = {
  name: string;
  description?: string | null;
  status?: string;
  scope_kind?: string;
  scope_value?: string | null;
  condition_kind: string;
  condition_operator?: string;
  threshold_value?: number | null;
  window_days?: number;
  action_key: string;
  action_target_json?: Record<string, unknown> | null;
  execution_mode?: string;
  notify_owner?: boolean;
  open_incident?: boolean;
  schedule_enabled?: boolean;
  notes?: string | null;
};

export type PlatformAutomationRule = PlatformAutomationRuleInput & {
  id: number;
  created_by_user_id?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
  last_evaluated_at?: string | null;
  last_triggered_at?: string | null;
  last_triggered_status?: string | null;
  last_triggered_summary_json?: Record<string, unknown> | unknown[] | null;
  execution_count: number;
  suggested_count: number;
  succeeded_count: number;
  failed_count: number;
};

export type PlatformAutomationRulesResponse = {
  generated_at: string;
  total: number;
  items: PlatformAutomationRule[];
};

export type PlatformAutomationExecuteInput = {
  action_key: string;
  table_id?: number | null;
  datasource_id?: number | null;
  dq_rule_id?: number | null;
  delivery_id?: number | null;
  incident_id?: number | null;
  data_owner_id?: number | null;
  request_type?: string | null;
  scope_kind?: string | null;
  scope_value?: string | null;
  target_json?: Record<string, unknown> | null;
  notes?: string | null;
};

export type PlatformAutomationExecution = {
  id: number;
  rule_id?: number | null;
  rule_name?: string | null;
  action_key: string;
  action_label: string;
  execution_mode: string;
  status: string;
  trigger_source: string;
  scope_kind: string;
  scope_value?: string | null;
  entity_type?: string | null;
  entity_id?: number | null;
  table_id?: number | null;
  datasource_id?: number | null;
  domain_name?: string | null;
  product_name?: string | null;
  target_json?: Record<string, unknown> | unknown[] | null;
  input_json?: Record<string, unknown> | unknown[] | null;
  result_json?: Record<string, unknown> | unknown[] | null;
  impact_json?: Record<string, unknown> | unknown[] | null;
  error_message?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
  created_by_user_id?: number | null;
  executed_by_user_id?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type PlatformAutomationExecutionsResponse = {
  generated_at: string;
  total: number;
  items: PlatformAutomationExecution[];
};

export type PlatformAutomationEvaluationResponse = {
  generated_at: string;
  rules_evaluated: number;
  suggestions_created: number;
  actions_executed: number;
  skipped: number;
  items: PlatformAutomationExecution[];
};

export type PlatformDomainEvent = {
  id: number;
  event_key: string;
  category: string;
  category_label: string;
  severity: string;
  title: string;
  summary?: string | null;
  source_module?: string | null;
  source_action?: string | null;
  entity_type?: string | null;
  entity_id?: number | null;
  table_id?: number | null;
  column_id?: number | null;
  datasource_id?: number | null;
  actor_user_id?: number | null;
  actor_name?: string | null;
  actor_email?: string | null;
  manual_mode: string;
  correlation_key?: string | null;
  payload_json: Record<string, unknown>;
  occurred_at: string;
};

export type ExternalApiScopeAction = {
  key: string;
  action: "read" | "create" | "update" | "delete";
  label: string;
  description: string;
  available: boolean;
  destructive: boolean;
  requires_read: boolean;
  methods: string[];
  endpoints: string[];
};

export type ExternalApiScope = {
  key: string;
  label: string;
  description: string;
  actions: ExternalApiScopeAction[];
};

export type ExternalApiPermissionSummary = {
  read: number;
  create: number;
  update: number;
  delete: number;
  total: number;
  risk_level: "low" | "medium" | "high";
};

export type ExternalApiEnvironment = "shared" | "development" | "staging" | "production";

export type ExternalApiKey = {
  id: number;
  public_id: string;
  name: string;
  description?: string | null;
  status: string;
  effective_status: string;
  scopes: string[];
  permission_summary: ExternalApiPermissionSummary;
  environment: string;
  allowed_ips: string[];
  token_prefix: string;
  expires_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  last_used_at?: string | null;
  last_used_ip?: string | null;
  last_used_user_agent?: string | null;
  usage_count: number;
  created_by_user_id?: number | null;
  created_by_user_email?: string | null;
  created_by_user_name?: string | null;
};

export type ExternalApiKeyCreateInput = {
  name: string;
  description?: string | null;
  scopes: string[];
  environment?: string;
  allowed_ips?: string[];
  status?: string;
  expires_at?: string | null;
  expires_in_days?: number | null;
};

export type ExternalApiKeyUpdateInput = {
  name?: string | null;
  description?: string | null;
  scopes?: string[] | null;
  environment?: string | null;
  allowed_ips?: string[] | null;
  status?: string | null;
  expires_at?: string | null;
  expires_in_days?: number | null;
};

export type ExternalApiKeyCreated = {
  key: ExternalApiKey;
  token: string;
  token_preview: string;
};

export type ExternalApiKeyRotate = {
  key: ExternalApiKey;
  token: string;
  token_preview: string;
};

export type PlatformDomainEventsResponse = {
  generated_at: string;
  total: number;
  limit: number;
  days: number;
  items: PlatformDomainEvent[];
};

export type PlatformSupportedEvent = {
  event_key: string;
  display_name: string;
  description: string;
  category: string;
  category_label: string;
  supported: boolean;
  active: boolean;
  version: string;
  entity_types: string[];
  payload_summary?: string | null;
  payload_example_json?: Record<string, unknown> | unknown[] | null;
};

export type PlatformSupportedEventsResponse = {
  generated_at: string;
  total: number;
  items: PlatformSupportedEvent[];
};
