import type { TagItem } from "@/features/explorer/types";

export type ColumnDictionaryGapTable = {
  schema_name: string;
  table_name: string;
  total_columns: number;
  documented_columns: number;
  pending_columns: number;
  documented_pct: number;
};

export type ColumnDictionarySummary = {
  total_columns: number;
  total_tables: number;
  total_schemas: number;
  documented_columns: number;
  documented_pct: number;
  comment_columns: number;
  comment_pct: number;
  existing_comment_columns: number;
  existing_comment_pct: number;
  pending_columns: number;
  top_gap_tables: ColumnDictionaryGapTable[];
};

export type ColumnDictionaryFilters = {
  datasources: string[];
  schemas: string[];
  tables: string[];
  data_types: string[];
};

export type ColumnDictionaryItem = {
  id: number;
  external_id: string | null;
  slug: string | null;
  datasource_name: string;
  schema_name: string;
  table_name: string;
  table_id: number;
  ordinal_position: number;
  name: string;
  data_type: string;
  udt_name: string | null;
  character_maximum_length: number | null;
  numeric_precision: number | null;
  numeric_scale: number | null;
  is_nullable: boolean;
  column_default: string | null;
  existing_comment: string | null;
  is_primary_key: boolean;
  description_source: string | null;
  description_manual: string | null;
  dictionary_description: string | null;
  dictionary_comment: string | null;
  documentation_status: "complete" | "partial" | "pending";
  documentation_status_label: string;
  documentation_pct: number;
  has_description: boolean;
  has_comment: boolean;
  has_existing_comment: boolean;
  tags: TagItem[];
  created_at: string;
  updated_at: string;
};

export type ColumnDictionaryDetail = ColumnDictionaryItem & {
  database_name: string;
  datasource_name: string;
  schema_description_source: string | null;
  schema_description_manual: string | null;
  table_description_source: string | null;
  table_description_manual: string | null;
  table_owner: string | null;
  table_lifecycle_status: string | null;
};

export type ColumnDictionaryPage = {
  total: number;
  page: number;
  page_size: number;
  items: ColumnDictionaryItem[];
  filters: ColumnDictionaryFilters;
};

export type ColumnDictionaryUpdate = {
  dictionary_description?: string | null;
  dictionary_comment?: string | null;
  existing_comment?: string | null;
};

export type ColumnDictionaryBulkUpdate = ColumnDictionaryUpdate & {
  column_ids: number[];
};

export type ColumnDictionaryBulkResult = {
  matched: number;
  updated: number;
  not_found: number[];
};

export type ColumnDictionaryResetResult = {
  deleted_columns: number;
};

export type ColumnDictionaryImportPreviewRow = {
  row_number: number;
  status: string;
  schema_name: string;
  table_name: string;
  column_name: string;
  slug: string | null;
  match_source?: string | null;
  message: string | null;
};

export type ColumnDictionaryImportError = {
  row_number: number;
  slug: string | null;
  message: string;
};

export type ColumnDictionaryImportCatalogGapTable = {
  schema_name: string;
  table_name: string;
  rows_count: number;
};

export type ColumnDictionaryImportPreview = {
  processed: number;
  matched: number;
  inserted: number;
  updated: number;
  ignored: number;
  rejected: number;
  duplicate_rows: number;
  missing_catalog_rows: number;
  catalog_sync_required: boolean;
  missing_catalog_schemas: string[];
  missing_catalog_tables: ColumnDictionaryImportCatalogGapTable[];
  rows: ColumnDictionaryImportPreviewRow[];
  errors: ColumnDictionaryImportError[];
};

export type ColumnDictionaryImportResult = {
  processed: number;
  matched: number;
  imported: number;
  updated: number;
  ignored: number;
  rejected: number;
  errors: ColumnDictionaryImportError[];
  touched_table_ids?: number[];
};
