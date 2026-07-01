/**
 * @param {{
 *   loading: boolean;
 *   error: string;
 *   episodes: Array<unknown>;
 *   events: Array<unknown>;
 * }} input
 */
export function resolveExplorerHistoryState({ loading, error, episodes, events }) {
  if (loading) return "loading";
  if (error) return "error";
  if (episodes.length > 0) return "episodes";
  if (events.length > 0) return "events";
  return "empty";
}
