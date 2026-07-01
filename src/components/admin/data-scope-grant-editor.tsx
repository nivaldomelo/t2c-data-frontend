import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AccessTargetOptions, DataScopeGrantDraft } from "@/features/admin/access-control-types";

type Props = {
  targets: AccessTargetOptions | null;
  value: DataScopeGrantDraft[];
  onChange: (value: DataScopeGrantDraft[]) => void;
  disabled?: boolean;
  title?: string;
  emptyLabel?: string;
};

function toNumber(value: string): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function DataScopeGrantEditor({
  targets,
  value,
  onChange,
  disabled = false,
  title = "Escopos de dados",
  emptyLabel = "Nenhum escopo configurado.",
}: Props) {
  const [effect, setEffect] = useState<"allow" | "deny">("allow");
  const [datasourceId, setDatasourceId] = useState("");
  const [schemaId, setSchemaId] = useState("");
  const [tableId, setTableId] = useState("");
  const [note, setNote] = useState("");

  const selectedDatasource = useMemo(
    () => targets?.datasources.find((item) => item.id === toNumber(datasourceId)) ?? null,
    [datasourceId, targets?.datasources],
  );
  const filteredSchemas = useMemo(
    () => (targets?.schemas ?? []).filter((item) => (selectedDatasource ? item.datasource_id === selectedDatasource.id : true)),
    [selectedDatasource, targets?.schemas],
  );
  const selectedSchema = useMemo(
    () => filteredSchemas.find((item) => item.id === toNumber(schemaId)) ?? null,
    [filteredSchemas, schemaId],
  );
  const filteredTables = useMemo(
    () => (targets?.tables ?? []).filter((item) => (selectedSchema ? item.schema_id === selectedSchema.id : selectedDatasource ? item.datasource_id === selectedDatasource.id : true)),
    [selectedDatasource, selectedSchema, targets?.tables],
  );

  function resetDraft() {
    setEffect("allow");
    setDatasourceId("");
    setSchemaId("");
    setTableId("");
    setNote("");
  }

  function addGrant() {
    const tableValue = toNumber(tableId);
    const schemaValue = toNumber(schemaId);
    const datasourceValue = toNumber(datasourceId);
    if (!tableValue && !schemaValue && !datasourceValue) return;
    const grant: DataScopeGrantDraft = {
      effect,
      datasource_id: tableValue ? null : schemaValue ? null : datasourceValue,
      schema_id: tableValue ? null : schemaValue,
      table_id: tableValue,
      note: note.trim() || null,
    };
    onChange([...value, grant]);
    resetDraft();
  }

  function removeGrant(index: number) {
    onChange(value.filter((_, currentIndex) => currentIndex !== index));
  }

  return (
    <div className="space-y-3 rounded-2xl border border-border/80 bg-bg-subtle/80 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-text">{title}</p>
          <p className="text-xs text-muted">Conceda fonte, schema ou objeto. Deny explícito sempre vence.</p>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Select disabled={disabled || !targets} value={datasourceId} onChange={(event) => {
          setDatasourceId(event.target.value);
          setSchemaId("");
          setTableId("");
        }}>
          <option value="">Fonte de dados</option>
          {targets?.datasources.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </Select>
        <Select disabled={disabled || !targets || !datasourceId} value={schemaId} onChange={(event) => {
          setSchemaId(event.target.value);
          setTableId("");
        }}>
          <option value="">Schema</option>
          {filteredSchemas.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </Select>
        <Select disabled={disabled || !targets || !schemaId} value={tableId} onChange={(event) => setTableId(event.target.value)}>
          <option value="">Objeto</option>
          {filteredTables.map((item) => (
            <option key={item.id} value={item.id}>
              {item.table_fqn}
            </option>
          ))}
        </Select>
        <Select disabled={disabled} value={effect} onChange={(event) => setEffect(event.target.value as "allow" | "deny")}>
          <option value="allow">Allow</option>
          <option value="deny">Deny</option>
        </Select>
      </div>
      <Textarea
        disabled={disabled}
        onChange={(event) => setNote(event.target.value)}
        placeholder="Observação opcional"
        value={note}
      />
      <div className="flex justify-end">
        <Button disabled={disabled || (!datasourceId && !schemaId && !tableId)} onClick={addGrant} type="button" variant="outline">
          <Plus className="mr-2 h-4 w-4" />
          Adicionar escopo
        </Button>
      </div>
      <div className="space-y-2">
        {value.length ? (
          value.map((grant, index) => (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/80 bg-surface px-3 py-2 shadow-sm" key={`${grant.effect}-${grant.datasource_id ?? grant.schema_id ?? grant.table_id ?? index}`}>
              <div className="min-w-0">
                <p className="text-sm font-medium text-text">
                  {grant.effect === "deny" ? "Negar" : "Permitir"}{" "}
                  {grant.table_id
                    ? `objeto ${targets?.tables.find((item) => item.id === grant.table_id)?.table_fqn ?? grant.table_id}`
                    : grant.schema_id
                      ? `schema ${targets?.schemas.find((item) => item.id === grant.schema_id)?.name ?? grant.schema_id}`
                      : `fonte ${targets?.datasources.find((item) => item.id === grant.datasource_id)?.name ?? grant.datasource_id}`}
                </p>
                {grant.note ? <p className="text-xs text-muted">{grant.note}</p> : null}
              </div>
              <Button disabled={disabled} onClick={() => removeGrant(index)} size="sm" variant="ghost">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted">{emptyLabel}</p>
        )}
      </div>
    </div>
  );
}
