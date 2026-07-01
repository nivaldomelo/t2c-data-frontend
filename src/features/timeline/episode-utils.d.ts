export function dedupeTimelineEpisodes<Episode extends { id: string }>(episodes: Episode[]): Episode[];

export function sortTimelineEpisodes<Episode extends { importance_score: number; occurred_at: string }>(episodes: Episode[]): Episode[];

export function formatEpisodeWindow(start: string, end: string): string;
