export function resolveExplorerHistoryState(input: {
  loading: boolean;
  error: string;
  episodes: unknown[];
  events: unknown[];
}): "loading" | "error" | "episodes" | "events" | "empty";
