import type { ReactNode } from "react";

import type {
  ObservabilityAssetRecord,
  ObservabilityDataSourceOption,
  ObservabilityFiltersState,
  ObservabilityPageResult,
  ObservabilityStatus,
  ObservabilityTimelineEvent,
  ObservabilitySchemaOption,
  ObservabilityTableOption,
} from "../types";

export type SummaryCardsProps = {
  data: ObservabilityPageResult | null;
  loading: boolean;
  onQuickFilter?: (key: "all" | "critical" | "sla" | "drift" | "volume" | "pipeline") => void;
};

export type PriorityAlertsProps = {
  data: ObservabilityPageResult | null;
  loading: boolean;
  onQuickFilter?: (key: "all" | "critical" | "sla" | "drift" | "volume" | "pipeline") => void;
};

export type FiltersProps = {
  filters: ObservabilityFiltersState;
  dataSources: ObservabilityDataSourceOption[];
  schemaOptions: ObservabilitySchemaOption[];
  tableOptions: ObservabilityTableOption[];
  filterOptions: ObservabilityPageResult["filter_options"] | null;
  selectedDataSource: ObservabilityDataSourceOption | null;
  dataSourcesLoading: boolean;
  schemasLoading: boolean;
  tablesLoading: boolean;
  loading: boolean;
  total: number;
  onPatch: (patch: Partial<ObservabilityFiltersState>) => void;
  onReset: () => void;
  onRefresh: () => void;
};

export type AssetsTableProps = {
  data: ObservabilityPageResult | null;
  loading: boolean;
  onOpenDetail: (asset: ObservabilityAssetRecord) => void;
  onPageChange: (page: number) => void;
};

export type BadgeProps = {
  status: ObservabilityStatus | ObservabilityAssetRecord["reliability_status"];
};

export type ReliabilityDecisionCardProps = {
  asset: ObservabilityAssetRecord;
};

export type SignalListCardProps = {
  title: string;
  description: string;
  items: ObservabilityAssetRecord[];
  emptyLabel: string;
  testId: string;
};

export type RelatedSignalsPanelProps = {
  data: ObservabilityPageResult | null;
  loading: boolean;
};

export type TimelineProps = {
  events: ObservabilityTimelineEvent[];
};

export type AssetDetailModalProps = {
  asset: ObservabilityAssetRecord | null;
  error: string;
  loading: boolean;
  open: boolean;
  onClose: () => void;
};

export type TabCardProps = {
  children: ReactNode;
  microcopy: string;
  title: string;
};

export type DetailFieldProps = {
  label: string;
  value: string;
};

export type DetailListProps = {
  items: string[];
  title: string;
};

export type MiniMetricProps = {
  label: string;
  value: string;
};
