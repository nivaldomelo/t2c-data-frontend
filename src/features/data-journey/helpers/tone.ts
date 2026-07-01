import { presentStatus, UX_COPY } from "@/lib/presentation/status-copy";

import type { JourneyTone } from "../types";

export function getToneForStatus(value: string | null | undefined): JourneyTone {
  const normalized = (value || "").toLowerCase();
  if (!normalized) return "neutral";
  if (
    normalized.includes("certified") ||
    normalized.includes("ok") ||
    normalized.includes("healthy") ||
    normalized.includes("saud") ||
    normalized.includes("success") ||
    normalized.includes("completo")
  ) {
    return "success";
  }
  if (
    normalized.includes("critical") ||
    normalized.includes("crítico") ||
    normalized.includes("falha") ||
    normalized.includes("erro") ||
    normalized.includes("reprov") ||
    normalized.includes("expired")
  ) {
    return "danger";
  }
  if (
    normalized.includes("attention") ||
    normalized.includes("aten") ||
    normalized.includes("warning") ||
    normalized.includes("pend") ||
    normalized.includes("review") ||
    normalized.includes("partial") ||
    normalized.includes("degrad")
  ) {
    return "warning";
  }
  return "neutral";
}

export function toneFromNumber(value: number | null | undefined, thresholds: { success: number; warning: number }): JourneyTone {
  if (value === null || value === undefined || Number.isNaN(value)) return "neutral";
  if (value >= thresholds.success) return "success";
  if (value >= thresholds.warning) return "warning";
  return "danger";
}

export function statusLabelFromSeverity(value: string | null | undefined): JourneyTone {
  const normalized = (value || "").toLowerCase();
  if (normalized.includes("critical") || normalized.includes("crítico") || normalized === "sev1") return "danger";
  if (normalized.includes("high") || normalized.includes("alta") || normalized === "sev2") return "warning";
  if (normalized.includes("medium") || normalized.includes("média") || normalized === "sev3") return "accent";
  if (normalized.includes("low") || normalized.includes("baixa") || normalized === "sev4") return "neutral";
  return "neutral";
}

export function certificationStatusLabel(value: string | null | undefined): string {
  return presentStatus(value, UX_COPY.toConfirm);
}

export function certificationTone(value: string | null | undefined): JourneyTone {
  const normalized = (value || "").toLowerCase();
  if (!normalized || normalized === "unknown" || normalized === "not_assessed") return "neutral";
  if (normalized === "certified" || normalized === "eligible") return "success";
  if (normalized === "rejected" || normalized === "expired") return "danger";
  if (normalized === "revalidation_pending" || normalized === "in_review" || normalized === "not_eligible") return "warning";
  return "neutral";
}

export function isWithinDays(dateValue: string | null | undefined, days: number): boolean {
  if (!dateValue) return false;
  const timestamp = Date.parse(dateValue);
  if (Number.isNaN(timestamp)) return false;
  return Date.now() - timestamp <= days * 24 * 60 * 60 * 1000;
}

export function isOpenIncidentStatus(value: string | null | undefined): boolean {
  const normalized = (value || "").toLowerCase();
  return Boolean(normalized) && (normalized.includes("open") || normalized.includes("abert") || normalized.includes("invest") || normalized.includes("new"));
}

export function isClosedIncidentStatus(value: string | null | undefined): boolean {
  const normalized = (value || "").toLowerCase();
  return Boolean(normalized) && (normalized.includes("closed") || normalized.includes("resolv") || normalized.includes("solved") || normalized.includes("done") || normalized.includes("encerr"));
}

export function ingestionStateLabel(value: string | null | undefined): string {
  const normalized = (value || "").toLowerCase();
  if (!normalized) return UX_COPY.toConfirm;
  if (normalized.includes("success") || normalized.includes("sucesso")) return "Sucesso";
  if (normalized.includes("fail") || normalized.includes("falha") || normalized.includes("error") || normalized.includes("erro")) return "Falha";
  if (normalized.includes("run") || normalized.includes("exec")) return "Em execução";
  if (normalized.includes("degrad") || normalized.includes("slow")) return "Degradado";
  if (normalized.includes("avail")) return "Disponível";
  if (normalized.includes("stale") || normalized.includes("atras") || normalized.includes("late")) return "Sem sucesso recente";
  if (normalized.includes("unknown")) return UX_COPY.toConfirm;
  return presentStatus(value, UX_COPY.toConfirm);
}

export function ingestionHealthLabel({
  linked,
  state,
  lastSuccessAt,
  freshnessSeconds,
  operationalSlaStatus,
}: {
  linked: boolean;
  state: string | null | undefined;
  lastSuccessAt: string | null | undefined;
  freshnessSeconds: number | null | undefined;
  operationalSlaStatus: string | null | undefined;
}): { label: string; tone: JourneyTone; detail: string } {
  if (!linked && !state) {
    return {
      label: "Sem pipeline",
      tone: "neutral",
      detail: "Nenhum pipeline operacional foi associado a este ativo.",
    };
  }

  const staleByFreshness = freshnessSeconds !== null && freshnessSeconds !== undefined && freshnessSeconds >= 30 * 24 * 60 * 60;
  const overdueBySla = Boolean(operationalSlaStatus && /over|atras|expired|late|warning|pend/i.test(operationalSlaStatus));
  const hasSuccess = Boolean(lastSuccessAt);
  const stateLabel = ingestionStateLabel(state);

  if (!hasSuccess) {
    return {
      label: staleByFreshness || overdueBySla ? "Freshness atrasado" : "Sem sucesso confirmado",
      tone: staleByFreshness || overdueBySla ? "warning" : "warning",
      detail: linked
        ? "Pipeline mapeado, mas nenhuma execução bem-sucedida foi encontrada no histórico operacional deste ativo."
        : "Nenhuma execução bem-sucedida foi encontrada no histórico operacional deste ativo.",
    };
  }

  if (staleByFreshness || overdueBySla) {
    return {
      label: "Atenção · freshness atrasado",
      tone: "warning",
      detail: "Há pipeline mapeado para este ativo, mas o freshness está atrasado em relação ao ritmo esperado.",
    };
  }

  if (stateLabel === "Falha") {
    return {
      label: "Falha",
      tone: "danger",
      detail: "A última execução conhecida não concluiu com sucesso.",
    };
  }

  if (stateLabel === "Em execução") {
    return {
      label: "Em execução",
      tone: "warning",
      detail: "O pipeline está em execução no momento.",
    };
  }

  return {
    label: "Sucesso",
    tone: "success",
    detail: "Pipeline mapeado com sucesso recente e freshness dentro do esperado.",
  };
}
