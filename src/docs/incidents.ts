import type { DocContent } from "@/docs/types";

export const incidentsDoc: DocContent = {
  id: "incidents",
  title: "Incidentes",
  intro: "Centro operacional de incidentes de dados com triagem, timeline, severidade, SLA e causa raiz.",
  sections: [
    {
      id: "incidents-summary",
      title: "Central de triagem",
      body: "A visão principal reúne KPIs, filas por status/domínio/responsável/SLA e ativos mais impactados para priorização operacional.",
    },
    {
      id: "incidents-filters",
      title: "Filtros",
      body: "Use filtros por status, severidade, tipo, período, domínio, owner e SLA para priorizar investigação e resposta.",
    },
    {
      id: "incidents-create",
      title: "Criar Ticket",
      body: "Abra incidentes vinculados a tabela ou DAG, definindo owner, domínio, SLA, severidade e contexto do problema.",
    },
    {
      id: "incidents-list",
      title: "Lista de Tickets",
      body: "Acompanhe evolução dos incidentes, timeline, causa raiz e postmortem com base no ciclo de tratamento.",
    },
  ],
};
