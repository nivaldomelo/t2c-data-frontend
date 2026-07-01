import { Download, FileSpreadsheet, Upload, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useModalDismiss } from "@/lib/use-modal-dismiss";

import type { ColumnDictionaryImportPreview, ColumnDictionaryImportResult } from "../types";

type DictionaryImportDialogProps = {
  open: boolean;
  file: File | null;
  preview: ColumnDictionaryImportPreview | null;
  previewLoading: boolean;
  importing: boolean;
  result: ColumnDictionaryImportResult | null;
  onClose: () => void;
  onFileChange: (file: File | null) => void;
  onDownloadTemplate: () => void;
  onDownloadExport: () => void;
  onPreview: () => void;
  onConfirmImport: () => void;
};

function MetricCard({ label, value, tone }: { label: string; value: number | string; tone: "neutral" | "success" | "warning" | "danger" | "accent" }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4 text-sm">
      <p className="text-muted">{label}</p>
      <div className="mt-1 flex items-center gap-2">
        <p className="text-xl font-semibold text-text">{value}</p>
        <Badge tone={tone}>{label}</Badge>
      </div>
    </div>
  );
}

function formatCatalogGapTableLabel(schemaName: string, tableName: string) {
  return `${schemaName}.${tableName}`;
}

export function DictionaryImportDialog({
  open,
  file,
  preview,
  previewLoading,
  importing,
  result,
  onClose,
  onFileChange,
  onDownloadTemplate,
  onDownloadExport,
  onPreview,
  onConfirmImport,
}: DictionaryImportDialogProps) {
  useModalDismiss({ open, onClose });
  if (!open) return null;

  const activePreview = preview ?? null;
  const activeResult = result ?? null;

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/40 px-4 py-6 backdrop-blur-sm sm:px-6"
      role="dialog"
    >
      <div className="my-auto flex w-full max-w-5xl flex-col overflow-hidden rounded-[28px] border border-border bg-surface shadow-2xl shadow-slate-950/20 max-h-[90dvh]">
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Excel oficial</p>
            <h3 className="mt-1 text-xl font-semibold text-text">Importar dicionário de dados</h3>
            <p className="mt-1 text-sm text-muted">
              A planilha principal é a aba <span className="font-medium text-text-body">Colunas_Importacao</span>, com README e Resumo para round-trip. O match prioriza ID, depois Slug, e cai no trio Schema + Tabela + Nome_Coluna quando necessário.
            </p>
          </div>
          <Button
            aria-label="Fechar"
            className="h-10 w-10 shrink-0 px-0"
            onClick={onClose}
            variant="ghost"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <div className="space-y-6">
            <div className="grid gap-3 md:grid-cols-3">
              <Button onClick={onDownloadTemplate} size="sm" variant="outline">
                <FileSpreadsheet className="h-4 w-4" />
                Baixar modelo
              </Button>
              <Button onClick={onDownloadExport} size="sm" variant="outline">
                <Download className="h-4 w-4" />
                Exportar atual
              </Button>
              <Button disabled={!file || previewLoading} onClick={onPreview} size="sm">
                <Upload className="h-4 w-4" />
                {previewLoading ? "Validando..." : "Validar planilha"}
              </Button>
            </div>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-text-body">Arquivo .xlsx</span>
              <input
                accept=".xlsx"
                className="block w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-text-body file:mr-4 file:rounded-full file:border-0 file:bg-info-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-info-700"
                onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
                type="file"
              />
            </label>

            <div className="rounded-3xl border border-border bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_55%,#eef6ff_100%)] p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-text">Preview de importação</p>
                  <p className="mt-1 text-sm text-muted">Confira o impacto da planilha antes de aplicar.</p>
                </div>
                <Button disabled={!file || importing || !activePreview} onClick={onConfirmImport} size="sm">
                  {importing ? "Importando..." : "Confirmar importação"}
                </Button>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
                <MetricCard label="Processadas" tone="neutral" value={activePreview?.processed ?? activeResult?.processed ?? 0} />
                <MetricCard label="Casadas" tone="neutral" value={activePreview?.matched ?? activeResult?.matched ?? 0} />
                <MetricCard label="Inseridas" tone="success" value={activePreview?.inserted ?? activeResult?.imported ?? 0} />
                <MetricCard label="Atualizadas" tone="accent" value={activePreview?.updated ?? activeResult?.updated ?? 0} />
                <MetricCard label="Ignoradas" tone="warning" value={activePreview?.ignored ?? activeResult?.ignored ?? 0} />
                <MetricCard label="Rejeitadas" tone="danger" value={activePreview?.rejected ?? activeResult?.rejected ?? 0} />
              </div>

              {activePreview ? (
                <div className="mt-5 rounded-2xl border border-border bg-bg-subtle p-4 text-sm">
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <MetricCard label="Fora do catálogo" tone="danger" value={activePreview.missing_catalog_rows} />
                    <MetricCard label="Linhas duplicadas" tone="warning" value={activePreview.duplicate_rows} />
                    <MetricCard label="Schemas fora do catálogo" tone="neutral" value={activePreview.missing_catalog_schemas.length} />
                    <MetricCard label="Tabelas fora do catálogo" tone="neutral" value={activePreview.missing_catalog_tables.length} />
                  </div>

                  {activePreview.catalog_sync_required ? (
                    <div className="mt-4 rounded-2xl border border-warning-200 bg-warning-50 p-4 text-warning-700">
                      <p className="font-semibold">Catálogo técnico fora de sincronia</p>
                      <p className="mt-1 text-warning-700">
                        A planilha contém schemas/tabelas que ainda não existem no catálogo técnico atual. Execute o scan do datasource antes de importar.
                      </p>

                      {activePreview.missing_catalog_schemas.length ? (
                        <div className="mt-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-warning-700">Schemas ausentes</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {activePreview.missing_catalog_schemas.map((schemaName) => (
                              <Badge key={schemaName} tone="warning">
                                {schemaName}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      {activePreview.missing_catalog_tables.length ? (
                        <div className="mt-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-warning-700">Tabelas ausentes</p>
                          <div className="mt-2 max-h-44 overflow-auto rounded-xl border border-warning-200 bg-surface">
                            {activePreview.missing_catalog_tables.map((table) => (
                              <div className="flex items-center justify-between gap-3 border-b border-warning-100 px-3 py-2 text-sm last:border-b-0" key={`${table.schema_name}.${table.table_name}`}>
                                <span className="font-medium text-text">{formatCatalogGapTableLabel(table.schema_name, table.table_name)}</span>
                                <Badge tone="danger">{table.rows_count} linhas</Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {activePreview?.rows?.length ? (
                <div className="mt-5 max-h-[34dvh] overflow-auto rounded-2xl border border-border bg-surface">
                  {activePreview.rows.map((row) => (
                    <div className="border-b border-border px-4 py-3 text-sm last:border-b-0" key={`${row.row_number}-${row.column_name}`}>
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium text-text">
                            Linha {row.row_number} • {row.schema_name}.{row.table_name}.{row.column_name}
                          </p>
                          <p className="mt-1 text-muted">{row.slug || "Sem slug informado"}</p>
                          {row.match_source ? <p className="mt-1 text-xs text-muted">Match por {row.match_source}</p> : null}
                        </div>
                        <Badge tone={row.status === "inserida" ? "success" : row.status === "atualizada" ? "accent" : row.status === "sem_alteracoes" ? "warning" : "danger"}>
                          {row.status}
                        </Badge>
                      </div>
                      {row.message ? <p className="mt-2 text-text-body">{row.message}</p> : null}
                    </div>
                  ))}
                </div>
              ) : null}

              {activePreview?.errors?.length ? (
                <div className="mt-5 rounded-2xl border border-danger-200 bg-surface">
                  <div className="border-b border-danger-100 px-4 py-3">
                    <p className="text-sm font-semibold text-text">Erros encontrados</p>
                  </div>
                  <div className="max-h-56 overflow-auto">
                    {activePreview.errors.map((error, index) => (
                      <div className="border-b border-border px-4 py-3 text-sm last:border-b-0" key={`${error.row_number}-${index}`}>
                        <p className="font-medium text-text">
                          Linha {error.row_number}
                          {error.slug ? <span className="ml-2 text-muted">({error.slug})</span> : null}
                        </p>
                        <p className="mt-1 text-text-body">{error.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {activeResult ? (
                <div className="mt-5 rounded-2xl border border-success-200 bg-success-50/70 p-4 text-sm text-success-700">
                  Importação concluída: {activeResult.imported} inseridas, {activeResult.updated} atualizadas, {activeResult.rejected} rejeitadas.
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="shrink-0 border-t border-border bg-surface px-6 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted">
              {file ? `Arquivo selecionado: ${file.name}` : "Selecione uma planilha para começar."}
            </p>
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <Button onClick={onClose} size="sm" variant="ghost">
                Fechar
              </Button>
              <Button disabled={!file || importing || !activePreview} onClick={onConfirmImport} size="sm">
                {importing ? "Importando..." : "Aplicar importação"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
