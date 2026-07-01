import type { ChangeEvent, FormEvent } from "react";
import { useState } from "react";

import { apiRequest, downloadApiFile } from "@/lib/client-api";

type ImportErrorRow = {
  row_number: number;
  slug: string | null;
  message: string;
};

export type GlossaryImportResult = {
  processed: number;
  imported: number;
  updated: number;
  rejected: number;
  errors: ImportErrorRow[];
};

type UseGlossaryImportParams = {
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
  onImported: () => Promise<void>;
};

export function useGlossaryImport({ onError, onSuccess, onImported }: UseGlossaryImportParams) {
  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<GlossaryImportResult | null>(null);

  async function downloadTemplate() {
    try {
      await downloadApiFile("/v1/glossary/template", "glossario_template.xlsx");
    } catch (error) {
      onError((error as Error).message);
    }
  }

  async function submitImport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!importFile) {
      onError("Selecione uma planilha .xlsx para importar.");
      return;
    }
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", importFile);
      const result = await apiRequest<GlossaryImportResult>("/v1/glossary/import", {
        method: "POST",
        body: formData,
      });
      setImportResult(result);
      onSuccess("Importação concluída.");
      await onImported();
    } catch (error) {
      onError((error as Error).message);
    } finally {
      setImporting(false);
    }
  }

  function onImportFileChange(event: ChangeEvent<HTMLInputElement>) {
    setImportResult(null);
    setImportFile(event.target.files?.[0] || null);
  }

  function closeImport() {
    setImportOpen(false);
  }

  function openImport() {
    setImportOpen(true);
  }

  return {
    importOpen,
    importing,
    importFile,
    importResult,
    openImport,
    closeImport,
    downloadTemplate,
    submitImport,
    onImportFileChange,
  };
}
