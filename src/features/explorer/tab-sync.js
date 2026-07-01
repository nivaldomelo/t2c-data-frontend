/**
 * @typedef {"summary" | "columns" | "tags" | "glossary" | "lineage" | "history" | "consumption" | "observability"} DetailTab
 */

/**
 * Decide whether the URL should be mirrored back into the local Explorer tab state.
 *
 * @param {{ activeTab: DetailTab; pendingTab: DetailTab | null; urlTab: DetailTab }} input
 * @returns {boolean}
 */
export function shouldMirrorExplorerDetailTabFromUrl({ activeTab, pendingTab, urlTab }) {
  if (urlTab === activeTab) return false;
  if (pendingTab === activeTab) return false;
  if (pendingTab !== null && pendingTab !== urlTab) return false;
  return true;
}
