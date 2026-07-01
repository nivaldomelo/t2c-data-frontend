export type GovernanceChangeManagementUserRef = {
  id: number;
  name?: string | null;
  email?: string | null;
  display_name?: string | null;
  is_active?: boolean | null;
};

export type GovernanceChangeManagementAssetSla = {
  id: number;
  asset_type: string;
  asset_id: number;
  sla_kind: string;
  sla_hours: number;
  status: string;
  source_kind: string;
  source_ref?: string | null;
  context_json?: Record<string, unknown> | null;
  table_id?: number | null;
  column_id?: number | null;
  asset_name?: string | null;
  asset_fqn?: string | null;
  reviewed_by_user_id?: number | null;
  reviewed_by_user?: GovernanceChangeManagementUserRef | null;
  reviewed_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type GovernanceChangeManagementAssetSlaList = {
  generated_at: string;
  asset_type: string;
  asset_id: number;
  asset_name?: string | null;
  asset_fqn?: string | null;
  total: number;
  items: GovernanceChangeManagementAssetSla[];
};

export type GovernanceChangeManagementAssetSlaInput = {
  asset_type: string;
  asset_id: number;
  sla_kind: string;
  sla_hours: number;
  status?: string;
  source_kind?: string;
  source_ref?: string | null;
  context_json?: Record<string, unknown> | null;
};

export type GovernanceChangeManagementRequestEvent = {
  id: number;
  metadata_change_request_id: number;
  event_type: string;
  previous_status?: string | null;
  next_status?: string | null;
  actor_user_id?: number | null;
  actor_user?: GovernanceChangeManagementUserRef | null;
  comment?: string | null;
  payload_json?: Record<string, unknown> | null;
  created_at: string;
};

export type GovernanceChangeManagementRequest = {
  id: number;
  request_key: string;
  asset_type: string;
  asset_id: number;
  table_id?: number | null;
  column_id?: number | null;
  asset_name?: string | null;
  asset_fqn?: string | null;
  change_kind: string;
  status: string;
  status_label: string;
  title: string;
  description?: string | null;
  requested_by_user_id?: number | null;
  requested_by_user?: GovernanceChangeManagementUserRef | null;
  reviewed_by_user_id?: number | null;
  reviewed_by_user?: GovernanceChangeManagementUserRef | null;
  approved_by_user_id?: number | null;
  approved_by_user?: GovernanceChangeManagementUserRef | null;
  applied_by_user_id?: number | null;
  applied_by_user?: GovernanceChangeManagementUserRef | null;
  rejected_by_user_id?: number | null;
  rejected_by_user?: GovernanceChangeManagementUserRef | null;
  reviewed_at?: string | null;
  approved_at?: string | null;
  applied_at?: string | null;
  rejected_at?: string | null;
  policy_rule_key?: string | null;
  recommendation_id?: number | null;
  current_value_json?: Record<string, unknown> | null;
  proposed_value_json?: Record<string, unknown> | null;
  context_json?: Record<string, unknown> | null;
  apply_error?: string | null;
  can_review: boolean;
  can_approve: boolean;
  can_apply: boolean;
  can_reject: boolean;
  links?: Record<string, string> | null;
  events: GovernanceChangeManagementRequestEvent[];
  created_at: string;
  updated_at: string;
};

export type GovernanceChangeManagementRequestList = {
  generated_at: string;
  total: number;
  page: number;
  page_size: number;
  items: GovernanceChangeManagementRequest[];
};

export type GovernanceChangeManagementRequestInput = {
  asset_type: string;
  asset_id: number;
  change_kind: string;
  title: string;
  description?: string | null;
  policy_rule_key?: string | null;
  recommendation_id?: number | null;
  current_value_json?: Record<string, unknown> | null;
  proposed_value_json?: Record<string, unknown> | null;
  context_json?: Record<string, unknown> | null;
};

export type GovernanceChangeManagementTransitionInput = {
  comment?: string | null;
};
