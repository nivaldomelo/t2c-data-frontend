import type { DocContent } from "@/docs/types";

export const explorerDoc: DocContent = {
  id: "explorer",
  title: "Explorer · Catálogo",
  intro: "Navegação hierárquica por datasource, schema e tabela, com detalhes operacionais e governança.",
  sections: [
    {
      id: "explorer-search",
      title: "Busca",
      body: "Encontre schemas, tabelas e colunas pelo nome. Clique em um resultado para abrir o caminho na árvore.",
    },
    {
      id: "explorer-tree",
      title: "Árvore do Catálogo",
      body: "Expanda datasource → database → schema → tabela para navegar no metadado catalogado.",
    },
    {
      id: "explorer-details",
      title: "Detalhes da Tabela",
      body: "Mostra colunas, classificações, termos e linhagem. Use as abas para alternar entre as visões.",
    },
  ],
};
