import type { DocContent } from "@/docs/types";

export const homeDoc: DocContent = {
  id: "home",
  title: "Resumo · Resumo do Catálogo",
  intro: "Visão executiva de cobertura do catálogo, saúde de dados e principais riscos.",
  sections: [
    {
      id: "overview-cards",
      title: "Cards de visão geral",
      body: "Mostram volume de dados, cobertura e saúde geral (DQ/Freshness). Use para monitoramento diário rápido.",
    },
    {
      id: "top-issues",
      title: "Principais pendências",
      body: "Lista tabelas mais críticas por DQ e desatualização para priorizar ações do time.",
    },
    {
      id: "quick-links",
      title: "Atalhos",
      body: "Acesse rapidamente Explorer, Fontes de dados, Qualidade de dados e Auditoria para investigação detalhada.",
    },
  ],
};
