import { dynamic } from "@/lib/next-shims";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "@/lib/next-shims";
import { ArrowLeft, FileText, Layers3, ListTree, RefreshCw, Ruler, Sparkles, Table2 } from "lucide-react";
import { useRouter } from "@/lib/next-shims";

import { Banner } from "@/components/ui/banner";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/client-api";
import { cn } from "@/lib/cn";
import { normalizePageItems, type PageResponse } from "@/lib/pagination";
import { formatDateTime } from "@/features/integrations/utils";
import {
  getDataLakeTableDetail,
  getDataLakeTableDetailById,
  listDataLakeTableFiles,
  updateDataLakeTableFreshnessSla,
  updateDataLakeTableGovernance,
} from "@/features/integrations/sdk";
import type {
  DataLakeInventoryTableGovernanceInput,
  DataLakeInventoryTable,
  DataLakeTableDetail,
  DataLakeTableDetailError,
  DataLakeTableDetailSignal,
  DataLakeTableFilesPage,
} from "@/features/integrations/types";
import { useAuth } from "@/lib/auth";

const AssistantDrawer = dynamic(
  () => import("@/features/assistant/components/assistant-drawer").then((mod) => mod.AssistantDrawer),
  { ssr: false },
);

type DetailSection = "summary" | "governance" | "schema" | "files" | "partitions" | "quality" | "history";

type DataOwnerOption = {
  id: number;
  name: string;
  email: string;
  area: string | null;
  is_active: boolean;
};

type CatalogTableSearchSuggestion = {
  id: number;
  name: string;
  table_fqn: string;
  datasource_name: string;
  database_name: string;
  schema_name: string;
  table_type: string;
};

type DataLakeGovernanceForm = {
  data_owner_id: string;
  domain_name: string;
  description: string;
  classification: string;
  criticality: string;
  is_monitored: boolean;
};

const EMPTY_GOVERNANCE_FORM: DataLakeGovernanceForm = {
  data_owner_id: "",
  domain_name: "",
  description: "",
  classification: "",
  criticality: "",
  is_monitored: false,
};

const DATA_LAKE_SUMMARY_COPY = {
  overview: {
    fallbackTitle: "Visão geral estrutural",
    fallbackDescription: "Leitura resumida da tabela no Data Lake, com foco em estrutura, volume, atualização e sinais de atenção.",
  },
  health: {
    title: "Saúde da tabela",
    description: "Sinal agregado de leitura, metadados e consistência.",
    detail: "Use este bloco para entender se a tabela está pronta para consumo, possui ressalvas ou exige revisão antes do uso.",
  },
  quickView: {
    title: "Resumo de leitura",
    description: "Use esta leitura para separar o que está saudável, o que está parcial e o que precisa de atenção primeiro.",
  },
  structure: {
    title: "Estrutura e inventário",
    description: "Mostra como a tabela está organizada no Data Lake e quais arquivos sustentam a leitura atual.",
  },
  trustScore: {
    title: "Pontuação de qualidade",
    description: "Pontuação consolidada de freshness, integridade parquet, completude, schema e metadados.",
  },
  rowCount: {
    title: "Contagem de linhas",
    exact: "Contagem consolidada a partir da leitura dos arquivos.",
    estimated: "Contagem estimada, útil como referência de volume.",
    consolidated: "Contagem disponível, mas sem classificação de confiança explícita.",
    unavailable: "Não foi possível consolidar a contagem com segurança.",
  },
  files: {
    valid: "Arquivos lidos com sucesso",
    validDetail: "Arquivos que entraram na leitura usada para schema e volume.",
    inventory: "Arquivos parquet inventariados",
    inventoryDetail: "Parquet detectados na estrutura descoberta da tabela.",
  },
  freshness: {
    title: "Atualização",
    description: "Frescor dos dados frente ao SLA configurado.",
    detail: "Data e hora mais recente observada no inventário da tabela.",
  },
  alerts: {
    title: "Atualização e alertas",
    description: "Mostra a atualização da tabela e os sinais que pedem revisão antes do uso amplo.",
    empty: "A leitura atual não encontrou alertas estruturais relevantes.",
  },
  technical: {
    title: "Diagnóstico técnico",
    description: "Erros de leitura e notas preservadas para apoiar investigação e correção da origem.",
  },
} as const;

function formatBytes(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}

function toneClasses(tone: string): string {
  switch (tone) {
    case "success":
      return "border-success-200 bg-success-50 text-success-700";
    case "warning":
      return "border-warning-200 bg-warning-50 text-warning-700";
    case "danger":
      return "border-danger-200 bg-danger-50 text-danger-700";
    case "accent":
      return "border-info-200 bg-info-50 text-info-700";
    default:
      return "border-border bg-bg-subtle text-text-body";
  }
}

function sectionIcon(section: DetailSection) {
  switch (section) {
    case "governance":
      return Layers3;
    case "schema":
      return Table2;
    case "files":
      return FileText;
    case "partitions":
      return ListTree;
    case "quality":
      return Ruler;
    case "history":
      return Layers3;
    case "summary":
    default:
      return FileText;
  }
}

type SummaryTone = "neutral" | "accent" | "success" | "warning" | "danger";

type SummaryDiagnosticRow = {
  label: string;
  status: string;
  interpretation: string;
  tone: SummaryTone;
};

type SummaryStructureRow = {
  label: string;
  value: string;
  detail: string;
};

type SummaryIssue = {
  title: string;
  detail: string;
  tone: SummaryTone;
};

type SummaryTechnicalError = {
  category: string;
  label: string;
  detail: string;
  code: string | null;
  operation: string | null;
  statusCode: number | null;
  tone: SummaryTone;
  raw: string | null;
};

type SummaryView = {
  headline: string;
  headlineTone: SummaryTone;
  headlineDetail: string;
  badges: Array<{ label: string; tone: SummaryTone }>;
  diagnostics: SummaryDiagnosticRow[];
  structure: SummaryStructureRow[];
  reliabilityLabel: string;
  reliabilityTone: SummaryTone;
  reliabilityDetail: string;
  issues: SummaryIssue[];
  technicalErrors: SummaryTechnicalError[];
  technicalNotes: string[];
};

function summaryToneClasses(tone: SummaryTone): string {
  switch (tone) {
    case "success":
      return "border-success-200 bg-success-50 text-success-700";
    case "warning":
      return "border-warning-200 bg-warning-50 text-warning-700";
    case "danger":
      return "border-danger-200 bg-danger-50 text-danger-700";
    case "accent":
      return "border-info-200 bg-info-50 text-info-700";
    default:
      return "border-border bg-bg-subtle text-text-body";
  }
}

function trustScoreTone(score: number | null | undefined): SummaryTone {
  if (score == null) return "neutral";
  if (score >= 80) return "success";
  if (score >= 60) return "warning";
  return "danger";
}

function trustScoreLabel(score: number | null | undefined): string {
  if (score == null) return "Sem score";
  if (score >= 80) return "Confiável";
  if (score >= 60) return "Atenção";
  return "Crítico";
}

function trustScoreTextClass(score: number | null | undefined): string {
  switch (trustScoreTone(score)) {
    case "success":
      return "text-success-200";
    case "warning":
      return "text-warning-200";
    case "danger":
      return "text-danger-200";
    default:
      return "text-white";
  }
}

function normalizeStatusLabel(value: string): string {
  switch (value.toLowerCase()) {
    case "fresh":
      return "Atualizado";
    case "recent":
      return "Recente";
    case "stale":
      return "Atrasado";
    case "unknown":
      return "Sem janela";
    case "exact":
      return "Exata";
    case "estimated":
      return "Estimado";
    case "variant":
      return "Com divergência";
    case "unavailable":
      return "Indisponível";
    case "scanned":
      return "Descoberta";
    case "no_parquet":
      return "Sem parquet";
    default:
      return value;
  }
}

function statusTone(value: string): SummaryTone {
  switch (value.toLowerCase()) {
    case "fresh":
    case "exact":
    case "scanned":
      return "success";
    case "recent":
    case "estimated":
    case "variant":
      return "accent";
    case "stale":
    case "unavailable":
    case "no_parquet":
      return "warning";
    default:
      return "neutral";
  }
}

function formatReadabilityLabel(hasParquet: boolean, hasMetadata: boolean, schemaStatus: string, unreadableFiles: number, schemaVariants: number): { label: string; tone: SummaryTone; detail: string } {
  if (!hasParquet) {
    return {
      label: "Sem parquet inventariado",
      tone: "warning",
      detail: "Ainda não há parquet suficiente para consolidar schema, volume e integridade.",
    };
  }
  if (!hasMetadata) {
    return {
      label: "Leitura parcial",
      tone: "warning",
      detail: "Os parquet existem, mas a leitura leve não encontrou metadados suficientes para fechar a visão.",
    };
  }
  if (unreadableFiles > 0 || schemaStatus === "unavailable" || schemaVariants > 1) {
    return {
      label: "Tabela com atenção",
      tone: "accent",
      detail: "Há sinais de leitura parcial ou divergência estrutural. Revise os arquivos e confirme a origem antes de usar em processos críticos.",
    };
  }
  return {
    label: "Tabela confiável para consumo",
    tone: "success",
    detail: "A leitura estrutural e os metadados estão consistentes o suficiente para uso analítico inicial.",
  };
}

function parseLeadingCount(value: string | null | undefined): number | null {
  if (!value) return null;
  const match = value.match(/(\d+)/);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
}

function technicalErrorCategoryMeta(category: string): { label: string; tone: SummaryTone } {
  switch (category.toLowerCase()) {
    case "s3_access":
      return { label: "Acesso S3", tone: "warning" };
    case "s3_not_found":
      return { label: "Objeto ausente", tone: "warning" };
    case "s3_region":
      return { label: "Região / endpoint", tone: "warning" };
    case "parquet_read":
      return { label: "Leitura parquet", tone: "danger" };
    case "s3_unknown":
      return { label: "Falha S3", tone: "warning" };
    default:
      return { label: "Erro técnico", tone: "neutral" };
  }
}

function mapTechnicalErrorNote(note: string): SummaryTechnicalError {
  const [location, rest = ""] = note.split(": ", 2);
  const [categoryPart = "", operationPart = "", ...detailParts] = rest.split(": ");
  const detail = detailParts.length > 0 ? detailParts.join(": ") : rest || note;
  const meta = technicalErrorCategoryMeta(categoryPart || "unknown");
  return {
    category: categoryPart || "unknown",
    label: meta.label,
    detail,
    code: null,
    operation: operationPart || null,
    statusCode: null,
    tone: meta.tone,
    raw: location && rest ? note : null,
  };
}

function buildSummaryView(
  detail: DataLakeTableDetail,
  inventory: DataLakeInventoryTable,
  qualitySignals: DataLakeTableDetailSignal[],
  operationalSignals: DataLakeTableDetailSignal[],
): SummaryView {
  const freshnessStatus = detail.freshness_status.toLowerCase();
  const schemaStatus = detail.schema_status.toLowerCase();
  const hasParquet = inventory.parquet_files_count > 0;
  const hasMetadata = detail.row_count_source_files > 0;
  const rowCountAvailable = detail.row_count != null;
  const rowCountIsExact = rowCountAvailable && detail.row_count_confidence === "exact";
  const rowCountIsEstimated = rowCountAvailable && detail.row_count_confidence === "estimated";
  const unreadableSignal = operationalSignals.find((signal) => signal.key === "unreadable_files");
  const schemaDriftSignal = operationalSignals.find((signal) => signal.key === "schema_drift");
  const partitionGapSignal = operationalSignals.find((signal) => signal.key === "partition_gap");
  const noParquetMetadataSignal = qualitySignals.find((signal) => signal.key === "no_parquet_metadata");
  const unreadableCount = parseLeadingCount(unreadableSignal?.detail) ?? 0;
  const reliability = formatReadabilityLabel(hasParquet, hasMetadata, schemaStatus, unreadableCount, detail.schema_variants_count);

  const headlineTone: SummaryTone =
    freshnessStatus === "stale" || unreadableCount > 0 || (!hasParquet && inventory.status_scan === "no_parquet")
      ? "warning"
      : hasParquet && hasMetadata && schemaStatus === "exact" && !schemaDriftSignal
        ? "success"
        : "accent";

  const headline =
    freshnessStatus === "stale"
      ? "Tabela com atenção"
      : !hasParquet
        ? "Sem parquet inventariado"
        : !hasMetadata
          ? "Leitura parcial"
          : schemaStatus === "variant" || schemaDriftSignal
            ? "Estrutura com divergência"
            : schemaStatus === "exact"
              ? "Tabela confiável para consumo"
              : "Tabela utilizável com ressalvas";

  const headlineDetail =
    freshnessStatus === "stale"
      ? detail.freshness_detail ?? "A atualização saiu da janela esperada e pode afetar consumo, confiança e dependências analíticas."
      : !hasParquet
        ? "Ainda não há parquet suficiente para consolidar schema, volume e integridade da leitura."
        : !hasMetadata
          ? "Os parquet existem, mas a leitura leve não encontrou metadados suficientes para fechar a visão com segurança."
          : schemaStatus === "variant" || schemaDriftSignal
            ? "A amostragem encontrou variações entre arquivos, então a estrutura merece atenção antes de uso amplo."
            : "A leitura atual sugere uma tabela legível e consistente para consumo inicial.";

  const diagnostics: SummaryDiagnosticRow[] = [
    {
      label: "Schema",
      status: normalizeStatusLabel(schemaStatus),
      interpretation:
        schemaStatus === "unavailable"
          ? "Os arquivos parquet não puderam ser lidos o suficiente para consolidar colunas."
          : schemaStatus === "variant"
            ? "A amostragem encontrou diferenças entre os arquivos; isso pede revisão antes de promover o ativo."
            : schemaStatus === "estimated"
              ? "A estrutura foi inferida por amostragem parcial, então o resultado serve como referência."
              : "A estrutura foi consolidada com a leitura atual.",
      tone: schemaStatus === "exact" ? "success" : schemaStatus === "variant" ? "warning" : schemaStatus === "estimated" ? "accent" : "warning",
    },
    {
      label: "Contagem de linhas",
      status: rowCountIsExact ? "Exato" : rowCountIsEstimated ? "Estimado" : rowCountAvailable ? "Consolidado" : "Indisponível",
      interpretation: rowCountIsExact
        ? "A contagem de linhas foi consolidada com os arquivos lidos e pode ser usada como referência confiável."
        : rowCountIsEstimated
          ? "A volumetria foi estimada a partir da amostragem disponível, então deve ser lida como aproximação."
          : rowCountAvailable
            ? "A contagem foi obtida, mas ainda não recebeu classificação de confiança explícita."
            : "Não foi possível estimar a volumetria com segurança.",
      tone: rowCountIsExact ? "success" : rowCountIsEstimated ? "accent" : rowCountAvailable ? "warning" : "warning",
    },
    {
      label: "Partições",
      status: inventory.has_partitions ? "Detectadas" : "Não detectadas",
      interpretation: inventory.has_partitions
        ? `Padrão ${inventory.partition_pattern_detected || "key_value"} identificado na estrutura de pastas, o que ajuda leitura e performance.`
        : "Não foi identificado um padrão de partição consistente.",
      tone: inventory.has_partitions ? "success" : "neutral",
    },
    {
      label: "Atualização",
      status: normalizeStatusLabel(freshnessStatus),
      interpretation:
        detail.freshness_detail ??
        (freshnessStatus === "fresh"
          ? "Atualização dentro da janela esperada, indicando leitura recente."
          : freshnessStatus === "recent"
            ? "Atualização recente, muito próxima do SLA configurado."
            : freshnessStatus === "stale"
              ? "A atualização passou do SLA esperado e merece revisão."
              : "Não foi possível avaliar a janela de atualização."),
      tone: statusTone(freshnessStatus),
    },
    {
      label: "Integridade Parquet",
      status:
        unreadableCount > 0
          ? "Arquivos ilegíveis"
          : !hasMetadata && hasParquet
            ? "Sem metadados parquet"
            : hasParquet
              ? "Leitura estável"
              : "Sem parquet",
      interpretation:
        unreadableCount > 0
          ? `${unreadableCount} arquivo(s) não puderam ser lidos com segurança, o que reduz a confiança no consolidado.`
          : !hasMetadata && hasParquet
            ? "Os parquet existem, mas a leitura de metadados não foi suficiente para consolidar o ativo."
            : hasParquet
              ? "A leitura estrutural ocorreu sem falhas relevantes."
              : "Ainda não há parquet para avaliar integridade.",
      tone: unreadableCount > 0 || noParquetMetadataSignal ? "warning" : hasMetadata ? "success" : "neutral",
    },
  ];

  const structure: SummaryStructureRow[] = [
    {
      label: "Path base",
      value: inventory.path_base,
      detail: "Caminho raiz usado para localizar os arquivos dessa tabela.",
    },
    {
      label: "Bucket",
      value: detail.bucket,
      detail: `${detail.connection_name} • ${detail.region}`,
    },
    {
      label: "Camada",
      value: inventory.layer,
      detail: inventory.status_scan ? `Estado de descoberta: ${normalizeStatusLabel(inventory.status_scan)}` : "Sem status consolidado.",
    },
    {
      label: "Partição",
      value: inventory.has_partitions ? "Sim" : "Não",
      detail: inventory.partition_pattern_detected || "Nenhum padrão confirmado.",
    },
    {
      label: "Arquivos parquet",
      value: inventory.parquet_files_count.toString(),
      detail: `${detail.row_count_source_files} arquivo(s) entraram na leitura consolidada.`,
    },
    {
      label: "Última atualização",
      value: formatDateTime(detail.last_modified_at ?? inventory.last_modified_at),
      detail: inventory.status_scan === "scanned" ? "Atualização recente detectada." : "Sem atualização confirmada.",
    },
  ];

  const issues: SummaryIssue[] = [];
  if (freshnessStatus === "stale") {
    issues.push({
      title: "Freshness atrasado",
      detail: detail.freshness_detail ?? "A atualização saiu da janela esperada e pode afetar consumo e confiabilidade.",
      tone: "warning",
    });
  }
  if (unreadableCount > 0) {
    issues.push({
      title: "Arquivos ilegíveis",
      detail: `${unreadableCount} arquivo(s) não puderam ser lidos com segurança.`,
      tone: "danger",
    });
  }
  if (!hasMetadata && hasParquet) {
    issues.push({
      title: "Sem metadados parquet",
      detail: "A existência de parquet foi confirmada, mas a leitura dos metadados não consolidou schema ou volumetria.",
      tone: "warning",
    });
  }
  if (schemaDriftSignal) {
    issues.push({
      title: "Schema com divergência",
      detail: schemaDriftSignal.detail ?? "Foram identificadas variações entre os arquivos amostrados.",
      tone: "warning",
    });
  }
  if (partitionGapSignal) {
    issues.push({
      title: "Partições inconsistentes",
      detail: partitionGapSignal.detail ?? "O padrão de partição não foi aplicado de forma uniforme.",
      tone: "warning",
    });
  }

  const structuredTechnicalErrors = detail.technical_errors.map((error: DataLakeTableDetailError) => {
    const meta = technicalErrorCategoryMeta(error.category);
    return {
      category: error.category,
      label: meta.label,
      detail: error.detail ?? error.message ?? error.response_body ?? "Detalhe técnico não disponível.",
      code: error.code,
      operation: error.operation,
      statusCode: error.status_code,
      tone: meta.tone,
      raw: error.response_body ?? error.detail ?? error.message ?? null,
    } satisfies SummaryTechnicalError;
  });
  const technicalErrors = structuredTechnicalErrors.length
    ? structuredTechnicalErrors
    : Array.from(new Set(detail.technical_notes.map((note) => note.trim()).filter((note) => note.length > 0))).map(mapTechnicalErrorNote);
  const technicalNotes = detail.technical_notes.filter(
    (note) => !(detail.row_count == null && /tratada como exata/i.test(note)),
  );

  return {
    headline,
    headlineTone,
    headlineDetail,
    badges: [
      { label: inventory.has_partitions ? "Particionada" : "Sem partições", tone: inventory.has_partitions ? "accent" : "neutral" },
      { label: normalizeStatusLabel(freshnessStatus), tone: statusTone(freshnessStatus) },
      { label: reliability.label, tone: reliability.tone },
    ],
    diagnostics,
    structure,
    reliabilityLabel: reliability.label,
    reliabilityTone: reliability.tone,
    reliabilityDetail: reliability.detail,
    issues,
    technicalErrors,
    technicalNotes,
  };
}

export function DataLakeTableDetailPage({
  connectionId,
  tableId,
  embedded = false,
  backHref,
}: {
  connectionId?: number;
  tableId: number;
  embedded?: boolean;
  backHref?: string;
}) {
  const auth = useAuth();
  const router = useRouter();
  // Read (detail/files) is allowed for the /datalakes catalog browser (editor/viewer);
  // write actions (governance, SLA override, assistant attach) stay admin-only.
  const canView = auth.canAction("read", "dataLake");
  const canManage = auth.primaryRole === "admin";
  const [detail, setDetail] = useState<DataLakeTableDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [savingSla, setSavingSla] = useState(false);
  const [freshnessOverride, setFreshnessOverride] = useState("");
  const [section, setSection] = useState<DetailSection>("summary");
  const [ownerOptions, setOwnerOptions] = useState<DataOwnerOption[]>([]);
  const [governanceForm, setGovernanceForm] = useState<DataLakeGovernanceForm>(EMPTY_GOVERNANCE_FORM);
  const [savingGovernance, setSavingGovernance] = useState(false);
  const [governanceError, setGovernanceError] = useState("");
  const [filesPage, setFilesPage] = useState<DataLakeTableFilesPage | null>(null);
  const [filesLoading, setFilesLoading] = useState(false);
  const [filesError, setFilesError] = useState("");
  const [filesPageIndex, setFilesPageIndex] = useState(1);
  const [filesPageSize] = useState(12);
  const [assistantCatalogMatch, setAssistantCatalogMatch] = useState<CatalogTableSearchSuggestion | null>(null);
  const [assistantCatalogLoading, setAssistantCatalogLoading] = useState(false);
  const [assistantCatalogNotice, setAssistantCatalogNotice] = useState("");
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  useEffect(() => {
    if (!canView) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError("");
    void (async () => {
      try {
        const payload = connectionId ? await getDataLakeTableDetail(connectionId, tableId) : await getDataLakeTableDetailById(tableId);
        if (!cancelled) {
          setDetail(payload);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Não foi possível carregar o detalhe da tabela.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canView, connectionId, tableId]);

  useEffect(() => {
    if (!canManage) {
      setOwnerOptions([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const data = await apiRequest<DataOwnerOption[] | PageResponse<DataOwnerOption>>("/v1/data-owners?active=true");
        if (!cancelled) {
          setOwnerOptions(normalizePageItems(data).sort((a, b) => a.name.localeCompare(b.name)));
        }
      } catch {
        if (!cancelled) {
          setOwnerOptions([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canManage]);

  useEffect(() => {
    if (!canView || !detail) {
      setFilesPage(null);
      setFilesError("");
      setFilesLoading(false);
      return;
    }
    let cancelled = false;
    setFilesLoading(true);
    setFilesError("");
    void (async () => {
      try {
        const payload = await listDataLakeTableFiles(detail.inventory.id, {
          page: filesPageIndex,
          page_size: filesPageSize,
        });
        if (!cancelled) {
          setFilesPage(payload);
        }
      } catch (err) {
        if (!cancelled) {
          setFilesError(err instanceof Error ? err.message : "Não foi possível carregar os arquivos da tabela.");
        }
      } finally {
        if (!cancelled) {
          setFilesLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canView, detail, filesPageIndex, filesPageSize]);

  useEffect(() => {
    setAssistantOpen(false);
  }, [connectionId, tableId]);

  useEffect(() => {
    const nextInventory = detail?.inventory ?? null;
    if (!canManage || !detail || !nextInventory) {
      setAssistantCatalogMatch(null);
      setAssistantCatalogLoading(false);
      setAssistantCatalogNotice("");
      return;
    }

    const controller = new AbortController();
    let cancelled = false;
    setAssistantCatalogMatch(null);
    setAssistantCatalogLoading(true);
    setAssistantCatalogNotice("");

    void (async () => {
      try {
        const response = await apiRequest<CatalogTableSearchSuggestion[]>(
          `/v1/catalog/tables/search?q=${encodeURIComponent(nextInventory.table_name)}&limit=10`,
          { signal: controller.signal },
        );
        if (cancelled) return;

        const exactMatches = response.filter((item) => item.name.toLowerCase() === nextInventory.table_name.toLowerCase());
        const uniqueMatch = exactMatches.length === 1 ? exactMatches[0] : response.length === 1 && response[0].name.toLowerCase() === nextInventory.table_name.toLowerCase() ? response[0] : null;

        if (uniqueMatch) {
          setAssistantCatalogMatch(uniqueMatch);
          setAssistantCatalogNotice(`Correspondência no catálogo: ${uniqueMatch.table_fqn}`);
        } else if (exactMatches.length > 1) {
          setAssistantCatalogNotice(
            `Encontramos ${exactMatches.length} tabelas no catálogo com o mesmo nome. O assistente fica indisponível até a correspondência ser esclarecida.`,
          );
        } else if (response.length > 0) {
          setAssistantCatalogNotice("Encontramos resultados parecidos no catálogo, mas não uma correspondência única para o assistente.");
        } else {
          setAssistantCatalogNotice("Não encontramos uma tabela canônica com o mesmo nome no catálogo para acoplar o assistente.");
        }
      } catch (err) {
        if (cancelled) return;
        setAssistantCatalogNotice(err instanceof Error ? err.message : "Não foi possível resolver o ativo do catálogo para o assistente.");
      } finally {
        if (!cancelled) {
          setAssistantCatalogLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [canManage, detail]);

  const summarySignals = useMemo(() => detail?.quality_signals ?? [], [detail]);
  const operationalSignals = useMemo(() => detail?.operational_signals ?? [], [detail]);
  const qualityBreakdown = useMemo(() => detail?.quality_breakdown ?? [], [detail]);
  const historyItems = useMemo(() => detail?.history ?? [], [detail]);
  const sampleFiles = detail?.sample_files ?? [];
  const columns = detail?.columns ?? [];
  const partitions = detail?.partitions ?? [];
  const inventory = detail?.inventory ?? null;
  const resolvedConnectionId = detail?.connection_id ?? connectionId ?? null;
  const resolvedBackHref = backHref ?? (connectionId ? "/integrations/data-lake" : "/datalakes");
  const assistantAssetRef = assistantCatalogMatch ? `table:${assistantCatalogMatch.id}` : null;
  const currentOwner = useMemo(
    () => ownerOptions.find((owner) => owner.id === inventory?.data_owner_id) ?? null,
    [inventory?.data_owner_id, ownerOptions],
  );
  const summaryView = useMemo(
    () => (detail && inventory ? buildSummaryView(detail, inventory, summarySignals, operationalSignals) : null),
    [detail, inventory, operationalSignals, summarySignals],
  );
  useEffect(() => {
    if (!inventory) return;
    setFreshnessOverride(inventory.freshness_sla_hours_override?.toString() ?? "");
    setGovernanceForm({
      data_owner_id: inventory.data_owner_id?.toString() ?? "",
      domain_name: inventory.domain_name ?? "",
      description: inventory.description ?? "",
      classification: inventory.classification ?? "",
      criticality: inventory.criticality ?? "",
      is_monitored: inventory.is_monitored,
    });
  }, [inventory]);

  async function refreshDetail() {
    setRefreshing(true);
    setError("");
    try {
      const payload = resolvedConnectionId ? await getDataLakeTableDetail(resolvedConnectionId, tableId) : await getDataLakeTableDetailById(tableId);
      setDetail(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível atualizar o detalhe da tabela.");
    } finally {
      setRefreshing(false);
    }
  }

  async function saveFreshnessOverride() {
    if (!inventory || !resolvedConnectionId) return;
    setSavingSla(true);
    setError("");
    try {
      const trimmed = freshnessOverride.trim();
      const value = trimmed ? Number(trimmed) : null;
      await updateDataLakeTableFreshnessSla(resolvedConnectionId, tableId, {
        freshness_sla_hours_override: Number.isFinite(value as number) && (value as number) > 0 ? (value as number) : null,
      });
      const payload = await getDataLakeTableDetail(resolvedConnectionId, tableId);
      setDetail(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar o SLA de freshness.");
    } finally {
      setSavingSla(false);
    }
  }

  function buildGovernancePayload(formValue: DataLakeGovernanceForm): DataLakeInventoryTableGovernanceInput {
    return {
      data_owner_id: formValue.data_owner_id.trim() ? Number(formValue.data_owner_id) : null,
      domain_name: formValue.domain_name.trim() || null,
      description: formValue.description.trim() || null,
      classification: formValue.classification.trim() || null,
      criticality: formValue.criticality.trim() || null,
      is_monitored: formValue.is_monitored,
    };
  }

  async function saveGovernance(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!inventory || !resolvedConnectionId) return;
    setSavingGovernance(true);
    setGovernanceError("");
    try {
      await updateDataLakeTableGovernance(resolvedConnectionId, tableId, buildGovernancePayload(governanceForm));
      const payload = await getDataLakeTableDetail(resolvedConnectionId, tableId);
      setDetail(payload);
    } catch (err) {
      setGovernanceError(err instanceof Error ? err.message : "Não foi possível salvar a governança da tabela.");
    } finally {
      setSavingGovernance(false);
    }
  }

  if (!canView) {
    return (
        <EmptyState
          title="Acesso restrito"
          description="Você não tem acesso à visualização do Data Lake."
          action={
          <Button onClick={() => router.push(resolvedBackHref)} size="sm" variant="outline">
            Voltar
          </Button>
        }
      />
    );
  }

  if (loading && !detail) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 rounded-3xl" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton className="h-28 rounded-3xl" key={index} />
          ))}
        </div>
        <Skeleton className="h-96 rounded-3xl" />
      </div>
    );
  }

  if (error && !detail) {
    return (
        <EmptyState
          title="Falha ao carregar o detalhe"
          description={error}
          action={
          <Button onClick={() => router.push(resolvedBackHref)} size="sm" variant="outline">
            Voltar ao inventário
          </Button>
        }
      />
    );
  }

  if (!detail || !inventory) {
    return null;
  }

  const assistantDrawer =
    assistantOpen && assistantAssetRef ? (
      <AssistantDrawer
        assetLabel={`${inventory.table_name}${assistantCatalogMatch ? ` · ${assistantCatalogMatch.table_fqn}` : ""}`}
        assetRef={assistantAssetRef}
        onActionCompleted={() => void refreshDetail()}
        onClose={() => setAssistantOpen(false)}
        open={assistantOpen}
      />
    ) : null;

  const sectionOrder: Array<{ id: DetailSection; label: string }> = embedded
    ? [
        { id: "summary", label: "Resumo" },
        { id: "files", label: "Arquivos" },
        { id: "partitions", label: "Partições" },
        { id: "schema", label: "Estrutura" },
        { id: "quality", label: "Qualidade" },
        { id: "history", label: "Histórico" },
      ]
    : [
        { id: "summary", label: "Resumo" },
        { id: "governance", label: "Governança" },
        { id: "schema", label: "Schema" },
        { id: "files", label: "Arquivos" },
        { id: "partitions", label: "Partições" },
        { id: "quality", label: "Qualidade" },
        { id: "history", label: "Histórico" },
      ];

  if (embedded) {
    return (
      <>
        <div className="w-full">
          <Card className="flex w-full min-w-0 flex-col border-border/80 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
            <CardHeader className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-text-body">Details</h3>
                <div className="mt-3 flex flex-wrap items-center gap-3 rounded-2xl border border-border p-3 shadow-sm">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-surface shadow-sm">
                    <Table2 className="h-5 w-5 text-info-700" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-2xl font-semibold tracking-tight text-text">{inventory.table_name}</p>
                      <Badge className="border-border bg-surface px-2.5 py-0.5 text-xs font-semibold text-text-body">{inventory.layer}</Badge>
                      <Badge className="border-border bg-surface px-2.5 py-0.5 text-xs font-semibold text-text-body">
                        {inventory.has_partitions ? "Particionada" : "Sem partições"}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm text-text-body">
                      Conexão <span className="font-medium text-text-body">{detail.connection_name}</span> • Bucket{" "}
                      <span className="font-medium text-text-body">{detail.bucket}</span> • Camada{" "}
                      <span className="font-medium text-text-body">{inventory.layer}</span>
                    </p>
                    <p className="mt-1 text-sm text-text-body">path: {inventory.path_base}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full border border-border bg-surface px-2.5 py-1 text-text-body">
                      Parquet {inventory.parquet_files_count}
                    </span>
                    <span className="rounded-full border border-border bg-surface px-2.5 py-1 text-text-body">
                      Volume {formatBytes(inventory.size_total_bytes)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  {sectionOrder.map((item) => {
                    const Icon = sectionIcon(item.id);
                    const active = section === item.id;
                    return (
                      <button
                        className={cn(
                          "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition",
                          active ? "bg-slate-900 text-white shadow-sm" : "bg-bg-subtle text-text-body hover:bg-info-50 hover:text-info-700",
                        )}
                        key={item.id}
                        onClick={() => setSection(item.id)}
                        type="button"
                      >
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </button>
                    );
                  })}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    className="shadow-sm"
                    disabled={assistantCatalogLoading || !assistantAssetRef}
                    onClick={() => setAssistantOpen(true)}
                    size="md"
                    title={assistantCatalogNotice || "Abra a análise assistida desta tabela."}
                    variant="default"
                  >
                    <Sparkles className="h-4 w-4" />
                    Analisar com assistente
                  </Button>
                  <Button disabled={refreshing} onClick={() => void refreshDetail()} size="sm" variant="outline">
                    <RefreshCw className={cn("mr-2 h-4 w-4", refreshing ? "animate-spin" : "")} />
                    {refreshing ? "Atualizando..." : "Atualizar detalhe"}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="min-w-0 w-full space-y-6">
              {error ? <Banner description={error} icon={<Ruler className="h-4 w-4" />} tone="error" title="Não foi possível carregar o detalhe" /> : null}
              {renderSectionContent(detail, inventory)}
            </CardContent>
          </Card>
        </div>
        {assistantDrawer}
      </>
    );
  }

  return (
    <>
      <div className="space-y-8">
        <section className="overflow-hidden rounded-[2rem] border border-border bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white shadow-[0_24px_80px_rgba(15,23,42,0.22)]">
          <div className="flex flex-col gap-6 p-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Button className="w-fit border-white/15 bg-surface/10 text-white hover:bg-surface/15" onClick={() => router.push(resolvedBackHref)} size="sm" variant="outline">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Voltar ao inventário
                </Button>
                <Button
                  className="shadow-sm"
                  disabled={assistantCatalogLoading || !assistantAssetRef}
                  onClick={() => setAssistantOpen(true)}
                  size="md"
                  title={assistantCatalogNotice || "Abra a análise assistida desta tabela."}
                  variant="default"
                >
                  <Sparkles className="h-4 w-4" />
                  Analisar com assistente
                </Button>
              </div>
              <div className="space-y-3">
                <Badge className="w-fit border-white/15 bg-surface/10 text-white">{detail.connection_name}</Badge>
                <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{inventory.table_name}</h1>
                <p className="text-sm text-white/70 md:text-base">
                  {detail.connection_name} • {detail.bucket} • {inventory.layer}
                </p>
                <p className="max-w-3xl text-sm text-white/70 md:text-base">
                  Resumo estrutural da tabela descoberta no Data Lake. A visão abaixo prioriza schema, arquivos parquet, partições, contagem de linhas e sinais iniciais de atualização.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
              <div className="rounded-2xl border border-white/10 bg-surface/5 px-4 py-3 backdrop-blur">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">Camada</p>
                <p className="mt-1 text-lg font-semibold">{inventory.layer}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-surface/5 px-4 py-3 backdrop-blur">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">Arquivos parquet</p>
                    <p className="mt-1 text-lg font-semibold">{inventory.parquet_files_count}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-surface/5 px-4 py-3 backdrop-blur">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">Linhas</p>
                <p className="mt-1 text-lg font-semibold">{detail.row_count?.toLocaleString("pt-BR") ?? "N/D"}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-surface/5 px-4 py-3 backdrop-blur">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">Atualização</p>
                <p className="mt-1 text-lg font-semibold">{detail.freshness_status}</p>
                <p className="mt-1 text-xs text-white/55">{detail.freshness_age_hours?.toFixed(1) ?? "N/D"} h de idade</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-surface/5 px-4 py-3 backdrop-blur">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">Pontuação de qualidade</p>
                  <span className={cn("rounded-full border border-white/10 bg-surface/10 px-2 py-0.5 text-[11px] font-semibold", trustScoreTextClass(detail.quality_score))}>
                    {trustScoreLabel(detail.quality_score)}
                  </span>
                </div>
                <p className={cn("mt-1 text-lg font-semibold", trustScoreTextClass(detail.quality_score))}>{detail.quality_score?.toFixed(1) ?? "N/D"}</p>
                <p className="mt-1 text-xs text-white/55">Completude, estrutura, freshness, integridade parquet e metadados</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-surface/5 px-4 py-3 backdrop-blur">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">SLA de atualização</p>
                <p className="mt-1 text-lg font-semibold">{detail.freshness_sla_hours ?? "N/D"}h</p>
                <p className="mt-1 text-xs text-white/55">{inventory.freshness_sla_hours_override ? "Prazo definido por tabela" : "Prazo herdado da camada"}</p>
              </div>
            </div>
          </div>
        </section>

        {error ? <Banner description={error} icon={<Ruler className="h-4 w-4" />} tone="error" title="Não foi possível carregar o detalhe" /> : null}

        <div className="flex flex-wrap gap-2">
          {sectionOrder.map((item) => {
            const Icon = sectionIcon(item.id);
            const active = section === item.id;
            return (
              <button
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                  active ? "border-slate-900 bg-slate-900 text-white" : "border-border bg-surface text-text-body hover:border-border-strong hover:bg-bg-subtle",
                )}
                key={item.id}
                onClick={() => setSection(item.id)}
                type="button"
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
          <Button disabled={refreshing} onClick={() => void refreshDetail()} size="sm" variant="outline">
            <RefreshCw className={cn("mr-2 h-4 w-4", refreshing ? "animate-spin" : "")} />
            {refreshing ? "Atualizando..." : "Atualizar detalhe"}
          </Button>
        </div>

        <div className="space-y-6">{renderSectionContent(detail, inventory)}</div>
      </div>
      {assistantDrawer}
    </>
  );

  function renderSectionContent(detail: DataLakeTableDetail, inventory: DataLakeInventoryTable) {
    return (
      <>
      {section === "summary" ? (
        <div className="space-y-6">
          <Card className="rounded-3xl border-border shadow-[0_12px_36px_rgba(15,23,42,0.04)]">
            <CardContent className="space-y-5 p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={cn("border px-2.5 py-1 text-xs font-semibold", summaryToneClasses(summaryView?.headlineTone ?? "neutral"))}>
                      Status do ativo
                    </Badge>
                    {summaryView?.badges.map((badge) => (
                      <Badge className={cn("border px-2.5 py-1 text-xs font-medium", summaryToneClasses(badge.tone))} key={badge.label}>
                        {badge.label}
                      </Badge>
                    ))}
                  </div>
                  <h2 className="text-2xl font-semibold tracking-tight text-text">{summaryView?.headline ?? DATA_LAKE_SUMMARY_COPY.overview.fallbackTitle}</h2>
                  <p className="max-w-3xl text-sm text-text-body">{summaryView?.headlineDetail ?? DATA_LAKE_SUMMARY_COPY.overview.fallbackDescription}</p>
                </div>
                <div className="grid min-w-[240px] gap-3 sm:grid-cols-2 lg:grid-cols-1">
                  <div className="rounded-2xl border border-border bg-bg-subtle px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">{DATA_LAKE_SUMMARY_COPY.health.title}</p>
                    <p className={cn("mt-1 text-lg font-semibold", summaryView?.reliabilityTone === "success" ? "text-success-700" : summaryView?.reliabilityTone === "warning" ? "text-warning-700" : summaryView?.reliabilityTone === "danger" ? "text-danger-700" : "text-text")}>
                      {summaryView?.reliabilityLabel ?? "Indisponível"}
                    </p>
                    <p className="mt-1 text-xs text-muted">{DATA_LAKE_SUMMARY_COPY.health.description}</p>
                    <p className="mt-2 text-xs text-muted">{summaryView?.reliabilityDetail ?? "Ainda não foi possível consolidar a leitura."}</p>
                  </div>
                  <div className="rounded-2xl border border-border bg-bg-subtle px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">{DATA_LAKE_SUMMARY_COPY.freshness.title}</p>
                    <p className="mt-1 text-lg font-semibold text-text">{normalizeStatusLabel(detail.freshness_status)}</p>
                    <p className="mt-1 text-xs text-muted">{DATA_LAKE_SUMMARY_COPY.freshness.description}</p>
                    <p className="mt-2 text-xs text-muted">{detail.freshness_detail ?? "Janela de atualização não consolidada."}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)]">
            <Card className="rounded-3xl border-border shadow-[0_12px_36px_rgba(15,23,42,0.04)]">
              <CardHeader className="space-y-2">
                <h3 className="text-lg font-semibold tracking-tight text-text">{DATA_LAKE_SUMMARY_COPY.quickView.title}</h3>
                <p className="text-sm text-muted">{DATA_LAKE_SUMMARY_COPY.quickView.description}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                {summaryView?.diagnostics.map((row) => (
                  <div className="grid gap-3 rounded-2xl border border-border bg-bg-subtle p-4 lg:grid-cols-[132px_140px_minmax(0,1fr)]" key={row.label}>
                    <div className="text-sm font-medium text-text-body">{row.label}</div>
                    <div>
                      <Badge className={cn("border px-2.5 py-1 text-xs font-semibold", summaryToneClasses(row.tone))}>{row.status}</Badge>
                    </div>
                    <p className="text-sm leading-6 text-text-body">{row.interpretation}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-border shadow-[0_12px_36px_rgba(15,23,42,0.04)]">
              <CardHeader className="space-y-2">
                <h3 className="text-lg font-semibold tracking-tight text-text">{DATA_LAKE_SUMMARY_COPY.structure.title}</h3>
                <p className="text-sm text-muted">{DATA_LAKE_SUMMARY_COPY.structure.description}</p>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                {summaryView?.structure.map((row) => (
                  <div className="rounded-2xl border border-border bg-bg-subtle p-4" key={row.label}>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">{row.label}</p>
                    <p className="mt-2 break-words text-sm font-medium text-text">{row.value}</p>
                    <p className="mt-1 text-xs leading-5 text-muted">{row.detail}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
            <Card className="rounded-3xl border-border shadow-[0_12px_36px_rgba(15,23,42,0.04)]">
              <CardHeader className="space-y-2">
                <h3 className="text-lg font-semibold tracking-tight text-text">{DATA_LAKE_SUMMARY_COPY.health.title}</h3>
                <p className="text-sm text-muted">{DATA_LAKE_SUMMARY_COPY.health.detail}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-2xl border border-border bg-bg-subtle p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Leitura consolidada</p>
                  <p className={cn("mt-2 text-2xl font-semibold", summaryView?.reliabilityTone === "success" ? "text-success-700" : summaryView?.reliabilityTone === "warning" ? "text-warning-700" : summaryView?.reliabilityTone === "danger" ? "text-danger-700" : "text-text")}>
                    {summaryView?.reliabilityLabel ?? "Indisponível"}
                  </p>
                  <p className="mt-2 text-sm text-text-body">{summaryView?.reliabilityDetail ?? "Ainda não foi possível consolidar a leitura."}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-border bg-surface p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">{DATA_LAKE_SUMMARY_COPY.trustScore.title}</p>
                      <Badge className={cn("border px-2.5 py-1 text-xs font-semibold", summaryToneClasses(trustScoreTone(detail.quality_score)))}>
                        {trustScoreLabel(detail.quality_score)}
                      </Badge>
                    </div>
                    <p
                      className={cn(
                        "mt-2 text-2xl font-semibold",
                        trustScoreTone(detail.quality_score) === "success"
                          ? "text-success-700"
                          : trustScoreTone(detail.quality_score) === "warning"
                            ? "text-warning-700"
                            : trustScoreTone(detail.quality_score) === "danger"
                              ? "text-danger-700"
                              : "text-text",
                      )}
                    >
                      {detail.quality_score?.toFixed(1) ?? "N/D"}
                    </p>
                    <p className="mt-2 text-sm text-text-body">{DATA_LAKE_SUMMARY_COPY.trustScore.description}</p>
                  </div>
                  <div className="rounded-2xl border border-border bg-surface p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">{DATA_LAKE_SUMMARY_COPY.rowCount.title}</p>
                    <p className="mt-2 text-2xl font-semibold text-text">
                      {detail.row_count != null ? detail.row_count.toLocaleString("pt-BR") : "N/D"}
                    </p>
                    <p className="mt-2 text-sm text-text-body">
                      {detail.row_count != null
                        ? detail.row_count_confidence === "exact"
                          ? DATA_LAKE_SUMMARY_COPY.rowCount.exact
                          : detail.row_count_confidence === "estimated"
                            ? DATA_LAKE_SUMMARY_COPY.rowCount.estimated
                            : DATA_LAKE_SUMMARY_COPY.rowCount.consolidated
                        : DATA_LAKE_SUMMARY_COPY.rowCount.unavailable}
                    </p>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-border bg-surface p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">{DATA_LAKE_SUMMARY_COPY.files.valid}</p>
                    <p className="mt-2 text-2xl font-semibold text-text">{detail.row_count_source_files}</p>
                    <p className="mt-2 text-sm text-text-body">{DATA_LAKE_SUMMARY_COPY.files.validDetail}</p>
                  </div>
                  <div className="rounded-2xl border border-border bg-surface p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">{DATA_LAKE_SUMMARY_COPY.files.inventory}</p>
                    <p className="mt-2 text-2xl font-semibold text-text">{inventory.parquet_files_count}</p>
                    <p className="mt-2 text-sm text-text-body">{DATA_LAKE_SUMMARY_COPY.files.inventoryDetail}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-border shadow-[0_12px_36px_rgba(15,23,42,0.04)]">
              <CardHeader className="space-y-2">
                <h3 className="text-lg font-semibold tracking-tight text-text">{DATA_LAKE_SUMMARY_COPY.alerts.title}</h3>
                <p className="text-sm text-muted">{DATA_LAKE_SUMMARY_COPY.alerts.description}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-border bg-bg-subtle p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">{DATA_LAKE_SUMMARY_COPY.freshness.title}</p>
                    <p className="mt-2 text-2xl font-semibold text-text">{normalizeStatusLabel(detail.freshness_status)}</p>
                    <p className="mt-2 text-sm text-text-body">{DATA_LAKE_SUMMARY_COPY.freshness.description}</p>
                    <p className="mt-2 text-xs text-muted">{detail.freshness_detail ?? "Sem janela de atualização consolidada."}</p>
                  </div>
                  <div className="rounded-2xl border border-border bg-bg-subtle p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Última atualização</p>
                    <p className="mt-2 text-2xl font-semibold text-text">{formatDateTime(detail.last_modified_at ?? inventory.last_modified_at)}</p>
                    <p className="mt-2 text-sm text-text-body">{DATA_LAKE_SUMMARY_COPY.freshness.detail}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Problemas detectados</p>
                  {summaryView?.issues.length ? (
                    <div className="space-y-3">
                      {summaryView.issues.map((issue) => (
                        <div className={cn("rounded-2xl border px-4 py-3", toneClasses(issue.tone))} key={issue.title}>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold">{issue.title}</p>
                            <Badge className={cn("border px-2 py-0.5 text-[11px] font-semibold", summaryToneClasses(issue.tone))}>
                              {issue.tone === "danger" ? "Crítico" : issue.tone === "warning" ? "Atenção" : "Info"}
                            </Badge>
                          </div>
                          <p className="mt-1 text-sm opacity-90">{issue.detail}</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Button className="h-8 bg-surface/80 px-3 text-xs" onClick={() => setSection("files")} size="sm" variant="outline">
                              Ver arquivos
                            </Button>
                            <Button className="h-8 bg-surface/80 px-3 text-xs" onClick={() => setSection("quality")} size="sm" variant="outline">
                              Abrir qualidade
                            </Button>
                            <Button
                              className="h-8 bg-surface/80 px-3 text-xs"
                              disabled={refreshing}
                              onClick={() => void refreshDetail()}
                              size="sm"
                              variant="outline"
                            >
                              {refreshing ? "Revalidando..." : "Revalidar leitura"}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-success-200 bg-success-50 px-4 py-3 text-sm text-success-700">
                      {DATA_LAKE_SUMMARY_COPY.alerts.empty}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {summaryView?.technicalErrors.length || summaryView?.technicalNotes.length ? (
            <Card className="rounded-3xl border-border shadow-[0_12px_36px_rgba(15,23,42,0.04)]">
              <CardHeader className="space-y-2">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold tracking-tight text-text">{DATA_LAKE_SUMMARY_COPY.technical.title}</h3>
                    <p className="text-sm text-muted">{DATA_LAKE_SUMMARY_COPY.technical.description}</p>
                  </div>
                  <Button onClick={() => setShowTechnicalDetails((current) => !current)} size="sm" variant="ghost">
                    {showTechnicalDetails ? "Ocultar detalhe técnico" : "Ver detalhe técnico"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {summaryView.technicalErrors.length ? (
                    <div className="space-y-3">
                      {summaryView.technicalErrors.map((error, index) => (
                        <div className="rounded-2xl border border-border bg-bg-subtle px-4 py-3" key={`${error.category}-${error.operation ?? "op"}-${error.code ?? "code"}-${index}`}>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge className={cn("rounded-full border px-2.5 py-1 text-xs font-medium", summaryToneClasses(error.tone))}>
                              {error.label}
                            </Badge>
                            <span className="text-xs font-medium uppercase tracking-[0.16em] text-muted">
                              {error.operation ?? "operação não informada"}
                            </span>
                            {error.statusCode ? (
                              <span className="text-xs text-muted">HTTP {error.statusCode}</span>
                            ) : null}
                            {error.code ? <span className="text-xs text-muted">{error.code}</span> : null}
                          </div>
                          <p className="mt-2 break-words text-sm text-text-body">{error.detail}</p>
                          {showTechnicalDetails && error.raw && error.raw !== error.detail ? (
                            <p className="mt-2 break-words text-xs text-muted">{error.raw}</p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {summaryView.technicalNotes.length ? (
                    <div className="rounded-2xl border border-border bg-surface px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Notas de apoio</p>
                      <ul className="mt-3 space-y-2 text-sm text-text-body">
                        {summaryView.technicalNotes.map((note) => (
                          <li className="flex gap-2" key={note}>
                            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-slate-400" />
                            <span className="break-words">{note}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ) : null}

        </div>
      ) : null}

      {section === "governance" ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
          <Card className="rounded-3xl border-border shadow-[0_12px_36px_rgba(15,23,42,0.04)]">
            <CardHeader className="space-y-2">
              <h2 className="text-xl font-semibold tracking-tight text-text">Governança mínima</h2>
              <p className="text-sm text-muted">
                Vincule owner, domínio e classificações básicas. Esta camada prepara a tabela para catálogo e stewardship futuro.
              </p>
            </CardHeader>
            <CardContent>
              {governanceError ? <div className="mb-4 rounded-2xl border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700">{governanceError}</div> : null}
              <form className="space-y-4" onSubmit={saveGovernance}>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium text-text-body" htmlFor="datalake-governance-owner">
                      Data owner
                    </label>
                    <Select
                      id="datalake-governance-owner"
                      onChange={(event) => setGovernanceForm((current) => ({ ...current, data_owner_id: event.target.value }))}
                      value={governanceForm.data_owner_id}
                    >
                      <option value="">Sem owner vinculado</option>
                      {ownerOptions.map((owner) => (
                        <option key={owner.id} value={owner.id}>
                          {owner.name} · {owner.email}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text-body" htmlFor="datalake-governance-domain">
                      Domínio
                    </label>
                    <Input
                      id="datalake-governance-domain"
                      onChange={(event) => setGovernanceForm((current) => ({ ...current, domain_name: event.target.value }))}
                      placeholder="Financeiro, Comercial..."
                      value={governanceForm.domain_name}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text-body" htmlFor="datalake-governance-classification">
                      Classificação
                    </label>
                    <Input
                      id="datalake-governance-classification"
                      onChange={(event) => setGovernanceForm((current) => ({ ...current, classification: event.target.value }))}
                      placeholder="Interna, restrita, sensível..."
                      value={governanceForm.classification}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text-body" htmlFor="datalake-governance-criticality">
                      Criticidade
                    </label>
                    <Input
                      id="datalake-governance-criticality"
                      onChange={(event) => setGovernanceForm((current) => ({ ...current, criticality: event.target.value }))}
                      placeholder="Alta, média, baixa"
                      value={governanceForm.criticality}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium text-text-body" htmlFor="datalake-governance-description">
                      Descrição
                    </label>
                    <Textarea
                      id="datalake-governance-description"
                      onChange={(event) => setGovernanceForm((current) => ({ ...current, description: event.target.value }))}
                      placeholder="Descreva o papel funcional desta tabela no Data Lake."
                      rows={5}
                      value={governanceForm.description}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-text-body">
                      <input
                        checked={governanceForm.is_monitored}
                        className="h-4 w-4 rounded border-border-strong text-brand-600 focus:ring-brand-500"
                        onChange={(event) => setGovernanceForm((current) => ({ ...current, is_monitored: event.target.checked }))}
                        type="checkbox"
                      />
                      Marcar como monitorada
                    </label>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <Button disabled={savingGovernance} size="sm" type="submit">
                    {savingGovernance ? "Salvando..." : "Salvar governança"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-border shadow-[0_12px_36px_rgba(15,23,42,0.04)]">
            <CardHeader className="space-y-2">
              <h2 className="text-xl font-semibold tracking-tight text-text">Estado para catálogo</h2>
              <p className="text-sm text-muted">Sinais que indicam se a tabela já tem os mínimos para entrar em governança e catálogo.</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-2xl border border-border bg-bg-subtle p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Estado</p>
                <p className="mt-2 text-lg font-semibold text-text">{inventory.governance_status}</p>
                <p className="mt-1 text-sm text-text-body">{inventory.catalog_ready ? "Pronta para entrar no catálogo." : "Ainda depende de informações mínimas de governança."}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-border bg-bg-subtle p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Owner</p>
                  <p className="mt-2 text-sm font-medium text-text">
                    {currentOwner ? `${currentOwner.name} · ${currentOwner.email}` : inventory.data_owner_id ? `ID ${inventory.data_owner_id}` : "Sem owner"}
                  </p>
                </div>
                <div className="rounded-2xl border border-border bg-bg-subtle p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Monitoramento</p>
                  <p className="mt-2 text-sm font-medium text-text">{inventory.is_monitored ? "Sim" : "Não"}</p>
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-bg-subtle p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Última atualização</p>
                <p className="mt-2 text-sm font-medium text-text">{formatDateTime(inventory.governance_last_updated_at)}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {section === "schema" ? (
        <Card className="rounded-3xl border-border shadow-[0_12px_36px_rgba(15,23,42,0.04)]">
          <CardHeader className="space-y-2">
            <h2 className="text-xl font-semibold tracking-tight text-text">Schema inferido</h2>
            <p className="text-sm text-muted">Colunas e tipos lidos a partir dos arquivos parquet amostrados.</p>
          </CardHeader>
          <CardContent className="overflow-hidden">
            {columns.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-border text-xs uppercase tracking-[0.18em] text-brand-600">
                    <tr>
                      <th className="py-3 pr-4 font-semibold">Coluna</th>
                      <th className="py-3 pr-4 font-semibold">Tipo físico</th>
                      <th className="py-3 pr-4 font-semibold">Tipo lógico</th>
                      <th className="py-3 pr-4 font-semibold">Pode ser nula</th>
                      <th className="py-3 pr-4 font-semibold">Sinal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {columns.map((column) => (
                      <tr className="border-b border-border last:border-0" key={column.path}>
                        <td className="py-3 pr-4 font-medium text-text">{column.path}</td>
                        <td className="py-3 pr-4 text-text-body">{column.physical_type ?? "N/D"}</td>
                        <td className="py-3 pr-4 text-text-body">{column.logical_type ?? "N/D"}</td>
                        <td className="py-3 pr-4 text-text-body">{column.nullable ? "Nullable" : "Required"}</td>
                        <td className="py-3 pr-4">
                          {column.is_suspicious ? <Badge className="border-warning-200 bg-warning-50 text-warning-700">Revisar</Badge> : <span className="text-muted">-</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                title="Schema indisponível"
                description="Não foi possível consolidar colunas a partir dos arquivos amostrados."
              />
            )}
          </CardContent>
        </Card>
      ) : null}

      {section === "files" ? (
        <Card className="rounded-3xl border-border shadow-[0_12px_36px_rgba(15,23,42,0.04)]">
          <CardHeader className="space-y-2">
            <h2 className="text-xl font-semibold tracking-tight text-text">Arquivos da tabela</h2>
              <p className="text-sm text-muted">Lista paginada dos arquivos encontrados sob o path base da tabela, com indicação de parquet e atualização.</p>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-border bg-bg-subtle p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Arquivos lidos</p>
                <p className="mt-2 text-2xl font-semibold text-text">{sampleFiles.length}</p>
                <p className="mt-1 text-sm text-text-body">Usados para inferir schema e contagem de linhas.</p>
              </div>
              <div className="rounded-2xl border border-border bg-bg-subtle p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Arquivos encontrados</p>
                <p className="mt-2 text-2xl font-semibold text-text">{filesPage?.total ?? 0}</p>
                <p className="mt-1 text-sm text-text-body">Sob o path base {inventory.path_base}.</p>
              </div>
              <div className="rounded-2xl border border-border bg-bg-subtle p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Arquivos parquet</p>
                <p className="mt-2 text-2xl font-semibold text-text">{inventory.parquet_files_count}</p>
                <p className="mt-1 text-sm text-text-body">Arquivos parquet persistidos no inventário.</p>
              </div>
            </div>

            {filesError ? <div className="rounded-2xl border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700">{filesError}</div> : null}

            {filesLoading && !filesPage ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton className="h-20 rounded-2xl" key={index} />
                ))}
              </div>
            ) : filesPage && filesPage.items.length > 0 ? (
              <div className="space-y-3">
                {filesPage.items.map((file) => (
                  <div className="rounded-2xl border border-border bg-bg-subtle p-4" key={file.key}>
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-1">
                        <p className="font-medium text-text">{file.relative_path || file.key}</p>
                        <p className="text-sm text-muted">
                          {formatBytes(file.size_bytes)} · {formatDateTime(file.last_modified_at)}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge className={cn("border", file.is_parquet ? "border-success-200 bg-success-50 text-success-700" : "border-border bg-surface text-text-body")}>
                          {file.file_type}
                        </Badge>
                        <Badge className={cn("border", file.is_parquet ? "border-success-200 bg-success-50 text-success-700" : "border-border bg-bg-subtle text-text-body")}>
                          {file.is_parquet ? "Parquet" : "Não parquet"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="Sem arquivos" description="Nenhum arquivo pôde ser listado para esta tabela." />
            )}

            {filesPage ? (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4 text-sm text-text-body">
                <div>
                  Página {filesPage.page} de {Math.max(1, Math.ceil(filesPage.total / filesPage.page_size))}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    disabled={filesPage.page <= 1 || filesLoading}
                    onClick={() => setFilesPageIndex((current) => Math.max(1, current - 1))}
                    size="sm"
                    variant="outline"
                  >
                    Anterior
                  </Button>
                  <Button
                    disabled={!filesPage.has_more || filesLoading}
                    onClick={() => setFilesPageIndex((current) => current + 1)}
                    size="sm"
                    variant="outline"
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {section === "partitions" ? (
        <Card className="rounded-3xl border-border shadow-[0_12px_36px_rgba(15,23,42,0.04)]">
          <CardHeader className="space-y-2">
            <h2 className="text-xl font-semibold tracking-tight text-text">Partições e organização</h2>
            <p className="text-sm text-muted">Padrões identificados na estrutura de pastas.</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-2xl border border-border bg-bg-subtle p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Padrão de partição</p>
              <p className="mt-2 text-sm text-text-body">{inventory.partition_pattern_detected ?? "Nenhum padrão de partição identificado."}</p>
            </div>
            <div className="rounded-2xl border border-border bg-bg-subtle p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Partições identificadas</p>
              {partitions.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {partitions.map((part) => (
                    <Badge className="border-border bg-surface text-text-body" key={part}>
                      {part}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm text-text-body">Nenhuma partição inferida a partir dos arquivos amostrados.</p>
              )}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {section === "quality" ? (
        <Card className="rounded-3xl border-border shadow-[0_12px_36px_rgba(15,23,42,0.04)]">
          <CardHeader className="space-y-2">
            <h2 className="text-xl font-semibold tracking-tight text-text">Qualidade e operação</h2>
            <p className="text-sm text-muted">Sinais consolidados para entender se a tabela está pronta para uso ou pede revisão técnica.</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {qualityBreakdown.map((item) => (
                <div className={cn("rounded-2xl border px-4 py-4", toneClasses(item.tone))} key={item.key}>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-80">{item.label}</p>
                  <p className="mt-2 text-3xl font-semibold">{item.score.toFixed(1)}</p>
                  {item.detail ? <p className="mt-2 text-sm opacity-90">{item.detail}</p> : null}
                </div>
              ))}
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-border bg-bg-subtle p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">SLA de freshness</p>
                    <p className="mt-1 text-lg font-semibold text-text">{detail.freshness_sla_hours ?? "N/D"}h</p>
                    <p className="mt-1 text-sm text-text-body">{inventory.freshness_sla_hours_override ? "A tabela tem um prazo próprio de atualização." : "O prazo vem da configuração global da camada."}</p>
                  </div>
                </div>
                <p className="mt-3 text-xs text-muted">Use este prazo para interpretar quando o ativo passa de atual para atrasado.</p>
                <div className="mt-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <Input
                    min="1"
                    onChange={(event) => setFreshnessOverride(event.target.value)}
                    placeholder="Ex.: 24"
                    type="number"
                    value={freshnessOverride}
                  />
                  <Button disabled={savingSla} onClick={() => void saveFreshnessOverride()} size="sm" variant="outline" type="button">
                    {savingSla ? "Salvando..." : "Salvar SLA"}
                  </Button>
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-bg-subtle p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Sinais operacionais</p>
                <p className="mt-1 text-sm text-text-body">Alertas técnicos detectados na leitura leve, como arquivos ilegíveis, falhas de metadados ou inconsistências estruturais.</p>
                <div className="mt-3 space-y-3">
                  {operationalSignals.length > 0 ? (
                    operationalSignals.map((signal) => (
                      <div className={cn("rounded-2xl border px-4 py-3", toneClasses(signal.tone))} key={signal.key}>
                        <p className="text-sm font-semibold">{signal.label}</p>
                        {signal.detail ? <p className="mt-1 text-sm opacity-90">{signal.detail}</p> : null}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-text-body">Nenhum alerta operacional relevante foi detectado na leitura atual.</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {section === "history" ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,0.65fr)_minmax(0,1.35fr)]">
          <Card className="rounded-3xl border-border shadow-[0_12px_36px_rgba(15,23,42,0.04)]">
            <CardHeader className="space-y-2">
              <h2 className="text-xl font-semibold tracking-tight text-text">Histórico de leitura</h2>
              <p className="text-sm text-muted">Linha do tempo com os últimos sinais persistidos para acompanhar mudanças de freshness e qualidade.</p>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-text-body">
              <div className="rounded-2xl border border-border bg-bg-subtle p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Última atualização observada</p>
                <p className="mt-1 font-medium text-text">{formatDateTime(detail.last_modified_at)}</p>
                <p className="mt-1 text-xs text-muted">Referência da versão mais recente da tabela que apareceu no inventário.</p>
              </div>
              <div className="rounded-2xl border border-border bg-bg-subtle p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Último scan</p>
                <p className="mt-1 font-medium text-text">{formatDateTime(inventory.data_last_scan_at)}</p>
                <p className="mt-1 text-xs text-muted">Momento em que o inventário foi consultado ou recalculado pela última vez.</p>
              </div>
              <div className="rounded-2xl border border-border bg-bg-subtle p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Estado do scan</p>
                <p className="mt-1 font-medium text-text">{normalizeStatusLabel(inventory.status_scan)}</p>
                <p className="mt-1 text-xs text-muted">Ajuda a entender se a tabela foi descoberta, atualizada ou ainda está incompleta.</p>
              </div>
              <div className="rounded-2xl border border-border bg-bg-subtle p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Detalhe do freshness</p>
                <p className="mt-1 font-medium text-text">{detail.freshness_detail}</p>
                <p className="mt-1 text-xs text-muted">Explica por que a tabela está fresh, recente, atrasada ou sem janela consolidada.</p>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-border shadow-[0_12px_36px_rgba(15,23,42,0.04)]">
            <CardHeader className="space-y-2">
              <h2 className="text-xl font-semibold tracking-tight text-text">Tendência recente</h2>
              <p className="text-sm text-muted">Visão rápida das últimas leituras para comparar atualização, qualidade e volume ao longo do tempo.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {historyItems.length > 0 ? (
                  historyItems.map((item, index) => (
                    <div className="rounded-2xl border border-border bg-bg-subtle p-4" key={`${item.observed_at ?? index}-${index}`}>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">
                        {item.source_kind} · {formatDateTime(item.observed_at)}
                      </p>
                      <p className="mt-1 text-xs text-muted">Fotografia do estado do ativo naquele momento.</p>
                      <p className="mt-2 text-sm text-text-body">
                        Freshness: <span className="font-semibold text-text">{normalizeStatusLabel(item.freshness_status)}</span>
                      </p>
                      <p className="mt-1 text-sm text-text-body">
                        Pontuação de qualidade: <span className="font-semibold text-text">{item.quality_score?.toFixed(1) ?? "N/D"}</span>
                      </p>
                      <p className="mt-1 text-sm text-text-body">
                        Contagem de linhas: <span className="font-semibold text-text">{item.row_count?.toLocaleString("pt-BR") ?? "N/D"}</span>
                      </p>
                    </div>
                  ))
                ) : (
                  <EmptyState
                    description="Ainda não há histórico persistido para esta tabela. Abra ou recalcule o detalhe para registrar a primeira observação."
                    title="Sem histórico"
                  />
                )}
              </div>
              {detail.technical_notes.length > 0 ? (
                <div className="rounded-2xl border border-border bg-bg-subtle p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Notas técnicas</p>
                  <p className="mt-1 text-xs text-muted">Observações preservadas para apoiar investigação ou auditoria do comportamento da tabela.</p>
                  <ul className="mt-3 space-y-2 text-sm text-text-body">
                    {detail.technical_notes.map((note) => (
                      <li className="flex gap-2" key={note}>
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-slate-400" />
                        <span>{note}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      ) : null}
      </>
    );
  }
}
