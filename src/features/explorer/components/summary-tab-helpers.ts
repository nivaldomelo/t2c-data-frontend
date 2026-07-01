export function governanceToneClasses(tone: string) {
  if (tone === "success") return "border-success-200 bg-success-50 text-success-700";
  if (tone === "accent") return "border-brand-200 bg-brand-50 text-brand-900";
  if (tone === "warning") return "border-warning-200 bg-warning-50 text-warning-900";
  return "border-danger-200 bg-danger-50 text-danger-900";
}

export function trustTone(tone: string | null | undefined): "neutral" | "accent" | "warning" | "success" {
  if (tone === "success") return "success";
  if (tone === "accent") return "accent";
  if (tone === "warning") return "warning";
  return "neutral";
}

export function stewardshipHref({
  tableId,
  requestType,
  tableName,
  schemaName,
  databaseName,
  datasourceName,
}: {
  tableId: number;
  requestType:
    | "table_description"
    | "owner_assignment"
    | "glossary_terms"
    | "certification_review"
    | "owner_review"
    | "privacy_review";
  tableName?: string | null;
  schemaName?: string | null;
  databaseName?: string | null;
  datasourceName?: string | null;
}) {
  const params = new URLSearchParams({
    tableId: String(tableId),
    requestType,
    create: "1",
    origin: "explorer",
  });
  if (tableName) params.set("tableName", tableName);
  if (schemaName) params.set("schemaName", schemaName);
  if (databaseName) params.set("databaseName", databaseName);
  if (datasourceName) params.set("datasourceName", datasourceName);
  return `/governance/stewardship?${params.toString()}`;
}

export function collaborationHref({
  tableId,
  entityLabel,
}: {
  tableId: number;
  entityLabel: string;
}) {
  const params = new URLSearchParams({
    entity_type: "table",
    entity_id: String(tableId),
    entity_label: entityLabel,
  });
  return `/governance/collaboration?${params.toString()}`;
}

export const EXPLORER_SUMMARY_COPY = {
  journeys: {
    description:
      "Ponto de partida para entender o ativo com contexto. Os atalhos levam a qualidade, incidentes, linhagem, consumo, certificação e mudanças para você ver rapidamente se a tabela está pronta ou pede correção.",
    links: {
      dataQuality: "Revisar regras, profiling e sinais que afetam a confiança do ativo.",
      incidents: "Checar falhas abertas, recorrência e impacto operacional recente.",
      lineage: "Entender dependências upstream e downstream antes de mudar algo.",
      metabase: "Ver painéis, perguntas e coleções que consomem esta tabela.",
      certification: "Avaliar prontidão, validade e nível de confiança do ativo.",
      changeManagement: "Abrir mudanças formais, ajustar SLA e acompanhar aprovações.",
      collaboration: "Reunir owner, descrição e contexto para trabalhar o ativo em conjunto.",
    },
  },
  canonical: {
    description:
      "Mostra a versão central do ativo no catálogo, reunindo identidade, owner, classificação, evidências, linhagem e eventos em um só lugar. Use este bloco para avaliar se a tabela está bem documentada e pronta para reutilização com segurança.",
    evidence:
      "Se estiver incompleto, revise owner, descrição, classificação e evidências de uso antes de confiar no ativo.",
    lineage:
      "A linhagem ajuda a entender o impacto de mudanças e a confirmar se o ativo já está conectado aos fluxos corretos.",
    readiness:
      "Leia este campo como uma indicação de prontidão: quanto mais completo o contexto, maior a chance de o ativo estar preparado para consumo.",
  },
  governance: {
    description:
      "Destaca as pendências que merecem ação primeiro, como owner ausente, classificação incompleta, qualidade baixa, incidentes recentes ou impacto em consumo e linhagem.",
    action:
      "Use esta lista para decidir o que deve ser corrigido primeiro antes de promover, alterar ou consumir o ativo.",
  },
  operational: {
    stewardship:
      "Quando um ponto exigir dono, revisão ou aprovação formal, use este fluxo para transformar a leitura do catálogo em uma solicitação rastreável.",
    timeline:
      "Acompanhe solicitações pendentes, decisões recentes e prazos para não perder o contexto da operação dentro do Explorer.",
    ingestion:
      "Conecta o ativo ao pipeline que o atualiza para cruzar operação e governança na mesma tela.",
    correlation:
      "Quanto maior o score, mais completo e confiável tende a estar o contexto. Examine os fatores para entender o que ainda falta fechar.",
  },
} as const;
