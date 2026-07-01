export type SupportedDataSourceType =
  | "postgres"
  | "mysql"
  | "sqlserver"
  | "oracle"
  | "mongodb"
  | "snowflake"
  | "bigquery"
  | "redshift"
  | "databricks"
  | "mariadb"
  | "sqlite";
export type DataSourceGroup = "primary" | "more";
export type DataSourceTypeId = SupportedDataSourceType | "other";
export type DataSourceFieldKind = "text" | "number" | "password" | "textarea" | "select" | "checkbox";

export type DataSourceField = {
  key: string;
  label: string;
  kind: DataSourceFieldKind;
  placeholder?: string;
  required?: boolean;
  options?: Array<{ label: string; value: string }>;
  helperText?: string;
};

export type DataSourceOption = {
  id: DataSourceTypeId;
  label: string;
  group: DataSourceGroup;
  description: string;
  enabled: boolean;
  order: number;
  helperText?: string;
  connectionFields: DataSourceField[];
  secretFields: DataSourceField[];
};

export const DATASOURCE_GROUP_META: Record<
  DataSourceGroup,
  { title: string; description: string }
> = {
  primary: {
    title: "Principais",
    description: "Conectores priorizados para o fluxo atual do produto e para os casos mais comuns de catalogação.",
  },
  more: {
    title: "Mais fontes",
    description: "Estrutura preparada para expansão do catálogo com novos conectores e integrações futuras.",
  },
};

const DEFAULT_SCHEMA_FIELD: DataSourceField = {
  key: "default_schema",
  label: "Schema padrão",
  kind: "text",
  placeholder: "public",
};

const PASSWORD_FIELD: DataSourceField = {
  key: "password",
  label: "Senha",
  kind: "password",
  required: true,
};

export const DATASOURCE_OPTIONS: DataSourceOption[] = [
  {
    id: "postgres",
    label: "PostgreSQL",
    group: "primary",
    description: "Banco relacional open source",
    enabled: true,
    order: 1,
    connectionFields: [
      { key: "host", label: "Host", kind: "text", placeholder: "postgres_db", required: true },
      { key: "port", label: "Porta", kind: "number", placeholder: "5432" },
      { key: "database", label: "Database", kind: "text", placeholder: "andromeda", required: true },
      { key: "username", label: "Usuário", kind: "text", placeholder: "catalog_user", required: true },
      DEFAULT_SCHEMA_FIELD,
      {
        key: "ssl_mode",
        label: "SSL mode",
        kind: "select",
        options: [
          { label: "Prefer", value: "prefer" },
          { label: "Require", value: "require" },
          { label: "Disable", value: "disable" },
        ],
        helperText: "Use `require` quando o servidor exigir TLS.",
      },
    ],
    secretFields: [PASSWORD_FIELD],
  },
  {
    id: "mysql",
    label: "MySQL",
    group: "primary",
    description: "Banco relacional amplamente utilizado",
    enabled: true,
    order: 2,
    connectionFields: [
      { key: "host", label: "Host", kind: "text", placeholder: "mysql.internal", required: true },
      { key: "port", label: "Porta", kind: "number", placeholder: "3306" },
      { key: "database", label: "Database", kind: "text", placeholder: "analytics", required: true },
      { key: "username", label: "Usuário", kind: "text", placeholder: "catalog_user", required: true },
      {
        key: "ssl_mode",
        label: "SSL mode",
        kind: "select",
        options: [
          { label: "Prefer", value: "prefer" },
          { label: "Require", value: "require" },
          { label: "Disable", value: "disable" },
        ],
      },
    ],
    secretFields: [PASSWORD_FIELD],
  },
  {
    id: "sqlserver",
    label: "SQL Server",
    group: "primary",
    description: "Banco corporativo Microsoft",
    enabled: true,
    order: 3,
    connectionFields: [
      { key: "host", label: "Host", kind: "text", placeholder: "sqlserver.internal", required: true },
      { key: "port", label: "Porta", kind: "number", placeholder: "1433" },
      { key: "database", label: "Database", kind: "text", placeholder: "warehouse", required: true },
      { key: "username", label: "Usuário", kind: "text", placeholder: "sa", required: true },
      DEFAULT_SCHEMA_FIELD,
      { key: "driver", label: "Driver ODBC", kind: "text", placeholder: "ODBC Driver 18 for SQL Server" },
      {
        key: "encrypt",
        label: "Encrypt",
        kind: "select",
        options: [
          { label: "Yes", value: "yes" },
          { label: "No", value: "no" },
        ],
      },
      {
        key: "trust_server_certificate",
        label: "Trust server certificate",
        kind: "select",
        options: [
          { label: "Yes", value: "yes" },
          { label: "No", value: "no" },
        ],
      },
    ],
    secretFields: [PASSWORD_FIELD],
  },
  {
    id: "oracle",
    label: "Oracle",
    group: "primary",
    description: "Banco corporativo enterprise",
    enabled: true,
    order: 4,
    connectionFields: [
      { key: "host", label: "Host", kind: "text", placeholder: "oracle.internal", required: true },
      { key: "port", label: "Porta", kind: "number", placeholder: "1521" },
      { key: "service_name", label: "Service name", kind: "text", placeholder: "ORCLPDB1", required: true },
      { key: "username", label: "Usuário", kind: "text", placeholder: "catalog_user", required: true },
      DEFAULT_SCHEMA_FIELD,
    ],
    secretFields: [PASSWORD_FIELD],
  },
  {
    id: "mongodb",
    label: "MongoDB",
    group: "primary",
    description: "Banco orientado a documentos",
    enabled: true,
    order: 5,
    connectionFields: [
      { key: "database", label: "Database", kind: "text", placeholder: "catalog", required: true },
    ],
    secretFields: [
      {
        key: "uri",
        label: "Mongo URI",
        kind: "password",
        placeholder: "mongodb+srv://user:pass@cluster.mongodb.net/catalog",
        required: true,
      },
    ],
  },
  {
    id: "snowflake",
    label: "Snowflake",
    group: "primary",
    description: "Data warehouse em nuvem",
    enabled: true,
    order: 6,
    connectionFields: [
      { key: "account", label: "Account", kind: "text", placeholder: "xy12345.us-east-1", required: true },
      { key: "user", label: "User", kind: "text", placeholder: "catalog_user", required: true },
      { key: "warehouse", label: "Warehouse", kind: "text", placeholder: "COMPUTE_WH", required: true },
      { key: "database", label: "Database", kind: "text", placeholder: "ANALYTICS", required: true },
      { key: "schema", label: "Schema", kind: "text", placeholder: "PUBLIC" },
      { key: "role", label: "Role", kind: "text", placeholder: "SYSADMIN" },
    ],
    secretFields: [PASSWORD_FIELD],
  },
  {
    id: "bigquery",
    label: "BigQuery",
    group: "primary",
    description: "Analytics serverless do Google",
    enabled: true,
    order: 7,
    connectionFields: [
      { key: "project_id", label: "Project ID", kind: "text", placeholder: "my-gcp-project", required: true },
      { key: "dataset", label: "Dataset padrão", kind: "text", placeholder: "analytics" },
      { key: "use_adc", label: "Usar Application Default Credentials", kind: "checkbox" },
    ],
    secretFields: [
      {
        key: "service_account_json",
        label: "Service account JSON",
        kind: "textarea",
        placeholder: '{"type":"service_account", ...}',
        helperText: "Deixe em branco se for usar ADC.",
      },
    ],
  },
  {
    id: "redshift",
    label: "Redshift",
    group: "more",
    description: "Data warehouse da AWS",
    enabled: true,
    order: 8,
    connectionFields: [
      { key: "host", label: "Host", kind: "text", placeholder: "redshift-cluster.amazonaws.com", required: true },
      { key: "port", label: "Porta", kind: "number", placeholder: "5439" },
      { key: "database", label: "Database", kind: "text", placeholder: "dev", required: true },
      { key: "username", label: "Usuário", kind: "text", placeholder: "awsuser", required: true },
      DEFAULT_SCHEMA_FIELD,
    ],
    secretFields: [PASSWORD_FIELD],
  },
  {
    id: "databricks",
    label: "Databricks",
    group: "more",
    description: "Lakehouse e analytics",
    enabled: true,
    order: 9,
    connectionFields: [
      { key: "server_hostname", label: "Server hostname", kind: "text", placeholder: "adb-123456789.4.azuredatabricks.net", required: true },
      { key: "http_path", label: "HTTP path", kind: "text", placeholder: "/sql/1.0/warehouses/...", required: true },
      { key: "catalog", label: "Catalog", kind: "text", placeholder: "main" },
      { key: "schema", label: "Schema", kind: "text", placeholder: "default" },
    ],
    secretFields: [
      {
        key: "access_token",
        label: "Access token",
        kind: "password",
        required: true,
      },
    ],
  },
  {
    id: "mariadb",
    label: "MariaDB",
    group: "more",
    description: "Variante relacional do MySQL",
    enabled: true,
    order: 10,
    connectionFields: [
      { key: "host", label: "Host", kind: "text", placeholder: "mariadb.internal", required: true },
      { key: "port", label: "Porta", kind: "number", placeholder: "3306" },
      { key: "database", label: "Database", kind: "text", placeholder: "catalog", required: true },
      { key: "username", label: "Usuário", kind: "text", placeholder: "catalog_user", required: true },
      {
        key: "ssl_mode",
        label: "SSL mode",
        kind: "select",
        options: [
          { label: "Prefer", value: "prefer" },
          { label: "Require", value: "require" },
          { label: "Disable", value: "disable" },
        ],
      },
    ],
    secretFields: [PASSWORD_FIELD],
  },
  {
    id: "sqlite",
    label: "SQLite",
    group: "more",
    description: "Banco leve embarcado",
    enabled: true,
    order: 11,
    connectionFields: [
      { key: "file_path", label: "Caminho do arquivo", kind: "text", placeholder: "/data/catalog.db", required: true },
    ],
    secretFields: [],
  },
  {
    id: "other",
    label: "Outros",
    group: "more",
    description: "Fonte personalizada ou futura integração",
    enabled: false,
    order: 12,
    helperText: "Planejado",
    connectionFields: [],
    secretFields: [
      {
        key: "connection_string",
        label: "Connection string",
        kind: "textarea",
        placeholder: "driver://user:password@host:port/database",
      },
    ],
  },
];

export const DATASOURCE_OPTIONS_BY_GROUP: Record<DataSourceGroup, DataSourceOption[]> = {
  primary: DATASOURCE_OPTIONS.filter((option) => option.group === "primary").sort((a, b) => a.order - b.order),
  more: DATASOURCE_OPTIONS.filter((option) => option.group === "more").sort((a, b) => a.order - b.order),
};

export function isSupportedDataSourceType(value: DataSourceTypeId): value is SupportedDataSourceType {
  return value !== "other";
}

export function getDataSourceOption(type: string | null | undefined): DataSourceOption | undefined {
  return DATASOURCE_OPTIONS.find((option) => option.id === type);
}
