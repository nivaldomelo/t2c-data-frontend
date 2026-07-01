import type { IncidentSeverity, IncidentStatus } from "@/features/incidents/types";

import type { OriginFilter, Tone } from "./types";

export const STATUS_OPTIONS: IncidentStatus[] = ["open", "investigating", "mitigated", "resolved", "closed", "reopened", "recurring"];
export const STATUS_LABELS: Record<IncidentStatus, string> = {
  open: "Aberto",
  investigating: "Investigando",
  mitigated: "Mitigado",
  resolved: "Resolvido",
  closed: "Fechado",
  reopened: "Reaberto",
  recurring: "Recorrente",
};
export const SEVERITY_OPTIONS: IncidentSeverity[] = ["sev1", "sev2", "sev3", "sev4"];
export const SEVERITY_LABELS: Record<IncidentSeverity, string> = {
  sev1: "Crítico",
  sev2: "Alto",
  sev3: "Médio",
  sev4: "Baixo",
};
export const FILTER_PANEL_KEY = "t2c.incidents.filters.open";
export const DEFAULT_PAGE_SIZE = 10;
export const ADVANCED_FILTERS_KEY = "t2c.incidents.filters.advanced.open";

export const STATUS_ALIASES: Record<string, IncidentStatus> = {
  aberto: "open",
  open: "open",
  investigando: "investigating",
  investigating: "investigating",
  mitigado: "mitigated",
  mitigated: "mitigated",
  resolvido: "resolved",
  resolved: "resolved",
  fechado: "closed",
  closed: "closed",
  reaberto: "reopened",
  reopened: "reopened",
  recorrente: "recurring",
  recurring: "recurring",
};

export const SEVERITY_ALIASES: Record<string, IncidentSeverity> = {
  crítico: "sev1",
  critico: "sev1",
  sev1: "sev1",
  high: "sev2",
  alto: "sev2",
  sev2: "sev2",
  medium: "sev3",
  médio: "sev3",
  medio: "sev3",
  sev3: "sev3",
  low: "sev4",
  baixo: "sev4",
  sev4: "sev4",
};

export const ORIGIN_FILTERS: OriginFilter[] = [
  { label: "Todos", value: "" },
  { label: "Data Quality", value: "dq_rule" },
  { label: "Ingestão", value: "ingestion_ops" },
  { label: "Privacidade", value: "privacy" },
  { label: "Certificação", value: "certification" },
  { label: "Operação", value: "platform_ops" },
  { label: "Manual", value: "manual" },
];

export const TONES: Record<"risk" | "ops" | "fresh" | "neutral", Tone> = {
  risk: {
    border: "border-danger-200/80",
    surface: "from-rose-50 via-orange-50 to-white",
    icon: "bg-danger-100 text-danger-700",
  },
  ops: {
    border: "border-info-200/80",
    surface: "from-accent-50 via-cyan-50 to-white",
    icon: "bg-info-100 text-info-700",
  },
  fresh: {
    border: "border-success-200/80",
    surface: "from-emerald-50 via-teal-50 to-white",
    icon: "bg-success-100 text-success-700",
  },
  neutral: {
    border: "border-border/80",
    surface: "from-slate-50 via-white to-white",
    icon: "bg-bg-subtle text-text-body",
  },
};
