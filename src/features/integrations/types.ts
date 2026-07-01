import type { MetabaseObjectType, MetabaseSyncRun } from "@/features/explorer/types";

export type PageOut<T> = {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
  has_more: boolean;
  items: T[];
};

export type AirflowIntegrationDagSummary = {
  dag_id: string;
  dag_display_name: string | null;
  description: string | null;
  is_active: boolean;
  is_paused: boolean;
  owner: string | null;
  schedule_interval: string | null;
  timetable_description: string | null;
  next_dagrun_at: string | null;
  has_import_errors: boolean;
  fileloc: string | null;
  tags: string[];
  latest_run_pk: number | null;
  latest_run_id: string | null;
  latest_execution_at: string | null;
  latest_state: string | null;
  latest_duration_seconds: number | null;
  recent_runs_count_24h: number;
  recent_failures_count_24h: number;
  updated_at: string | null;
};

export type AirflowIntegrationDagRun = {
  dag_run_pk: number | null;
  dag_id: string;
  dag_display_name: string | null;
  is_active: boolean;
  is_paused: boolean;
  run_id: string;
  state: string | null;
  start_date: string | null;
  end_date: string | null;
  duration_seconds: number | null;
  run_type: string | null;
  execution_date: string | null;
  logical_date: string | null;
  queued_at: string | null;
  external_trigger: boolean | null;
  data_interval_start: string | null;
  data_interval_end: string | null;
  last_scheduling_decision: string | null;
  updated_at: string | null;
};

export type AirflowIntegrationTaskFailure = {
  dag_id: string;
  dag_display_name: string | null;
  task_id: string;
  run_id: string;
  map_index: number | null;
  state: string | null;
  try_number: number | null;
  start_date: string | null;
  end_date: string | null;
  duration_seconds: number | null;
  operator: string | null;
  queue: string | null;
  hostname: string | null;
  unixname: string | null;
  job_id: number | null;
  queued_dttm: string | null;
  updated_at: string | null;
  task_display_name: string | null;
  next_method: string | null;
  next_kwargs: Record<string, unknown> | null;
  external_executor_id: string | null;
  failure_at: string | null;
  task_fail_count: number;
  last_task_fail_at: string | null;
  log_event: string | null;
  log_dttm: string | null;
  log_extra: string | null;
  log_try_number: number | null;
  troubleshooting_context: string | null;
};

export type AirflowIntegrationSummary = {
  configured: boolean;
  enabled: boolean;
  available: boolean;
  integration_status: string;
  status_message: string | null;
  health_category: string | null;
  checked_at: string | null;
  last_success_at: string | null;
  last_failure_at: string | null;
  consecutive_failures: number;
  failure_count: number;
  latency_ms: number | null;
  error_type: string | null;
  error_summary: string | null;
  breaker_state: string | null;
  breaker_open_until_at: string | null;
  operational_status: string;
  airflow_ui_base_url: string | null;
  latest_execution_at: string | null;
  latest_failure_at: string | null;
  latest_log_at: string | null;
  total_dags: number;
  active_dags: number;
  paused_dags: number;
  success_runs_24h: number;
  failed_runs_24h: number;
  task_failures_24h: number;
  generated_at: string | null;
  updated_at: string | null;
  message: string | null;
  recent_runs: AirflowIntegrationDagRun[];
  recent_failures: AirflowIntegrationTaskFailure[];
};

export type AirflowIntegrationPipelines = {
  configured: boolean;
  enabled: boolean;
  available: boolean;
  integration_status: string;
  status_message: string | null;
  health_category: string | null;
  checked_at: string | null;
  last_success_at: string | null;
  last_failure_at: string | null;
  consecutive_failures: number;
  failure_count: number;
  latency_ms: number | null;
  error_type: string | null;
  error_summary: string | null;
  breaker_state: string | null;
  breaker_open_until_at: string | null;
  operational_status: string;
  airflow_ui_base_url: string | null;
  generated_at: string | null;
  message: string | null;
  items: AirflowIntegrationDagSummary[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
};

export type AirflowIntegrationFailures = {
  configured: boolean;
  enabled: boolean;
  available: boolean;
  integration_status: string;
  status_message: string | null;
  health_category: string | null;
  checked_at: string | null;
  last_success_at: string | null;
  last_failure_at: string | null;
  consecutive_failures: number;
  failure_count: number;
  latency_ms: number | null;
  error_type: string | null;
  error_summary: string | null;
  breaker_state: string | null;
  breaker_open_until_at: string | null;
  operational_status: string;
  airflow_ui_base_url: string | null;
  generated_at: string | null;
  message: string | null;
  items: AirflowIntegrationTaskFailure[];
};

export type MetabaseIntegrationTopTable = {
  table_id: number;
  table_fqn: string;
  table_name: string;
  schema_name: string;
  datasource_name: string;
  direct_links_count: number;
  indirect_links_count: number;
  total_links_count: number;
  owner?: string | null;
  owner_email?: string | null;
  certification_status?: string | null;
  certification_readiness?: number | null;
  dq_score?: number | null;
  privacy_status?: string | null;
  privacy_signals?: string[];
  incident_count?: number | null;
  linked_dashboards?: number | null;
  linked_questions?: number | null;
  linked_artifacts_total?: number | null;
};

export type MetabaseArtifactLinkedTable = {
  table_id: number;
  full_name: string;
  connection: string;
  database: string;
  schema: string;
  table: string;
};

export type MetabaseArtifactReferencedTable = {
  full_name: string;
  name: string;
  schema?: string | null;
  metabase_table_id?: string | null;
  source: "sql" | "mbql";
  resolved: boolean;
  table_id?: number | null;
  catalog_full_name?: string | null;
};

export type MetabaseIntegrationArtifact = {
  object_id: number;
  object_type: MetabaseObjectType;
  metabase_id?: string | null;
  title: string;
  description?: string | null;
  collection_name: string | null;
  collection_external_id: string | null;
  url: string | null;
  archived?: boolean;
  creator_name?: string | null;
  view_count?: number | null;
  linked_status?: "linked" | "partially_linked" | "unlinked" | "unknown" | null;
  direct_links?: number;
  indirect_links?: number;
  linked_tables?: MetabaseArtifactLinkedTable[];
  referenced_tables?: MetabaseArtifactReferencedTable[];
  unresolved_references?: string[];
  remote_updated_at?: string | null;
  last_synced_at?: string | null;
  last_seen_at: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type MetabaseArtifactCard = {
  object_id?: number | null;
  metabase_id?: string | null;
  title: string;
  url?: string | null;
  viz_type?: string | null;
  linked_status?: "linked" | "partially_linked" | "unlinked" | "unknown" | null;
};

export type MetabaseArtifactDetail = MetabaseIntegrationArtifact & {
  query_type?: string | null;
  sql?: string | null;
  viz_type?: string | null;
  database_id?: number | null;
  cards?: MetabaseArtifactCard[];
};

export type MetabaseIntegrationSyncRun = MetabaseSyncRun & {
  instance_name?: string | null;
  duration_seconds?: number | null;
  artifacts_processed?: number;
  links_created?: number;
  error_type?: string | null;
  summary?: Record<string, unknown> | null;
};

export type MetabaseIntegrationSummary = {
  configured: boolean;
  enabled: boolean;
  available: boolean;
  integration_status: string;
  status_message: string | null;
  health_category: string | null;
  checked_at: string | null;
  last_success_at: string | null;
  last_failure_at: string | null;
  consecutive_failures: number;
  failure_count: number;
  latency_ms: number | null;
  error_type: string | null;
  error_summary: string | null;
  breaker_state: string | null;
  breaker_open_until_at: string | null;
  sync_status: string | null;
  message: string | null;
  instance_id: number | null;
  instance_name: string | null;
  instance_base_url: string | null;
  last_sync_at: string | null;
  last_sync_message: string | null;
  dashboards_count: number;
  questions_count: number;
  collections_count: number;
  direct_links_count: number;
  indirect_links_count: number;
  total_links_count: number;
  tables_with_consumption_count: number;
  recent_sync_runs: MetabaseIntegrationSyncRun[];
  top_tables: MetabaseIntegrationTopTable[];
  recent_artifacts: MetabaseIntegrationArtifact[];
  top_dashboards?: MetabaseIntegrationArtifact[];
  top_tables_enriched?: MetabaseIntegrationTopTable[];
  link_coverage?: {
    object_type: MetabaseObjectType | "all";
    total_artifacts: number;
    linked_artifacts: number;
    partially_linked_artifacts: number;
    unlinked_artifacts: number;
    unknown_artifacts: number;
    coverage_percent: number;
  } | null;
  artifact_link_summary?: Array<{
    object_type: MetabaseObjectType | "all";
    total_artifacts: number;
    linked_artifacts: number;
    partially_linked_artifacts: number;
    unlinked_artifacts: number;
    unknown_artifacts: number;
    coverage_percent: number;
  }>;
  recommendations?: Array<{
    severity: "critical" | "warning" | "info";
    title: string;
    description: string;
    reason?: string | null;
    action_label?: string | null;
    action_target?: string | null;
    context?: Record<string, unknown>;
  }>;
  sync_health_notes?: string[];
};

export type MetabaseIntegrationHealth = {
  status: "UP" | "DOWN";
  configured: boolean;
  enabled: boolean;
  available: boolean;
  integration_status: string;
  status_message: string | null;
  health_category: string | null;
  last_success_at: string | null;
  last_failure_at: string | null;
  consecutive_failures: number;
  failure_count: number;
  latency_ms: number | null;
  error_type: string | null;
  error_summary: string | null;
  breaker_state: string | null;
  breaker_open_until_at: string | null;
  instance_id: number | null;
  instance_name: string | null;
  instance_base_url: string | null;
  message: string | null;
  checked_at: string | null;
};

export type DataLakeAuthType =
  | "access_key_secret_key"
  | "access_key_secret_key_session_token"
  | "role_arn"
  | "default_environment";

export type DataLakeConnection = {
  id: number;
  name: string;
  description: string | null;
  bucket: string;
  region: string;
  prefix: string | null;
  auth_type: DataLakeAuthType;
  freshness_sla_hours_default: number | null;
  freshness_sla_hours_bronze: number | null;
  freshness_sla_hours_silver: number | null;
  freshness_sla_hours_gold: number | null;
  aws_access_key_id: string | null;
  role_arn: string | null;
  aws_secret_access_key_configured: boolean;
  aws_session_token_configured: boolean;
  credentials_configured: boolean;
  last_test_status: string | null;
  last_test_message: string | null;
  last_test_at: string | null;
  is_active: boolean;
  created_by_user_id: number | null;
  created_at: string | null;
  updated_at: string | null;
};

export type DataLakeConnectionInput = {
  name: string;
  description?: string | null;
  bucket: string;
  region: string;
  prefix?: string | null;
  auth_type: DataLakeAuthType;
  freshness_sla_hours_default?: number | null;
  freshness_sla_hours_bronze?: number | null;
  freshness_sla_hours_silver?: number | null;
  freshness_sla_hours_gold?: number | null;
  aws_access_key_id?: string | null;
  aws_secret_access_key?: string | null;
  aws_session_token?: string | null;
  role_arn?: string | null;
  is_active?: boolean;
};

export type DataLakeConnectionTestResult = {
  ok: boolean;
  status: string;
  message: string;
  detail?: string | null;
  bucket: string;
  region: string;
  prefix?: string | null;
  latency_ms: number;
  tested_at: string;
  bucket_accessible: boolean;
  prefix_accessible: boolean;
  prefix_object_count: number;
  parquet_files_count: number;
  bucket_prefixes: {
    prefix: string;
    parquet_files_count: number;
    subfolders_count: number;
    object_count: number;
  }[];
  prefix_candidates: string[];
  prefix_suggestion?: string | null;
  prefix_diagnostics: string[];
  table_candidates: {
    layer: string;
    table_name: string;
    path_base: string;
    files_count: number;
    parquet_files_count: number;
    size_total_bytes: number;
    last_modified_at: string | null;
    has_partitions: boolean;
    partition_pattern_detected: string | null;
    example_path: string | null;
  }[];
  example_paths: string[];
  credentials_mode: string;
  role_arn_used?: string | null;
  caller_identity_arn?: string | null;
  caller_identity_account?: string | null;
  caller_identity_userid?: string | null;
};

export type DataLakeInventoryTable = {
  id: number;
  connection_id: number;
  layer: string;
  table_name: string;
  path_base: string;
  files_count: number;
  parquet_files_count: number;
  non_parquet_files_count: number;
  size_total_bytes: number;
  last_modified_at: string | null;
  has_partitions: boolean;
  partition_pattern_detected: string | null;
  status_scan: string;
  data_last_scan_at: string | null;
  freshness_sla_hours_override: number | null;
  last_quality_score: number | null;
  last_quality_evaluated_at: string | null;
  data_owner_id: number | null;
  domain_name: string | null;
  description: string | null;
  classification: string | null;
  criticality: string | null;
  is_monitored: boolean;
  governance_last_updated_at: string | null;
  catalog_ready: boolean;
  governance_status: string;
  scan_run_id: number | null;
  error_message: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type DataLakeInventoryScanRun = {
  id: number;
  connection_id: number;
  status: string;
  scanned_layers_count: number;
  discovered_tables_count: number;
  discovered_parquet_files_count: number;
  total_bytes: number;
  trigger_mode: string;
  schedule_id: number | null;
  error_message: string | null;
  started_at: string | null;
  finished_at: string | null;
  scanned_by_user_id: number | null;
  created_at: string | null;
  updated_at: string | null;
};

export type DataLakeInventorySummary = {
  connection_id: number;
  connection_name: string;
  total_tables: number;
  bronze_tables: number;
  silver_tables: number;
  gold_tables: number;
  total_parquet_files: number;
  total_bytes: number;
  tables_without_parquet: number;
  tables_without_recent_update: number;
  layers_detected: string[];
  last_scan_at: string | null;
  latest_scan_status: string | null;
  latest_scan_message: string | null;
  latest_scan_run_id: number | null;
};

export type DataLakeInventoryPage = {
  summary: DataLakeInventorySummary;
  latest_scan: DataLakeInventoryScanRun | null;
  page: number;
  page_size: number;
  total: number;
  has_more: boolean;
  items: DataLakeInventoryTable[];
};

export type DataLakeCatalogTable = DataLakeInventoryTable & {
  connection_name: string;
  bucket: string;
  region: string;
  prefix: string | null;
};

export type DataLakeCatalogSummary = {
  total_tables: number;
  bronze_tables: number;
  silver_tables: number;
  gold_tables: number;
  total_parquet_files: number;
  total_bytes: number;
  tables_without_parquet: number;
  tables_without_recent_update: number;
  active_connections: number;
  total_connections: number;
  layers_detected: string[];
  last_scan_at: string | null;
  latest_scan_status: string | null;
  latest_scan_message: string | null;
  latest_scan_run_id: number | null;
};

export type DataLakeCatalogPage = {
  summary: DataLakeCatalogSummary;
  page: number;
  page_size: number;
  total: number;
  has_more: boolean;
  items: DataLakeCatalogTable[];
};

export type DataLakeInventoryScanResult = {
  scan_run: DataLakeInventoryScanRun;
  summary: DataLakeInventorySummary;
  job_id?: number | null;
  job_status?: string | null;
  correlation_id?: string | null;
};

export type DataLakeInventoryTableGovernanceInput = {
  data_owner_id?: number | null;
  domain_name?: string | null;
  description?: string | null;
  classification?: string | null;
  criticality?: string | null;
  is_monitored?: boolean;
};

export type DataLakeScanSchedule = {
  id: number;
  connection_id: number;
  schedule_mode: string;
  schedule_enabled: boolean;
  schedule_every_minutes: number | null;
  schedule_time: string | null;
  schedule_day_of_week: number | null;
  schedule_day_of_month: number | null;
  schedule_anchor_date: string | null;
  schedule_last_run_at: string | null;
  schedule_last_started_at: string | null;
  schedule_last_finished_at: string | null;
  schedule_last_status: string | null;
  schedule_last_error: string | null;
  schedule_next_run_at: string | null;
  schedule_summary: string | null;
  created_by_user_id: number | null;
  created_at: string | null;
  updated_at: string | null;
};

export type DataLakeScanScheduleInput = {
  schedule_mode: string;
  schedule_enabled: boolean;
  schedule_every_minutes?: number | null;
  schedule_time?: string | null;
  schedule_day_of_week?: number | null;
  schedule_day_of_month?: number | null;
  schedule_anchor_date?: string | null;
};

export type DataLakeConnectionOperationalLayer = {
  layer: string;
  tables_count: number;
  average_quality_score: number | null;
  tables_without_recent_update: number;
  stale_tables_count: number;
};

export type DataLakeOperationalIssue = {
  key: string;
  label: string;
  tone: "neutral" | "accent" | "success" | "warning" | "danger";
  detail: string | null;
  recommended_action: string | null;
  table_id: number | null;
  table_name: string | null;
};

export type DataLakeOperationsSummary = {
  connection_id: number;
  connection_name: string;
  last_scan_at: string | null;
  last_scan_duration_seconds: number | null;
  last_scan_status: string | null;
  last_scan_error: string | null;
  tables_total: number;
  tables_scanned: number;
  tables_with_error: number;
  tables_without_parquet: number;
  tables_without_recent_update: number;
  tables_with_drift: number;
  average_quality_score: number | null;
  layer_summaries: DataLakeConnectionOperationalLayer[];
  recent_scan_runs: DataLakeInventoryScanRun[];
  issues: DataLakeOperationalIssue[];
};

export type DataLakeTroubleshootingSummary = {
  connection_id: number;
  connection_name: string;
  status: string;
  summary: string | null;
  items: DataLakeOperationalIssue[];
};

export type DataLakeTableDetailColumn = {
  path: string;
  name: string;
  physical_type: string | null;
  logical_type: string | null;
  repetition_type: string | null;
  nullable: boolean;
  is_suspicious: boolean;
};

export type DataLakeTableDetailFile = {
  key: string;
  size_bytes: number;
  last_modified_at: string | null;
  row_count: number | null;
  schema_signature: string | null;
  is_sample: boolean;
};

export type DataLakeTableFile = {
  key: string;
  size_bytes: number;
  last_modified_at: string | null;
  is_parquet: boolean;
  file_type: string;
  relative_path: string | null;
};

export type DataLakeTableFilesPage = {
  page: number;
  page_size: number;
  total: number;
  has_more: boolean;
  items: DataLakeTableFile[];
};

export type DataLakeTableDetailSignal = {
  key: string;
  label: string;
  tone: "neutral" | "accent" | "success" | "warning" | "danger";
  detail: string | null;
};

export type DataLakeTableDetailScore = {
  key: string;
  label: string;
  score: number;
  tone: "neutral" | "accent" | "success" | "warning" | "danger";
  detail: string | null;
};

export type DataLakeTableDetailError = {
  bucket: string | null;
  region: string | null;
  key: string | null;
  operation: string | null;
  category: string;
  status_code: number | null;
  code: string | null;
  message: string | null;
  detail: string | null;
  response_body: string | null;
};

export type DataLakeTableDetailHistory = {
  observed_at: string | null;
  source_kind: string;
  freshness_status: string;
  freshness_age_seconds: number | null;
  freshness_sla_hours: number | null;
  row_count: number | null;
  row_count_method: string | null;
  row_count_confidence: string | null;
  size_total_bytes: number | null;
  quality_score: number | null;
  schema_variants_count: number;
  drift_detected: boolean;
};

export type DataLakeTableFreshnessSlaInput = {
  freshness_sla_hours_override?: number | null;
};

export type DataLakeTableDetail = {
  inventory: DataLakeInventoryTable;
  connection_id: number;
  connection_name: string;
  bucket: string;
  region: string;
  prefix: string | null;
  sample_files: DataLakeTableDetailFile[];
  schema_status: string;
  schema_message: string | null;
  schema_variants_count: number;
  row_count: number | null;
  row_count_method: string | null;
  row_count_confidence: string | null;
  row_count_source_files: number;
  column_count: number;
  columns: DataLakeTableDetailColumn[];
  partitions: string[];
  last_modified_at: string | null;
  freshness_age_seconds: number | null;
  freshness_age_hours: number | null;
  freshness_sla_hours: number | null;
  freshness_status: string;
  freshness_detail: string | null;
  quality_score: number | null;
  quality_breakdown: DataLakeTableDetailScore[];
  quality_signals: DataLakeTableDetailSignal[];
  operational_signals: DataLakeTableDetailSignal[];
  history: DataLakeTableDetailHistory[];
  technical_errors: DataLakeTableDetailError[];
  technical_notes: string[];
};

export type AirflowIntegrationHealth = {
  status: "UP" | "DOWN";
  configured: boolean;
  enabled: boolean;
  available: boolean;
  integration_status: string;
  status_message: string | null;
  health_category: string | null;
  checked_at: string | null;
  last_success_at: string | null;
  last_failure_at: string | null;
  consecutive_failures: number;
  failure_count: number;
  latency_ms: number | null;
  error_type: string | null;
  error_summary: string | null;
  breaker_state: string | null;
  breaker_open_until_at: string | null;
  message: string | null;
  airflow_ui_base_url: string | null;
};

export type IntegrationLandingSummary = {
  airflow: AirflowIntegrationSummary | null;
  metabase: MetabaseIntegrationSummary | null;
  airflowError: string;
  metabaseError: string;
};
