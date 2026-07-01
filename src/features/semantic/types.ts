export type SemanticLink = {
  id: number;
  domain_id?: number | null;
  product_id?: number | null;
  relation_kind: string;
  entity_kind: string;
  entity_id?: number | null;
  entity_label: string;
  entity_href?: string | null;
  notes?: string | null;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
};

export type SemanticAsset = {
  entity_kind: "table";
  entity_id: number;
  label: string;
  href: string;
  table_fqn: string;
  domain_name?: string | null;
  datasource_name: string;
  database_name: string;
  schema_name: string;
  owner_name?: string | null;
  dq_score?: number | null;
  trust_score?: number | null;
  readiness_score?: number | null;
  documentation_score?: number | null;
  open_incidents: number;
  critical_open_incidents: number;
};

export type SemanticDomainSuggestion = {
  slug: string;
  name: string;
  criticality?: string | null;
  assets_count: number;
  quality_score: number;
  governance_score: number;
  maturity_score: number;
  maturity_status: string;
  open_incidents: number;
  critical_open_incidents: number;
};

export type SemanticDomain = {
  id: number;
  slug: string;
  name: string;
  description?: string | null;
  owner?: string | null;
  steward?: string | null;
  criticality?: string | null;
  maturity_status: string;
  quality_score?: number | null;
  governance_score?: number | null;
  notes?: string | null;
  is_active: boolean;
  products_count: number;
  assets_count: number;
  pipelines_count: number;
  rules_count: number;
  incidents_count: number;
  dashboards_count: number;
  contracts_count: number;
  maturity_score: number;
  maturity_label: string;
  created_at: string;
  updated_at: string;
};

export type SemanticProduct = {
  id: number;
  domain_id: number;
  domain_slug?: string | null;
  domain_name?: string | null;
  slug: string;
  name: string;
  description?: string | null;
  owner?: string | null;
  steward?: string | null;
  consumers: string[];
  sla_text?: string | null;
  contract_text?: string | null;
  maturity_status: string;
  quality_score?: number | null;
  governance_score?: number | null;
  notes?: string | null;
  is_active: boolean;
  assets_count: number;
  pipelines_count: number;
  rules_count: number;
  incidents_count: number;
  dashboards_count: number;
  contracts_count: number;
  maturity_score: number;
  maturity_label: string;
  created_at: string;
  updated_at: string;
};

export type SemanticDomainDetail = SemanticDomain & {
  products: SemanticProduct[];
  links: SemanticLink[];
  assets: SemanticAsset[];
};

export type SemanticProductDetail = SemanticProduct & {
  links: SemanticLink[];
  assets: SemanticAsset[];
};

export type SemanticProductSummary = {
  product: Record<string, unknown>;
  domain: Record<string, unknown>;
  assets: {
    total: number;
    without_owner: number;
    without_quality_rules: number;
    with_incidents: number;
    certified: number;
    items: Array<Record<string, unknown>>;
  };
  quality: Record<string, unknown>;
  incidents: {
    open: number;
    critical: number;
    in_progress: number;
    resolved_recently: number;
    items: Array<Record<string, unknown>>;
  };
  dashboards: {
    total: number;
    items: Array<Record<string, unknown>>;
  };
  contract: Record<string, unknown>;
  lineage: Record<string, unknown>;
  certification_readiness: {
    status: string;
    score: number;
    checklist: Array<{ key: string; label: string; passed: boolean; reason: string }>;
    blockers: Array<Record<string, unknown>>;
    warnings: Array<Record<string, unknown>>;
  };
  recommendations: Array<{
    type: string;
    severity: "high" | "medium" | "low";
    title: string;
    description: string;
    reason: string;
    action_label: string;
    action_target: string;
  }>;
  links: Array<Record<string, unknown>>;
};

export type SemanticDomainPage = {
  page: number;
  page_size: number;
  total: number;
  has_more: boolean;
  items: SemanticDomain[];
  suggestions: SemanticDomainSuggestion[];
};

export type SemanticProductPage = {
  page: number;
  page_size: number;
  total: number;
  has_more: boolean;
  items: SemanticProduct[];
};

export type SemanticDomainInput = {
  slug: string;
  name: string;
  description?: string | null;
  owner?: string | null;
  steward?: string | null;
  criticality?: string | null;
  maturity_status?: string;
  quality_score?: number | null;
  governance_score?: number | null;
  notes?: string | null;
  is_active?: boolean;
};

export type SemanticDomainUpdate = Partial<SemanticDomainInput>;

export type SemanticProductInput = {
  domain_slug: string;
  slug: string;
  name: string;
  description?: string | null;
  owner?: string | null;
  steward?: string | null;
  consumers?: string[];
  sla_text?: string | null;
  contract_text?: string | null;
  maturity_status?: string;
  quality_score?: number | null;
  governance_score?: number | null;
  notes?: string | null;
  is_active?: boolean;
};

export type SemanticProductUpdate = Partial<SemanticProductInput>;

export type SemanticLinkInput = {
  relation_kind: string;
  entity_kind: string;
  entity_id?: number | null;
  entity_label: string;
  entity_href?: string | null;
  notes?: string | null;
  is_primary?: boolean;
};
