import { useState } from "react";

import { apiRequest, downloadApiFile } from "@/lib/client-api";

import type { ColumnDictionaryImportResult, NoticeState } from "../types";

type UseExplorerDictionaryImportOptions = {
  onNotice: (notice: NoticeState) => void;
  reloadSelectedTableMetadata: () => Promise<void>;
};

export function useExplorerDictionaryImport({
  onNotice,
  reloadSelectedTableMetadata,
}: UseExplorerDictionaryImportOptions) {
  const [dictionaryImportOpen, setDictionaryImportOpen] = useState(false);
  const [dictionaryImportFile, setDictionaryImportFile] = useState<File | null>(null);
  const [dictionaryImporting, setDictionaryImporting] = useState(false);
  const [dictionaryImportResult, setDictionaryImportResult] = useState<ColumnDictionaryImportResult | null>(null);

  async function downloadDictionary(kind: "export" | "template") {
    try {
      await downloadApiFile(
        `/v1/catalog/column-dictionary/${kind}`,
        kind === "export" ? "dicionario_colunas_export.xlsx" : "dicionario_colunas_template.xlsx",
      );
    } catch (error) {
      onNotice({ tone: "error", message: (error as Error).message });
    }
  }

  async function submitDictionaryImport() {
    if (!dictionaryImportFile) return;
    setDictionaryImporting(true);
    setDictionaryImportResult(null);
    try {
      const formData = new FormData();
      formData.append("file", dictionaryImportFile);
      const result = await apiRequest<ColumnDictionaryImportResult>("/v1/catalog/column-dictionary/import", {
        method: "POST",
        body: formData,
      });
      setDictionaryImportResult(result);
      onNotice({
        tone: "success",
        message: `Dicionário processado: ${result.processed} processadas, ${result.matched} casadas, ${result.imported} importadas, ${result.updated} atualizadas, ${result.ignored} ignoradas.`,
      });
      await reloadSelectedTableMetadata();
    } catch (error) {
      onNotice({ tone: "error", message: (error as Error).message });
    } finally {
      setDictionaryImporting(false);
    }
  }

  function closeDictionaryImport() {
    setDictionaryImportOpen(false);
    setDictionaryImportFile(null);
    setDictionaryImportResult(null);
  }

  return {
    dictionaryImportFile,
    dictionaryImporting,
    dictionaryImportOpen,
    dictionaryImportResult,
    downloadDictionary,
    setDictionaryImportFile,
    setDictionaryImportOpen,
    submitDictionaryImport,
    closeDictionaryImport,
  };
}
