import { Filter, Search } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type CertificationFiltersCardProps = {
  query: string;
  statusFilter: string;
  criticalityFilter: string;
  ownerFilter: string;
  schemaFilter: string;
  databaseFilter: string;
  ownerOptions: Array<{ id: number; name: string }>;
  schemaOptions: string[];
  databaseOptions: string[];
  statusOptions: Array<{ value: string; label: string }>;
  criticalityOptions: Array<{ value: string; label: string }>;
  onQueryChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onCriticalityFilterChange: (value: string) => void;
  onOwnerFilterChange: (value: string) => void;
  onSchemaFilterChange: (value: string) => void;
  onDatabaseFilterChange: (value: string) => void;
};

export function CertificationFiltersCard({
  query,
  statusFilter,
  criticalityFilter,
  ownerFilter,
  schemaFilter,
  databaseFilter,
  ownerOptions,
  schemaOptions,
  databaseOptions,
  statusOptions,
  criticalityOptions,
  onQueryChange,
  onStatusFilterChange,
  onCriticalityFilterChange,
  onOwnerFilterChange,
  onSchemaFilterChange,
  onDatabaseFilterChange,
}: CertificationFiltersCardProps) {
  return (
    <Card>
      <CardContent className="space-y-4 py-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-text-body">
            <Filter className="h-4 w-4 text-info-700" />
            Filtros operacionais
          </div>
          <p className="max-w-3xl text-xs leading-5 text-muted">
            Use os filtros para priorizar a fila por status, criticidade, owner, schema ou banco. Comece por ativos críticos,
            elegíveis ou próximos da certificação.
          </p>
        </div>
        <div className="grid gap-3 lg:grid-cols-[1.4fr_repeat(5,minmax(0,1fr))]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input
              className="pl-9"
              placeholder="Buscar por tabela, schema, banco, owner ou observação"
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
            />
          </div>
          <select className="h-10 rounded-xl border border-border bg-surface px-3 text-sm" value={statusFilter} onChange={(event) => onStatusFilterChange(event.target.value)}>
            <option value="">Todos os status</option>
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select className="h-10 rounded-xl border border-border bg-surface px-3 text-sm" value={criticalityFilter} onChange={(event) => onCriticalityFilterChange(event.target.value)}>
            {criticalityOptions.map((option) => (
              <option key={option.value || "none"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select className="h-10 rounded-xl border border-border bg-surface px-3 text-sm" value={ownerFilter} onChange={(event) => onOwnerFilterChange(event.target.value)}>
            <option value="">Todos os owners</option>
            {ownerOptions.map((option) => (
              <option key={option.id} value={String(option.id)}>
                {option.name}
              </option>
            ))}
          </select>
          <select className="h-10 rounded-xl border border-border bg-surface px-3 text-sm" value={schemaFilter} onChange={(event) => onSchemaFilterChange(event.target.value)}>
            <option value="">Todos os schemas</option>
            {schemaOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <select className="h-10 rounded-xl border border-border bg-surface px-3 text-sm" value={databaseFilter} onChange={(event) => onDatabaseFilterChange(event.target.value)}>
            <option value="">Todos os bancos</option>
            {databaseOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </CardContent>
    </Card>
  );
}
