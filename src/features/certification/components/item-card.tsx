import { ChevronRight, Pencil } from "lucide-react";
import { Link } from "@/lib/next-shims";

import {
  CertificationCriticalityBadge,
  CertificationStatusBadge,
  CertificationUsageBadge,
  certificationCriticalityLabel,
  certificationStatusLabel,
  certificationStatusFrameClass,
} from "@/components/certification/certification-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ChecklistPill } from "@/features/certification/components/checklist-pill";
import { certificationScoreTone, formatCertificationDate } from "@/features/certification/components/view-utils";
import type { CertificationItem } from "@/features/certification/types";
import { cn } from "@/lib/cn";

type CertificationItemCardProps = {
  item: CertificationItem;
  canEdit: boolean;
  onOpenEditor: (item: CertificationItem) => void;
  onWorkflowAction?: (item: CertificationItem, action: "submit" | "approve" | "reject" | "revalidate") => void;
};

function slaTone(status: string) {
  if (status === "overdue") return "warning";
  if (status === "due_soon") return "accent";
  if (status === "on_track") return "success";
  return "neutral";
}

function certificationSourceLabel(source: string) {
  return source === "manual" ? "Manual" : "Automática";
}

function certificationRuleLabel(rule: string) {
  switch (rule) {
    case "automatic_readiness_certified":
      return "Prontidão >= 80%";
    case "automatic_readiness_eligible":
      return "Prontidão >= 50%";
    case "automatic_readiness_not_eligible":
      return "Prontidão abaixo de 50%";
    case "automatic_dq_revalidation":
      return "Revalidação por DQ";
    case "automatic_incident_revalidation":
      return "Revalidação por incidente";
    case "automatic_review_revalidation":
      return "Revalidação por revisão";
    case "automatic_operational_revalidation":
      return "Revalidação operacional";
    case "automatic_expired":
      return "Certificação vencida";
    case "manual_in_review":
      return "Revisão manual";
    case "manual_rejected":
      return "Recusa manual";
    default:
      return rule
        .replace(/_/g, " ")
        .replace(/\b\w/g, (match) => match.toUpperCase())
        .trim();
  }
}

function certificationEligibilityLabel(eligible: boolean) {
  return eligible ? "Atende prontidão mínima" : "Abaixo da prontidão mínima";
}

function trustTone(tone: string | null | undefined): "neutral" | "accent" | "warning" | "success" {
  if (tone === "success") return "success";
  if (tone === "accent") return "accent";
  if (tone === "warning") return "warning";
  return "neutral";
}

const CRITERION_HELP: Record<string, { category: "Governança" | "Documentação" | "Qualidade" | "Operação" | "Revisão"; description: string; action: string }> = {
  owner_defined: {
    category: "Governança",
    description: "Existe uma pessoa ou time responsável por aprovar uso, corrigir problemas e manter a certificação.",
    action: "Definir owner do ativo.",
  },
  table_description_complete: {
    category: "Documentação",
    description: "A descrição explica finalidade, escopo e limites de uso para evitar interpretação incorreta.",
    action: "Completar a descrição no Explorer.",
  },
  documentation_coverage: {
    category: "Documentação",
    description: "A cobertura de colunas ajuda consumidores a entender campos, regras e limitações.",
    action: "Documentar colunas até atingir a cobertura mínima.",
  },
  tags_applied: {
    category: "Documentação",
    description: "Tags melhoram busca, organização, classificação e priorização por tema.",
    action: "Aplicar tags funcionais, técnicas ou de negócio.",
  },
  terms_associated: {
    category: "Documentação",
    description: "Termos conectam o ativo ao glossário de negócio e reduzem ambiguidade entre áreas.",
    action: "Associar termos do glossário.",
  },
  privacy_reviewed: {
    category: "Governança",
    description: "Ativos com dado pessoal ou sensível precisam de revisão formal de privacidade antes da aprovação.",
    action: "Registrar revisão de privacidade.",
  },
  privacy_context_complete: {
    category: "Governança",
    description: "Base legal e finalidade estruturadas sustentam a decisão formal para ativos com dado pessoal ou sensível.",
    action: "Completar base legal e finalidade em Privacidade & Acesso.",
  },
  dq_score: {
    category: "Qualidade",
    description: "O score DQ indica se a qualidade está em nível adequado para consumo confiável.",
    action: "Executar ou configurar Data Quality.",
  },
  no_critical_incidents: {
    category: "Operação",
    description: "Incidentes críticos abertos bloqueiam uso seguro e podem exigir revalidação.",
    action: "Tratar incidentes críticos antes da certificação.",
  },
  review_recent: {
    category: "Revisão",
    description: "A revisão recente confirma que um responsável avaliou os critérios e a decisão está atualizada.",
    action: "Registrar revisão operacional.",
  },
};

const CERTIFICATION_GROUPS = [
  {
    name: "Governança",
    description: "Responsabilidade e contexto mínimo para manter a certificação.",
    action: "Definir owner, criticidade e vínculo de negócio quando aplicável.",
  },
  {
    name: "Documentação",
    description: "Informações necessárias para usuários entenderem finalidade, campos e uso seguro.",
    action: "Completar descrição, colunas, tags e termos.",
  },
  {
    name: "Qualidade",
    description: "Sinais que indicam se o ativo pode sustentar análises e decisões confiáveis.",
    action: "Executar Data Quality e corrigir falhas relevantes.",
  },
  {
    name: "Operação",
    description: "Riscos operacionais que podem bloquear consumo, como incidentes críticos.",
    action: "Resolver incidentes e confirmar estabilidade operacional.",
  },
  {
    name: "Revisão",
    description: "Evidência de que a decisão foi avaliada recentemente por um responsável.",
    action: "Registrar revisão, observação e validade.",
  },
] as const;

function criterionHelp(key: string) {
  return CRITERION_HELP[key] || {
    category: "Governança" as const,
    description: "Critério usado pela plataforma para compor a prontidão de certificação.",
    action: "Revisar pendência no módulo responsável.",
  };
}

function nextStepFor(item: CertificationItem) {
  const failed = item.checklist.find((check) => !check.passed);
  if (!failed) {
    if (item.certification_status === "eligible") {
      return {
        title: "Revisar e decidir certificação",
        description: "O ativo já possui prontidão mínima. Revise evidências, qualidade e incidentes antes da decisão final.",
      };
    }
    return {
      title: item.certification_next_step || "Monitorar validade e sinais operacionais",
      description: "Continue acompanhando qualidade, incidentes e prazo de revalidação para manter a confiança no ativo.",
    };
  }
  const help = criterionHelp(failed.key);
  return {
    title: help.action,
    description: `${failed.label}: ${failed.detail}. ${help.description}`,
  };
}

export function CertificationItemCard({ item, canEdit, onOpenEditor, onWorkflowAction }: CertificationItemCardProps) {
  const tone = certificationScoreTone(item.readiness_score);
  const blockers = item.checklist.filter((check) => !check.passed);
  const primaryBlockers = blockers.slice(0, 5);
  const recommendedActions = blockers.slice(0, 3).map((check) => criterionHelp(check.key).action);
  const nextStep = nextStepFor(item);
  const groupedChecklist = CERTIFICATION_GROUPS.map((group) => {
    const checks = item.checklist.filter((check) => criterionHelp(check.key).category === group.name);
    const passed = checks.filter((check) => check.passed).length;
    return { ...group, checks, passed };
  }).filter((group) => group.checks.length > 0);

  return (
    <Card
      className={cn(
        "transition-all duration-200 ease-out hover:border-brand-200 hover:shadow-card",
        certificationStatusFrameClass(item.certification_status),
      )}
    >
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-lg font-semibold text-text">{item.name}</h3>
              <CertificationStatusBadge status={item.certification_status} />
              {item.trust_label ? (
                <Badge tone={trustTone(item.trust_tone)}>
                  {item.trust_label}
                  {item.trust_score !== null && item.trust_score !== undefined ? ` · ${item.trust_score}` : ""}
                </Badge>
              ) : null}
              {item.certification_criticality ? (
                <CertificationCriticalityBadge criticality={item.certification_criticality} />
              ) : null}
            </div>
            <p className="mt-1 text-sm text-text-body">
              {item.schema_name} · {item.database_name} · {item.datasource_name}
            </p>
          </div>
          <div className={cn("min-w-[124px] rounded-2xl border p-3 text-right shadow-sm", tone.ring)}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Prontidão</p>
            <p className={cn("mt-2 text-2xl font-semibold", tone.text)}>{item.readiness_score}%</p>
            <p className="mt-1 text-xs text-text-body">
              {item.readiness_completed}/{item.readiness_total} critérios
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Elegibilidade</p>
            <Badge tone={item.eligible_for_certification ? "success" : "neutral"}>
              {certificationEligibilityLabel(item.eligible_for_certification)}
            </Badge>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-bg-subtle">
            <div
              className={cn("h-full rounded-full bg-gradient-to-r transition-all", tone.bar)}
              style={{ width: `${item.readiness_score}%` }}
            />
          </div>
        </div>

          <div className="rounded-2xl border border-border/80 bg-surface p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={item.certification_status_source === "automatic" ? "success" : "neutral"}>
              {certificationSourceLabel(item.certification_status_source)}
            </Badge>
            <Badge tone="neutral">{certificationRuleLabel(item.certification_status_rule)}</Badge>
            {item.active_dq_violation ? <Badge tone="warning">DQ ativa</Badge> : null}
          </div>
          <p className="mt-2 text-sm leading-6 text-text-body">
            {item.certification_status_reason || "Nenhuma justificativa registrada para este status."}
          </p>
          {item.active_dq_rule_names.length ? (
            <p className="mt-2 text-xs text-muted">
              Regras ativas: {item.active_dq_rule_names.slice(0, 3).join(", ")}
            </p>
          ) : null}
        </div>

        {(item.certification_badges || []).length ? (
          <div className="flex flex-wrap gap-2">
            {(item.certification_badges || []).map((badge) => (
              <CertificationUsageBadge badge={badge} key={badge} />
            ))}
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-border/80 bg-bg-subtle/70 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Responsável de dados</p>
            <p className="mt-2 text-sm font-medium text-text">{item.data_owner?.name || item.owner || "Não definido"}</p>
            <p className="mt-1 text-xs text-muted">{item.data_owner?.email || item.owner_email || "Sem contato"}</p>
          </div>
          <div className="rounded-2xl border border-border/80 bg-bg-subtle/70 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Última revisão</p>
            <p className="mt-2 text-sm font-medium text-text">{formatCertificationDate(item.certification_decided_at)}</p>
            <p className="mt-1 text-xs text-muted">
              {item.certification_decided_by_user_name || item.certification_decided_by_user_email || "Sem responsável"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {item.owner_reviewed_at ? <Badge tone="neutral">Responsável de dados revisado em {formatCertificationDate(item.owner_reviewed_at)}</Badge> : <Badge tone="warning">Responsável de dados sem revisão recente</Badge>}
          {item.certification_review_at ? <Badge tone="accent">Revisar em {formatCertificationDate(item.certification_review_at)}</Badge> : null}
          {item.certification_expires_at ? <Badge tone="warning">Vence em {formatCertificationDate(item.certification_expires_at)}</Badge> : null}
          <Badge tone={slaTone(item.certification_sla_status)}>{item.certification_sla_label}</Badge>
        </div>

        <div className="rounded-2xl border border-border/80 bg-bg-subtle/70 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Próximo passo</p>
            {item.certification_revalidation_required ? <Badge tone="warning">Revalidação assistida</Badge> : null}
          </div>
          <p className="mt-2 text-sm font-medium text-text">{item.certification_next_step || "Sem ação sugerida no momento."}</p>
          <p className="mt-1 text-xs text-muted">
            {item.certification_sla_due_at ? `SLA até ${formatCertificationDate(item.certification_sla_due_at)}` : "Sem prazo formal ativo para esta etapa."}
          </p>
        </div>

        <div className="rounded-2xl border border-border/80 bg-surface p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Resumo por categoria</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 2xl:grid-cols-5">
            {groupedChecklist.map((group) => {
              const blocked = group.passed === 0;
              const complete = group.passed === group.checks.length;
              return (
                <div className="rounded-xl border border-border bg-bg-subtle p-3" key={group.name} title={`${group.description} ${group.action}`}>
                  <p className="text-xs font-semibold text-text">{group.name}</p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-text">{group.passed}/{group.checks.length}</span>
                    <Badge tone={complete ? "success" : blocked ? "warning" : "accent"}>{complete ? "OK" : blocked ? "Bloqueado" : "Atenção"}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-info-100 bg-info-50/70 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-info-700">Próximo passo recomendado</p>
          <p className="mt-2 text-sm font-semibold text-text">{nextStep.title}</p>
          <p className="mt-1 text-xs leading-5 text-text-body">{nextStep.description}</p>
          {recommendedActions.length ? (
            <div className="mt-3 space-y-1">
              <p className="text-xs font-semibold text-info-700">Próximas ações</p>
              <ol className="list-decimal space-y-1 pl-5 text-xs leading-5 text-text-body">
                {recommendedActions.map((action) => (
                  <li key={action}>{action}</li>
                ))}
              </ol>
            </div>
          ) : null}
        </div>

        {primaryBlockers.length ? (
          <div className="rounded-2xl border border-danger-100 bg-danger-50/60 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-danger-700">Principais bloqueios</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {primaryBlockers.map((check) => (
                <Badge key={check.key} tone="warning">
                  {check.label}: {check.detail}
                </Badge>
              ))}
            </div>
            <p className="mt-3 text-xs leading-5 text-danger-700">
              Corrija primeiro os bloqueios acima para aumentar a prontidão e permitir avanço para revisão ou certificação.
            </p>
          </div>
        ) : null}

        <div className="space-y-3">
          {groupedChecklist.map((group) => (
            <div className="rounded-2xl border border-border/80 bg-surface p-4 shadow-sm" key={group.name}>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-text">{group.name}</p>
                  <p className="mt-1 text-xs leading-5 text-text-body">{group.description}</p>
                </div>
                <Badge tone={group.passed === group.checks.length ? "success" : "warning"}>
                  {group.passed}/{group.checks.length} critérios
                </Badge>
              </div>
              <p className="mt-2 text-xs leading-5 text-muted">Ação recomendada: {group.action}</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {group.checks.map((check) => (
                  <ChecklistPill item={check} key={check.key} />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-border/80 bg-surface p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Observação</p>
            <Badge tone={item.eligible_for_certification ? "success" : "neutral"}>{item.certification_status_label}</Badge>
          </div>
          <p className="mt-2 text-sm leading-6 text-text-body">
            {item.certification_notes || "Nenhuma observação registrada para esta decisão."}
          </p>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2 text-xs text-muted">
            <span>Status: {certificationStatusLabel(item.certification_status)}</span>
            <span>·</span>
            <span>Criticidade: {certificationCriticalityLabel(item.certification_criticality)}</span>
          </div>
          {canEdit ? (
            <div className="flex flex-wrap justify-end gap-2">
              <Button asChild size="sm" variant="outline">
                <Link href={`/explorer?tableId=${item.id}`}>Explorer</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href={`/data-quality?tableId=${item.id}`}>Data Quality</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href={`/incidents/tickets?tableId=${item.id}`}>Incidentes</Link>
              </Button>
              {item.eligible_for_certification && ["eligible", "rejected"].includes(item.certification_status) ? (
                <Button onClick={() => onWorkflowAction?.(item, "submit")} size="sm" variant="outline">
                  Revisão manual opcional
                </Button>
              ) : null}
              {item.certification_status === "in_review" ? (
                <>
                  <Button onClick={() => onWorkflowAction?.(item, "approve")} size="sm" variant="outline">
                    Aprovar
                  </Button>
                  <Button onClick={() => onWorkflowAction?.(item, "reject")} size="sm" variant="outline">
                    Recusar
                  </Button>
                </>
              ) : null}
              {item.certification_revalidation_required ? (
                <Button onClick={() => onWorkflowAction?.(item, "revalidate")} size="sm" variant="outline">
                  Iniciar revalidação
                </Button>
              ) : null}
              <Button onClick={() => onOpenEditor(item)} size="sm" variant="outline">
                <Pencil className="mr-2 h-4 w-4" />
                Editar decisão
              </Button>
            </div>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs text-muted">
              Ver detalhes <ChevronRight className="h-3.5 w-3.5" />
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
