/**
 * Central registry of plain-language screen descriptions, used by <PageIntro id="..." />.
 *
 * Each entry explains, for the end user (including non-technical users):
 *  - description: what the screen is for (always visible).
 *  - howTo: the basic flow to use it.
 *  - watch: what indicators/alerts deserve attention.
 *  - actions: the main buttons/actions available.
 *
 * Keep texts short and friendly — avoid clutter.
 */
export type PageIntroContent = {
  title?: string;
  description: string;
  howTo?: string[];
  watch?: string[];
  actions?: string[];
};

export const PAGE_INTROS: Record<string, PageIntroContent> = {
  // ---------------------------------------------------------------- Home / Dashboard
  dashboard: {
    title: "Painel executivo",
    description:
      "Visão geral da saúde do catálogo de dados: cobertura, qualidade, certificação, privacidade e atividade da plataforma em um só lugar.",
    howTo: [
      "Use os filtros de Data Source, Schema e período para focar a análise.",
      "Clique nos cards e gráficos para abrir os detalhes do indicador.",
    ],
    watch: [
      "Quedas em qualidade, certificação ou cobertura de owners.",
      "Picos de incidentes ou pendências em aberto.",
    ],
    actions: ["Filtrar período/fonte", "Abrir detalhes do indicador", "Exportar visão"],
  },
  "dashboard.strategy": {
    title: "Estratégia de dados",
    description:
      "Acompanhe metas e a evolução estratégica do catálogo ao longo do tempo, conectando indicadores a objetivos do negócio.",
    howTo: ["Selecione o período e a meta desejada.", "Compare o realizado com o objetivo."],
    watch: ["Metas estagnadas ou em queda.", "Áreas sem progresso recente."],
    actions: ["Selecionar meta", "Ajustar período", "Abrir detalhes"],
  },

  // ---------------------------------------------------------------- Explorer / busca
  explorer: {
    title: "Explorer",
    description:
      "Explore os ativos de dados do catálogo (tabelas, colunas, schemas) e entenda o que existe, onde está e quem é responsável.",
    howTo: [
      "Navegue pela árvore por Data Source › Schema › Tabela ou use a busca.",
      "Abra um ativo para ver descrição, colunas, qualidade, owner e linhagem.",
    ],
    watch: ["Tabelas sem descrição, sem owner ou com baixa qualidade.", "Dados sensíveis mascarados."],
    actions: ["Buscar ativo", "Abrir detalhes", "Ver linhagem", "Favoritar"],
  },
  "explorer.data-journey": {
    title: "Jornada do dado",
    description:
      "Acompanhe o caminho do dado entre as camadas (bronze, silver, gold) e entenda como ele é transformado até o consumo.",
    howTo: ["Selecione o ativo de origem.", "Siga a jornada entre as etapas/camadas."],
    watch: ["Etapas com falha, atraso ou sem responsável."],
    actions: ["Selecionar ativo", "Abrir etapa", "Ver linhagem"],
  },
  search: {
    title: "Busca",
    description:
      "Encontre rapidamente tabelas, colunas, termos de negócio e produtos de dados em todo o catálogo.",
    howTo: ["Digite o que procura.", "Use os filtros para refinar e abra o resultado desejado."],
    watch: ["Resultados sem descrição ou sem owner."],
    actions: ["Buscar", "Filtrar", "Abrir resultado", "Favoritar"],
  },

  // ---------------------------------------------------------------- Datalakes
  datalakes: {
    title: "Datalakes",
    description:
      "Catálogo dos dados armazenados no datalake (S3), organizados por camadas bronze, silver e gold, com frescor e estrutura dos arquivos.",
    howTo: [
      "Escolha a conexão e navegue pelas camadas e tabelas.",
      "Abra uma tabela para ver colunas, arquivos e frescor (atualização).",
    ],
    watch: ["Tabelas desatualizadas (frescor fora do SLA).", "Camadas sem dados ou com falha de leitura."],
    actions: ["Selecionar conexão", "Abrir tabela", "Ver arquivos", "Escanear inventário"],
  },
  "daily-use": {
    title: "Uso diário",
    description:
      "Ponto de partida para o dia a dia: atalhos para os ativos e ações que você mais usa no catálogo.",
    howTo: ["Acesse os atalhos e favoritos.", "Abra o ativo ou a tela que precisa."],
    watch: ["Pendências atribuídas a você."],
    actions: ["Abrir favorito", "Ir para o ativo", "Ver pendências"],
  },
  "daily-use.datalakes": {
    title: "Datalakes (uso diário)",
    description:
      "Acesso simplificado às tabelas do datalake para consulta rápida no dia a dia.",
    howTo: ["Busque ou navegue pela tabela.", "Abra os detalhes para ver estrutura e frescor."],
    watch: ["Tabelas desatualizadas."],
    actions: ["Buscar tabela", "Abrir detalhes"],
  },

  // ---------------------------------------------------------------- Data Quality
  "data-quality": {
    title: "Data Quality",
    description:
      "Acompanhe a qualidade dos dados: regras aplicadas, resultados das verificações e onde estão os principais problemas.",
    howTo: [
      "Filtre por Data Source, Schema ou tabela.",
      "Abra um resultado para ver a regra, a evidência e o histórico.",
    ],
    watch: ["Regras falhando, quedas de score e tabelas críticas sem regras."],
    actions: ["Filtrar", "Abrir resultado", "Criar/editar regra", "Executar verificação"],
  },
  "data-quality.rules": {
    title: "Regras de Data Quality",
    description:
      "Crie e gerencie as regras que validam seus dados (completude, unicidade, validade, acurácia e reconciliação).",
    howTo: [
      "Escolha a tabela/coluna e o tipo de regra.",
      "Defina os parâmetros, salve e acompanhe os resultados.",
    ],
    watch: ["Tabelas críticas sem regras.", "Regras desativadas ou sempre falhando."],
    actions: ["Criar regra", "Editar/ativar", "Testar/validar", "Executar (admin)"],
  },
  "data-quality.observability": {
    title: "Observabilidade de Data Quality",
    description:
      "Acompanhe a evolução da qualidade ao longo do tempo e detecte anomalias e tendências nos indicadores.",
    howTo: ["Selecione o período e o ativo.", "Compare o histórico e abra as evidências."],
    watch: ["Quedas bruscas, anomalias e regras recorrentemente falhas."],
    actions: ["Filtrar período", "Abrir histórico", "Ver evidências"],
  },
  "data-quality.profiling-executions": {
    title: "Execuções de Profiling",
    description:
      "Veja o perfil estatístico dos dados (volumes, nulos, distribuições) gerado pelas execuções de profiling. A primeira execução de cada tabela é completa (full); as seguintes são incrementais (delta), lendo apenas o que mudou desde a última execução com sucesso.",
    howTo: ["Selecione a tabela e a execução.", "Analise as estatísticas por coluna.", "Confira o selo Full/Delta para saber o que foi lido.", "Para tabelas grandes, defina uma data inicial em 'Início do profiling'."],
    watch: ["Aumento de nulos, mudanças de distribuição e quedas de volume.", "Tabelas sem coluna de data/hora rodam sempre full."],
    actions: ["Selecionar execução", "Ver perfil por coluna", "Executar profiling (admin)"],
  },

  // ---------------------------------------------------------------- Certificação
  certification: {
    title: "Certificação",
    description:
      "Acompanhe quais ativos estão prontos para certificação, quais possuem bloqueios e o que é necessário para aumentar a confiabilidade do catálogo.",
    howTo: [
      "Use os filtros de Data Source, Schema, Domínio ou Status para refinar.",
      "Abra os detalhes de cada ativo para entender bloqueios e priorizar correções.",
    ],
    watch: [
      "Ativos sem owner, sem descrição ou com colunas pouco documentadas.",
      "Incidentes críticos ou baixa qualidade de dados.",
    ],
    actions: ["Filtrar pendências", "Abrir detalhes", "Revisar critérios", "Exportar pendências"],
  },

  // ---------------------------------------------------------------- Privacidade & Acesso
  "privacy-access": {
    title: "Privacidade & Acesso",
    description:
      "Gerencie a classificação de dados pessoais/sensíveis e as políticas de acesso, apoiando a conformidade (ex.: LGPD).",
    howTo: [
      "Filtre por Data Source/Schema e abra um ativo.",
      "Revise a classificação de privacidade e registre revisões periódicas.",
    ],
    watch: ["Colunas com dados pessoais sem classificação.", "Revisões periódicas vencidas."],
    actions: ["Classificar privacidade", "Registrar revisão", "Filtrar", "Abrir detalhes"],
  },

  // ---------------------------------------------------------------- Owners / Governança
  "data-owners": {
    title: "Owners de Dados",
    description:
      "Veja e gerencie quem é responsável por cada ativo, garantindo que os dados tenham donos claros para governança e operação.",
    howTo: ["Filtre por área/Data Source.", "Atribua ou reatribua owners aos ativos."],
    watch: ["Ativos sem owner.", "Owners sobrecarregados ou inativos."],
    actions: ["Atribuir owner", "Reatribuir ativos", "Filtrar", "Exportar"],
  },
  governance: {
    title: "Governança",
    description:
      "Central de governança do catálogo: domínios, produtos de dados, dicionário, stewardship e ações de qualidade e conformidade.",
    howTo: ["Escolha a área de governança no submenu.", "Acompanhe pendências e execute as ações."],
    watch: ["Pendências acumuladas e ativos sem responsável."],
    actions: ["Abrir área", "Resolver pendências", "Exportar"],
  },
  "governance.domains": {
    title: "Domínios",
    description:
      "Organize os dados por domínios de negócio, facilitando a navegação, a responsabilidade e a governança por área.",
    howTo: ["Crie ou selecione um domínio.", "Associe ativos e defina responsáveis."],
    watch: ["Domínios sem owner ou sem ativos associados."],
    actions: ["Criar domínio", "Associar ativos", "Abrir detalhes"],
  },
  "governance.data-products": {
    title: "Produtos de Dados",
    description:
      "Gerencie produtos de dados — conjuntos curados e prontos para consumo — com responsáveis, contratos e qualidade associados.",
    howTo: ["Crie ou abra um produto de dados.", "Associe ativos, owners e contratos."],
    watch: ["Produtos sem owner, sem contrato ou com qualidade baixa."],
    actions: ["Criar produto", "Editar", "Associar ativos", "Abrir detalhes"],
  },
  "governance.dictionary": {
    title: "Dicionário de Dados",
    description:
      "Padronize descrições de tabelas e colunas para que todos entendam o significado dos dados.",
    howTo: ["Filtre por ativo.", "Edite descrições ou importe em massa via planilha."],
    watch: ["Colunas sem descrição ou com descrição genérica."],
    actions: ["Editar descrição", "Importar/Exportar planilha", "Filtrar"],
  },
  "governance.stewardship": {
    title: "Stewardship",
    description:
      "Acompanhe e execute as tarefas de curadoria de dados atribuídas aos stewards para melhorar o catálogo.",
    howTo: ["Veja as tarefas atribuídas.", "Trate cada pendência e registre a conclusão."],
    watch: ["Tarefas atrasadas ou sem responsável."],
    actions: ["Abrir tarefa", "Concluir", "Filtrar"],
  },
  "governance.timeline": {
    title: "Linha do tempo de Governança",
    description:
      "Veja o histórico de eventos de governança, qualidade e operação de um ativo em ordem cronológica.",
    howTo: ["Selecione o ativo ou o filtro global.", "Percorra os eventos no tempo."],
    watch: ["Sequências de falhas ou mudanças sensíveis recentes."],
    actions: ["Filtrar", "Abrir evento"],
  },
  "governance.classification-review": {
    title: "Revisão de Classificação",
    description:
      "Revise e confirme a classificação de sensibilidade dos dados, mantendo a conformidade em dia.",
    howTo: ["Abra os itens pendentes de revisão.", "Confirme ou ajuste a classificação."],
    watch: ["Itens pendentes há muito tempo.", "Dados sensíveis sem revisão."],
    actions: ["Revisar", "Aprovar/ajustar", "Filtrar"],
  },
  "governance.pending-center": {
    title: "Central de Pendências",
    description:
      "Reúne em um só lugar as pendências de governança (owner, descrição, certificação, privacidade) para você priorizar.",
    howTo: ["Filtre por tipo de pendência.", "Abra e resolva ou encaminhe ao responsável."],
    watch: ["Pendências críticas e mais antigas."],
    actions: ["Filtrar", "Resolver", "Atribuir responsável"],
  },
  "governance.collaboration": {
    title: "Colaboração",
    description:
      "Comentários e tarefas vinculados aos ativos, para a equipe colaborar diretamente no contexto do dado.",
    howTo: ["Abra o ativo e veja comentários/tarefas.", "Responda ou crie novas tarefas."],
    watch: ["Tarefas em aberto e comentários sem resposta."],
    actions: ["Comentar", "Criar tarefa", "Concluir tarefa"],
  },
  "governance.change-management": {
    title: "Gestão de Mudanças",
    description:
      "Registre SLAs e conduza solicitações de mudança (owner, classificação, descrição, privacidade, SLA) pelo fluxo rascunho → revisão → aprovação → aplicação, com trilha auditável.",
    howTo: [
      "Selecione o ativo e crie a solicitação de mudança.",
      "Avance pelo fluxo (revisar, aprovar, aplicar) conforme sua permissão.",
    ],
    watch: ["Solicitações paradas em revisão/aprovação e SLAs vencendo."],
    actions: ["Criar solicitação", "Revisar/Aprovar/Aplicar", "Abrir no Explorer"],
  },
  "governance.intelligence": {
    title: "Inteligência de Governança",
    description:
      "Resumo executivo com sinais ao vivo da plataforma (jobs, pendências e adoção) reunidos para reduzir a troca de contexto entre telas.",
    howTo: [
      "Leia os indicadores de saúde (jobs, pendências, sinais, adoção).",
      "Use os atalhos para abrir o hub correspondente e investigar.",
    ],
    watch: ["Pendências em aberto, trust em risco e jobs com falha."],
    actions: ["Abrir hub relacionado", "Ir para pendências", "Ver cockpit operacional"],
  },

  // ---------------------------------------------------------------- Glossário / Tags / Lineage
  glossary: {
    title: "Glossário de Negócio",
    description:
      "Defina e padronize os termos de negócio da organização, conectando-os aos dados do catálogo.",
    howTo: ["Crie ou edite um termo.", "Associe o termo às tabelas/colunas relacionadas."],
    watch: ["Termos sem dono ou sem ativos associados."],
    actions: ["Criar termo", "Associar ativos", "Importar/Exportar"],
  },
  tags: {
    title: "Tags",
    description:
      "Classifique ativos com tags para facilitar busca, organização e governança por temas.",
    howTo: ["Crie tags e aplique aos ativos.", "Filtre o catálogo por tag."],
    watch: ["Tags duplicadas ou sem uso."],
    actions: ["Criar tag", "Aplicar", "Filtrar"],
  },
  lineage: {
    title: "Linhagem",
    description:
      "Visualize a origem e o destino dos dados (de onde vêm e para onde vão), entendendo dependências e impactos.",
    howTo: ["Selecione um ativo.", "Navegue pelo grafo de origem/destino."],
    watch: ["Dependências quebradas ou ativos órfãos."],
    actions: ["Selecionar ativo", "Expandir grafo", "Abrir detalhes"],
  },

  // ---------------------------------------------------------------- Incidentes / Inbox
  incidents: {
    title: "Incidentes",
    description:
      "Acompanhe e trate incidentes de dados (falhas de qualidade, pipeline ou frescor) até a resolução.",
    howTo: ["Filtre por severidade/status.", "Abra o incidente para ver causa e evidências."],
    watch: ["Incidentes críticos (sev1) e sem responsável."],
    actions: ["Abrir incidente", "Atribuir", "Atualizar status"],
  },
  "incidents.tickets": {
    title: "Tickets de Incidentes",
    description:
      "Gerencie os chamados relacionados a incidentes, com filtros avançados e acompanhamento de status.",
    howTo: ["Use os filtros para localizar o ticket.", "Abra e atualize o andamento."],
    watch: ["Tickets parados ou vencidos."],
    actions: ["Filtrar", "Abrir ticket", "Atualizar"],
  },
  inbox: {
    title: "Inbox",
    description:
      "Suas notificações e pendências pessoais reunidas em um só lugar para você não perder nada importante.",
    howTo: ["Veja as mensagens não lidas.", "Abra cada item e tome a ação indicada."],
    watch: ["Pendências atribuídas a você e alertas críticos."],
    actions: ["Abrir item", "Marcar como lido", "Ir para o ativo"],
  },

  // ---------------------------------------------------------------- Data Sources / Integrações / API Keys
  datasources: {
    title: "Data Sources",
    description:
      "Cadastre e gerencie as conexões com os bancos e fontes de dados que o catálogo lê e monitora.",
    howTo: [
      "Cadastre a conexão e teste antes de salvar.",
      "Execute o scan para catalogar schemas e tabelas (ação de admin).",
    ],
    watch: ["Conexões com falha no último teste.", "Scans com erro ou desatualizados."],
    actions: ["Criar conexão", "Testar", "Executar scan (admin)", "Editar"],
  },
  "integrations.data-sources": {
    title: "Data Sources",
    description:
      "Cadastre e gerencie as conexões com os bancos e fontes de dados que o catálogo lê e monitora.",
    howTo: [
      "Cadastre a conexão e teste antes de salvar.",
      "Execute o scan para catalogar schemas e tabelas (ação de admin).",
    ],
    watch: ["Conexões com falha no último teste.", "Scans com erro ou desatualizados."],
    actions: ["Criar conexão", "Testar", "Executar scan (admin)", "Editar"],
  },
  "scan-runs": {
    title: "Execuções de Scan",
    description:
      "Acompanhe as execuções de scan das fontes de dados e veja o que foi descoberto ou alterado em cada rodada.",
    howTo: ["Selecione a execução.", "Veja as diferenças (diffs) detectadas."],
    watch: ["Scans com falha ou presos na fila.", "Mudanças inesperadas de estrutura."],
    actions: ["Abrir execução", "Ver diffs", "Reexecutar (admin)"],
  },

  // ---------------------------------------------------------------- Ops
  "ops.cockpit": {
    title: "Ops Cockpit",
    description:
      "Painel operacional da plataforma: saúde dos jobs, schedulers, workers e integrações em tempo quase real.",
    howTo: ["Acompanhe os indicadores operacionais.", "Abra um job/alerta para investigar."],
    watch: ["Jobs falhando, workers offline e filas paradas."],
    actions: ["Abrir job", "Ver alertas", "Atualizar"],
  },
  "ops.ingestion": {
    title: "Ingestão",
    description:
      "Acompanhe os processos de ingestão de dados (pipelines/Airflow) e o status de cada execução.",
    howTo: ["Filtre por pipeline/período.", "Abra a execução para ver logs e status."],
    watch: ["Execuções com falha ou atraso."],
    actions: ["Filtrar", "Abrir execução", "Ver logs"],
  },
  "ops.automations": {
    title: "Automações",
    description:
      "Configure e acompanhe automações da plataforma que disparam ações com base em regras e eventos.",
    howTo: ["Crie/edite uma regra de automação.", "Acompanhe as execuções e resultados."],
    watch: ["Automações desativadas ou falhando."],
    actions: ["Criar regra", "Executar (admin)", "Ver histórico"],
  },

  // ---------------------------------------------------------------- Admin
  audit: {
    title: "Auditoria",
    description:
      "Trilha de auditoria de todas as ações sensíveis: quem fez o quê, quando e em qual ativo.",
    howTo: ["Filtre por usuário, ação, módulo ou período.", "Abra o evento para ver antes/depois."],
    watch: ["Tentativas negadas e mudanças sensíveis."],
    actions: ["Filtrar", "Abrir evento", "Exportar (permissão)"],
  },
  "admin.users": {
    title: "Usuários",
    description:
      "Gerencie os usuários da plataforma: criação, papéis, ativação e redefinições de acesso.",
    howTo: ["Busque o usuário.", "Edite papéis e status conforme a política."],
    watch: ["Usuários inativos com acesso ativo.", "Papéis com privilégio excessivo."],
    actions: ["Criar usuário", "Editar papéis", "Ativar/Desativar"],
  },
  "admin.roles": {
    title: "Papéis",
    description:
      "Defina os papéis (perfis) e o que cada um pode fazer na plataforma.",
    howTo: ["Crie/edite um papel.", "Associe as permissões adequadas."],
    watch: ["Papéis com permissões amplas demais."],
    actions: ["Criar papel", "Editar permissões"],
  },
  "admin.permissions": {
    title: "Permissões",
    description:
      "Gerencie as permissões disponíveis e veja como elas se relacionam com os papéis.",
    howTo: ["Revise as permissões existentes.", "Associe-as aos papéis."],
    watch: ["Permissões sensíveis concedidas em excesso."],
    actions: ["Editar", "Associar a papéis"],
  },
  "admin.access": {
    title: "Controle de Acesso",
    description:
      "Gerencie grupos e escopos de acesso a dados, controlando quem vê o quê no catálogo.",
    howTo: ["Crie grupos e defina escopos.", "Associe usuários e ativos."],
    watch: ["Escopos amplos demais.", "Usuários com acesso indevido a dados sensíveis."],
    actions: ["Criar grupo", "Definir escopo", "Associar usuários"],
  },
  "admin.api-keys": {
    title: "API Keys",
    description:
      "Crie e gerencie chaves de API para integrações externas, com escopos, expiração e restrição por IP.",
    howTo: [
      "Crie a chave definindo escopos, validade e IPs permitidos.",
      "Copie a chave no momento da criação (ela não é exibida novamente).",
    ],
    watch: ["Chaves sem expiração, com escopo amplo ou sem uso.", "Tentativas de uso negadas."],
    actions: ["Criar chave", "Rotacionar", "Revogar", "Ver uso/auditoria"],
  },
  "admin.governance": {
    title: "Configurações de Governança",
    description:
      "Parâmetros centrais que regem toda a plataforma: prazos de revisão e certificação, retenção de logs, pesos do score de governança, regras de stewardship, política operacional de Data Quality e corte da API legada. O que você muda aqui afeta SLAs, limpezas automáticas, notificações e a priorização de ativos em todas as telas.",
    howTo: [
      "Escolha a subárea no topo: Políticas e SLA, Retenção, API legada ou Visibilidade.",
      "Ajuste cada parâmetro — os campos mostram a unidade (dias, horas, linhas, pts) e um texto explicando o efeito.",
      "Salve: as mudanças passam a valer nos próximos ciclos de governança e de limpeza/retention.",
    ],
    watch: [
      "Prazos de revisão longos demais enfraquecem a cobrança de owners, privacidade e certificação.",
      "Retenção curta demais apaga a trilha de auditoria/acesso antes do exigido por conformidade.",
      "Pesos do score desbalanceados distorcem a priorização e os rankings de governança.",
    ],
    actions: ["Ajustar prazos/SLA", "Definir retenção", "Calibrar pesos do score", "Salvar"],
  },
  "me.profile": {
    title: "Meu Perfil",
    description:
      "Gerencie seus dados de acesso: senha, autenticação em duas etapas (MFA) e preferências.",
    howTo: ["Atualize senha ou ative o MFA.", "Ajuste suas preferências."],
    watch: ["MFA desativado.", "Senha antiga ou fraca."],
    actions: ["Trocar senha", "Ativar/Desativar MFA", "Encerrar sessões"],
  },
};

export default PAGE_INTROS;
