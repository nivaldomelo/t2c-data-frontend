export type OwnerTablePreview = {
  id: number;
  name: string;
  schema_name: string;
  database_name: string;
  datasource_name: string;
  description: string | null;
};

export type DataOwnerListItem = {
  id: number;
  name: string;
  email: string;
  area: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  tables_count: number;
  tables_preview: OwnerTablePreview[];
};

export type DataOwnerDetail = DataOwnerListItem & {
  tables: OwnerTablePreview[];
};

export type OwnerFormState = {
  name: string;
  email: string;
  area: string;
  description: string;
  is_active: boolean;
};

export type PageResponse<T> = {
  items?: T[];
  total?: number;
  page?: number;
  page_size?: number;
  has_more?: boolean;
};

export type PrivacySummary = {
  totals: {
    visible_assets: number;
    without_owner: number;
  };
};

export type CatalogTable = {
  id: number;
  schema_id: number;
  data_owner_id: number | null;
  name: string;
  table_type: string;
  description_source: string | null;
  description_manual: string | null;
  owner: string | null;
  owner_email: string | null;
  lifecycle_status: string | null;
  certification_status: string;
  certification_criticality: string | null;
  sensitivity_level: string | null;
  has_personal_data: boolean;
  has_sensitive_personal_data: boolean;
  access_scope: string | null;
  privacy_reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type TableLocator = {
  table_id: number;
  datasource_name: string;
  database_name: string;
  schema_name: string;
  table_name: string;
};

export type OwnerPriority = {
  ownerId: number;
  ownerName: string;
  reason: string;
  affectedAssets: number;
  action: string;
  tone: "danger" | "warning" | "neutral";
};

export type OwnershipSummaryOwner = {
  id: number;
  name: string;
  email: string;
  area: string | null;
  status: "active" | "inactive";
  updated_at: string;
  asset_count: number;
  certified_assets: number;
  certification_pending_assets: number;
  eligible_assets: number;
  not_eligible_assets: number;
  in_review_assets: number;
  rejected_assets: number;
  revalidation_pending_assets: number;
  dq_monitored_assets: number;
  dq_unmonitored_assets: number;
  open_incidents: number;
  critical_incidents: number;
  assets_with_open_incidents: number;
  privacy_pending_assets: number;
  personal_data_assets: number;
  sensitive_data_assets: number;
  restricted_assets: number;
  possible_personal_data_assets: number;
  assets_without_legal_basis: number;
  assets_without_privacy_review: number;
  assets_without_description: number;
  assets_without_tags: number;
  assets_without_terms: number;
  assets_without_sla: number;
  average_quality_score: number | null;
  average_governance_score: number | null;
  average_readiness_score: number | null;
  risk_level: "low" | "medium" | "high" | "critical";
  main_blocker: string | null;
  recommended_action: string | null;
};

export type OwnershipSummaryPriority = {
  type: "owner" | "asset";
  severity: "medium" | "high" | "critical" | "low";
  title: string;
  description: string;
  owner_id: number | null;
  asset_id: number | null;
  recommended_action: string;
};

export type OwnershipUnownedAsset = {
  id: number;
  name: string;
  database_name: string;
  schema_name: string;
  connection_name: string;
  criticality: string | null;
  certification_status: string;
  privacy_signal: string | null;
  open_incidents: number;
  dq_score: number | null;
  updated_at: string | null;
  recommended_action: string;
};

export type OwnershipRankingItem = {
  owner_id: number;
  name: string;
  area: string | null;
  status: "active" | "inactive";
  metric_value: number;
  risk_level: "low" | "medium" | "high" | "critical";
};

export type OwnershipDistributionAsset = {
  database_name: string | null;
  schema_name: string | null;
  total_assets: number;
  assets_with_owner: number;
  assets_without_owner: number;
  privacy_pending_assets: number;
  certification_pending_assets: number;
};

export type OwnershipSummaryResponse = {
  totals: {
    owners: number;
    active_owners: number;
    inactive_owners: number;
    owners_with_assets: number;
    owners_without_assets: number;
    assets_with_owner: number;
    assets_without_owner: number;
    critical_assets_without_owner: number;
    personal_data_assets_without_owner: number;
    certification_pending_assets: number;
    privacy_pending_assets: number;
    dq_unmonitored_assets: number;
    assets_with_open_incidents: number;
  };
  owners_total: number;
  page: number;
  page_size: number;
  total_pages: number;
  owners: OwnershipSummaryOwner[];
  unowned_assets: OwnershipUnownedAsset[];
  priorities: OwnershipSummaryPriority[];
  distribution: {
    by_area: Array<{ area: string; owners: number; active_owners: number; assets: number }>;
    by_schema: OwnershipDistributionAsset[];
    by_database: OwnershipDistributionAsset[];
  };
  rankings: {
    most_assets: OwnershipRankingItem[];
    most_certification_pending: OwnershipRankingItem[];
    most_privacy_pending: OwnershipRankingItem[];
    most_incidents: OwnershipRankingItem[];
    most_dq_unmonitored: OwnershipRankingItem[];
    inactive_with_assets: OwnershipRankingItem[];
  };
};

export type OwnershipDeleteImpact = {
  owner: {
    id: number;
    name: string;
    email: string;
    area: string | null;
  };
  impact: {
    asset_count: number;
    certified_assets: number;
    critical_assets: number;
    personal_data_assets: number;
    sensitive_data_assets: number;
    restricted_assets: number;
    open_incidents: number;
    certification_pending_assets: number;
    privacy_pending_assets: number;
    dq_unmonitored_assets: number;
  };
  sample_assets: Array<{
    id: number;
    name: string;
    database: string | null;
    schema: string | null;
    risk: string | null;
    reason: string;
  }>;
  can_delete_without_force: boolean;
  warning_message: string;
};

export type OwnershipReassignSourceOwner = {
  id: number;
  name: string;
  email: string;
  area: string | null;
  tables_count: number;
};

export type OwnershipReassignOwner = {
  id: number;
  name: string;
  email: string;
  area: string | null;
};

export type OwnershipReassignAsset = {
  id: number;
  name: string;
  database: string | null;
  schema: string | null;
  criticality: string | null;
  certification_status: string;
  privacy_signal: string | null;
  has_personal_data: boolean;
  has_sensitive_personal_data: boolean;
  dq_monitored: boolean;
  privacy_pending: boolean;
  open_incidents: number;
  recommended_action: string;
};

export type OwnershipReassignImpact = {
  asset_count: number;
  certified_assets: number;
  critical_assets: number;
  personal_data_assets: number;
  sensitive_data_assets: number;
  open_incidents: number;
  certification_pending_assets: number;
  privacy_pending_assets: number;
  dq_unmonitored_assets: number;
};

export type OwnershipReassignPreview = {
  source_owner: OwnershipReassignOwner;
  target_owner: OwnershipReassignOwner | null;
  impact: OwnershipReassignImpact;
  assets: OwnershipReassignAsset[];
  page: number;
  page_size: number;
  total_assets: number;
};

export type OwnershipReassignResult = {
  reassigned_count: number;
  source_owner_id: number;
  target_owner_id: number;
  assets: OwnershipReassignAsset[];
  note: string | null;
};
