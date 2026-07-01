import { presentStatus, presentText, UX_COPY } from "@/lib/presentation/status-copy";
import type { TableStewardshipRequest } from "@/features/explorer/types";
import { formatDateTime, freshnessLabel } from "@/features/explorer/utils";

import type { JourneyPhaseKey, JourneySummaryState, JourneyTone } from "../types";

import { dqRuleHasFailure } from "./dq";
import {
  certificationStatusLabel,
  certificationTone,
  getToneForStatus,
  ingestionHealthLabel,
  isClosedIncidentStatus,
  isOpenIncidentStatus,
  isWithinDays,
  statusLabelFromSeverity,
} from "./tone";

export function latestStewardshipRequest(requests: TableStewardshipRequest[]): TableStewardshipRequest | null {
  if (!requests.length) return null;
  return [...requests].sort((left, right) => {
    const leftTime = Date.parse(left.created_at || "");
    const rightTime = Date.parse(right.created_at || "");
    if (Number.isNaN(leftTime) || Number.isNaN(rightTime)) return 0;
    return rightTime - leftTime;
  })[0] ?? null;
}

export function governanceEffectiveSignals(summary: JourneySummaryState) {
  const detail = summary.tableDetail;
  const canonical = summary.canonical;
  const correlation = summary.correlation;
  const stewardshipRequests = summary.stewardshipRequests ?? [];
  const semanticProduct = summary.semanticProduct;

  const ownerDefined = Boolean(canonical?.owner.owner_defined || canonical?.owner.owner_name || canonical?.owner.owner_email || detail?.owner || detail?.data_owner);
  const ownerName = canonical?.owner.owner_name || detail?.owner || detail?.data_owner?.name || null;
  const ownerEmail = canonical?.owner.owner_email || detail?.owner_email || detail?.data_owner?.email || null;
  const tags = canonical?.tags ?? [];
  const terms = canonical?.terms ?? [];
  const tagsCount = canonical?.classification.tags_count ?? tags.length ?? 0;
  const termsCount = canonical?.classification.terms_count ?? terms.length ?? 0;
  const effectiveCertificationStatus = canonical?.classification.certification_status || detail?.certification_status || null;
  const effectiveCertificationLabel = canonical?.classification.certification_status_label || certificationStatusLabel(effectiveCertificationStatus);
  const persistedCertificationLabel = certificationStatusLabel(detail?.certification_status);
  const criticalityLabel =
    correlation?.operational_context?.criticality_label ||
    detail?.certification_criticality ||
    canonical?.classification.certification_criticality ||
    UX_COPY.notDefined;
  const productName = semanticProduct?.name || null;
  const productHref = semanticProduct?.slug ? `/governance/data-products/${semanticProduct.slug}` : "/governance/data-products";
  const stewardshipOpenCount = stewardshipRequests.filter((request) => ["open", "in_progress", "blocked"].includes(request.status)).length;
  const latestRequest = latestStewardshipRequest(stewardshipRequests);
  const certificationValid = effectiveCertificationStatus === "certified";
  const domainConfirmed = Boolean(semanticProduct?.domain_name);
  const stewardDefined = Boolean(latestRequest?.approver?.name || latestRequest?.requested_by?.name);
  const signals = [
    ownerDefined,
    stewardDefined,
    domainConfirmed,
    Boolean(productName),
    tagsCount > 0,
    termsCount > 0,
    certificationValid,
    stewardshipOpenCount === 0,
  ];

  return {
    ownerDefined,
    ownerName,
    ownerEmail,
    tags,
    terms,
    tagsCount,
    termsCount,
    effectiveCertificationStatus,
    effectiveCertificationLabel,
    persistedCertificationLabel,
    criticalityLabel,
    productName,
    productHref,
    certificationValid,
    domainConfirmed,
    stewardDefined,
    stewardshipRequests,
    stewardshipOpenCount,
    latestRequest,
    signalsMet: signals.filter(Boolean).length,
    signalsTotal: signals.length,
  };
}

export function buildPhaseStatus({
  key,
  summary,
}: {
  key: JourneyPhaseKey;
  summary: JourneySummaryState;
}): { label: string; tone: JourneyTone; metric: string; description: string } {
  const detail = summary.tableDetail;
  const canonical = summary.canonical;
  const correlation = summary.correlation;
  const dq = summary.dq;
  const metabase = summary.metabase;
  const dataLake = summary.dataLake;
  const hasCoreData = Boolean(detail || canonical || correlation || dq || metabase || dataLake);

  if (!hasCoreData) return { label: "A confirmar", tone: "neutral", metric: "—", description: "Selecione um ativo para carregar a leitura consolidada." };

  switch (key) {
    case "identity":
      {
        const columns = canonical?.columns ?? [];
        const totalColumns = columns.length;
        const documentedColumns = columns.filter((column) => column.description_complete).length;
        const tagsCount = canonical?.classification.tags_count ?? canonical?.tags.length ?? 0;
        const termsCount = canonical?.classification.terms_count ?? canonical?.terms.length ?? 0;
        const hasDescription = Boolean((detail?.description_manual || detail?.description_source || "").trim());
        const hasOwner = canonical?.owner.owner_defined ?? Boolean(detail?.owner || detail?.data_owner);
        const hasStructure = totalColumns > 0;
        const hasSemanticContext = tagsCount > 0 || termsCount > 0 || Boolean(canonical?.classification.governance_label);
        const missingSignals = Number(!hasOwner) + Number(!hasDescription) + Number(!hasStructure) + Number(documentedColumns === 0) + Number(!hasSemanticContext);
        return {
          label:
            missingSignals === 0
              ? "Completa"
              : missingSignals >= 3
                ? "Pendente"
                : "Parcial",
          tone:
            missingSignals === 0
              ? "success"
              : missingSignals >= 3
                ? "danger"
                : "warning",
          metric: hasStructure ? `${totalColumns} colunas` : "Estrutura a confirmar",
          description:
            hasDescription
              ? hasStructure
                ? "Descrição, estrutura e metadados básicos ajudam a identificar o ativo."
                : "Descrição disponível, mas ainda faltam sinais estruturais."
              : "O ativo ainda precisa de descrição, estrutura ou contexto semântico para ficar claro.",
        };
    }
    case "governance": {
      const governance = governanceEffectiveSignals(summary);
      const missingPieces = governance.signalsTotal - governance.signalsMet;
      const requiresRevalidation = governance.effectiveCertificationStatus === "revalidation_pending";
      return {
        label:
          missingPieces === 0
            ? "Governança completa"
            : requiresRevalidation
              ? "Governança parcial · requer revalidação"
              : "Governança parcial",
        tone: missingPieces === 0 ? "success" : "warning",
        metric: `${governance.signalsMet}/${governance.signalsTotal} sinais`,
        description:
          governance.ownerDefined && governance.productName && governance.tagsCount > 0 && governance.termsCount > 0
            ? requiresRevalidation
              ? "O ativo possui owner, tags, glossário e produto de dados associado, mas a certificação efetiva ainda pede revalidação."
              : "O ativo possui owner, tags, glossário e produto de dados associado."
            : "Base de governança existente, mas ainda requer validação para consumo confiável.",
      };
    }
    case "dataQuality": {
      const rules = summary.dqRules ?? [];
      const failedRules = rules.filter((rule) => dqRuleHasFailure(rule)).length;
      const criticalRules = rules.filter((rule) => statusLabelFromSeverity(rule.severity) === "danger").length;
      const score = dq?.effective_dq_score ?? dq?.dq_score ?? canonical?.evidence.dq_score ?? null;
      const hasExecution = Boolean(dq?.run_at || rules.some((rule) => rule.last_run_at));
      const label =
        rules.length === 0
          ? "Cobertura pendente"
          : !hasExecution
            ? "Nunca executado"
            : failedRules > 0
              ? criticalRules > 0
                ? "Falha crítica"
                : "Atenção"
              : score !== null && score < 60
                ? "Falha"
                : score !== null && score < 80
                  ? "Atenção"
                  : "Saudável";
      const tone =
        rules.length === 0
          ? "neutral"
          : !hasExecution
            ? "warning"
            : failedRules > 0
              ? "danger"
              : score !== null && score < 60
                ? "danger"
                : score !== null && score < 80
                  ? "warning"
                  : "success";
      return {
        label,
        tone,
        metric: score === null ? UX_COPY.toConfirm : `${Math.round(score)}%`,
        description:
          rules.length === 0
            ? "Ainda não existem regras ativas para validar a qualidade desta tabela."
            : !hasExecution
              ? "Há regras cadastradas, mas ainda não houve execução recente para confirmar o resultado."
              : failedRules > 0
                ? `${failedRules} regra(s) ativas com ${rules.reduce((sum, rule) => sum + Math.max(0, rule.last_violations_count || 0), 0)} violação(ões).`
                : "Regras ativas sem falha na última execução.",
      };
    }
    case "dqRules": {
      const rules = summary.dqRules ?? [];
      const failedRules = rules.filter((rule) => dqRuleHasFailure(rule)).length;
      const criticalRules = rules.filter((rule) => statusLabelFromSeverity(rule.severity) === "danger").length;
      const tone = criticalRules > 0 ? "danger" : failedRules > 0 ? "warning" : rules.length > 0 ? "success" : "neutral";
      return {
        label: rules.length > 0 ? (failedRules > 0 ? "Com falhas" : "Ativas") : "Cobertura pendente",
        tone,
        metric: `${rules.length} regra(s)`,
        description:
          rules.length > 0
            ? criticalRules > 0
              ? "Há regras críticas que merecem atenção antes do consumo."
              : failedRules > 0
                ? "Algumas regras falharam no último ciclo conhecido."
                : "As regras principais estão sendo monitoradas."
            : "Esta tabela ainda não possui regras de Data Quality cadastradas.",
      };
    }
    case "certification": {
      const status = detail?.certification_status || canonical?.classification.certification_status || (correlation?.operational_context?.eligible_for_certification ? "eligible" : "unknown");
      const tone = certificationTone(status);
      const label = certificationStatusLabel(status);
      return {
        label,
        tone,
        metric: canonical ? `${Math.round(canonical.classification.readiness_score)}% de prontidão` : presentText(detail?.certification_criticality, "Prontidão a confirmar"),
        description:
          status === "certified"
            ? "O ativo atende aos critérios atuais de certificação e pode ser tratado como fonte confiável."
            : status === "eligible"
              ? "O ativo atende aos critérios mínimos e pode entrar em revisão de certificação."
              : status === "revalidation_pending"
                ? "O ativo já teve certificação, mas precisa de nova validação operacional antes de ser tratado como confiável."
                : status === "rejected"
                  ? "A certificação foi recusada e há pendências a corrigir."
                  : status === "not_eligible"
                    ? "Este ativo ainda não atende aos critérios mínimos para certificação. Revise os bloqueios abaixo antes de solicitar ou aprovar a certificação."
                    : "O ativo ainda não tem sinais suficientes para certificação.",
      };
    }
    case "privacy": {
      const sensitivityLevel = detail?.sensitivity_level || canonical?.classification.sensitivity_level || null;
      const normalizedLevel = (sensitivityLevel || "").trim().toLowerCase();
      const classified = Boolean(normalizedLevel && normalizedLevel !== "unclassified" && normalizedLevel !== "unknown");
      const sensitive = detail?.has_sensitive_personal_data ?? canonical?.classification.has_sensitive_personal_data ?? false;
      const personal = detail?.has_personal_data ?? canonical?.classification.has_personal_data ?? false;
      const tone = sensitive ? "danger" : !classified ? "warning" : personal ? "warning" : "success";
      return {
        label: sensitive ? "Sensível" : classified ? "Classificada" : "Não classificada",
        tone,
        metric: classified ? sensitivityLevel || "Classificada" : "Sem nível",
        description: sensitive
          ? "Há sinal de dado sensível e a revisão de privacidade merece atenção."
          : !classified
            ? "A classificação formal ainda não foi concluída. Isso não significa automaticamente que o ativo seja de baixo risco."
            : personal
              ? "Há dado pessoal classificado e controlado no catálogo."
              : "O ativo foi classificado e não possui dado pessoal identificado.",
      };
    }
    case "incidents": {
      const incidents = correlation?.incidents.items ?? [];
      const openCount = correlation?.incidents.open_count ?? canonical?.evidence.open_incidents ?? 0;
      const criticalCount = correlation?.incidents.critical_open_count ?? canonical?.evidence.critical_open_incidents ?? 0;
      const recurringCount = correlation?.operational_sla?.recurrent_degradation
        ? 1
        : incidents.filter((incident, index, array) => {
            const sourceType = incident.source_type || "";
            return sourceType && array.filter((item) => item.source_type === sourceType).length > 1 && index === array.findIndex((item) => item.source_type === sourceType);
          }).length;
      const closedRecentCount = incidents.filter((incident) => isClosedIncidentStatus(incident.status) && isWithinDays(incident.last_seen_at || incident.detected_at, 30)).length;
      let label = "Sem incidentes";
      let tone: JourneyTone = "success";
      if (criticalCount > 0) {
        label = "Crítico";
        tone = "danger";
      } else if (openCount > 0) {
        label = "Atenção";
        tone = "warning";
      } else if (recurringCount > 0) {
        label = "Atenção";
        tone = "warning";
      } else if (closedRecentCount > 0) {
        label = "Resolvido recentemente";
        tone = "accent";
      } else if (incidents.length === 0) {
        label = "Sem incidentes";
        tone = "success";
      } else {
        label = UX_COPY.noHistory;
        tone = "neutral";
      }
      return {
        label,
        tone,
        metric: `${openCount} em aberto`,
        description:
          criticalCount > 0
            ? "Há incidente crítico aberto. Priorize investigação e mitigação."
            : openCount > 0
              ? "Existem chamados abertos que podem afetar a confiança ou operação deste ativo."
              : recurringCount > 0
                ? "Há sinais recorrentes de incidentes ou degradação operacional."
                : closedRecentCount > 0
                  ? "Não há chamados abertos, mas existem incidentes fechados no histórico recente."
                  : incidents.length > 0
                    ? "Há histórico operacional, mas nenhum incidente aberto no momento."
                    : "Nenhum chamado ativo ou histórico relevante foi encontrado para este ativo.",
      };
    }
    case "ingestion": {
      const primaryPipeline = canonical?.pipeline?.primary_pipeline ?? null;
      const state = correlation?.ingestion?.state || canonical?.pipeline?.state || primaryPipeline?.latest_status || null;
      const freshnessSeconds = correlation?.dq?.freshness_seconds ?? canonical?.evidence.freshness_seconds ?? null;
      const health = ingestionHealthLabel({
        linked: Boolean(correlation?.ingestion?.linked || canonical?.pipeline?.linked || primaryPipeline),
        state,
        lastSuccessAt: primaryPipeline?.last_success_at || correlation?.stability?.points?.find((point) => point.success)?.occurred_at || null,
        freshnessSeconds,
        operationalSlaStatus: correlation?.operational_sla?.status_label || correlation?.operational_sla?.status || null,
      });
      return {
        label: health.label,
        tone: health.tone,
        metric: freshnessSeconds !== null ? freshnessLabel(freshnessSeconds) : primaryPipeline?.last_success_at ? formatDateTime(primaryPipeline.last_success_at) : "Freshness a confirmar",
        description:
          health.detail ||
          (canonical?.pipeline?.linked || correlation?.ingestion?.linked
            ? "O ativo possui rastros operacionais de atualização e estabilidade."
            : "Não há pipeline vinculado ou o sinal operacional ainda não foi identificado."),
      };
    }
    case "lineage": {
      const lineage = canonical?.lineage;
      const upstream = lineage?.upstream.length ?? 0;
      const downstream = lineage?.downstream.length ?? 0;
      const processCount = lineage?.related_processes.length ?? 0;
      const dashboardCount = lineage?.related_dashboards.length ?? 0;
      const impact = (lineage?.impact?.impact_level || "low").toLowerCase();
      const impactLabel = impact.includes("high") ? "Alto" : impact.includes("medium") ? "Médio" : impact.includes("low") ? "Baixo" : presentStatus(impact, UX_COPY.notAvailable);
      const relationStatus =
        upstream === 0 && downstream === 0
          ? "Sem linhagem"
          : upstream > 0 && downstream === 0
            ? "Linhagem parcial"
            : "Com linhagem";
      const tone = impact.includes("high")
        ? "warning"
        : upstream === 0 && downstream === 0
          ? "neutral"
          : upstream > 0 && downstream === 0
            ? "accent"
            : "success";
      const summary =
        upstream > 0 && downstream === 0
          ? "Este ativo possui origem mapeada, mas ainda não há consumidores downstream identificados. O impacto atual parece baixo, mas a linhagem pode estar incompleta."
          : upstream > 0 && downstream > 0
            ? "Este ativo possui origem e consumidores downstream identificados."
            : "Nenhuma relação de linhagem foi registrada para este ativo.";
      return {
        label: relationStatus,
        tone,
        metric: `${upstream} upstream · ${downstream} downstream${processCount ? ` · ${processCount} processos` : ""}`,
        description: `${summary} Dashboards impactados: ${dashboardCount}. Impacto estimado: ${impactLabel}.`,
      };
    }
    case "consumption": {
      const dashboards = metabase?.dashboards_count ?? 0;
      const questions = metabase?.questions_count ?? 0;
      const collections = metabase?.collections_count ?? 0;
      const confirmed = metabase?.confirmed_count ?? 0;
      const partial = metabase?.partial_count ?? 0;
      const total = dashboards + questions + collections;
      const label = total === 0 ? "Sem consumo" : confirmed > 0 ? "Com consumo" : partial > 0 ? "Consumo parcial" : "Consumo não confirmado";
      return {
        label,
        tone: total > 0 ? (confirmed > 0 ? "success" : "warning") : "neutral",
        metric: `${total} artefatos`,
        description:
          total > 0
            ? confirmed > 0
              ? "Artefatos analíticos com vínculo confirmado foram encontrados no Metabase."
              : "Foram encontrados artefatos do Metabase relacionados, mas os vínculos ainda são parciais."
            : "Nenhum dashboard, question ou coleção foi associado a este ativo.",
      };
    }
    case "dataLake": {
      if (!dataLake) {
        return {
          label: "Sem vínculo",
          tone: "neutral",
          metric: UX_COPY.noLink,
          description: "Ainda não foi identificado vínculo físico deste ativo com o Data Lake.",
        };
      }
      const freshness = dataLake.freshness_age_hours;
      const stale = freshness !== null && freshness > 48;
      const attention = freshness !== null && freshness > 24;
      const tone = stale ? "warning" : attention ? "warning" : dataLake.freshness_status ? getToneForStatus(dataLake.freshness_status) : "success";
      return {
        label: stale ? "Freshness atrasado" : attention ? "Com atenção" : dataLake.freshness_status ? "Inventariado" : "Relacionado",
        tone,
        metric: dataLake.quality_score === null ? "Qualidade indisponível" : `${Math.round(dataLake.quality_score)}% de qualidade`,
        description:
          dataLake.prefix || dataLake.bucket
            ? `Bucket ${dataLake.bucket} · ${dataLake.prefix || "sem prefixo"}`
            : "Há trilha física inventariada para este ativo no Data Lake.",
      };
    }
    case "actions": {
      const recommended = buildRecommendedActions(summary);
      return {
        label: recommended.length > 0 ? "Ações sugeridas" : "Sem ações urgentes",
        tone: recommended.length > 0 ? "warning" : "neutral",
        metric: `${recommended.length} ação(ões)`,
        description: recommended.length > 0 ? "Há pendências reais priorizadas a partir dos sinais do ativo." : "Nenhuma pendência relevante foi identificada para este ativo no momento.",
      };
    }
  }
}

export function buildOverallStatus(summary: JourneySummaryState): { label: string; tone: JourneyTone; detail: string } {
  const canonical = summary.canonical;
  const correlation = summary.correlation;
  const detail = summary.tableDetail;
  const dq = summary.dq;

  const ownerDefined = Boolean(canonical?.owner.owner_defined || canonical?.owner.owner_name || canonical?.owner.owner_email || detail?.owner || detail?.data_owner);
  const criticalIncidents = correlation?.incidents.critical_open_count ?? canonical?.evidence.critical_open_incidents ?? 0;
  const openIncidents = correlation?.incidents.open_count ?? canonical?.evidence.open_incidents ?? 0;
  const dqScore = dq?.effective_dq_score ?? dq?.dq_score ?? canonical?.evidence.dq_score ?? null;
  const ingestionStale = correlation?.stability?.currently_stale || canonical?.pipeline?.stability?.currently_stale || false;
  const privacySensitive = detail?.has_sensitive_personal_data ?? canonical?.classification.has_sensitive_personal_data ?? false;
  const privacyReviewDue = detail?.privacy_reviewed_at ? false : privacySensitive;
  const hasEnoughSignals = Boolean(canonical || correlation || detail);

  if (!hasEnoughSignals) return { label: "A confirmar", tone: "neutral", detail: "Ainda não há sinais suficientes para resumir o ativo." };
  if (criticalIncidents > 0 || ingestionStale || (dqScore !== null && dqScore < 50) || privacyReviewDue) {
    return {
      label: "Ação imediata",
      tone: "danger",
      detail: "Há sinais críticos de operação, qualidade ou privacidade que merecem ação imediata.",
    };
  }
  const certificationStatus = detail?.certification_status || canonical?.classification.certification_status || null;
  if (
    !ownerDefined ||
    openIncidents > 0 ||
    (dqScore !== null && dqScore < 80) ||
    certificationStatus === "revalidation_pending" ||
    certificationStatus === "rejected" ||
    certificationStatus === "expired" ||
    certificationStatus === "not_eligible"
  ) {
    return {
      label: "Requer atenção",
      tone: "warning",
      detail: "Algum ponto de governança, certificação, qualidade ou operação ainda pede revisão.",
    };
  }
  return {
    label: "Pronto para demonstrar",
    tone: "success",
    detail: "Owner, qualidade, certificação e operação estão coerentes para o contexto carregado.",
  };
}

export function buildRecommendedActions(summary: JourneySummaryState): Array<{ label: string; description: string; href: string; tone: JourneyTone }> {
  const canonical = summary.canonical;
  const detail = summary.tableDetail;
  const correlation = summary.correlation;
  const dq = summary.dq;
  const metabase = summary.metabase;
  const tableId = detail?.id ?? canonical?.table_id ?? correlation?.table_id ?? null;
  const schema = canonical?.source.schema_name;
  const tableName = canonical?.table_name || summary.locator?.table_name || null;
  const actions: Array<{ label: string; description: string; href: string; tone: JourneyTone }> = [];
  const ownerDefined = canonical?.owner.owner_defined ?? Boolean(detail?.owner || detail?.data_owner);
  const certificationStatus = detail?.certification_status || canonical?.classification.certification_status || null;
  const effectiveCertificationStatus = certificationStatus || (correlation?.operational_context?.eligible_for_certification ? "eligible" : null);
  const sensitivityLevel = detail?.sensitivity_level || canonical?.classification.sensitivity_level || null;
  const classified = Boolean(sensitivityLevel && !/^(unclassified|unknown)$/i.test(sensitivityLevel));
  const hasPersonalData = detail?.has_personal_data ?? canonical?.classification.has_personal_data ?? false;
  const hasSensitiveData = detail?.has_sensitive_personal_data ?? canonical?.classification.has_sensitive_personal_data ?? false;
  const dqRules = summary.dqRules ?? [];
  const dqScore = dq?.effective_dq_score ?? dq?.dq_score ?? canonical?.evidence.dq_score ?? null;
  const failedRules =
    dqRules.length > 0
      ? dqRules.filter((rule) => dqRuleHasFailure(rule)).length
      : dq?.failed_rules ?? canonical?.evidence.active_dq_rule_names.length ?? 0;
  const ingestionHealth = ingestionHealthLabel({
    linked: Boolean(correlation?.ingestion?.linked || canonical?.pipeline?.linked || canonical?.pipeline?.primary_pipeline),
    state: correlation?.ingestion?.state || canonical?.pipeline?.state || canonical?.pipeline?.primary_pipeline?.latest_status || null,
    lastSuccessAt: canonical?.pipeline?.primary_pipeline?.last_success_at || correlation?.stability?.points?.find((point) => point.success)?.occurred_at || null,
    freshnessSeconds: correlation?.dq?.freshness_seconds ?? canonical?.evidence.freshness_seconds ?? null,
    operationalSlaStatus: correlation?.operational_sla?.status_label || correlation?.operational_sla?.status || null,
  });
  const freshnessSeconds = correlation?.dq?.freshness_seconds ?? canonical?.evidence.freshness_seconds ?? null;
  const freshnessStale = freshnessSeconds !== null && freshnessSeconds >= 30 * 24 * 60 * 60;
  const metabaseConfirmed = metabase?.confirmed_count ?? 0;
  const metabasePartial = metabase?.partial_count ?? 0;
  const upstreamCount = canonical?.lineage?.upstream.length ?? 0;
  const downstreamCount = canonical?.lineage?.downstream.length ?? 0;
  const openIncidents = correlation?.incidents.open_count ?? canonical?.evidence.open_incidents ?? 0;
  const criticalIncidents = correlation?.incidents.critical_open_count ?? canonical?.evidence.critical_open_incidents ?? 0;
  const pushUniqueAction = (action: { label: string; description: string; href: string; tone: JourneyTone }) => {
    if (actions.some((existing) => existing.label === action.label || existing.href === action.href)) return;
    actions.push(action);
  };

  if (!ownerDefined) {
    pushUniqueAction({
      label: "Definir owner",
      description: "O ativo ainda não tem responsável claramente definido no catálogo.",
      href: "/data-owners",
      tone: "warning",
    });
  }

  if (effectiveCertificationStatus === "revalidation_pending") {
    pushUniqueAction({
      label: "Revalidar certificação",
      description: "A certificação já existe, mas precisa de nova validação operacional.",
      href: tableId ? `/certification?tableId=${tableId}` : "/certification",
      tone: "warning",
    });
  } else if (effectiveCertificationStatus === "not_eligible") {
    pushUniqueAction({
      label: "Preparar para certificação",
      description: "O ativo ainda não atende aos critérios mínimos de prontidão para seguir ao fluxo formal.",
      href: tableId ? `/certification?tableId=${tableId}` : "/certification",
      tone: "warning",
    });
  } else if (effectiveCertificationStatus === "eligible") {
    pushUniqueAction({
      label: "Iniciar revisão de certificação",
      description: "O ativo já está elegível para seguir na revisão formal.",
      href: tableId ? `/certification?tableId=${tableId}` : "/certification",
      tone: "accent",
    });
  }

  if (dqRules.length === 0) {
    pushUniqueAction({
      label: "Criar regras de Data Quality",
      description: "A tabela ainda não possui regras cadastradas para validar expectativas.",
      href: tableId ? `/data-quality?tableId=${tableId}` : "/data-quality",
      tone: "warning",
    });
  } else if (failedRules > 0 || (dqScore !== null && dqScore < 90)) {
    pushUniqueAction({
      label: "Revisar Data Quality",
      description: failedRules > 0 ? "Há regras com falha no último ciclo conhecido." : "O score de qualidade ainda pede revisão.",
      href: tableId ? `/data-quality?tableId=${tableId}` : "/data-quality",
      tone: "danger",
    });
  }

  if (!classified) {
    pushUniqueAction({
      label: "Classificar privacidade",
      description: "A classificação formal de privacidade ainda não foi concluída.",
      href: tableId ? `/privacy-access?tableId=${tableId}` : "/privacy-access",
      tone: "warning",
    });
  } else if (hasPersonalData || hasSensitiveData) {
    pushUniqueAction({
      label: "Revisar privacidade",
      description: hasSensitiveData ? "Há sinal de dado sensível e o controle precisa de atenção." : "Há dado pessoal classificado e controles devem ser mantidos.",
      href: tableId ? `/privacy-access?tableId=${tableId}` : "/privacy-access",
      tone: hasSensitiveData ? "danger" : "warning",
    });
  }

  if (!summary.correlation?.operational_context?.actions && !summary.canonical?.pipeline?.linked) {
    pushUniqueAction({
      label: "Revisar ingestão",
      description: "Não há pipeline evidenciado ou o vínculo operacional ainda é fraco.",
      href: schema && tableName ? `/ops/ingestion?schema=${encodeURIComponent(schema)}&table=${encodeURIComponent(tableName)}` : "/ops/ingestion",
      tone: "accent",
    });
  } else if (!ingestionHealth.detail.includes("dentro do SLA") && (freshnessStale || ingestionHealth.label !== "Sucesso")) {
    pushUniqueAction({
      label: "Revisar ingestão e freshness",
      description: ingestionHealth.detail,
      href: schema && tableName ? `/ops/ingestion?schema=${encodeURIComponent(schema)}&table=${encodeURIComponent(tableName)}` : "/ops/ingestion",
      tone: ingestionHealth.tone === "danger" ? "danger" : "warning",
    });
  }

  if (upstreamCount > 0 && downstreamCount === 0) {
    pushUniqueAction({
      label: "Mapear consumidores downstream",
      description: "Há origem mapeada, mas nenhum consumidor downstream foi encontrado.",
      href: tableId ? `/lineage?tableId=${tableId}` : "/lineage",
      tone: "accent",
    });
  } else if (upstreamCount + downstreamCount === 0) {
    pushUniqueAction({
      label: "Mapear linhagem",
      description: "A relação de origem e impacto ainda não está explícita para este ativo.",
      href: tableId ? `/lineage?tableId=${tableId}` : "/lineage",
      tone: "accent",
    });
  }

  if (metabasePartial > 0 && metabaseConfirmed === 0) {
    pushUniqueAction({
      label: "Validar vínculos de consumo",
      description: "Há artefatos do Metabase relacionados, mas os vínculos ainda são parciais.",
      href: tableId ? `/integrations/metabase?tableId=${tableId}` : "/integrations/metabase",
      tone: "warning",
    });
  }

  if (criticalIncidents > 0 || openIncidents > 0) {
    pushUniqueAction({
      label: criticalIncidents > 0 ? "Investigar incidente crítico" : "Abrir incidentes",
      description: criticalIncidents > 0 ? "Há chamado crítico aberto para este ativo." : "Há chamados abertos ou sinais operacionais para este ativo.",
      href: tableId ? `/incidents/tickets?tableId=${tableId}` : "/incidents/tickets",
      tone: "danger",
    });
  }

  if (!actions.length) {
    pushUniqueAction({
      label: "Abrir Explorer",
      description: "Revisar o ativo na visão técnica completa do catálogo.",
      href: tableId ? `/explorer?tableId=${tableId}` : "/explorer",
      tone: "accent",
    });
  }

  return actions.slice(0, 5);
}
