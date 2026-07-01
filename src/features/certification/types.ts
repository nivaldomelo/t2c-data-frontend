import type { CertificationBadgeKey } from "@/components/certification/certification-badge";

export type DataOwnerRef = {
  id: number;
  name: string;
  email: string;
  area: string | null;
  is_active: boolean;
};

export type CertificationChecklistItem = {
  key: string;
  label: string;
  passed: boolean;
  detail: string;
};

export type CertificationItem = {
  id: number;
  name: string;
  schema_name: string;
  database_name: string;
  datasource_name: string;
  owner: string | null;
  owner_email: string | null;
  data_owner_id: number | null;
  data_owner: DataOwnerRef | null;
  data_owner_is_active?: boolean | null;
  certification_status: string;
  certification_status_source: string;
  certification_status_rule: string;
  certification_status_reason: string;
  certification_criticality: string | null;
  certification_badges: CertificationBadgeKey[] | null;
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
  certification_review_due: boolean;
  certification_next_review_at: string | null;
  certification_sla_due_at: string | null;
  certification_sla_status: string;
  certification_sla_label: string;
  certification_revalidation_required: boolean;
  certification_next_step: string | null;
  active_dq_violation: boolean;
  active_dq_violation_count: number;
  active_dq_rule_names: string[];
  trust_score?: number | null;
  trust_label?: string | null;
  trust_tone?: string | null;
  owner_reviewed_by_user_id: number | null;
  owner_reviewed_by_user_name: string | null;
  owner_reviewed_by_user_email: string | null;
  owner_reviewed_at: string | null;
  owner_review_due: boolean;
  owner_review_next_at: string | null;
  privacy_review_due: boolean;
  privacy_review_next_at: string | null;
  certification_status_label: string;
  readiness_score: number;
  readiness_completed: number;
  readiness_total: number;
  eligible_for_certification: boolean;
  checklist: CertificationChecklistItem[];
  created_at: string;
  updated_at: string;
};

export type CertificationForm = {
  certification_status: string;
  certification_criticality: string;
  certification_notes: string;
  certification_review_at: string;
  certification_expires_at: string;
  certification_badges: CertificationBadgeKey[];
};

export type CertificationFilterOption = {
  id: number;
  name: string;
};

export type CertificationTablesFilters = {
  owners: CertificationFilterOption[];
  schemas: string[];
  databases: string[];
};

export type CertificationTablesPage = {
  total: number;
  page: number;
  page_size: number;
  items: CertificationItem[];
  filters: CertificationTablesFilters;
};

export type CertificationSummaryPriorityItem = {
  id: number;
  name: string;
  schema_name: string;
  database_name: string;
  datasource_name: string;
  certification_status: string;
  certification_status_label: string;
  readiness_score: number;
  readiness_completed: number;
  readiness_total: number;
  pending_criteria: number;
  primary_blocker: string | null;
  primary_blocker_detail: string | null;
  next_step: string | null;
};

export type CertificationSummary = {
  total: number;
  certified: number;
  eligible: number;
  in_review: number;
  rejected: number;
  revalidation_pending: number;
  not_eligible: number;
  avg_readiness: number;
  blockers: Array<{
    key: string;
    label: string;
    count: number;
    percent: number;
    description: string;
    action: string;
  }>;
  near_certification: CertificationSummaryPriorityItem[];
  most_blocked: CertificationSummaryPriorityItem[];
  distribution: Array<{
    key: string;
    database_name: string;
    schema_name: string;
    total: number;
    certified: number;
    eligible: number;
    not_eligible: number;
    avg_readiness: number;
    primary_blocker: string | null;
    primary_blocker_count: number;
  }>;
};

export type CertificationGoal = {
  id: number;
  name: string;
  period_start: string;
  period_end: string;
  target_certified_assets: number;
  target_eligible_assets: number;
  target_reviewed_assets: number;
  target_revalidated_assets: number;
  scope_type: string;
  scope_value: string | null;
  owner: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type CertificationGoalProgress = {
  goal: CertificationGoal;
  progress: {
    certified_assets: number;
    eligible_assets: number;
    reviewed_assets: number;
    revalidated_assets: number;
    decisions_assets: number;
    refusal_assets: number;
    current_certified_assets: number;
    current_eligible_assets: number;
    remaining_certified_assets: number;
    completion_percent: number;
    days_elapsed: number;
    days_remaining: number;
    required_daily_rate: number;
    current_daily_rate: number;
    projected_total: number;
    status: string;
    status_label: string;
    history_source: string;
    history_note: string | null;
  };
  daily: Array<{
    date: string;
    certified: number;
    eligible: number;
    reviewed: number;
    revalidated: number;
    accumulated_certified: number;
  }>;
  blockers: CertificationSummary["blockers"];
  recommendations: Array<{
    title: string;
    description: string;
    priority: string;
    action_label: string | null;
    action_href: string | null;
  }>;
};

export type CertificationDecisionEvent = {
  id: number;
  asset_id: number;
  asset_name: string;
  database_name: string;
  schema_name: string;
  table_name: string;
  previous_status: string | null;
  new_status: string;
  previous_readiness: number | null;
  new_readiness: number | null;
  decision_type: string;
  decision_source: string;
  reviewer_user_id: number | null;
  reviewer: string | null;
  reviewer_email: string | null;
  observation: string | null;
  reason: string | null;
  valid_until: string | null;
  revalidation_due_at: string | null;
  goal_id: number | null;
  metadata_json: Record<string, unknown> | null;
  created_at: string;
};

export type CertificationDecisionEventPage = {
  items: CertificationDecisionEvent[];
  total: number;
  page: number;
  page_size: number;
};
