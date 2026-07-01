import { useCallback, useRef, useState } from "react";

import { ApiError, apiRequest } from "@/lib/client-api";

import type { DQColumnMetric, DQIncidentSignals, DQLatest, DbType, TableDetailInfo } from "../types";

type SelectedTableContext = {
  datasourceId?: number;
  datasourceName: string;
  databaseName: string;
  schemaName: string;
  dbType: DbType;
};

type UseDQLatestOptions = {
  onWideScreenSelection?: () => void;
};

export function useDQLatest({ onWideScreenSelection }: UseDQLatestOptions = {}) {
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null);
  const [selectedTableName, setSelectedTableName] = useState("");
  const [selectedDatasourceId, setSelectedDatasourceId] = useState<number | null>(null);
  const [selectedDatasourceName, setSelectedDatasourceName] = useState("");
  const [selectedDatabaseName, setSelectedDatabaseName] = useState("");
  const [selectedSchemaName, setSelectedSchemaName] = useState("");
  const [selectedDbType, setSelectedDbType] = useState<DbType | null>(null);
  const [selectedTableInfo, setSelectedTableInfo] = useState<TableDetailInfo | null>(null);
  const [selectedColumn, setSelectedColumn] = useState<DQColumnMetric | null>(null);
  const [latest, setLatest] = useState<DQLatest | null>(null);
  const [incidentSignals, setIncidentSignals] = useState<DQIncidentSignals | null>(null);
  const [latestState, setLatestState] = useState<"idle" | "empty" | "error" | "ready">("idle");
  const [latestStateMessage, setLatestStateMessage] = useState("");
  const [incidentSignalsError, setIncidentSignalsError] = useState("");
  const [loadingLatest, setLoadingLatest] = useState(false);
  const latestRequestIdRef = useRef(0);

  const loadLatest = useCallback(
    async (tableId: number, tableName: string, context?: SelectedTableContext) => {
      const requestId = latestRequestIdRef.current + 1;
      latestRequestIdRef.current = requestId;
      setSelectedTableId(tableId);
      setSelectedTableName(tableName);
      if (context) {
        setSelectedDatasourceId(context.datasourceId ?? null);
        setSelectedDatasourceName(context.datasourceName);
        setSelectedDatabaseName(context.databaseName);
        setSelectedSchemaName(context.schemaName);
        setSelectedDbType(context.dbType);
      }
      setLoadingLatest(true);
      setLatest(null);
      setIncidentSignals(null);
      setLatestState("idle");
      setLatestStateMessage("");
      setIncidentSignalsError("");
      setSelectedColumn(null);
      setSelectedTableInfo(null);
      if (typeof window !== "undefined" && window.matchMedia("(min-width: 1280px)").matches) {
        onWideScreenSelection?.();
      }
      try {
        const [data, tableInfo, signals] = await Promise.all([
          apiRequest<DQLatest>(`/v1/dq/tables/id/${tableId}/latest?history_runs=14`),
          apiRequest<TableDetailInfo>(`/v1/catalog/tables/${tableId}`),
          apiRequest<DQIncidentSignals>(`/v1/dq/tables/id/${tableId}/incident-signals`).catch((error) => {
            setIncidentSignalsError((error as Error).message);
            return null;
          }),
        ]);
        if (latestRequestIdRef.current !== requestId) return;
        setLatest(data);
        setSelectedTableInfo(tableInfo);
        setIncidentSignals(signals);
        if (signals) setIncidentSignalsError("");
        setLatestState("ready");
      } catch (error) {
        if (latestRequestIdRef.current !== requestId) return;
        if (error instanceof ApiError && error.status === 404 && error.message === "No DQ metrics for table") {
          try {
            const tableInfo = await apiRequest<TableDetailInfo>(`/v1/catalog/tables/${tableId}`);
            if (latestRequestIdRef.current === requestId) {
              setSelectedTableInfo(tableInfo);
            }
          } catch {
            // keep DQ empty state even if table metadata cannot be loaded
          }
          try {
            const signals = await apiRequest<DQIncidentSignals>(`/v1/dq/tables/id/${tableId}/incident-signals`);
            if (latestRequestIdRef.current === requestId) {
              setIncidentSignals(signals);
            }
          } catch (signalsError) {
            if (latestRequestIdRef.current === requestId) {
              setIncidentSignals(null);
              setIncidentSignalsError((signalsError as Error).message);
            }
          }
          setLatestState("empty");
          setLatestStateMessage(
            "Ainda não existem métricas detalhadas de Data Quality para esta tabela. Execute o perfilamento para gerar score, tendência, completude e sinais de qualidade.",
          );
          return;
        }
        setLatestState("error");
        setLatestStateMessage("Não foi possível carregar os detalhes de Data Quality desta tabela agora. Tente novamente ou revise a conectividade com a origem.");
      } finally {
        if (latestRequestIdRef.current === requestId) {
          setLoadingLatest(false);
        }
      }
    },
    [onWideScreenSelection],
  );

  return {
    latest,
    latestState,
    latestStateMessage,
    incidentSignals,
    incidentSignalsError,
    loadLatest,
    loadingLatest,
    selectedColumn,
    selectedDatabaseName,
    selectedDatasourceName,
    selectedDatasourceId,
    selectedDbType,
    selectedSchemaName,
    selectedTableId,
    selectedTableInfo,
    selectedTableName,
    setSelectedColumn,
  };
}
