const DETAIL_TABS = ["summary", "columns", "tags", "glossary", "lineage", "history", "consumption", "observability"];

const DETAIL_TAB_LABELS = {
  summary: "Resumo",
  columns: "Colunas",
  tags: "Classificações",
  glossary: "Termos",
  lineage: "Linhagem",
  history: "Timeline",
  consumption: "Consumo analítico",
  observability: "Confiabilidade & Ação",
};

function isDetailTab(value) {
  return DETAIL_TABS.includes(String(value || "").trim());
}

function normalizeDetailTab(value) {
  const normalized = String(value || "").trim();
  return isDetailTab(normalized) ? normalized : null;
}

function detailTabLabel(tab) {
  return DETAIL_TAB_LABELS[tab] || DETAIL_TAB_LABELS.summary;
}

function buildExplorerDetailTabHref(tableId, tab, extraParams = {}) {
  const params = new URLSearchParams({ tableId: String(tableId), tab });
  Object.entries(extraParams).forEach(([key, value]) => {
    if (value === null || value === undefined || value === "") return;
    params.set(key, String(value));
  });
  return `/explorer?${params.toString()}`;
}

function asNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function toneFromScore(score) {
  if (score >= 90) return "success";
  if (score >= 75) return "warning";
  if (score >= 60) return "accent";
  return "danger";
}

function toneFromRisk(risk) {
  if (risk < 10) return "success";
  if (risk < 30) return "accent";
  if (risk < 55) return "warning";
  return "danger";
}

function freshnessLabel(seconds) {
  if (seconds === null || seconds === undefined) return "Sem evidência";
  if (seconds < 3600) return `${Math.max(1, Math.round(seconds / 60))} min`;
  if (seconds < 86400) return `${Math.max(1, Math.round(seconds / 3600))} h`;
  return `${Math.max(1, Math.round(seconds / 86400))} d`;
}

function shortDateTime(value) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function joinPortuguese(parts) {
  const items = parts.filter(Boolean);
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} e ${items[1]}`;
  return `${items.slice(0, -1).join(", ")} e ${items[items.length - 1]}`;
}

function resolveContractTone(status) {
  const normalized = String(status || "").trim().toLowerCase();
  if (!normalized) return "neutral";
  if (["active", "published", "valid", "approved", "ok", "success"].includes(normalized)) return "success";
  if (["partial", "warning", "review", "draft"].includes(normalized)) return "warning";
  if (["failed", "rejected", "expired", "broken"].includes(normalized)) return "danger";
  return "accent";
}

function resolveUsageDecision(state) {
  if (state === "usage_blocked") {
    return {
      label: "Uso bloqueado até correção",
      tone: "danger",
      rationale: "A leitura atual reúne sinais críticos suficientes para impedir o uso sem mitigação.",
    };
  }
  if (state === "critical") {
    return {
      label: "Uso não recomendado para consumo analítico",
      tone: "danger",
      rationale: "Os sinais atuais indicam risco operacional alto para consumo analítico confiável.",
    };
  }
  if (state === "degraded" || state === "insufficient_evidence") {
    return {
      label: "Uso não recomendado para dashboards executivos",
      tone: "warning",
      rationale: "Ainda existem sinais ou lacunas de evidência que reduzem a confiança decisória.",
    };
  }
  if (state === "trusted_with_caveats") {
    return {
      label: "Uso liberado com ressalvas",
      tone: "accent",
      rationale: "O ativo pode ser consumido, mas ainda pede acompanhamento próximo de alguns sinais.",
    };
  }
  return {
    label: "Uso liberado",
    tone: "success",
    rationale: "Os sinais atuais são consistentes o bastante para uso corrente do ativo.",
  };
}

function buildNextAction({ confidenceState, reasons, links, dqScore, freshnessSeconds, ownerDefined, contractHealthy, criticalOpenIncidents, openIncidents, hasOperationalFailure }) {
  const dataQualityHref = links?.data_quality || links?.explorer || "/explorer";
  const incidentsHref = links?.incidents || links?.explorer || "/explorer";
  const ownersHref = links?.owners || links?.explorer || "/explorer";
  const certificationHref = links?.certification || links?.explorer || "/explorer";
  const lineageHref = links?.lineage || links?.explorer || "/explorer";

  if (confidenceState === "usage_blocked") {
    return {
      label: criticalOpenIncidents > 0 || openIncidents > 0 ? "Tratar incidente aberto" : "Abrir incidente",
      href: incidentsHref,
      rationale: "A ação mais segura é registrar ou tratar o incidente antes de liberar o uso do ativo.",
      tone: "danger",
    };
  }

  if (criticalOpenIncidents > 0 || openIncidents > 0) {
    return {
      label: "Tratar incidente aberto",
      href: incidentsHref,
      rationale: "Há um incidente em aberto que precisa de acompanhamento antes de ampliar o consumo.",
      tone: "danger",
    };
  }

  if (hasOperationalFailure || (dqScore !== null && dqScore < 90)) {
    return {
      label: "Reexecutar profiling",
      href: dataQualityHref,
      rationale: "Os sinais de qualidade pedem uma nova leitura para confirmar o estado operacional atual.",
      tone: "warning",
    };
  }

  if (freshnessSeconds !== null && freshnessSeconds >= 4 * 3600) {
    return {
      label: "Validar freshness",
      href: dataQualityHref,
      rationale: "A atualização já está próxima do limite e pode distorcer a confiança no ativo.",
      tone: "warning",
    };
  }

  if (!contractHealthy) {
    return {
      label: "Revisar contrato",
      href: certificationHref,
      rationale: "O contrato ou sua validação ainda não estão suficientemente aderentes para leitura executiva.",
      tone: "warning",
    };
  }

  if (!ownerDefined) {
    return {
      label: "Definir owner",
      href: ownersHref,
      rationale: "Não há responsável claro para acompanhar a decisão e fechar o ciclo de governança.",
      tone: "warning",
    };
  }

  if (reasons.length > 0) {
    return {
      label: "Acompanhar riscos",
      href: lineageHref,
      rationale: "Ainda existem sinais a monitorar para manter a leitura operacional consistente.",
      tone: "accent",
    };
  }

  return {
    label: "Manter uso monitorado",
    href: lineageHref,
    rationale: "A leitura está estável; a próxima ação é acompanhar a evolução normal do ativo.",
    tone: "success",
  };
}

function buildObservabilitySnapshot({ canonicalAsset, operationalContext, correlationSummary, tableInfo }) {
  const links = canonicalAsset?.links || operationalContext?.links || null;
  const ownerName = canonicalAsset?.owner?.owner_name || operationalContext?.owner_name || tableInfo?.owner || null;
  const ownerEmail = canonicalAsset?.owner?.owner_email || tableInfo?.owner_email || null;
  const ownerDefined = Boolean(canonicalAsset?.owner?.owner_defined || ownerName || ownerEmail || tableInfo?.data_owner_id);
  const dqScore = asNumber(canonicalAsset?.evidence?.dq_score ?? operationalContext?.dq_score ?? correlationSummary?.dq?.dq_score);
  const trustScore = asNumber(
    canonicalAsset?.classification?.trust_score ?? canonicalAsset?.classification?.governance_score ?? canonicalAsset?.classification?.readiness_score,
  );
  const freshnessSeconds = asNumber(canonicalAsset?.evidence?.freshness_seconds ?? correlationSummary?.dq?.freshness_seconds);
  const openIncidents = asNumber(canonicalAsset?.evidence?.open_incidents ?? operationalContext?.open_incidents ?? correlationSummary?.incidents?.open_count) || 0;
  const criticalOpenIncidents =
    asNumber(canonicalAsset?.evidence?.critical_open_incidents ?? operationalContext?.critical_open_incidents ?? correlationSummary?.incidents?.critical_open_count) || 0;
  const hasOperationalFailure = Boolean(
    correlationSummary?.has_operational_failure ||
      operationalContext?.recommended_actions?.some((item) => /falha|incidente|ruptura/i.test(item)) ||
      canonicalAsset?.pipeline?.primary_pipeline?.latest_status_label === "Falha" ||
      canonicalAsset?.pipeline?.primary_pipeline?.last_error,
  );
  const activeDqViolation = Boolean(canonicalAsset?.evidence?.active_dq_violation || correlationSummary?.signals?.dq_below_threshold);
  const contractStatus = tableInfo?.data_contract?.status || tableInfo?.data_contract?.last_validation_status || null;
  const contractHealthy = Boolean(
    !contractStatus ||
      ["active", "published", "valid", "approved", "ok", "success"].includes(String(contractStatus).trim().toLowerCase()),
  );
  const lineageImpact = canonicalAsset?.lineage?.impact || null;
  const downstreamCount = asNumber(lineageImpact?.downstream_count) || 0;
  const dashboardCount = asNumber(lineageImpact?.dashboard_count) || 0;
  const processCount = asNumber(lineageImpact?.process_count) || 0;
  const directDependenciesCount = asNumber(lineageImpact?.direct_dependencies_count) || 0;
  const blastRadiusScore = clamp(downstreamCount * 8 + dashboardCount * 12 + processCount * 6 + directDependenciesCount * 4 + criticalOpenIncidents * 16 + openIncidents * 6, 0, 100);
  const evidenceSignals = [dqScore, trustScore, freshnessSeconds, lineageImpact ? 1 : null, contractStatus ? 1 : null, openIncidents > 0 ? 1 : null, criticalOpenIncidents > 0 ? 1 : null].filter((value) => value !== null).length;
  const freshnessLabelValue = freshnessLabel(freshnessSeconds);
  const freshnessTone = freshnessSeconds === null ? "neutral" : freshnessSeconds <= 4 * 3600 ? "success" : freshnessSeconds <= 24 * 3600 ? "warning" : "danger";
  const pipelineLabel = canonicalAsset?.pipeline?.primary_pipeline?.latest_status_label || canonicalAsset?.pipeline?.state || null;
  const pipelineLastSuccess = shortDateTime(canonicalAsset?.pipeline?.primary_pipeline?.last_success_at);
  const pipelineLastExecution = shortDateTime(
    canonicalAsset?.pipeline?.primary_pipeline?.last_execution_finished_at || canonicalAsset?.pipeline?.primary_pipeline?.last_execution_started_at,
  );
  const operationalStatusLabel = pipelineLabel
    ? `Pipeline ${pipelineLabel.toLowerCase()}`
    : hasOperationalFailure
      ? "Falha operacional recente"
      : "Sem pipeline vinculado";
  const operationalStatusDetail = pipelineLastExecution
    ? `Última execução registrada em ${pipelineLastExecution}${pipelineLastSuccess ? ` · último sucesso em ${pipelineLastSuccess}` : ""}`
    : canonicalAsset?.evidence?.last_sync_at
      ? `Última sincronização em ${shortDateTime(canonicalAsset.evidence.last_sync_at)}`
      : "Sem confirmação operacional suficiente.";

  const contractLabel = contractStatus ? String(contractStatus).replaceAll("_", " ") : "Sem contrato explícito";
  const contractTone = resolveContractTone(contractStatus);
  const contractDetail = tableInfo?.data_contract
    ? [
        tableInfo.data_contract.last_validation_status ? `Validação ${String(tableInfo.data_contract.last_validation_status).replaceAll("_", " ")}` : null,
        tableInfo.data_contract.last_validation_issues ? `${tableInfo.data_contract.last_validation_issues} issue(s)` : null,
      ]
        .filter(Boolean)
        .join(" · ") || null
    : null;

  const signalItems = [];
  if (dqScore !== null) {
    signalItems.push({
      label: "DQ score",
      value: `${Math.round(dqScore)}`,
      detail: correlationSummary?.dq?.run_at ? `Última execução em ${shortDateTime(correlationSummary.dq.run_at)}` : "Último valor conhecido.",
      tone: toneFromScore(dqScore),
    });
  }
  signalItems.push({
    label: "Freshness",
    value: freshnessLabelValue,
    detail:
      freshnessSeconds === null
        ? "Sem leitura suficiente de freshness."
        : freshnessSeconds <= 4 * 3600
          ? "Dentro da janela esperada."
          : freshnessSeconds <= 24 * 3600
            ? "Próximo do limite operacional."
            : "Fora do SLA esperado.",
    tone: freshnessTone,
  });
  signalItems.push({
    label: "Incidentes",
    value: `${openIncidents}`,
    detail: criticalOpenIncidents > 0 ? `${criticalOpenIncidents} crítico(s) em aberto.` : openIncidents > 0 ? "Há incidentes abertos." : "Sem incidentes em aberto.",
    tone: criticalOpenIncidents > 0 ? "danger" : openIncidents > 0 ? "warning" : "success",
  });
  signalItems.push({
    label: "Contrato",
    value: contractLabel,
    detail: contractDetail || "Sem validação contratual detalhada.",
    tone: contractTone,
  });
  if (lineageImpact) {
    signalItems.push({
      label: "Blast radius",
      value: `${blastRadiusScore}`,
      detail: `${downstreamCount} downstreams · ${dashboardCount} dashboards · ${directDependenciesCount} dependências diretas`,
      tone: blastRadiusScore >= 70 ? "danger" : blastRadiusScore >= 40 ? "warning" : "success",
    });
  }

  const reasons = [];
  if (criticalOpenIncidents > 0) reasons.push(`${criticalOpenIncidents} incidente(s) crítico(s) em aberto`);
  if (openIncidents > 0 && criticalOpenIncidents === 0) reasons.push(`${openIncidents} incidente(s) em aberto`);
  if (hasOperationalFailure) reasons.push("falha operacional recente");
  if (dqScore !== null && dqScore < 70) reasons.push("DQ abaixo do patamar mínimo");
  else if (dqScore !== null && dqScore < 90) reasons.push("DQ com ressalvas");
  if (freshnessSeconds !== null && freshnessSeconds > 24 * 3600) reasons.push("freshness fora do SLA");
  else if (freshnessSeconds !== null && freshnessSeconds > 4 * 3600) reasons.push("freshness próxima do limite");
  if (!contractHealthy) reasons.push("contrato parcialmente aderente");
  if (!ownerDefined) reasons.push("owner não definido");
  if (activeDqViolation) reasons.push("violação de DQ ativa");
  if (evidenceSignals <= 1) reasons.push("evidência operacional insuficiente");

  const insufficientEvidence = evidenceSignals <= 1;
  let confidenceState = insufficientEvidence ? "insufficient_evidence" : "trusted";
  if (criticalOpenIncidents > 0 || (hasOperationalFailure && dqScore !== null && dqScore < 70)) confidenceState = "usage_blocked";
  else if (
    !insufficientEvidence &&
    (dqScore !== null && dqScore < 70 ||
      freshnessSeconds !== null && freshnessSeconds > 24 * 3600 ||
      (openIncidents > 0 && (dqScore === null || dqScore < 85)) ||
      !contractHealthy ||
      activeDqViolation)
  ) {
    confidenceState = "critical";
  } else if (
    !insufficientEvidence &&
    (dqScore !== null && dqScore < 90 ||
      freshnessSeconds !== null && freshnessSeconds > 4 * 3600 ||
      !ownerDefined ||
      hasOperationalFailure)
  ) {
    confidenceState = "degraded";
  } else if (!insufficientEvidence && reasons.length > 0) {
    confidenceState = "trusted_with_caveats";
  }

  const confidenceLabelMap = {
    trusted: "Confiável",
    trusted_with_caveats: "Confiável com ressalvas",
    degraded: "Degradado",
    critical: "Crítico",
    insufficient_evidence: "Sem evidência suficiente",
    usage_blocked: "Uso bloqueado",
  };

  const confidenceToneMap = {
    trusted: "success",
    trusted_with_caveats: "accent",
    degraded: "warning",
    critical: "danger",
    insufficient_evidence: "neutral",
    usage_blocked: "danger",
  };

  const confidenceScore = trustScore ?? dqScore ?? (canonicalAsset?.classification?.readiness_score ?? null);
  const usageDecision = resolveUsageDecision(confidenceState);
  const nextAction = buildNextAction({
    confidenceState,
    reasons,
    links,
    dqScore,
    freshnessSeconds,
    ownerDefined,
    contractHealthy,
    criticalOpenIncidents,
    openIncidents,
    hasOperationalFailure,
  });

  const confidenceReason = (() => {
    if (confidenceState === "trusted") {
      return "Confiável porque os sinais de qualidade, operação e responsabilidade estão estáveis.";
    }
    if (confidenceState === "usage_blocked") {
      return `Uso bloqueado por ${joinPortuguese(reasons.slice(0, 2))}.`;
    }
    if (confidenceState === "critical") {
      return `Crítico por ${joinPortuguese(reasons.slice(0, 3))}.`;
    }
    if (confidenceState === "degraded") {
      return `Confiável com ressalvas por ${joinPortuguese(reasons.slice(0, 3))}.`;
    }
    if (confidenceState === "trusted_with_caveats") {
      return `Confiável com ressalvas por ${joinPortuguese(reasons.slice(0, 2))}.`;
    }
    return "Sem evidência operacional suficiente para sustentar uma leitura confiável agora.";
  })();

  const responsibilitySummary = ownerDefined
    ? `Responsável principal: ${ownerName || "não informado"}${ownerEmail ? ` · ${ownerEmail}` : ""}.`
    : "Responsável principal ainda não definido.";
  const responsibilityFollowUp = joinPortuguese([
    operationalContext?.recommended_actions?.[0] || null,
    tableInfo?.data_contract?.status ? `contrato ${String(tableInfo.data_contract.status).replaceAll("_", " ")}` : null,
    tableInfo?.certification_status ? `certificação ${String(tableInfo.certification_status).replaceAll("_", " ")}` : null,
  ]);

  const impactSummary = lineageImpact
    ? `Impacta ${downstreamCount} ativo(s) downstream, ${dashboardCount} dashboard(s) e ${directDependenciesCount} dependência(s) direta(s).`
    : "Ainda não há lineage suficiente para estimar o alcance do impacto com confiança.";

  return {
    confidenceState,
    confidenceLabel: confidenceLabelMap[confidenceState] || confidenceLabelMap.trusted,
    confidenceTone: confidenceToneMap[confidenceState] || confidenceToneMap.trusted,
    confidenceScore,
    confidenceReason,
    operationalStatusLabel,
    operationalStatusDetail,
    usageDecision: {
      state: confidenceState === "trusted" ? "usage_allowed" : confidenceState === "trusted_with_caveats" ? "usage_allowed_with_caveats" : confidenceState === "insufficient_evidence" ? "usage_not_recommended" : confidenceState === "usage_blocked" ? "usage_blocked" : "usage_not_recommended",
      label: usageDecision.label,
      tone: usageDecision.tone,
      rationale: usageDecision.rationale,
    },
    impact: {
      blastRadiusScore,
      blastRadiusLabel: blastRadiusScore >= 75 ? "Alto" : blastRadiusScore >= 40 ? "Médio" : blastRadiusScore >= 10 ? "Baixo" : "Muito baixo",
      summary: impactSummary,
      downstreamCount,
      dashboardCount,
      processCount,
      directDependenciesCount,
      impactLevel: lineageImpact?.impact_level || "Não avaliado",
    },
    responsibility: {
      ownerName,
      ownerEmail,
      ownerDefined,
      summary: responsibilitySummary,
      followUp: responsibilityFollowUp || "Sem próximo passo explícito ainda.",
      ownerReviewDue: Boolean(operationalContext?.owner_review_due),
      privacyReviewDue: Boolean(operationalContext?.privacy_review_due),
      certificationReviewDue: Boolean(operationalContext?.certification_review_due),
      criticalityLabel: operationalContext?.criticality_label || tableInfo?.certification_criticality || "Não avaliada",
      criticalityTone: operationalContext?.criticality_tone || "neutral",
    },
    nextAction: {
      label: nextAction.label,
      href: nextAction.href,
      rationale: nextAction.rationale,
      tone: nextAction.tone,
    },
    signals: signalItems,
    contract: {
      label: contractLabel,
      detail: contractDetail || "Sem validação contratual detalhada.",
      tone: contractTone,
    },
    freshness: {
      label: freshnessLabelValue,
      detail:
        freshnessSeconds === null
          ? "Sem leitura suficiente de freshness."
          : freshnessSeconds <= 4 * 3600
            ? "Dentro da janela esperada."
            : freshnessSeconds <= 24 * 3600
              ? "Próximo do limite operacional."
              : "Fora do SLA esperado.",
      tone: freshnessTone,
    },
    pipeline: {
      label: operationalStatusLabel,
      detail: operationalStatusDetail,
      tone: hasOperationalFailure ? "danger" : pipelineLabel ? "accent" : "neutral",
    },
    hasEvidence: evidenceSignals > 1,
    reasons,
  };
}

export {
  DETAIL_TABS,
  DETAIL_TAB_LABELS,
  buildExplorerDetailTabHref,
  buildObservabilitySnapshot,
  detailTabLabel,
  normalizeDetailTab,
  isDetailTab,
};
