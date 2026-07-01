import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useModalDismiss } from "@/lib/use-modal-dismiss";

type SchemaOption = {
  datasourceId: number;
  datasourceName: string;
  schemaName: string;
};

type DatasourceOption = {
  id: number;
  name: string;
};

type ProfilingRunModalProps = {
  open: boolean;
  runLoading: boolean;
  runScope: "table" | "schema";
  runExecutionEngine: "spark";
  runSchemaDatasourceId: number | "";
  runSchemaName: string;
  runSchemaLimit: number;
  runSchemaConcurrency: number;
  runSchemaIncludeCsv: string;
  runSchemaExcludeCsv: string;
  selectedTableId: number | null;
  selectedTableName: string;
  allSchemaOptions: SchemaOption[];
  datasourceOptions: DatasourceOption[];
  onClose: () => void;
  onRun: () => void;
  onScopeChange: (scope: "table" | "schema") => void;
  onExecutionEngineChange: (value: "spark") => void;
  onSchemaDatasourceIdChange: (value: number | "") => void;
  onSchemaNameChange: (value: string) => void;
  onSchemaLimitChange: (value: number) => void;
  onSchemaConcurrencyChange: (value: number) => void;
  onSchemaIncludeCsvChange: (value: string) => void;
  onSchemaExcludeCsvChange: (value: string) => void;
};

export function ProfilingRunModal({
  open,
  runLoading,
  runScope,
  runExecutionEngine,
  runSchemaDatasourceId,
  runSchemaName,
  runSchemaLimit,
  runSchemaConcurrency,
  runSchemaIncludeCsv,
  runSchemaExcludeCsv,
  selectedTableId,
  selectedTableName,
  allSchemaOptions,
  datasourceOptions,
  onClose,
  onRun,
  onScopeChange,
  onExecutionEngineChange,
  onSchemaDatasourceIdChange,
  onSchemaNameChange,
  onSchemaLimitChange,
  onSchemaConcurrencyChange,
  onSchemaIncludeCsvChange,
  onSchemaExcludeCsvChange,
}: ProfilingRunModalProps) {
  useModalDismiss({ open, onClose });
  if (!open) return null;

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-md"
      role="dialog"
    >
      <div className="absolute inset-x-0 top-10 mx-auto w-[95vw] max-w-2xl rounded-[28px] border border-border/80 bg-surface shadow-card">
          <div className="flex items-center justify-between border-b border-border/70 bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_58%,#eef6ff_100%)] px-4 py-3">
          <div>
            <h3 className="text-base font-semibold">Executar perfilamento</h3>
            <p className="text-xs text-text-body">Escolha o escopo e o motor para gerar uma nova leitura de qualidade.</p>
          </div>
          <button aria-label="Fechar" className="rounded-full border border-border/70 p-1 hover:border-border-strong hover:bg-bg-subtle" onClick={onClose} type="button">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-4 p-4">
          <div className="flex flex-wrap gap-3">
            <label className="inline-flex items-center gap-2 text-sm">
              <input checked={runScope === "table"} name="dq-scope" onChange={() => onScopeChange("table")} type="radio" />
              Tabela
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              <input checked={runScope === "schema"} name="dq-scope" onChange={() => onScopeChange("schema")} type="radio" />
              Schema inteiro
            </label>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Motor de execução</label>
            <input
              className="w-full rounded-md border border-border-strong bg-bg-subtle px-3 py-2 text-sm text-text-body"
              readOnly
              value={runExecutionEngine === "spark" ? "Spark cluster" : "Spark cluster"}
            />
            <p className="text-xs text-muted">A execução manual de profiling usa sempre o cluster Spark.</p>
          </div>

          {runScope === "table" ? (
            <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-3 text-sm">
              <p className="text-text-body">Tabela selecionada</p>
              <p className="font-medium">{selectedTableName || "Selecione uma tabela na árvore antes de executar."}</p>
              <p className="mt-1 text-xs text-muted">A execução será feita apenas sobre a tabela destacada no catálogo.</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-medium">Datasource (opcional)</label>
                <select
                  className="w-full rounded-md border border-border-strong px-3 py-2 text-sm"
                  value={runSchemaDatasourceId}
                  onChange={(e) => onSchemaDatasourceIdChange(e.target.value ? Number(e.target.value) : "")}
                >
                  <option value="">Todos (schema name)</option>
                  {datasourceOptions.map((ds) => (
                    <option key={ds.id} value={ds.id}>
                      {ds.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Schema</label>
                <input
                  className="w-full rounded-md border border-border-strong px-3 py-2 text-sm"
                  list="dq-schema-options"
                  placeholder="t2c_data"
                  value={runSchemaName}
                  onChange={(e) => onSchemaNameChange(e.target.value)}
                />
                <datalist id="dq-schema-options">
                  {allSchemaOptions
                    .filter((opt) => (runSchemaDatasourceId === "" ? true : opt.datasourceId === Number(runSchemaDatasourceId)))
                    .map((opt) => (
                      <option key={`${opt.datasourceId}:${opt.schemaName}`} value={opt.schemaName}>
                        {opt.datasourceName}
                      </option>
                    ))}
                </datalist>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Limit</label>
                <input
                  className="w-full rounded-md border border-border-strong px-3 py-2 text-sm"
                  min={1}
                  type="number"
                  value={runSchemaLimit}
                  onChange={(e) => onSchemaLimitChange(Math.max(1, Number(e.target.value || 200)))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Concurrency</label>
                <input
                  className="w-full rounded-md border border-border-strong px-3 py-2 text-sm"
                  min={1}
                  max={20}
                  type="number"
                  value={runSchemaConcurrency}
                  onChange={(e) => onSchemaConcurrencyChange(Math.min(20, Math.max(1, Number(e.target.value || 5))))}
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <label className="text-sm font-medium">Include tables (CSV opcional)</label>
                <textarea
                  className="min-h-20 w-full rounded-md border border-border-strong px-3 py-2 text-sm"
                  placeholder="clientes,pedidos,itens_pedido"
                  value={runSchemaIncludeCsv}
                  onChange={(e) => onSchemaIncludeCsvChange(e.target.value)}
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <label className="text-sm font-medium">Exclude tables (CSV opcional)</label>
                <textarea
                  className="min-h-20 w-full rounded-md border border-border-strong px-3 py-2 text-sm"
                  placeholder="tmp_staging,backup_table"
                  value={runSchemaExcludeCsv}
                  onChange={(e) => onSchemaExcludeCsvChange(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-border/70 bg-surface/95 px-4 py-3 backdrop-blur">
          <Button variant="outline" onClick={onClose} type="button">
            Cancelar
          </Button>
          <Button
            disabled={runLoading || (runScope === "table" ? !selectedTableId : !runSchemaName.trim())}
            onClick={onRun}
            type="button"
          >
            {runLoading ? "Solicitando..." : "Executar perfilamento"}
          </Button>
        </div>
      </div>
    </div>
  );
}
