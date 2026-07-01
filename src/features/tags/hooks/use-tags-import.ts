import { useState } from "react";

import type { TagImportResult } from "@/features/tags/components/import-dialog";
import { apiRequest, downloadApiFile } from "@/lib/client-api";

type UseTagsImportOptions = {
  onImported: () => Promise<void>;
  onToast: (toast: { tone: "success" | "error"; message: string }) => void;
};

export function useTagsImport({ onImported, onToast }: UseTagsImportOptions) {
  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<TagImportResult | null>(null);

  async function downloadTemplate() {
    try {
      await downloadApiFile("/v1/tags/template", "tags_template.xlsx");
    } catch (error) {
      onToast({ tone: "error", message: (error as Error).message });
    }
  }

  async function submitImport(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!importFile) {
      onToast({ tone: "error", message: "Selecione uma planilha .xlsx para importar." });
      return;
    }
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", importFile);
      const result = await apiRequest<TagImportResult>("/v1/tags/import", {
        method: "POST",
        body: formData,
      });
      setImportResult(result);
      onToast({ tone: "success", message: "Importação concluída." });
      await onImported();
    } catch (error) {
      onToast({ tone: "error", message: (error as Error).message });
    } finally {
      setImporting(false);
    }
  }

  function onImportFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    setImportResult(null);
    setImportFile(event.target.files?.[0] || null);
  }

  function openImport() {
    setImportOpen(true);
  }

  function closeImport() {
    setImportOpen(false);
  }

  return {
    importOpen,
    importing,
    importResult,
    openImport,
    closeImport,
    downloadTemplate,
    submitImport,
    onImportFileChange,
  };
}
