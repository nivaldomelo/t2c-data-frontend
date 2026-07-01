import type { PrivacySummaryLike } from "@/components/privacy/privacy-badge";

export type SelectOption = { value: string; label: string };

export type PageResponse<T> = {
  items?: T[];
  total?: number;
  page?: number;
  page_size?: number;
  has_more?: boolean;
};

export type PrivacySummary = PrivacySummaryLike & {
  sensitivity_label: string;
  legal_basis_label: string | null;
  privacy_purpose: string | null;
  access_scope_label: string | null;
  access_roles: string[] | null;
  access_role_labels: string[] | null;
  privacy_reviewed_by_user_name: string | null;
  privacy_reviewed_by_user_email: string | null;
};

export type PrivacySuspectedColumn = {
  column_name: string;
  data_type: string;
  signal: string;
  reason: string;
  suggested_classification: string;
  confidence: string;
};

export type PrivacyTable = {
  id: number;
  name: string;
  table_type: string;
  schema_name: string;
  database_name: string;
  datasource_name: string;
  engine: string;
  owner: string | null;
  owner_email: string | null;
  privacy: PrivacySummary;
  updated_at: string;
};

export type PrivacyTableDetail = PrivacyTable & {
  description_manual: string | null;
  description_source: string | null;
  lifecycle_status: string | null;
  certification_status: string;
  certification_criticality: string | null;
  certification_badges: string[] | null;
  suspected_columns: PrivacySuspectedColumn[];
};

export type PrivacyReviewChangedField = {
  field: string;
  previous: unknown;
  new: unknown;
};

export type PrivacyReviewEvent = {
  id: number;
  table_id: number;
  table_name: string;
  schema_name: string;
  database_name: string;
  review_type: string;
  review_source: string;
  reviewer_user_id: number | null;
  reviewer_name: string | null;
  reviewer_email: string | null;
  notes: string | null;
  risk_before: string | null;
  risk_after: string | null;
  next_review_at: string | null;
  created_at: string;
  changed_fields: PrivacyReviewChangedField[];
};

export type PrivacyReviewEventPage = {
  items: PrivacyReviewEvent[];
  total: number;
  page: number;
  page_size: number;
};

export type PrivacyGlobalSummary = {
  totals: {
    visible_assets: number;
    classified_assets: number;
    unclassified_assets: number;
    confirmed_personal_data: number;
    confirmed_sensitive_data: number;
    restricted_assets: number;
    possible_personal_data: number;
    without_legal_basis: number;
    wide_access_with_suspicion: number;
    without_owner: number;
    without_review: number;
  };
  risk: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  top_blockers: Array<{
    key: string;
    label: string;
    count: number;
    percent: number;
    description: string;
    action: string;
  }>;
  by_schema: Array<{
    database: string;
    schema_name: string;
    total: number;
    unclassified: number;
    possible_personal_data: number;
    confirmed_personal_data: number;
    sensitive_data: number;
    restricted: number;
    wide_access_with_suspicion: number;
    without_legal_basis: number;
    risk_score: number;
  }>;
  priorities: Array<{
    asset_id: number;
    asset_name: string;
    database_name: string;
    schema_name: string;
    risk_level: string;
    reason: string;
    recommended_action: string;
  }>;
};

export type PrivacyEventSummary = {
  total_events: number;
  by_type: Record<string, number>;
  by_reviewer: Record<string, number>;
  by_schema: Record<string, number>;
  increased_risk: number;
  reduced_risk: number;
  unchanged_risk: number;
  periodic_reviews: number;
  access_changes: number;
  legal_basis_changes: number;
  purpose_changes: number;
  assets_with_review_due: number;
  upcoming_review_due: number;
  due_60_days: number;
  without_next_review: number;
  sensitive_without_next_review: number;
  current_risk_critical: number;
  current_risk_high: number;
  review_due: {
    overdue: number;
    due_30_days: number;
    due_60_days: number;
    without_next_review: number;
    sensitive_without_next_review: number;
  };
  recent_events: PrivacyReviewEvent[];
};

export type PrivacyPeriodicReviewPayload = {
  notes: string;
  next_review_at: string | null;
  confirmed: boolean;
};

export type PrivacyOptions = {
  sensitivity_levels: SelectOption[];
  legal_basis_options: SelectOption[];
  access_scopes: SelectOption[];
  access_roles: SelectOption[];
};

export type PrivacyFormState = {
  sensitivity_level: string;
  has_personal_data: boolean;
  has_sensitive_personal_data: boolean;
  legal_basis: string;
  privacy_purpose: string;
  retention_policy: string;
  is_masked: boolean;
  external_sharing: boolean;
  access_scope: string;
  access_roles: string[];
  privacy_notes: string;
};

export type QuickFilterKey =
  | "all"
  | "possible_personal_data"
  | "not_classified"
  | "personal_confirmed"
  | "sensitive"
  | "restricted"
  | "wide_access"
  | "without_legal_basis"
  | "without_owner"
  | "without_review"
  | "high_risk";

export type HistoryCategoryKey =
  | "all"
  | "sensitivity"
  | "personal_data"
  | "sensitive_data"
  | "legal_basis"
  | "purpose"
  | "retention"
  | "access"
  | "roles"
  | "masking"
  | "external_sharing"
  | "review"
  | "notes";

export type HistoryImpact = {
  tone: "success" | "warning" | "danger" | "neutral";
  label: string;
  description: string;
  direction: "up" | "down" | "review" | "info" | "attention";
};

export type PrivacyHistoryEntry = {
  id: string;
  changed_at: string;
  actor_name: string | null;
  actor_email: string | null;
  change_type: string | null;
  field_name: string | null;
  field_names: string[];
  before_value: unknown;
  after_value: unknown;
  changed_fields: PrivacyReviewChangedField[];
  notes: string | null;
  risk_before: string | null;
  risk_after: string | null;
  next_review_at: string | null;
  source_label: string;
  source_kind: "dedicated" | "audit";
  review_type: string | null;
};

export type RiskDirectionFilter = "all" | "increased" | "reduced" | "unchanged";
export type GlobalEventsPeriodFilter = "all" | "7d" | "30d" | "90d";
export type GlobalEventsFocusFilter = "all" | "access_scope" | "legal_basis" | "privacy_purpose" | "periodic_review";

export type PriorityItem = {
  table: PrivacyTable | null;
  score: number;
  reason: string;
  risk: string;
  action: string;
  asset_id?: number;
  asset_name?: string;
  database_name?: string;
  schema_name?: string;
};
