import { Link } from "@/lib/next-shims";

import { ArrowRight, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";

import type { CanonicalAssetContext, TableCorrelationSummary, TableDetailInfo, TableOperationalContext } from "../types";
import { buildObservabilitySnapshot, type ObservabilitySnapshot } from "../observability";

type ExplorerObservabilityTabContentProps = {
  canonicalAsset: CanonicalAssetContext | null;
  canonicalLoading: boolean;
  canonicalError: string;
  correlationSummary: TableCorrelationSummary | null;
  correlationLoading: boolean;
  correlationError: string;
  operationalContext: TableOperationalContext | null;
  operationalLoading: boolean;
  operationalError: string;
  selectedTableFullName: string;
  selectedTableId: number | null;
  tableInfo: TableDetailInfo | null;
};

function toneToChipClass(tone: ObservabilitySnapshot["confidenceTone"] | ObservabilitySnapshot["usageDecision"]["tone"]) {
  if (tone === "success") return "border-success-200 bg-success-50 text-success-700";
  if (tone === "accent") return "border-info-200 bg-info-50 text-info-700";
  if (tone === "warning") return "border-warning-200 bg-warning-50 text-warning-700";
  if (tone === "danger") return "border-danger-200 bg-danger-50 text-danger-700";
  return "border-border bg-bg-subtle text-text-body";
}

function SectionTitle({ title, description }: { title: string; description: string }) {
  return (
    <div className="space-y-1">
      <p className="text-sm font-semibold text-text">{title}</p>
      <p className="text-sm text-text-body">{description}</p>
    </div>
  );
}

function MetricChip({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  tone: ObservabilitySnapshot["confidenceTone"];
}) {
  return (
    <div className={cn("rounded-2xl border p-3", toneToChipClass(tone))}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-current/70">{label}</p>
      <p className="mt-1 text-lg font-semibold tracking-tight">{value}</p>
      <p className="mt-1 text-xs leading-5 text-current/75">{detail}</p>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-44 w-full rounded-3xl" />
      <div className="grid gap-4 xl:grid-cols-2">
        {Array.from({ length: 4 }).map((_, idx) => (
          <Skeleton className="h-52 w-full rounded-3xl" key={idx} />
        ))}
      </div>
    </div>
  );
}

export function ExplorerObservabilityTabContent({
  canonicalAsset,
  canonicalLoading,
  canonicalError,
  correlationSummary,
  correlationLoading,
  correlationError,
  operationalContext,
  operationalLoading,
  operationalError,
  selectedTableFullName,
  selectedTableId,
  tableInfo,
}: ExplorerObservabilityTabContentProps) {
  const loading = canonicalLoading || correlationLoading || operationalLoading;
  const snapshot = buildObservabilitySnapshot({
    canonicalAsset,
    operationalContext,
    correlationSummary,
    tableInfo,
  });

  if (loading && !snapshot.hasEvidence) {
    return <LoadingSkeleton />;
  }

  if (selectedTableId === null) {
    return <EmptyState title="Nenhuma tabela selecionada" description="Escolha um ativo para ver a leitura executiva de confiança e ação." />;
  }

  return (
    <div className="space-y-4">
      {!snapshot.hasEvidence ? (
        <Banner
          description="O bloco abaixo continua útil com os sinais já carregados, mas parte da decisão ainda depende de dados operacionais e de governança adicionais."
          icon={<Sparkles className="h-4 w-4" />}
          tone="info"
          title="Ainda não há evidência suficiente para uma leitura executiva completa."
        />
      ) : null}

      {canonicalError || operationalError || correlationError ? (
        <Banner
          description={`${canonicalError || operationalError || correlationError} Consulte o histórico abaixo e as demais abas para fechar a leitura.`}
          icon={<Sparkles className="h-4 w-4" />}
          tone="warning"
          title="Status da sincronização em progresso"
        />
      ) : null}

      <Card className="overflow-hidden border-border/80 bg-gradient-to-br from-slate-950 via-slate-900 to-sky-900 text-white shadow-[0_24px_60px_rgba(15,23,42,0.24)]">
        <CardHeader className="border-white/10 bg-surface/5 px-6 py-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-surface/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/80">
                <Sparkles className="h-3.5 w-3.5" />
                Leitura executiva orientada a uso e decisão
              </div>
              <h2 className="max-w-4xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Quanto posso confiar neste ativo agora, o que ele impacta, quem precisa agir e qual é a melhor próxima ação?
              </h2>
              <p className="max-w-4xl text-sm leading-6 text-slate-200">
                {selectedTableFullName} · leitura executiva para decidir se o ativo pode seguir em uso, o que ele afeta e qual é o próximo passo mais seguro.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge tone={snapshot.confidenceTone as "neutral" | "accent" | "success" | "warning" | "danger"} className="border-white/15 bg-surface/10 text-white">
                {snapshot.confidenceLabel}
              </Badge>
              <Badge tone={snapshot.usageDecision.tone as "neutral" | "accent" | "success" | "warning" | "danger"} className="border-white/15 bg-surface/10 text-white">
                {snapshot.usageDecision.label}
              </Badge>
              {snapshot.confidenceScore !== null ? (
                <Badge tone="neutral" className="border-white/15 bg-surface/10 text-white">
                  Score {Math.round(snapshot.confidenceScore)}
                </Badge>
              ) : null}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 px-6 py-6">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <MetricChip label="Leitura atual" value={snapshot.confidenceLabel} detail={snapshot.confidenceReason} tone={snapshot.confidenceTone} />
            <MetricChip label="Estado operacional" value={snapshot.pipeline.label} detail={snapshot.pipeline.detail} tone={snapshot.pipeline.tone} />
            <MetricChip label="Decisão de uso" value={snapshot.usageDecision.label} detail={snapshot.usageDecision.rationale} tone={snapshot.usageDecision.tone} />
            <MetricChip label="Próxima ação" value={snapshot.nextAction.label} detail={snapshot.nextAction.rationale} tone={snapshot.nextAction.tone} />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="border-border/80 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
          <CardContent className="space-y-4 p-5">
            <SectionTitle
              title="Quanto eu posso confiar agora"
              description="Síntese operacional baseada em qualidade, atualização, contrato, incidentes e execução recente."
            />
            <div className="rounded-2xl border border-border bg-bg-subtle/70 p-4">
              <p className="text-sm leading-6 text-text-body">{snapshot.confidenceReason}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge tone={snapshot.confidenceTone as "neutral" | "accent" | "success" | "warning" | "danger"}>{snapshot.confidenceLabel}</Badge>
                <Badge tone={snapshot.usageDecision.tone as "neutral" | "accent" | "success" | "warning" | "danger"}>{snapshot.usageDecision.label}</Badge>
                {snapshot.confidenceScore !== null ? <Badge tone="neutral">Score {Math.round(snapshot.confidenceScore)}</Badge> : null}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {snapshot.signals.slice(0, 4).map((signal) => (
                <MetricChip key={signal.label} label={signal.label} value={signal.value} detail={signal.detail} tone={signal.tone} />
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
          <CardContent className="space-y-4 p-5">
            <SectionTitle
              title="O que isso impacta"
              description="Leitura de raio de impacto e alcance downstream para orientar prioridade e risco de mudança."
            />
            <div className="grid gap-3 md:grid-cols-2">
              <MetricChip label="Raio de impacto" value={String(snapshot.impact.blastRadiusScore)} detail={snapshot.impact.summary} tone={snapshot.impact.blastRadiusScore >= 70 ? "danger" : snapshot.impact.blastRadiusScore >= 40 ? "warning" : "success"} />
              <MetricChip label="Impacto agregado" value={snapshot.impact.impactLevel} detail={`${snapshot.impact.downstreamCount} downstreams · ${snapshot.impact.dashboardCount} dashboards`} tone={snapshot.impact.blastRadiusScore >= 70 ? "danger" : snapshot.impact.blastRadiusScore >= 40 ? "warning" : "success"} />
            </div>

            <div className="rounded-2xl border border-border bg-surface p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={snapshot.impact.blastRadiusScore >= 70 ? "danger" : snapshot.impact.blastRadiusScore >= 40 ? "warning" : "success"}>
                  {snapshot.impact.blastRadiusLabel}
                </Badge>
                <Badge tone="neutral">{snapshot.impact.processCount} processos</Badge>
                <Badge tone="neutral">{snapshot.impact.directDependenciesCount} dependências diretas</Badge>
              </div>
              <p className="mt-3 text-sm leading-6 text-text-body">{snapshot.impact.summary}</p>
            </div>

            <div className="rounded-2xl border border-dashed border-border bg-bg-subtle/80 p-4 text-sm text-text-body">
              {snapshot.impact.downstreamCount > 0 ? (
                <p>
                  Há sinais de alcance real no grafo e a melhor leitura é tratar a confiança como uma decisão de impacto, não só de qualidade.
                </p>
              ) : (
                <p>Ainda não há lineage suficiente para estimar blast radius com precisão. Use essa leitura como base inicial e refine com a linhagem.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
          <CardContent className="space-y-4 p-5">
            <SectionTitle
              title="Quem precisa agir"
              description="Responsável principal, contexto de governança e pendências que pedem acompanhamento."
            />
            <div className="rounded-2xl border border-border bg-bg-subtle/70 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={snapshot.responsibility.ownerDefined ? "success" : "warning"}>
                  {snapshot.responsibility.ownerDefined ? "Owner definido" : "Owner pendente"}
                </Badge>
                <Badge tone={snapshot.responsibility.criticalityTone}>{snapshot.responsibility.criticalityLabel}</Badge>
                {snapshot.responsibility.ownerReviewDue ? <Badge tone="warning">Revisão de owner</Badge> : null}
                {snapshot.responsibility.certificationReviewDue ? <Badge tone="warning">Certificação em revisão</Badge> : null}
                {snapshot.responsibility.privacyReviewDue ? <Badge tone="warning">Privacidade em revisão</Badge> : null}
              </div>
              <p className="mt-3 text-sm font-medium text-text">
                {snapshot.responsibility.ownerName || "Responsável não informado"}
              </p>
              <p className="mt-1 text-sm text-text-body">{snapshot.responsibility.ownerEmail || "Sem e-mail de contato"}</p>
              <p className="mt-3 text-sm leading-6 text-text-body">{snapshot.responsibility.summary}</p>
              <p className="mt-2 text-sm leading-6 text-text-body">{snapshot.responsibility.followUp}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
          <CardContent className="space-y-4 p-5">
            <SectionTitle
              title="Melhor próxima ação"
              description="Uma sugestão prática para reduzir o risco atual sem repetir a leitura de Data Quality."
            />
            <div className={cn("rounded-2xl border p-4", toneToChipClass(snapshot.nextAction.tone))}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold tracking-tight">{snapshot.nextAction.label}</p>
                  <p className="mt-2 text-sm leading-6 text-current/80">{snapshot.nextAction.rationale}</p>
                </div>
                <Badge tone={snapshot.nextAction.tone}>Próxima ação</Badge>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button asChild size="sm" variant="outline" className="bg-surface/70">
                  <Link href={snapshot.nextAction.href}>
                    Abrir ação
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                {canonicalAsset?.links?.data_quality ? (
                  <Button asChild size="sm" variant="ghost" className="bg-surface/40">
                    <Link href={canonicalAsset.links.data_quality}>Abrir Data Quality</Link>
                  </Button>
                ) : null}
                {canonicalAsset?.links?.metabase_consumption || operationalContext?.links?.metabase_consumption ? (
                  <Button asChild size="sm" variant="ghost" className="bg-surface/40">
                    <Link href={canonicalAsset?.links?.metabase_consumption || operationalContext?.links?.metabase_consumption || "/explorer"}>
                      Ver consumo no Metabase
                    </Link>
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="rounded-2xl border border-dashed border-border bg-bg-subtle/80 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Racional curto</p>
              <p className="mt-2 text-sm leading-6 text-text-body">{snapshot.usageDecision.rationale}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/80 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
        <CardContent className="space-y-4 p-5">
            <SectionTitle
              title="Uso permitido ou não"
              description="Decisão operacional derivada da leitura atual para facilitar consumo por dashboards e análises."
            />
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-border bg-surface p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Decisão</p>
              <Badge tone={snapshot.usageDecision.tone} className="mt-2">
                {snapshot.usageDecision.label}
              </Badge>
            </div>
            <div className="rounded-2xl border border-border bg-surface p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Estado de confiança</p>
              <p className="mt-2 text-sm font-semibold text-text">{snapshot.confidenceLabel}</p>
            </div>
            <div className="rounded-2xl border border-border bg-surface p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Motivo principal</p>
              <p className="mt-2 text-sm leading-6 text-text-body">{snapshot.confidenceReason}</p>
            </div>
            <div className="rounded-2xl border border-border bg-surface p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Leitura contratual</p>
              <p className="mt-2 text-sm font-semibold text-text">{snapshot.contract.label}</p>
              <p className="mt-1 text-xs leading-5 text-muted">{snapshot.contract.detail}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="border-border/80">
          <CardContent className="space-y-3 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Atualização</p>
            <p className="text-sm font-semibold text-text">{snapshot.freshness.label}</p>
            <p className="text-sm leading-6 text-text-body">{snapshot.freshness.detail}</p>
          </CardContent>
        </Card>
        <Card className="border-border/80">
          <CardContent className="space-y-3 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Operação</p>
            <p className="text-sm font-semibold text-text">{snapshot.pipeline.label}</p>
            <p className="text-sm leading-6 text-text-body">{snapshot.pipeline.detail}</p>
          </CardContent>
        </Card>
        <Card className="border-border/80">
          <CardContent className="space-y-3 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Evidências carregadas</p>
            <p className="text-sm font-semibold text-text">{snapshot.signals.length} evidências usadas</p>
            <p className="text-sm leading-6 text-text-body">
              {snapshot.hasEvidence
                ? "O bloco executa a síntese a partir dos sinais carregados hoje no Explorer."
                : "A leitura ainda depende de dados adicionais para fechar a decisão com mais confiança."}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
