export type ExplorerColumnsPanelState =
  | { kind: "loading" }
  | { kind: "empty" }
  | { kind: "error"; message: string }
  | { kind: "ready" };

export function resolveExplorerColumnsPanelState(input: {
  columns: Array<unknown>;
  columnsLoading: boolean;
  columnsError: string;
}): ExplorerColumnsPanelState;
