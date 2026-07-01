export type AccessDatasourceOption = {
  id: number;
  name: string;
  db_type: string;
  database: string;
};

export type AccessSchemaOption = {
  id: number;
  datasource_id: number;
  database_id: number;
  name: string;
};

export type AccessTableOption = {
  id: number;
  datasource_id: number;
  database_id: number;
  schema_id: number;
  name: string;
  table_type: string;
  table_fqn: string;
};

export type AccessTargetOptions = {
  datasources: AccessDatasourceOption[];
  schemas: AccessSchemaOption[];
  tables: AccessTableOption[];
};

export type DataScopeGrantDraft = {
  effect: "allow" | "deny";
  datasource_id?: number | null;
  schema_id?: number | null;
  table_id?: number | null;
  note?: string | null;
};

export type AccessGroupSummary = {
  id: number;
  name: string;
  description: string | null;
  is_active: boolean;
};

