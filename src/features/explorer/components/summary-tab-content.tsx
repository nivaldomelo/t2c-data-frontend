import { useEffect, useRef, useState } from "react";
import { AlertTriangle, BookOpen, Clock3, FileText, KeyRound, ListChecks, Shield, Table as TableIcon, Tags as TagsIcon, Workflow } from "lucide-react";

import {
  CertificationCriticalityBadge,
  CertificationStatusBadge,
  CertificationUsageBadge,
  certificationStatusFrameClass,
  certificationStatusHeaderClass,
} from "@/components/certification/certification-badge";
import { AssetCorrelationCard } from "@/components/asset-correlation-card";
import { AccessRoleBadges, PrivacySummaryStrip } from "@/components/privacy/privacy-badge";
import { ContextualJourneyCard, type ContextualJourneyLink } from "@/components/navigation/contextual-journey-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";
import { dbEngineMeta } from "@/lib/database-engine";
import type { DQUserOption } from "@/features/data-quality/types";
import { useExplorerDebugLayout, useExplorerDebugLifecycle } from "@/features/explorer/debug";

import { Link } from "@/lib/next-shims";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/client-api";
import { TableDescriptionCard } from "@/components/catalog/table-description-card";

import type { ExplorerSummaryStat, ExplorerSummaryTabContentProps } from "./summary-tab-types";
import {
  EXPLORER_SUMMARY_COPY,
  collaborationHref,
  governanceToneClasses,
  stewardshipHref,
  trustTone,
} from "./summary-tab-helpers";
import {
  formatCompactNumber,
  formatDateTime,
  formatDuration,
  freshnessLabel,
  ingestionStatusTone,
  formatMetabaseImpactAssetType,
  formatMetabaseImpactConfidence,
  formatMetabaseImpactDependencyType,
  formatMetabaseImpactRisk,
  pctBadgeTone,
  preferredColumnDescription,
  formatInteger,
  formatPercent,
  formatRowCountMethod,
  formatSignedInteger,
  metabaseImpactRiskTone,
  tableKindLabel,
} from "../utils";

function SectionEyebrow({ label }: { label: string }) {
  return <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">{label}</p>;
}

function StewardEditor({
  tableId,
  hasSteward,
  onChanged,
}: {
  tableId: number;
  hasSteward: boolean;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<DQUserOption[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    const term = query.trim();
    if (!term) {
      setOptions([]);
      setSearching(false);
      return;
    }
    let active = true;
    setSearching(true);
    const timeout = window.setTimeout(() => {
      void (async () => {
        try {
          const data = await apiRequest<DQUserOption[]>(`/v1/dq/users?q=${encodeURIComponent(term)}&limit=20`);
          if (active) setOptions(data);
        } catch {
          if (active) {
            setOptions([]);
            setError("Não foi possível buscar usuários agora.");
          }
        } finally {
          if (active) setSearching(false);
        }
      })();
    }, 250);
    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [open, query]);

  async function patchSteward(stewardUserId: number | null) {
    setSaving(true);
    setError("");
    try {
      await apiRequest(`/v1/catalog/tables/${tableId}`, {
        method: "PATCH",
        body: JSON.stringify({ steward_user_id: stewardUserId }),
      });
      setOpen(false);
      setQuery("");
      setOptions([]);
      onChanged();
    } catch {
      setError("Não foi possível atualizar o steward agora.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-3 space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setOpen((prev) => !prev)} size="sm" variant="outline" disabled={saving}>
          {hasSteward ? "Alterar steward" : "Definir steward"}
        </Button>
        {hasSteward ? (
          <Button onClick={() => void patchSteward(null)} size="sm" variant="outline" disabled={saving}>
            Remover
          </Button>
        ) : null}
      </div>
      {open ? (
        <div className="space-y-2">
          <Input
            autoFocus
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar usuário por nome ou e-mail"
            value={query}
          />
          {searching ? <p className="text-xs text-muted">Buscando…</p> : null}
          {!searching && query.trim() && options.length === 0 ? (
            <p className="text-xs text-muted">Nenhum usuário encontrado.</p>
          ) : null}
          {options.length ? (
            <ul className="max-h-48 space-y-1 overflow-y-auto rounded-2xl border border-border/80 bg-surface p-1 shadow-sm">
              {options.map((option) => (
                <li key={option.id}>
                  <button
                    className="w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-bg-subtle disabled:opacity-60"
                    disabled={saving}
                    onClick={() => void patchSteward(option.id)}
                    type="button"
                  >
                    <span className="block font-medium text-text">{option.display_name}</span>
                    <span className="block text-xs text-muted">{option.email}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
      {error ? <p className="text-xs text-danger-600">{error}</p> : null}
    </div>
  );
}

export type { ExplorerSummaryStat };

export function ExplorerSummaryTabContent({
  canEdit,
  canOpenStewardshipRequests,
  columnCounts,
  dictionaryCoveragePct,
  dqLatest,
  dqMessage,
  dqState,
  glossaryCoveragePct,
  ingestionError,
  ingestionExecutions,
  ingestionLoading,
  ingestionSummary,
  onOpenIngestionLogs,
  onAutoOpenIncident,
  autoOpening,
  onRerunProfiling,
  profilingRerunLoading,
  onReprocessDatasourceScan,
  scanReprocessLoading,
  onConfirmOwnerReview,
  onConfirmPrivacyReview,
  owner,
  ownerArea,
  ownerEmail,
  selectedDatabaseName,
  selectedDbType,
  selectedSchemaName,
  selectedTableFullName,
  selectedTableKind,
  summaryColumnsPreview,
  summaryStats,
  onTableDescriptionSaved,
  onStewardChanged,
  stewardshipRequests,
  stewardshipLoading,
  stewardshipError,
  tableDescription,
  tableInfo,
  tableTags,
  tableTerms,
  correlationSummary,
  correlationLoading,
  correlationError,
  canonicalAssetLoading,
  canonicalAssetError,
  canonicalAsset,
  operationalContext,
  operationalLoading,
  operationalError,
}: ExplorerSummaryTabContentProps) {
  const [showExtendedPanels, setShowExtendedPanels] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const primaryPipeline = ingestionSummary?.primary_pipeline ?? null;
  const executionItems = ingestionExecutions?.items ?? [];
  const hasExecutions = Boolean(ingestionExecutions?.items?.length);
  const latestExecution = executionItems[0] ?? null;
  const canonicalTags = canonicalAsset?.tags ?? [];
  const canonicalTerms = canonicalAsset?.terms ?? [];
  const canonicalRecentEvents = canonicalAsset?.recent_events ?? [];
  const canonicalColumns = canonicalAsset?.columns ?? [];
  const openIncidentCount = operationalContext?.open_incidents ?? 0;
  const metabaseImpact = tableInfo?.metabase_impact ?? null;
  const metabaseImpactDependencies = metabaseImpact?.dependencies ?? [];
  const metabaseVisibleDependencies = metabaseImpactDependencies.slice(0, 5);
  const dqNeedsAttention = Boolean(dqLatest && (dqLatest.dq_score < 90 || dqLatest.failed_rules > 0));
  const hasOperationalFailure = Boolean(
    primaryPipeline && (primaryPipeline.latest_status_label === "Falha" || primaryPipeline.last_error),
  );
  const shouldShowCorrelationStrip = openIncidentCount > 0 || dqNeedsAttention || hasOperationalFailure;
  const selectedTableNameParts = selectedTableFullName.split(".");
  const selectedDatasourceName = selectedTableNameParts.length >= 4 ? selectedTableNameParts[0] : "";
  const selectedDatabaseNameFromFullName = selectedTableNameParts.length >= 4 ? selectedTableNameParts[1] : "";
  const selectedSchemaNameFromFullName = selectedTableNameParts.length >= 4 ? selectedTableNameParts[2] : "";
  const selectedTableNameFromFullName =
    selectedTableNameParts.length >= 4 ? selectedTableNameParts[3] : selectedTableNameParts[selectedTableNameParts.length - 1] || selectedTableFullName;
  const collaborationEntityLabel = canonicalAsset?.table_fqn || selectedTableFullName || tableInfo?.owner || "Ativo";
  const stewardshipActions =
    canOpenStewardshipRequests && tableInfo
      ? [
          !tableDescription
            ? {
                key: "table_description",
                label: "Solicitar descrição",
                href: stewardshipHref({
                  tableId: tableInfo.id,
                  requestType: "table_description",
                  tableName: selectedTableNameFromFullName || selectedTableFullName,
                  schemaName: selectedSchemaNameFromFullName || selectedSchemaName,
                  databaseName: selectedDatabaseNameFromFullName || selectedDatabaseName,
                  datasourceName: selectedDatasourceName,
                }),
              }
            : null,
          !tableInfo.data_owner_id
            ? {
                key: "owner_assignment",
                label: "Solicitar owner",
                href: stewardshipHref({
                  tableId: tableInfo.id,
                  requestType: "owner_assignment",
                  tableName: selectedTableNameFromFullName || selectedTableFullName,
                  schemaName: selectedSchemaNameFromFullName || selectedSchemaName,
                  databaseName: selectedDatabaseNameFromFullName || selectedDatabaseName,
                  datasourceName: selectedDatasourceName,
                }),
              }
            : null,
          tableTerms.length === 0
            ? {
                key: "glossary_terms",
                label: "Solicitar termos",
                href: stewardshipHref({
                  tableId: tableInfo.id,
                  requestType: "glossary_terms",
                  tableName: selectedTableNameFromFullName || selectedTableFullName,
                  schemaName: selectedSchemaNameFromFullName || selectedSchemaName,
                  databaseName: selectedDatabaseNameFromFullName || selectedDatabaseName,
                  datasourceName: selectedDatasourceName,
                }),
              }
            : null,
          operationalContext?.eligible_for_certification && operationalContext.certification_status !== "certified"
            ? {
                key: "certification_review",
                label: "Solicitar certificação",
                href: stewardshipHref({
                  tableId: tableInfo.id,
                  requestType: "certification_review",
                  tableName: selectedTableNameFromFullName || selectedTableFullName,
                  schemaName: selectedSchemaNameFromFullName || selectedSchemaName,
                  databaseName: selectedDatabaseNameFromFullName || selectedDatabaseName,
                  datasourceName: selectedDatasourceName,
                }),
              }
            : null,
          operationalContext?.owner_review_due
            ? {
                key: "owner_review",
                label: "Abrir revisão de owner",
                href: stewardshipHref({
                  tableId: tableInfo.id,
                  requestType: "owner_review",
                  tableName: selectedTableNameFromFullName || selectedTableFullName,
                  schemaName: selectedSchemaNameFromFullName || selectedSchemaName,
                  databaseName: selectedDatabaseNameFromFullName || selectedDatabaseName,
                  datasourceName: selectedDatasourceName,
                }),
              }
            : null,
          operationalContext?.privacy_review_due
            ? {
                key: "privacy_review",
                label: "Abrir revisão de privacidade",
                href: stewardshipHref({
                  tableId: tableInfo.id,
                  requestType: "privacy_review",
                  tableName: selectedTableNameFromFullName || selectedTableFullName,
                  schemaName: selectedSchemaNameFromFullName || selectedSchemaName,
                  databaseName: selectedDatabaseNameFromFullName || selectedDatabaseName,
                  datasourceName: selectedDatasourceName,
                }),
              }
            : null,
          operationalContext?.certification_review_due
            ? {
                key: "certification_review_due",
                label: "Solicitar revalidação",
                href: stewardshipHref({
                  tableId: tableInfo.id,
                  requestType: "certification_review",
                  tableName: selectedTableNameFromFullName || selectedTableFullName,
                  schemaName: selectedSchemaNameFromFullName || selectedSchemaName,
                  databaseName: selectedDatabaseNameFromFullName || selectedDatabaseName,
                  datasourceName: selectedDatasourceName,
                }),
              }
            : null,
        ].filter((action): action is { key: string; label: string; href: string } => Boolean(action))
      : [];
  const journeyLinks = [
    canonicalAsset?.links?.data_quality
      ? {
          label: "Data Quality",
          href: canonicalAsset.links.data_quality,
          description: EXPLORER_SUMMARY_COPY.journeys.links.dataQuality,
          tone: "success" as const,
        }
      : null,
    canonicalAsset?.links?.incidents || operationalContext?.links?.incidents
      ? {
          label: "Incidentes",
          href: canonicalAsset?.links?.incidents || operationalContext?.links?.incidents || "/incidents",
          description: EXPLORER_SUMMARY_COPY.journeys.links.incidents,
          tone: "warning" as const,
        }
      : null,
    canonicalAsset?.links?.lineage || operationalContext?.links?.lineage
      ? {
          label: "Linhagem",
          href: canonicalAsset?.links?.lineage || operationalContext?.links?.lineage || "/lineage",
          description: EXPLORER_SUMMARY_COPY.journeys.links.lineage,
          tone: "accent" as const,
        }
      : null,
    canonicalAsset?.links?.metabase_consumption || operationalContext?.links?.metabase_consumption
      ? {
          label: "Consumo no Metabase",
          href: canonicalAsset?.links?.metabase_consumption || operationalContext?.links?.metabase_consumption || "/explorer",
          description: EXPLORER_SUMMARY_COPY.journeys.links.metabase,
          tone: "neutral" as const,
        }
      : null,
    canonicalAsset?.links?.certification || operationalContext?.links?.certification
      ? {
          label: "Certificação",
          href: canonicalAsset?.links?.certification || operationalContext?.links?.certification || "/certification",
          description: EXPLORER_SUMMARY_COPY.journeys.links.certification,
          tone: "neutral" as const,
        }
      : null,
    canonicalAsset?.links?.change_management || operationalContext?.links?.change_management
      ? {
          label: "Mudanças e SLA",
          href: canonicalAsset?.links?.change_management || operationalContext?.links?.change_management || "/governance/change-management",
          description: EXPLORER_SUMMARY_COPY.journeys.links.changeManagement,
          tone: "warning" as const,
        }
      : null,
    tableInfo
      ? {
          label: "Colaboração",
          href: collaborationHref({ tableId: tableInfo.id, entityLabel: collaborationEntityLabel }),
          description: EXPLORER_SUMMARY_COPY.journeys.links.collaboration,
          tone: "accent" as const,
        }
      : null,
  ].filter(Boolean) as ContextualJourneyLink[];

  useExplorerDebugLifecycle("ExplorerSummaryTabContent", {
    selectedTableId: tableInfo?.id ?? null,
    showExtendedPanels,
    dqState,
    ingestionLoading,
    stewardshipLoading,
    correlationLoading,
    canonicalAssetLoading,
    operationalLoading,
  });
  useExplorerDebugLayout("ExplorerSummaryTabContent", rootRef, {
    selectedTableId: tableInfo?.id ?? null,
    showExtendedPanels,
    dqState,
    ingestionLoading,
    stewardshipLoading,
    correlationLoading,
    canonicalAssetLoading,
    operationalLoading,
  });

  return (
    <div ref={rootRef} className="space-y-6">
      <div className="rounded-2xl border border-border/80 bg-surface px-4 py-3 shadow-card">
        <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-text-body">
          <span className="rounded-full border border-border/70 bg-bg-subtle/80 px-2.5 py-1">Contexto do ativo</span>
          <span className="rounded-full border border-border/70 bg-bg-subtle/80 px-2.5 py-1">Governança</span>
          <span className="rounded-full border border-border/70 bg-bg-subtle/80 px-2.5 py-1">Qualidade</span>
          <span className="rounded-full border border-border/70 bg-bg-subtle/80 px-2.5 py-1">Operação</span>
          <span className="rounded-full border border-border/70 bg-bg-subtle/80 px-2.5 py-1">Timeline</span>
        </div>
      </div>

      <ContextualJourneyCard
        description={EXPLORER_SUMMARY_COPY.journeys.description}
        links={journeyLinks}
        title="Próximos passos"
      />

      <div className="space-y-6">
        <div className="space-y-6">
      {canonicalAssetLoading ? <Skeleton className="h-64 w-full" /> : null}
      {!canonicalAssetLoading && canonicalAssetError ? (
        <EmptyState
          className="shadow-none"
          title="Não foi possível carregar o núcleo canônico"
          description={canonicalAssetError}
        />
      ) : null}
      {!canonicalAssetLoading && !canonicalAssetError && canonicalAsset ? (
        <Card className="border-warning-200/80 bg-gradient-to-br from-warning-50/80 via-white to-white shadow-card">
          <CardContent className="space-y-4 p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <SectionEyebrow label="Núcleo canônico" />
                <h4 className="mt-2 text-lg font-semibold text-text">Ativo canônico do catálogo</h4>
                <p className="mt-1 text-sm text-text-body">{EXPLORER_SUMMARY_COPY.canonical.description}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge tone="neutral">{canonicalAsset.entity_kind === "column" ? "Coluna" : "Tabela"}</Badge>
                <Badge tone={canonicalAsset.classification.certification_status === "certified" ? "success" : "accent"}>
                  {canonicalAsset.classification.certification_status_label}
                </Badge>
                <Badge tone={canonicalAsset.evidence.active_dq_violation ? "danger" : "neutral"}>
                  {canonicalAsset.evidence.active_dq_violation ? "DQ ativa" : "DQ estável"}
                </Badge>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-border/80 bg-surface p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Identidade</p>
                <p className="mt-2 text-sm font-semibold text-text">{canonicalAsset.display_name}</p>
                <p className="mt-1 text-sm text-text-body">{canonicalAsset.table_fqn}</p>
              </div>
              <div className="rounded-2xl border border-border/80 bg-surface p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Fonte</p>
                <p className="mt-2 text-sm font-semibold text-text">{canonicalAsset.source.datasource_name}</p>
                <p className="mt-1 text-sm text-text-body">
                  {canonicalAsset.source.database_name} · {canonicalAsset.source.schema_name}
                </p>
              </div>
              <div className="rounded-2xl border border-border/80 bg-surface p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Owner</p>
                <p className="mt-2 text-sm font-semibold text-text">{canonicalAsset.owner.owner_name || "Não definido"}</p>
                <p className="mt-1 text-sm text-text-body">
                  {canonicalAsset.owner.owner_email || "Sem e-mail"}{canonicalAsset.owner.owner_defined ? " · definido" : " · pendente"}
                </p>
              </div>
              <div className="rounded-2xl border border-border/80 bg-surface p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Confiança</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-text">{canonicalAsset.classification.trust_label || "Sem leitura"}</p>
                  {canonicalAsset.classification.trust_score !== null ? (
                    <Badge tone={trustTone(canonicalAsset.classification.trust_tone)}>
                      {canonicalAsset.classification.trust_score}
                    </Badge>
                  ) : null}
                </div>
                <p className="mt-1 text-sm text-text-body">
                  Prontidão {canonicalAsset.classification.readiness_score}% · DQ {canonicalAsset.evidence.dq_score ?? "-"}
                </p>
                <p className="mt-2 text-xs leading-5 text-muted">{EXPLORER_SUMMARY_COPY.canonical.readiness}</p>
                {canonicalAsset.evidence.trust_summary ? (
                  <p className="mt-2 text-xs leading-5 text-muted">{canonicalAsset.evidence.trust_summary}</p>
                ) : null}
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4 shadow-sm">
                <p className="text-sm font-semibold text-text">Sinais compartilhados</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {canonicalTags.slice(0, 6).map((tag) => (
                    <Badge key={tag.id} tone={tag.review_status === "blocked" ? "neutral" : tag.applied_automatically ? "accent" : "success"}>
                      {tag.name}
                    </Badge>
                  ))}
                  {canonicalTerms.slice(0, 4).map((term) => (
                    <Badge key={term.id} tone="neutral">
                      {term.name}
                    </Badge>
                  ))}
                </div>
                <div className="mt-4 grid gap-2 md:grid-cols-2">
                  <div className="rounded-2xl border border-border/70 bg-surface p-3 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Evidência</p>
                    <p className="mt-2 text-sm text-text-body">
                      {canonicalAsset.evidence.description_complete ? "Descrição pronta" : "Descrição pendente"} ·{" "}
                      {canonicalAsset.evidence.dictionary_complete ? "Dicionário completo" : "Dicionário parcial"}
                    </p>
                    <p className="mt-1 text-sm text-text-body">
                      Incidentes abertos: {canonicalAsset.evidence.open_incidents} · Críticos: {canonicalAsset.evidence.critical_open_incidents}
                    </p>
                    <p className="mt-2 text-xs leading-5 text-muted">{EXPLORER_SUMMARY_COPY.canonical.evidence}</p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-surface p-3 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Linhagem</p>
                    <p className="mt-2 text-sm text-text-body">
                      {canonicalAsset.lineage?.impact.upstream_count ?? 0} upstream · {canonicalAsset.lineage?.impact.downstream_count ?? 0} downstream
                    </p>
                    <p className="mt-1 text-sm text-text-body">
                      {canonicalAsset.lineage?.impact.impact_level || "Impacto não avaliado"}
                    </p>
                    <p className="mt-2 text-xs leading-5 text-muted">{EXPLORER_SUMMARY_COPY.canonical.lineage}</p>
                  </div>
                </div>
              </div>

                <div className="rounded-2xl border border-border/80 bg-surface p-4 shadow-sm">
                  <p className="text-sm font-semibold text-text">Colunas-filho</p>
                  <div className="mt-3 space-y-2">
                  {canonicalColumns.slice(0, 5).map((column) => (
                    <div className="rounded-2xl border border-border/70 bg-bg-subtle/80 px-3 py-2 shadow-sm" key={column.id}>
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-medium text-text">{column.name}</p>
                        <span className="text-[11px] font-medium text-muted">{column.data_type}</span>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {column.description_complete ? <Badge tone="success">Documentada</Badge> : <Badge tone="warning">Pendente</Badge>}
                        {column.tags.slice(0, 2).map((tag) => (
                          <Badge key={`${column.id}-${tag.id}`} tone={tag.applied_automatically ? "accent" : "neutral"}>
                            {tag.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                  {canonicalColumns.length === 0 ? (
                    <p className="text-sm text-muted">A coluna selecionada não expõe filhos próprios neste momento.</p>
                  ) : null}
                  </div>
                </div>
              </div>

              {canonicalAsset.pipeline ? (
                <div className="rounded-2xl border border-border/80 bg-surface p-4 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-text">Pipeline canônico</p>
                      <p className="mt-1 text-sm text-text-body">
                        {canonicalAsset.pipeline.message || "Pipeline operacional consolidado para este ativo, usado para manter a tabela atualizada e rastreável."}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge tone={canonicalAsset.pipeline.linked ? "success" : "warning"}>
                        {canonicalAsset.pipeline.linked ? "Vinculado" : "Não vinculado"}
                      </Badge>
                      {canonicalAsset.pipeline.primary_pipeline?.latest_status_label ? (
                        <Badge tone={ingestionStatusTone(canonicalAsset.pipeline.primary_pipeline.latest_status_label)}>
                          {canonicalAsset.pipeline.primary_pipeline.latest_status_label}
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl border border-border/70 bg-bg-subtle/80 p-3 shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Pipeline de origem</p>
                      <p className="mt-2 text-sm font-semibold text-text">
                        {canonicalAsset.pipeline.primary_pipeline?.pipeline_name || "Pipeline sem nome"}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        DAG: {canonicalAsset.pipeline.primary_pipeline?.dag_id || "-"} · Task principal: {canonicalAsset.pipeline.primary_pipeline?.task_name || "-"}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-border/70 bg-bg-subtle/80 p-3 shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Execução</p>
                      <p className="mt-2 text-sm font-semibold text-text">
                        {formatDateTime(canonicalAsset.pipeline.primary_pipeline?.last_execution_finished_at || canonicalAsset.pipeline.primary_pipeline?.last_execution_started_at)}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        Último sucesso: {formatDateTime(canonicalAsset.pipeline.primary_pipeline?.last_success_at)}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-border/70 bg-bg-subtle/80 p-3 shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Estabilidade</p>
                      <p className="mt-2 text-sm font-semibold text-text">
                        {canonicalAsset.pipeline.stability
                          ? `${canonicalAsset.pipeline.stability.success_rate_pct}% de sucesso`
                          : "Sem estabilidade consolidada"}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        {canonicalAsset.pipeline.stability?.currently_stale ? "Pipeline com atraso" : "Pipeline estável"}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-border/70 bg-bg-subtle/80 p-3 shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Execuções recentes</p>
                      <p className="mt-2 text-sm font-semibold text-text">
                        {canonicalAsset.pipeline.stability?.window_runs ?? canonicalAsset.pipeline.pipeline_count} execução(ões)
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        {canonicalAsset.pipeline.stability?.failed_runs ?? 0} falha(s) na janela
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

            {canonicalRecentEvents.length ? (
              <div className="rounded-2xl border border-border/80 bg-surface p-4 shadow-sm">
                <p className="text-sm font-semibold text-text">Eventos de governança recentes</p>
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  {canonicalRecentEvents.slice(0, 4).map((event) => (
                    <div className="rounded-2xl border border-border/70 bg-bg-subtle/80 px-3 py-2 shadow-sm" key={event.id}>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={event.category === "operation" ? "accent" : event.category === "classification" ? "success" : "neutral"}>
                          {event.category === "operation" ? "Operação" : event.category === "classification" ? "Classificação" : "Auditoria"}
                        </Badge>
                        <p className="text-sm font-medium text-text">{event.label}</p>
                      </div>
                      <p className="mt-1 text-xs text-muted">{event.source} · {formatDateTime(event.created_at)}</p>
                      {event.detail ? <p className="mt-1 text-xs text-text-body">{event.detail}</p> : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <Card className="border-border/80 bg-surface shadow-card">
        <CardContent className="space-y-4 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <SectionEyebrow label="Prioridades de governança" />
              <h4 className="mt-2 text-lg font-semibold text-text">O que fazer agora neste ativo</h4>
              <p className="mt-1 text-sm text-text-body">{EXPLORER_SUMMARY_COPY.governance.description}</p>
            </div>
            {operationalContext ? (
              <Badge tone="neutral">
                {operationalContext.criticality_label} · {operationalContext.criticality_score} pts
              </Badge>
            ) : null}
          </div>
          {operationalLoading ? <Skeleton className="h-24 w-full" /> : null}
          {!operationalLoading && operationalError ? (
            <EmptyState
              className="shadow-none"
              title="Não foi possível montar as ações prioritárias"
              description={operationalError}
            />
          ) : null}
          {!operationalLoading && !operationalError && operationalContext ? (
            <>
              <div className="grid gap-3 lg:grid-cols-2">
                {operationalContext.actions.map((action) => (
                  <div className="rounded-2xl border border-border/70 bg-bg-subtle/80 p-4 shadow-sm" key={action.key}>
                    <p className="text-sm font-semibold text-text">{action.label}</p>
                    <p className="mt-1 text-sm text-text-body">{action.description}</p>
                    <div className="mt-3">
                      <Button asChild size="sm" variant="outline">
                        <Link href={action.href}>Abrir no stewardship</Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild size="sm" variant="outline"><Link href={operationalContext.links.incidents}>Incidentes</Link></Button>
              <Button asChild size="sm" variant="outline"><Link href={operationalContext.links.data_quality}>Qualidade de dados</Link></Button>
              <Button asChild size="sm" variant="outline"><Link href={operationalContext.links.certification}>Certificação</Link></Button>
              <Button asChild size="sm" variant="outline"><Link href={operationalContext.links.privacy}>Privacidade</Link></Button>
              <Button asChild size="sm" variant="outline">
                <Link href={tableInfo ? collaborationHref({ tableId: tableInfo.id, entityLabel: collaborationEntityLabel }) : "/governance/collaboration"}>
                  Colaboração
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href={tableInfo ? `/governance/timeline?table_id=${tableInfo.id}` : operationalContext.links.audit}>Timeline</Link>
              </Button>
                <Button asChild size="sm" variant="outline"><Link href={operationalContext.links.owners}>Responsáveis</Link></Button>
                {operationalContext.owner_review_due ? (
                  <Button onClick={onConfirmOwnerReview} size="sm" variant="outline">Confirmar revisão de owner</Button>
                ) : null}
                {operationalContext.privacy_review_due ? (
                  <Button onClick={onConfirmPrivacyReview} size="sm" variant="outline">Confirmar revisão de privacidade</Button>
                ) : null}
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>

      {correlationLoading ? <Skeleton className="h-44 w-full" /> : null}
      {!correlationLoading && correlationError ? null : correlationSummary ? (
        <Card className="border-border/80 bg-surface shadow-card">
          <CardContent className="space-y-4 p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <SectionEyebrow label="Governança consolidada" />
                <h4 className="mt-2 text-lg font-semibold text-text">Maturidade consolidada do ativo</h4>
                <p className="mt-1 text-sm text-text-body">{correlationSummary.governance_score.summary}</p>
                <p className="mt-2 text-xs leading-5 text-muted">{EXPLORER_SUMMARY_COPY.operational.correlation}</p>
              </div>
              <div className={`rounded-2xl border px-4 py-3 ${governanceToneClasses(correlationSummary.governance_score.tone)}`}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] opacity-80">Governança</p>
                <p className="mt-2 text-3xl font-semibold">{correlationSummary.governance_score.score}</p>
                <p className="mt-1 text-sm font-medium">{correlationSummary.governance_score.label}</p>
              </div>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-bg-subtle">
              <div
                className={`h-full rounded-full ${
                  correlationSummary.governance_score.tone === "success"
                    ? "bg-success-500"
                    : correlationSummary.governance_score.tone === "accent"
                      ? "bg-brand-500"
                      : correlationSummary.governance_score.tone === "warning"
                        ? "bg-warning-500"
                        : "bg-danger-500"
                }`}
                style={{ width: `${Math.min(100, correlationSummary.governance_score.score)}%` }}
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {correlationSummary.governance_score.factors.map((factor) => (
                <div
                  className={`rounded-2xl border p-4 ${
                    factor.status === "met"
                      ? "border-success-200 bg-success-50"
                      : factor.status === "partial"
                        ? "border-warning-200 bg-warning-50"
                        : "border-border/80 bg-bg-subtle/80"
                  }`}
                  key={factor.key}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-text">{factor.label}</p>
                      <p className="mt-1 text-sm text-text-body">{factor.detail}</p>
                    </div>
                    <Badge tone={factor.status === "met" ? "success" : factor.status === "partial" ? "warning" : "neutral"}>
                      {factor.points}/{factor.max_points}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
            {stewardshipActions.length ? (
              <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-text">Abrir workflow de stewardship</p>
                    <p className="mt-1 text-sm text-text-body">{EXPLORER_SUMMARY_COPY.governance.action}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {stewardshipActions.map((action) => (
                      <Button asChild key={action.key} size="sm" variant="outline">
                        <Link href={action.href}>{action.label}</Link>
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
            <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-text">Histórico de governança</p>
                  <p className="mt-1 text-sm text-text-body">{EXPLORER_SUMMARY_COPY.operational.timeline}</p>
                </div>
                <Button asChild size="sm" variant="outline">
                  <Link href={tableInfo ? `/governance/timeline?table_id=${tableInfo.id}` : "/governance/timeline"}>Abrir timeline</Link>
                </Button>
              </div>
              {stewardshipLoading ? <Skeleton className="mt-4 h-24 w-full" /> : null}
              {!stewardshipLoading && stewardshipError ? (
                <div className="mt-4">
                  <EmptyState
                    className="shadow-none"
                    title="Não foi possível carregar o histórico lateral"
                    description={stewardshipError}
                  />
                </div>
              ) : null}
              {!stewardshipLoading && !stewardshipError ? (
                stewardshipRequests.length ? (
                  <div className="mt-4 space-y-3">
                    {stewardshipRequests.slice(0, 4).map((item) => (
                  <div className="rounded-2xl border border-border/80 bg-surface p-4 shadow-sm" key={item.id}>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge tone={item.status === "approved" ? "success" : item.status === "pending" ? "warning" : "neutral"}>{item.status_label}</Badge>
                            <Badge tone="neutral">{item.request_type_label}</Badge>
                            <Badge tone={item.sla_status === "overdue" ? "warning" : item.sla_status === "due_soon" ? "accent" : "neutral"}>{item.sla_status_label}</Badge>
                          </div>
                          <span className="text-xs text-muted">{item.aging_days} dia(s)</span>
                        </div>
                        <p className="mt-2 text-sm text-text-body">
                          Solicitado por {item.requested_by.name || item.requested_by.email || "Usuário"} · aprovador {item.approver.name || item.approver.email || item.approver_source_label}
                        </p>
                        <p className="mt-1 text-xs text-muted">Vence em {formatDateTime(item.due_at)}</p>
                        {item.requester_comment ? <p className="mt-2 text-sm text-text-body">{item.requester_comment}</p> : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl border border-border/80 bg-surface p-4 text-sm text-text-body shadow-sm">
                    Ainda não há solicitações de stewardship registradas para este ativo.
                  </div>
                )
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card className="border-border/80 bg-surface shadow-card">
        <CardContent className="space-y-5 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Atualização da tabela</p>
              <h4 className="mt-2 text-lg font-semibold text-text">Ingestão operacional</h4>
              <p className="mt-1 text-sm text-text-body">{EXPLORER_SUMMARY_COPY.operational.ingestion}</p>
            </div>
            {primaryPipeline ? (
              <Badge tone={ingestionStatusTone(primaryPipeline.latest_status_label)}>
                {primaryPipeline.latest_status_label}
              </Badge>
            ) : null}
          </div>

          {ingestionLoading ? (
            <div className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : null}

          {!ingestionLoading && ingestionError ? (
            <EmptyState
              className="shadow-none"
              title="Integração operacional indisponível"
              description={`Não foi possível consultar a integração operacional agora. ${ingestionError}`}
            />
          ) : null}

          {!ingestionLoading && !ingestionError && ingestionSummary?.linked === false ? (
            <EmptyState
              title="Sem integração operacional vinculada"
              description={ingestionSummary.message || "Não há pipeline Airflow associado a este ativo."}
            />
          ) : null}

          {!ingestionLoading && !ingestionError && ingestionSummary?.linked && primaryPipeline ? (
            <>
              {correlationLoading ? <Skeleton className="h-40 w-full" /> : null}
              {!correlationLoading && correlationError ? (
                <EmptyState
                  className="shadow-none"
                  title="Correlação do ativo indisponível"
                  description={`Não foi possível consolidar a correlação do ativo agora. ${correlationError}`}
                />
              ) : null}
              {!correlationLoading && !correlationError && correlationSummary ? (
                <AssetCorrelationCard
                  autoOpening={autoOpening}
                  onAutoOpenIncident={onAutoOpenIncident}
                  onOpenLogs={latestExecution ? () => onOpenIngestionLogs(latestExecution.execution_id) : null}
                  onRerunProfiling={canEdit ? onRerunProfiling : null}
                  profilingRerunLoading={profilingRerunLoading}
                  summary={correlationSummary}
                />
              ) : shouldShowCorrelationStrip ? (
                <EmptyState
                  className="shadow-none"
                  title="Correlação automática em consolidação"
                  description="Ainda estamos consolidando a correlação automática deste ativo. Use os blocos de operação, DQ e incidentes logo abaixo para investigação."
                />
              ) : null}
              <div className="grid gap-4">
                <div className="rounded-3xl border border-border/80 bg-gradient-to-br from-white via-slate-50 to-brand-50 p-5 shadow-sm">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Pipeline</p>
                      <p className="mt-2 text-base font-semibold text-text">{primaryPipeline.pipeline_name || "Pipeline sem nome"}</p>
                      <p className="mt-1 text-sm text-text-body">DAG: {primaryPipeline.dag_id || "-"}</p>
                      <p className="mt-1 text-sm text-text-body">Task principal: {primaryPipeline.task_name || "-"}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Carga e atualização</p>
                      <p className="mt-2 text-base font-semibold text-text">{primaryPipeline.load_type_label || "Tipo não informado"}</p>
                      <p className="mt-1 text-sm text-text-body">Último sucesso: {formatDateTime(primaryPipeline.last_success_at)}</p>
                      <p className="mt-1 text-sm text-text-body">Última execução: {formatDateTime(primaryPipeline.last_execution_finished_at || primaryPipeline.last_execution_started_at)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Origem</p>
                      <p className="mt-2 text-sm font-medium text-text">{primaryPipeline.source_connection || "Origem não informada"}</p>
                      <p className="mt-1 text-sm text-text-body">
                        {primaryPipeline.source_database || "-"} · {primaryPipeline.source_table || "-"}
                      </p>
                      <p className="mt-1 text-sm text-text-body">
                        Destino: {primaryPipeline.target_schema || selectedSchemaName}.{primaryPipeline.target_table || selectedTableFullName.split(".").pop()}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Watermark</p>
                      <p className="mt-2 text-sm font-medium text-text">{primaryPipeline.watermark_value || "Sem watermark registrado"}</p>
                      <p className="mt-1 text-sm text-text-body">
                        Coluna: {primaryPipeline.watermark_column || "-"} · Tipo: {primaryPipeline.watermark_type || "-"}
                      </p>
                      <p className="mt-1 text-sm text-text-body">
                        Linhas processadas: {formatCompactNumber(primaryPipeline.rows_processed)}
                      </p>
                    </div>
                  </div>
                  {primaryPipeline.last_error ? (
                    <div className="mt-4 rounded-2xl border border-warning-200 bg-warning-50 px-4 py-3 shadow-sm">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="mt-0.5 h-4 w-4 text-warning-700" />
                        <div>
                          <p className="text-sm font-semibold text-warning-700">Último erro registrado</p>
                          <p className="mt-1 text-sm text-warning-700">{primaryPipeline.last_error}</p>
                          <p className="mt-1 text-xs text-warning-700">Última falha: {formatDateTime(primaryPipeline.last_failure_at)}</p>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="space-y-3">
                  <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4 shadow-sm">
                    <div className="flex items-center gap-2">
                      <Workflow className="h-4 w-4 text-brand-700" />
                      <p className="text-sm font-semibold text-text">Visão operacional</p>
                    </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-border/80 bg-surface p-3 shadow-sm">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Situação</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Badge tone={ingestionStatusTone(primaryPipeline.latest_status_label)}>{primaryPipeline.latest_status_label}</Badge>
                          {ingestionSummary.pipeline_count > 1 ? <Badge tone="warning">{ingestionSummary.pipeline_count} pipelines vinculados</Badge> : null}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-border/80 bg-surface p-3 shadow-sm">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Próximo passo</p>
                        <p className="mt-2 text-sm text-text-body">
                          {primaryPipeline.latest_status_label === "Falha"
                            ? "Investigar a última falha e revisar os logs da execução mais recente."
                            : hasExecutions
                              ? "Acompanhar o histórico recente e confirmar se o watermark está evoluindo."
                              : "Validar a primeira execução do pipeline para completar o contexto operacional."}
                        </p>
                      </div>
                    </div>
                    {primaryPipeline.pipeline_history_href ? (
                      <div className="mt-3">
                        <Button asChild size="sm" variant="outline">
                          <Link href={primaryPipeline.pipeline_history_href}>Histórico completo do pipeline</Link>
                        </Button>
                      </div>
                    ) : null}
                  </div>
                  <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4 shadow-sm">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Ações operacionais</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {primaryPipeline.pipeline_history_href ? (
                        <Button asChild size="sm" variant="outline">
                          <Link href={primaryPipeline.pipeline_history_href}>Ver histórico operacional</Link>
                        </Button>
                      ) : null}
                      {latestExecution ? (
                        <Button onClick={() => onOpenIngestionLogs(latestExecution.execution_id)} size="sm" variant="outline">
                          Abrir logs da última execução
                        </Button>
                      ) : null}
                      {canEdit ? (
                        <>
                          {!correlationSummary ? (
                            <Button disabled={profilingRerunLoading} onClick={onRerunProfiling} size="sm" variant="outline">
                              {profilingRerunLoading ? "Reexecutando..." : "Reexecutar profiling DQ"}
                            </Button>
                          ) : null}
                          <Button
                            disabled={scanReprocessLoading || !operationalContext?.datasource_id}
                            onClick={onReprocessDatasourceScan}
                            size="sm"
                            variant="outline"
                          >
                            {scanReprocessLoading ? "Reprocessando..." : "Reprocessar scan da fonte"}
                          </Button>
                        </>
                      ) : null}
                      {operationalContext ? (
                        <>
                          <Button asChild size="sm" variant="outline">
                            <Link href={operationalContext.links.incidents}>Abrir incidente relacionado</Link>
                          </Button>
                          <Button asChild size="sm" variant="outline">
                            <Link href={operationalContext.links.lineage}>Ver dependências e linhagem</Link>
                          </Button>
                        </>
                      ) : null}
                    </div>
                    <p className="mt-3 text-xs leading-5 text-muted">
                      Use o histórico e os logs para investigar a execução recente, e conecte o tratamento operacional às frentes de incidentes e linhagem quando houver impacto.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-border/80 bg-surface shadow-card">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-5 py-4">
                  <div>
                    <p className="text-sm font-semibold text-text">Histórico recente de execuções</p>
                    <p className="mt-1 text-xs text-muted">As execuções mais recentes ficam disponíveis aqui com status, duração, volume e watermark.</p>
                  </div>
                  {ingestionExecutions?.total ? <Badge tone="neutral">{ingestionExecutions.total} execuções encontradas</Badge> : null}
                </div>
                {hasExecutions ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-border text-sm">
                      <thead className="bg-bg-subtle/80">
                        <tr className="text-left text-xs uppercase tracking-[0.16em] text-muted">
                          <th className="px-5 py-3 font-semibold">Execução</th>
                          <th className="px-5 py-3 font-semibold">Status</th>
                          <th className="px-5 py-3 font-semibold">Janela</th>
                          <th className="px-5 py-3 font-semibold">Volume</th>
                          <th className="px-5 py-3 font-semibold">Watermark</th>
                          <th className="px-5 py-3 font-semibold text-right">Logs</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {executionItems.map((execution) => (
                          <tr className="align-top" key={execution.execution_id}>
                            <td className="px-5 py-4">
                              <p className="font-medium text-text">{execution.pipeline_name || execution.execution_id}</p>
                              <p className="mt-1 text-xs text-muted">{execution.dag_id || execution.execution_id}</p>
                              {execution.error_message ? <p className="mt-2 max-w-md text-xs text-danger-700">{execution.error_message}</p> : null}
                            </td>
                            <td className="px-5 py-4">
                              <Badge tone={ingestionStatusTone(execution.status_label)}>{execution.status_label}</Badge>
                            </td>
                            <td className="px-5 py-4 text-text-body">
                              <p>{formatDateTime(execution.started_at)}</p>
                              <p className="mt-1 text-xs text-muted">Fim {formatDateTime(execution.finished_at)} · {formatDuration(execution.duration_seconds)}</p>
                            </td>
                            <td className="px-5 py-4 text-text-body">
                              <p>Extraídas: {formatCompactNumber(execution.rows_extracted)}</p>
                              <p className="mt-1">Gravadas: {formatCompactNumber(execution.rows_written)}</p>
                              <p className="mt-1">Upsert: {formatCompactNumber(execution.rows_upserted)}</p>
                            </td>
                            <td className="px-5 py-4 text-text-body">
                              <p>Antes: {execution.watermark_before || "-"}</p>
                              <p className="mt-1">Depois: {execution.watermark_after || "-"}</p>
                            </td>
                            <td className="px-5 py-4 text-right">
                              <Button onClick={() => onOpenIngestionLogs(execution.execution_id)} size="sm" variant="outline">
                                <ListChecks className="h-4 w-4" />
                                Abrir logs
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="px-5 py-6">
                    <EmptyState
                      title="Pipeline sem execuções registradas"
                      description="O vínculo operacional existe, mas ainda não há execuções registradas para esta tabela."
                    />
                  </div>
                )}
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-4">
        <Card className="border-border/80 bg-gradient-to-br from-white via-slate-50 to-brand-50 shadow-card">
          <CardContent className="space-y-5 p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2">
                <SectionEyebrow label="Contexto do ativo" />
                <div>
                  <h3 className="text-2xl font-semibold tracking-tight text-text">{selectedTableFullName}</h3>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-text-body">
                    {tableDescription || "Esta tabela ainda não possui uma descrição consolidada. Use o dicionário e a governança para enriquecer o contexto de negócio."}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {tableInfo?.is_masked ? <Badge tone="warning">Metadados sensíveis mascarados para o seu perfil</Badge> : null}
                <span className={cn("rounded-full border px-2.5 py-1 text-xs font-medium", dbEngineMeta(selectedDbType).chipClassName)}>
                  {dbEngineMeta(selectedDbType).label}
                </span>
                <CertificationStatusBadge status={tableInfo?.certification_status} />
                {tableInfo?.certification_criticality ? (
                  <CertificationCriticalityBadge criticality={tableInfo.certification_criticality} />
                ) : null}
                {(tableInfo?.certification_badges || []).map((badge) => (
                  <CertificationUsageBadge badge={badge} key={badge} />
                ))}
                <PrivacySummaryStrip
                  compact
                  privacy={{
                    sensitivity_level: tableInfo?.sensitivity_level,
                    has_personal_data: tableInfo?.has_personal_data,
                    has_sensitive_personal_data: tableInfo?.has_sensitive_personal_data,
                    is_masked: tableInfo?.is_masked,
                    external_sharing: tableInfo?.external_sharing,
                    access_scope: tableInfo?.access_scope,
                  }}
                />
                {tableInfo?.lifecycle_status ? <Badge tone="neutral">{tableInfo.lifecycle_status}</Badge> : null}
                {selectedTableKind ? <Badge tone="accent">{tableKindLabel(selectedTableKind)}</Badge> : null}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div
                className={cn(
                  "rounded-2xl border border-border/80 bg-surface p-4 shadow-sm",
                  certificationStatusFrameClass(tableInfo?.certification_status),
                  certificationStatusHeaderClass(tableInfo?.certification_status),
                )}
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Banco / schema</p>
                <p className="mt-2 text-sm font-medium text-text">{selectedDatabaseName}</p>
                <p className="mt-1 text-sm text-text-body">{selectedSchemaName}</p>
              </div>
              <div className="rounded-2xl border border-border/80 bg-surface p-4 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Responsável</p>
                <p className="mt-2 text-sm font-medium text-text">{owner || "Não definido"}</p>
                <p className="mt-1 text-sm text-text-body">{ownerEmail || ownerArea || "Sem responsável associado"}</p>
              </div>
              <div className="rounded-2xl border border-border/80 bg-surface p-4 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Steward</p>
                {tableInfo?.steward_name || tableInfo?.steward_email ? (
                  <>
                    <p className="mt-2 text-sm font-medium text-text">{tableInfo?.steward_name || "Steward definido"}</p>
                    <p className="mt-1 text-sm text-text-body">{tableInfo?.steward_email || "Sem e-mail associado"}</p>
                  </>
                ) : (
                  <p className="mt-2 text-sm text-text-body">Sem steward definido</p>
                )}
                {canEdit && tableInfo ? (
                  <StewardEditor
                    hasSteward={Boolean(tableInfo.steward_user_id)}
                    onChanged={onStewardChanged}
                    tableId={tableInfo.id}
                  />
                ) : null}
              </div>
              <div className="rounded-2xl border border-border/80 bg-surface p-4 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Certificação</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <CertificationStatusBadge status={tableInfo?.certification_status} />
                  {tableInfo?.certification_criticality ? (
                    <CertificationCriticalityBadge criticality={tableInfo.certification_criticality} />
                  ) : null}
                  {(tableInfo?.certification_badges || []).map((badge) => (
                    <CertificationUsageBadge badge={badge} key={badge} />
                  ))}
                </div>
                <p className="mt-2 text-sm text-text-body">
                  {tableInfo?.certification_notes || "Ainda não existe uma decisão documentada para este ativo."}
                </p>
                <p className="mt-1 text-sm text-text-body">
                  Submissão: {formatDateTime(tableInfo?.certification_submitted_at)}{tableInfo?.certification_submitted_by_user_name ? ` • ${tableInfo?.certification_submitted_by_user_name}` : ""}
                </p>
                <p className="mt-1 text-sm text-text-body">
                  Revalidar em: {formatDateTime(tableInfo?.certification_review_at)}{tableInfo?.certification_expires_at ? ` • Vence em ${formatDateTime(tableInfo.certification_expires_at)}` : ""}
                </p>
              </div>
              <div className="rounded-2xl border border-border/80 bg-surface p-4 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Volume de linhas</p>
                {tableInfo?.row_count_metrics?.current_row_count !== null &&
                tableInfo?.row_count_metrics?.current_row_count !== undefined ? (
                  <>
                    <p className="mt-2 text-2xl font-semibold tracking-tight text-text">
                      {formatInteger(tableInfo.row_count_metrics.current_row_count)}
                    </p>
                    <p className="mt-1 text-sm text-text-body">
                      Última atualização: {formatDateTime(tableInfo.row_count_metrics.snapshot_at)}
                    </p>
                    <p className="mt-1 text-sm text-text-body">
                      Coleta: {formatRowCountMethod(tableInfo.row_count_metrics.collection_method)}
                    </p>
                    <p className="mt-1 text-sm text-text-body">
                      Variação desde a última coleta:{" "}
                      {tableInfo.row_count_metrics.growth_absolute !== null &&
                      tableInfo.row_count_metrics.growth_absolute !== undefined
                        ? `${formatSignedInteger(tableInfo.row_count_metrics.growth_absolute)}${
                            tableInfo.row_count_metrics.growth_percent !== null &&
                            tableInfo.row_count_metrics.growth_percent !== undefined
                              ? ` (${formatPercent(tableInfo.row_count_metrics.growth_percent)})`
                              : ""
                          }`
                        : tableInfo.row_count_metrics.has_history
                          ? "Sem variação ainda"
                          : "Sem snapshots coletados"}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="mt-2 text-sm font-medium text-text">Ainda não disponível</p>
                    <p className="mt-1 text-sm text-text-body">Sem snapshots coletados</p>
                  </>
                )}
              </div>
              <div className="rounded-2xl border border-border/80 bg-surface p-4 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Impacto Metabase</p>
                {metabaseImpact?.available ? (
                  <>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge tone={metabaseImpactRiskTone(metabaseImpact.break_risk_on_drop)} className="border-white/10">
                        Remoção: {formatMetabaseImpactRisk(metabaseImpact.break_risk_on_drop)}
                      </Badge>
                      <Badge tone={metabaseImpactRiskTone(metabaseImpact.break_risk_on_change)} className="border-white/10">
                        Estrutura: {formatMetabaseImpactRisk(metabaseImpact.break_risk_on_change)}
                      </Badge>
                    </div>
                    <p className="mt-3 text-2xl font-semibold tracking-tight text-text">
                      {formatCompactNumber(metabaseImpact.asset_count)}
                    </p>
                    <p className="mt-1 text-sm text-text-body">
                      {formatCompactNumber(metabaseImpact.dashboard_count)} dashboards · {formatCompactNumber(metabaseImpact.question_count)} perguntas/cards
                    </p>
                    <p className="mt-1 text-sm text-text-body">
                      Última verificação: {formatDateTime(metabaseImpact.last_verified_at)}
                    </p>
                    <div className="mt-4 space-y-2">
                      {metabaseVisibleDependencies.length > 0 ? (
                        metabaseVisibleDependencies.map((dependency) => (
                          <div className="rounded-xl border border-border bg-bg-subtle/80 p-3" key={`${dependency.metabase_asset_id}:${dependency.dependency_type}`}>
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-text">{dependency.name}</p>
                                <p className="mt-0.5 text-xs text-muted">
                                  {formatMetabaseImpactAssetType(dependency.asset_type)} · {formatMetabaseImpactDependencyType(dependency.dependency_type)}
                                </p>
                              </div>
                              <Badge tone={metabaseImpactRiskTone(dependency.break_risk_on_drop)}>
                                {formatMetabaseImpactRisk(dependency.break_risk_on_drop)}
                              </Badge>
                            </div>
                            <p className="mt-2 text-xs text-text-body">
                              Confiança: {formatMetabaseImpactConfidence(dependency.confidence_level)} · Estrutura:{" "}
                              {formatMetabaseImpactRisk(dependency.break_risk_on_change)}
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="mt-2 text-sm text-text-body">Sem assets indexados para esta tabela.</p>
                      )}
                    </div>
                    {metabaseImpactDependencies.length > metabaseVisibleDependencies.length ? (
                      <p className="mt-2 text-xs text-muted">
                        +{metabaseImpactDependencies.length - metabaseVisibleDependencies.length} asset(s) adicionais indexados
                      </p>
                    ) : null}
                  </>
                ) : (
                  <>
                    <p className="mt-2 text-sm font-medium text-text">Ainda não disponível</p>
                    <p className="mt-1 text-sm text-text-body">
                      {metabaseImpact?.message || "Nenhuma integração do Metabase está disponível para esta tabela."}
                    </p>
                  </>
                )}
              </div>
              <div className="rounded-2xl border border-border/80 bg-surface p-4 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Data contract</p>
                <p className="mt-2 text-sm font-medium text-text">
                  {tableInfo?.data_contract?.status ? `Status: ${tableInfo.data_contract.status}` : "Sem contrato formal"}
                </p>
                <p className="mt-1 text-sm text-text-body">
                  Versão: {tableInfo?.data_contract?.version ?? "—"} • Publicado: {formatDateTime(tableInfo?.data_contract?.published_at)}
                </p>
                <p className="mt-1 text-sm text-text-body">
                  Última validação: {formatDateTime(tableInfo?.data_contract?.last_validation_at)}{tableInfo?.data_contract?.last_validation_status ? ` • ${tableInfo.data_contract.last_validation_status}` : ""}
                </p>
                {tableInfo?.data_contract?.last_validation_issues ? (
                  <Badge className="mt-3" tone="warning">
                    {tableInfo.data_contract.last_validation_issues} alerta(s) no contrato
                  </Badge>
                ) : null}
                {tableInfo?.id ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/data-quality?tableId=${tableInfo.id}`}>Abrir scorecard de qualidade</Link>
                    </Button>
                    <Button asChild size="sm" variant="ghost">
                      <Link href={`/data-quality?tableId=${tableInfo.id}&tab=confiabilidade-acao`}>Ver impacto e mudança</Link>
                    </Button>
                  </div>
                ) : null}
              </div>
              <div className="rounded-2xl border border-border/80 bg-surface p-4 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Privacidade & acesso</p>
                <div className="mt-2 space-y-3">
                  <PrivacySummaryStrip
                    privacy={{
                      sensitivity_level: tableInfo?.sensitivity_level,
                      has_personal_data: tableInfo?.has_personal_data,
                      has_sensitive_personal_data: tableInfo?.has_sensitive_personal_data,
                      is_masked: tableInfo?.is_masked,
                      external_sharing: tableInfo?.external_sharing,
                      access_scope: tableInfo?.access_scope,
                    }}
                  />
                  <AccessRoleBadges roles={tableInfo?.access_roles || []} />
                </div>
                <p className="mt-2 text-sm text-text-body">
                  Base legal: {tableInfo?.legal_basis || "Não informada"} • Retenção: {tableInfo?.retention_policy || "Não informada"}
                </p>
                <p className="mt-1 text-sm text-text-body">
                  Revisão: {formatDateTime(tableInfo?.privacy_reviewed_at)}
                  {tableInfo?.privacy_reviewed_by_user_name ? ` • ${tableInfo?.privacy_reviewed_by_user_name}` : ""}
                </p>
                {operationalContext?.privacy_review_due ? <Badge className="mt-3" tone="warning">Revisão de privacidade pendente</Badge> : null}
              </div>
              <div className="rounded-2xl border border-border/80 bg-surface p-4 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Atualização</p>
                <p className="mt-2 text-sm font-medium text-text">{formatDateTime(tableInfo?.updated_at)}</p>
                <p className="mt-1 text-sm text-text-body">Criada em {formatDateTime(tableInfo?.created_at)}</p>
                <p className="mt-1 text-sm text-text-body">
                  Owner revisado em {formatDateTime(tableInfo?.owner_reviewed_at)}
                  {tableInfo?.owner_reviewed_by_user_name ? ` • ${tableInfo?.owner_reviewed_by_user_name}` : ""}
                </p>
                {operationalContext?.owner_review_due ? <Badge className="mt-3" tone="warning">Revisão de owner pendente</Badge> : null}
                {operationalContext?.certification_review_due ? <Badge className="mt-3 ml-2" tone="warning">Revalidação de certificação pendente</Badge> : null}
              </div>
            </div>

            {tableInfo ? (
              <TableDescriptionCard
                canEdit={canEdit}
                compact
                descriptionManual={tableInfo.description_manual}
                descriptionSource={tableInfo.description_source}
                onSaved={onTableDescriptionSaved}
                tableId={tableInfo.id}
                title="Descrição da tabela"
              />
            ) : null}

            <div className="rounded-2xl border border-border/80 bg-surface p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-text">Semântica e classificação</p>
                  <p className="mt-1 text-sm text-text-body">Classificações e termos compartilham o mesmo contexto de negócio do ativo.</p>
                </div>
                <Badge tone="neutral">
                  {tableTags.length} classificaç{tableTags.length === 1 ? "ão" : "ões"} · {tableTerms.length} termo{tableTerms.length === 1 ? "" : "s"}
                </Badge>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">Classificações</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {tableTags.length ? (
                      tableTags.map((tag) => (
                        <span className="rounded-full border border-border/70 bg-bg-subtle/80 px-2.5 py-1 text-xs text-text-body" key={`summary-tag-${tag.id}`}>
                          {tag.name}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-muted">Nenhuma classificação vinculada.</span>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">Termos</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {tableTerms.length ? (
                      tableTerms.map((term) => (
                        <span className="rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 text-xs text-brand-700" key={`summary-term-${term.id}`}>
                          {term.name}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-muted">Nenhum termo relacionado.</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/80 bg-surface px-4 py-3 shadow-card">
        <div>
          <p className="text-sm font-semibold text-text">Governança, qualidade, operação e histórico</p>
          <p className="mt-1 text-xs text-muted">Abra os painéis detalhados para ver cobertura documental, snapshot de DQ e colunas em destaque sem sair do Explorer.</p>
        </div>
        <Button
          className="shadow-sm"
          onClick={() => setShowExtendedPanels((value) => !value)}
          size="md"
          variant="default"
        >
          <Workflow className="h-4 w-4" />
          {showExtendedPanels ? "Fechar painéis detalhados" : "Abrir painéis detalhados"}
        </Button>
      </div>

      {showExtendedPanels ? (
        <>
        <div className="grid gap-4 md:grid-cols-2">
          {summaryStats.map((item) => {
            const Icon = item.icon;
            return (
            <Card className={cn("border border-border/80 shadow-card", item.border)} key={item.title}>
              <CardContent className={cn("space-y-3 bg-gradient-to-br p-4", item.accent)}>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-text-body">{item.title}</p>
                  <div className={cn("flex h-10 w-10 items-center justify-center rounded-2xl", item.iconClassName)}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
                <div>
                  <p className="text-3xl font-semibold tracking-tight text-text">{item.value}</p>
                  <p className="mt-1 text-sm text-text-body">{item.subtitle}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border-border/80 shadow-card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-bg-subtle text-text-body">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-text">Governança, documentação e qualidade</h4>
              <p className="mt-1 text-xs text-muted">Resumo consolidado para evitar blocos paralelos no Explorer.</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4">
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4 shadow-sm">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-success-700" />
                    <p className="text-sm font-medium text-text">Cobertura do dicionário</p>
                  </div>
                  <p className="mt-3 text-2xl font-semibold text-text">{dictionaryCoveragePct}%</p>
                  <p className="mt-1 text-sm text-text-body">
                    {columnCounts.documented} de {columnCounts.total} colunas com descrição
                  </p>
                  <div className="mt-3 h-2 rounded-full bg-slate-200">
                    <div className="h-2 rounded-full bg-success-500" style={{ width: `${dictionaryCoveragePct}%` }} />
                  </div>
                </div>
                <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4 shadow-sm">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-brand-700" />
                    <p className="text-sm font-medium text-text">Cobertura de comentários</p>
                  </div>
                  <p className="mt-3 text-2xl font-semibold text-text">{glossaryCoveragePct}%</p>
                  <p className="mt-1 text-sm text-text-body">
                    {columnCounts.commented} colunas com comentário técnico ou de negócio
                  </p>
                  <div className="mt-3 h-2 rounded-full bg-slate-200">
                    <div className="h-2 rounded-full bg-violet-500" style={{ width: `${glossaryCoveragePct}%` }} />
                  </div>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-border/80 bg-surface p-4 shadow-sm">
                  <div className="flex items-center gap-2">
                    <KeyRound className="h-4 w-4 text-text-body" />
                    <p className="text-sm font-medium text-text">Estrutura técnica</p>
                  </div>
                  <ul className="mt-3 space-y-2 text-sm text-text-body">
                    <li>{columnCounts.primaryKeys} colunas de chave primária</li>
                    <li>{columnCounts.required} colunas obrigatórias</li>
                    <li>{columnCounts.nullable} colunas nullable</li>
                  </ul>
                </div>
                <div className="rounded-2xl border border-border/80 bg-surface p-4 shadow-sm">
                  <div className="flex items-center gap-2">
                    <TagsIcon className="h-4 w-4 text-text-body" />
                    <p className="text-sm font-medium text-text">Relacionamento semântico</p>
                  </div>
                  <ul className="mt-3 space-y-2 text-sm text-text-body">
                    <li>{tableTags.length} classificações associadas</li>
                    <li>{tableTerms.length} termos relacionados</li>
                    <li>{owner ? "Responsável definido" : "Responsável pendente de definição"}</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {dqState === "loading" ? (
                <div className="space-y-2">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ) : dqState === "ready" && dqLatest ? (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-border/80 bg-surface p-4 shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted">Pontuação de DQ</p>
                      <div className="mt-3 flex items-center gap-3">
                        <p className="text-3xl font-semibold tracking-tight text-text">{dqLatest.dq_score.toFixed(1)}</p>
                        <Badge tone={dqLatest.failed_rules > 0 ? "warning" : pctBadgeTone(dqLatest.dq_score)}>
                          {dqLatest.failed_rules} alerta(s)
                        </Badge>
                      </div>
                      <p className="mt-2 text-sm text-text-body">Completude média {dqLatest.completeness_pct_avg.toFixed(1)}%</p>
                    </div>
                    <div className="rounded-2xl border border-border/80 bg-surface p-4 shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted">Atualização recente</p>
                      <div className="mt-3 flex items-center gap-2">
                        <Clock3 className="h-4 w-4 text-brand-700" />
                        <p className="text-2xl font-semibold text-text">{freshnessLabel(dqLatest.freshness_seconds)}</p>
                      </div>
                      <p className="mt-2 text-sm text-text-body">Última execução em {formatDateTime(dqLatest.run_at)}</p>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Volume e duplicidades</p>
                        <p className="mt-1 text-sm text-text-body">Leitura resumida da última execução de qualidade.</p>
                      </div>
                      <Badge tone="neutral">{formatCompactNumber(dqLatest.row_count)} linha(s)</Badge>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-border/80 bg-surface p-4 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Volume</p>
                        <p className="mt-3 text-2xl font-semibold text-text">{formatCompactNumber(dqLatest.row_count)}</p>
                        <p className="mt-1 text-sm text-text-body">Linhas na última leitura</p>
                      </div>
                      <div className="rounded-2xl border border-border/80 bg-surface p-4 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Duplicidades</p>
                        <p className="mt-3 text-2xl font-semibold text-text">{formatCompactNumber(dqLatest.duplicates_count)}</p>
                        <p className="mt-1 text-sm text-text-body">Registros duplicados detectados</p>
                      </div>
                    </div>
                  </div>
                </>
              ) : dqState === "empty" ? (
                <EmptyState
                  title="Sem snapshot de Qualidade de dados"
                  description="Ainda não existem métricas de qualidade para esta tabela. Execute o perfilamento na área de Qualidade de dados para alimentar este resumo."
                />
              ) : dqState === "error" ? (
                <EmptyState
                  className="shadow-none"
                  title="Resumo de Qualidade de dados indisponível"
                  description={`Não foi possível carregar o resumo de DQ agora. ${dqMessage}`}
                />
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/80 shadow-card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-bg-subtle text-text-body">
              <TableIcon className="h-4 w-4" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-text">Colunas em destaque</h4>
              <p className="mt-1 text-xs text-muted">Prévia rápida das colunas mais importantes e melhor documentadas.</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {summaryColumnsPreview.length === 0 ? (
            <EmptyState title="Sem colunas visíveis" description="Esta tabela ainda não possui colunas disponíveis no catálogo." />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {summaryColumnsPreview.map((column) => (
                <div className="rounded-2xl border border-border/80 bg-surface p-4 shadow-sm" key={`summary-col-${column.id}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-2">
                      <p className="break-words text-sm font-semibold text-text">{column.name}</p>
                      <div className="inline-flex max-w-full flex-col items-start rounded-2xl border border-border/80 bg-bg-subtle/80 px-3 py-2 shadow-sm">
                        <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted">Tipo de dados</span>
                        <span className="mt-0.5 max-w-full break-words font-mono text-sm font-semibold tracking-tight text-text sm:text-base">
                          {column.data_type}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      {column.is_primary_key ? <Badge tone="accent">PK</Badge> : null}
                      <Badge tone={column.is_nullable ? "neutral" : "success"}>
                        {column.is_nullable ? "Opcional" : "Obrigatória"}
                      </Badge>
                    </div>
                  </div>
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-text-body">
                    {preferredColumnDescription(column) || column.dictionary_comment || column.existing_comment || "Sem documentação enriquecida para esta coluna."}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
        </>
      ) : null}
        </div>
      </div>
    </div>
  );
}
