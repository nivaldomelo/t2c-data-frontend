import { presentStatus, UX_COPY } from "@/lib/presentation/status-copy";
import type { RowCountMetrics } from "@/features/explorer/types";
import { formatCompactNumber } from "@/features/explorer/utils";

import type { JourneyPhaseKey, JourneySectionItem } from "../types";

export function parsePositiveInt(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function formatBytes(value: number): string {
  if (!Number.isFinite(value)) return UX_COPY.notAvailable;
  const abs = Math.abs(value);
  const units = ["B", "KB", "MB", "GB", "TB", "PB"];
  let unitIndex = 0;
  let current = abs;
  while (current >= 1024 && unitIndex < units.length - 1) {
    current /= 1024;
    unitIndex += 1;
  }
  const formatted = current >= 10 || unitIndex === 0 ? current.toFixed(0) : current.toFixed(1);
  return `${value < 0 ? "-" : ""}${formatted} ${units[unitIndex]}`;
}

export function uniqueStrings(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.filter((item): item is string => Boolean(item && item.trim()))));
}

export function pickLatestTimestamp(values: Array<string | null | undefined>): string | null {
  return values
    .filter((value): value is string => Boolean(value))
    .map((value) => new Date(value))
    .filter((date) => !Number.isNaN(date.getTime()))
    .reduce<Date | null>((latest, date) => {
      if (!latest || date.getTime() > latest.getTime()) return date;
      return latest;
    }, null)
    ?.toISOString()
    ?? null;
}

export function formatFreshnessLabel(value: string | null, ageHours: number | null, ageSeconds: number | null): string | null {
  if (value) {
    const normalized = value.toLowerCase();
    if (normalized === "fresh") return "Atualizado";
    if (normalized === "recent") return "Recente";
    if (normalized === "stale") return "Atrasado";
    if (normalized === "unknown") return UX_COPY.toConfirm;
    return presentStatus(value);
  }
  if (ageHours !== null && ageHours !== undefined) {
    if (ageHours <= 24) return "Atualizado";
    if (ageHours <= 48) return "Recente";
    return "Atrasado";
  }
  if (ageSeconds !== null && ageSeconds !== undefined) {
    if (ageSeconds <= 86400) return "Atualizado";
    if (ageSeconds <= 172800) return "Recente";
    return "Atrasado";
  }
  return null;
}

export function formatRowCountTrend(rowCountMetrics: RowCountMetrics | null): string {
  if (!rowCountMetrics || rowCountMetrics.current_row_count === null || rowCountMetrics.previous_row_count === null) {
    return UX_COPY.noHistory;
  }
  const delta = rowCountMetrics.growth_absolute;
  const percent = rowCountMetrics.growth_percent;
  if (delta === null || percent === null) {
    return "Sem variação";
  }
  const sign = delta > 0 ? "+" : "";
  return `${sign}${formatCompactNumber(delta)} linhas (${percent > 0 ? "+" : ""}${percent.toFixed(1)}%)`;
}

export function summarizeList(items: string[], empty = "Não disponível"): string {
  if (!items.length) return empty;
  if (items.length <= 3) return items.join(" · ");
  return `${items.slice(0, 3).join(" · ")} · +${items.length - 3}`;
}

export function getJourneyItemKey(item: JourneySectionItem, phase: JourneyPhaseKey, index: number): string {
  return [
    phase,
    item.key,
    item.id,
    item.entity_id,
    item.entity_kind,
    item.relation_kind,
    item.direction,
    item.title,
    item.meta,
    item.href,
    index,
  ]
    .filter((value) => value !== undefined && value !== null && `${value}`.trim().length > 0)
    .map((value) => `${value}`)
    .join("-");
}
