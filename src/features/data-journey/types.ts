import type {
  CanonicalAssetContext,
  DQLatest,
  MetabaseConsumptionSummary,
  TableCorrelationSummary,
  TableDetailInfo,
  TableLocator,
  TableStewardshipRequest,
} from "@/features/explorer/types";
import type { DataLakeTableDetail } from "@/features/integrations/types";
import type { DQRule } from "@/features/data-quality/types";
import type { SemanticProductDetail } from "@/features/semantic/types";

export type JourneyPhaseKey =
  | "identity"
  | "governance"
  | "dataQuality"
  | "dqRules"
  | "certification"
  | "privacy"
  | "incidents"
  | "ingestion"
  | "lineage"
  | "consumption"
  | "dataLake"
  | "actions";

export type JourneyTone = "neutral" | "accent" | "success" | "warning" | "danger";

export type TableVolumeMeasureResponse = {
  table_id?: number;
  row_count?: number | null;
  measurement_type?: string | null;
  measurement_source?: string | null;
  status?: string | null;
  measured_at?: string | null;
  duration_ms?: number | null;
  error_message?: string | null;
};

export type JourneySummaryState = {
  locator: TableLocator | null;
  tableDetail: TableDetailInfo | null;
  canonical: CanonicalAssetContext | null;
  correlation: TableCorrelationSummary | null;
  dq: DQLatest | null;
  dqRules: DQRule[];
  metabase: MetabaseConsumptionSummary | null;
  dataLake: DataLakeTableDetail | null;
  stewardshipRequests: TableStewardshipRequest[];
  semanticProduct: SemanticProductDetail | null;
  locatorError: string | null;
  tableDetailError: string | null;
  canonicalError: string | null;
  correlationError: string | null;
  dqError: string | null;
  metabaseError: string | null;
  dataLakeError: string | null;
};

export type JourneySectionRow = { label: string; value: string; tone?: JourneyTone; href?: string | null };

export type JourneySectionItem = {
  key?: string;
  id?: string | number;
  title: string;
  detail: string;
  meta?: string;
  tone?: JourneyTone;
  href?: string;
  entity_id?: number | string;
  entity_kind?: string;
  relation_kind?: string;
  direction?: "upstream" | "downstream" | string;
};

export type JourneySectionContent = {
  title: string;
  intro: string;
  rows: JourneySectionRow[];
  items: JourneySectionItem[];
  itemsTitle?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  primaryActionLabel?: string;
  primaryActionHref?: string;
  secondaryActionLabel?: string;
  secondaryActionHref?: string;
  measureActionLabel?: string;
  measureActionDescription?: string;
};
