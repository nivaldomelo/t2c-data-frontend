export type ObservabilityStatus = "healthy" | "attention" | "critical" | "unreadable" | "late" | "drift" | "blocked";

export type ObservabilityReliability = "reliable" | "reliable_with_reservations" | "watch" | "unreliable" | "blocked";

export type ObservabilityPeriod = "7d" | "30d" | "90d" | "180d";

export type ObservabilityFilterStatus = ObservabilityStatus | "";

export type ObservabilityFilterCriticality = "low" | "medium" | "high" | "critical" | "";

export type ObservabilitySourceOrigin =
  | "catalog"
  | "datasource_scan"
  | "ingestion"
  | "airflow"
  | "metabase"
  | "data_lake"
  | "dq"
  | "privacy"
  | "certification"
  | "incident"
  | "seed"
  | "stale_scan"
  | "unknown";

export type ObservabilityLinkedBy =
  | "table_id"
  | "datasource_schema_table"
  | "canonical_asset_id"
  | "fqn"
  | "name_only"
  | "metabase_sql"
  | "airflow_dag"
  | "ingestion_log"
  | "scan_run_id"
  | "unknown";

export type ObservabilityContextState = "selected" | "related" | "out_of_scope" | "unlinked" | "stale";

export type ObservabilityContext = {
  datasource_id: number | null;
  datasource_name: string;
  scope: "datasource" | "global";
  schema_name?: string | null;
  table_name?: string | null;
};

export type ObservabilityFiltersState = {
  datasource_id: number | null;
  schema: string;
  table: string;
  domain: string;
  layer: string;
  criticality: ObservabilityFilterCriticality;
  status: ObservabilityFilterStatus;
  period: ObservabilityPeriod;
  only_critical: boolean;
  only_incidents: boolean;
  only_out_of_sla: boolean;
  page: number;
};

export type ObservabilityTimelineEvent = {
  id: string;
  type: "arrival" | "pipeline" | "profiling" | "validation" | "incident" | "alert" | "reprocess" | "certification";
  at: string;
  label: string;
  description: string;
};

export type ObservabilityHistoryPoint = {
  label: string;
  value: number;
};

export type ObservabilityStageDuration = {
  stage: string;
  duration_ms: number;
};

export type ObservabilityLayerError = {
  layer: string;
  message: string;
};

export type ObservabilityAssetRecord = {
  table_id: number;
  table_name: string;
  datasource_id: number;
  data_source: string;
  domain: string;
  layer: string;
  criticality: "low" | "medium" | "high" | "critical";
  source_origin: ObservabilitySourceOrigin;
  linked_by: ObservabilityLinkedBy;
  linked_confidence: number;
  confidence?: number;
  scan_run_id: number | null;
  last_seen_at: string | null;
  is_demo: boolean;
  context_state: ObservabilityContextState;
  freshness_status: ObservabilityStatus;
  volume_status: ObservabilityStatus;
  schema_status: ObservabilityStatus;
  pipeline_status: ObservabilityStatus;
  reliability_status: ObservabilityReliability;
  observability_score: number;
  quality_score?: number | null;
  last_arrival_at: string | null;
  last_partition: string | null;
  last_file_path: string | null;
  last_source_row_at: string | null;
  last_silver_load_at: string | null;
  last_gold_load_at: string | null;
  last_dw_load_at: string | null;
  last_updated_at: string;
  current_row_count: number;
  expected_row_count: number;
  historical_avg_row_count: number;
  same_weekday_avg_row_count: number;
  volume_change_pct: number;
  schema_drift_detected: boolean;
  pipeline_failed: boolean;
  partial_failure_detected: boolean;
  critical_rules_total: number;
  critical_rules_passed: number;
  open_incidents_total: number;
  blocking_incidents_total: number;
  summary: string;
  recommendation: string;
  timeline_events: ObservabilityTimelineEvent[];
  last_pipeline_run_at: string | null;
  dag_name: string | null;
  last_pipeline_status: string | null;
  pipeline_duration_ms: number | null;
  pipeline_attempts: number;
  stage_durations: ObservabilityStageDuration[];
  layer_errors: ObservabilityLayerError[];
  reprocess_count: number;
  backfill_count: number;
  slow_spark_jobs_count: number;
  gold_write_failures_count: number;
  last_error_message: string | null;
  certification_valid: boolean;
  gold_newer_than_silver: boolean;
  silver_validated_before_gold: boolean;
  reliability_reasons: string[];
  volume_history: ObservabilityHistoryPoint[];
  new_columns: string[];
  removed_columns: string[];
  altered_columns: string[];
  nulled_columns: string[];
  parquet_changes: string[];
  relational_changes: string[];
  drift_severity: string;
  downstream_impact: string;
  dq_latest?: Record<string, unknown> | null;
  dq_artifacts?: Record<string, unknown> | null;
  ingestion_summary?: Record<string, unknown> | null;
  ingestion_detail?: Record<string, unknown> | null;
  metabase_consumption?: Record<string, unknown> | null;
  operational_context?: Record<string, unknown> | null;
};

export type ObservabilitySummary = {
  total: number;
  healthy: number;
  attention: number;
  critical: number;
  out_of_sla: number;
  schema_drift: number;
  volume_anomaly: number;
  pipeline_failures: number;
};

export type ObservabilityRelatedSignals = {
  airflow: ObservabilityAssetRecord[];
  certification: ObservabilityAssetRecord[];
  data_lake: ObservabilityAssetRecord[];
  dq: ObservabilityAssetRecord[];
  datasource_scan: ObservabilityAssetRecord[];
  incident: ObservabilityAssetRecord[];
  ingestion: ObservabilityAssetRecord[];
  metabase: ObservabilityAssetRecord[];
  seed: ObservabilityAssetRecord[];
  privacy: ObservabilityAssetRecord[];
  stale_scan: ObservabilityAssetRecord[];
  unknown: ObservabilityAssetRecord[];
};

export type ObservabilityDiagnostics = {
  selected_assets: number;
  out_of_scope_assets: number;
  related_signals: number;
  unlinked_signals: number;
};

export type ObservabilityFilterScope = {
  domains: string[];
  layers: string[];
};

export type ObservabilityPageResult = {
  context: ObservabilityContext;
  items: ObservabilityAssetRecord[];
  related_signals: ObservabilityRelatedSignals;
  out_of_scope_assets: ObservabilityAssetRecord[];
  unlinked_signals: ObservabilityAssetRecord[];
  page: number;
  page_size: number;
  total: number;
  summary: ObservabilitySummary;
  diagnostics: ObservabilityDiagnostics;
  filter_options: ObservabilityFilterScope;
};

export type ObservabilityFilterOptions = {
  domains: string[];
  layers: string[];
  criticalities: Array<{ value: ObservabilityFilterCriticality; label: string }>;
  statuses: Array<{ value: ObservabilityFilterStatus; label: string }>;
  periods: Array<{ value: ObservabilityPeriod; label: string }>;
};

export type ObservabilityDataSourceOption = {
  id: number;
  name: string;
  db_type: string;
  database: string;
};

export type ObservabilitySchemaOption = {
  id: number;
  name: string;
};

export type ObservabilityTableOption = {
  id: number;
  name: string;
  kind: string;
};

export type ObservabilityFilterOption = {
  value: string;
  label: string;
};

export type ObservabilityTabKey = "summary" | "arrival" | "volume" | "schema" | "pipeline" | "reliability" | "timeline";
