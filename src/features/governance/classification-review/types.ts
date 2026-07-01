export type ClassificationReviewOption = {
  value: string;
  label: string;
};

export type ClassificationReviewSignal = {
  key: string;
  label: string;
  value?: string | null;
  tone?: string;
  detail?: string | null;
};

export type ClassificationReviewTerm = {
  id: number;
  name: string;
  definition: string;
  steward?: string | null;
};

export type ClassificationReviewTag = {
  id: number;
  external_id?: string | null;
  slug: string;
  name: string;
  color?: string | null;
  description?: string | null;
  group_name?: string | null;
  subgroup_name?: string | null;
  example_of_use?: string | null;
  tag_type?: string | null;
  suggested_scope?: string | null;
  status: string;
  synonyms?: string | null;
  notes?: string | null;
  confidence_score?: number | null;
  inference_source?: string | null;
  inference_reason?: string | null;
  applied_automatically?: boolean | null;
  review_status?: string | null;
  rule_key?: string | null;
  rule_label?: string | null;
  assigned_entity_type?: string | null;
  assigned_entity_id?: number | null;
  reviewed_by_user_id?: number | null;
  reviewed_at?: string | null;
};

export type ClassificationReviewLinks = {
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

export type ClassificationReviewItem = {
  key: string;
  kind: string;
  entity_level: string;
  entity_type: string;
  table_id: number;
  table_name: string;
  table_fqn: string;
  column_id?: number | null;
  column_name?: string | null;
  datasource_id: number;
  datasource_name: string;
  database_name: string;
  schema_name: string;
  domain_name?: string | null;
  owner_name?: string | null;
  certification_status: string;
  certification_status_label: string;
  sensitivity_level?: string | null;
  sensitivity_label: string;
  owner_defined: boolean;
  description_complete: boolean;
  dictionary_complete: boolean;
  classification_defined: boolean;
  total_columns: number;
  classified_columns: number;
  personal_classified_columns: number;
  sensitive_classified_columns: number;
  financial_classified_columns: number;
  operational_classified_columns: number;
  classification_coverage_pct: number;
  column_classification_reviewed_at?: string | null;
  tags_count: number;
  terms_count: number;
  readiness_score: number;
  governance_score: number;
  governance_label: string;
  governance_tone: string;
  trust_score: number;
  trust_label?: string | null;
  trust_tone?: string | null;
  dq_score?: number | null;
  has_personal_data: boolean;
  has_sensitive_personal_data: boolean;
  active_dq_violation: boolean;
  active_dq_rule_names: string[];
  critical_open_incidents: number;
  suggestion_tag_id?: number | null;
  suggestion_tag_name?: string | null;
  suggestion_tag_slug?: string | null;
  confidence_score?: number | null;
  inference_source?: string | null;
  inference_reason?: string | null;
  applied_automatically?: boolean | null;
  review_status: string;
  current_tags: ClassificationReviewTag[];
  table_tags: ClassificationReviewTag[];
  column_tags: ClassificationReviewTag[];
  current_terms: ClassificationReviewTerm[];
  signals: ClassificationReviewSignal[];
  recommended_actions: string[];
  links: ClassificationReviewLinks;
  created_at: string;
  updated_at: string;
  reviewed_at?: string | null;
  risk_score: number;
};

export type ClassificationReviewSummary = {
  pending_reviews: number;
  high_confidence_reviews: number;
  trust_at_risk: number;
  probable_pii: number;
  probable_sensitive: number;
  conflicts: number;
  critical_columns: number;
  inheritance_pending: number;
  reviewed_recently: number;
};

export type ClassificationReviewFilterCollection = {
  kinds: ClassificationReviewOption[];
  entity_levels: ClassificationReviewOption[];
  review_statuses: ClassificationReviewOption[];
  sources: ClassificationReviewOption[];
  datasources: ClassificationReviewOption[];
  databases: ClassificationReviewOption[];
  schemas: ClassificationReviewOption[];
  domains: ClassificationReviewOption[];
  owners: ClassificationReviewOption[];
  tags: ClassificationReviewOption[];
};

export type ClassificationReviewResponse = {
  generated_at: string;
  total: number;
  page: number;
  page_size: number;
  filters: ClassificationReviewFilterCollection;
  summary: ClassificationReviewSummary;
  items: ClassificationReviewItem[];
};

export type ClassificationReviewBatchPromoteResponse = {
  generated_at: string;
  requested_table_ids: number[];
  promoted_count: number;
  refresh_created: number;
  refresh_updated: number;
  refresh_reopened: number;
  refresh_resolved: number;
  refresh_purged: number;
  retention_days: number;
};

export type ClassificationReviewFilters = {
  q: string;
  kind: string;
  entity_level: string;
  review_status: string;
  source: string;
  datasource: string;
  schema_name: string;
  domain: string;
  owner: string;
  tag: string;
  min_confidence: string;
  max_confidence: string;
  contains_pii: boolean;
  contains_sensitive: boolean;
  contains_critical: boolean;
  sort_by: string;
};
