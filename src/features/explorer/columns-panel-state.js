/**
 * @param {{ columns: Array<unknown>; columnsLoading: boolean; columnsError: string }} input
 */
export function resolveExplorerColumnsPanelState({ columns, columnsLoading, columnsError }) {
  if (columnsLoading) return { kind: "loading" };
  if (columnsError && columns.length === 0) {
    return { kind: "error", message: columnsError };
  }
  if (columns.length === 0) return { kind: "empty" };
  return { kind: "ready" };
}
