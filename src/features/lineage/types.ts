export type LineageAssetRef = {
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
  is_active: boolean;
};

export type LineageRelation = {
  id: number;
  source_asset_id: number;
  target_asset_id: number;
  source_asset: LineageAssetRef;
  target_asset: LineageAssetRef;
  relation_type: string;
  process_name: string | null;
  process_type: string | null;
  dashboard_name: string | null;
  notes: string | null;
  evidence: string | null;
  discovery_method: string;
  lineage_origin: "manual" | "automatic" | "merged";
  lineage_source_name: string | null;
  lineage_namespace: string | null;
  lineage_job_name: string | null;
  confidence_score: number;
  confidence_tier: "strong" | "moderate" | "weak" | null;
  is_verified: boolean;
  version: number;
  last_seen_at: string | null;
  created_by_user_id: number | null;
  updated_by_user_id: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type LineageOverview = {
  total_assets: number;
  total_relations: number;
  total_gold_tables_with_lineage: number;
  total_dashboards_related: number;
  automatic_relations: number;
  manual_relations: number;
  merged_assets: number;
};

export type LineageRelationListResponse = {
  summary: LineageOverview;
  page: number;
  page_size: number;
  total: number;
  has_more: boolean;
  items: LineageRelation[];
};

export type LineageAssetListItem = {
  key: string;
  asset: LineageAssetRef;
  lineage_origin: "manual" | "automatic" | "merged";
  relation_count: number;
  updated_at: string;
};

export type LineageProcessSummary = {
  process_name: string;
  process_type: string | null;
  relation_type: string;
  count: number;
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

export type LineageSummaryNode = {
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
};

export type LineageColumnEdge = {
  id: number;
  lineage_source_id: number | null;
  lineage_job_id: number | null;
  source_asset: LineageAssetRef;
  target_asset: LineageAssetRef;
  source_asset_id: number;
  target_asset_id: number;
  relative_direction: "upstream" | "downstream";
  local_asset_name: string;
  related_asset_name: string;
  local_asset_path: string | null;
  related_asset_path: string | null;
  local_column_name: string;
  related_column_name: string;
  source_column_name: string;
  target_column_name: string;
  relation_type: string;
  discovery_method: string;
  evidence_source: string | null;
  evidence_label: string | null;
  evidence: string | null;
  confidence_score: number;
  confidence_label: string | null;
  confidence_tier: "strong" | "moderate" | "weak" | null;
  is_verified: boolean;
  version: number;
  last_seen_at: string | null;
  created_by_user_id: number | null;
  updated_by_user_id: number | null;
  transform_expression: string | null;
  notes: string | null;
  external_edge_key: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type LineageColumnEdgeMutation = {
  lineage_source_id: number | null;
  lineage_job_id: number | null;
  source_asset_id: number;
  target_asset_id: number;
  source_column_name: string;
  target_column_name: string;
  relation_type: string;
  discovery_method: string;
  confidence_score: number;
  evidence_source: string | null;
  evidence: string | null;
  transform_expression: string | null;
  notes: string | null;
  external_edge_key: string | null;
  is_verified?: boolean | null;
};

export type LineageSummaryEdge = {
  id: string;
  source: string;
  target: string;
  relation_type: string;
  confidence_score?: number | null;
  confidence_tier?: "strong" | "moderate" | "weak" | null;
  is_verified?: boolean | null;
  version?: number | null;
  evidence?: string | null;
};

export type LineageSummary = {
  asset: LineageAssetRef;
  upstream: LineageAssetRef[];
  downstream: LineageAssetRef[];
  related_processes: LineageProcessSummary[];
  related_dashboards: LineageAssetRef[];
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
  graph_nodes: LineageSummaryNode[];
  graph_edges: LineageSummaryEdge[];
  notes: string[];
  graph_truncated: boolean;
  graph_limit: number | null;
};

export type LineageRelationVersion = {
  id: number;
  lineage_relation_id: number;
  version_number: number;
  source_asset_id: number;
  target_asset_id: number;
  relation_type: string;
  process_name: string | null;
  process_type: string | null;
  dashboard_name: string | null;
  notes: string | null;
  evidence: string | null;
  discovery_method: string;
  confidence_score: number;
  is_verified: boolean;
  last_seen_at: string | null;
  external_edge_key: string | null;
  is_active: boolean;
  created_by_user_id: number | null;
  updated_by_user_id: number | null;
  snapshot_json: string;
  recorded_at: string;
  recorded_by_user_id: number | null;
  created_at: string;
  updated_at: string;
};

export type LineageColumnEdgeVersion = {
  id: number;
  lineage_column_edge_id: number;
  version_number: number;
  lineage_source_id: number | null;
  lineage_job_id: number | null;
  source_asset_id: number;
  target_asset_id: number;
  source_column_name: string;
  target_column_name: string;
  relation_type: string;
  discovery_method: string;
  confidence_score: number;
  evidence_source: string | null;
  evidence: string | null;
  transform_expression: string | null;
  notes: string | null;
  external_edge_key: string | null;
  is_verified: boolean;
  last_seen_at: string | null;
  is_active: boolean;
  created_by_user_id: number | null;
  updated_by_user_id: number | null;
  snapshot_json: string;
  recorded_at: string;
  recorded_by_user_id: number | null;
  created_at: string;
  updated_at: string;
};

export type AssetCandidate = LineageAssetRef & {
  lineage_asset_id: number | null;
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
  kind: string;
  db_type: string;
};

export type LineageSpreadsheetIssue = {
  sheet: string;
  row_number: number;
  message: string;
};

export type LineageImportPreview = {
  mode: string;
  summary: {
    assets_found: number;
    total_assets_identified: number;
    assets_created: number;
    total_new_assets: number;
    assets_updated: number;
    edges_found: number;
    total_relations_identified: number;
    edges_created: number;
    total_new_relations: number;
    edges_updated: number;
    total_updated_relations: number;
    ignored_rows: number;
    warnings_count: number;
    errors_count: number;
  };
  assets_preview: Array<Record<string, unknown>>;
  relations_preview: Array<Record<string, unknown>>;
  warnings: LineageSpreadsheetIssue[];
  errors: LineageSpreadsheetIssue[];
};

export type LineageImportCommit = {
  mode: string;
  assets_found: number;
  processed_assets: number;
  assets_created: number;
  created_assets: number;
  assets_updated: number;
  updated_assets: number;
  edges_found: number;
  processed_relations: number;
  edges_created: number;
  created_relations: number;
  edges_updated: number;
  updated_relations: number;
  created_dashboards: number;
  warnings: LineageSpreadsheetIssue[];
  errors: LineageSpreadsheetIssue[];
};

export type LineageSourceConfig = {
  id: number;
  name: string;
  source_type: string;
  base_url: string;
  default_namespace: string | null;
  auth_type: string | null;
  auth_username: string | null;
  auth_secret: string | null;
  configured_auth: boolean;
  enabled: boolean;
  last_sync_at: string | null;
  last_sync_status: string | null;
  last_sync_message: string | null;
  created_at: string;
  updated_at: string;
};

export type LineageSourceStatus = {
  id: number;
  name: string;
  source_type: string;
  enabled: boolean;
  last_sync_at: string | null;
  last_sync_status: string | null;
  last_sync_message: string | null;
  events_processed: number;
  jobs_synced: number;
  datasets_synced: number;
  relations_synced: number;
  column_edges_synced: number;
  created_at: string;
  updated_at: string;
};

export type LineageSourceSyncResult = {
  source: LineageSourceConfig;
  namespace: string | null;
  node_id: string | null;
  depth: number;
  datasets_synced: number;
  jobs_synced: number;
  runs_synced: number;
  assets_created: number;
  assets_updated: number;
  relations_created: number;
  relations_updated: number;
  matched_catalog_assets: number;
  unmatched_assets_created: number;
  warnings: string[];
};

export type RelationFormSide = {
  mode: "candidate" | "manual";
  assetId: number | null;
  catalogTableId: number | null;
  label: string;
  manual: {
    asset_name: string;
    asset_type: "table" | "view" | "dashboard" | "question" | "source" | "incident" | "certification" | "dq_rule";
    layer: "bronze" | "silver" | "gold" | "mart" | "dashboard" | "source" | "definir";
    schema_name: string;
    object_name: string;
    system_name: string;
    description: string;
  };
};
