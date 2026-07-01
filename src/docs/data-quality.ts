import type { DocContent } from "@/docs/types";

export const dataQualityDoc: DocContent = {
  id: "data-quality",
  title: "Qualidade de dados",
  intro: "Observabilidade e qualidade de dados por tabela, com métricas de tendência e saúde.",
  sections: [
    {
      id: "dq-tree",
      title: "Árvore de Seleção",
      body: "Selecione uma tabela para carregar o último profiling e comparar com runs anteriores.",
    },
    {
      id: "dq-overview",
      title: "Visão geral das métricas",
      body: "Mostra DQ Score, completude, freshness e volume com indicadores visuais e tendência.",
    },
    {
      id: "dq-heatmap",
      title: "Qualidade por coluna",
      body: "Heatmap por coluna para identificar rapidamente campos críticos por nulidade e distribuição.",
    },
    {
      id: "dq-rules-filters",
      title: "Regras · Filtros",
      body: "Filtre regras por tabela, severidade, status e busca textual para priorizar análise.",
    },
    {
      id: "dq-rules-create",
      title: "Regras · Criar/Editar",
      body: "Cadastre regras no construtor visual por fonte, schema, tabela, coluna, operador e valor. Use a validação estrutural para conferir metadados antes de executar no cluster Spark.",
    },
    {
      id: "dq-rules-list",
      title: "Regras · Execução",
      body: "Execute manualmente regras e acompanhe último status, violações e incidentes gerados em falhas críticas/altas.",
    },
  ],
};
