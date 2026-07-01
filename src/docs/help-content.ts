import type { DocContent } from "@/docs/types";

type RouteDocEntry = {
  match: (pathname: string) => boolean;
  doc: DocContent;
};

const commonPermissions = {
  admin: "Admin: acesso total (visualização e edição).",
  editor: "Editor: atua nas áreas operacionais e funcionais permitidas; não acessa Fontes de dados, Auditoria e Administração.",
  viewer: "Visualizador: somente leitura em Resumo, Explorer, Linhagem, Inbox e Perfil.",
  stewardship: "Stewardship: leitura ampla e aprovação de solicitações de stewardship.",
  dataOwner: "Responsável de dados: leitura ampla e aprovação de solicitações de stewardship.",
};

export const helpContentMap: Record<string, DocContent> = {
  home: {
    id: "home",
    routePath: "/",
    title: "Resumo do Catálogo",
    intro:
      "Painel executivo para acompanhar cobertura do catálogo, saúde de dados e principais riscos operacionais. Use esta tela para priorizar investigação antes de entrar nas páginas analíticas.",
    sections: [
      {
        id: "overview-cards",
        title: "Visão geral",
        defaultOpen: true,
        bullets: [
          "Apresenta KPIs de cobertura (datasources, tabelas monitoradas) e saúde (DQ/Freshness).",
          "Os cards funcionam como atalhos para páginas de investigação (Explorer e Qualidade de dados).",
          "Ideal para acompanhamento diário e validação rápida após scans/runs de DQ.",
        ],
      },
      {
        id: "actions",
        title: "Ações possíveis",
        bullets: [
          "Clique em um card para navegar para a página correspondente já filtrada por contexto.",
          "Use a busca global do topo para localizar tabelas e metadados específicos.",
          "Abra o Explorer para validar colunas/descrições de uma tabela crítica.",
        ],
        links: [
          { label: "Explorer", href: "/explorer" },
          { label: "Qualidade de dados", href: "/data-quality" },
          { label: "Incidentes", href: "/incidents" },
        ],
      },
      {
        id: "components",
        title: "Componentes e interpretação",
        bullets: [
          "Cards de KPI: números absolutos + tendência (sparkline) para variação recente.",
          "DQ Health: gauge/anel com score médio; quanto maior, melhor.",
          "Freshness Health: percentual dentro do SLA; badges indicam fresh/warning/stale.",
          "Principais pendências: listas de tabelas com pior DQ e maior desatualização.",
        ],
      },
      {
        id: "permissoes",
        title: "Permissões",
        bullets: [
          commonPermissions.admin,
          commonPermissions.editor,
          commonPermissions.viewer,
          commonPermissions.stewardship,
          commonPermissions.dataOwner,
        ],
      },
      {
        id: "tips",
        title: "Dicas e boas práticas",
        variant: "tip",
        tips: [
          "Comece pelos itens em Principais pendências antes de analisar métricas completas.",
          "Use o horário do último run para diferenciar falha de pipeline vs. problema de qualidade.",
          "Compare DQ e Freshness juntos: score baixo com freshness ok costuma indicar regra/qualidade, não atraso.",
        ],
      },
    ],
  },
  search: {
    id: "search",
    routePath: "/search",
    title: "Busca global",
    intro:
      "Entrada principal da suíte para encontrar ativos, termos, owners, domínios, favoritos, tabelas críticas, ativos vistos recentemente, buscas recentes e contextos relacionados sem depender da árvore do Explorer.",
    sections: [
      {
        id: "search-when",
        title: "Quando usar",
        defaultOpen: true,
        bullets: [
          "Quando você já tem um nome, parte do nome ou um conceito e quer chegar ao módulo certo rapidamente.",
          "Quando precisa de uma porta de entrada única para Explorer, Data Quality, Incidentes, Linhagem ou Operações.",
          "Quando o objetivo é localizar o ativo antes de abrir o detalhe técnico ou a fila operacional.",
        ],
      },
      {
        id: "search-navigation",
        title: "Como navegar",
        bullets: [
          "Use a busca principal para digitar o termo e, em seguida, filtre o tipo de resultado quando necessário.",
          "Abra os resultados agrupados para seguir diretamente para o ativo, o ticket, a regra ou o contexto relacionado.",
          "Com a consulta vazia, a busca global exibe favoritos pessoais, tabelas críticas visíveis, ativos vistos recentemente, buscas recentes e ativos populares quando houver uso registrado.",
          "Use os atalhos da suíte para entrar rapidamente no Explorer, no Dashboard ou nas visões operacionais.",
        ],
        links: [
          { label: "Explorer", href: "/explorer" },
          { label: "Busca global", href: "/search" },
          { label: "Data Quality", href: "/data-quality" },
          { label: "Incidentes", href: "/incidents" },
          { label: "Linhagem", href: "/lineage" },
          { label: "Operações", href: "/ops/ingestion" },
        ],
      },
      {
        id: "search-reading",
        title: "Leitura dos resultados",
        bullets: [
          "Os resultados vêm agrupados por tipo para reduzir ambiguidade entre tabelas, colunas, termos, tags e owners.",
          "Cada cartão destaca relevância, badges e links complementares para reduzir a fricção da navegação.",
          "A busca é pensada como ponto de entrada, não como fim da análise; o próximo passo costuma ser Explorer, DQ, incidente ou lineage.",
        ],
      },
    ],
  },
  dashboard: {
    id: "dashboard",
    routePath: "/dashboard",
    title: "Cockpit executivo da plataforma",
    intro:
      "Leitura executiva da suíte de dados com saúde, maturidade, cobertura, adoção e risco por domínio. Use esta tela para entender o estado geral da plataforma e seguir para a fila detalhada quando precisar investigar um ativo específico.",
    sections: [
      {
        id: "dashboard-when",
        title: "Quando usar",
        defaultOpen: true,
        bullets: [
          "Quando a liderança precisa de uma visão única da maturidade e da saúde da plataforma.",
          "Quando você quer comparar domínios, cobertura e tendência sem entrar no detalhe técnico bruto.",
          "Quando o objetivo é decidir onde investir, priorizar correções e acompanhar a evolução da suíte.",
        ],
      },
      {
        id: "dashboard-navigation",
        title: "Como navegar",
        bullets: [
          "Use os blocos de saúde, cobertura, adoção e risco para abrir a análise de profundidade no módulo correspondente.",
          "Use a fila executiva detalhada abaixo do cockpit quando precisar investigar ativos, owners ou incidentes específicos.",
          "Use a leitura por janela de 7, 30 ou 90 dias para comparar comportamento recente e tendência histórica.",
          "Use os atalhos para Explorer, Data Quality, Incidentes, Linhagem e Operações para seguir do executivo ao operacional.",
        ],
        links: [
          { label: "Explorer", href: "/explorer" },
          { label: "Data Quality", href: "/data-quality" },
          { label: "Incidentes", href: "/incidents" },
          { label: "Linhagem", href: "/lineage" },
          { label: "Operações", href: "/ops/ingestion" },
        ],
      },
      {
        id: "dashboard-meaning",
        title: "Leitura dos blocos",
        bullets: [
          "Saúde geral: fórmula explicável combinando governança, qualidade, certificação, cobertura, adoção e penalidade por incidentes.",
          "Maturidade por domínio: comparação entre domínios com score agregado e sinais críticos.",
          "Adoção e cobertura: leitura de uso da plataforma, cobertura documental e concentração de risco.",
        ],
      },
    ],
  },
  governanceCollaboration: {
    id: "governance-collaboration",
    routePath: "/governance/collaboration",
    title: "Governança colaborativa",
    intro:
      "Centro para distribuir curadoria e responsabilidade entre áreas com tarefas, comentários, timeline e notificações internas. Use esta tela para solicitar revisão e acompanhar pendências sem depender de conversa paralela.",
    sections: [
      {
        id: "collaboration-when",
        title: "Quando usar",
        defaultOpen: true,
        bullets: [
          "Quando um ativo, incidente, regra DQ ou produto de dados precisa de revisão distribuída.",
          "Quando você quer registrar comentários, decisões e follow-ups de forma rastreável.",
          "Quando o objetivo é criar tarefas para owner, steward, qualidade ou domínio.",
        ],
      },
      {
        id: "collaboration-navigation",
        title: "Como navegar",
        bullets: [
          "Use a forma do topo para criar tarefa ou comentário com o tipo de entidade correto.",
          "Use a fila colaborativa para acompanhar status, prioridade e responsabilidade.",
          "Use a timeline para revisar eventos recentes de criação, comentário e mudança de status.",
        ],
        links: [
          { label: "Explorer", href: "/explorer" },
          { label: "Incidentes", href: "/incidents" },
          { label: "Data Quality", href: "/data-quality" },
          { label: "Domínios", href: "/governance/domains" },
          { label: "Produtos de dados", href: "/governance/data-products" },
        ],
      },
      {
        id: "collaboration-meaning",
        title: "Leitura dos blocos",
        bullets: [
          "Fila colaborativa: tarefas abertas, bloqueadas e concluídas com papel responsável.",
          "Responsabilidades: distribuição por owner, steward, qualidade e papéis semânticos.",
          "Timeline e comentários: histórico de decisões, observações e contexto compartilhado.",
        ],
      },
    ],
  },
  opsIngestion: {
    id: "ops-ingestion",
    routePath: "/ops/ingestion",
    title: "Visão geral operacional",
    intro:
      "Hub executivo da ingestão. Use esta tela para priorizar tabelas, entender cobertura operacional e decidir o que exige atenção antes de abrir o detalhe técnico do Airflow.",
    sections: [
      {
        id: "ops-ingestion-overview",
        title: "Quando usar",
        defaultOpen: true,
        bullets: [
          "Para entender quais tabelas estão sem pipeline, degradadas, sem sucesso recente ou críticas.",
          "Para priorizar filas operacionais e localizar falhas com impacto em dados e cobertura.",
          "Para buscar por tabela, schema, pipeline ou erro antes de abrir o diagnóstico técnico.",
        ],
      },
      {
        id: "ops-ingestion-actions",
        title: "Como navegar",
        bullets: [
          "Use o botão 'Abrir diagnóstico técnico' para ir ao Apache Airflow quando precisar de run, task ou retry.",
          "Use 'Abrir ativo' ou 'Histórico operacional' para voltar ao contexto do catálogo e da tabela.",
          "Quando houver DAG vinculada, o card da fila também oferece atalho para o Airflow.",
        ],
        links: [
          { label: "Apache Airflow", href: "/integrations/airflow" },
          { label: "Explorer", href: "/explorer" },
        ],
      },
      {
        id: "ops-ingestion-meaning",
        title: "Leitura dos blocos",
        bullets: [
          "KPIs gerais: cobertura, risco e volume de ativos sem detalhar a execução bruta.",
          "Filas operacionais: itens que pedem intervenção imediata ou investigação.",
          "Resumo operacional: leitura rápida de falhas, criticidade e ausência de sucesso recente.",
        ],
      },
    ],
  },
  integrationsHub: {
    id: "integrations-hub",
    routePath: "/integrations",
    title: "Hub operacional de integrações",
    intro:
      "Ponto de entrada das integrações da plataforma. Use esta página para abrir o diagnóstico técnico de Airflow e Metabase, administrar conexões de Data Lake, configurar agendamento de scans, executar inventários bronze/silver/gold, abrir o Explorer de Datalakes, revisar o detalhe de uma tabela com freshness, score de qualidade e governança mínima e acessar a área de API externa sem perder o contexto operacional.",
    sections: [
      {
        id: "integrations-when",
        title: "Quando usar",
        defaultOpen: true,
        bullets: [
          "Quando você quer uma visão única do estado das integrações e dos sinais de atenção.",
          "Quando precisa escolher entre diagnosticar Airflow, revisar Metabase, administrar Data Lake, abrir o Explorer de Datalakes, executar inventário do bucket, configurar um scan recorrente, abrir o detalhe de uma tabela ou acessar a API externa.",
          "Quando o objetivo é partir da integração e seguir para a superfície técnica correta.",
        ],
      },
      {
        id: "integrations-navigation",
        title: "Como navegar",
        bullets: [
          "Use os cards do topo para abrir a integração correspondente.",
          "Use o card de troubleshooting para identificar onde existe retry, falha ou risco operacional.",
          "Use a área de automações operacionais para registrar ações do tipo 'se condição, então ação'.",
          "Use a área de conectores preparados como referência para extensões futuras sem criar um caminho paralelo.",
        ],
        links: [
          { label: "Apache Airflow", href: "/integrations/airflow" },
          { label: "Metabase", href: "/integrations/metabase" },
          { label: "Data Lake", href: "/integrations/data-lake" },
          { label: "Datalakes", href: "/datalakes" },
          { label: "Automações", href: "/ops/automations" },
          { label: "API externa", href: "/integrations/api" },
        ],
      },
    ],
  },
  opsAutomations: {
    id: "ops-automations",
    routePath: "/ops/automations",
    title: "Automações operacionais",
    intro:
      "Motor operacional para configurar regras do tipo 'se condição, então ação', executar ações assistidas e acompanhar sugestões, execuções e falhas do processo automatizado.",
    sections: [
      {
        id: "automations-when",
        title: "Quando usar",
        defaultOpen: true,
        bullets: [
          "Quando você quer converter risco operacional, DQ ou falha de integração em ação controlada.",
          "Quando precisa executar ou sugerir uma ação sem sair da plataforma.",
          "Quando quer revisar o histórico de ações já disparadas pelo scheduler ou manualmente.",
        ],
      },
      {
        id: "automations-navigation",
        title: "Como navegar",
        bullets: [
          "Use a execução assistida para acionar uma ação com contexto explícito.",
          "Use o catálogo de ações para entender o que é executável e o que é apenas sugestão.",
          "Use as regras de automação para transformar sinais recorrentes em resposta automática.",
        ],
        links: [
          { label: "Visão geral operacional", href: "/ops/ingestion" },
          { label: "Incidentes", href: "/incidents" },
        ],
      },
      {
        id: "automations-meaning",
        title: "Leitura dos blocos",
        bullets: [
          "Execução assistida: ação manual com contexto preenchido pelo usuário.",
          "Regras de automação: condições, escopo, janela e ação associada.",
          "Histórico: execuções, sugestões, falhas e ações acionadas pelo scheduler.",
        ],
      },
    ],
  },
  integrationsAirflow: {
    id: "integrations-airflow",
    routePath: "/integrations/airflow",
    title: "Diagnóstico técnico do Airflow",
    intro:
      "Tela técnica de diagnóstico da integração com o Apache Airflow. Use esta página para investigar DAGs, runs, tasks, retries e falhas semânticas da orquestração.",
    sections: [
      {
        id: "airflow-diagnosis",
        title: "Quando usar",
        defaultOpen: true,
        bullets: [
          "Para validar se o orquestrador está saudável e se há falhas recentes de integração.",
          "Para inspecionar DAGs, execuções, tasks com erro e sinais de retries consecutivos.",
          "Para abrir o contexto técnico de uma DAG que apareceu como degradada na visão operacional.",
        ],
      },
      {
        id: "airflow-navigation",
        title: "Como navegar",
        bullets: [
          "Use 'Voltar para visão operacional' para retornar à cobertura de tabelas e risco.",
          "Use os botões de execução/task para abrir o Airflow com o contexto técnico correspondente.",
          "Quando a página vier filtrada por DAG, a lista prioriza runs e falhas desse ativo.",
        ],
        links: [
          { label: "Visão geral operacional", href: "/ops/ingestion" },
          { label: "Explorer", href: "/explorer" },
        ],
      },
      {
        id: "airflow-meaning",
        title: "Leitura dos blocos",
        bullets: [
          "Saúde da integração: status semântico, última checagem, última falha e falhas consecutivas.",
          "Runs recentes: execução, duração, run type, logical date e estado da DAG.",
          "Tasks com erro: task_id, operator, queue, retries e contexto de troubleshooting.",
        ],
      },
    ],
  },
  integrationsMetabase: {
    id: "integrations-metabase",
    routePath: "/integrations/metabase",
    title: "Integrações · Metabase",
    intro:
      "Tela de consumo analítico e dependências de dashboards no Metabase. Use esta página para ver estado de sincronização, cobertura e impacto de mudança sem sair do contexto de integrações.",
    sections: [
      {
        id: "metabase-when",
        title: "Quando usar",
        defaultOpen: true,
        bullets: [
          "Para revisar se o Metabase está sincronizado e qual foi a última checagem.",
          "Para entender cobertura de dashboards, questions e collections.",
          "Para avaliar dependências e impacto analítico de mudanças no catálogo.",
        ],
      },
      {
        id: "metabase-navigation",
        title: "Como navegar",
        bullets: [
          "Use o botão Voltar para retornar ao hub de integrações.",
          "Abra os links para voltar ao Explorer quando o impacto exigir investigação do ativo base.",
        ],
        links: [
          { label: "Hub de integrações", href: "/integrations" },
          { label: "Explorer", href: "/explorer" },
        ],
      },
    ],
  },
  integrationsApi: {
    id: "integrations-api",
    routePath: "/integrations/api",
    title: "Integrações · API externa",
    intro:
      "Área de administração das API keys externas. Use esta página para criar chaves, revisar permissões por ação, aplicar allowlist e preparar consumo programático da plataforma.",
    sections: [
      {
        id: "api-when",
        title: "Quando usar",
        defaultOpen: true,
        bullets: [
          "Para criar ou atualizar uma chave externa com escopos por domínio e ação.",
          "Para revisar a cobertura de leitura, escrita ou ações destrutivas por domínio.",
          "Para validar o contrato de consumo via X-API-Key e a paginação das rotas externas.",
        ],
      },
      {
        id: "api-navigation",
        title: "Como navegar",
        bullets: [
          "Use a navegação lateral do admin para localizar chaves e políticas disponíveis.",
          "Use o hub de integrações para voltar ao contexto operacional e abrir Airflow, Metabase ou Notificações externas quando o problema estiver fora da API.",
        ],
        links: [
          { label: "Hub de integrações", href: "/integrations" },
          { label: "Inbox", href: "/inbox" },
        ],
      },
    ],
  },
  explorer: {
    id: "explorer",
    routePath: "/explorer",
    title: "Explorer (Catálogo)",
    intro:
      "Navegação em árvore do catálogo para explorar fontes de dados, schemas, tabelas e colunas. É a principal tela para consulta de metadados, responsáveis, classificações, termos e linhagem, e também o ponto de saída para Data Quality, Incidentes e Governança.",
    sections: [
      {
        id: "explorer-search",
        title: "Busca e navegação",
        defaultOpen: true,
        bullets: [
          "A busca localiza schema, tabela e coluna por nome.",
          "Ao clicar em um resultado, a árvore é expandida automaticamente até o nó correspondente.",
          "Quando a busca está vazia, o Explorer mostra coleções compactas de Favoritos, Críticas, Vistos recentemente e Populares com base nos metadados e no uso real registrado.",
          "O botão Favoritar no cabeçalho do ativo fixa a tabela para acesso rápido pela busca global e pelo próprio Explorer.",
          "Use a árvore à esquerda para explorar manualmente quando não souber o nome completo.",
        ],
      },
      {
        id: "explorer-tree",
        title: "Árvore do catálogo",
        bullets: [
          "Estrutura: datasource → database → schema → tabela/view.",
          "Os dados são carregados sob demanda para manter a tela rápida.",
          "Ícones indicam tipo do nó (postgres/mysql/schema/table/view).",
        ],
      },
      {
        id: "explorer-details",
        title: "Painel de detalhes da tabela",
        bullets: [
          "O cabeçalho mostra a tabela selecionada, o tipo, o responsável, as classificações e os termos.",
          "O botão Favoritar é pessoal por usuário e não altera metadados de governança do ativo.",
          "Aba Colunas exibe tipo, PK, nulo e descrição por coluna.",
          "Aba Linhagem mostra fluxo origem → processamento → destino → consumos.",
          "Aba Classificações/Termos permite atribuição (admin/editor).",
          "Os atalhos do cabeçalho levam para timeline, lineage, qualidade, incidentes e stewardship quando a investigação exigir outro módulo.",
          "No resumo operacional, usuários com permissão podem abrir incidente, consultar logs da última execução, reexecutar profiling de DQ e reprocessar o scan da fonte quando houver contexto operacional suficiente.",
        ],
      },
      {
        id: "permissoes",
        title: "Permissões",
        bullets: [
          "Admin: leitura e edição completa (responsável, classificações, termos, linhagem).",
          "Editor: leitura e edição no Explorer (permitido).",
          "Stewardship e responsável de dados: leitura do catálogo e abertura de solicitações quando o fluxo exigir.",
          "Visualizador: somente leitura; botões de salvar/editar ficam ocultos ou desabilitados.",
        ],
      },
      {
        id: "tips",
        title: "Exemplos práticos",
        variant: "tip",
        tips: [
          "Pesquise por nome de coluna (ex.: 'cpf') para encontrar tabelas sensíveis rapidamente.",
          "Use o cabeçalho da tabela para validar o responsável e o contexto antes de editar tags e termos.",
          "Na aba Linhagem, cadastre upstream + Airflow + dashboards para documentar o fluxo completo.",
        ],
      },
    ],
  },
  datalakes: {
    id: "datalakes",
    routePath: "/datalakes",
    title: "Explorer de Datalakes",
    intro:
      "Navegação em árvore para ativos descobertos no Data Lake a partir do inventário persistido de S3/parquet. A tela segue a linguagem do Explorer do catálogo, mas organiza os ativos por conexão, bucket, camada e tabela.",
    sections: [
      {
        id: "datalakes-search",
        title: "Busca e filtros",
        defaultOpen: true,
        bullets: [
          "Use a busca compacta para localizar conexão, bucket, camada, tabela ou path base.",
          "Os filtros horizontais permitem restringir por camada, atualização, conexão, bucket, partições e presença de parquet.",
          "Filtros ativos aparecem como chips removíveis para manter a leitura limpa.",
        ],
      },
      {
        id: "datalakes-tree",
        title: "Árvore de ativos",
        bullets: [
          "Estrutura: conexão → bucket → camada → tabela.",
          "A árvore usa o inventário já persistido pelo scanner e não executa novo scan ao navegar.",
          "Cada tabela mostra sinais rápidos como Trust Score, partição, parquet e criticidade quando disponível.",
        ],
      },
      {
        id: "datalakes-detail",
        title: "Detalhe da tabela",
        bullets: [
          "O detalhe mostra resumo, arquivos, partições, estrutura, qualidade/freshness e timeline operacional.",
          "O Trust Score é calculado a partir dos sinais já existentes de completude, estrutura, freshness, integridade parquet e cobertura de metadados.",
          "Quando há problema detectado, a tela oferece ações diretas para abrir arquivos, qualidade ou revalidar a leitura.",
        ],
      },
      {
        id: "permissoes",
        title: "Permissões",
        bullets: [
          "Admin: acesso ao Explorer de Datalakes e ao detalhe operacional.",
          "Editor/Viewer: acesso bloqueado nesta área enquanto a governança de escopo do Data Lake não estiver expandida.",
        ],
      },
    ],
  },
  lineage: {
    id: "lineage",
    routePath: "/lineage",
    title: "Linhagem (consulta por tabela)",
    intro:
      "Tela de consulta visual de linhagem por nome da tabela. Use a busca por FQN para carregar o grafo sem precisar navegar pelo Explorer.",
    sections: [
      {
        id: "lineage-search",
        title: "Como pesquisar",
        defaultOpen: true,
        bullets: [
          "Digite o nome da tabela no formato schema.tabela (ex.: vendas.pagamento).",
          "Pressione Enter ou clique em Buscar.",
          "A URL é atualizada com ?table=... para facilitar compartilhamento e refresh.",
        ],
      },
      {
        id: "lineage-graph",
        title: "Como interpretar o grafo",
        bullets: [
          "Origens ficam à esquerda, processamento no centro, tabela destino à frente e dashboards à direita.",
          "Setas indicam direção do fluxo de dados.",
          "Cada nó mostra detalhes resumidos (db.schema.objeto, DAG/Task, dashboard/URL).",
        ],
      },
      {
        id: "states",
        title: "Estados e erros",
        bullets: [
          "Sem busca: mensagem orientando a pesquisar uma tabela.",
          "Sem resultado: 'Nenhuma linhagem encontrada para esta tabela'.",
          "Erro: falha sanitizada no carregamento (sem expor dados sensíveis).",
        ],
      },
      {
        id: "permissoes",
        title: "Permissões",
        bullets: [
          "Admin: visualização completa; edição de linhagem ocorre no Explorer.",
          "Editor: visualização completa; edição de linhagem ocorre no Explorer.",
          "Viewer: visualização apenas (read-only).",
        ],
        links: [{ label: "Explorer (editar linhagem)", href: "/explorer" }],
      },
    ],
  },
  datasources: {
    id: "datasources",
    routePath: "/datasources",
    title: "Fontes de dados",
    intro:
      "Gerencia conexões de origem (Postgres/MySQL), teste de conectividade, seleção de schemas no PostgreSQL e execução de scan do catálogo.",
    sections: [
      {
        id: "datasources-list",
        title: "Lista e status",
        defaultOpen: true,
        bullets: [
          "Mostra nome, tipo do banco, conexão e ações por datasource.",
          "Use editar para atualizar host/porta/schemas; excluir remove também dados relacionados.",
          "A lista é atualizada após criar/editar/excluir sem recarregar a página.",
          "O histórico recente de scans e as diferenças detectadas agora ficam concentrados nesta página.",
        ],
      },
      {
        id: "datasources-create",
        title: "Criar datasource",
        bullets: [
          "Selecione o tipo (Postgres/MySQL), preencha host/porta/database/user/senha.",
          "Use 'Test connection' antes de salvar para validar acesso.",
          "Para Postgres, use a seção de schemas detectados para incluir ou excluir schemas no scan.",
        ],
        fields: [
          { name: "Host", description: "Em Docker use 'postgres_db' em vez de 'localhost'." },
          { name: "Schemas para catalogar", description: "A inclusão define o scan e a exclusão prevalece; se nenhum schema ficar incluído, a interface alerta antes de salvar." },
        ],
      },
      {
        id: "permissoes",
        title: "Permissões",
        bullets: [
          "Admin: acesso total.",
          "Editor: sem acesso a esta página (menu oculto e rota bloqueada).",
          "Visualizador: sem acesso a esta página (rota bloqueada).",
          "Stewardship e responsável de dados: acesso apenas de leitura.",
        ],
      },
      {
        id: "tips",
        title: "Erros comuns",
        variant: "warning",
        tips: [
          "Falha de conexão usando localhost em Docker: use 'postgres_db'.",
          "Usuário sem permissão no banco: valide credenciais e grants.",
          "Schema ausente após scan: confira include_schemas/exclude_schemas.",
        ],
      },
    ],
  },
  dataQuality: {
    id: "data-quality",
    routePath: "/data-quality",
    title: "Qualidade de dados",
    intro:
      "Observabilidade e qualidade por tabela com métricas, histórico e análise visual. Use para diagnosticar problemas de completude, volume, duplicidade e freshness.",
    sections: [
      {
        id: "dq-tree",
        title: "Seleção de tabela",
        defaultOpen: true,
        bullets: [
          "A árvore à esquerda segue a mesma lógica do Explorer.",
          "Selecione uma tabela para carregar o último profiling e histórico.",
          "Se não houver runs, a tela mostra empty state até executar profiling.",
        ],
      },
      {
        id: "dq-overview",
        title: "Overview de métricas",
        bullets: [
          "Cards exibem DQ Score, Completeness, Freshness e Volume.",
          "Sparklines mostram tendência dos últimos runs.",
          "Use os status (OK/Warning/Critical) para priorizar investigação.",
        ],
      },
      {
        id: "dq-heatmap",
        title: "Column Quality / Heatmap",
        bullets: [
          "Cada tile representa uma coluna e sua criticidade (ex.: null_pct).",
          "Passe o mouse para ver métricas resumidas (null%, distinct, min/max).",
          "Clique para abrir detalhes/histórico da coluna (quando disponível).",
        ],
      },
      {
        id: "permissoes",
        title: "Permissões",
        bullets: [
          "Admin: pode rodar profiling e gerenciar regras.",
          "Editor: pode consultar métricas e operar regras (exceto áreas bloqueadas gerais).",
          "Viewer: sem acesso à página Qualidade de dados.",
        ],
      },
      {
        id: "links",
        title: "Atalhos relacionados",
        links: [
          { label: "Regras de DQ", href: "/data-quality/rules" },
          { label: "Incidentes", href: "/incidents" },
          { label: "Explorer", href: "/explorer" },
        ],
      },
    ],
  },
  dqRules: {
    id: "dq-rules",
    routePath: "/data-quality/rules",
    title: "Qualidade de dados · Regras",
    intro:
      "Cadastro e execução de regras visuais por tabela. Falhas podem gerar incidentes automaticamente conforme severidade.",
    sections: [
      {
        id: "dq-rules-filters",
        title: "Filtros e busca",
        defaultOpen: true,
        bullets: [
          "Filtre por tabela, severidade, ativa/inativa, último status e texto.",
          "Use filtros para localizar regras críticas que geram incidentes.",
          "A listagem é ideal para operação diária do time de qualidade.",
        ],
      },
      {
        id: "dq-rules-create",
        title: "Criar / editar regra",
        bullets: [
          "Informe nome, tabela alvo, severidade, tipo e condições estruturadas no builder visual.",
          "Use 'Testar estrutura' para validar metadados e estrutura antes de enviar a execução ao cluster Spark.",
          "Defina is_active para controlar se a regra participa das execuções.",
        ],
      },
      {
        id: "dq-rules-list",
        title: "Execução e histórico",
        bullets: [
          "Cada linha mostra status do último run, violações e incidente associado.",
          "Falhas críticas/altas podem abrir ou atualizar incidente automaticamente.",
          "Use excluir com confirmação para remover regras obsoletas.",
        ],
      },
      {
        id: "permissoes",
        title: "Permissões",
        bullets: [
          "Admin: acesso total.",
          "Editor: pode criar/editar/executar/excluir regras.",
          "Viewer: sem acesso à página.",
        ],
      },
    ],
  },
  incidents: {
    id: "incidents",
    routePath: "/incidents",
    title: "Incidentes",
    intro:
      "Centro operacional de incidentes de dados. Centraliza triagem, severidade, SLA, responsáveis, timeline, causa raiz e postmortem.",
    sections: [
      {
        id: "incidents-summary",
        title: "Central de triagem",
        defaultOpen: true,
        bullets: [
          "A tela inicial agrega KPIs, filas por status, domínio, responsável e SLA.",
          "Os blocos de fila priorizam ativos mais impactados e incidentes recorrentes.",
          "Use esta visão para decidir o que investigar agora antes de entrar no ticket.",
        ],
      },
      {
        id: "incidents-filters",
        title: "Filtros",
        bullets: [
          "Filtre por status, severidade, tipo de entidade, responsável, domínio, SLA, período e busca textual.",
          "O painel de filtros é colapsável e mantém filtros aplicados.",
          "Os chips mostram filtros ativos e permitem limpeza rápida.",
        ],
      },
      {
        id: "incidents-list",
        title: "Lista e edição",
        bullets: [
          "Clique em um ticket para abrir o drawer de detalhe com timeline, causa raiz e postmortem.",
          "Tickets de DQ podem ter badge de origem e link para a regra.",
          "A edição inclui status, severidade, responsável, domínio, time, SLA e contexto operacional.",
        ],
      },
      {
        id: "permissoes",
        title: "Permissões",
        bullets: [
            "Admin: gerencia qualquer incidente.",
            "Editor: pode criar, listar e editar se for responsável ou solicitante, conforme o backend.",
            "Viewer: sem acesso à página.",
        ],
      },
    ],
  },
  audit: {
    id: "audit",
    routePath: "/audit",
    title: "Log de auditoria",
    intro:
      "Rastreia alterações e ações importantes do sistema para governança e troubleshooting. Use para entender quem alterou o quê e quando.",
    sections: [
      {
        id: "audit-list",
        title: "Como usar",
        defaultOpen: true,
        bullets: [
          "Consulte eventos recentes ordenados do mais novo para o mais antigo.",
          "Use para validar mudanças manuais em tabelas, tags, termos, linhagem e datasources.",
          "Cruze com Incidentes para montar linha do tempo de investigação.",
        ],
      },
      {
        id: "permissoes",
        title: "Permissões",
        bullets: [
          "Admin: acesso total.",
          "Editor: sem acesso (rota bloqueada).",
          "Viewer: sem acesso (rota bloqueada).",
        ],
      },
    ],
  },
  admin: {
    id: "admin",
    routePath: "/admin/users",
    title: "Administrador",
    intro:
      "Área de gestão de usuários, roles e permissões. Todas as ações aqui impactam controle de acesso do sistema.",
    sections: [
      {
        id: "admin-users",
        title: "Usuários",
        defaultOpen: true,
        bullets: [
          "Crie, edite e desative usuários.",
          "Associe roles para controlar acesso por perfil.",
          "Evite excluir o próprio usuário logado sem confirmação forte.",
        ],
      },
      {
        id: "admin-roles",
        title: "Roles e permissões",
        bullets: [
          "Crie roles customizadas e associe permissões.",
          "Roles padrão (admin/viewer) costumam ser protegidas contra exclusão.",
          "Use descrições claras para facilitar governança.",
        ],
      },
      {
        id: "permissoes",
        title: "Permissões",
        bullets: [
          "Admin: acesso total.",
          "Editor: sem acesso à área de Administração.",
          "Viewer: sem acesso à área de Administração.",
        ],
      },
    ],
  },
  profile: {
    id: "profile",
    routePath: "/me/profile",
    title: "Meu Perfil",
    intro:
      "Área pessoal para consultar dados da conta, permissões efetivas, preferências e trocar a senha do usuário autenticado.",
    sections: [
      {
        id: "profile-overview",
        title: "Dados da conta",
        defaultOpen: true,
        bullets: [
          "Exibe nome, e-mail, perfil e permissões efetivas.",
          "Use esta seção para validar o role após mudanças em Administração.",
        ],
      },
      {
        id: "profile-notifications",
        title: "Notificações",
        bullets: [
          "A inbox operacional agora fica em uma página própria.",
          "Abra a página de Inbox para revisar notificações, marcar lidas/não lidas e navegar para o contexto.",
        ],
        links: [{ label: "Inbox", href: "/inbox" }],
      },
      {
        id: "profile-password",
        title: "Trocar senha",
        bullets: [
          "Informe senha atual, nova senha e confirmação.",
          "A alteração afeta somente o usuário autenticado.",
        ],
      },
      {
        id: "permissoes",
        title: "Permissões",
        bullets: [
          "Admin: permitido.",
          "Editor: permitido.",
          "Viewer: permitido.",
        ],
      },
    ],
  },
  inbox: {
    id: "inbox",
    routePath: "/inbox",
    title: "Inbox / Notificações",
    intro:
      "Centro de notificações do produto para acompanhar sinais operacionais e de governança, revisar itens não lidos e agir no contexto certo.",
    sections: [
      {
        id: "inbox-summary",
        title: "Visão geral",
        defaultOpen: true,
        bullets: [
          "Use os cards do topo para acompanhar o total, as não lidas e os itens em entrega.",
          "A lista prioriza notificações não lidas e mantém a leitura executiva limpa.",
        ],
      },
      {
        id: "inbox-filters",
        title: "Filtros e ações",
        bullets: [
          "Filtre entre Todas, Não lidas, Lidas e Arquivadas.",
          "Cada item pode ser marcado como lido ou não lido.",
          "Quando houver link contextual, use a ação 'Abrir contexto'.",
        ],
      },
      {
        id: "permissoes",
        title: "Permissões",
        bullets: [
          "Admin: permitido.",
          "Editor: permitido.",
          "Viewer: permitido.",
        ],
      },
    ],
  },
  default: {
    id: "default",
    title: "Ajuda",
    intro: "Documentação contextual desta tela ainda não foi configurada. Use o menu lateral para navegar para módulos com ajuda detalhada.",
    sections: [
      {
        id: "fallback",
        title: "O que você pode fazer aqui",
        defaultOpen: true,
        bullets: [
          "Use a busca global no topo para localizar objetos do catálogo.",
          "Abra o Explorer para navegar por schemas e tabelas.",
          "Acesse Meu Perfil para trocar senha e preferências.",
        ],
        links: [
          { label: "Resumo", href: "/" },
          { label: "Explorer", href: "/explorer" },
          { label: "Meu Perfil", href: "/me/profile" },
        ],
      },
    ],
  },
};

export const routeDocs: RouteDocEntry[] = [
  { match: (pathname) => pathname === "/", doc: helpContentMap.home },
  { match: (pathname) => pathname.startsWith("/search"), doc: helpContentMap.search },
  { match: (pathname) => pathname.startsWith("/dashboard"), doc: helpContentMap.dashboard },
  { match: (pathname) => pathname.startsWith("/governance/collaboration"), doc: helpContentMap.governanceCollaboration },
  { match: (pathname) => pathname.startsWith("/ops/ingestion"), doc: helpContentMap.opsIngestion },
  { match: (pathname) => pathname.startsWith("/ops/automations"), doc: helpContentMap.opsAutomations },
  { match: (pathname) => pathname.startsWith("/integrations/airflow"), doc: helpContentMap.integrationsAirflow },
  { match: (pathname) => pathname.startsWith("/integrations/metabase"), doc: helpContentMap.integrationsMetabase },
  { match: (pathname) => pathname.startsWith("/integrations/api"), doc: helpContentMap.integrationsApi },
  { match: (pathname) => pathname === "/integrations", doc: helpContentMap.integrationsHub },
  { match: (pathname) => pathname.startsWith("/datalakes"), doc: helpContentMap.datalakes },
  { match: (pathname) => pathname.startsWith("/explorer") || pathname.startsWith("/tables/"), doc: helpContentMap.explorer },
  { match: (pathname) => pathname.startsWith("/lineage"), doc: helpContentMap.lineage },
  { match: (pathname) => pathname.startsWith("/datasources"), doc: helpContentMap.datasources },
  { match: (pathname) => pathname.startsWith("/data-quality/rules"), doc: helpContentMap.dqRules },
  { match: (pathname) => pathname.startsWith("/data-quality"), doc: helpContentMap.dataQuality },
  { match: (pathname) => pathname.startsWith("/incidents"), doc: helpContentMap.incidents },
  { match: (pathname) => pathname.startsWith("/audit"), doc: helpContentMap.audit },
  { match: (pathname) => pathname.startsWith("/admin"), doc: helpContentMap.admin },
  { match: (pathname) => pathname.startsWith("/inbox"), doc: helpContentMap.inbox },
  { match: (pathname) => pathname.startsWith("/me/profile"), doc: helpContentMap.profile },
];
