import { useCallback, useEffect, useMemo, useState } from "react";

import { apiRequest } from "@/lib/client-api";

import type { DatasourceNode, TreeChildren, TreeDatasource, TreeTable } from "../types";

type UseDQCatalogTreeOptions = {
  onError: (message: string) => void;
};

export function useDQCatalogTree({ onError }: UseDQCatalogTreeOptions) {
  const [nodes, setNodes] = useState<DatasourceNode[]>([]);

  useEffect(() => {
    void (async () => {
      try {
        const data = await apiRequest<TreeDatasource[]>("/v1/dq/tree");
        setNodes(
          data.map((d) => ({
            ...d,
            expanded: false,
            loading: false,
            database: d.database,
            schemas: null,
          })),
        );
      } catch (error) {
        onError((error as Error).message);
      }
    })();
  }, [onError]);

  const toggleDatasource = useCallback(
    async (index: number) => {
      setNodes((prev) => prev.map((node, i) => (i === index ? { ...node, expanded: !node.expanded } : node)));
      const current = nodes[index];
      if (!current || current.schemas) return;
      setNodes((prev) => prev.map((node, i) => (i === index ? { ...node, loading: true } : node)));
      try {
        const children = await apiRequest<TreeChildren>(`/v1/dq/tree/datasources/${current.id}`);
        setNodes((prev) =>
          prev.map((node, i) =>
            i === index
              ? {
                  ...node,
                  loading: false,
                  database: children.database,
                  schemas: children.schemas.map((s) => ({ ...s, expanded: false, tables: null, loading: false })),
                }
              : node,
          ),
        );
      } catch (error) {
        onError((error as Error).message);
        setNodes((prev) => prev.map((node, i) => (i === index ? { ...node, loading: false } : node)));
      }
    },
    [nodes, onError],
  );

  const toggleSchema = useCallback(
    async (datasourceIndex: number, schemaIndex: number) => {
      setNodes((prev) =>
        prev.map((node, i) =>
          i === datasourceIndex && node.schemas
            ? {
                ...node,
                schemas: node.schemas.map((s, j) => (j === schemaIndex ? { ...s, expanded: !s.expanded } : s)),
              }
            : node,
        ),
      );
      const datasource = nodes[datasourceIndex];
      const schema = datasource?.schemas?.[schemaIndex];
      if (!schema || schema.tables) return;
      setNodes((prev) =>
        prev.map((node, i) =>
          i === datasourceIndex && node.schemas
            ? { ...node, schemas: node.schemas.map((s, j) => (j === schemaIndex ? { ...s, loading: true } : s)) }
            : node,
        ),
      );
      try {
        const tables = await apiRequest<TreeTable[]>(`/v1/dq/tree/schemas/${schema.id}/tables`);
        setNodes((prev) =>
          prev.map((node, i) =>
            i === datasourceIndex && node.schemas
              ? {
                  ...node,
                  schemas: node.schemas.map((s, j) => (j === schemaIndex ? { ...s, loading: false, tables } : s)),
                }
              : node,
          ),
        );
      } catch (error) {
        onError((error as Error).message);
        setNodes((prev) =>
          prev.map((node, i) =>
            i === datasourceIndex && node.schemas
              ? { ...node, schemas: node.schemas.map((s, j) => (j === schemaIndex ? { ...s, loading: false } : s)) }
              : node,
          ),
        );
      }
    },
    [nodes, onError],
  );

  const allSchemaOptions = useMemo(() => {
    const out: { datasourceId: number; datasourceName: string; schemaName: string }[] = [];
    for (const datasource of nodes) {
      for (const schema of datasource.schemas ?? []) {
        out.push({
          datasourceId: datasource.id,
          datasourceName: datasource.name,
          schemaName: schema.name,
        });
      }
    }
    return out;
  }, [nodes]);

  return {
    allSchemaOptions,
    nodes,
    toggleDatasource,
    toggleSchema,
  };
}
