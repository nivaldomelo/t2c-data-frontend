import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  Info,
  OctagonAlert,
} from "lucide-react";

export type JourneyStatusTone = "success" | "warning" | "danger" | "info" | "neutral";
export type JourneyBaseTone = "neutral" | "accent" | "success" | "warning" | "danger";

export type JourneyStatusVisual = {
  tone: JourneyStatusTone;
  label: string;
  Icon: LucideIcon;
  cardClassName: string;
  borderClassName: string;
  backgroundClassName: string;
  accentClassName: string;
  iconWrapClassName: string;
  iconClassName: string;
  badgeTone: "neutral" | "accent" | "success" | "warning" | "danger";
  metricBadgeClassName: string;
};

function normalizeText(value: string | null | undefined): string {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function inferToneFromLabel(label: string, fallback: JourneyBaseTone): JourneyStatusTone {
  const normalized = normalizeText(label);

  if (
    normalized.includes("critico") ||
    normalized.includes("falha") ||
    normalized.includes("rejeitado") ||
    normalized.includes("recusad") ||
    normalized.includes("sensivel") ||
    normalized.includes("erro")
  ) {
    return "danger";
  }

  if (
    normalized.includes("sem regras") ||
    normalized.includes("cobertura pendente") ||
    normalized.includes("nunca executado") ||
    normalized.includes("nao classificada") ||
    normalized.includes("nao elegivel") ||
    normalized.includes("revalid") ||
    normalized.includes("pendente") ||
    normalized.includes("parcial") ||
    normalized.includes("atencao") ||
    normalized.includes("freshness atrasado") ||
    normalized.includes("com atencao") ||
    normalized.includes("consumo parcial") ||
    normalized.includes("linhagem parcial") ||
    normalized.includes("sem sucesso confirmado")
  ) {
    return "warning";
  }

  if (
    normalized.includes("sem consumo") ||
    normalized.includes("sem vinculo") ||
    normalized.includes("nao relacionado") ||
    normalized.includes("consumo nao confirmado") ||
    normalized.includes("sem downstream") ||
    normalized.includes("informativo") ||
    normalized.includes("relacionado")
  ) {
    return "info";
  }

  if (
    normalized.includes("sem dados") ||
    normalized.includes("a confirmar") ||
    normalized.includes("nao disponivel") ||
    normalized.includes("sem linhagem")
  ) {
    return "neutral";
  }

  if (
    normalized.includes("saudavel") ||
    normalized.includes("completa") ||
    normalized.includes("completo") ||
    normalized.includes("classificada") ||
    normalized.includes("certificado") ||
    normalized.includes("sem incidentes") ||
    normalized.includes("sucesso") ||
    normalized.includes("com consumo") ||
    normalized.includes("ativas")
  ) {
    return "success";
  }

  if (fallback === "danger") return "danger";
  if (fallback === "warning") return "warning";
  if (fallback === "accent") return "info";
  if (fallback === "success") return "success";
  return "neutral";
}

export function getJourneyStatusVisual({
  label,
  tone,
}: {
  label: string;
  tone: JourneyBaseTone;
}): JourneyStatusVisual {
  const resolvedTone = inferToneFromLabel(label, tone);

  if (resolvedTone === "success") {
    return {
      tone: resolvedTone,
      label,
      Icon: CheckCircle2,
      cardClassName: "border-success-200/90 bg-[linear-gradient(180deg,rgba(236,253,245,0.92)_0%,rgba(255,255,255,0.98)_55%,rgba(240,253,250,0.9)_100%)] shadow-[0_18px_40px_rgba(5,150,105,0.10)]",
      borderClassName: "border-success-200/90",
      backgroundClassName: "bg-success-50/55",
      accentClassName: "bg-success-500",
      iconWrapClassName: "border-success-200 bg-success-50 text-success-700",
      iconClassName: "text-success-700",
      badgeTone: "success",
      metricBadgeClassName: "border-success-200/80 bg-surface/85 text-success-700",
    };
  }

  if (resolvedTone === "warning") {
    return {
      tone: resolvedTone,
      label,
      Icon: AlertTriangle,
      cardClassName: "border-warning-200/95 bg-[linear-gradient(180deg,rgba(255,251,235,0.96)_0%,rgba(255,255,255,0.99)_55%,rgba(255,247,237,0.92)_100%)] shadow-[0_18px_40px_rgba(217,119,6,0.10)]",
      borderClassName: "border-warning-200/95",
      backgroundClassName: "bg-warning-50/60",
      accentClassName: "bg-warning-500",
      iconWrapClassName: "border-warning-200 bg-warning-50 text-warning-700",
      iconClassName: "text-warning-700",
      badgeTone: "warning",
      metricBadgeClassName: "border-warning-200/80 bg-surface/88 text-warning-700",
    };
  }

  if (resolvedTone === "danger") {
    return {
      tone: resolvedTone,
      label,
      Icon: OctagonAlert,
      cardClassName: "border-danger-200/95 bg-[linear-gradient(180deg,rgba(255,241,242,0.96)_0%,rgba(255,255,255,0.99)_55%,rgba(255,245,245,0.92)_100%)] shadow-[0_18px_40px_rgba(225,29,72,0.10)]",
      borderClassName: "border-danger-200/95",
      backgroundClassName: "bg-danger-50/60",
      accentClassName: "bg-danger-500",
      iconWrapClassName: "border-danger-200 bg-danger-50 text-danger-700",
      iconClassName: "text-danger-700",
      badgeTone: "danger",
      metricBadgeClassName: "border-danger-200/80 bg-surface/88 text-danger-700",
    };
  }

  if (resolvedTone === "info") {
    return {
      tone: resolvedTone,
      label,
      Icon: Info,
      cardClassName: "border-info-200/90 bg-[linear-gradient(180deg,rgba(240,249,255,0.96)_0%,rgba(255,255,255,0.99)_55%,rgba(239,246,255,0.92)_100%)] shadow-[0_18px_40px_rgba(14,165,233,0.10)]",
      borderClassName: "border-info-200/90",
      backgroundClassName: "bg-info-50/55",
      accentClassName: "bg-info-500",
      iconWrapClassName: "border-info-200 bg-info-50 text-info-700",
      iconClassName: "text-info-700",
      badgeTone: "accent",
      metricBadgeClassName: "border-info-200/80 bg-surface/88 text-info-700",
    };
  }

  return {
    tone: resolvedTone,
    label,
    Icon: CircleDashed,
    cardClassName: "border-border/95 bg-[linear-gradient(180deg,rgba(248,250,252,0.98)_0%,rgba(255,255,255,0.99)_55%,rgba(248,250,252,0.94)_100%)] shadow-[0_18px_40px_rgba(15,23,42,0.06)]",
    borderClassName: "border-border/95",
    backgroundClassName: "bg-bg-subtle/70",
    accentClassName: "bg-slate-400",
    iconWrapClassName: "border-border bg-bg-subtle text-text-body",
    iconClassName: "text-text-body",
    badgeTone: "neutral",
    metricBadgeClassName: "border-border/80 bg-surface/90 text-text-body",
  };
}
