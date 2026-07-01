import { Link } from "@/lib/next-shims";
import { useRef, type ReactNode } from "react";

import { ExternalLink, Layers3, LayoutDashboard, ListFilter, FileSearch } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";
import { useExplorerDebugLayout, useExplorerDebugLifecycle } from "@/features/explorer/debug";

import type { MetabaseConsumptionItem, MetabaseConsumptionSummary } from "../types";

type ExplorerConsumptionTabContentProps = {
  loading: boolean;
  error: string;
  syncLoading?: boolean;
  syncError?: string;
  selectedTableFullName: string;
  selectedTableId: number | null;
  consumption: MetabaseConsumptionSummary | null;
  onRetry?: () => void;
  onSync?: () => void;
  canSync?: boolean;
};

function toneClass(confidence: string) {
  if (confidence === "confirmed") return "border-success-200 bg-success-50 text-success-700";
  if (confidence === "inferred") return "border-info-200 bg-info-50 text-info-700";
  if (confidence === "partial") return "border-warning-200 bg-warning-50 text-warning-700";
  return "border-border bg-bg-subtle text-text-body";
}

function matchMethodLabel(matchMethod: string) {
  const normalized = (matchMethod || "").trim().toLowerCase();
  if (normalized === "indirect_view") return "Indireto via view";
  if (normalized === "indirect_lineage" || normalized === "lineage_indirect") return "Indireto via linhagem";
  if (normalized === "dashboard_card") return "Dashboard > question";
  if (normalized === "collection_membership") return "Collection derivada";
  if (normalized === "sql") return "Direto via SQL";
  if (normalized === "direct" || normalized === "confirmed") return "Direto";
  return matchMethod.replaceAll("_", " ");
}

function matchStateLabel(matchState?: string | null) {
  if (matchState === "direct") return "Direto";
  if (matchState === "indirect") return "Indireto";
  if (matchState === "mixed") return "Direto e indireto";
  if (matchState === "partial") return "Parcial";
  if (matchState === "none") return "Sem vínculo";
  return "Não informado";
}

function matchStateTone(matchState?: string | null) {
  if (matchState === "direct") return "success";
  if (matchState === "indirect" || matchState === "mixed") return "accent";
  if (matchState === "partial") return "warning";
  return "neutral";
}

function matchStateDetail(matchState?: string | null) {
  if (matchState === "direct") {
    return "Consumo direto: o Metabase consulta a tabela base sem depender de uma view intermediária.";
  }
  if (matchState === "indirect") {
    return "Consumo indireto via view: o Metabase aponta para uma view intermediária e o catálogo sobe pela linhagem até a tabela base.";
  }
  if (matchState === "mixed") {
    return "Há consumo direto e indireto para este ativo; alguns artefatos chegam pela tabela base e outros por views upstream.";
  }
  if (matchState === "partial") {
    return "Consumo parcial: parte dos vínculos foi resolvida, mas ainda existem objetos sem confirmação total.";
  }
  if (matchState === "none") {
    return "Nenhum vínculo resolvido para este ativo nesta sync.";
  }
  return null;
}

function syncStatusLabel(status?: string | null) {
  const normalized = (status || "").trim().toLowerCase();
  if (normalized === "success") return "Concluída";
  if (normalized === "failed") return "Falha";
  if (normalized === "running" || normalized === "queued") return "Em andamento";
  if (!normalized) return "Sem sync";
  return status || "Não informado";
}

function sourceLabel(item: MetabaseConsumptionItem) {
  if (!item.source_table_name) return null;
  if (item.source_schema_name && item.source_database_name && item.source_database_name !== item.source_schema_name) {
    return `${item.source_database_name}.${item.source_schema_name}.${item.source_table_name}`;
  }
  if (item.source_schema_name) return `${item.source_schema_name}.${item.source_table_name}`;
  if (item.source_database_name) return `${item.source_database_name}.${item.source_table_name}`;
  return item.source_table_name;
}

function SectionTitle({ title, description }: { title: string; description: string }) {
  return (
    <div className="space-y-1">
      <p className="text-sm font-semibold text-text">{title}</p>
      <p className="text-sm text-text-body">{description}</p>
    </div>
  );
}

function SummaryChip({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight text-text">{value}</p>
      <p className="mt-2 text-xs leading-5 text-text-body">{detail}</p>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-40 w-full rounded-3xl" />
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, idx) => (
          <Skeleton className="h-28 w-full rounded-3xl" key={idx} />
        ))}
      </div>
      <Skeleton className="h-72 w-full rounded-3xl" />
    </div>
  );
}

function ConsumptionCard({
  item,
  icon: Icon,
}: {
  item: MetabaseConsumptionItem;
  icon: typeof LayoutDashboard;
}) {
  const stateLabel = matchStateLabel(item.match_state);
  const methodLabel = matchMethodLabel(item.match_method);

  return (
    <Card className="border-border/80 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl border border-border bg-bg-subtle p-2 text-text-body">
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-text">{item.title}</p>
              <p className="mt-1 text-xs text-muted">{item.collection_name || "Sem collection"}</p>
              <p className="mt-1 text-xs text-muted">Método: {methodLabel}</p>
            </div>
          </div>
          <Badge tone="neutral" className={cn("shrink-0 border", toneClass(item.confidence_level))}>
            {item.confidence_level}
          </Badge>
        </div>

        {item.description ? <p className="text-sm leading-6 text-text-body">{item.description}</p> : null}
        {item.confidence_reason ? <p className="text-sm leading-6 text-text-body">{item.confidence_reason}</p> : null}

        <div className="flex flex-wrap gap-2">
          {item.match_state ? (
            <Badge tone={matchStateTone(item.match_state)}>{stateLabel}</Badge>
          ) : null}
          {item.match_state ? <Badge tone="neutral">Origem: {methodLabel}</Badge> : null}
          {sourceLabel(item) ? <Badge tone="neutral">{sourceLabel(item)}</Badge> : null}
          {item.source_column_name ? <Badge tone="neutral">{item.source_column_name}</Badge> : null}
        </div>

        <div className="flex flex-wrap gap-2">
          {item.url ? (
            <Button asChild size="sm" variant="outline">
              <Link href={item.url} target="_blank" rel="noreferrer">
                Abrir no Metabase
                <ExternalLink className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          ) : null}
          {item.collection_name ? <Badge tone="accent">Collection: {item.collection_name}</Badge> : null}
        </div>
      </CardContent>
    </Card>
  );
}

export function ExplorerConsumptionTabContent({
  loading,
  error,
  syncLoading = false,
  syncError = "",
  selectedTableFullName,
  selectedTableId,
  consumption,
  onRetry,
  onSync,
  canSync = false,
}: ExplorerConsumptionTabContentProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useExplorerDebugLifecycle("ExplorerConsumptionTabContent", {
    selectedTableId,
    loading,
    hasConsumption: Boolean(consumption),
    hasError: Boolean(error),
  });
  useExplorerDebugLayout("ExplorerConsumptionTabContent", rootRef, {
    selectedTableId,
    loading,
    hasConsumption: Boolean(consumption),
    hasError: Boolean(error),
    available: consumption?.available ?? null,
    enabled: consumption?.enabled ?? null,
  });

  let content: ReactNode;
  if (selectedTableId === null) {
    content = <EmptyState title="Nenhuma tabela selecionada" description="Escolha um ativo para ver o consumo analítico no Metabase." />;
  } else if (loading && !consumption) {
    content = <LoadingSkeleton />;
  } else if (error) {
    content = (
      <Card className="border-danger-200 bg-danger-50/70">
        <CardContent className="space-y-3 p-4">
          <p className="text-sm font-semibold text-danger-700">Não foi possível carregar o consumo analítico deste ativo.</p>
          <p className="text-sm leading-6 text-danger-700">{error}</p>
          <div className="flex flex-wrap gap-2">
            {onRetry ? (
              <Button size="sm" onClick={onRetry} variant="outline" type="button">
                Tentar novamente
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>
    );
  } else if (!consumption) {
    content = (
      <EmptyState
        title="Sem consumo analítico encontrado"
        description="Ainda não encontramos dashboards, questions ou collections vinculados a este ativo."
      />
    );
  } else {
    const totalItems = consumption.dashboards_count + consumption.questions_count + consumption.collections_count;
    const directItemCount = consumption.direct_count ?? 0;
    const indirectItemCount = consumption.indirect_count ?? 0;
    const syncPending = Boolean(consumption.configured && !consumption.last_sync_at);
    const syncSucceeded = consumption.last_sync_status === "success";
    const matchStateText = matchStateLabel(consumption.match_state);
    const confidenceDetail = !consumption.configured
      ? consumption.message || "Integração indisponível."
      : consumption.last_sync_status
        ? `Última sync: ${syncStatusLabel(consumption.last_sync_status)}${consumption.match_state ? ` · ${matchStateText}` : ""}`
        : syncPending
          ? "Sincronização ainda não executada."
          : "Instância configurada.";
    const instanceLabel = consumption.instance_name || "Instância Metabase";
    const matchDetail = matchStateDetail(consumption.match_state);

    content = (
      <div className="space-y-4">
        {!consumption.configured ? (
          <Card className="border-warning-200 bg-warning-50/80">
            <CardContent className="space-y-2 p-4">
              <p className="text-sm font-semibold text-warning-700">Integração com Metabase indisponível</p>
              <p className="text-sm leading-6 text-warning-700">
                {consumption.message || "Não há uma instância habilitada ou a sincronização ainda não foi concluída."}
              </p>
            </CardContent>
          </Card>
        ) : null}

        <Card className="overflow-hidden border-border/80 bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-900 text-white shadow-[0_24px_60px_rgba(15,23,42,0.24)]">
          <CardHeader className="border-white/10 bg-surface/5 px-6 py-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-surface/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/80">
                  <Layers3 className="h-3.5 w-3.5" />
                  Consumo analítico no Metabase
                </div>
                <h2 className="max-w-4xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  Quais dashboards, questions e collections usam este ativo?
                </h2>
                <p className="max-w-4xl text-sm leading-6 text-slate-200">
                  {selectedTableFullName} · visão do consumo no BI para entender onde a tabela aparece, com que força ela é usada e o que pode ser afetado se algo mudar.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge tone="neutral" className="border-white/15 bg-surface/10 text-white">
                  {totalItems} artefatos
                </Badge>
                <Badge tone={consumption.enabled ? "success" : "warning"} className="border-white/15 bg-surface/10 text-white">
                  {consumption.enabled ? "Integração ativa" : "Integração inativa"}
                </Badge>
                <Badge tone={consumption.available ? "success" : "neutral"} className="border-white/15 bg-surface/10 text-white">
                  {confidenceDetail}
                </Badge>
                {syncPending ? (
                  <Badge tone="warning" className="border-white/15 bg-surface/10 text-white">
                    Sincronização pendente
                  </Badge>
                ) : null}
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 px-6 py-6">
            {matchDetail ? (
              <div className="rounded-3xl border border-white/10 bg-surface/5 p-4">
                <p className="text-sm font-semibold text-white">Leitura do vínculo</p>
                <p className="mt-1 text-sm leading-6 text-slate-200">{matchDetail}</p>
              </div>
            ) : null}
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <SummaryChip
                label="Dashboards"
                value={String(consumption.dashboards_count)}
                detail="Painéis do Metabase que dependem desta tabela."
              />
              <SummaryChip
                label="Perguntas e cards"
                value={String(consumption.questions_count)}
                detail="Perguntas e cards que consomem a tabela diretamente ou por SQL inferido."
              />
              <SummaryChip label="Coleções" value={String(consumption.collections_count)} detail="Coleções onde os artefatos relacionados foram encontrados." />
              <SummaryChip
                label="Confiança"
                value={
                  consumption.confirmed_count > 0
                    ? "Confirmada"
                    : consumption.inferred_count > 0
                      ? "Inferida"
                      : consumption.partial_count > 0
                        ? "Parcial"
                        : "Sem vínculo"
                }
                detail={`${consumption.confirmed_count} confirmados · ${consumption.inferred_count} inferidos · ${consumption.partial_count} parciais`}
              />
              <SummaryChip
                label="Tipo de vínculo"
                value={matchStateText}
                detail={`${directItemCount} vínculos diretos · ${indirectItemCount} vínculos indiretos via view ou linhagem`}
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-white/10 bg-surface/5 p-4">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-white">{instanceLabel}</p>
                <p className="text-sm text-slate-200">
                  {consumption.instance_base_url || "Base URL não informada"} · {syncSucceeded ? "sync concluída" : syncPending ? "aguardando sincronização" : "estado operacional disponível"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {canSync && onSync ? (
                  <Button disabled={syncLoading} onClick={onSync} size="sm" type="button" variant="default">
                    {syncLoading ? "Sincronizando..." : "Sincronizar agora"}
                  </Button>
                ) : null}
                {onRetry ? (
                  <Button onClick={onRetry} size="sm" type="button" variant="outline">
                    Recarregar consumo
                  </Button>
                ) : null}
              </div>
            </div>
            {syncError ? (
              <Card className="border-danger-200 bg-danger-50/70">
                <CardContent className="p-4">
                  <p className="text-sm font-semibold text-danger-700">Falha na sincronização do Metabase</p>
                  <p className="mt-1 text-sm leading-6 text-danger-700">{syncError}</p>
                </CardContent>
              </Card>
            ) : null}
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
          <CardContent className="space-y-4 p-5">
            <SectionTitle
              title="Resumo da sincronização"
              description="Estado operacional da última sincronização do Metabase e nível de cobertura que o Explorer conseguiu trazer até agora."
            />
            <div className="grid gap-3 md:grid-cols-3">
              <SummaryChip
                label="Última sync"
                value={syncStatusLabel(consumption.last_sync_status)}
                detail={
                  consumption.last_sync_at
                    ? consumption.message || "Nenhuma mensagem adicional foi registrada."
                    : consumption.configured
                      ? "Instância configurada, aguardando a primeira sincronização."
                      : consumption.message || "Nenhuma mensagem adicional foi registrada."
                }
              />
              <SummaryChip
                label="Tabela"
                value={consumption.table_fqn}
                detail={`Metabase ${consumption.enabled ? "habilitado" : "desabilitado"} · ${consumption.configured ? "instância real configurada" : "sem instância configurada"}`}
              />
              <SummaryChip
                label="Cobertura"
                value={String(totalItems)}
                detail="Quantidade total de dashboards, perguntas/cards e coleções relacionadas."
              />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <SectionTitle title="Dashboards" description="Painéis que usam esta tabela. Veja a lista para entender onde o impacto pode aparecer quando o ativo muda." />
          <div className="grid gap-4 xl:grid-cols-2">
            {consumption.dashboards.length > 0 ? (
              consumption.dashboards.map((item) => <ConsumptionCard icon={LayoutDashboard} item={item} key={`${item.object_type}:${item.object_id}`} />)
            ) : (
              <EmptyState title="Sem dashboards vinculados" description="Ainda não encontramos painéis do Metabase ligados a este ativo." />
            )}
          </div>
        </div>

        <div className="space-y-4">
          <SectionTitle title="Perguntas e cards" description="Consultas e cards que apontam para a tabela atual ou foram inferidos a partir do SQL." />
          <div className="grid gap-4 xl:grid-cols-2">
            {consumption.questions.length > 0 ? (
              consumption.questions.map((item) => <ConsumptionCard icon={FileSearch} item={item} key={`${item.object_type}:${item.object_id}`} />)
            ) : (
              <EmptyState title="Sem perguntas vinculadas" description="Não foram identificadas perguntas ou cards do Metabase usando este ativo." />
            )}
          </div>
        </div>

        <div className="space-y-4">
          <SectionTitle title="Coleções" description="Coleções em que os artefatos relacionados foram encontrados, ajudando a entender como eles estão organizados no Metabase." />
          <div className="grid gap-4 xl:grid-cols-2">
            {consumption.collections.length > 0 ? (
              consumption.collections.map((item) => <ConsumptionCard icon={ListFilter} item={item} key={`${item.object_type}:${item.object_id}`} />)
            ) : (
              <EmptyState title="Sem coleções vinculadas" description="Ainda não encontramos coleções associadas a este ativo." />
            )}
          </div>
        </div>
      </div>
    );
  }

  return <div ref={rootRef}>{content}</div>;
}
