import type { SupportedDataSourceType } from "@/lib/datasource-types";

export type DbType = SupportedDataSourceType;
export type TreeDatasource = { id: number; name: string; db_type: DbType; database: string };
export type TreeSchema = { id: number; name: string };
export type TreeChildren = { datasource_id: number; database_id: number | null; database: string; schemas: TreeSchema[] };
export type TreeTable = {
  id: number;
  name: string;
  kind: "table" | "view";
  governance_score?: number | null;
  governance_label?: string | null;
  governance_tone?: string | null;
  certification_status?: string | null;
  readiness_score?: number | null;
  active_dq_violation?: boolean;
  owner_defined?: boolean;
};

export type DQColumnMetric = {
  column_name: string;
  data_type: string;
  null_count: number;
  null_pct: number;
  distinct_count: number;
  min_value: string | null;
  max_value: string | null;
};

export type DQColumnHistoryPoint = {
  run_id: number;
  run_at: string;
  null_count: number;
  null_pct: number;
  distinct_count: number;
  min_value: string | null;
  max_value: string | null;
};

export type DQHistoryPoint = {
  run_id: number;
  run_at: string;
  dq_score: number;
  completeness_pct_avg: number;
  row_count: number;
  freshness_seconds: number;
};

export type DQAssessmentState = {
  code: string;
  label: string;
  tone: string;
  score: number | null;
  reason: string | null;
};

export type DQDimensionTrend = {
  direction: "up" | "down" | "stable" | "unknown";
  value: number | null;
  label: string;
};

export type DQRuleCategory = "technical" | "business" | "operational";

export type DQDimensionMetric = {
  key: string;
  label: string;
  status: string;
  status_label: string;
  tone: string;
  evaluation_status?: string;
  evaluation_label?: string;
  evaluation_tone?: string;
  value: number | null;
  baseline: number | null;
  delta: number | null;
  unit: string | null;
  detail: string | null;
  score: number | null;
  applicable: boolean;
  coverage_type?: "profiling" | "rules" | "freshness" | "reconciliation" | "none";
  coverage_label?: string | null;
  evidence_level?: "formal_rule" | "automatic_profiling" | "operational_signal" | "partial" | "none";
  rules_count?: number;
  configured_rules_count?: number;
  formal_rules_count?: number;
  failed_rules_count?: number;
  metric_value?: number | null;
  metric_label?: string | null;
  trend?: DQDimensionTrend;
  summary?: string | null;
  explanation?: string | null;
  recommended_action?: string | null;
};

export type DQObservabilityTrend = {
  points: DQHistoryPoint[];
  baseline: {
    row_count: number | null;
    dq_score: number | null;
    completeness_pct_avg: number | null;
    freshness_seconds: number | null;
  };
  anomalies: {
    key: string;
    severity: string;
    label: string;
    detail: string;
  }[];
};

export type DQObservabilityTable = {
  status: string;
  status_label: string;
  tone: string;
  freshness: {
    seconds: number;
    status: string;
    status_label: string;
    detail: string | null;
    sla_seconds: number | null;
    within_sla: boolean;
  };
  volume: {
    row_count: number;
    baseline: number | null;
    status: string;
    status_label: string;
    detail: string | null;
    delta_pct: number | null;
  };
  schema: {
    status: string;
    status_label: string;
    added: number;
    removed: number;
    type_changed: number;
    changes: {
      kind: string;
      column_name: string;
      breaking: boolean;
    }[];
  };
  reliability: {
    success_rate_7d: number | null;
    success_rate_30d: number | null;
    runs_7d: number;
    runs_30d: number;
    last_valid_run_at: string | null;
    last_failed_run_at: string | null;
  };
  incident: {
    status: string;
    status_label: string;
    severity: string | null;
    owner_user_id: number | null;
    updated_at: string | null;
    incident_id: number | null;
    title?: string;
    source_type?: string | null;
    occurrences?: number | null;
  };
  contract: {
    contract_id: number | null;
    version: number | null;
    status: string | null;
    status_label: string;
    published_at: string | null;
    last_validation_status: string | null;
    last_validation_at: string | null;
    last_validation_issues: number | null;
    coverage_pct: number | null;
    column_count?: number;
  };
  lineage: {
    downstream_count: number;
    dashboard_count: number;
    impact_level: string;
  };
};

export type DQColumnObservability = {
  column_name: string;
  data_type: string;
  status: string;
  status_label: string;
  tone: string;
  reason: string;
  row_count: number;
  null_count: number;
  null_pct: number | null;
  distinct_count: number;
  distinct_ratio: number | null;
  uniqueness_pct: number | null;
  min_value: string | null;
  max_value: string | null;
  drift: string | null;
  drift_label: string | null;
  previous_null_pct: number | null;
  previous_distinct_count: number | null;
  history_points: DQColumnHistoryPoint[];
};

export type DQTroubleshooting = {
  failed_checks: DQDimensionMetric[];
  failed_columns: DQColumnObservability[];
  actions: {
    key: string;
    label: string;
    detail: string;
  }[];
};

export type DQEvidenceCell = {
  value: string | number | boolean | null;
  redacted: boolean;
  visibility: "visible" | "masked" | "unavailable";
  reason: string | null;
};

export type DQEvidenceSample = {
  id: number;
  dq_run_id: number | null;
  rule_run_id: number | null;
  rule_id: number | null;
  column_name: string | null;
  evidence_type: string;
  origin: string;
  status: string;
  sample_size: number;
  affected_rows_count: number | null;
  masked_fields_json: string[] | null;
  sample_rows_json: Array<Record<string, DQEvidenceCell>> | null;
  evidence_json: Record<string, unknown> | null;
  created_at: string;
};

export type DQHistoricalArtifactSet = {
  baselines: {
    id?: number;
    run_id: number;
    metric_key: string;
    metric_scope: string;
    column_name: string | null;
    current_value: number | null;
    baseline_value: number | null;
    mean_value: number | null;
    median_value: number | null;
    min_value: number | null;
    max_value: number | null;
    tolerance_abs: number | null;
    tolerance_pct: number | null;
    window_size: number;
    calculated_at: string;
    details_json: Record<string, unknown> | null;
  }[];
  events: {
    id?: number;
    run_id: number;
    metric_key: string;
    dimension_key: string | null;
    event_type: string;
    status: string;
    severity: string;
    observed_value: number | null;
    expected_value: number | null;
    baseline_value: number | null;
    delta_value: number | null;
    delta_pct: number | null;
    column_name: string | null;
    detected_at: string;
    resolved_at: string | null;
    details_json: Record<string, unknown> | null;
  }[];
  evidence_samples: DQEvidenceSample[];
};

export type DQObservability = {
  assessment_state: DQAssessmentState;
  quality_score?: number | null;
  quality_coverage?: {
    evaluated_dimensions: number;
    total_dimensions: number;
    formal_dimensions: number;
    automatic_profiling_dimensions: number;
    operational_signal_dimensions: number;
    partial_dimensions: number;
    not_evaluated_dimensions: number;
    coverage_pct: number;
    summary: string;
    formal_summary: string;
  } | null;
  profile_summary?: {
    row_count?: number | null;
    column_count?: number | null;
    estimated_size_bytes?: number | null;
    schema_hash?: string | null;
    last_updated_at?: string | null;
    last_loaded_at?: string | null;
    last_updated_column?: string | null;
    duplicate_business_key_count?: number | null;
    freshness_seconds?: number | null;
    volume_change_ratio?: number | null;
  } | null;
  profiling_intelligence?: {
    weight_profile?: string | null;
    observed_score?: number | null;
    formal_score?: number | null;
    coverage_score?: number | null;
    consolidated_score?: number | null;
    coverage_dimensions?: number[] | string[] | null;
    covered_dimensions?: number[] | string[] | null;
    dimension_scores?: Record<string, number | null>;
    rule_suggestions?: Array<Record<string, unknown>>;
    quality_message?: string | null;
  } | null;
  dimensions: DQDimensionMetric[];
  table: DQObservabilityTable;
  trend: DQObservabilityTrend;
  columns: DQColumnObservability[];
  contract: DQObservabilityTable["contract"];
  lineage: DQObservabilityTable["lineage"];
  troubleshooting: DQTroubleshooting;
  historical: DQHistoricalArtifactSet;
  schema_changes: {
    kind: string;
    column_name: string;
    breaking: boolean;
    current_type?: string;
    previous_type?: string;
  }[];
};

export type DQSnapshot = {
  run_id: number;
  run_at: string;
  row_count: number;
  completeness_pct_avg: number;
  dq_score: number;
  effective_dq_score?: number | null;
  operational_penalty_points?: number;
  operational_penalty_label?: string | null;
  operational_penalty_applied?: boolean;
  operational_recurrent_degradation?: boolean;
  duplicates_count: number;
  failed_rules: number;
  freshness_seconds: number;
  columns: DQColumnMetric[];
  observability?: DQObservability;
};

export type DQProfilingLaunch = {
  run_id: number;
  scope: "table" | "schema" | "datasource" | "tables";
  schema?: string | null;
  table_fqn?: string | null;
  tables_total: number;
  status: string;
  execution_engine: string;
  job_run_id?: number | null;
};

export type DQProfilingRunProgress = {
  id: number;
  scope: string;
  schema?: string | null;
  status: string;
  execution_engine: string;
  total_items: number;
  queued_items: number;
  running_items: number;
  success_items: number;
  failed_items: number;
  queued_at?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
  duration_ms?: number | null;
  error_message?: string | null;
};

export type DQProfilingRunItem = {
  id: number;
  table_id: number | null;
  table_fqn: string | null;
  status: string;
  execution_engine: string;
  duration_ms?: number | null;
  error_message?: string | null;
};

export type DQProfilingExecutionItem = {
  id: number;
  parent_run_id: number | null;
  scope: string;
  datasource_id: number | null;
  datasource_name: string | null;
  schema_name: string | null;
  table_id: number | null;
  table_fqn: string | null;
  status: string;
  execution_engine: string;
  queued_at: string | null;
  started_at: string | null;
  finished_at: string | null;
  duration_ms: number | null;
  error_message: string | null;
  spark_app_id: string | null;
  log_tail: string | null;
  row_count: number | null;
  completeness_pct_avg: number | null;
  dq_score: number | null;
  duplicates_count: number | null;
  failed_rules_count: number | null;
  observation: string | null;
  profiling_mode: string | null;
  watermark_column: string | null;
  window_start: string | null;
  window_end: string | null;
};

export type DQProfilingExecutionSummary = {
  id: number;
  parent_run_id: number | null;
  scope: string;
  datasource_id: number | null;
  datasource_name: string | null;
  schema_name: string | null;
  table_id: number | null;
  table_fqn: string | null;
  status: string;
  execution_engine: string;
  queued_at: string | null;
  started_at: string | null;
  finished_at: string | null;
  duration_ms: number | null;
  error_message: string | null;
  spark_app_id: string | null;
  log_tail: string | null;
  total_items: number;
  queued_items: number;
  running_items: number;
  success_items: number;
  failed_items: number;
  row_count: number | null;
  completeness_pct_avg: number | null;
  dq_score: number | null;
  duplicates_count: number | null;
  failed_rules_count: number | null;
  observation: string | null;
  profiling_mode: string | null;
  watermark_column: string | null;
  window_start: string | null;
  window_end: string | null;
};

export type DQProfilingExecutionDetail = DQProfilingExecutionSummary & {
  items: DQProfilingExecutionItem[];
};

export type DQProfilingExecutionPage = {
  items: DQProfilingExecutionSummary[];
  total: number;
  limit: number;
  offset: number;
};

export type DQProfilingScheduleRecipient = {
  id: number;
  display_name: string;
  email: string;
};

export type DQProfilingSchedule = {
  id: number;
  scope: "table" | "schema" | "datasource" | "tables";
  name: string | null;
  table_id: number | null;
  datasource_id: number | null;
  schema_name: string | null;
  table_ids: number[];
  table_fqn: string | null;
  target_label: string;
  execution_engine: "python" | "spark" | string;
  schedule_mode: ScheduleMode;
  schedule_enabled: boolean;
  schedule_every_minutes: number | null;
  schedule_time: string | null;
  schedule_timezone: string | null;
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
  schema_limit: number | null;
  schema_concurrency: number | null;
  schema_sample_fraction: number | null;
  schema_include_tables_json: string[];
  schema_exclude_tables_json: string[];
  schema_columns_json: string[];
  notification_recipients: DQProfilingScheduleRecipient[];
  created_at: string;
  updated_at: string;
};

export type DQProfilingSchedulerStatus = {
  scheduler_name: string;
  mode: string;
  is_enabled: boolean;
  health: string;
  last_started_at: string | null;
  last_heartbeat_at: string | null;
  last_success_at: string | null;
  last_failure_at: string | null;
  last_error: string | null;
  last_run_summary: Record<string, unknown>;
  scheduled_profiles_total: number;
  next_expected_run_at: string | null;
};

export type DQProfilingScheduleForm = {
  scope: "table" | "schema" | "datasource" | "tables";
  execution_engine: "spark";
  name: string;
  schedule_mode: ScheduleMode;
  schedule_enabled: boolean;
  schedule_every_minutes: number | null;
  schedule_time: string;
  schedule_timezone: string;
  schedule_day_of_week: number | null;
  schedule_day_of_month: number | null;
  schedule_anchor_date: string;
  recipient_user_ids: number[];
  table_ids: number[];
  datasource_id: number | null;
  schema_name: string;
};

export type DQIncidentSuggestion = {
  key: string;
  mode: string;
  title: string;
  detail: string;
  severity: string;
  severity_label: string;
  trigger_code: string;
  existing_incident_id: number | null;
  source_type: string;
};

export type DQIncidentSignals = {
  table_id: number;
  generated_incident_id: number | null;
  generated_mode: string | null;
  open_incidents: number;
  suggestions: DQIncidentSuggestion[];
  links: {
    explorer: string;
    lineage: string;
    data_quality: string;
    incidents: string;
    audit: string;
    certification: string;
    owners: string;
    datasource: string;
    database: string;
    schema: string;
  };
};

export type DQLatest = {
  table_id: number;
  table_fqn: string;
  run_id: number;
  run_at: string;
  row_count: number;
  completeness_pct_avg: number;
  dq_score: number;
  effective_dq_score?: number | null;
  operational_penalty_points?: number;
  operational_penalty_label?: string | null;
  operational_penalty_applied?: boolean;
  operational_recurrent_degradation?: boolean;
  duplicates_count: number;
  failed_rules: number;
  freshness_seconds: number;
  columns: DQColumnMetric[];
  current: DQSnapshot;
  previous: DQSnapshot | null;
  history: DQHistoryPoint[];
  column_history: Record<string, DQColumnHistoryPoint[]>;
  observability?: DQObservability;
};

export type SchemaNode = TreeSchema & { expanded: boolean; tables: TreeTable[] | null; loading: boolean };
export type DatasourceNode = TreeDatasource & {
  expanded: boolean;
  loading: boolean;
  database: string;
  schemas: SchemaNode[] | null;
};

export type TableDetailInfo = {
  certification_status: string;
  certification_criticality: string | null;
  certification_badges: string[] | null;
  certification_notes: string | null;
  certification_decided_by_user_name: string | null;
  certification_decided_by_user_email: string | null;
  certification_decided_at: string | null;
  certification_review_at: string | null;
  sensitivity_level: string | null;
  has_personal_data: boolean;
  has_sensitive_personal_data: boolean;
  legal_basis: string | null;
  retention_policy: string | null;
  is_masked: boolean;
  external_sharing: boolean;
  access_scope: string | null;
  access_roles: string[] | null;
  privacy_notes: string | null;
  privacy_reviewed_at: string | null;
  data_contract?: {
    contract_id: number | null;
    version: number | null;
    status: string | null;
    published_at: string | null;
    last_validation_status: string | null;
    last_validation_at: string | null;
    last_validation_issues: number | null;
  } | null;
};

export type AnalyticTone = {
  accent: string;
  accentSoft: string;
  border: string;
  text: string;
  iconBg: string;
  spark: string;
};

export type RuleType = "column_validation" | "nullability" | "domain" | "uniqueness" | "freshness" | "column_comparison" | "reconciliation";
export type RuleDimension = "completude" | "validade" | "consistencia" | "unicidade" | "tempestividade" | "acuracia";
export type RuleSeverity = "critical" | "high" | "medium" | "low";
export type RuleStatus = "pass" | "fail" | "error";
export type RuleExecutionStatus = "queued" | "running" | "success" | "failed";
export type ScheduleMode = "manual" | "interval" | "daily" | "weekly" | "biweekly" | "monthly";
export type RuleLogic = "AND" | "OR";
export type RuleValueType = "number" | "text" | "date" | "boolean" | "list" | "column" | "none";
export type RuleTimeUnit = "hours" | "days";
export type RuleComparisonMetric = "count" | "sum";

export type DQRuleCondition = {
  column: string;
  operator: string;
  value?: string | number | boolean | null;
  value_to?: string | number | boolean | null;
  values?: Array<string | number | boolean>;
  compare_column?: string | null;
  value_type?: RuleValueType | null;
  time_unit?: RuleTimeUnit | null;
  column_family?: "number" | "text" | "date" | "boolean" | null;
  column_data_type?: string | null;
};

export type DQRuleComparisonTarget = {
  table_id?: number | null;
  datasource_id?: number | null;
  schema_name?: string | null;
  table_name?: string | null;
  table_fqn?: string | null;
  metric?: RuleComparisonMetric;
  column?: string | null;
  key_columns?: string[];
  tolerance_abs?: number | null;
  tolerance_pct?: number | null;
};

export type DQRuleDefinition = {
  version: number;
  type: RuleType;
  dimension?: RuleDimension | null;
  category?: DQRuleCategory | null;
  template_key?: string | null;
  target: {
    datasource_id: number;
    datasource_name?: string | null;
    schema_name: string;
    table_name: string;
    table_id: number;
  };
  logic: RuleLogic;
  conditions: DQRuleCondition[];
  unique_columns?: string[];
  comparison?: DQRuleComparisonTarget | null;
};

export type RuleBuilderFieldOption = {
  value: string;
  label: string;
};

export type RuleBuilderTemplateOption = {
  key: string;
  label: string;
  dimension: RuleDimension;
  category: DQRuleCategory;
  rule_type: RuleType;
  description: string;
  requires_comparison: boolean;
};

export type RuleBuilderOptions = {
  category_options: RuleBuilderFieldOption[];
  dimension_options: RuleBuilderFieldOption[];
  logic_options: RuleBuilderFieldOption[];
  rule_types: RuleBuilderFieldOption[];
  severities: RuleBuilderFieldOption[];
  templates: RuleBuilderTemplateOption[];
  operators: Record<string, RuleBuilderFieldOption[]>;
  time_units: RuleBuilderFieldOption[];
};

export type DQTreeDatasource = {
  id: number;
  name: string;
  db_type: DbType;
  database: string;
};

export type DQTreeSchema = {
  id: number;
  name: string;
};

export type DQTreeDatasourceChildren = {
  datasource_id: number;
  database_id: number | null;
  database: string;
  schemas: DQTreeSchema[];
};

export type DQTreeTable = {
  id: number;
  name: string;
  kind: "table" | "view";
};

export type DQCatalogColumn = {
  id: number;
  name: string;
  data_type: string | null;
  is_nullable: boolean | null;
  is_primary_key: boolean | null;
  ordinal_position: number | null;
};

export type DQRule = {
  id: number;
  table_id: number | null;
  datasource_id: number | null;
  datasource_name: string | null;
  schema_name: string | null;
  table_name: string | null;
  execution_engine: "python" | "spark" | string;
  rule_builder_version: number | null;
  rule_definition_json: DQRuleDefinition | null;
  rule_summary: string | null;
  quality_dimension: RuleDimension | null;
  rule_category: DQRuleCategory | null;
  template_key: string | null;
  legacy_mode: boolean;
  notification_recipient_user_id: number | null;
  notification_recipient_user_name: string | null;
  notification_recipient_user_email: string | null;
  notification_recipient_users: DQUserOption[];
  schedule_mode: ScheduleMode;
  schedule_enabled: boolean;
  schedule_every_minutes: number | null;
  schedule_time: string | null;
  schedule_day_of_week: number | null;
  schedule_day_of_month: number | null;
  schedule_anchor_date: string | null;
  schedule_last_run_at: string | null;
  schedule_next_run_at: string | null;
  schedule_summary: string | null;
  table_fqn: string;
  name: string;
  description: string | null;
  rule_type: RuleType;
  severity: RuleSeverity;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by_user_id?: number | null;
  created_by_user_name?: string | null;
  created_by_user_email?: string | null;
  updated_by_user_id?: number | null;
  updated_by_user_name?: string | null;
  updated_by_user_email?: string | null;
  last_audit_action?: string | null;
  last_audit_at?: string | null;
  last_run_id: number | null;
  last_run_status: RuleExecutionStatus | null;
  last_run_engine: "python" | "spark" | string | null;
  last_run_at: string | null;
  last_violations_count: number;
  last_error_message: string | null;
  last_job_run_id?: number | null;
  last_job_status?: "queued" | "running" | "success" | "failed" | string | null;
  last_job_engine?: string | null;
  last_job_duration_ms?: number | null;
  last_job_error_message?: string | null;
  last_job_log_tail?: string | null;
  last_job_spark_app_id?: string | null;
  last_job_requested_by_user_id?: number | null;
  last_job_requested_by_user_name?: string | null;
  last_job_requested_by_user_email?: string | null;
  last_job_trigger_source?: string | null;
  last_job_started_at?: string | null;
  last_job_finished_at?: string | null;
  last_rows_checked?: number | null;
  last_job_violations_count?: number | null;
  last_job_total_rules?: number | null;
  last_job_passed_rules?: number | null;
  last_job_failed_rules?: number | null;
  last_job_error_rules?: number | null;
  open_incident_id: number | null;
  open_incident_status: string | null;
};

export type RuleRun = {
  id: number;
  rule_id: number;
  status: RuleStatus;
  execution_engine: "python" | "spark" | string;
  violations_count: number;
  sample_rows_json: Array<Record<string, unknown>> | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

export type DQJobRun = {
  id: number;
  job_type: string;
  status: "queued" | "running" | "success" | "failed" | string;
  execution_engine: string;
  dq_run_id: number | null;
  profiling_schedule_id?: number | null;
  table_id?: number | null;
  table_fqn?: string | null;
  datasource_id?: number | null;
  spark_app_id: string | null;
  spark_master_url?: string | null;
  logs_path?: string | null;
  command?: string | null;
  stdout_log?: string | null;
  stderr_log?: string | null;
  result_json?: Record<string, unknown> | unknown[] | null;
  error_message: string | null;
  log_tail: string | null;
  duration_ms: number | null;
  queued_at: string | null;
  started_at: string | null;
  finished_at: string | null;
  violations_count: number | null;
  requested_by_user_id?: number | null;
  requested_by_user_name?: string | null;
  requested_by_user_email?: string | null;
  trigger_source?: "manual" | "scheduled" | "automatic" | string | null;
};

export type RuleTest = {
  valid: boolean;
  status: RuleStatus;
  violations_count: number;
  preview_rows: Array<Record<string, unknown>>;
  error_message: string | null;
};

export type TableOption = {
  table_id: number;
  table_fqn: string;
};

export type DQUserOption = {
  id: number;
  display_name: string;
  email: string;
};

export type DQSchedulerStatus = {
  scheduler_name: string;
  mode: string;
  is_enabled: boolean;
  health: string;
  last_started_at: string | null;
  last_heartbeat_at: string | null;
  last_success_at: string | null;
  last_failure_at: string | null;
  last_error: string | null;
  last_run_summary: Record<string, unknown>;
  scheduled_rules_total: number;
  next_expected_run_at: string | null;
};

export type DQRuleForm = {
  name: string;
  description: string;
  datasource_id: number | null;
  datasource_name: string;
  schema_id: number | null;
  schema_name: string;
  table_id: number | null;
  table_name: string;
  table_fqn: string;
  execution_engine: "spark";
  notification_recipient_user_id: number | null;
  notification_recipient_user_ids: number[];
  schedule_mode: ScheduleMode;
  schedule_enabled: boolean;
  schedule_every_minutes: number | null;
  schedule_time: string;
  schedule_day_of_week: number | null;
  schedule_day_of_month: number | null;
  schedule_anchor_date: string;
  rule_type: RuleType;
  quality_dimension: RuleDimension | null;
  rule_category: DQRuleCategory | null;
  template_key: string;
  severity: RuleSeverity;
  logic: RuleLogic;
  conditions: DQRuleCondition[];
  unique_columns: string[];
  comparison_target: DQRuleComparisonTarget | null;
  is_active: boolean;
};

export type DQScorecardGroup = {
  key: string;
  label: string;
  count: number;
  avg_dq_score: number | null;
  avg_trust_score: number | null;
  avg_readiness_score: number | null;
  rules_coverage_pct: number | null;
  contract_coverage_pct: number | null;
  open_incidents: number;
  critical_incidents: number;
  tables_without_rules: number;
  critical_tables_without_rules: number;
  contract_breaking: number;
  contract_warning: number;
  tone: string;
};

export type DQScorecardRule = {
  key: string;
  name: string;
  table_fqn: string;
  severity: string;
  status: string;
  violations_count: number;
  last_run_at: string | null;
  open_incident_id: number | null;
  tone: string;
};

export type DQScorecardAsset = {
  table_id: number;
  table_fqn: string;
  table_name: string;
  domain_name: string | null;
  owner_name: string | null;
  dq_score: number | null;
  trust_score: number | null;
  readiness_score: number | null;
  documentation_score: number | null;
  certification_status: string | null;
  criticality: string | null;
  active_rules: number;
  open_incidents: number;
  critical_open_incidents: number;
  contract_status: string | null;
  contract_validation_status: string | null;
  contract_issues: number | null;
  rule_coverage_pct: number | null;
  trust_label: string | null;
  trust_tone: string | null;
  reasons: string[];
};

export type DQPlatformScorecardSummary = {
  generated_at: string;
  scope_domain: string | null;
  scope_owner: string | null;
  scope_criticality: string | null;
  totals: {
    tables: number;
    with_metrics: number;
    avg_dq_score: number | null;
    avg_trust_score: number | null;
    avg_readiness_score: number | null;
    avg_documentation_score: number | null;
    active_rules: number;
    tables_with_rules: number;
    tables_without_rules: number;
    critical_tables_without_rules: number;
    sensitive_tables_without_rules: number;
    contracts_total: number;
    contracts_with_validation: number;
    failed_contract_validations: number;
    contract_coverage_pct: number | null;
    breaking_contracts: number;
    warning_contracts: number;
    high_risk_tables: number;
  };
  by_domain: DQScorecardGroup[];
  by_owner: DQScorecardGroup[];
  by_criticality: DQScorecardGroup[];
  failing_rules: DQScorecardRule[];
  top_risks: DQScorecardAsset[];
};

export type DataContractSchemaChange = {
  column_name: string | null;
  kind: string;
  breaking: boolean;
  detail: string | null;
};

export type DataContractImpactSummary = {
  table_id: number;
  table_fqn: string;
  contract_id: number | null;
  contract_version: number | null;
  contract_status: string | null;
  contract_validation_status: string | null;
  schema_state: string;
  schema_label: string;
  expected_columns: number;
  actual_columns: number;
  breaking_changes_count: number;
  warning_changes_count: number;
  changes: DataContractSchemaChange[];
  lineage: {
    upstream_count: number;
    downstream_count: number;
    process_count: number;
    dashboard_count: number;
    direct_dependencies_count: number;
    impact_level: string;
  };
  recommendation: string;
};
