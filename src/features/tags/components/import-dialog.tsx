import type { ChangeEvent, FormEvent } from "react";
import { Download, FileSpreadsheet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useModalDismiss } from "@/lib/use-modal-dismiss";

export type TagImportError = {
  row_number: number;
  slug: string | null;
  message: string;
};

export type TagImportResult = {
  processed: number;
  imported: number;
  updated: number;
  rejected: number;
  errors: TagImportError[];
};

type TagsImportDialogProps = {
  open: boolean;
  importing: boolean;
  importResult: TagImportResult | null;
  onClose: () => void;
  onDownloadTemplate: () => void;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function TagsImportDialog({
  open,
  importing,
  importResult,
  onClose,
  onDownloadTemplate,
  onFileChange,
  onSubmit,
}: TagsImportDialogProps) {
  useModalDismiss({ open, onClose });
  if (!open) return null;

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/35 p-3"
      role="dialog"
    >
      <div className="mx-auto mt-10 w-full max-w-2xl rounded-2xl bg-surface shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-text">Importar planilha de tags</h3>
            <p className="text-xs text-muted">Use o modelo padrão para incluir ou atualizar tags pela chave slug.</p>
          </div>
          <Button onClick={onClose} variant="ghost">
            Fechar
          </Button>
        </div>
        <form className="space-y-5 p-6" onSubmit={onSubmit}>
          <div className="rounded-2xl border border-border bg-bg-subtle p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface text-orange-600 shadow-sm">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-text">Estrutura esperada</p>
                  <p className="text-xs text-muted">
                    ID, Slug, Tag, Grupo, Subgrupo, Descricao, Exemplo_de_Uso, Tipo_de_Tag, Escopo_Sugerido, Status, Sinonimos, Observacoes
                  </p>
                </div>
              </div>
              <Button onClick={onDownloadTemplate} type="button" variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Baixar modelo
              </Button>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-text-body">Arquivo .xlsx</label>
            <Input accept=".xlsx" onChange={onFileChange} type="file" />
          </div>

          {importResult ? (
            <div className="space-y-3 rounded-2xl border border-border bg-surface p-4">
              <div className="grid gap-3 sm:grid-cols-4">
                <div className="rounded-xl border border-border bg-bg-subtle px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-muted">Processadas</p>
                  <p className="mt-1 text-lg font-semibold text-text">{importResult.processed}</p>
                </div>
                <div className="rounded-xl border border-success-200 bg-success-50 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-success-700">Importadas</p>
                  <p className="mt-1 text-lg font-semibold text-success-700">{importResult.imported}</p>
                </div>
                <div className="rounded-xl border border-info-200 bg-info-50 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-info-700">Atualizadas</p>
                  <p className="mt-1 text-lg font-semibold text-info-700">{importResult.updated}</p>
                </div>
                <div className="rounded-xl border border-danger-200 bg-danger-50 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-danger-700">Rejeitadas</p>
                  <p className="mt-1 text-lg font-semibold text-danger-700">{importResult.rejected}</p>
                </div>
              </div>
              {importResult.errors.length ? (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-text">Linhas com erro</p>
                  <div className="max-h-56 overflow-y-auto rounded-xl border border-border">
                    {importResult.errors.map((item, index) => (
                      <div className="border-b border-border px-3 py-2 text-sm last:border-b-0" key={`${item.row_number}-${index}`}>
                        <p className="font-medium text-text">
                          Linha {item.row_number}
                          {item.slug ? ` • ${item.slug}` : ""}
                        </p>
                        <p className="text-text-body">{item.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button onClick={onClose} type="button" variant="outline">
              Cancelar
            </Button>
            <Button disabled={importing} type="submit">
              {importing ? "Importando..." : "Importar planilha"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
