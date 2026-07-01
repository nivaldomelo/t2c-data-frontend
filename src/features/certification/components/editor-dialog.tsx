import type { FormEvent } from "react";
import { CheckCircle2 } from "lucide-react";

import {
  CertificationUsageBadge,
  type CertificationBadgeKey,
  CertificationStatusBadge,
  certificationStatusFrameClass,
  certificationStatusHeaderClass,
} from "@/components/certification/certification-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ChecklistPill } from "@/features/certification/components/checklist-pill";
import { formatCertificationDate } from "@/features/certification/components/view-utils";
import type { CertificationDecisionEvent, CertificationForm, CertificationItem } from "@/features/certification/types";
import type { CanonicalAssetContext } from "@/features/explorer/types";
import { cn } from "@/lib/cn";
import { useModalDismiss } from "@/lib/use-modal-dismiss";

function formatRuleLabel(rule: string) {
  return rule.replace(/_/g, " ").replace(/\b\w/g, (match) => match.toUpperCase()).trim();
}

function certificationEligibilityLabel(eligible: boolean) {
  return eligible ? "Atende prontidão mínima" : "Abaixo da prontidão mínima";
}

type CertificationEditorDialogProps = {
  open: boolean;
  saving: boolean;
  selectedItem: CertificationItem | null;
  form: CertificationForm;
  statusOptions: Array<{ value: string; label: string }>;
  criticalityOptions: Array<{ value: string; label: string }>;
  badgeOptions: { value: CertificationBadgeKey; label: string; description: string }[];
  canonicalAsset: CanonicalAssetContext | null;
  canonicalLoading: boolean;
  canonicalError: string;
  eventHistory: CertificationDecisionEvent[];
  eventHistoryLoading: boolean;
  eventHistoryError: string;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onToggleCertificationBadge: (badge: CertificationBadgeKey) => void;
  onFormChange: (patch: Partial<CertificationForm>) => void;
  onWorkflowAction: (action: "submit" | "approve" | "reject" | "revalidate") => void;
};

export function CertificationEditorDialog({
  open,
  saving,
  selectedItem,
  form,
  statusOptions,
  criticalityOptions,
  badgeOptions,
  canonicalAsset,
  canonicalLoading,
  canonicalError,
  eventHistory,
  eventHistoryLoading,
  eventHistoryError,
  onClose,
  onSubmit,
  onToggleCertificationBadge,
  onFormChange,
  onWorkflowAction,
}: CertificationEditorDialogProps) {
  useModalDismiss({ open, onClose });
  if (!open || !selectedItem) return null;
  const pendingCriteria = selectedItem.checklist.filter((check) => !check.passed);
  const certifyingWithPendingCriteria = form.certification_status === "certified" && pendingCriteria.length > 0;
  const eventPreviewType =
    form.certification_status === "certified"
      ? "certification"
      : form.certification_status === "rejected"
        ? "refusal"
        : form.certification_status === "revalidation_pending"
          ? "revalidation"
          : form.certification_status !== selectedItem.certification_status
            ? "status_change"
            : "review";
  const suggestedObservation =
    form.certification_status === "rejected"
      ? "Ativo recusado porque ainda não atende aos critérios mínimos de governança, documentação, qualidade ou revisão."
      : form.certification_status === "revalidation_pending"
        ? "Revalidação solicitada por mudança estrutural, incidente, queda de Data Quality, revisão expirada ou solicitação do owner."
        : "";

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/35 p-3 sm:p-4 md:p-6"
      onClick={onClose}
      role="dialog"
    >
        <div className="flex min-h-full items-start justify-center py-2 sm:items-center">
          <div
            className="flex w-full max-w-4xl flex-col overflow-hidden rounded-[28px] border border-border bg-surface shadow-[0_30px_90px_-28px_rgba(15,23,42,0.45)] sm:max-h-[92vh]"
            onClick={(event) => event.stopPropagation()}
          >
          <div className="shrink-0 border-b border-border px-5 py-4 sm:px-6 sm:py-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Decisão de certificação</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <h3 className="text-xl font-semibold tracking-tight text-text">
                {selectedItem.schema_name}.{selectedItem.name}
              </h3>
              <CertificationStatusBadge status={selectedItem.certification_status} />
            </div>
            <p className="mt-1 text-sm text-text-body">
              {selectedItem.database_name} · {selectedItem.datasource_name}
            </p>
          </div>
          <form className="flex min-h-0 flex-1 flex-col" onSubmit={onSubmit}>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
              <div className="space-y-5">
                <div
                  className={cn(
                    "rounded-2xl border border-border bg-bg-subtle/70 p-4",
                    certificationStatusFrameClass(selectedItem.certification_status),
                    certificationStatusHeaderClass(selectedItem.certification_status),
                  )}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Elegibilidade automática</p>
                      <p className="mt-2 text-base font-semibold text-text">
                        {selectedItem.readiness_score}% de prontidão · {selectedItem.readiness_completed}/{selectedItem.readiness_total} critérios
                      </p>
                    </div>
                    <Badge tone={selectedItem.eligible_for_certification ? "success" : "neutral"}>
                      {certificationEligibilityLabel(selectedItem.eligible_for_certification)}
                    </Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge tone="neutral">{selectedItem.certification_next_step || "Sem ação sugerida"}</Badge>
                    <Badge
                      tone={
                        selectedItem.certification_sla_status === "overdue"
                          ? "warning"
                          : selectedItem.certification_sla_status === "due_soon"
                            ? "accent"
                            : selectedItem.certification_sla_status === "on_track"
                              ? "success"
                              : "neutral"
                      }
                    >
                      {selectedItem.certification_sla_label}
                    </Badge>
                    {selectedItem.certification_sla_due_at ? (
                      <Badge tone="neutral">SLA até {formatCertificationDate(selectedItem.certification_sla_due_at)}</Badge>
                    ) : null}
                    {selectedItem.certification_revalidation_required ? <Badge tone="warning">Revalidação assistida</Badge> : null}
                  </div>
                <div className="mt-4 rounded-2xl border border-border bg-surface p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={selectedItem.certification_status_source === "automatic" ? "success" : "neutral"}>
                      {selectedItem.certification_status_source === "manual" ? "Manual" : "Automática"}
                      </Badge>
                      <Badge tone="neutral">{formatRuleLabel(selectedItem.certification_status_rule)}</Badge>
                      {selectedItem.active_dq_violation ? <Badge tone="warning">DQ ativa</Badge> : null}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-text-body">
                      {selectedItem.certification_status_reason || "Sem justificativa registrada para o status atual."}
                    </p>
                    <div className="mt-3 rounded-2xl border border-info-100 bg-info-50/70 p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-info-700">Prévia do evento auditável</p>
                      <p className="mt-2 text-xs leading-5 text-text-body">
                        Ao salvar, será registrado: status atual <span className="font-medium">{selectedItem.certification_status_label}</span>,
                        novo status <span className="font-medium">{statusOptions.find((option) => option.value === form.certification_status)?.label || form.certification_status}</span>,
                        prontidão {selectedItem.readiness_score}% e observação informada pelo revisor.
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        Tipo previsto: {eventPreviewType}. Toda decisão salva gera um evento auditável para apoiar governança, revalidação e acompanhamento de metas.
                      </p>
                    </div>
                    {pendingCriteria.length ? (
                      <div className="mt-3 rounded-2xl border border-danger-100 bg-danger-50/80 p-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-danger-700">Principais bloqueios</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {pendingCriteria.slice(0, 5).map((check) => (
                            <Badge key={check.key} tone="warning">{check.label}: {check.detail}</Badge>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    {selectedItem.active_dq_rule_names.length ? (
                      <p className="mt-2 text-xs text-muted">
                        Regras ativas: {selectedItem.active_dq_rule_names.slice(0, 3).join(", ")}
                      </p>
                    ) : null}
                  </div>
                  {canonicalLoading ? <div className="mt-3 h-32 rounded-2xl bg-bg-subtle" /> : null}
                  {!canonicalLoading && canonicalError ? (
                    <p className="mt-3 text-sm text-danger-700">{canonicalError}</p>
                  ) : null}
                  {!canonicalLoading && !canonicalError && canonicalAsset ? (
                    <div className="mt-4 rounded-2xl border border-border bg-bg-subtle p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Núcleo canônico</p>
                          <p className="mt-2 text-sm font-semibold text-text">{canonicalAsset.display_name}</p>
                          <p className="mt-1 text-xs text-muted">
                            {canonicalAsset.source.datasource_name} · {canonicalAsset.source.database_name} · {canonicalAsset.source.schema_name}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge tone={canonicalAsset.classification.certification_status === "certified" ? "success" : "accent"}>
                            {canonicalAsset.classification.certification_status_label}
                          </Badge>
                          <Badge tone={canonicalAsset.evidence.active_dq_violation ? "warning" : "neutral"}>
                            {canonicalAsset.evidence.active_dq_violation ? "DQ ativa" : "DQ estável"}
                          </Badge>
                        </div>
                      </div>
                      <p className="mt-3 text-sm text-text-body">
                        Pipeline{" "}
                        {canonicalAsset.pipeline?.primary_pipeline?.pipeline_name || "sem nome"} ·{" "}
                        {canonicalAsset.pipeline?.primary_pipeline?.latest_status_label || "status não informado"}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        Owner: {canonicalAsset.owner.owner_name || "-"} · Prontidão: {canonicalAsset.classification.readiness_score}%
                      </p>
                    </div>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedItem.eligible_for_certification && ["eligible", "rejected"].includes(selectedItem.certification_status) ? (
                      <Button onClick={() => onWorkflowAction("submit")} size="sm" type="button" variant="outline">
                        Revisão manual opcional
                      </Button>
                    ) : null}
                    {selectedItem.certification_status === "in_review" ? (
                      <>
                        <Button onClick={() => onWorkflowAction("approve")} size="sm" type="button" variant="outline">
                          Aprovar
                        </Button>
                        <Button onClick={() => onWorkflowAction("reject")} size="sm" type="button" variant="outline">
                          Recusar
                        </Button>
                      </>
                    ) : null}
                    {selectedItem.certification_revalidation_required ? (
                      <Button onClick={() => onWorkflowAction("revalidate")} size="sm" type="button" variant="outline">
                        Iniciar revalidação
                      </Button>
                    ) : null}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-text-body">Status de certificação</label>
                    <select
                      className="h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm"
                      value={form.certification_status}
                      onChange={(event) => onFormChange({ certification_status: event.target.value })}
                    >
                      {statusOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs leading-5 text-muted">
                      Use “Certificada” apenas quando critérios mínimos, qualidade, incidentes e revisão estiverem adequados.
                    </p>
                    {certifyingWithPendingCriteria ? (
                      <p className="mt-2 rounded-xl border border-warning-200 bg-warning-50 px-3 py-2 text-xs leading-5 text-warning-700">
                        Este ativo ainda possui critérios pendentes. Certifique apenas se houver justificativa formal e aceite de risco.
                      </p>
                    ) : null}
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-text-body">Criticidade</label>
                    <select
                      className="h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm"
                      value={form.certification_criticality}
                      onChange={(event) => onFormChange({ certification_criticality: event.target.value })}
                    >
                      {criticalityOptions.map((option) => (
                        <option key={option.value || "none"} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs leading-5 text-muted">
                      A criticidade ajuda a priorizar revisão, revalidação e correção de bloqueios.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="block text-xs font-medium text-text-body">Subselos de uso</label>
                  <div className="grid gap-3 md:grid-cols-3">
                    {badgeOptions.map((option) => {
                      const active = form.certification_badges.includes(option.value);
                      return (
                        <button
                          className={cn(
                            "rounded-2xl border p-4 text-left transition",
                            active ? "border-info-200 bg-info-50 shadow-sm" : "border-border bg-surface hover:border-info-200",
                          )}
                          key={option.value}
                          onClick={() => onToggleCertificationBadge(option.value)}
                          type="button"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <CertificationUsageBadge badge={option.value} />
                            {active ? <CheckCircle2 className="h-4 w-4 text-info-700" /> : null}
                          </div>
                          <p className="mt-3 text-sm font-medium text-text">{option.label}</p>
                          <p className="mt-1 text-xs leading-5 text-text-body">{option.description}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-bg-subtle/70 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Histórico de decisões</p>
                      <p className="mt-2 text-sm font-semibold text-text">Linha do tempo auditável da certificação</p>
                      <p className="mt-1 text-xs leading-5 text-text-body">
                        Acompanhe mudanças de status, revisões, recusas, certificações e revalidações já registradas para este ativo.
                      </p>
                    </div>
                    <Badge tone="neutral">{eventHistory.length} evento(s)</Badge>
                  </div>
                  {eventHistoryLoading ? (
                    <div className="mt-3 h-24 rounded-2xl bg-surface" />
                  ) : eventHistoryError ? (
                    <p className="mt-3 text-sm text-danger-700">{eventHistoryError}</p>
                  ) : eventHistory.length ? (
                    <div className="mt-4 space-y-3">
                      {eventHistory.map((event) => (
                        <div className="rounded-2xl border border-border bg-surface p-3" key={event.id}>
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-medium text-text">
                              {event.previous_status || "sem status anterior"} → {event.new_status}
                            </p>
                            <Badge tone={event.decision_source === "manual" ? "accent" : "neutral"}>
                              {event.decision_type} · {event.decision_source}
                            </Badge>
                          </div>
                          <p className="mt-1 text-xs text-muted">
                            {formatCertificationDate(event.created_at)} · {event.reviewer || event.reviewer_email || "sistema"}
                          </p>
                          <p className="mt-2 text-xs leading-5 text-text-body">
                            {event.observation || event.reason || "Sem observação registrada."}
                          </p>
                          {(event.valid_until || event.revalidation_due_at) ? (
                            <p className="mt-1 text-[11px] text-muted">
                              {event.valid_until ? `Validade até ${formatCertificationDate(event.valid_until)}` : ""}
                              {event.valid_until && event.revalidation_due_at ? " · " : ""}
                              {event.revalidation_due_at ? `Revisão até ${formatCertificationDate(event.revalidation_due_at)}` : ""}
                            </p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-4 rounded-2xl border border-dashed border-border bg-surface p-4">
                      <p className="text-sm font-medium text-text">Nenhuma decisão registrada ainda</p>
                      <p className="mt-1 text-xs leading-5 text-text-body">
                        Este ativo ainda não possui histórico auditável de certificação. A próxima decisão registrada passará a alimentar esta linha do tempo.
                      </p>
                    </div>
                  )}
                </div>

                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {selectedItem.checklist.map((check) => (
                    <ChecklistPill item={check} key={check.key} />
                  ))}
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-text-body">Observação / motivo</label>
                  <Textarea
                    placeholder="Explique a decisão, evidências avaliadas, pendências aceitas e próxima data de revisão."
                    value={form.certification_notes}
                    onChange={(event) => onFormChange({ certification_notes: event.target.value })}
                  />
                  <p className="mt-1 text-xs leading-5 text-muted">
                    Explique por que o ativo foi certificado, recusado ou enviado para revisão. Essa observação apoia auditoria e revalidação futura.
                  </p>
                  {["in_review", "certified", "rejected", "revalidation_pending", "expired"].includes(form.certification_status) ? (
                    <p className="mt-2 rounded-xl border border-border bg-bg-subtle px-3 py-2 text-xs leading-5 text-text-body">
                      Este campo é obrigatório para manter a trilha decisória formal da certificação.
                    </p>
                  ) : null}
                  {suggestedObservation ? (
                    <Button className="mt-2" size="sm" type="button" variant="outline" onClick={() => onFormChange({ certification_notes: suggestedObservation })}>
                      Usar sugestão de observação
                    </Button>
                  ) : null}
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-text-body">Data de revisão futura</label>
                  <Input
                    type="datetime-local"
                    value={form.certification_review_at}
                    onChange={(event) => onFormChange({ certification_review_at: event.target.value })}
                  />
                  <p className="mt-1 text-xs leading-5 text-muted">
                    Defina quando a decisão deve ser revista novamente, especialmente para ativos críticos ou muito consumidos.
                  </p>
                  {form.certification_status === "certified" ? (
                    <p className="mt-2 text-xs leading-5 text-text-body">Obrigatório ao aprovar certificação.</p>
                  ) : null}
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-text-body">Validade / vencimento</label>
                  <Input
                    type="datetime-local"
                    value={form.certification_expires_at}
                    onChange={(event) => onFormChange({ certification_expires_at: event.target.value })}
                  />
                  <p className="mt-1 text-xs leading-5 text-muted">
                    A validade indica quando a certificação deixa de ser confiável sem nova avaliação.
                  </p>
                  {form.certification_status === "certified" ? (
                    <p className="mt-2 text-xs leading-5 text-text-body">Obrigatório ao aprovar certificação.</p>
                  ) : null}
                </div>
                <div className="grid gap-4 rounded-2xl border border-border bg-bg-subtle/70 p-4 md:grid-cols-2">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Submissão</p>
                    <p className="mt-2 text-sm font-medium text-text">{formatCertificationDate(selectedItem.certification_submitted_at)}</p>
                    <p className="mt-1 text-xs text-muted">
                      {selectedItem.certification_submitted_by_user_name || selectedItem.certification_submitted_by_user_email || "Sem responsável"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Revisão de owner</p>
                    <p className="mt-2 text-sm font-medium text-text">{formatCertificationDate(selectedItem.owner_reviewed_at)}</p>
                    <p className="mt-1 text-xs text-muted">
                      {selectedItem.owner_reviewed_by_user_name || selectedItem.owner_reviewed_by_user_email || "Aguardando revisão"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="shrink-0 border-t border-border bg-surface/95 px-5 py-4 backdrop-blur sm:px-6">
              <div className="flex items-center justify-end gap-2">
                <Button onClick={onClose} type="button" variant="outline">
                  Cancelar
                </Button>
                <Button disabled={saving} type="submit">
                  {saving ? "Salvando..." : "Salvar decisão"}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
