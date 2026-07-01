import type { SupportedDataSourceType } from "@/lib/datasource-types";
import type { DQObservability } from "@/features/data-quality/types";

export type DbType = SupportedDataSourceType;
export type TableKind = "table" | "view" | "collection";
export type DetailTab = "summary" | "columns" | "tags" | "glossary" | "lineage" | "history" | "consumption" | "observability";
export type NoticeState = { tone: "success" | "error"; message: string } | null;
export type ContextualAction = {
  key: string;
  label: string;
  description: string;
  href: string;
  category: string;
  tone: string;
};

export type TreeDatasource = { id: number; name: string; db_type: DbType; database: string };
export type TreeSchema = { id: number; name: string };
export type TreeDatasourceChildren = {
  datasource_id: number;
  database_id: number | null;
  database: string;
  schemas: TreeSchema[];
};
export type TreeTable = {
  id: number;
  name: string;
  kind: TableKind;
  governance_score?: number | null;
  governance_label?: string | null;
  governance_tone?: string | null;
  trust_score?: number | null;
  trust_label?: string | null;
  trust_tone?: string | null;
  certification_status?: string | null;
  readiness_score?: number | null;
  active_dq_violation?: boolean;
  owner_defined?: boolean;
  tags?: TagItem[];
};
export type TreeTablePage = {
  page: number;
  page_size: number;
  total: number | null;
  has_more: boolean;
  items: TreeTable[];
};
export type TableColumn = {
  id: number;
  table_id: number;
  data_owner_id: number | null;
  name: string;
  data_type: string;
  is_nullable: boolean;
  is_primary_key: boolean;
  ordinal_position: number;
  external_id: string | null;
  slug: string | null;
  udt_name: string | null;
  character_maximum_length: number | null;
  numeric_precision: number | null;
  numeric_scale: number | null;
  column_default: string | null;
  existing_comment: string | null;
  description_source: string | null;
  description_manual: string | null;
  dictionary_description: string | null;
  dictionary_comment: string | null;
  data_owner: DataOwnerItem | null;
  owner_reviewed_by_user_id: number | null;
  owner_reviewed_by_user_name: string | null;
  owner_reviewed_by_user_email: string | null;
  owner_reviewed_at: string | null;
  owner_review_due: boolean;
  owner_review_next_at: string | null;
  description: string | null;
  tags: TagItem[];
};
export type TableColumnPage = {
  page: number;
  page_size: number;
  total: number;
  has_more: boolean;
  items: TableColumn[];
};

export type TableColumnSummary = {
  table_id: number;
  total: number;
  required: number;
  nullable: number;
  primary_keys: number;
  documented: number;
  commented: number;
  preview: TableColumn[];
};

export type ColumnDictionaryImportError = {
  row_number: number;
  slug: string | null;
  message: string;
};

export type ColumnDictionaryImportResult = {
  processed: number;
  matched: number;
  imported: number;
  updated: number;
  ignored: number;
  rejected: number;
  errors: ColumnDictionaryImportError[];
};

export type ColumnDictionaryResetResult = {
  deleted_columns: number;
};

export type ExplorerSearchResult = {
  match_type: "schema" | "table" | "column";
  name: string;
  datasource_id: number;
  schema_id: number | null;
  table_id: number | null;
  column_name: string | null;
  governance_score?: number | null;
  governance_label?: string | null;
  governance_tone?: string | null;
  trust_score?: number | null;
  trust_label?: string | null;
  trust_tone?: string | null;
  certification_status?: string | null;
  readiness_score?: number | null;
  active_dq_violation?: boolean;
  owner_defined?: boolean;
};

export type DataOwnerItem = {
  id: number;
  name: string;
  email: string;
  area: string | null;
  description: string | null;
  is_active: boolean;
  tables_count?: number;
};

export type OwnerForm = {
  area: string;
  description: string;
  email: string;
  id: number | null;
  is_active: boolean;
  name: string;
};

export type TableDetailInfo = {
  id: number;
  schema_id: number;
  data_owner_id: number | null;
  owner: string | null;
  owner_email: string | null;
  steward_user_id: number | null;
  steward_name: string | null;
  steward_email: string | null;
  description_source: string | null;
  description_manual: string | null;
  lifecycle_status: string | null;
  certification_status: string;
  certification_criticality: string | null;
  certification_badges: string[] | null;
  certification_notes: string | null;
  certification_submitted_by_user_id: number | null;
  certification_submitted_by_user_name: string | null;
  certification_submitted_by_user_email: string | null;
  certification_submitted_at: string | null;
  certification_decided_by_user_id: number | null;
  certification_decided_by_user_name: string | null;
  certification_decided_by_user_email: string | null;
  certification_decided_at: string | null;
  certification_review_at: string | null;
  certification_expires_at: string | null;
  owner_reviewed_by_user_id: number | null;
  owner_reviewed_by_user_name: string | null;
  owner_reviewed_by_user_email: string | null;
  owner_reviewed_at: string | null;
  owner_review_due: boolean;
  owner_review_next_at: string | null;
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
  privacy_reviewed_by_user_name: string | null;
  privacy_reviewed_by_user_email: string | null;
  privacy_reviewed_at: string | null;
  privacy_review_due: boolean;
  privacy_review_next_at: string | null;
  certification_review_due: boolean;
  certification_next_review_at: string | null;
  created_at: string;
  updated_at: string;
  data_owner: DataOwnerItem | null;
  row_count_metrics?: RowCountMetrics | null;
  metabase_impact?: MetabaseImpactSummary | null;
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

export type RowCountMetrics = {
  current_row_count: number | null;
  previous_row_count: number | null;
  snapshot_at: string | null;
  previous_snapshot_at: string | null;
  collection_method: string | null;
  collection_status: string | null;
  measured_at?: string | null;
  measurement_type?: string | null;
  measurement_source?: string | null;
  status?: string | null;
  error_message?: string | null;
  duration_ms?: number | null;
  growth_absolute: number | null;
  growth_percent: number | null;
  has_history: boolean;
};

export type MetabaseImpactAssetType = "dashboard" | "question" | "collection" | "model" | string;
export type MetabaseImpactDependencyType =
  | "direct"
  | "sql_native"
  | "indirect"
  | "dashboard_card"
  | "collection_membership"
  | "unknown"
  | string;
export type MetabaseImpactRiskLevel = "none" | "low" | "medium" | "high" | string;
export type MetabaseImpactConfidenceLevel = "low" | "medium" | "high" | string;

export type MetabaseImpactDependency = {
  metabase_asset_id: number;
  metabase_id: string;
  asset_type: MetabaseImpactAssetType;
  name: string;
  collection_name: string | null;
  url: string | null;
  dependency_type: MetabaseImpactDependencyType;
  confidence_level: MetabaseImpactConfidenceLevel;
  break_risk_on_drop: MetabaseImpactRiskLevel;
  break_risk_on_change: MetabaseImpactRiskLevel;
  last_verified_at: string | null;
  details_json?: Record<string, unknown> | unknown[] | null;
};

export type MetabaseImpactSummary = {
  table_id: number;
  table_fqn: string;
  available: boolean;
  configured: boolean;
  enabled: boolean;
  instance_id: number | null;
  instance_name: string | null;
  instance_base_url: string | null;
  message: string | null;
  last_verified_at: string | null;
  dashboard_count: number;
  question_count: number;
  model_count: number;
  asset_count: number;
  break_risk_on_drop: MetabaseImpactRiskLevel;
  break_risk_on_change: MetabaseImpactRiskLevel;
  dependencies: MetabaseImpactDependency[];
};

export type TableStewardshipRequest = {
  id: number;
  table_id?: number | null;
  request_type: string;
  request_type_label: string;
  status: string;
  status_label: string;
  approver_source_label: string;
  requester_comment?: string | null;
  decision_comment?: string | null;
  aging_days: number;
  sla_days: number;
  due_at: string;
  sla_status: string;
  sla_status_label: string;
  created_at: string;
  decided_at?: string | null;
  requested_by: {
    name?: string | null;
    email?: string | null;
  };
  approver: {
    name?: string | null;
    email?: string | null;
  };
  links: {
    explorer: string;
    pending_center: string;
  };
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
  observability?: DQObservability;
};

export type TagItem = {
  id: number;
  slug: string;
  name: string;
  color: string | null;
  description: string | null;
  group_name: string | null;
  subgroup_name: string | null;
  tag_type: string | null;
  suggested_scope: string | null;
  status: string;
  synonyms: string | null;
  tables_count?: number;
  columns_count?: number;
  confidence_score?: number | null;
  inference_source?: string | null;
  inference_reason?: string | null;
  evidence?: { matched_sources?: string[]; matched_terms?: string[] } | null;
  applied_automatically?: boolean | null;
  review_status?: string | null;
  rule_key?: string | null;
  rule_label?: string | null;
  assignment_id?: number | null;
  assigned_entity_type?: string | null;
  assigned_entity_id?: number | null;
  assigned_scope?: string | null;
  reviewed_by_user_id?: number | null;
  reviewed_at?: string | null;
};

export type GlossaryTermItem = {
  id: number;
  name: string;
  definition: string;
  steward: string | null;
};

export type CanonicalAssetSource = {
  datasource_id: number;
  datasource_name: string;
  database_id: number | null;
  database_name: string | null;
  schema_id: number;
  schema_name: string;
  table_type: string;
  engine: string;
};

export type CanonicalAssetOwner = {
  data_owner_id: number | null;
  owner_name: string | null;
  owner_email: string | null;
  owner_defined: boolean;
};

export type CanonicalAssetClassification = {
  certification_status: string;
  certification_status_label: string;
  certification_criticality: string | null;
  certification_badges: string[];
  sensitivity_level: string | null;
  sensitivity_label: string;
  classification_defined: boolean;
  has_personal_data: boolean;
  has_sensitive_personal_data: boolean;
  tags_count: number;
  terms_count: number;
  readiness_score: number;
  governance_score: number | null;
  governance_label: string | null;
  governance_tone: string | null;
  trust_score: number | null;
  trust_label: string | null;
  trust_tone: string | null;
  total_columns: number;
  classified_columns: number;
  personal_classified_columns: number;
  sensitive_classified_columns: number;
  financial_classified_columns: number;
  operational_classified_columns: number;
  classification_coverage_pct: number;
  column_classification_reviewed_at: string | null;
};

export type CanonicalAssetEvidence = {
  description_complete: boolean;
  dictionary_complete: boolean;
  dq_score: number | null;
  completeness_pct_avg: number | null;
  freshness_seconds: number | null;
  open_incidents: number;
  critical_open_incidents: number;
  active_dq_violation: boolean;
  active_dq_rule_names: string[];
  last_review_at: string | null;
  last_sync_at: string | null;
  last_updated_at: string | null;
  trust_summary: string | null;
};

export type CanonicalGovernanceEvent = {
  id: string;
  event_type: string;
  category: string;
  label: string;
  detail: string | null;
  source: string;
  actor_name: string | null;
  actor_email: string | null;
  created_at: string;
};

export type CanonicalPipelineExecution = {
  execution_id: string;
  status_label: string;
  occurred_at: string | null;
  success: boolean;
  rows_written: number | null;
};

export type CanonicalPipeline = {
  linked: boolean;
  state: string;
  message: string | null;
  table_schema: string;
  table_name: string;
  pipeline_count: number;
  primary_pipeline: {
    pipeline_id: string | null;
    pipeline_name: string | null;
    dag_id: string | null;
    task_name: string | null;
    load_type: string | null;
    load_type_label: string | null;
    source_connection: string | null;
    source_database: string | null;
    source_table: string | null;
    target_schema: string | null;
    target_table: string | null;
    latest_status: string | null;
    latest_status_label: string | null;
    watermark_value: string | null;
    watermark_column: string | null;
    watermark_type: string | null;
    last_success_at: string | null;
    last_execution_started_at: string | null;
    last_execution_finished_at: string | null;
    last_failure_at: string | null;
    last_error: string | null;
    rows_processed: number | null;
    pipeline_history_href: string | null;
    airflow_dag_href: string | null;
    airflow_task_href: string | null;
    is_primary: boolean;
  } | null;
  pipelines: Array<{
    pipeline_id: string | null;
    pipeline_name: string | null;
    dag_id: string | null;
    task_name: string | null;
    load_type: string | null;
    load_type_label: string | null;
    source_connection: string | null;
    source_database: string | null;
    source_table: string | null;
    target_schema: string | null;
    target_table: string | null;
    latest_status: string | null;
    latest_status_label: string | null;
    watermark_value: string | null;
    watermark_column: string | null;
    watermark_type: string | null;
    last_success_at: string | null;
    last_execution_started_at: string | null;
    last_execution_finished_at: string | null;
    last_failure_at: string | null;
    last_error: string | null;
    rows_processed: number | null;
    pipeline_history_href: string | null;
    airflow_dag_href: string | null;
    airflow_task_href: string | null;
    is_primary: boolean;
  }>;
  stability: {
    window_runs: number;
    success_rate_pct: number;
    failed_runs: number;
    recurrent_degradation: boolean;
    currently_stale: boolean;
    current_status_label: string | null;
    points: CanonicalPipelineExecution[];
  } | null;
  history: Array<{
    bucket_start_at: string;
    pipeline_name: string | null;
    dag_id: string | null;
    task_name: string | null;
    latest_status_label: string | null;
    rows_processed: number | null;
    last_success_at: string | null;
    last_execution_finished_at: string | null;
    window_runs: number;
    success_rate_pct: number;
    failed_runs: number;
    recurrent_degradation: boolean;
    currently_stale: boolean;
  }>;
};

export type CanonicalAssetColumnPreview = {
  id: number;
  name: string;
  data_type: string;
  ordinal_position: number;
  is_nullable: boolean;
  is_primary_key: boolean;
  description_complete: boolean;
  classification_taxonomy_key: string | null;
  classification_taxonomy_label: string | null;
  classification_taxonomy_group: string | null;
  classification_review_status: string | null;
  classification_confidence_score: number | null;
  classification_is_personal_data: boolean;
  classification_is_sensitive_data: boolean;
  classification_is_financial_data: boolean;
  classification_is_operational_data: boolean;
  tags: TagItem[];
};

export type CanonicalAssetContext = {
  entity_kind: "table" | "column";
  table_id: number;
  table_name: string;
  table_fqn: string;
  table_type: string;
  column_id?: number | null;
  column_name?: string | null;
  column_data_type?: string | null;
  column_ordinal_position?: number | null;
  asset_key: string;
  display_name: string;
  source: CanonicalAssetSource;
  owner: CanonicalAssetOwner;
  classification: CanonicalAssetClassification;
  evidence: CanonicalAssetEvidence;
  lineage: LineageSummary | null;
  tags: TagItem[];
  terms: GlossaryTermItem[];
  columns: CanonicalAssetColumnPreview[];
  recent_events: CanonicalGovernanceEvent[];
  pipeline: CanonicalPipeline | null;
  links: {
    explorer: string;
    change_management: string;
    lineage: string;
    data_quality: string;
    incidents: string;
    audit: string;
    certification: string;
    owners: string;
    privacy: string;
    datasource: string;
    database: string;
    schema: string;
    metabase_consumption: string;
  };
  generated_at: string;
};

export type LineageSource = {
  type: "postgres" | "mysql" | "external";
  name: string | null;
  datasource_id: number | null;
  database: string | null;
  schema: string | null;
  object: string | null;
};

export type LineageProcessSpec = {
  type: "airflow";
  name: string;
  dag_id: string | null;
  task_id: string | null;
  meta: Record<string, unknown> | null;
};

export type LineageDownstream = {
  type: "dashboard";
  name: string;
  url: string | null;
};

export type LineageSpec = {
  table_id: number;
  upstreams: LineageSource[];
  process: LineageProcessSpec | null;
  downstreams: LineageDownstream[];
  notes: string | null;
  updated_at: string | null;
};

export type LineageSummaryAsset = {
  id: number | null;
  catalog_table_id: number | null;
  datasource_id: number | null;
  asset_key: string;
  asset_name: string;
  asset_type: string;
  layer: string;
  schema_name: string | null;
  object_name: string | null;
  system_name: string | null;
  description: string | null;
  asset_origin: string;
  external_namespace: string | null;
  external_name: string | null;
  external_type: string | null;
  external_node_id: string | null;
  is_active: boolean;
};

export type LineageJobRun = {
  external_run_id: string;
  status: string | null;
  started_at: string | null;
  ended_at: string | null;
  nominal_start_time: string | null;
};

export type LineageJobSummary = {
  id: number | null;
  namespace: string | null;
  job_name: string;
  display_name: string;
  job_type: string | null;
  latest_run_id: string | null;
  latest_run_status: string | null;
  latest_run_at: string | null;
  recent_runs: LineageJobRun[];
};

export type LineageSummary = {
  asset: LineageSummaryAsset;
  upstream: LineageSummaryAsset[];
  downstream: LineageSummaryAsset[];
  related_processes: Array<{
    process_name: string;
    process_type: string | null;
    relation_type: string;
    count: number;
  }>;
  related_dashboards: LineageSummaryAsset[];
  related_jobs: LineageJobSummary[];
  lineage_origin: "manual" | "automatic" | "merged";
  lineage_sources: string[];
  recent_runs: LineageJobRun[];
  impact: {
    upstream_count: number;
    downstream_count: number;
    process_count: number;
    dashboard_count: number;
    direct_dependencies_count: number;
    impact_level: string;
  };
  graph_nodes: Array<{
    id: string;
    label: string;
    kind: string;
    asset_id: number | null;
    catalog_table_id: number | null;
    node_type: string | null;
    asset_type: string | null;
    layer: string | null;
    subtitle: string | null;
    database_engine: string | null;
    source_type: string | null;
    process_type: string | null;
    lineage_origin: "manual" | "automatic" | "merged";
  }>;
  graph_edges: Array<{
    id: string;
    source: string;
    target: string;
    relation_type: string;
  }>;
  graph_truncated?: boolean;
  graph_limit?: number | null;
  notes: string[];
};

export type TableLocator = {
  table_id: number;
  datasource_id: number;
  datasource_name: string;
  database_id: number | null;
  database_name: string;
  schema_id: number;
  schema_name: string;
  table_name: string;
  kind: TableKind;
  db_type: DbType;
};

export type TableCorrelationDQRule = {
  id: number;
  name: string;
  severity: string;
  last_run_status: string | null;
  last_violations_count: number;
  open_incident_id: number | null;
  target_url: string;
};

export type TableCorrelationDQSummary = {
  dq_score: number | null;
  failed_rules: number;
  freshness_seconds: number | null;
  run_at: string | null;
  correlated_rules: TableCorrelationDQRule[];
};

export type TableCorrelationIncidentItem = {
  id: number;
  title: string;
  status: string;
  severity: string;
  severity_label: string;
  source_type: string | null;
  detected_at: string;
  last_seen_at: string | null;
  target_url: string;
};

export type TableCorrelationOperationalSLA = {
  active: boolean;
  issue_type: string | null;
  issue_label: string | null;
  detected_at: string | null;
  due_at: string | null;
  aging_hours: number;
  sla_hours: number | null;
  status: string;
  status_label: string;
  recurrent_degradation: boolean;
};

export type TableOperationalIncidentPrefill = {
  title: string;
  description: string;
  source_type: string;
  source_ref_id: number;
  evidence_json: Record<string, unknown>;
};

export type GovernanceScoreFactor = {
  key: string;
  label: string;
  points: number;
  max_points: number;
  status: string;
  detail: string;
};

export type GovernanceScore = {
  score: number;
  max_score: number;
  label: string;
  tone: string;
  completed_factors: number;
  partial_factors: number;
  total_factors: number;
  summary: string;
  factors: GovernanceScoreFactor[];
};

export type GovernanceScoreHistoryPoint = {
  bucket_date: string;
  score: number;
  label: string;
  tone: string;
  dq_score: number | null;
  open_incidents: number;
};

export type GovernanceScoreTrend = {
  current_score: number;
  baseline_score: number;
  delta: number;
  direction: string;
  label: string;
  tone: string;
  history: GovernanceScoreHistoryPoint[];
};

export type TableCorrelationSummary = {
  table_id: number;
  locator: TableLocator;
  operational_context: TableOperationalContext | null;
  ingestion: TableIngestionSummary | null;
  stability: TableIngestionStability | null;
  governance_score: GovernanceScore;
  governance_trend: GovernanceScoreTrend | null;
  dq: TableCorrelationDQSummary;
  incident_signals: {
    open_incidents: number;
    generated_incident_id: number | null;
    links: {
      explorer: string;
      data_quality: string;
      incidents: string;
      audit: string;
      lineage: string;
    };
  } | null;
  incidents: {
    open_count: number;
    critical_open_count: number;
    latest_open_incident_id: number | null;
    latest_open_incident_title: string | null;
    items: TableCorrelationIncidentItem[];
  };
  operational_sla: TableCorrelationOperationalSLA | null;
  incident_prefill: TableOperationalIncidentPrefill | null;
  asset_id?: number | null;
  asset_name?: string | null;
  qualified_name?: string | null;
  schema_name?: string | null;
  source_name?: string | null;
  has_operational_failure?: boolean;
  has_dq_degradation?: boolean;
  has_open_incident?: boolean;
  priority_score?: number;
  correlation_type?: string | null;
  summary?: string | null;
  signals: {
    combined_attention: boolean;
    operational_failure: boolean;
    stale_pipeline: boolean;
    open_incident: boolean;
    dq_below_threshold: boolean;
    summary: string;
  };
};

export type TableOperationalContext = {
  table_id: number;
  table_name: string;
  table_fqn: string;
  datasource_id: number;
  datasource_name: string;
  database_id: number | null;
  database_name: string;
  schema_id: number;
  schema_name: string;
  owner_name: string;
  owner_defined: boolean;
  data_owner_id: number | null;
  criticality_score: number;
  criticality_label: string;
  criticality_tone: string;
  dq_score: number | null;
  dq_status_label: string;
  certification_status: string;
  certification_status_label: string;
  dictionary_complete: boolean;
  description_complete: boolean;
  tags_count: number;
  terms_count: number;
  open_incidents: number;
  critical_open_incidents: number;
  eligible_for_certification: boolean;
  sensitivity_level: string | null;
  sensitivity_label: string;
  owner_review_due: boolean;
  privacy_review_due: boolean;
  certification_review_due: boolean;
  last_review_at: string | null;
  last_updated_at: string | null;
  last_sync_at: string | null;
  recommended_actions: string[];
  actions: ContextualAction[];
  links: {
    explorer: string;
    change_management: string;
    lineage: string;
    data_quality: string;
    incidents: string;
    audit: string;
    certification: string;
    owners: string;
    privacy: string;
    datasource: string;
    database: string;
    schema: string;
    metabase_consumption: string;
  };
};

export type MetabaseObjectType = "dashboard" | "question" | "collection";

export type MetabaseConsumptionItem = {
  object_id: number;
  external_id: string;
  object_type: MetabaseObjectType;
  title: string;
  description: string | null;
  url: string | null;
  collection_name: string | null;
  collection_external_id: string | null;
  confidence_level: string;
  confidence_reason: string | null;
  match_method: string;
  match_state?: string | null;
  link_count: number;
  source_table_name: string | null;
  source_schema_name: string | null;
  source_database_name: string | null;
  source_column_name: string | null;
};

export type MetabaseConsumptionSummary = {
  table_id: number;
  table_fqn: string;
  available: boolean;
  configured: boolean;
  enabled: boolean;
  instance_id: number | null;
  instance_name: string | null;
  instance_base_url: string | null;
  message: string | null;
  last_sync_at: string | null;
  last_sync_status: string | null;
  last_sync_message: string | null;
  dashboards_count: number;
  questions_count: number;
  collections_count: number;
  confirmed_count: number;
  inferred_count: number;
  partial_count: number;
  direct_count?: number;
  indirect_count?: number;
  match_state?: string | null;
  unresolved_count: number;
  dashboards: MetabaseConsumptionItem[];
  questions: MetabaseConsumptionItem[];
  collections: MetabaseConsumptionItem[];
};

export type MetabaseSyncRun = {
  id: number;
  instance_id: number;
  status: string;
  started_at: string;
  finished_at: string | null;
  dashboards_count: number;
  questions_count: number;
  collections_count: number;
  links_count: number;
  unresolved_count: number;
  warnings_count: number;
  error_message: string | null;
};

export type TableIngestionPipeline = {
  pipeline_id: string | null;
  pipeline_name: string | null;
  dag_id: string | null;
  task_name: string | null;
  load_type: string | null;
  load_type_label: string | null;
  source_connection: string | null;
  source_database: string | null;
  source_table: string | null;
  target_schema: string | null;
  target_table: string | null;
  latest_status: string | null;
  latest_status_label: string | null;
  watermark_value: string | null;
  watermark_column: string | null;
  watermark_type: string | null;
  last_success_at: string | null;
  last_execution_started_at: string | null;
  last_execution_finished_at: string | null;
  last_failure_at: string | null;
  last_error: string | null;
  rows_processed: number | null;
  pipeline_history_href: string | null;
  airflow_dag_href: string | null;
  airflow_task_href: string | null;
  is_primary: boolean;
};

export type TableIngestionSummary = {
  linked: boolean;
  state: string;
  message: string | null;
  table_schema: string;
  table_name: string;
  pipeline_count: number;
  primary_pipeline: TableIngestionPipeline | null;
  pipelines: TableIngestionPipeline[];
};

export type TableIngestionExecution = {
  execution_id: string;
  pipeline_id: string | null;
  pipeline_name: string | null;
  dag_id: string | null;
  airflow_dag_href: string | null;
  airflow_run_href: string | null;
  status: string | null;
  status_label: string | null;
  started_at: string | null;
  finished_at: string | null;
  duration_seconds: number | null;
  rows_extracted: number | null;
  rows_written: number | null;
  rows_upserted: number | null;
  watermark_before: string | null;
  watermark_after: string | null;
  error_message: string | null;
};

export type TableIngestionExecutionPage = {
  linked: boolean;
  state: string;
  message: string | null;
  table_schema: string;
  table_name: string;
  page: number;
  page_size: number;
  total: number;
  items: TableIngestionExecution[];
};

export type TableIngestionStabilityPoint = {
  execution_id: string;
  occurred_at: string | null;
  status_label: string;
  success: boolean;
  rows_written: number | null;
};

export type TableIngestionStability = {
  window_runs: number;
  success_rate_pct: number;
  failed_runs: number;
  recurrent_degradation: boolean;
  currently_stale: boolean;
  current_status_label: string | null;
  points: TableIngestionStabilityPoint[];
};

export type TableIngestionLog = {
  log_id: string;
  execution_id: string;
  occurred_at: string | null;
  step: string | null;
  level: string | null;
  message: string | null;
  stacktrace: string | null;
};

export type TableIngestionExecutionLogs = {
  execution_id: string;
  page: number;
  page_size: number;
  total: number;
  items: TableIngestionLog[];
};

export type TableIngestionDetail = {
  summary: TableIngestionSummary;
  executions: TableIngestionExecutionPage;
  stability: TableIngestionStability | null;
  history: TableIngestionHistoryPoint[];
};

export type TableIngestionHistoryPoint = {
  bucket_start_at: string;
  pipeline_name: string | null;
  dag_id: string | null;
  task_name: string | null;
  latest_status_label: string | null;
  rows_processed: number | null;
  last_success_at: string | null;
  last_execution_finished_at: string | null;
  window_runs: number;
  success_rate_pct: number;
  failed_runs: number;
  recurrent_degradation: boolean;
  currently_stale: boolean;
};

export type LineageNodeKind = "source" | "process" | "target" | "dashboard";
export type TableNode = TreeTable;
export type SchemaNode = TreeSchema & {
  expanded: boolean;
  loading: boolean;
  tables: TableNode[] | null;
  tablesPage: number;
  tablesHasMore: boolean;
  tablesTotal: number | null;
  tablesLoadingMore: boolean;
};
export type DatasourceNode = TreeDatasource & {
  expanded: boolean;
  loading: boolean;
  database_id: number | null;
  database_name: string;
  schemas: SchemaNode[] | null;
};
