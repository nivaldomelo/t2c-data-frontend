export const UX_COPY = {
  notAvailable: "Não disponível",
  toConfirm: "A confirmar",
  notDefined: "Não definido",
  neverReviewed: "Nunca revisado",
  noHistory: "Sem histórico",
  noLink: "Sem vínculo",
} as const;

const FRIENDLY_STATUS_LABELS: Record<string, string> = {
  null: UX_COPY.notAvailable,
  none: UX_COPY.notAvailable,
  n_a: UX_COPY.notAvailable,
  na: UX_COPY.notAvailable,
  n_d: UX_COPY.notAvailable,
  nd: UX_COPY.notAvailable,
  unknown: UX_COPY.toConfirm,
  undefined: UX_COPY.notDefined,
  not_defined: UX_COPY.notDefined,
  not_set: UX_COPY.notDefined,
  no_history: UX_COPY.noHistory,
  never_reviewed: UX_COPY.neverReviewed,
  not_reviewed: UX_COPY.neverReviewed,
  no_link: UX_COPY.noLink,
  unlinked: UX_COPY.noLink,
  available: "Disponível",
  unavailable: UX_COPY.notAvailable,
  low: "Baixo",
  medium: "Médio",
  high: "Alto",
  critical: "Crítico",
  success: "Concluído",
  succeeded: "Concluído",
  submitted: "Enviado",
  partial_success: "Concluído com ressalvas",
  failed: "Falhou",
  error: "Erro",
  running: "Em execução",
  queued: "Na fila",
  stale: "Atrasado",
  fresh: "Atualizado",
  recent: "Recente",
  certified: "Certificado",
  eligible: "Elegível",
  not_eligible: "Ainda não elegível",
  revalidation_pending: "Revalidação pendente",
  in_review: "Em revisão",
  not_assessed: UX_COPY.neverReviewed,
  rejected: "Rejeitado",
  expired: "Expirado",
  unclassified: "Não classificada",
};

function humanizeToken(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function presentText(value: string | number | null | undefined, fallback: string = UX_COPY.notAvailable): string {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : fallback;
  }
  const trimmed = value.trim();
  if (!trimmed) return fallback;

  const normalized = trimmed.toLowerCase().replace(/\s+/g, "_");
  return FRIENDLY_STATUS_LABELS[normalized] ?? trimmed;
}

export function presentStatus(value: string | null | undefined, fallback: string = UX_COPY.toConfirm): string {
  if (!value) return fallback;
  const normalized = value.trim().toLowerCase().replace(/\s+/g, "_");
  return FRIENDLY_STATUS_LABELS[normalized] ?? humanizeToken(value);
}
