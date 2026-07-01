import { useCallback, useEffect, useRef, useState } from "react";

import { apiRequest } from "@/lib/client-api";

import type { DatasourceNode, TreeDatasource, TreeDatasourceChildren, TreeTablePage } from "../types";

type UseExplorerCatalogTreeOptions = {
  onError: (message: string) => void;
};

export function useExplorerCatalogTree({ onError }: UseExplorerCatalogTreeOptions) {
  const [datasources, setDatasources] = useState<DatasourceNode[]>([]);
  const datasourcesRef = useRef<DatasourceNode[]>([]);
  const loadingDatasourceIdsRef = useRef<Set<number>>(new Set());
  const loadingSchemaIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    datasourcesRef.current = datasources;
  }, [datasources]);

  useEffect(() => {
    void (async () => {
      try {
        const root = await apiRequest<TreeDatasource[]>("/v1/catalog/tree");
        setDatasources(
          root.map((datasource) => ({
            ...datasource,
            expanded: false,
            loading: false,
            database_id: null,
            database_name: datasource.database,
            schemas: null,
          })),
        );
      } catch (error) {
        onError((error as Error).message);
      }
    })();
  }, [onError]);

  const ensureDatasourceLoaded = useCallback(
    async (datasourceId: number): Promise<void> => {
      if (loadingDatasourceIdsRef.current.has(datasourceId)) return;

      const current = datasourcesRef.current.find((datasource) => datasource.id === datasourceId);
      if (!current) return;
      if (current.loading || current.schemas !== null) {
        return;
      }

      loadingDatasourceIdsRef.current.add(datasourceId);
      setDatasources((prev) =>
        prev.map((datasource) => {
          if (datasource.id !== datasourceId) return datasource;
          if (datasource.loading && datasource.expanded) return datasource;
          return { ...datasource, loading: true, expanded: true };
        }),
      );
      try {
        const children = await apiRequest<TreeDatasourceChildren>(`/v1/catalog/tree/datasources/${datasourceId}`);
        const shouldPreloadMongoCollections =
          current.db_type === "mongodb" && children.schemas.length === 1 && children.schemas[0]?.name === "default";
        const mongoSchemaId = shouldPreloadMongoCollections ? children.schemas[0]!.id : null;
        setDatasources((prev) =>
          prev.map((datasource) => {
            if (datasource.id !== datasourceId) return datasource;
            return {
              ...datasource,
              loading: false,
              expanded: true,
              database_id: children.database_id,
              database_name: children.database,
              schemas: children.schemas.map((schema) => ({
                ...schema,
                expanded: shouldPreloadMongoCollections && schema.id === mongoSchemaId,
                loading: shouldPreloadMongoCollections && schema.id === mongoSchemaId,
                tables: null,
                tablesPage: 0,
                tablesHasMore: false,
                tablesTotal: null,
                tablesLoadingMore: false,
              })),
            };
          }),
        );
        if (mongoSchemaId !== null) {
          const page = await apiRequest<TreeTablePage>(
            `/v1/catalog/tree/schemas/${mongoSchemaId}/tables/page?page=1&page_size=40`,
          );
          setDatasources((prev) =>
            prev.map((datasource) => {
              if (datasource.id !== datasourceId || !datasource.schemas) return datasource;
              return {
                ...datasource,
                schemas: datasource.schemas.map((schema) =>
                  schema.id === mongoSchemaId
                    ? {
                        ...schema,
                        loading: false,
                        expanded: true,
                        tables: page.items,
                        tablesPage: page.page,
                        tablesHasMore: page.has_more,
                        tablesTotal: page.total,
                        tablesLoadingMore: false,
                      }
                    : schema,
                ),
              };
            }),
          );
        }
      } catch (error) {
        setDatasources((prev) =>
          prev.map((datasource) => {
            if (datasource.id !== datasourceId) return datasource;
            if (!datasource.loading && datasource.schemas !== null) return datasource;
            return { ...datasource, loading: false };
          }),
        );
        onError((error as Error).message);
      } finally {
        loadingDatasourceIdsRef.current.delete(datasourceId);
      }
    },
    [onError],
  );

  const ensureSchemaLoaded = useCallback(
    async (datasourceId: number, schemaId: number): Promise<void> => {
      const loadKey = `${datasourceId}:${schemaId}`;
      if (loadingSchemaIdsRef.current.has(loadKey)) return;

      const datasource = datasourcesRef.current.find((item) => item.id === datasourceId);
      const schema = datasource?.schemas?.find((item) => item.id === schemaId);
      if (!schema) return;
      if (schema.loading || schema.tables !== null) {
        return;
      }

      loadingSchemaIdsRef.current.add(loadKey);
      setDatasources((prev) =>
        prev.map((item) => {
          if (item.id !== datasourceId || !item.schemas) return item;
          return {
            ...item,
            schemas: item.schemas.map((candidate) =>
              candidate.id === schemaId ? { ...candidate, loading: true, expanded: true } : candidate,
            ),
          };
        }),
      );

      try {
        const page = await apiRequest<TreeTablePage>(
          `/v1/catalog/tree/schemas/${schemaId}/tables/page?page=1&page_size=40`,
        );
        setDatasources((prev) =>
          prev.map((item) => {
            if (item.id !== datasourceId || !item.schemas) return item;
            return {
              ...item,
              schemas: item.schemas.map((candidate) =>
                candidate.id === schemaId
                  ? {
                      ...candidate,
                      loading: false,
                      expanded: true,
                      tables: page.items,
                      tablesPage: page.page,
                      tablesHasMore: page.has_more,
                      tablesTotal: page.total,
                      tablesLoadingMore: false,
                    }
                  : candidate,
              ),
            };
          }),
        );
      } catch (error) {
        setDatasources((prev) =>
          prev.map((item) => {
            if (item.id !== datasourceId || !item.schemas) return item;
            return {
              ...item,
              schemas: item.schemas.map((candidate) =>
                candidate.id === schemaId ? { ...candidate, loading: false } : candidate,
              ),
            };
          }),
        );
        onError((error as Error).message);
      } finally {
        loadingSchemaIdsRef.current.delete(loadKey);
      }
    },
    [onError],
  );

  const toggleDatasource = useCallback(
    async (datasourceId: number): Promise<void> => {
      const current = datasourcesRef.current.find((datasource) => datasource.id === datasourceId);
      if (!current) return;
      if (!current.expanded) {
        try {
          await ensureDatasourceLoaded(datasourceId);
        } catch (error) {
          onError((error as Error).message);
        }
        return;
      }
      setDatasources((prev) =>
        prev.map((datasource) => {
          if (datasource.id !== datasourceId || !datasource.expanded) return datasource;
          return { ...datasource, expanded: false };
        }),
      );
    },
    [ensureDatasourceLoaded, onError],
  );

  const toggleSchema = useCallback(
    async (datasourceId: number, schemaId: number): Promise<void> => {
      const datasource = datasourcesRef.current.find((item) => item.id === datasourceId);
      const schema = datasource?.schemas?.find((item) => item.id === schemaId);
      if (!schema) return;
      if (!schema.expanded) {
        try {
          await ensureSchemaLoaded(datasourceId, schemaId);
        } catch (error) {
          onError((error as Error).message);
        }
        return;
      }

      setDatasources((prev) =>
        prev.map((item) => {
          if (item.id !== datasourceId || !item.schemas) return item;
          return {
            ...item,
            schemas: item.schemas.map((candidate) =>
              candidate.id === schemaId ? { ...candidate, expanded: false } : candidate,
            ),
          };
        }),
      );
    },
    [ensureSchemaLoaded, onError],
  );

  const loadMoreSchemaTables = useCallback(
    async (datasourceId: number, schemaId: number): Promise<void> => {
      const datasource = datasourcesRef.current.find((item) => item.id === datasourceId);
      const schema = datasource?.schemas?.find((item) => item.id === schemaId);
      if (!schema || schema.tables === null || schema.tablesLoadingMore || !schema.tablesHasMore) return;
      const nextPage = schema.tablesPage + 1;
      setDatasources((prev) =>
        prev.map((item) => {
          if (item.id !== datasourceId || !item.schemas) return item;
          return {
            ...item,
            schemas: item.schemas.map((candidate) =>
              candidate.id === schemaId ? { ...candidate, tablesLoadingMore: true } : candidate,
            ),
          };
        }),
      );
      try {
        const page = await apiRequest<TreeTablePage>(
          `/v1/catalog/tree/schemas/${schemaId}/tables/page?page=${nextPage}&page_size=40`,
        );
        setDatasources((prev) =>
          prev.map((item) => {
            if (item.id !== datasourceId || !item.schemas) return item;
            return {
              ...item,
              schemas: item.schemas.map((candidate) =>
                candidate.id === schemaId
                  ? {
                      ...candidate,
                      tables: [...(candidate.tables || []), ...page.items],
                      tablesPage: page.page,
                      tablesHasMore: page.has_more,
                      tablesTotal: page.total,
                      tablesLoadingMore: false,
                    }
                  : candidate,
              ),
            };
          }),
        );
      } catch (error) {
        setDatasources((prev) =>
          prev.map((item) => {
            if (item.id !== datasourceId || !item.schemas) return item;
            return {
              ...item,
              schemas: item.schemas.map((candidate) =>
                candidate.id === schemaId ? { ...candidate, tablesLoadingMore: false } : candidate,
              ),
            };
          }),
        );
        onError((error as Error).message);
      }
    },
    [onError],
  );

  return {
    datasources,
    ensureDatasourceLoaded,
    ensureSchemaLoaded,
    loadMoreSchemaTables,
    toggleDatasource,
    toggleSchema,
  };
}
