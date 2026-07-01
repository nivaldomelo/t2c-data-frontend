import type {
  CanonicalAssetContext,
  DetailTab,
  TableDetailInfo,
  TableCorrelationSummary,
  TableOperationalContext,
} from "./types";

export const DETAIL_TABS: readonly DetailTab[];
export const DETAIL_TAB_LABELS: Record<DetailTab, string>;

export type ObservabilityTone = "neutral" | "accent" | "warning" | "success" | "danger";

export type ObservabilitySignal = {
  label: string;
  value: string;
  detail: string;
  tone: ObservabilityTone;
};

export type ObservabilityNextAction = {
  label: string;
  href: string;
  rationale: string;
  tone: ObservabilityTone;
};

export type ObservabilitySnapshotInput = {
  canonicalAsset: CanonicalAssetContext | null;
  operationalContext: TableOperationalContext | null;
  correlationSummary: TableCorrelationSummary | null;
  tableInfo: TableDetailInfo | null;
};

export type ObservabilitySnapshot = {
  confidenceState: "trusted" | "trusted_with_caveats" | "degraded" | "critical" | "insufficient_evidence" | "usage_blocked";
  confidenceLabel: string;
  confidenceTone: ObservabilityTone;
  confidenceScore: number | null;
  confidenceReason: string;
  operationalStatusLabel: string;
  operationalStatusDetail: string;
  usageDecision: {
    state: "usage_allowed" | "usage_allowed_with_caveats" | "usage_not_recommended" | "usage_blocked";
    label: string;
    tone: ObservabilityTone;
    rationale: string;
  };
  impact: {
    blastRadiusScore: number;
    blastRadiusLabel: string;
    summary: string;
    downstreamCount: number;
    dashboardCount: number;
    processCount: number;
    directDependenciesCount: number;
    impactLevel: string;
  };
  responsibility: {
    ownerName: string | null;
    ownerEmail: string | null;
    ownerDefined: boolean;
    summary: string;
    followUp: string;
    ownerReviewDue: boolean;
    privacyReviewDue: boolean;
    certificationReviewDue: boolean;
    criticalityLabel: string;
    criticalityTone: ObservabilityTone;
  };
  nextAction: ObservabilityNextAction;
  signals: ObservabilitySignal[];
  contract: {
    label: string;
    detail: string;
    tone: ObservabilityTone;
  };
  freshness: {
    label: string;
    detail: string;
    tone: ObservabilityTone;
  };
  pipeline: {
    label: string;
    detail: string;
    tone: ObservabilityTone;
  };
  hasEvidence: boolean;
  reasons: string[];
};

export function isDetailTab(value: string | null | undefined): value is DetailTab;
export function normalizeDetailTab(value: string | null | undefined): DetailTab | null;
export function detailTabLabel(tab: DetailTab): string;
export function buildExplorerDetailTabHref(tableId: number, tab: DetailTab, extraParams?: Record<string, string | number | null | undefined>): string;
export function buildObservabilitySnapshot(input: ObservabilitySnapshotInput): ObservabilitySnapshot;
