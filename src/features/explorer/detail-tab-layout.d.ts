/**
 * @param {{
 *   activeTab: "summary" | "columns" | "tags" | "glossary" | "lineage" | "history" | "consumption" | "observability";
 *   columnsHeight: number;
 *   summaryHeight: number;
 * }} input
 */
export function resolveExplorerDetailTabLayout({
  activeTab,
  columnsHeight,
  summaryHeight,
}: {
  activeTab: "summary" | "columns" | "tags" | "glossary" | "lineage" | "history" | "consumption" | "observability";
  columnsHeight: number;
  summaryHeight: number;
}): {
  shellStyle: {
    minHeight: string | undefined;
    overflowAnchor: "none";
  };
  columnsPanelClassName: string;
  summaryPanelClassName: string;
};

export function resolveExplorerSummaryConsumptionLayout({
  activeTab,
  summaryHeight,
  consumptionHeight,
  shellHeight,
}: {
  activeTab: "summary" | "consumption";
  summaryHeight: number;
  consumptionHeight: number;
  shellHeight?: number;
}): {
  shellStyle: {
    minHeight: string | undefined;
    overflowAnchor: "none";
  };
  summaryPanelClassName: string;
  consumptionPanelClassName: string;
};
