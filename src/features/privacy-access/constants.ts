import type { HistoryCategoryKey, QuickFilterKey } from "./types";

export const QUICK_FILTERS: { key: QuickFilterKey; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "possible_personal_data", label: "Possível dado pessoal" },
  { key: "not_classified", label: "Não classificados" },
  { key: "personal_confirmed", label: "Dado pessoal confirmado" },
  { key: "sensitive", label: "Dado sensível" },
  { key: "restricted", label: "Restritos" },
  { key: "wide_access", label: "Acesso amplo" },
  { key: "without_legal_basis", label: "Sem base legal" },
  { key: "without_owner", label: "Sem owner" },
  { key: "without_review", label: "Sem revisão" },
  { key: "high_risk", label: "Alto risco" },
];

export const HISTORY_CATEGORY_FILTERS: { key: HistoryCategoryKey; label: string }[] = [
  { key: "all", label: "Todos os eventos" },
  { key: "sensitivity", label: "Sensibilidade" },
  { key: "personal_data", label: "Dado pessoal" },
  { key: "sensitive_data", label: "Dado sensível" },
  { key: "legal_basis", label: "Base legal" },
  { key: "purpose", label: "Finalidade" },
  { key: "retention", label: "Retenção" },
  { key: "access", label: "Acesso" },
  { key: "roles", label: "Roles" },
  { key: "masking", label: "Mascaramento" },
  { key: "external_sharing", label: "Compartilhamento externo" },
  { key: "review", label: "Revisão" },
  { key: "notes", label: "Observações" },
];

export const PRIVACY_HISTORY_FIELDS = [
  "classification",
  "has_personal_data",
  "has_sensitive_personal_data",
  "legal_basis",
  "privacy_purpose",
  "retention_policy",
  "access_scope",
  "access_roles",
  "privacy_notes",
  "privacy_reviewed_at",
  "is_masked",
  "external_sharing",
] as const;

export const JOURNEYS = [
  {
    title: "Explorer",
    description: "Investigue colunas, descrições, tags, owner e o contexto técnico do ativo antes de confirmar sensibilidade.",
    href: "/explorer",
  },
  {
    title: "Data Quality",
    description: "Use perfilamento e regras para entender volume, padrões de dados e sinais que reforçam uma revisão de privacidade.",
    href: "/data-quality",
  },
  {
    title: "Incidentes",
    description: "Verifique incidentes de acesso, exposição, qualidade ou uso indevido antes de manter acesso amplo.",
    href: "/incidents",
  },
  {
    title: "Domínios",
    description: "Entenda o contexto de negócio do ativo e se ele faz parte de um conjunto mais sensível por natureza.",
    href: "/governance/domains",
  },
  {
    title: "Produtos de dados",
    description: "Avalie quem consome o ativo e qual impacto uma restrição de acesso pode ter em entregas já formalizadas.",
    href: "/governance/data-products",
  },
  {
    title: "Linhagem",
    description: "Cheque impacto em pipelines, dashboards e consumidores antes de restringir ou mascarar o ativo.",
    href: "/lineage",
  },
  {
    title: "Certificação",
    description: "Privacidade e acesso influenciam a confiança operacional do ativo e podem bloquear elegibilidade de certificação.",
    href: "/certification",
  },
  {
    title: "Dashboard executivo",
    description: "Use a visão executiva para acompanhar cobertura de privacidade ao lado de governança, qualidade e certificação.",
    href: "/dashboard",
  },
];
