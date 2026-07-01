export type DashboardKpi = {
  key: string;
  label: string;
  value: number;
  unit?: string | null;
  hint?: string | null;
  tone: string;
};

export type BreakdownItem = {
  key: string;
  label: string;
  value: number;
  tone?: string | null;
};

export type CoverageItem = {
  key: string;
  label: string;
  pct: number;
  count: number;
  total: number;
  tone?: string | null;
};

export type TrendPoint = {
  label: string;
  value: number;
};

export type TableItem = {
  table_id: number;
  table_name: string;
  table_fqn: string;
  datasource_name: string;
  database_name: string;
  schema_name: string;
  engine: string;
  table_type: string;
  dq_score?: number | null;
  completeness_pct_avg?: number | null;
  freshness_seconds?: number | null;
  open_incidents: number;
  critical_open_incidents: number;
  certification_status: string;
  certification_criticality?: string | null;
  certification_badges: string[];
  owner_defined: boolean;
  owner_name?: string | null;
  dictionary_complete: boolean;
  description_complete: boolean;
  tags_count: number;
  terms_count: number;
  readiness_score: number;
  documentation_score: number;
  domain_name?: string | null;
  sensitivity_level?: string | null;
  last_review_at?: string | null;
  last_sync_at?: string | null;
  last_updated_at?: string | null;
};

export type IncidentItem = {
  id: number;
  title: string;
  entity_type: string;
  severity: string;
  status: string;
  detected_at: string;
  table_fqn?: string | null;
  airflow_dag_id?: string | null;
};

export type DashboardSummary = {
  generated_at: string;
  kpis: DashboardKpi[];
  certification: {
    by_status: BreakdownItem[];
    by_criticality: BreakdownItem[];
    by_badge: BreakdownItem[];
    eligible_tables: number;
    pending_critical: number;
  };
  governance: {
    coverage: CoverageItem[];
  };
  dq: {
    avg_score: number;
    below_minimum: number;
    without_metrics: number;
    score_bands: BreakdownItem[];
    freshness_bands: BreakdownItem[];
    worst_tables: TableItem[];
    trend: TrendPoint[];
  };
  incidents: {
    total_open: number;
    critical_open: number;
    open_on_certified_assets: number;
    avg_open_age_hours: number;
    by_status: BreakdownItem[];
    by_priority: BreakdownItem[];
    top_items: IncidentItem[];
  };
  sources: {
    by_engine: BreakdownItem[];
    by_datasource: BreakdownItem[];
    lowest_governance: BreakdownItem[];
    distribution: {
      total_sources: number;
      total_schemas: number;
      total_tables: number;
      served_tables: number;
      certified_tables: number;
      pending_tables: number;
      items: Array<{
        datasource_id: number;
        datasource_name: string;
        engine: string;
        engine_label: string;
        database_name: string;
        schema_count: number;
        table_count: number;
        served_tables: number;
        certified_tables: number;
        pending_tables: number;
        is_active: boolean;
        status_key: string;
        status_label: string;
        status_tone: string;
      }>;
    };
  };
  documentation: {
    coverage: CoverageItem[];
    undocumented_tables: number;
    most_complete: TableItem[];
    least_complete: TableItem[];
  };
  attention: {
    low_dq: TableItem[];
    no_owner: TableItem[];
    no_dictionary: TableItem[];
    eligible_not_certified: TableItem[];
    critical_incidents: TableItem[];
    rejected: TableItem[];
    restricted: TableItem[];
  };
};

export type ExecutiveFilterOption = {
  value: string;
  label: string;
  datasource_id?: number | null;
  database_id?: number | null;
  schema_id?: number | null;
};

export type ExecutiveAppliedFilters = {
  domain?: string | null;
  data_source_id?: number | null;
  source?: string | null;
  database?: string | null;
  schema_key?: string | null;
  schema?: string | null;
  owner?: string | null;
  certification_status?: string | null;
  dq_band?: string | null;
  incidents?: string | null;
  q?: string | null;
};

export type ExecutiveScoreFactor = {
  key: string;
  label: string;
  points: number;
  applied: boolean;
  detail: string;
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

export type ExecutiveAction = {
  key: string;
  label: string;
  description: string;
  href: string;
  category: string;
  tone: string;
};

export type ExecutiveAsset = {
  table_id: number;
  table_name: string;
  table_fqn: string;
  domain_name: string;
  datasource_name: string;
  database_name: string;
  schema_name: string;
  owner_name: string;
  owner_defined: boolean;
  data_owner_is_active?: boolean | null;
  governance_score: GovernanceScore;
  criticality_score: number;
  criticality_label: string;
  criticality_tone: string;
  dq_score?: number | null;
  dq_status_label: string;
  certification_status: string;
  certification_status_label: string;
  dictionary_complete: boolean;
  dictionary_status_label: string;
  tags_count: number;
  terms_count: number;
  open_incidents: number;
  critical_open_incidents: number;
  last_review_at?: string | null;
  last_updated_at?: string | null;
  last_sync_at?: string | null;
  sensitivity_level?: string | null;
  sensitivity_label: string;
  eligible_for_certification: boolean;
  owner_review_due: boolean;
  privacy_review_due: boolean;
  certification_review_due: boolean;
  score_factors: ExecutiveScoreFactor[];
  recommended_actions: string[];
  actions: ExecutiveAction[];
  links: {
    explorer: string;
    lineage: string;
    data_quality: string;
    certification: string;
    incidents: string;
    owners: string;
    privacy: string;
    audit: string;
    datasource: string;
    database: string;
    schema: string;
  };
};

export type ExecutiveGovernanceGap = {
  key: string;
  label: string;
  count: number;
  pct: number;
  hint: string;
};

export type ExecutiveGovernanceMaturityBand = {
  key: string;
  label: string;
  count: number;
  pct: number;
  tone: string;
};

export type ExecutiveRiskItem = {
  label: string;
  asset_count: number;
  avg_score: number;
  max_score: number;
  critical_assets: number;
  open_incidents: number;
};

export type ExecutiveMaturityPanelItem = {
  key: string;
  label: string;
  asset_count: number;
  owner_pct: number;
  description_pct: number;
  tags_pct: number;
  glossary_pct: number;
  pipeline_mapped_pct: number;
  dq_avg_score: number;
  governance_avg_score: number;
  open_incidents: number;
  critical_open_incidents: number;
  governance_label: string;
  governance_tone: string;
};

export type ExecutiveCampaign = {
  key: string;
  label: string;
  count: number;
  completed_count: number;
  progress_pct: number;
  responsible: string;
  hint: string;
  href: string;
  export_csv_href: string;
  export_xlsx_href: string;
  tone: string;
};

export type ExecutiveCampaignQueueItem = {
  table_id: number;
  table_name: string;
  table_fqn: string;
  datasource_name: string;
  database_name: string;
  schema_name: string;
  owner_name: string;
  governance_score: GovernanceScore;
  certification_status: string;
  certification_status_label: string;
  sensitivity_label: string;
  last_review_at?: string | null;
  links: {
    explorer: string;
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
  };
};

export type ExecutiveCampaignQueue = {
  generated_at: string;
  campaign: ExecutiveCampaign;
  total: number;
  page: number;
  page_size: number;
  items: ExecutiveCampaignQueueItem[];
};

export type ExecutiveIngestionItem = {
  table_id?: number | null;
  table_name: string;
  table_fqn: string;
  pipeline_name?: string | null;
  dag_id?: string | null;
  task_name?: string | null;
  load_type_label?: string | null;
  latest_status_label?: string | null;
  last_success_at?: string | null;
  last_execution_finished_at?: string | null;
  watermark_value?: string | null;
  rows_processed?: number | null;
  last_error?: string | null;
  pipeline_history_href?: string | null;
  airflow_dag_href?: string | null;
  airflow_task_href?: string | null;
  target_url?: string | null;
};

export type ExecutiveIngestionSummary = {
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
  items: ExecutiveIngestionItem[];
  high_volume_failed_items: ExecutiveIngestionItem[];
};

export type ExecutiveOperationalIntelligenceItem = {
  entity_kind: string;
  key: string;
  label: string;
  href: string;
  table_id?: number | null;
  domain_name?: string | null;
  owner_name?: string | null;
  score: number;
  priority_score: number;
  risk_label: string;
  risk_tone: string;
  asset_count: number;
  open_incidents: number;
  critical_open_incidents: number;
  recent_incidents_30d: number;
  recent_dq_failure_runs_30d: number;
  change_events_30d: number;
  search_clicks_30d: number;
  stale_hours?: number | null;
  degraded_pipelines: number;
  failed_pipelines: number;
  reasons: string[];
  suggested_actions: string[];
  suggested_incident: boolean;
  incident_hint?: string | null;
};

export type ExecutiveOperationalIntelligenceAlert = {
  key: string;
  title: string;
  description: string;
  severity: string;
  tone: string;
  entity_kind: string;
  href: string;
  table_id?: number | null;
  suggested_incident: boolean;
};

export type ExecutiveOperationalIntelligence = {
  generated_at: string;
  window_days: number;
  evaluated_assets: number;
  priority_queue_size: number;
  high_risk_assets: number;
  high_risk_domains: number;
  high_risk_products: number;
  unstable_pipelines: number;
  deteriorating_assets: number;
  recurring_instability: number;
  suggested_incidents: number;
  by_asset: ExecutiveOperationalIntelligenceItem[];
  by_domain: ExecutiveOperationalIntelligenceItem[];
  by_product: ExecutiveOperationalIntelligenceItem[];
  by_pipeline: ExecutiveOperationalIntelligenceItem[];
  alerts: ExecutiveOperationalIntelligenceAlert[];
  trend: TrendPoint[];
};

export type ExecutiveDashboardSummary = {
  generated_at: string;
  available_filters: {
    domains: ExecutiveFilterOption[];
    sources: ExecutiveFilterOption[];
    databases: ExecutiveFilterOption[];
    schemas: ExecutiveFilterOption[];
    owners: ExecutiveFilterOption[];
    certification_statuses: ExecutiveFilterOption[];
    dq_bands: ExecutiveFilterOption[];
    incident_options: ExecutiveFilterOption[];
  };
  applied_filters: ExecutiveAppliedFilters;
  kpis: DashboardKpi[];
  top_critical: {
    total: number;
    items: ExecutiveAsset[];
  };
  certification: {
    certified: number;
    eligible_not_certified: number;
    not_eligible: number;
    certified_pct: number;
    eligible_not_certified_pct: number;
    not_eligible_pct: number;
  };
  governance_gaps: {
    total_assets: number;
    items: ExecutiveGovernanceGap[];
  };
  governance_reviews: {
    total_assets: number;
    items: ExecutiveGovernanceGap[];
  };
  governance_maturity: {
    avg_score: number;
    bands: ExecutiveGovernanceMaturityBand[];
  };
  governance_trend: {
    delta: number;
    direction: string;
    label: string;
    tone: string;
    history: Array<{ bucket_date: string; avg_score: number; assets: number }>;
  };
  stewardship: {
    pending_total: number;
    awaiting_assignment: number;
    review_pending: number;
    certification_pending: number;
    my_approvals_pending: number;
    my_owner_queue: number;
    by_owner: Array<{ key: string; label: string; count: number; href: string }>;
    by_approver: Array<{ key: string; label: string; count: number; href: string }>;
  };
  campaigns: ExecutiveCampaign[];
  ingestion: ExecutiveIngestionSummary;
  critical_changes: Array<{
    id: number;
    changed_at: string;
    actor_name?: string | null;
    actor_email?: string | null;
    field_name?: string | null;
    change_type?: string | null;
    sensitive_category?: string | null;
    table_id?: number | null;
    table_name?: string | null;
    schema_name?: string | null;
    database_name?: string | null;
    datasource_name?: string | null;
    before_value?: string | null;
    after_value?: string | null;
    href?: string | null;
  }>;
  dq: {
    avg_score: number;
    not_evaluated: number;
    score_bands: BreakdownItem[];
    worst_assets: ExecutiveAsset[];
    trend: TrendPoint[];
  };
  incidents: {
    open_total: number;
    critical_open_total: number;
    by_severity: BreakdownItem[];
    top_assets: ExecutiveAsset[];
    recurring_assets: ExecutiveAsset[];
    impact_assets: ExecutiveAsset[];
  };
  risk: {
    by_domain: ExecutiveRiskItem[];
    by_source: ExecutiveRiskItem[];
    by_schema: ExecutiveRiskItem[];
  };
  maturity_panels: {
    by_domain: ExecutiveMaturityPanelItem[];
    by_source: ExecutiveMaturityPanelItem[];
    by_owner: ExecutiveMaturityPanelItem[];
    by_schema: ExecutiveMaturityPanelItem[];
  };
  operational_intelligence: ExecutiveOperationalIntelligence;
};

export type ExecutiveDashboardOverview = Pick<
  ExecutiveDashboardSummary,
  | "generated_at"
  | "available_filters"
  | "applied_filters"
  | "kpis"
  | "top_critical"
  | "certification"
  | "governance_gaps"
  | "governance_reviews"
  | "governance_maturity"
  | "governance_trend"
>;

export type ExecutiveDashboardSecondary = Pick<
  ExecutiveDashboardSummary,
  "generated_at" | "stewardship" | "campaigns" | "critical_changes" | "ingestion" | "dq" | "incidents" | "risk" | "maturity_panels" | "operational_intelligence"
>;

export type ExecutiveDashboardAssetDetails = {
  generated_at: string;
  asset: ExecutiveAsset;
  incidents: Array<{
    id: number;
    title: string;
    severity: string;
    status: string;
    detected_at?: string | null;
    occurrences: number;
  }>;
  next_actions: string[];
  data_notes: {
    domain: string;
    dq_status: string;
    eligibility: string;
  };
};

export type StrategicMetric = {
  key: string;
  label: string;
  current: number;
  previous: number;
  delta: number;
  unit?: string | null;
  hint?: string | null;
  tone: string;
  reverse_trend: boolean;
};

export type StrategicTopUser = {
  user_id: number;
  label: string;
  total_count: number;
  usage_count: number;
  search_count: number;
};

export type StrategicBenchmarkItem = {
  key: string;
  label: string;
  href?: string | null;
  asset_count: number;
  quality_score: number;
  governance_score: number;
  coverage_score: number;
  reliability_score: number;
  adoption_count: number;
  adoption_score: number;
  open_incidents: number;
  critical_open_incidents: number;
  maturity_score: number;
  maturity_label: string;
  tone: string;
  domain_name?: string | null;
  domain_href?: string | null;
};

export type StrategicRoadmapStage = {
  key: string;
  label: string;
  description: string;
  criteria: string[];
  minimum_score: number;
  current_count: number;
  current_pct: number;
  tone: string;
};

export type StrategicAdoptionSummary = {
  active_users: number;
  active_domains: number;
  active_areas: number;
  active_products: number;
  top_users: StrategicTopUser[];
  top_domains: StrategicBenchmarkItem[];
  top_areas: StrategicBenchmarkItem[];
  top_products: StrategicBenchmarkItem[];
  low_adoption_areas: StrategicBenchmarkItem[];
  top_assets: Array<{
    table_id: number;
    table_name: string;
    table_fqn: string;
    domain_name: string;
    owner_name: string;
    adoption_score: number;
    search_clicks_30d: number;
    dq_score: number;
    trust_score: number;
  }>;
};

export type StrategicReports = {
  maturity_by_domain: StrategicBenchmarkItem[];
  reliability_by_domain: StrategicBenchmarkItem[];
  quality_by_domain: StrategicBenchmarkItem[];
  governance_by_domain: StrategicBenchmarkItem[];
  coverage_by_domain: StrategicBenchmarkItem[];
  value_trend: TrendPoint[];
  quality_trend: TrendPoint[];
  governance_trend: TrendPoint[];
  adoption_trend: TrendPoint[];
};

export type StrategicSummary = {
  generated_at: string;
  window_days: number;
  value_score: number;
  value_score_previous: number;
  value_score_delta: number;
  value_metrics: StrategicMetric[];
  adoption: StrategicAdoptionSummary;
  reports: StrategicReports;
  benchmark: {
    by_domain: StrategicBenchmarkItem[];
    by_area: StrategicBenchmarkItem[];
    by_product: StrategicBenchmarkItem[];
  };
  roadmap: StrategicRoadmapStage[];
  narrative: string[];
};
