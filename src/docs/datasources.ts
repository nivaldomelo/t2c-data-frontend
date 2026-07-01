import type { DocContent } from "@/docs/types";

export const datasourcesDoc: DocContent = {
  id: "datasources",
  title: "Fontes de dados",
  intro: "Gerencie conexões, escopos de schema e execução de scan do catálogo.",
  sections: [
    {
      id: "datasources-create",
      title: "Criar fonte de dados",
      body: "Cadastre conexão Postgres/MySQL, teste conectividade e, no PostgreSQL, selecione schemas incluídos e excluídos para catalogação.",
    },
    {
      id: "datasources-list",
      title: "Lista de fontes de dados",
      body: "Exibe status, conexão, último scan e ações de editar/excluir/rodar scan para cada fonte.",
    },
    {
      id: "datasources-actions",
      title: "Ações",
      body: "Use Editar para ajustes incrementais e Excluir para remoção definitiva dos dados relacionados ao datasource.",
    },
  ],
};
