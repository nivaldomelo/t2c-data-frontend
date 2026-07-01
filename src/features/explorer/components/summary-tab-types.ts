import type { LucideIcon } from "lucide-react";

import type {
  DQLatest,
  DbType,
  GlossaryTermItem,
  TableColumn,
  TableDetailInfo,
  TableCorrelationSummary,
  TableIngestionExecutionPage,
  TableIngestionSummary,
  TableKind,
  TagItem,
  CanonicalAssetContext,
  TableOperationalContext,
  TableStewardshipRequest,
} from "../types";

export type ExplorerSummaryStat = {
  accent: string;
  border: string;
  icon: LucideIcon;
  iconClassName: string;
  subtitle: string;
  title: string;
  value: string;
};

export type ExplorerSummaryTabContentProps = {
  canEdit: boolean;
  canOpenStewardshipRequests: boolean;
  columnCounts: {
    total: number;
    documented: number;
    commented: number;
    primaryKeys: number;
    required: number;
    nullable: number;
  };
  dictionaryCoveragePct: number;
  dqLatest: DQLatest | null;
  dqMessage: string;
  dqState: "idle" | "loading" | "ready" | "empty" | "error";
  glossaryCoveragePct: number;
  ingestionError: string;
  ingestionExecutions: TableIngestionExecutionPage | null;
  ingestionLoading: boolean;
  ingestionSummary: TableIngestionSummary | null;
  onOpenIngestionLogs: (executionId: string) => void;
  onAutoOpenIncident: () => void;
  autoOpening: boolean;
  onRerunProfiling: () => void;
  profilingRerunLoading: boolean;
  onReprocessDatasourceScan: () => void;
  scanReprocessLoading: boolean;
  onConfirmOwnerReview: () => void;
  onConfirmPrivacyReview: () => void;
  owner: string | null;
  ownerArea: string | null;
  ownerEmail: string | null;
  selectedDatabaseName: string;
  selectedDbType: DbType | null;
  selectedSchemaName: string;
  selectedTableFullName: string;
  selectedTableKind: TableKind | null;
  summaryColumnsPreview: TableColumn[];
  summaryStats: ExplorerSummaryStat[];
  onTableDescriptionSaved: () => void;
  onStewardChanged: () => void;
  stewardshipRequests: TableStewardshipRequest[];
  stewardshipLoading: boolean;
  stewardshipError: string;
  tableDescription: string | null;
  tableInfo: TableDetailInfo | null;
  tableTags: TagItem[];
  tableTerms: GlossaryTermItem[];
  correlationSummary: TableCorrelationSummary | null;
  correlationLoading: boolean;
  correlationError: string;
  canonicalAssetLoading: boolean;
  canonicalAssetError: string;
  canonicalAsset: CanonicalAssetContext | null;
  operationalContext: TableOperationalContext | null;
  operationalLoading: boolean;
  operationalError: string;
};
