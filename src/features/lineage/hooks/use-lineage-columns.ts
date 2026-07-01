import { useEffect, useRef, useState } from "react";

import { apiRequest } from "@/lib/client-api";
import { normalizePageItems, type PageResponse } from "@/lib/pagination";
import type { LineageColumnEdge } from "@/features/lineage/types";

type UseLineageColumnsParams = {
  assetId: number | null;
  tableId: number | null;
  refreshToken?: number;
  onError: (message: string) => void;
};

export function useLineageColumns({ assetId, tableId, refreshToken = 0, onError }: UseLineageColumnsParams) {
  const [loading, setLoading] = useState(false);
  const [columns, setColumns] = useState<LineageColumnEdge[]>([]);
  const [error, setError] = useState<string | null>(null);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    const identifier = assetId ?? tableId;
    if (!identifier) {
      setColumns([]);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;

    async function loadColumns() {
      setLoading(true);
      try {
        const query = assetId ? `asset_id=${assetId}` : `table_id=${tableId}`;
        const response = await apiRequest<LineageColumnEdge[] | PageResponse<LineageColumnEdge>>(`/v1/lineage/columns?${query}`);
        if (!cancelled) {
          setColumns(normalizePageItems(response));
          setError(null);
        }
      } catch (error) {
        if (!cancelled) {
          setColumns([]);
          setError((error as Error).message);
          onErrorRef.current((error as Error).message);
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
  }, [assetId, refreshToken, tableId]);

  return {
    columns,
    error,
    loading,
  };
}
