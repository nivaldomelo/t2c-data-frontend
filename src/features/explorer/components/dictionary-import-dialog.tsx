import { Download, FileSpreadsheet, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useModalDismiss } from "@/lib/use-modal-dismiss";

import type { ColumnDictionaryImportResult } from "../types";

type ExplorerDictionaryImportDialogProps = {
  dictionaryImportFile: File | null;
  dictionaryImporting: boolean;
  dictionaryImportResult: ColumnDictionaryImportResult | null;
  onClose: () => void;
  onDownloadDictionary: (kind: "export" | "template") => void;
  onFileChange: (file: File | null) => void;
  onSubmit: () => void;
  open: boolean;
};

export function ExplorerDictionaryImportDialog({
  dictionaryImportFile,
  dictionaryImporting,
  dictionaryImportResult,
  onClose,
  onDownloadDictionary,
  onFileChange,
  onSubmit,
  open,
}: ExplorerDictionaryImportDialogProps) {
  useModalDismiss({ open, onClose });
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/40 px-4 py-6">
      <div
        aria-label="Importar dicionário de dados"
        aria-modal="true"
        className="my-auto flex w-full max-w-4xl max-h-[90dvh] flex-col overflow-hidden rounded-3xl border border-border bg-surface shadow-2xl"
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
          <div>
            <p className="text-lg font-semibold text-text">Importar dicionário de dados</p>
            <p className="mt-1 text-sm text-muted">
              Use a aba <span className="font-medium text-text-body">Colunas_Importacao</span> para enriquecer o Explorer com descrições e comentários por coluna.
            </p>
          </div>
          <Button aria-label="Fechar" onClick={onClose} size="sm" variant="ghost">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-bg-subtle/70 p-4 text-sm text-text-body">
              O cruzamento do dicionário prioriza <span className="font-medium text-text-body">ID</span>, depois <span className="font-medium text-text-body">Slug</span> e então <span className="font-medium text-text-body">Schema + Tabela + Nome_Coluna</span> como fallback de round-trip.
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={() => onDownloadDictionary("template")} size="sm" variant="outline">
                <FileSpreadsheet className="h-4 w-4" />
                Baixar modelo
              </Button>
              <Button onClick={() => onDownloadDictionary("export")} size="sm" variant="ghost">
                <Download className="h-4 w-4" />
                Exportar atual
              </Button>
            </div>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-text-body">Planilha .xlsx</span>
              <input
                accept=".xlsx"
                className="block w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-text-body file:mr-4 file:rounded-full file:border-0 file:bg-info-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-info-700"
                onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
                type="file"
              />
            </label>

            {dictionaryImportResult ? (
              <div className="space-y-3 rounded-2xl border border-border bg-bg-subtle/70 p-4">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
                  <div className="rounded-2xl border border-border bg-surface p-3 text-sm">
                    <p className="text-muted">Processadas</p>
                    <p className="mt-1 text-xl font-semibold text-text">{dictionaryImportResult.processed}</p>
                  </div>
                  <div className="rounded-2xl border border-border bg-surface p-3 text-sm">
                    <p className="text-muted">Casadas</p>
                    <p className="mt-1 text-xl font-semibold text-text">{dictionaryImportResult.matched}</p>
                  </div>
                  <div className="rounded-2xl border border-border bg-surface p-3 text-sm">
                    <p className="text-muted">Importadas</p>
                    <p className="mt-1 text-xl font-semibold text-success-700">{dictionaryImportResult.imported}</p>
                  </div>
                  <div className="rounded-2xl border border-border bg-surface p-3 text-sm">
                    <p className="text-muted">Atualizadas</p>
                    <p className="mt-1 text-xl font-semibold text-info-700">{dictionaryImportResult.updated}</p>
                  </div>
                  <div className="rounded-2xl border border-border bg-surface p-3 text-sm">
                    <p className="text-muted">Ignoradas</p>
                    <p className="mt-1 text-xl font-semibold text-warning-700">{dictionaryImportResult.ignored}</p>
                  </div>
                  <div className="rounded-2xl border border-border bg-surface p-3 text-sm">
                    <p className="text-muted">Rejeitadas</p>
                    <p className="mt-1 text-xl font-semibold text-danger-700">{dictionaryImportResult.rejected}</p>
                  </div>
                </div>
                {dictionaryImportResult.errors.length ? (
                  <div className="max-h-48 overflow-auto rounded-2xl border border-danger-200 bg-surface">
                    {dictionaryImportResult.errors.map((item, index) => (
                      <div className="border-b border-border px-4 py-3 text-sm last:border-b-0" key={`${item.row_number}-${index}`}>
                        <p className="font-medium text-text">
                          Linha {item.row_number}
                          {item.slug ? <span className="ml-2 text-muted">({item.slug})</span> : null}
                        </p>
                        <p className="mt-1 text-text-body">{item.message}</p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <div className="shrink-0 border-t border-border bg-surface px-6 py-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted">
              A importação atualiza descrições, comentários e metadados enriquecidos sem quebrar o Explorer quando o dicionário estiver ausente.
            </p>
            <div className="flex items-center gap-2">
              <Button onClick={onClose} size="sm" variant="ghost">
                Fechar
              </Button>
              <Button disabled={!dictionaryImportFile || dictionaryImporting} onClick={onSubmit} size="sm">
                {dictionaryImporting ? "Importando..." : "Importar dicionário"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
