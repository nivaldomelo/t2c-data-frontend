/**
 * @param {Array<{ importance_score: number; occurred_at: string }>} episodes
 */
export function dedupeTimelineEpisodes(episodes) {
  const seen = new Set();
  const deduped = [];
  const duplicates = [];
  for (const episode of episodes) {
    if (seen.has(episode.id)) {
      duplicates.push(episode.id);
      continue;
    }
    seen.add(episode.id);
    deduped.push(episode);
  }
  if (duplicates.length && process.env.NODE_ENV !== "production") {
    console.warn("Duplicate timeline episode ids detected and deduplicated", [...new Set(duplicates)]);
  }
  return deduped;
}

/**
 * @param {Array<{ importance_score: number; occurred_at: string; id: string }>} episodes
 */
export function sortTimelineEpisodes(episodes) {
  return [...episodes].sort(
    (a, b) =>
      b.importance_score - a.importance_score ||
      new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime(),
  );
}

/**
 * @param {string} start
 * @param {string} end
 */
export function formatEpisodeWindow(start, end) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const sameDay = startDate.toDateString() === endDate.toDateString();
  const timeFormatter = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const dateFormatter = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });
  if (sameDay) {
    const shortDate = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(startDate);
    return `${shortDate} · ${timeFormatter.format(startDate)} - ${timeFormatter.format(endDate)}`;
  }
  return `${dateFormatter.format(startDate)} → ${dateFormatter.format(endDate)}`;
}
