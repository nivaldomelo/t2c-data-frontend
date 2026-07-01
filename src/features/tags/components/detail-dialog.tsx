import { Link } from "@/lib/next-shims";
import { RefreshCw, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useModalDismiss } from "@/lib/use-modal-dismiss";

type LinkedTablePreview = {
  id: number;
  name: string;
  schema_name: string;
  database_name: string;
  datasource_name: string;
  description: string | null;
};

type TagDetail = {
  id: number;
  external_id: string | null;
  slug: string;
  name: string;
  color: string | null;
  description: string | null;
  group_name: string | null;
  subgroup_name: string | null;
  example_of_use: string | null;
  tag_type: string | null;
  suggested_scope: string | null;
  status: string;
  synonyms: string | null;
  notes: string | null;
  tables_count: number;
  columns_count: number;
  linked_tables_preview: LinkedTablePreview[];
  created_at: string;
  updated_at: string;
  linked_tables: LinkedTablePreview[];
};

type RelatedRule = {
  id: number;
  name: string;
  scope: string;
  status: string;
  action: string;
  category: string | null;
  priority: number;
  min_confidence: number;
  match_fields: string[];
  keywords: string[];
  aliases: string[];
};

type TagsDetailDialogProps = {
  open: boolean;
  loading: boolean;
  selectedTag: TagDetail | null;
  onClose: () => void;
  canManage: boolean;
  reprocessing: boolean;
  onReprocessLinkedTables: () => void;
  relatedRules: RelatedRule[];
  statusTone: (status: string) => "success" | "warning" | "neutral" | "accent";
  statusLabel: (status: string) => string;
  formatDate: (value: string) => string;
};

export function TagsDetailDialog({
  open,
  loading,
  selectedTag,
  onClose,
  canManage,
  reprocessing,
  onReprocessLinkedTables,
  relatedRules,
  statusTone,
  statusLabel,
  formatDate,
}: TagsDetailDialogProps) {
  useModalDismiss({ open, onClose });
  if (!open) return null;

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-3"
      role="dialog"
    >
      <div className="flex max-h-[92dvh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl">
        <div className="flex items-center justify-between border-b border-border bg-surface px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-text">Detalhes da tag</h3>
            <p className="text-xs text-muted">Contexto completo da classificação e uso atual no catálogo.</p>
          </div>
          <div className="flex items-center gap-2">
            {canManage && selectedTag && selectedTag.linked_tables.length > 0 ? (
              <Button onClick={onReprocessLinkedTables} disabled={reprocessing} variant="outline">
                <RefreshCw className="mr-2 h-4 w-4" />
                {reprocessing ? "Reprocessando..." : "Reprocessar tabelas"}
              </Button>
            ) : null}
            <Button onClick={onClose} variant="ghost">
              Fechar
            </Button>
          </div>
        </div>
        {loading || !selectedTag ? (
          <div className="flex-1 overflow-y-auto p-6 text-sm text-muted">Carregando detalhes...</div>
        ) : (
          <div className="flex-1 space-y-6 overflow-y-auto p-6">
            <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="break-words text-2xl font-semibold text-text whitespace-normal">{selectedTag.name}</h4>
                    <Badge tone={statusTone(selectedTag.status)}>{statusLabel(selectedTag.status)}</Badge>
                  </div>
                  <p className="mt-2 break-words text-sm font-medium text-text-body whitespace-normal">{selectedTag.slug}</p>
                </div>
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-bg-subtle text-text-body shadow-sm">
                  <Sparkles className="h-6 w-6" />
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {selectedTag.group_name ? <Badge tone="neutral">{selectedTag.group_name}</Badge> : null}
                {selectedTag.subgroup_name ? <Badge tone="neutral">{selectedTag.subgroup_name}</Badge> : null}
                {selectedTag.tag_type ? <Badge tone="neutral">{selectedTag.tag_type}</Badge> : null}
                {selectedTag.suggested_scope ? <Badge tone="neutral">{selectedTag.suggested_scope}</Badge> : null}
              </div>
              <p className="mt-4 break-words text-sm leading-6 text-text-body whitespace-normal">
                {selectedTag.description || "Sem descrição cadastrada."}
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Card className="border-border bg-surface shadow-sm">
                <CardContent className="py-4">
                  <p className="text-xs uppercase tracking-wide text-muted">ID externo</p>
                  <p className="mt-2 break-words text-sm font-semibold text-text whitespace-normal">{selectedTag.external_id || "-"}</p>
                </CardContent>
              </Card>
              <Card className="border-border bg-surface shadow-sm">
                <CardContent className="py-4">
                  <p className="text-xs uppercase tracking-wide text-muted">Tabelas vinculadas</p>
                  <p className="mt-2 text-xl font-semibold text-text">{selectedTag.tables_count}</p>
                </CardContent>
              </Card>
              <Card className="border-border bg-surface shadow-sm">
                <CardContent className="py-4">
                  <p className="text-xs uppercase tracking-wide text-muted">Colunas vinculadas</p>
                  <p className="mt-2 text-xl font-semibold text-text">{selectedTag.columns_count}</p>
                </CardContent>
              </Card>
              <Card className="border-border bg-surface shadow-sm">
                <CardContent className="py-4">
                  <p className="text-xs uppercase tracking-wide text-muted">Criada em</p>
                  <p className="mt-2 text-sm font-semibold text-text">{formatDate(selectedTag.created_at)}</p>
                </CardContent>
              </Card>
              <Card className="border-border bg-surface shadow-sm">
                <CardContent className="py-4">
                  <p className="text-xs uppercase tracking-wide text-muted">Atualizada em</p>
                  <p className="mt-2 text-sm font-semibold text-text">{formatDate(selectedTag.updated_at)}</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="border-border bg-surface shadow-sm">
                <CardHeader className="pb-3">
                  <h4 className="text-sm font-semibold text-text">Contexto de uso</h4>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted">Exemplo de uso</p>
                    <p className="mt-1 break-words text-sm leading-6 text-text-body whitespace-normal">{selectedTag.example_of_use || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted">Sinônimos</p>
                    <p className="mt-1 break-words text-sm leading-6 text-text-body whitespace-normal">{selectedTag.synonyms || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted">Observações</p>
                    <p className="mt-1 break-words text-sm leading-6 text-text-body whitespace-normal">{selectedTag.notes || "-"}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-border bg-surface shadow-sm">
                <CardHeader className="pb-3">
                  <h4 className="text-sm font-semibold text-text">Tabelas associadas</h4>
                </CardHeader>
                <CardContent className="space-y-3">
                  {selectedTag.linked_tables.length === 0 ? (
                    <p className="text-sm leading-6 text-muted">Nenhuma tabela associada até o momento.</p>
                  ) : (
                    selectedTag.linked_tables.map((table) => (
                      <div className="rounded-xl border border-border bg-bg-subtle px-4 py-4" key={table.id}>
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="break-words text-sm font-semibold leading-5 text-text whitespace-normal">{table.schema_name}.{table.name}</p>
                            <p className="mt-1 break-words text-xs leading-5 text-muted whitespace-normal">{table.datasource_name} • {table.database_name}</p>
                          </div>
                          <Link className="shrink-0 text-xs font-semibold text-text-body hover:text-text hover:underline" href="/explorer">
                            Abrir no Explorer
                          </Link>
                        </div>
                        {table.description ? <p className="mt-2 break-words text-xs leading-5 text-text-body whitespace-normal">{table.description}</p> : null}
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>

            <Card className="border-border bg-surface shadow-sm">
              <CardHeader className="pb-3">
                <h4 className="text-sm font-semibold text-text">Regras automáticas relacionadas</h4>
              </CardHeader>
              <CardContent className="space-y-3">
                {relatedRules.length === 0 ? (
                  <p className="text-sm leading-6 text-muted">Nenhuma regra automática vinculada a esta tag.</p>
                ) : (
                  relatedRules.map((rule) => (
                    <div className="rounded-xl border border-border bg-bg-subtle px-4 py-3" key={rule.id}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-text">{rule.name}</p>
                          <p className="text-xs text-muted">{rule.scope} · prioridade {rule.priority}</p>
                        </div>
                        <Badge tone={rule.status === "active" ? "success" : "warning"}>{statusLabel(rule.status)}</Badge>
                      </div>
                      <p className="mt-2 text-xs text-text-body">
                        Ação: {rule.action} · confiança mínima {rule.min_confidence}%{rule.category ? ` · categoria ${rule.category}` : ""}
                      </p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
