import { Link } from "@/lib/next-shims";
import { Sparkles } from "lucide-react";

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

type TermDetail = {
  id: number;
  external_id: string | null;
  slug: string;
  name: string;
  definition: string;
  category: string | null;
  subcategory: string | null;
  example_of_use: string | null;
  synonyms: string | null;
  suggested_priority: string | null;
  status: string;
  tag_labels: string | null;
  notes: string | null;
  tables_count: number;
  linked_tables: LinkedTablePreview[];
  created_at: string;
  updated_at: string;
};

type GlossaryDetailDialogProps = {
  open: boolean;
  loading: boolean;
  selectedTerm: TermDetail | null;
  onClose: () => void;
  formatDate: (value: string) => string;
  parseTagLabels: (value: string | null) => string[];
  priorityLabel: (value: string | null) => string;
  priorityTone: (value: string | null) => "success" | "warning" | "neutral" | "accent";
  statusLabel: (value: string) => string;
  statusTone: (value: string) => "success" | "warning" | "neutral" | "accent";
};

export function GlossaryDetailDialog({
  open,
  loading,
  selectedTerm,
  onClose,
  formatDate,
  parseTagLabels,
  priorityLabel,
  priorityTone,
  statusLabel,
  statusTone,
}: GlossaryDetailDialogProps) {
  useModalDismiss({ open, onClose });
  if (!open) return null;

  return (
    <div aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-3" role="dialog">
      <div className="flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-text">Detalhes do termo</h3>
            <p className="text-xs text-muted">Contexto conceitual e vínculos do glossário no catálogo.</p>
          </div>
          <Button onClick={onClose} variant="ghost">
            Fechar
          </Button>
        </div>
        {loading || !selectedTerm ? (
          <div className="flex-1 overflow-y-auto p-6 text-sm text-muted">Carregando detalhes...</div>
        ) : (
          <div className="flex-1 space-y-6 overflow-y-auto p-6">
            <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-2xl font-semibold text-text">{selectedTerm.name}</h4>
                    <Badge tone={statusTone(selectedTerm.status)}>{statusLabel(selectedTerm.status)}</Badge>
                    <Badge tone={priorityTone(selectedTerm.suggested_priority)}>{priorityLabel(selectedTerm.suggested_priority)}</Badge>
                  </div>
                  <p className="mt-2 text-sm font-medium text-text-body">{selectedTerm.slug}</p>
                </div>
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-bg-subtle text-muted shadow-sm">
                  <Sparkles className="h-6 w-6" />
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {selectedTerm.category ? <Badge tone="neutral">{selectedTerm.category}</Badge> : null}
                {selectedTerm.subcategory ? <Badge tone="neutral">{selectedTerm.subcategory}</Badge> : null}
                {parseTagLabels(selectedTerm.tag_labels).map((tag) => (
                  <Badge key={tag} tone="accent">{tag}</Badge>
                ))}
              </div>
              <p className="mt-4 text-sm leading-6 text-text-body">{selectedTerm.definition}</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Card className="border-border bg-surface shadow-sm"><CardContent className="py-4"><p className="text-xs uppercase tracking-[0.16em] text-muted">ID externo</p><p className="mt-2 text-sm font-semibold text-text">{selectedTerm.external_id || "-"}</p></CardContent></Card>
              <Card className="border-border bg-surface shadow-sm"><CardContent className="py-4"><p className="text-xs uppercase tracking-[0.16em] text-muted">Tabelas vinculadas</p><p className="mt-2 text-xl font-semibold text-text">{selectedTerm.tables_count}</p></CardContent></Card>
              <Card className="border-border bg-surface shadow-sm"><CardContent className="py-4"><p className="text-xs uppercase tracking-[0.16em] text-muted">Criado em</p><p className="mt-2 text-sm font-semibold text-text">{formatDate(selectedTerm.created_at)}</p></CardContent></Card>
              <Card className="border-border bg-surface shadow-sm"><CardContent className="py-4"><p className="text-xs uppercase tracking-[0.16em] text-muted">Atualizado em</p><p className="mt-2 text-sm font-semibold text-text">{formatDate(selectedTerm.updated_at)}</p></CardContent></Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="border-border bg-surface shadow-sm">
                <CardHeader><h4 className="text-sm font-semibold text-text">Contexto semântico</h4></CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted">Exemplo de uso</p>
                    <p className="mt-1 text-sm leading-6 text-text-body">{selectedTerm.example_of_use || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted">Sinônimos</p>
                    <p className="mt-1 text-sm leading-6 text-text-body">{selectedTerm.synonyms || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted">Observações</p>
                    <p className="mt-1 text-sm leading-6 text-text-body">{selectedTerm.notes || "-"}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-border bg-surface shadow-sm">
                <CardHeader><h4 className="text-sm font-semibold text-text">Tabelas associadas</h4></CardHeader>
                <CardContent className="space-y-3">
                  {selectedTerm.linked_tables.length === 0 ? (
                    <p className="text-sm leading-6 text-muted">Nenhuma tabela associada até o momento.</p>
                  ) : (
                    selectedTerm.linked_tables.map((table) => (
                      <div className="rounded-xl border border-border bg-bg-subtle px-3 py-3" key={table.id}>
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="break-words text-sm font-semibold leading-5 text-text whitespace-normal">{table.schema_name}.{table.name}</p>
                            <p className="mt-1 break-words text-xs leading-5 text-muted whitespace-normal">{table.datasource_name} • {table.database_name}</p>
                          </div>
                          <Link className="text-xs font-semibold text-text-body hover:text-text hover:underline" href="/explorer">
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
          </div>
        )}
      </div>
    </div>
  );
}
