export type SearchOption = {
  value: string;
  label: string;
};

export type SearchBadge = {
  label: string;
  tone: string;
};

export type SearchResultTag = {
  id: number;
  name: string;
  color?: string | null;
  confidence_score?: number | null;
  inference_source?: string | null;
  inference_reason?: string | null;
  applied_automatically?: boolean | null;
  review_status?: string | null;
  rule_label?: string | null;
};

export type SearchResultMetadata = {
  source?: string | null;
  datasource_id?: number | null;
  database?: string | null;
  database_id?: number | null;
  schema?: string | null;
  schema_id?: number | null;
  owner?: string | null;
  domain?: string | null;
  classification?: string | null;
  table_name?: string | null;
  table_id?: number | null;
  table_fqn?: string | null;
  data_type?: string | null;
  category?: string | null;
  status?: string | null;
  group_name?: string | null;
  tag_type?: string | null;
  assignments?: number | null;
  area?: string | null;
  assets_count?: number | null;
  db_type?: string | null;
  incidents_target_url?: string | null;
  dq_target_url?: string | null;
  alias_count?: number | null;
  popularity_count?: number | null;
  governance_score?: number | null;
  governance_label?: string | null;
  governance_tone?: string | null;
  certification_status?: string | null;
  readiness_score?: number | null;
  active_dq_violation?: boolean | null;
  owner_defined?: boolean | null;
  description_complete?: boolean | null;
  dictionary_complete?: boolean | null;
  has_personal_data?: boolean | null;
  has_sensitive_personal_data?: boolean | null;
  tags?: SearchResultTag[];
};

export type SearchResultItem = {
  entity_type: string;
  entity_id: number;
  category: string;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  context_path?: string | null;
  match_reason: string;
  relevance_score: number;
  target_url: string;
  badges: SearchBadge[];
  metadata: SearchResultMetadata;
};

export type SearchGroup = {
  key: string;
  label: string;
  total: number;
  items: SearchResultItem[];
};

export type SearchAvailableFilters = {
  types: SearchOption[];
  sources: SearchOption[];
  databases: SearchOption[];
  schemas: SearchOption[];
  domains: SearchOption[];
  owners: SearchOption[];
  classifications: SearchOption[];
  certification: SearchOption[];
  incidents: SearchOption[];
  governance_maturity: SearchOption[];
};

export type SearchAppliedFilters = {
  result_type?: string | null;
  source?: string | null;
  database?: string | null;
  schema?: string | null;
  domain?: string | null;
  owner?: string | null;
  classification?: string | null;
  certification?: string | null;
  incidents?: string | null;
  governance_maturity?: string | null;
};

export type SearchResultsResponse = {
  query: string;
  total: number;
  groups: SearchGroup[];
  items: SearchResultItem[];
  available_filters: SearchAvailableFilters;
  applied_filters: SearchAppliedFilters;
  took_ms: number;
  min_query_length: number;
};

export type SearchSuggestionsResponse = {
  query: string;
  groups: SearchGroup[];
  took_ms: number;
  min_query_length: number;
};

export type SearchCollectionResponse = {
  enabled: boolean;
  items: Array<{
    label: string;
    target_url?: string | null;
    entity_type?: string | null;
    entity_id?: number | null;
    category?: string | null;
    subtitle?: string | null;
    context_path?: string | null;
    description?: string | null;
    count?: number | null;
  }>;
};

export type SearchFavoriteStatusResponse = {
  favorite: boolean;
};

export type SearchFavoritePayload = {
  entity_type: string;
  entity_id: number;
  label: string;
  target_url?: string | null;
  category?: string | null;
  subtitle?: string | null;
  context_path?: string | null;
  metadata?: Record<string, unknown> | unknown[] | null;
};

export type SearchAliasFiltersResponse = {
  datasources: SearchOption[];
  databases: SearchOption[];
  schemas: SearchOption[];
  tables: SearchOption[];
  columns: SearchOption[];
  label_kinds: SearchOption[];
  entity_types: SearchOption[];
};

export type SearchAliasItem = {
  id: number;
  entity_type: string;
  label_kind: string;
  label: string;
  normalized_label: string;
  datasource_id?: number | null;
  datasource_name?: string | null;
  database_id?: number | null;
  database_name?: string | null;
  schema_id?: number | null;
  schema_name?: string | null;
  table_id?: number | null;
  table_name?: string | null;
  column_id?: number | null;
  column_name?: string | null;
};

export type SearchAliasListResponse = {
  total: number;
  items: SearchAliasItem[];
};

export type SearchAliasPayload = {
  entity_type: string;
  label_kind: string;
  label: string;
  table_id?: number | null;
  column_id?: number | null;
};
