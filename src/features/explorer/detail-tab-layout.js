/**
 * @param {{
 *   activeTab: "summary" | "columns" | "tags" | "glossary" | "lineage" | "history" | "consumption" | "observability";
 *   columnsHeight: number;
 *   summaryHeight: number;
 * }} input
 */
export function resolveExplorerDetailTabLayout({ activeTab, columnsHeight, summaryHeight }) {
  const minHeight = Math.max(summaryHeight || 0, columnsHeight || 0);
  return {
    shellStyle: {
      minHeight: minHeight > 0 ? `${minHeight}px` : undefined,
      overflowAnchor: "none",
    },
    columnsPanelClassName:
      activeTab === "columns"
        ? "relative z-10"
        : "absolute inset-0 invisible pointer-events-none",
    summaryPanelClassName:
      activeTab === "summary"
        ? "relative z-10"
        : "absolute inset-0 invisible pointer-events-none",
  };
}

/**
 * @param {{
 *   activeTab: "summary" | "consumption";
 *   summaryHeight: number;
 *   consumptionHeight: number;
 *   shellHeight?: number;
 * }} input
 */
export function resolveExplorerSummaryConsumptionLayout({ activeTab, summaryHeight, consumptionHeight, shellHeight }) {
  const activeHeight = activeTab === "summary" ? summaryHeight : consumptionHeight;
  const minHeight = Math.max(shellHeight || 0, activeHeight || 0);
  return {
    shellStyle: {
      minHeight: minHeight > 0 ? `${minHeight}px` : undefined,
      overflowAnchor: "none",
      overflow: "hidden",
    },
    summaryPanelClassName:
      activeTab === "summary"
        ? "relative z-10"
        : "absolute inset-0 invisible pointer-events-none",
    consumptionPanelClassName:
      activeTab === "consumption"
        ? "relative z-10"
        : "absolute inset-0 invisible pointer-events-none",
  };
}
