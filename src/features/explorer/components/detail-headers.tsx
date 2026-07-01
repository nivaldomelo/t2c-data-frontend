import { Link } from "@/lib/next-shims";
import { useExplorerDebugLifecycle } from "@/features/explorer/debug";

import { Clock3, Pencil, Sparkles, Star } from "lucide-react";

import {
  CertificationCriticalityBadge,
  CertificationStatusBadge,
  CertificationUsageBadge,
  certificationStatusFrameClass,
  certificationStatusHeaderClass,
} from "@/components/certification/certification-badge";
import { DatabaseTechLogo } from "@/components/database-tech-logo";
import { AccessRoleBadges, PrivacySummaryStrip } from "@/components/privacy/privacy-badge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { dbEngineMeta } from "@/lib/database-engine";

import type { DataOwnerItem, DbType, TableDetailInfo, TableKind, TagItem, GlossaryTermItem } from "../types";
import { formatCompactNumber, formatDateTime, tableKindLabel } from "../utils";

type MinimalHeaderProps = {
  selectedTableId: number | null;
  selectedTableFullName: string;
  canEdit: boolean;
  hasSavedLineage: boolean;
  favoriteActive?: boolean;
  favoriteLoading?: boolean;
  onOpenAssistant?: () => void;
  onToggleFavorite?: () => void;
};

export function ExplorerMinimalHeader({
  selectedTableId,
  selectedTableFullName,
  canEdit,
  hasSavedLineage,
  favoriteActive = false,
  favoriteLoading = false,
  onOpenAssistant,
  onToggleFavorite,
}: MinimalHeaderProps) {
  useExplorerDebugLifecycle("ExplorerMinimalHeader", {
    selectedTableId,
    selectedTableFullName,
    canEdit,
    hasSavedLineage,
  });
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <h3 className="text-sm font-semibold text-text-body">Details</h3>
        {selectedTableId !== null ? (
          <p className="mt-1 text-2xl font-semibold tracking-tight text-text">{selectedTableFullName}</p>
        ) : null}
      </div>
      {selectedTableId !== null ? (
        <div className="flex flex-wrap items-center gap-2">
          <button
            className="inline-flex items-center gap-1.5 rounded-md border border-info-200 bg-info-50 px-3 py-1.5 text-xs font-medium text-info-700 shadow-sm transition hover:border-info-200 hover:bg-info-100"
            onClick={() => window.location.assign(`/governance/timeline?table_id=${selectedTableId}`)}
            type="button"
          >
            <Clock3 className="h-3.5 w-3.5" />
            Timeline
          </button>
          {onToggleFavorite ? (
            <button
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium shadow-sm transition",
                favoriteActive
                  ? "border-warning-200 bg-warning-50 text-warning-700 hover:bg-warning-100"
                  : "border-border bg-surface text-text-body hover:border-warning-200 hover:bg-warning-50 hover:text-warning-700",
              )}
              disabled={favoriteLoading}
              onClick={onToggleFavorite}
              type="button"
            >
              <Star className={cn("h-3.5 w-3.5", favoriteActive ? "fill-current" : "")} />
              {favoriteActive ? "Favorito" : "Favoritar"}
            </button>
          ) : null}
          {onOpenAssistant ? (
            <Button className="shadow-sm" onClick={onOpenAssistant} size="md" variant="default">
              <Sparkles className="h-3.5 w-3.5" />
              Analisar com assistente
            </Button>
          ) : null}
          {canEdit ? (
            <button
              className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-slate-800"
              onClick={() =>
                window.location.assign(`/lineage?tableId=${selectedTableId}${hasSavedLineage ? "" : "&openCreate=1"}`)
              }
              type="button"
            >
              {hasSavedLineage ? "Gerenciar linhagem" : "Criar linhagem"}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

type FullHeaderProps = {
  selectedTableId: number | null;
  selectedTableFullName: string;
  selectedDbType: DbType | null;
  selectedTableKind: TableKind | null;
  tableInfo: TableDetailInfo | null;
  breadcrumb: string[];
  selectedDatabaseName: string;
  selectedSchemaName: string;
  selectedTableName: string;
  canEdit: boolean;
  canEditOwner?: boolean;
  owner: string | null;
  ownerEmail: string | null;
  ownerArea: string | null;
  tableDataOwnerId: number | null;
  favoriteActive?: boolean;
  favoriteLoading?: boolean;
  onOpenAssistant?: () => void;
  onToggleFavorite?: () => void;
  setOwnerSearch: (value: string) => void;
  setPendingOwnerId: (value: number | null) => void;
  setOwnerFormMode: (value: "associate" | "create") => void;
  setOwnerEditorOpen: (value: boolean) => void;
  tableTags: TagItem[];
  tableTerms: GlossaryTermItem[];
};

export function ExplorerFullHeader({
  selectedTableId,
  selectedTableFullName,
  selectedDbType,
  selectedTableKind,
  tableInfo,
  breadcrumb,
  selectedDatabaseName,
  selectedSchemaName,
  selectedTableName,
  canEdit,
  canEditOwner,
  owner,
  ownerEmail,
  ownerArea,
  tableDataOwnerId,
  favoriteActive = false,
  favoriteLoading = false,
  onOpenAssistant,
  onToggleFavorite,
  setOwnerSearch,
  setPendingOwnerId,
  setOwnerFormMode,
  setOwnerEditorOpen,
  tableTags,
  tableTerms,
}: FullHeaderProps) {
  useExplorerDebugLifecycle("ExplorerFullHeader", {
    selectedTableId,
    selectedTableFullName,
    selectedDbType,
    selectedTableKind,
    canEdit,
    owner,
    tableTagsCount: tableTags.length,
    tableTermsCount: tableTerms.length,
  });
  const headerTags = tableTags.slice(0, 4);
  const extraTags = Math.max(0, tableTags.length - headerTags.length);
  const headerTerms = tableTerms.slice(0, 3);
  const extraTerms = Math.max(0, tableTerms.length - headerTerms.length);

  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <h3 className="text-sm font-semibold text-text-body">Details</h3>
        {selectedTableId !== null ? (
          <>
            <div
              className={cn(
                "mt-3 flex flex-wrap items-center gap-3 rounded-2xl border p-3 shadow-sm",
                certificationStatusFrameClass(tableInfo?.certification_status),
                certificationStatusHeaderClass(tableInfo?.certification_status),
              )}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-surface shadow-sm">
                <DatabaseTechLogo engine={selectedDbType} variant="default" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-2xl font-semibold tracking-tight text-text">{selectedTableFullName}</p>
                  {selectedTableKind ? (
                    <span className="inline-flex items-center rounded-full border border-border bg-surface px-2.5 py-0.5 text-xs font-semibold text-text-body">
                      {tableKindLabel(selectedTableKind)}
                    </span>
                  ) : null}
                  {tableInfo ? <CertificationStatusBadge status={tableInfo.certification_status} /> : null}
                  {tableInfo?.certification_criticality ? (
                    <CertificationCriticalityBadge criticality={tableInfo.certification_criticality} />
                  ) : null}
                  {(tableInfo?.certification_badges || []).map((badge) => (
                    <CertificationUsageBadge badge={badge} key={badge} />
                  ))}
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
                  <span className={cn("rounded-full border px-2.5 py-0.5 text-xs font-medium", dbEngineMeta(selectedDbType).chipClassName)}>
                    {dbEngineMeta(selectedDbType).label}
                  </span>
                  <span className="rounded-full border border-warning-200 bg-warning-50 px-2.5 py-0.5 text-xs font-medium text-warning-700">
                    Linhas {formatCompactNumber(tableInfo?.row_count_metrics?.current_row_count)}
                  </span>
                  {tableInfo?.metabase_impact?.available ? (
                    <span className="rounded-full border border-danger-200 bg-danger-50 px-2.5 py-0.5 text-xs font-medium text-danger-700">
                      Metabase {formatCompactNumber(tableInfo.metabase_impact.asset_count)}
                    </span>
                  ) : null}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/governance/timeline?table_id=${selectedTableId}`}>
                      <Clock3 className="h-3.5 w-3.5" />
                      Abrir timeline
                    </Link>
                  </Button>
                  {onOpenAssistant ? (
                    <Button className="shadow-sm" onClick={onOpenAssistant} size="md" variant="default">
                      <Sparkles className="h-3.5 w-3.5" />
                      Analisar com assistente
                    </Button>
                  ) : null}
                  {onToggleFavorite ? (
                    <Button
                      className={cn(
                        favoriteActive
                          ? "border-warning-200 bg-warning-50 text-warning-700 hover:bg-warning-100"
                          : "hover:border-warning-200 hover:bg-warning-50 hover:text-warning-700",
                      )}
                      disabled={favoriteLoading}
                      onClick={onToggleFavorite}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      <Star className={cn("h-3.5 w-3.5", favoriteActive ? "fill-current" : "")} />
                      {favoriteActive ? "Favorito" : "Favoritar"}
                    </Button>
                  ) : null}
                </div>
                <p className="mt-1 text-sm text-text-body">
                  Conexão <span className="font-medium text-text-body">{breadcrumb[0] || "-"}</span> • Banco{" "}
                  <span className="font-medium text-text-body">{selectedDatabaseName || "-"}</span> • Schema{" "}
                  <span className="font-medium text-text-body">
                    {selectedDbType === "mongodb" && selectedSchemaName === "default" ? "Coleções" : selectedSchemaName || "-"}
                  </span>
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-full border border-border bg-surface px-2.5 py-1 text-text-body">
                  {selectedDatabaseName || "Banco"}
                </span>
                <span className="rounded-full border border-info-200 bg-info-50 px-2.5 py-1 text-info-700">
                  {selectedSchemaName || "Schema"}
                </span>
                <span className="rounded-full border border-border bg-bg-subtle px-2.5 py-1 font-medium text-text-body">
                  {selectedTableName || "Tabela"}
                </span>
              </div>
            </div>
            <div className="mt-4 grid gap-2 lg:grid-cols-3">
              <div className="min-w-0">
                <div className="mb-1 flex items-center gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Responsável</p>
                  {(canEditOwner ?? canEdit) ? (
                    <button
                      aria-label="Editar responsável"
                      className="rounded p-1 text-muted transition hover:bg-info-50 hover:text-info-700"
                      onClick={() => {
                        setOwnerSearch("");
                        setPendingOwnerId(tableDataOwnerId);
                        setOwnerFormMode("associate");
                        setOwnerEditorOpen(true);
                      }}
                      type="button"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </div>
                <div className="flex min-h-7 flex-wrap items-center gap-1.5">
                  {owner ? (
                    <span
                      className="max-w-full truncate rounded-full border border-info-200 bg-info-50 px-2 py-0.5 text-xs text-info-700"
                      title={ownerEmail || owner}
                    >
                      Responsável: {owner}
                    </span>
                  ) : (
                    <span className="text-xs text-muted">Responsável: não definido</span>
                  )}
                  {ownerArea ? (
                    <span className="max-w-full truncate rounded-full border border-border bg-surface px-2 py-0.5 text-xs text-text-body">
                      Área: {ownerArea}
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="min-w-0">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
                  Classificações
                </p>
                <div className="flex min-h-7 flex-wrap items-center gap-1.5">
                  {tableTags.length === 0 ? (
                    <span className="text-xs text-muted">Sem tags</span>
                  ) : (
                    <>
                      {headerTags.map((tag) => (
                        <span
                          className="max-w-full truncate rounded-full border border-border bg-surface px-2 py-0.5 text-xs text-text-body transition hover:border-info-200 hover:text-info-700"
                          key={`header-tag-${tag.id}`}
                          title={tag.group_name ? `${tag.name} • ${tag.group_name}` : tag.name}
                        >
                          {tag.name}
                        </span>
                      ))}
                      {extraTags > 0 ? (
                        <span className="rounded-full border border-border bg-bg-subtle px-2 py-0.5 text-xs text-text-body">
                          +{extraTags}
                        </span>
                      ) : null}
                    </>
                  )}
                </div>
              </div>
              <div className="min-w-0">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
                  Termos
                </p>
                <div className="flex min-h-7 flex-wrap items-center gap-1.5">
                  {tableTerms.length === 0 ? (
                    <span className="text-xs text-muted">Sem termos</span>
                  ) : (
                    <>
                      {headerTerms.map((term) => (
                        <span
                          className="max-w-full truncate rounded-full border border-border-strong bg-bg-subtle px-2 py-0.5 text-xs text-text-body"
                          key={`header-term-${term.id}`}
                          title={term.name}
                        >
                          {term.name}
                        </span>
                      ))}
                      {extraTerms > 0 ? (
                        <span className="rounded-full border border-border-strong bg-bg-subtle px-2 py-0.5 text-xs text-text-body">
                          +{extraTerms}
                        </span>
                      ) : null}
                    </>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
