import { Copy, Database, PencilLine, Table2, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { TableDescriptionCard } from "@/components/catalog/table-description-card";
import { TagBadgeList } from "@/components/tags/tag-badges";
import { cn } from "@/lib/cn";
import { useModalDismiss } from "@/lib/use-modal-dismiss";

import type { ColumnDictionaryDetail } from "../types";

type DictionaryDetailDrawerProps = {
  open: boolean;
  loading: boolean;
  saving: boolean;
  canManage: boolean;
  item: ColumnDictionaryDetail | null;
  form: {
    dictionary_description: string;
    dictionary_comment: string;
    existing_comment: string;
  };
  onClose: () => void;
  onSave: () => void;
  onClear: () => void;
  onFieldChange: (field: "dictionary_description" | "dictionary_comment" | "existing_comment", value: string) => void;
  formatDateTime: (value: string) => string;
  onTableDescriptionSaved: () => void;
};

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-bg-subtle/80 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">{label}</p>
      <p className="mt-2 text-sm font-semibold leading-6 text-text">{value}</p>
    </div>
  );
}

export function DictionaryDetailDrawer({
  open,
  loading,
  saving,
  canManage,
  item,
  form,
  onClose,
  onSave,
  onClear,
  onFieldChange,
  formatDateTime,
  onTableDescriptionSaved,
}: DictionaryDetailDrawerProps) {
  useModalDismiss({ open, onClose });
  if (!open) return null;

  const title = item ? `${item.schema_name}.${item.table_name}.${item.name}` : "Carregando coluna";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-3 backdrop-blur-sm sm:p-6">
      <button aria-label="Fechar detalhe" className="absolute inset-0 cursor-default" onClick={onClose} type="button" />
      <div
        aria-describedby={item ? `dictionary-detail-content-${item.id}` : undefined}
        aria-labelledby="dictionary-detail-title"
        aria-modal="true"
        className="relative flex max-h-[92dvh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-border bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] shadow-[0_28px_90px_rgba(15,23,42,0.22)]"
        role="dialog"
      >
        <div className="sticky top-0 z-10 border-b border-border bg-surface/95 backdrop-blur">
          <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Dicionário de Dados</p>
              <h3 className="mt-1 break-words text-xl font-semibold text-text sm:text-2xl" id="dictionary-detail-title">
                {title}
              </h3>
            </div>
            <Button
              aria-label="Fechar"
              className="h-10 w-10 shrink-0 px-0"
              onClick={onClose}
              variant="outline"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-8">
          {loading ? (
            <div className="space-y-4">
              <div className="h-28 animate-pulse rounded-3xl bg-bg-subtle" />
              <div className="h-40 animate-pulse rounded-3xl bg-bg-subtle" />
              <div className="h-48 animate-pulse rounded-3xl bg-bg-subtle" />
            </div>
          ) : null}

          {!loading && item ? (
            <div className="space-y-6" id={item ? `dictionary-detail-content-${item.id}` : undefined}>
              <Card className="border-border bg-surface shadow-[0_12px_36px_rgba(15,23,42,0.06)]">
                <CardContent className="space-y-5 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={item.documentation_status === "complete" ? "success" : item.documentation_status === "partial" ? "warning" : "danger"}>
                          {item.documentation_status_label}
                        </Badge>
                        {item.is_primary_key ? <Badge tone="accent">PK</Badge> : null}
                        {!item.is_nullable ? <Badge tone="neutral">Obrigatória</Badge> : <Badge tone="neutral">Aceita nulo</Badge>}
                      </div>
                      <p className="break-words text-sm text-muted">
                        {item.datasource_name} • {item.database_name} • {item.schema_name}.{item.table_name}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-border bg-bg-subtle px-4 py-3 text-right">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Completude</p>
                      <p className="mt-1 text-2xl font-semibold text-text">{item.documentation_pct}%</p>
                    </div>
                  </div>

              <div className="grid gap-3 md:grid-cols-3">
                <StatCard label="ID" value={String(item.id)} />
                <StatCard label="Slug" value={item.slug || "-"} />
                <StatCard label="Ordem" value={String(item.ordinal_position)} />
              </div>

              <div className="rounded-3xl border border-border bg-bg-subtle/80 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Tags da coluna</p>
                <div className="mt-3">
                  <TagBadgeList tags={item.tags} maxVisible={6} />
                </div>
              </div>
            </CardContent>
          </Card>

              <TableDescriptionCard
                canEdit={canManage}
                descriptionManual={item.table_description_manual}
                descriptionSource={item.table_description_source}
                onSaved={onTableDescriptionSaved}
                tableId={item.table_id}
                title="Descrição da tabela"
              />

              <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
                <Card className="border-border bg-surface shadow-[0_12px_36px_rgba(15,23,42,0.06)]">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4 text-info-600" />
                      <h4 className="text-sm font-semibold text-text">Identificação técnica</h4>
                    </div>
                  </CardHeader>
                  <CardContent className="grid gap-3 md:grid-cols-2">
                    <StatCard label="Schema" value={item.schema_name} />
                    <StatCard label="Tabela" value={item.table_name} />
                    <StatCard label="Coluna" value={item.name} />
                    <StatCard label="Tipo de dado" value={item.data_type} />
                    <StatCard label="UDT" value={item.udt_name || "-"} />
                    <StatCard label="Chave primária" value={item.is_primary_key ? "Sim" : "Não"} />
                  </CardContent>
                </Card>

                <Card className="border-border bg-surface shadow-[0_12px_36px_rgba(15,23,42,0.06)]">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Table2 className="h-4 w-4 text-info-600" />
                      <h4 className="text-sm font-semibold text-text">Estrutura técnica</h4>
                    </div>
                  </CardHeader>
                  <CardContent className="grid gap-3 md:grid-cols-2">
                    <StatCard label="Tamanho máximo" value={item.character_maximum_length ? String(item.character_maximum_length) : "-"} />
                    <StatCard label="Precisão numérica" value={item.numeric_precision ? String(item.numeric_precision) : "-"} />
                    <StatCard label="Escala numérica" value={item.numeric_scale ? String(item.numeric_scale) : "-"} />
                    <StatCard label="Aceita nulo" value={item.is_nullable ? "Sim" : "Não"} />
                    <StatCard label="Valor padrão" value={item.column_default || "-"} />
                    <StatCard label="Comentário existente" value={item.existing_comment ? "Presente" : "Ausente"} />
                  </CardContent>
                </Card>
              </div>

              <Card className="border-border bg-surface shadow-[0_12px_36px_rgba(15,23,42,0.06)]">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <PencilLine className="h-4 w-4 text-info-600" />
                    <h4 className="text-sm font-semibold text-text">Documentação funcional</h4>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-2xl border border-border bg-bg-subtle/70 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Descrição de origem</p>
                    <p className="mt-2 text-sm leading-6 text-text-body">{item.description_source || "-"}</p>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-text-body">Descrição do dicionário</label>
                    <Textarea
                      onChange={(event) => onFieldChange("dictionary_description", event.target.value)}
                      placeholder="Explique o significado funcional desta coluna."
                      value={form.dictionary_description}
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-text-body">Comentário do dicionário</label>
                    <Textarea
                      onChange={(event) => onFieldChange("dictionary_comment", event.target.value)}
                      placeholder="Adicione observações de negócio, exceções ou uso esperado."
                      value={form.dictionary_comment}
                    />
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <label className="block text-sm font-medium text-text-body">Comentário existente</label>
                      <span className="text-xs text-muted">Opcional</span>
                    </div>
                    <Textarea
                      onChange={(event) => onFieldChange("existing_comment", event.target.value)}
                      placeholder="Espelhe o comentário da origem quando isso ajudar a triagem."
                      value={form.existing_comment}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border bg-surface shadow-[0_12px_36px_rgba(15,23,42,0.06)]">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Copy className="h-4 w-4 text-info-600" />
                    <h4 className="text-sm font-semibold text-text">Qualidade do dicionário</h4>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-4">
                  <StatCard label="Coluna documentada?" value={item.has_description ? "Sim" : "Não"} />
                  <StatCard label="Comentário aproveitado?" value={item.has_existing_comment ? "Sim" : "Não"} />
                  <StatCard label="Comentário preenchido?" value={item.has_comment ? "Sim" : "Não"} />
                  <StatCard label="Completude" value={`${item.documentation_pct}%`} />
                </CardContent>
              </Card>
            </div>
          ) : null}
        </div>

        <div className="sticky bottom-0 border-t border-border bg-surface/95 px-6 py-4 backdrop-blur">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className={cn("text-sm", item ? "text-muted" : "text-muted")}>
              {item ? `Atualizado em ${formatDateTime(item.updated_at)} • criado em ${formatDateTime(item.created_at)}` : "Carregando..."}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {canManage ? (
                <Button disabled={saving || !item} onClick={onClear} size="sm" variant="danger">
                  Apagar curadoria
                </Button>
              ) : null}
              <Button onClick={onClose} size="sm" variant="ghost">
                Fechar
              </Button>
              <Button disabled={saving || !item} onClick={onSave} size="sm">
                {saving ? "Salvando..." : "Salvar alterações"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
