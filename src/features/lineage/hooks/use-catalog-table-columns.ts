import { useEffect, useState } from "react";

import { apiRequest } from "@/lib/client-api";
import type { TableColumn } from "@/features/explorer/types";

type UseCatalogTableColumnsParams = {
  tableId: number | null;
  open?: boolean;
};

export function useCatalogTableColumns({ tableId, open = true }: UseCatalogTableColumnsParams) {
  const [loading, setLoading] = useState(false);
  const [columns, setColumns] = useState<TableColumn[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !tableId) {
      setColumns([]);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;

    async function loadColumns() {
      setLoading(true);
      try {
        const response = await apiRequest<TableColumn[]>(`/v1/catalog/tables/${tableId}/columns`);
        if (!cancelled) {
          setColumns(response);
          setError(null);
        }
      } catch (error) {
        if (!cancelled) {
          setColumns([]);
          setError((error as Error).message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadColumns();

    return () => {
      cancelled = true;
    };
  }, [open, tableId]);

  return {
    columns,
    error,
    loading,
  };
}
