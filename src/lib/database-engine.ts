export function normalizeDbEngine(value: string | null | undefined): string {
  const normalized = (value ?? "").trim().toLowerCase();
  if (normalized === "postgresql") return "postgres";
  if (normalized === "sql_server" || normalized === "mssql") return "sqlserver";
  if (normalized === "mongo") return "mongodb";
  return normalized;
}

type DatabaseEngineMeta = {
  id: string;
  label: string;
  logoSrc: string;
  iconAlt: string;
  chipClassName: string;
};

const DEFAULT_CHIP_CLASS = "border-border bg-surface text-text-body";

const DATABASE_ENGINE_META: Record<string, DatabaseEngineMeta> = {
  postgres: {
    id: "postgres",
    label: "PostgreSQL",
    logoSrc: "/logos/databases/postgres.svg",
    iconAlt: "PostgreSQL",
    chipClassName: DEFAULT_CHIP_CLASS,
  },
  mysql: {
    id: "mysql",
    label: "MySQL",
    logoSrc: "/logos/databases/mysql.svg",
    iconAlt: "MySQL",
    chipClassName: DEFAULT_CHIP_CLASS,
  },
  sqlserver: {
    id: "sqlserver",
    label: "SQL Server",
    logoSrc: "/logos/databases/sqlserver.svg",
    iconAlt: "SQL Server",
    chipClassName: DEFAULT_CHIP_CLASS,
  },
  oracle: {
    id: "oracle",
    label: "Oracle",
    logoSrc: "/logos/databases/oracle.svg",
    iconAlt: "Oracle",
    chipClassName: DEFAULT_CHIP_CLASS,
  },
  mongodb: {
    id: "mongodb",
    label: "MongoDB",
    logoSrc: "/logos/databases/mongodb.svg",
    iconAlt: "MongoDB",
    chipClassName: DEFAULT_CHIP_CLASS,
  },
  snowflake: {
    id: "snowflake",
    label: "Snowflake",
    logoSrc: "/logos/databases/snowflake.svg",
    iconAlt: "Snowflake",
    chipClassName: DEFAULT_CHIP_CLASS,
  },
  bigquery: {
    id: "bigquery",
    label: "BigQuery",
    logoSrc: "/logos/databases/bigquery.svg",
    iconAlt: "BigQuery",
    chipClassName: DEFAULT_CHIP_CLASS,
  },
  redshift: {
    id: "redshift",
    label: "Redshift",
    logoSrc: "/logos/databases/redshift.svg",
    iconAlt: "Redshift",
    chipClassName: DEFAULT_CHIP_CLASS,
  },
  databricks: {
    id: "databricks",
    label: "Databricks",
    logoSrc: "/logos/databases/databricks.svg",
    iconAlt: "Databricks",
    chipClassName: DEFAULT_CHIP_CLASS,
  },
  mariadb: {
    id: "mariadb",
    label: "MariaDB",
    logoSrc: "/logos/databases/mariadb.svg",
    iconAlt: "MariaDB",
    chipClassName: DEFAULT_CHIP_CLASS,
  },
  sqlite: {
    id: "sqlite",
    label: "SQLite",
    logoSrc: "/logos/databases/sqlite.svg",
    iconAlt: "SQLite",
    chipClassName: DEFAULT_CHIP_CLASS,
  },
  other: {
    id: "other",
    label: "Database",
    logoSrc: "/logos/databases/generic.svg",
    iconAlt: "Database",
    chipClassName: DEFAULT_CHIP_CLASS,
  },
};

export function dbEngineMeta(type: string | null | undefined): DatabaseEngineMeta {
  const normalized = normalizeDbEngine(type);
  const meta = DATABASE_ENGINE_META[normalized];
  if (meta) return meta;
  return {
    ...DATABASE_ENGINE_META.other,
    label: normalized ? normalized.toUpperCase() : "Database",
  };
}

export function dbEngineLogoSrc(type: string | null | undefined): string {
  return dbEngineMeta(type).logoSrc;
}
