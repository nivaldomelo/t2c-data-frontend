import { useEffect, useState } from "react";
import { Upload } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Banner } from "@/components/ui/banner";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { TagBadgeList } from "@/components/tags/tag-badges";
import { apiRequest } from "@/lib/client-api";

import { resolveExplorerColumnsPanelState } from "../columns-panel-state.js";
import type { TableColumn } from "../types";
import { formatDateTime, preferredColumnDescription } from "../utils";

type ExplorerColumnsTabContentProps = {
  canEdit: boolean;
  columns: TableColumn[];
  columnsLoading: boolean;
  columnsError: string;
  columnsTotal: number;
  columnsHasMore: boolean;
  columnsLoadingMore: boolean;
  onLoadMore: () => void;
  highlightedColumnId?: number | null;
  onOpenDictionaryImport: () => void;
  tableId?: number | null;
};

type TagSuggestionEvent = {
  id: number;
  tag_id: number;
  tag_name: string;
  tag_slug: string;
  column_id: number | null;
  confidence_score: number;
  inference_source: string | null;
  inference_reason: string | null;
  evidence: { matched_sources?: string[]; matched_terms?: string[] } | null;
  review_status: string;
};

export function ExplorerColumnsTabContent({
  canEdit,
  columns,
  columnsLoading,
  columnsError,
  columnsTotal,
  columnsHasMore,
  columnsLoadingMore,
  onLoadMore,
  highlightedColumnId,
  onOpenDictionaryImport,
  tableId,
}: ExplorerColumnsTabContentProps) {
  const [suggestionsByColumn, setSuggestionsByColumn] = useState<Record<number, TagSuggestionEvent[]>>({});

  useEffect(() => {
    if (!tableId) {
      setSuggestionsByColumn({});
      return;
    }
    let active = true;
    void (async () => {
      try {
        const params = new URLSearchParams({
          entity_type: "column",
          table_id: String(tableId),
          limit: "200",
        });
        const data = await apiRequest<TagSuggestionEvent[]>(`/v1/tags/intelligence/events?${params.toString()}`);
        if (!active) return;
        const grouped: Record<number, TagSuggestionEvent[]> = {};
        data.forEach((event) => {
          if (!event.column_id) return;
          grouped[event.column_id] = [...(grouped[event.column_id] || []), event];
        });
        setSuggestionsByColumn(grouped);
      } catch {
        if (active) {
          setSuggestionsByColumn({});
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [tableId]);

  if (columnsLoading) {
    return (
      <div className="min-h-[24rem] space-y-2">
        {Array.from({ length: 8 }).map((_, idx) => (
          <Skeleton className="h-9 w-full" key={idx} />
        ))}
      </div>
    );
  }

  const panelState = resolveExplorerColumnsPanelState({
    columns,
    columnsError,
    columnsLoading,
  });

  if (panelState.kind === "error") {
    return <EmptyState title="Não foi possível carregar as colunas" description={panelState.message} />;
  }

  if (panelState.kind === "empty") {
    return <EmptyState title="Sem colunas visíveis" description="Esta tabela ainda não expõe colunas visíveis no catálogo." />;
  }

  return (
    <div className="min-h-[24rem] space-y-4">
      <Card className="border-border/80 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
        <CardContent className="space-y-2 p-5">
          <p className="text-sm font-semibold text-text">Colunas e documentação por campo</p>
          <p className="text-sm leading-6 text-text-body">
            Cada card resume o papel de uma coluna no ativo, com tipo de dado, responsável, tags, comentários e sugestões automáticas.
            Use esta aba para entender o que cada campo representa e o quanto ele já está documentado.
          </p>
        </CardContent>
      </Card>

      {columnsError ? (
        <Banner description={columnsError} icon={<Upload className="h-4 w-4" />} tone="warning" title="Falha ao atualizar colunas" />
      ) : null}

      {!columns.some((column) => column.dictionary_description || column.dictionary_comment || column.existing_comment) ? (
        <Banner
          action={
            canEdit ? (
              <Button onClick={onOpenDictionaryImport} size="sm">
                <Upload className="h-4 w-4" />
                Importar dicionário
              </Button>
          ) : null
        }
          description="O Explorer segue funcionando com os metadados técnicos atuais. Importe o dicionário para enriquecer os nomes de negócio, as descrições e os comentários de cada coluna."
          icon={<Upload className="h-4 w-4" />}
          tone="info"
          title="Dicionário de dados ainda não importado"
        />
      ) : null}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {columns.map((column) => {
          const businessDescription = preferredColumnDescription(column);
          const isHighlighted = highlightedColumnId === column.id;
          const technicalNotes = [
            column.udt_name ? `UDT ${column.udt_name}` : null,
            column.character_maximum_length ? `Tam. máx. ${column.character_maximum_length}` : null,
            column.numeric_precision ? `Precisão ${column.numeric_precision}` : null,
            column.numeric_scale !== null && column.numeric_scale !== undefined ? `Escala ${column.numeric_scale}` : null,
          ].filter(Boolean);

          return (
            <Card
              className={
                isHighlighted
                  ? "border-info-200 bg-info-50/40 shadow-[0_12px_32px_rgba(14,165,233,0.12)]"
                  : "border-border/80 shadow-[0_10px_30px_rgba(15,23,42,0.04)]"
              }
              key={column.id}
            >
              <CardContent className="space-y-4 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="break-words text-sm font-semibold text-text">{column.name}</p>
                      <span className="rounded-full border border-border bg-bg-subtle px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-text-body">
                        #{column.ordinal_position}
                      </span>
                    </div>
                    <div className="inline-flex max-w-full flex-col items-start rounded-2xl border border-border bg-bg-subtle px-3 py-2">
                      <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted">Tipo de dados</span>
                      <span className="mt-0.5 max-w-full break-words font-mono text-sm font-semibold tracking-tight text-text sm:text-base">
                        {column.data_type}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap justify-end gap-1.5">
                    {column.is_primary_key ? <Badge tone="accent">PK</Badge> : null}
                    {isHighlighted ? <Badge tone="accent">Resultado da busca</Badge> : null}
                    <Badge tone={column.is_nullable ? "neutral" : "success"}>
                      {column.is_nullable ? "Opcional" : "Obrigatória"}
                    </Badge>
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-surface p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Descrição de negócio</p>
                  <p className="mt-2 text-sm leading-6 text-text-body">
                    {businessDescription || "Sem descrição enriquecida para esta coluna."}
                  </p>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-border bg-bg-subtle/70 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Responsável pelo campo</p>
                    <p className="mt-2 text-sm font-semibold text-text">
                      {column.data_owner?.name || "Sem owner definido"}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-text-body">
                      {column.data_owner?.email || "Use a governança para atribuir um responsável formal a este campo."}
                    </p>
                    {column.data_owner?.area ? (
                      <p className="mt-1 text-xs text-muted">Área: {column.data_owner.area}</p>
                    ) : null}
                  </div>
                  <div className="rounded-2xl border border-border bg-bg-subtle/70 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Última revisão do owner</p>
                    <p className="mt-2 text-sm font-semibold text-text">
                      {column.owner_reviewed_by_user_name || "Ainda sem revisão formal"}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-text-body">
                      {column.owner_reviewed_by_user_email || "Sem e-mail de revisão"}
                    </p>
                    {column.owner_reviewed_at ? (
                      <p className="mt-1 text-xs text-muted">{formatDateTime(column.owner_reviewed_at)}</p>
                    ) : null}
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-bg-subtle/70 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Tags e classificações</p>
                  <div className="mt-2">
                    <TagBadgeList tags={column.tags} maxVisible={4} />
                  </div>
                  <p className="mt-2 text-[11px] text-muted">Passe o mouse ou toque para ver escopo, origem e evidência.</p>
                </div>

                <div className="rounded-2xl border border-dashed border-border bg-surface/70 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Sugestões automáticas</p>
                  <div className="mt-2">
                    {(suggestionsByColumn[column.id] || []).length ? (
                      <TagBadgeList
                        tags={(suggestionsByColumn[column.id] || []).map((event) => ({
                          id: event.id,
                          slug: event.tag_slug,
                          name: event.tag_name,
                          color: null,
                          confidence_score: event.confidence_score,
                          inference_source: event.inference_source,
                          inference_reason: event.inference_reason,
                          evidence: event.evidence,
                          applied_automatically: false,
                          review_status: event.review_status,
                          assigned_scope: "column",
                        }))}
                        maxVisible={4}
                      />
                    ) : (
                      <span className="text-xs text-muted">Ainda não há sugestões automáticas para esta coluna.</span>
                    )}
                  </div>
                  {(suggestionsByColumn[column.id] || []).length ? (
                    <p className="mt-2 text-[11px] text-muted">Sugestões registradas para revisão posterior.</p>
                  ) : null}
                </div>

                <div className="grid gap-3 lg:grid-cols-2">
                  <div className="rounded-2xl border border-border bg-bg-subtle/70 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Comentário de negócio</p>
                    <p className="mt-2 text-sm leading-6 text-text-body">
                      {column.dictionary_comment || "Sem comentário de negócio informado para esta coluna."}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border bg-bg-subtle/70 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Metadado técnico importado</p>
                    <div className="mt-2 space-y-2 text-sm text-text-body">
                      <p>{column.existing_comment || "Nenhum comentário técnico foi importado."}</p>
                      {column.column_default ? (
                        <p className="text-xs text-muted">
                          Valor padrão: <span className="font-medium text-text-body">{column.column_default}</span>
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {technicalNotes.map((item) => (
                    <span className="rounded-full border border-border bg-surface px-2 py-0.5 text-[11px] text-text-body" key={item}>
                      {item}
                    </span>
                  ))}
                  {column.slug ? (
                    <span className="rounded-full border border-info-200 bg-info-50 px-2 py-0.5 text-[11px] text-info-700">
                      {column.slug}
                    </span>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {columnsHasMore || columnsLoadingMore ? (
        <div className="flex items-center justify-center">
          <Button onClick={onLoadMore} size="sm" variant="outline" disabled={columnsLoadingMore}>
            {columnsLoadingMore
              ? "Carregando mais colunas..."
              : `Carregar mais (${columns.length} de ${columnsTotal})`}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
