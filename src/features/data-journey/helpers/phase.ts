import type { CanonicalAssetContext } from "@/features/explorer/types";

import type { JourneyPhaseKey } from "../types";

export function phaseTitle(key: JourneyPhaseKey): string {
  switch (key) {
    case "identity":
      return "Identidade";
    case "governance":
      return "Governança";
    case "dataQuality":
      return "Data Quality";
    case "dqRules":
      return "Regras de DQ";
    case "certification":
      return "Certificação";
    case "privacy":
      return "Privacidade";
    case "incidents":
      return "Incidentes";
    case "ingestion":
      return "Ingestão";
    case "lineage":
      return "Linhagem";
    case "consumption":
      return "Consumo analítico";
    case "dataLake":
      return "Data Lake";
    case "actions":
      return "Ações";
    default:
      return key;
  }
}

export function phaseLinks(tableId: number | null, canonical: CanonicalAssetContext | null) {
  return {
    explorer: tableId ? `/explorer?tableId=${tableId}` : canonical?.links.explorer || "/explorer",
    dataQuality: tableId ? `/data-quality?tableId=${tableId}` : canonical?.links.data_quality || "/data-quality",
    dqRules: tableId ? `/data-quality/rules?tableId=${tableId}` : "/data-quality/rules",
    incidents: tableId ? `/incidents/tickets?tableId=${tableId}` : canonical?.links.incidents || "/incidents/tickets",
    lineage: tableId ? `/lineage?tableId=${tableId}` : canonical?.links.lineage || "/lineage",
    certification: tableId ? `/certification?tableId=${tableId}` : canonical?.links.certification || "/certification",
    privacy: tableId ? `/privacy-access?tableId=${tableId}` : canonical?.links.privacy || "/privacy-access",
    metabase: canonical?.links.metabase_consumption || "/integrations/metabase",
    dataLake: "/integrations/data-lake",
    ingestion:
      canonical?.source.schema_name && canonical?.table_name
        ? `/ops/ingestion?schema=${encodeURIComponent(canonical.source.schema_name)}&table=${encodeURIComponent(canonical.table_name)}`
        : "/ops/ingestion",
  };
}

export function phaseDescription(key: JourneyPhaseKey): string {
  switch (key) {
    case "identity":
      return "Mostra o que a tabela representa, como ela está documentada e se os sinais básicos parecem coerentes.";
    case "governance":
      return "Mostra responsáveis, contexto de negócio, vocabulário e pendências mínimas de administração.";
    case "dataQuality":
      return "Resume score, execução, cobertura de regras e sinais de risco da qualidade.";
    case "dqRules":
      return "Mostra as regras cadastradas, suas violações, severidade e recorrência.";
    case "certification":
      return "Mostra se o ativo já atende aos critérios mínimos para ser tratado como confiável.";
    case "privacy":
      return "Resume classificação de sensibilidade, base legal, acesso e revisão.";
    case "incidents":
      return "Concentra chamados, criticidade, recorrência e histórico operacional.";
    case "ingestion":
      return "Mostra o pipeline, a atualização operacional e os sinais de atraso ou sucesso.";
    case "lineage":
      return "Expõe origem, dependências e impacto de mudanças no ativo.";
    case "consumption":
      return "Aponta dashboards, questions e coleções que usam ou parecem usar a tabela.";
    case "dataLake":
      return "Mostra se a tabela também tem trilha física inventariada no Data Lake.";
    case "actions":
      return "Lista os próximos passos priorizados para melhorar confiança, governança e operação.";
    default:
      return "";
  }
}
