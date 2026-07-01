import { presentStatus, presentText, UX_COPY } from "@/lib/presentation/status-copy";
import { formatCompactNumber, formatDateTime, freshnessLabel, tableKindLabel } from "@/features/explorer/utils";

import type {
  JourneyPhaseKey,
  JourneySectionContent,
  JourneySectionItem,
  JourneySectionRow,
  JourneySummaryState,
  JourneyTone,
} from "../types";

import { artifactTypeLabel, identityColumnMeta, lineageImpactLabel, resolveIdentityVolume } from "./asset";
import { dqRuleHasFailure, dqRuleRunLabel, dqRuleSeverityLabel, dqRuleTypeLabel } from "./dq";
import {
  formatFreshnessLabel,
  formatRowCountTrend,
  pickLatestTimestamp,
  summarizeList,
  uniqueStrings,
} from "./format";
import { governanceEffectiveSignals } from "./governance";
import { phaseLinks } from "./phase";
import {
  certificationStatusLabel,
  certificationTone,
  getToneForStatus,
  ingestionHealthLabel,
  ingestionStateLabel,
  isClosedIncidentStatus,
  isOpenIncidentStatus,
  isWithinDays,
  statusLabelFromSeverity,
} from "./tone";

export function buildJourneySectionContent({
  phase,
  summary,
  recommendedActions,
  links,
}: {
  phase: JourneyPhaseKey;
  summary: JourneySummaryState;
  recommendedActions: Array<{ label: string; description: string; href: string; tone: JourneyTone }>;
  links: ReturnType<typeof phaseLinks>;
}): JourneySectionContent {
  const detail = summary.tableDetail;
  const canonical = summary.canonical;
  const correlation = summary.correlation;
  const dq = summary.dq;
  const metabase = summary.metabase;
  const dataLake = summary.dataLake;

  switch (phase) {
    case "identity":
      {
        const columns = canonical?.columns ?? [];
        const totalColumns = columns.length;
        const documentedColumns = columns.filter((column) => column.description_complete);
        const tags = canonical?.tags ?? [];
        const terms = canonical?.terms ?? [];
        const rowCountMetrics = detail?.row_count_metrics ?? null;
        const rowCountValue = rowCountMetrics?.current_row_count ?? null;
        const rowCountConfidence = rowCountMetrics?.measurement_type || rowCountMetrics?.collection_method || null;
        const rowCountMethod = rowCountMetrics?.measurement_type || rowCountMetrics?.collection_method || null;
        const rowCountExact =
          rowCountConfidence !== null
            ? /exact|exato|precis/i.test(rowCountConfidence)
            : rowCountMethod !== null
              ? /exact|exato|precis/i.test(rowCountMethod)
                : false;
        const lastLoadAt =
          canonical?.pipeline?.primary_pipeline?.last_success_at ||
          dataLake?.inventory.last_modified_at ||
          null;
        const lastScanAt =
          dataLake?.inventory.data_last_scan_at ||
          rowCountMetrics?.snapshot_at ||
          pickLatestTimestamp(dataLake?.history?.map((entry) => entry.observed_at) ?? []) ||
          null;
        const freshnessStatus = dataLake?.freshness_status || null;
        const freshnessMetric =
          formatFreshnessLabel(
            freshnessStatus,
            dataLake?.freshness_age_hours ?? null,
            dataLake?.freshness_age_seconds ?? canonical?.evidence.freshness_seconds ?? null,
          ) ||
          (canonical?.evidence.freshness_seconds !== null && canonical?.evidence.freshness_seconds !== undefined
            ? `Há ${freshnessLabel(canonical.evidence.freshness_seconds)}`
            : null);
        const volumeInfo = resolveIdentityVolume({ rowCountMetrics });
        const tableDescription = detail?.description_manual || detail?.description_source || null;
        const primaryColumns = [...columns]
          .sort(
            (left, right) =>
              Number(right.is_primary_key) - Number(left.is_primary_key) ||
              Number(left.is_nullable) - Number(right.is_nullable) ||
              left.ordinal_position - right.ordinal_position,
          )
          .slice(0, 6);
        const hasDescription = Boolean((tableDescription || "").trim());
        const hasColumns = totalColumns > 0;
        const hasSemanticContext = tags.length > 0 || terms.length > 0 || Boolean(canonical?.classification.governance_label);
        const ownerDefined = canonical?.owner.owner_defined ?? Boolean(detail?.owner || detail?.data_owner);
        return {
          title: "Identidade do ativo",
          intro: "Mostra o que a tabela representa, como ela está documentada e se os sinais básicos parecem coerentes.",
          rows: [
            { label: "Descrição", value: hasDescription ? tableDescription || "Descrição cadastrada" : "Descrição ainda não cadastrada." },
            { label: "Tipo de ativo", value: summary.locator ? tableKindLabel(summary.locator.kind) : "Tabela" },
            { label: "Colunas", value: hasColumns ? `${totalColumns}` : "Não disponível" },
            { label: "Documentação", value: hasColumns ? `${documentedColumns.length}/${totalColumns} colunas documentadas` : "Não disponível" },
            { label: "Volume de dados", value: volumeInfo.valueText, tone: volumeInfo.tone },
            {
              label: "Medição",
              value:
                rowCountValue !== null && (rowCountMetrics?.status === "success" || rowCountMetrics?.collection_status === "success")
                  ? `${rowCountExact ? "Exata" : "Estimada"}${rowCountMetrics?.measured_at || rowCountMetrics?.snapshot_at ? ` · ${formatDateTime(rowCountMetrics.measured_at || rowCountMetrics.snapshot_at || "")}` : ""}`
                  : UX_COPY.toConfirm,
              tone: rowCountValue !== null && (rowCountMetrics?.status === "success" || rowCountMetrics?.collection_status === "success") ? (rowCountExact ? "success" : "warning") : "neutral",
            },
            {
              label: "Origem da medição",
              value: volumeInfo.sourceLabel,
              tone: volumeInfo.sourceLabel !== "Sem medição registrada" ? "accent" : "neutral",
            },
            {
              label: "Evolução",
              value: formatRowCountTrend(rowCountMetrics),
              tone: rowCountMetrics?.growth_absolute === null || rowCountMetrics?.growth_absolute === undefined
                ? "neutral"
                : rowCountMetrics.growth_absolute > 0
                  ? "success"
                  : rowCountMetrics.growth_absolute < 0
                    ? "warning"
                    : "accent",
            },
            {
              label: "Última carga",
              value: lastLoadAt ? formatDateTime(lastLoadAt) : UX_COPY.noHistory,
              tone: lastLoadAt ? "accent" : "neutral",
            },
            {
              label: "Último scan",
              value: lastScanAt ? formatDateTime(lastScanAt) : UX_COPY.noHistory,
              tone: lastScanAt ? "accent" : "neutral",
            },
            {
              label: "Freshness",
              value: freshnessMetric || UX_COPY.toConfirm,
              tone: freshnessMetric
                ? freshnessMetric === "Atualizado"
                  ? "success"
                  : freshnessMetric === "Recente"
                    ? "accent"
                    : freshnessMetric === "Atrasado"
                      ? "warning"
                      : getToneForStatus(freshnessMetric)
                : "neutral",
            },
            { label: "Tags", value: tags.length ? summarizeList(tags.slice(0, 3).map((tag) => tag.name)) : "Nenhuma tag associada" },
            { label: "Glossário", value: terms.length ? summarizeList(terms.slice(0, 3).map((term) => term.name)) : "Nenhum termo associado" },
            {
              label: "Sinais",
              value: uniqueStrings([
                ownerDefined ? "owner" : "sem owner",
                hasDescription ? "descrição" : "sem descrição",
                hasColumns ? "colunas" : "sem colunas",
                rowCountValue !== null && (rowCountMetrics?.status === "success" || rowCountMetrics?.collection_status === "success") ? "volume medido" : "sem volume",
                lastLoadAt ? "carga" : "sem carga",
                lastScanAt ? "scan" : "sem scan",
                volumeInfo.sourceLabel !== "Sem medição registrada" ? "origem real" : null,
                hasSemanticContext ? "contexto semântico" : "sem tags/termos",
              ]).join(" · "),
            },
            {
              label: "Identificadores técnicos",
              value: [
                `table_id: ${detail?.id ?? canonical?.table_id ?? summary.locator?.table_id ?? "-"}`,
                `datasource_id: ${summary.locator?.datasource_id ?? "-"}`,
                `schema_id: ${detail?.schema_id ?? summary.locator?.schema_id ?? "-"}`,
              ].join(" · "),
            },
          ],
          items: hasColumns
            ? primaryColumns.map((column) => {
                return {
                  key: `column-${column.id}`,
                  id: column.id,
                  title: column.name,
                  detail: column.data_type,
                  meta: identityColumnMeta(column),
                  tone: column.is_primary_key ? "success" : column.description_complete ? "accent" : "warning",
                  entity_kind: "column",
                };
              })
            : [],
          emptyTitle: hasColumns ? undefined : "Estrutura de colunas ainda não carregada",
          emptyDescription: hasColumns
            ? undefined
            : "Abra o Explorer para consultar o schema completo ou validar se a tabela já foi sincronizada.",
          measureActionLabel:
            !rowCountMetrics || (rowCountMetrics.status !== "success" && rowCountMetrics.collection_status !== "success")
              ? rowCountMetrics?.status === "error" || rowCountMetrics?.collection_status === "error"
                ? "Tentar medir novamente"
                : "Medir volume agora"
              : undefined,
          // Keep the inline chip compact and precise; the detail appears in the signals row.
          primaryActionLabel: "Ver colunas",
          primaryActionHref: detail?.id ? `/explorer?tableId=${detail.id}&tab=columns` : links.explorer,
          secondaryActionLabel: "Abrir Explorer",
          secondaryActionHref: links.explorer,
        };
    }
    case "governance": {
      const governance = governanceEffectiveSignals(summary);
      const tableId = detail?.id ?? canonical?.table_id ?? summary.locator?.table_id ?? null;
      const tableHref = tableId ? `/explorer?tableId=${tableId}` : "/explorer";
      const stewardshipHref = tableId ? `/governance/stewardship?tableId=${tableId}` : "/governance/stewardship";
      const ownerActive = detail?.data_owner?.is_active ?? null;
      const latestRequest = governance.latestRequest;
      const rowCount = detail?.row_count_metrics?.current_row_count ?? null;
      const pendingItems: Array<JourneySectionItem | null> = [
        !governance.certificationValid
          ? ({
              key: "revalidate-certification",
              title: "Revalidar certificação operacional",
              detail: `Certificação efetiva: ${governance.effectiveCertificationLabel}.`,
              meta: "Ação recomendada",
              tone: "warning",
              href: tableId ? `/certification?tableId=${tableId}` : "/certification",
            } satisfies JourneySectionItem)
          : null,
        !governance.domainConfirmed
          ? ({
              key: "confirm-domain",
              title: "Confirmar domínio semântico",
              detail: "Domínio não confirmado para este ativo.",
              meta: "Contexto de negócio",
              tone: "warning",
              href: "/governance/domains",
            } satisfies JourneySectionItem)
          : null,
        !governance.stewardDefined
          ? ({
              key: "define-steward",
              title: "Definir steward",
              detail: "Ainda não há steward confirmado para este ativo.",
              meta: "Responsabilidade",
              tone: "warning",
              href: stewardshipHref,
            } satisfies JourneySectionItem)
          : null,
        ownerActive === false
          ? ({
              key: "owner-inactive",
              title: "Owner inativo com ativos",
              detail: "O responsável atual está inativo e precisa de reatribuição formal.",
              meta: "Reatribuição",
              tone: "danger",
              href: "/data-owners",
            } satisfies JourneySectionItem)
          : null,
        governance.criticalityLabel === "Não definida"
          ? ({
              key: "review-criticality",
              title: "Revisar criticidade",
              detail: "Criticidade não definida para o ativo.",
              meta: "Classificação",
              tone: "accent",
              href: tableHref,
            } satisfies JourneySectionItem)
          : null,
        rowCount === 0
          ? ({
              key: "validate-volume",
              title: "Validar volume zero",
              detail: "Volume atual é 0 linhas. Se a tabela deveria ser populada, valide a origem e a ingestão.",
              meta: "Alerta operacional",
              tone: "neutral",
              href: tableHref,
            } satisfies JourneySectionItem)
          : null,
      ];
      const visiblePendingItems: JourneySectionItem[] = pendingItems.filter((item): item is JourneySectionItem => item !== null);
      return {
        title: "Governança e ownership",
        intro:
          governance.ownerDefined && governance.productName && governance.tagsCount > 0 && governance.termsCount > 0
            ? "Mostra responsáveis, contexto de negócio, vocabulário e pendências mínimas de administração."
            : "Mostra responsáveis, contexto de negócio, vocabulário e pendências mínimas de administração.",
        rows: [
          { label: "Owner definido", value: governance.ownerDefined ? "Sim" : "Não", tone: governance.ownerDefined ? "success" : "warning", href: "/data-owners" },
          { label: "Owner", value: presentText(governance.ownerName), href: "/data-owners" },
          { label: "E-mail", value: presentText(governance.ownerEmail) },
          { label: "Status do owner", value: ownerActive === false ? "Inativo" : ownerActive === true ? "Ativo" : UX_COPY.toConfirm, tone: ownerActive === false ? "warning" : ownerActive === true ? "success" : "neutral" },
          {
            label: "Certificação efetiva",
            value: governance.effectiveCertificationLabel,
            tone: governance.certificationValid ? "success" : "warning",
            href: tableId ? `/certification?tableId=${tableId}` : "/certification",
          },
          {
            label: "Certificação persistida",
            value: governance.persistedCertificationLabel,
            tone: governance.effectiveCertificationStatus === "certified" ? "success" : "neutral",
          },
          { label: "Steward", value: governance.stewardDefined ? presentText(latestRequest?.approver?.name || latestRequest?.requested_by?.name) : UX_COPY.toConfirm, tone: governance.stewardDefined ? "accent" : "warning", href: stewardshipHref },
          {
            label: "Produto de dados",
            value: governance.productName || "Não associado",
            tone: governance.productName ? "accent" : "warning",
            href: governance.productHref,
          },
          {
            label: "Domínio",
            value: governance.domainConfirmed ? governance.criticalityLabel : "Não associado",
            tone: governance.domainConfirmed ? "accent" : "warning",
            href: "/governance/domains",
          },
          { label: "Tags", value: `${governance.tagsCount} tags · ${summarizeList(governance.tags.map((tag) => tag.name))}` },
          { label: "Glossário", value: `${governance.termsCount} termos · ${summarizeList(governance.terms.map((term) => term.name))}` },
          { label: "Criticidade", value: governance.criticalityLabel },
          {
            label: "Stewardship",
            value: governance.stewardshipOpenCount > 0 ? `${governance.stewardshipOpenCount} solicitação(ões) pendente(s)` : "Sem pendências abertas",
            tone: governance.stewardshipOpenCount > 0 ? "warning" : "success",
            href: stewardshipHref,
          },
          {
            label: "Última solicitação",
            value: latestRequest ? latestRequest.status_label || presentStatus(latestRequest.status, UX_COPY.toConfirm) : UX_COPY.noHistory,
            tone: latestRequest?.status === "approved" ? "success" : latestRequest ? "warning" : "neutral",
          },
          {
            label: "Sinais atendidos",
            value: `${governance.signalsMet}/${governance.signalsTotal}`,
            tone: governance.signalsMet === governance.signalsTotal ? "success" : "warning",
          },
        ],
        items: visiblePendingItems,
        primaryActionLabel: "Abrir Owners",
        primaryActionHref: "/data-owners",
        secondaryActionLabel: "Abrir Explorer",
        secondaryActionHref: links.explorer,
      };
    }
    case "dataQuality": {
      const rules = summary.dqRules ?? [];
      const score = dq?.effective_dq_score ?? dq?.dq_score ?? canonical?.evidence.dq_score ?? null;
      const activeRules = rules.filter((rule) => rule.is_active).length;
      const failedRules = rules.filter((rule) => dqRuleHasFailure(rule)).length;
      const criticalRules = rules.filter((rule) => statusLabelFromSeverity(rule.severity) === "danger").length;
      const totalViolations = rules.reduce((sum, rule) => sum + Math.max(0, rule.last_violations_count || 0), 0);
      const hasExecution = Boolean(dq?.run_at || rules.some((rule) => rule.last_run_at));
      const rulesCount = rules.length;
      const dqCoverage = dq?.observability?.quality_coverage ?? null;
      const dqCoverageLabel = dqCoverage
        ? `${dqCoverage.evaluated_dimensions} de ${dqCoverage.total_dimensions} dimensões com evidência`
        : rulesCount > 0
          ? "Cobertura parcial"
          : "Sem cobertura";
      const scoreLabel = rulesCount === 0 ? "Score operacional" : "Score de qualidade";
      const status =
        rulesCount === 0
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
      const monitoring =
        rulesCount === 0 ? "Sem regras cadastradas" : `${activeRules} regra(s) ativa(s)`;
      const interpretation =
        rulesCount === 0
          ? "Não há falhas registradas, mas ainda não existem regras cadastradas para validar expectativas de qualidade desta tabela."
          : !hasExecution
            ? "Há regras cadastradas, mas ainda não existe execução recente de DQ para comprovar a leitura."
            : failedRules > 0
              ? `Existe(m) ${failedRules} regra(s) com falha e ${totalViolations} violação(ões) recentes.`
              : "Regras ativas sem falha na última execução.";
      const signal =
        rulesCount === 0
          ? "Baixa cobertura de regras"
          : failedRules > 0
            ? criticalRules > 0
              ? `${criticalRules} regra(s) crítica(s) com ${totalViolations} violação(ões)`
              : `${failedRules} regra(s) com falha`
            : score !== null && score < 80
              ? "Score abaixo do ideal"
              : "Sem risco imediato";
      const rows: JourneySectionRow[] = [
        { label: scoreLabel, value: score === null ? UX_COPY.toConfirm : `${Math.round(score)}%` },
        { label: "Cobertura", value: dqCoverageLabel },
        { label: "Status da qualidade", value: status },
        { label: "Última execução", value: dq?.run_at ? formatDateTime(dq.run_at) : UX_COPY.noHistory },
        { label: "Monitoramento", value: monitoring },
        { label: "Sinal de risco", value: signal },
        { label: "Freshness", value: dq?.freshness_seconds !== null && dq?.freshness_seconds !== undefined ? freshnessLabel(dq.freshness_seconds) : UX_COPY.toConfirm },
        { label: "Interpretação", value: interpretation },
      ];
      return {
        title: "Data Quality",
        intro: dqCoverage
          ? "Resume score, execução, cobertura de regras e sinais de risco da qualidade."
          : "Resume score, execução, cobertura de regras e sinais de risco da qualidade.",
        rows,
        items: [],
        primaryActionLabel: "Abrir Data Quality",
        primaryActionHref: links.dataQuality,
        secondaryActionLabel: "Ver profiling",
        secondaryActionHref: links.dataQuality,
      };
    }
    case "dqRules": {
      const rules = summary.dqRules ?? [];
      const failedRules = rules.filter((rule) => dqRuleHasFailure(rule)).length;
      const activeRules = rules.filter((rule) => rule.is_active).length;
      const criticalRules = rules.filter((rule) => statusLabelFromSeverity(rule.severity) === "danger").length;
      const latestFailureAt = rules
        .filter((rule) => dqRuleHasFailure(rule) && rule.last_run_at)
        .map((rule) => rule.last_run_at as string)
        .sort()
        .slice(-1)[0] ?? null;
      const items = rules.slice(0, 3).map((rule) => ({
        key: `dq-rule-${rule.id}`,
        id: rule.id,
        title: rule.name,
        detail: `Último run: ${dqRuleRunLabel(rule)} · ${rule.rule_summary || dqRuleTypeLabel(rule.rule_type)}`,
        meta: `${rule.last_violations_count} violação(ões) · Severidade: ${dqRuleSeverityLabel(rule.severity)}${rule.open_incident_id ? " · incidente aberto" : ""}`,
        tone: statusLabelFromSeverity(rule.severity),
        entity_kind: "dq_rule",
      }));
      return {
        title: "Regras de DQ",
        intro: "Mostra as regras cadastradas, suas violações, severidade e o estágio mais recente de execução.",
        rows: [
          { label: "Regras cadastradas", value: `${rules.length}` },
          { label: "Regras ativas", value: `${activeRules}` },
          { label: "Regras críticas", value: `${criticalRules}` },
          { label: "Com falha", value: `${failedRules}` },
          { label: "Última falha", value: latestFailureAt ? formatDateTime(latestFailureAt) : "Sem falhas recentes" },
          { label: "Leitura operacional", value: rules.length > 0 ? "Acompanhe a última execução e as violações por regra." : "Crie a primeira regra para iniciar o monitoramento." },
        ],
        items,
        emptyTitle: "Ainda não há regras de Data Quality",
        emptyDescription: "Isso pode ser esperado em ativos novos. O próximo passo é cadastrar regras para validar completude, domínio, unicidade e consistência.",
        primaryActionLabel: "Abrir regras da tabela",
        primaryActionHref: links.dqRules,
        secondaryActionLabel: "Abrir profiling",
        secondaryActionHref: links.dataQuality,
      };
    }
    case "certification":
      {
        const operational = correlation?.operational_context;
        const statusRaw = detail?.certification_status || canonical?.classification.certification_status || (operational?.eligible_for_certification ? "eligible" : "unknown");
        const readiness = canonical?.classification.readiness_score ?? null;
        const columns = canonical?.columns ?? [];
        const totalColumns = columns.length;
        const documentedColumns = columns.filter((column) => column.description_complete).length;
        const documentedColumnsPct = totalColumns > 0 ? documentedColumns / totalColumns : null;
        const dqScore = operational?.dq_score ?? dq?.effective_dq_score ?? dq?.dq_score ?? canonical?.evidence.dq_score ?? null;
        const openCriticalIncidents = operational?.critical_open_incidents ?? correlation?.incidents.critical_open_count ?? canonical?.evidence.critical_open_incidents ?? 0;
        const reviewDue = operational?.certification_review_due ?? detail?.certification_review_due ?? false;
        const lastReviewAt = operational?.last_review_at || detail?.certification_review_at || null;
        const nextReviewAt = detail?.certification_next_review_at || detail?.certification_expires_at || detail?.certification_review_at || null;
        const ownerNeedsAction = detail?.data_owner?.is_active === false;
        const criteria = [
          {
            label: "Owner definido",
            passed: Boolean(operational?.owner_defined ?? canonical?.owner.owner_defined ?? canonical?.owner.owner_name ?? canonical?.owner.owner_email ?? detail?.owner ?? detail?.data_owner),
            blocker: "Owner não definido",
          },
          {
            label: "Descrição cadastrada",
            passed: operational?.description_complete ?? Boolean(detail?.description_manual || detail?.description_source),
            blocker: "Descrição ausente",
          },
          {
            label: "Colunas documentadas >= 80%",
            passed: documentedColumnsPct !== null ? documentedColumnsPct >= 0.8 : false,
            blocker: "Documentação de colunas abaixo de 80%",
          },
          {
            label: "Tags aplicadas",
            passed: (operational?.tags_count ?? canonical?.tags.length ?? 0) > 0,
            blocker: "Tags ausentes",
          },
          {
            label: "Termos associados",
            passed: (operational?.terms_count ?? canonical?.terms.length ?? 0) > 0,
            blocker: "Termos ausentes",
          },
          {
            label: "DQ score >= 90%",
            passed: dqScore !== null ? dqScore >= 90 : false,
            blocker: "DQ score abaixo de 90%",
          },
          {
            label: "Sem incidente crítico",
            passed: (openCriticalIncidents ?? 0) === 0,
            blocker: "Incidente crítico aberto",
          },
          {
            label: "Revisão nos últimos 90 dias",
            passed: Boolean(lastReviewAt) && !reviewDue && isWithinDays(lastReviewAt, 90),
            blocker: "Revisão vencida ou ausente",
          },
        ];
        const attendedCriteria = criteria.filter((criterion) => criterion.passed);
        const blockingCriteria = criteria.filter((criterion) => !criterion.passed);
        const mainBlocker = blockingCriteria[0]?.blocker || (statusRaw === "revalidation_pending" ? "Revalidação operacional pendente" : "Sem bloqueios conhecidos");
        const statusLabel = certificationStatusLabel(statusRaw);
        const statusTone = certificationTone(statusRaw);
        const readinessLabel = readiness !== null ? `${Math.round(readiness)}%` : UX_COPY.toConfirm;
        const readinessContext = `${attendedCriteria.length}/${criteria.length} critérios atendidos`;
        const attendedSummary = attendedCriteria.slice(0, 3).map((criterion) => criterion.label).join(" · ") || "Nenhum critério confirmado";
        const blockingVisible = blockingCriteria.slice(0, 4);
        const blockingHiddenCount = Math.max(blockingCriteria.length - blockingVisible.length, 0);
        const blockingSummary =
          blockingVisible.map((criterion) => criterion.blocker).join(" · ") + (blockingHiddenCount > 0 ? ` · +${blockingHiddenCount}` : "");
        const checklistItems = [
          ...attendedCriteria.slice(0, 3).map((criterion) => ({
            key: `cert-ok-${criterion.label}`,
            title: criterion.label,
            detail: "Critério atendido",
            meta: "Atendido",
            tone: "success" as JourneyTone,
            entity_kind: "certification_criterion",
          })),
          ...blockingVisible.map((criterion) => ({
            key: `cert-block-${criterion.label}`,
            title: criterion.label,
            detail: criterion.blocker,
            meta: "Bloqueio",
            tone: "danger" as JourneyTone,
            entity_kind: "certification_blocker",
          })),
          ...(blockingHiddenCount > 0
            ? [
                {
                  key: "cert-block-more",
                  title: `+${blockingHiddenCount} bloqueio${blockingHiddenCount > 1 ? "s" : ""}`,
                  detail: "Bloqueios adicionais não exibidos nesta visão compacta.",
                  meta: "Resumo",
                  tone: "warning" as JourneyTone,
                  entity_kind: "certification_blocker_more",
                },
              ]
            : []),
        ];
        const nextStep =
          statusRaw === "certified"
            ? "Manter revisão periódica e acompanhar incidentes ou queda de qualidade."
            : statusRaw === "eligible"
              ? "Iniciar revisão de certificação."
              : statusRaw === "revalidation_pending"
                ? "Revalidar o ativo e confirmar se qualidade, incidentes e operação continuam adequados."
                : statusRaw === "rejected"
                  ? "Revisar a justificativa da recusa e corrigir as pendências apontadas."
                  : "Resolver os bloqueios principais e reavaliar a certificação.";
        return {
          title: "Certificação",
          intro: "Mostra se o ativo já atende aos critérios mínimos para ser tratado como confiável.",
          rows: [
            { label: "Status da certificação", value: statusLabel, tone: statusTone },
            { label: "Status efetivo", value: reviewDue ? "Reavaliação pendente" : statusLabel, tone: reviewDue ? "warning" : statusTone },
            { label: "Prontidão para certificação", value: `${readinessLabel} · ${readinessContext}` },
            { label: "Elegibilidade", value: operational?.eligible_for_certification ? "Sim" : "Não" },
            { label: "Criticidade da certificação", value: presentText(detail?.certification_criticality || canonical?.classification.certification_criticality, UX_COPY.notDefined) },
            { label: "Última revisão", value: lastReviewAt ? formatDateTime(lastReviewAt) : UX_COPY.neverReviewed },
            { label: "Próxima revisão", value: nextReviewAt ? formatDateTime(nextReviewAt) : "Definir após a próxima decisão" },
            { label: "Quem precisa agir", value: ownerNeedsAction ? "Reatribuir owner inativo" : statusRaw === "in_review" ? "Aprovação formal" : reviewDue ? "Revalidar certificação" : "Owner e governança" },
            { label: "Critérios atendidos", value: `${attendedCriteria.length}/${criteria.length} · ${attendedSummary}` },
            { label: "Bloqueios principais", value: `${blockingCriteria.length} · ${blockingSummary || "Sem bloqueios conhecidos"}` },
            { label: "Principal bloqueio", value: mainBlocker },
            { label: "Próximo passo", value: nextStep },
          ],
          itemsTitle: "Checklist resumido",
          items: checklistItems,
          primaryActionLabel: "Abrir Certificação",
          primaryActionHref: links.certification,
          secondaryActionLabel: "Ver checklist",
          secondaryActionHref: links.certification,
        };
    }
    case "privacy":
      {
        const sensitivityLevel = detail?.sensitivity_level || canonical?.classification.sensitivity_level || null;
        const normalizedLevel = (sensitivityLevel || "").trim().toLowerCase();
        const classified = Boolean(normalizedLevel && normalizedLevel !== "unclassified" && normalizedLevel !== "unknown");
        const personalKnown = detail?.has_personal_data ?? canonical?.classification.has_personal_data ?? null;
        const sensitiveKnown = detail?.has_sensitive_personal_data ?? canonical?.classification.has_sensitive_personal_data ?? null;
        const classifiedColumns = canonical?.classification.classified_columns ?? 0;
        const totalColumns = canonical?.classification.total_columns ?? 0;
        const classificationCoverage = canonical?.classification.classification_coverage_pct ?? 0;
        const reviewDate = detail?.privacy_reviewed_at || null;
        const reviewAuthor = detail?.privacy_reviewed_by_user_name || detail?.privacy_reviewed_by_user_email || null;
        const legalBasis = detail?.legal_basis || null;
        const accessScope = detail?.access_scope || null;
        const retentionPolicy = detail?.retention_policy || null;
        const nextReviewAt = detail?.privacy_review_next_at || null;
        const rolesWithAccess = detail?.access_roles ?? [];
        const masked = detail?.is_masked;
        const externalSharing = detail?.external_sharing;
        const reviewed = Boolean(reviewDate);
        const statusLabel = !classified ? "Não classificada" : sensitiveKnown ? "Sensível" : "Classificada";
        const statusTone = !classified ? "warning" : sensitiveKnown ? "danger" : personalKnown ? "warning" : "success";
        const summaryText = !classified
          ? "Este ativo ainda não possui classificação formal de privacidade. Confirme se há dados pessoais ou sensíveis antes de tratá-lo como baixo risco."
          : sensitiveKnown
            ? "Este ativo contém dado sensível e exige controle reforçado de acesso e revisão."
            : personalKnown
              ? "Este ativo contém dado pessoal e precisa manter base legal, finalidade, acesso e revisão atualizados."
              : "Este ativo foi classificado e não possui dado pessoal identificado. Mantenha revisão periódica para confirmar que a estrutura continua válida.";
        const classificationRows: JourneySectionRow[] = [
          { label: "Sensibilidade", value: statusLabel },
          {
            label: "Dado pessoal",
            value: classified ? (personalKnown ? "Sim" : "Sem dado pessoal identificado") : "Não confirmado",
          },
          {
            label: "Dado sensível",
            value: classified ? (sensitiveKnown ? "Sim" : "Sem dado sensível identificado") : "Não confirmado",
          },
          { label: "Status da classificação", value: !classified ? "Pendente de classificação" : statusLabel },
          { label: "Cobertura de classificação", value: totalColumns > 0 ? `${classifiedColumns}/${totalColumns}` : "Sem colunas" },
          { label: "Cobertura %", value: `${classificationCoverage.toFixed(1)}%` },
          { label: "Fonte da classificação", value: UX_COPY.toConfirm },
          { label: "Última alteração de classificação", value: UX_COPY.noHistory },
        ];
        const lgpdRows: JourneySectionRow[] = [
          { label: "Base legal", value: !classified ? "A confirmar" : personalKnown ? legalBasis || "A confirmar" : "Não aplicável" },
          { label: "Finalidade", value: !classified ? "A confirmar" : personalKnown ? detail?.privacy_notes || "A confirmar" : "Não aplicável" },
          { label: "Política de retenção", value: retentionPolicy || UX_COPY.notDefined },
        ];
        const accessRows: JourneySectionRow[] = [
          { label: "Escopo de acesso", value: accessScope || (classified ? UX_COPY.notDefined : UX_COPY.toConfirm) },
          { label: "Roles com acesso", value: rolesWithAccess.length > 0 ? rolesWithAccess.join(" · ") : UX_COPY.toConfirm },
          { label: "Compartilhamento externo", value: externalSharing === true ? "Sim" : externalSharing === false ? (classified ? "Não" : "A confirmar") : "A confirmar" },
          { label: "Mascaramento", value: masked === true ? "Sim" : masked === false ? (classified ? "Não" : "A confirmar") : "A confirmar" },
        ];
        const reviewRows: JourneySectionRow[] = [
          { label: "Última revisão", value: reviewed ? formatDateTime(reviewDate) : UX_COPY.neverReviewed },
          { label: "Revisor", value: detail?.privacy_reviewed_by_user_name || detail?.privacy_reviewed_by_user_email || UX_COPY.toConfirm },
          { label: "Próxima revisão", value: nextReviewAt ? formatDateTime(nextReviewAt) : reviewed ? "Agendar conforme política interna" : "Registrar a primeira revisão" },
          {
            label: "Histórico",
            value: reviewed
              ? `Última revisão por ${reviewAuthor || UX_COPY.toConfirm}${reviewDate ? ` em ${formatDateTime(reviewDate)}` : ""}`
              : "Nenhum evento de revisão registrado para este ativo.",
          },
        ];
        const pendingItems = [
          !classified ? "Classificar sensibilidade do ativo." : null,
          !classified ? "Confirmar se há dado pessoal." : null,
          !classified ? "Definir escopo de acesso." : null,
          !reviewed ? "Registrar a primeira revisão de privacidade." : null,
          classified && personalKnown && !legalBasis ? "Informar base legal e finalidade." : null,
          detail?.data_owner?.is_active === false ? "Reatribuir owner inativo." : null,
        ].filter((item): item is string => Boolean(item));
        const pendingRows = pendingItems.slice(0, 4).map((item) => ({
          key: `privacy-pending-${item}`,
          title: item,
          detail: "Pendência de privacidade",
          meta: "A revisar",
          tone: "warning" as JourneyTone,
          entity_kind: "privacy_pending",
        }));
        const nextStep = !classified
          ? "Classificar o ativo, confirmar presença de dados pessoais e registrar a primeira revisão."
          : sensitiveKnown
            ? "Revisar base legal, finalidade e escopo de acesso com prioridade."
            : personalKnown
              ? "Atualizar base legal, finalidade e manter a revisão de privacidade em dia."
              : "Confirmar que a ausência de dado pessoal continua válida e manter revisão periódica.";
        return {
          title: "Privacidade",
          intro: "Resume classificação de sensibilidade, base legal, acesso e revisão.",
          rows: [
            { label: "Status", value: statusLabel, tone: statusTone },
            { label: "Resumo", value: summaryText },
            ...classificationRows,
            ...lgpdRows,
            ...accessRows,
            ...reviewRows,
            { label: "Pendências principais", value: pendingItems.length > 0 ? pendingItems.slice(0, 4).join(" · ") : "Sem pendências conhecidas" },
            { label: "Próximo passo", value: nextStep },
          ],
          itemsTitle: "Pendências",
          items: pendingRows,
          primaryActionLabel: "Abrir Privacidade",
          primaryActionHref: links.privacy,
          secondaryActionLabel: "Ver histórico",
          secondaryActionHref: "/audit",
        };
    }
    case "incidents": {
      const incidents = correlation?.incidents.items ?? [];
      const openCount = correlation?.incidents.open_count ?? canonical?.evidence.open_incidents ?? 0;
      const criticalCount = correlation?.incidents.critical_open_count ?? canonical?.evidence.critical_open_incidents ?? 0;
      const sourceTypeCounts = incidents.reduce<Record<string, number>>((acc, incident) => {
        const sourceType = incident.source_type?.trim();
        if (!sourceType) return acc;
        acc[sourceType] = (acc[sourceType] || 0) + 1;
        return acc;
      }, {});
      const recurringCount = correlation?.operational_sla?.recurrent_degradation
        ? 1
        : Object.values(sourceTypeCounts).filter((count) => count > 1).length;
      const closedRecentCount = incidents.filter((incident) => isClosedIncidentStatus(incident.status) && isWithinDays(incident.last_seen_at || incident.detected_at, 30)).length;
      const latestTicket = incidents
        .slice()
        .sort((left, right) => Date.parse(right.last_seen_at || right.detected_at || "") - Date.parse(left.last_seen_at || left.detected_at || ""))
        .find(Boolean);
      const hasHistory = incidents.length > 0 || closedRecentCount > 0;
      const stateLabel =
        criticalCount > 0
          ? "Crítico"
          : openCount > 0
            ? "Atenção"
            : recurringCount > 0
              ? "Atenção"
              : closedRecentCount > 0
                ? "Resolvido recentemente"
                : hasHistory
                  ? "Sem histórico"
                  : "Sem incidentes";
      const summaryText =
        criticalCount > 0
          ? "Há incidente crítico aberto. Priorize investigação e mitigação."
          : openCount > 0
            ? "Existem chamados abertos que podem afetar a confiança ou operação deste ativo."
            : recurringCount > 0
              ? "Há sinais recorrentes de incidentes ou degradação operacional."
              : closedRecentCount > 0
                ? "Não há chamados abertos, mas existem incidentes fechados no histórico recente."
                : "Nenhum chamado ativo ou histórico relevante foi encontrado para este ativo.";
      const priorityIncidents = incidents
        .slice()
        .sort((left, right) => {
          const leftOpen = isOpenIncidentStatus(left.status);
          const rightOpen = isOpenIncidentStatus(right.status);
          const leftClosedRecent = isClosedIncidentStatus(left.status) && isWithinDays(left.last_seen_at || left.detected_at, 30);
          const rightClosedRecent = isClosedIncidentStatus(right.status) && isWithinDays(right.last_seen_at || right.detected_at, 30);
          const leftCritical = /critical|cr[ií]tic/i.test(left.severity);
          const rightCritical = /critical|cr[ií]tic/i.test(right.severity);
          const leftScore = Number(leftCritical) * 4 + Number(leftOpen) * 3 + Number(leftClosedRecent) * 2 + Number(Boolean(sourceTypeCounts[left.source_type || ""] > 1));
          const rightScore = Number(rightCritical) * 4 + Number(rightOpen) * 3 + Number(rightClosedRecent) * 2 + Number(Boolean(sourceTypeCounts[right.source_type || ""] > 1));
          if (rightScore !== leftScore) return rightScore - leftScore;
          return Date.parse((right.last_seen_at || right.detected_at || "")) - Date.parse((left.last_seen_at || left.detected_at || ""));
        })
        .slice(0, 3);
      const ticketItems = priorityIncidents.map((incident) => ({
        key: `incident-${incident.id}`,
        id: incident.id,
        title: incident.title,
        detail: `Status: ${presentStatus(incident.status, UX_COPY.toConfirm)} · Severidade: ${presentText(incident.severity_label, UX_COPY.toConfirm)}`,
        meta: [
          incident.source_type ? `Origem: ${incident.source_type}` : `Origem: ${UX_COPY.toConfirm}`,
          incident.last_seen_at ? `Detectado em ${formatDateTime(incident.last_seen_at)}` : `Detectado em ${formatDateTime(incident.detected_at)}`,
          `Responsável: ${UX_COPY.toConfirm}`,
        ].join(" · "),
        tone: statusLabelFromSeverity(incident.severity),
        href: incident.target_url,
        entity_kind: "incident",
      }));
      const slaStatus = correlation?.operational_sla?.status_label || correlation?.operational_sla?.status || null;
      return {
        title: "Incidentes e tickets",
        intro: "Concentra chamados, criticidade, recorrência e histórico operacional.",
        rows: [
          { label: "Status", value: stateLabel },
          { label: "Resumo", value: summaryText },
          { label: "Abertos", value: `${openCount}` },
          { label: "Críticos", value: `${criticalCount}` },
          { label: "Recorrentes", value: `${recurringCount}` },
          { label: "Fechados recentes", value: `${closedRecentCount}` },
          { label: "Último ticket", value: latestTicket ? latestTicket.title : "Nenhum incidente registrado" },
          { label: "Origem principal", value: summarizeList(uniqueStrings(incidents.map((incident) => incident.source_type)), UX_COPY.noHistory) },
          { label: "SLA vencido", value: slaStatus ? presentStatus(slaStatus, UX_COPY.toConfirm) : UX_COPY.toConfirm },
        ],
        itemsTitle: "Tickets principais",
        items: ticketItems,
        emptyTitle: "Nenhum incidente encontrado",
        emptyDescription: "Esse estado é esperado quando não houve incidente recente para o ativo. Se surgir um problema, a fila de incidentes passa a refletir o histórico.",
        primaryActionLabel: "Abrir fila de incidentes",
        primaryActionHref: links.incidents,
        secondaryActionLabel: "Criar chamado",
        secondaryActionHref: correlation?.incident_prefill?.evidence_json ? links.incidents : links.incidents,
      };
    }
    case "ingestion":
      {
        const pipeline = summary.correlation?.ingestion?.primary_pipeline || canonical?.pipeline?.primary_pipeline || null;
        const state = summary.correlation?.ingestion?.state || canonical?.pipeline?.state || pipeline?.latest_status || null;
        const freshnessSeconds = summary.correlation?.dq?.freshness_seconds ?? canonical?.evidence.freshness_seconds ?? null;
        const health = ingestionHealthLabel({
          linked: Boolean(summary.correlation?.ingestion?.linked || canonical?.pipeline?.linked || pipeline),
          state,
          lastSuccessAt: pipeline?.last_success_at || summary.correlation?.stability?.points?.find((point) => point.success)?.occurred_at || null,
          freshnessSeconds,
          operationalSlaStatus: summary.correlation?.operational_sla?.status_label || summary.correlation?.operational_sla?.status || null,
        });
        const primarySuccess = pipeline?.last_success_at || summary.correlation?.stability?.points?.find((point) => point.success)?.occurred_at || null;
        const lastError = pipeline?.last_error || null;
        const freshnessText = freshnessSeconds !== null ? `${freshnessLabel(freshnessSeconds)}${
          summary.correlation?.operational_sla?.sla_hours !== null && summary.correlation?.operational_sla?.sla_hours !== undefined
            ? ` · SLA ${Math.round(summary.correlation.operational_sla.sla_hours / 24)} d`
            : ""
        }` : "Não disponível";
        const freshnessInterpretation =
          freshnessSeconds !== null
            ? !primarySuccess
              ? "Pipeline mapeado, mas nenhuma execução bem-sucedida foi encontrada no histórico operacional."
              : summary.correlation?.operational_sla?.sla_hours !== null && summary.correlation?.operational_sla?.sla_hours !== undefined
                ? freshnessSeconds > summary.correlation.operational_sla.sla_hours * 60 * 60
                  ? `A DAG executou, mas o freshness do dado está atrasado em relação ao SLA esperado.`
                  : "A DAG executou e o freshness do dado está dentro do SLA esperado."
                : "A DAG executou, mas a idade do watermark indica dados antigos."
            : "Freshness indisponível no payload atual.";
        const nextStep =
          !pipeline
            ? "Associar um pipeline operacional ao ativo."
            : !primarySuccess
              ? "Verificar DAG no Airflow e a associação do pipeline."
              : health.label.includes("Atenção")
                ? "Revisar histórico operacional e confirmar se a carga deveria ter executado."
                : health.label === "Falha"
                  ? "Abrir diagnóstico técnico e revisar o último erro."
                  : "Manter acompanhamento de freshness e volume.";
        return {
          title: "Ingestão e freshness",
        intro: "Mostra o pipeline, a atualização operacional e os sinais de atraso ou sucesso.",
          rows: [
            { label: "Status", value: health.label, tone: health.tone },
            { label: "Resumo", value: freshnessInterpretation },
            { label: "Pipeline", value: pipeline?.pipeline_name || "Não mapeado" },
            { label: "DAG", value: pipeline?.dag_id || "Não mapeado" },
            { label: "Task", value: pipeline?.airflow_task_href ? "Disponível" : UX_COPY.toConfirm },
            { label: "Último sucesso", value: primarySuccess ? formatDateTime(primarySuccess) : "Não confirmado" },
            { label: "Idade do watermark", value: freshnessText },
            { label: "Estado técnico", value: ingestionStateLabel(state) },
            { label: "Último erro", value: lastError || "Nenhum erro recente registrado" },
            { label: "Watermark", value: presentText(pipeline?.watermark_value, UX_COPY.toConfirm) },
            { label: "Volume processado", value: pipeline?.rows_processed !== null && pipeline?.rows_processed !== undefined ? formatCompactNumber(pipeline.rows_processed) : UX_COPY.toConfirm },
            { label: "Próximo passo", value: nextStep },
          ],
          items: [],
          primaryActionLabel: "Abrir Ingestion",
          primaryActionHref: links.ingestion,
          secondaryActionLabel: "Abrir Airflow",
          secondaryActionHref: pipeline?.airflow_dag_href || links.ingestion,
        };
      }
    case "lineage": {
      const lineage = canonical?.lineage;
      const upstream = lineage?.upstream ?? [];
      const downstream = lineage?.downstream ?? [];
      const relationSummary =
        upstream.length === 0 && downstream.length === 0
          ? "Linhagem ainda não registrada"
          : upstream.length > 0 && downstream.length === 0
            ? "Linhagem parcial"
            : "Com linhagem";
      const impactLabel = lineageImpactLabel(lineage?.impact?.impact_level || null);
      const relationItems = [
        ...upstream.slice(0, 2).map((asset) => ({ ...asset, direction: "upstream" as const })),
        ...downstream.slice(0, 1).map((asset) => ({ ...asset, direction: "downstream" as const })),
      ].slice(0, 3);
      return {
        title: "Linhagem",
        intro: "Expõe origem, dependências e impacto de mudanças no ativo.",
        rows: [
          { label: "Upstream", value: `${upstream.length}` },
          { label: "Downstream", value: `${downstream.length}` },
          { label: "Processos", value: `${lineage?.related_processes.length ?? 0}` },
          { label: "Dashboards impactados", value: `${lineage?.related_dashboards.length ?? 0}` },
          { label: "Impacto estimado", value: impactLabel },
          { label: "Leitura", value: relationSummary },
        ],
        itemsTitle: "Principais relações",
        items: relationItems.map((asset) => ({
          key: `${asset.direction}-${asset.asset_key}-${asset.catalog_table_id ?? asset.id ?? asset.asset_name}`,
          id: asset.catalog_table_id ?? asset.id ?? undefined,
          title: asset.asset_name,
          detail: [
            asset.direction === "upstream" ? "Origem upstream" : "Consumo downstream",
            artifactTypeLabel(asset.asset_type),
            asset.layer && asset.layer !== "definir" ? asset.layer : "Camada não informada",
          ]
            .filter(Boolean)
            .join(" · "),
          meta:
            asset.system_name || asset.schema_name
              ? [
                  asset.system_name ? `Fonte ${asset.system_name.split("://").pop() || asset.system_name}` : null,
                  asset.schema_name ? `Schema ${asset.schema_name}` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")
              : asset.asset_key,
          tone: asset.asset_origin === "automatic" ? "accent" : "neutral",
          direction: asset.direction,
          entity_kind: asset.asset_type,
        })),
        emptyTitle: "Linhagem ainda não mapeada",
        emptyDescription: "Isso pode ser esperado em ativos novos ou recém sincronizados. O próximo passo é confirmar origem, transformações e consumidores.",
        primaryActionLabel: "Abrir Linhagem",
        primaryActionHref: links.lineage,
        secondaryActionLabel: "Ver impacto",
        secondaryActionHref: links.lineage,
      };
    }
    case "consumption": {
      const artifacts = [...(metabase?.dashboards ?? []), ...(metabase?.questions ?? []), ...(metabase?.collections ?? [])];
      const confirmed = metabase?.confirmed_count ?? 0;
      const partial = metabase?.partial_count ?? 0;
      const total = artifacts.length;
      const consumptionSummary =
        total === 0
          ? "Sem consumo identificado"
          : confirmed > 0
            ? "Vínculos confirmados"
            : partial > 0
              ? "Consumo parcial"
              : "Consumo não confirmado";
      return {
        title: "Consumo analítico",
        intro: "Aponta dashboards, questions e coleções que usam ou parecem usar a tabela.",
        rows: [
          { label: "Artefatos encontrados", value: `${total}` },
          { label: "Dashboards", value: `${metabase?.dashboards_count ?? 0}` },
          { label: "Questions", value: `${metabase?.questions_count ?? 0}` },
          { label: "Coleções", value: `${metabase?.collections_count ?? 0}` },
          { label: "Vínculos confirmados", value: `${confirmed}` },
          { label: "Vínculos parciais", value: `${partial}` },
          { label: "Última sync", value: metabase?.last_sync_at ? formatDateTime(metabase.last_sync_at) : UX_COPY.noHistory },
          { label: "Leitura", value: consumptionSummary },
        ],
        itemsTitle: "Principais artefatos",
        items: artifacts.slice(0, 3).map((artifact) => ({
          key: `${artifact.object_type}-${artifact.object_id}`,
          id: artifact.object_id,
          title: artifact.title,
          detail: `${artifactTypeLabel(artifact.object_type)} · ${artifact.match_method === "direct" ? "vínculo confirmado" : "vínculo parcial"}`,
          meta: artifact.match_method === "direct" ? "Confirmado" : "Parcial",
          tone: artifact.match_method === "direct" ? "success" : "warning",
          href: artifact.url || undefined,
          entity_kind: artifact.object_type,
        })),
        emptyTitle: "Nenhum consumo identificado",
        emptyDescription: "Esse estado pode ser esperado para ativos novos ou de backend. Se houver uso analítico, o próximo passo é validar a sincronização com o Metabase.",
        primaryActionLabel: "Abrir Metabase",
        primaryActionHref: links.metabase,
        secondaryActionLabel: "Ver artefatos",
        secondaryActionHref: links.metabase,
      };
    }
    case "dataLake":
      if (!dataLake) {
        return {
          title: "Data Lake",
          intro: "Mostra se a tabela também tem trilha física inventariada no Data Lake.",
          rows: [{ label: "Vínculo físico", value: UX_COPY.noLink }],
          items: [],
          emptyTitle: "Sem vínculo com o Data Lake",
          emptyDescription:
            "Este ativo não possui caminho físico associado no inventário do Data Lake. Isso pode ser esperado para tabelas relacionais ou ativos que ainda não foram mapeados para o lake.",
          primaryActionLabel: "Abrir Datalakes Explorer",
          primaryActionHref: "/datalakes",
        };
      }
      return {
        title: "Data Lake",
        intro: "Mostra se a tabela também tem trilha física inventariada no Data Lake.",
        rows: [
          { label: "Vínculo físico", value: dataLake.inventory?.layer || "Inventariado" },
          { label: "Conexão", value: presentText(dataLake.connection_name) },
          { label: "Bucket", value: presentText(dataLake.bucket) },
          { label: "Path", value: dataLake.prefix || "Sem prefixo" },
          { label: "Arquivos", value: `${dataLake.sample_files.length}` },
          { label: "Variações de schema", value: `${dataLake.schema_variants_count}` },
          { label: "Row count", value: dataLake.row_count !== null ? formatCompactNumber(dataLake.row_count) : UX_COPY.notAvailable },
          { label: "Freshness", value: dataLake.freshness_age_hours !== null ? `${dataLake.freshness_age_hours.toFixed(1)}h` : UX_COPY.toConfirm },
        ],
        itemsTitle: "Arquivos principais",
        items: dataLake.sample_files.slice(0, 3).map((file) => ({
          key: `lake-file-${file.key}`,
          id: file.key,
          title: file.key,
          detail: `${file.schema_signature || "schema não identificado"} · ${file.row_count !== null ? `${file.row_count} linhas` : "linhas indisponíveis"}`,
          meta: file.last_modified_at ? formatDateTime(file.last_modified_at) : "Última modificação não disponível",
          tone: dataLake.freshness_status ? getToneForStatus(dataLake.freshness_status) : "neutral",
          entity_kind: "lake_file",
        })),
        emptyTitle: dataLake.sample_files.length === 0 ? "Inventário sem amostra de arquivos" : undefined,
        emptyDescription:
          dataLake.sample_files.length === 0
            ? "O inventário físico existe, mas ainda não retornou amostras para esta tabela. Vale revisar a conexão ou aguardar a próxima leitura."
            : undefined,
        primaryActionLabel: "Abrir Datalakes Explorer",
        primaryActionHref: "/datalakes",
        secondaryActionLabel: "Ver detalhe no lake",
        secondaryActionHref: links.dataLake,
      };
    case "actions":
      return {
        title: "Próximas ações recomendadas",
        intro: "Lista os próximos passos priorizados para melhorar confiança, governança e operação do ativo.",
        rows: recommendedActions.length
          ? [
              { label: "Ações sugeridas", value: `${recommendedActions.length}` },
              { label: "Leitura", value: "Pendências reais priorizadas" },
            ]
          : [],
        itemsTitle: "Ações priorizadas",
        items: recommendedActions.slice(0, 5).map((action) => ({
          key: action.label,
          title: action.label,
          detail: action.description,
          meta:
            action.tone === "danger"
              ? "Crítico"
              : action.tone === "warning"
                ? "Atenção"
                : action.tone === "accent"
                  ? "Recomendado"
                  : "Informativo",
          tone: action.tone,
          href: action.href,
          entity_kind: "recommended_action",
        })),
        emptyTitle: "Sem ações urgentes",
        emptyDescription: "Nenhuma pendência relevante foi identificada para este ativo no momento.",
        primaryActionLabel: "Abrir Explorer",
        primaryActionHref: links.explorer,
        secondaryActionLabel: "Abrir Incidentes",
        secondaryActionHref: links.incidents,
      };
    default:
      return {
        title: "Jornada",
        intro: "Resumo executivo para confirmar se você está olhando a tabela correta.",
        rows: [],
        items: [],
      };
  }
}
