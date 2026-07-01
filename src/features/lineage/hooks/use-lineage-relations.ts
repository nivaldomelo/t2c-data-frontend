import { useCallback, useEffect, useState } from "react";

import { apiRequest } from "@/lib/client-api";
import type { LineageRelationListResponse } from "@/features/lineage/types";

export type LineageRelationFilters = {
  q: string;
  layer: string;
  asset_type: string;
  relation_type: string;
  origin: string;
  status: string;
  process: string;
  dashboard: string;
};

const DEFAULT_FILTERS: LineageRelationFilters = {
  q: "",
  layer: "",
  asset_type: "",
  relation_type: "",
  origin: "",
  status: "active",
  process: "",
  dashboard: "",
};

type UseLineageRelationsParams = {
  onError: (message: string) => void;
};

export function useLineageRelations({ onError }: UseLineageRelationsParams) {
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<LineageRelationFilters>(DEFAULT_FILTERS);
  const [list, setList] = useState<LineageRelationListResponse | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState<number | null>(null);

  const loadRelations = useCallback(
    async (nextFilters: LineageRelationFilters = filters, options: { page?: number; append?: boolean } = {}) => {
      const page = options.page ?? 1;
      const append = options.append ?? false;
      setLoading(true);
      try {
        const params = new URLSearchParams();
        Object.entries(nextFilters).forEach(([key, value]) => {
          if (value.trim()) params.set(key, value.trim());
        });
        params.set("page", String(page));
        params.set("page_size", "120");
        const response = await apiRequest<LineageRelationListResponse>(
          `/v1/lineage/edges/manual${params.toString() ? `?${params.toString()}` : ""}`,
        );
        setList((current) => {
          if (!append || !current) return response;
          return {
            ...response,
            items: [...current.items, ...response.items],
          };
        });
        const first =
          response.items.find((item) => ["table", "view"].includes(item.target_asset.asset_type)) ||
          response.items[0] ||
          null;
        setSelectedAssetId((current) => current ?? first?.target_asset.id ?? first?.source_asset.id ?? null);
      } catch (error) {
        onError((error as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [filters, onError],
  );

  // Initial load only. Filtering/pagination call loadRelations explicitly, so the
  // effect must NOT depend on loadRelations (it changes when filters change, which
  // would otherwise refetch on every keystroke / loop as list updates).
  useEffect(() => {
    void loadRelations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadMore = useCallback(async () => {
    if (!list?.has_more) return;
    await loadRelations(filters, { page: list.page + 1, append: true });
  }, [filters, list, loadRelations]);

  return {
    loading,
    filters,
    list,
    selectedAssetId,
    setFilters,
    setSelectedAssetId,
    loadRelations,
    loadMore,
    defaultFilters: DEFAULT_FILTERS,
  };
}
