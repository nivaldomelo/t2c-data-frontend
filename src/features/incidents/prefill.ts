export type IncidentCreatePrefill = {
  title?: string;
  description?: string;
  source_type?: string;
  source_ref_id?: number;
  evidence_json?: Record<string, unknown>;
};

type OperationalIncidentHrefInput = {
  tableId: number;
  schemaName?: string | null;
  tableName?: string | null;
  pipelineName?: string | null;
  dagId?: string | null;
  taskName?: string | null;
  latestStatusLabel?: string | null;
  lastError?: string | null;
  lastSuccessAt?: string | null;
  dqScore?: number | null;
  failedRules?: number | null;
  sourceType?: string;
  sourceRefId?: number;
  origin?: string;
  operationalSlaDueAt?: string | null;
  recurrentDegradation?: boolean;
};

export function buildOperationalIncidentCreateHref(input: OperationalIncidentHrefInput): string {
  const sourceType = input.sourceType || "platform_ops";
  const sourceRefId = input.sourceRefId ?? input.tableId;
  const targetName = [input.schemaName, input.tableName].filter(Boolean).join(".") || `ativo ${input.tableId}`;
  const title = `Falha operacional em ${targetName}`;
  const description = "Chamado aberto a partir do contexto operacional do ativo para investigar impacto no pipeline, na qualidade e no consumo.";
  const evidenceJson: Record<string, unknown> = {
    origin: input.origin || "explorer_ingestion",
    operational_issue_type: input.latestStatusLabel === "Falha" || input.lastError ? "failure" : "degraded",
    operational_status_label: input.latestStatusLabel || null,
    pipeline_name: input.pipelineName || null,
    dag_id: input.dagId || null,
    task_name: input.taskName || null,
    last_error: input.lastError || null,
    last_success_at: input.lastSuccessAt || null,
    dq_score: input.dqScore ?? null,
    dq_failed_rules: input.failedRules ?? 0,
    recurrent_degradation: Boolean(input.recurrentDegradation),
  };
  if (input.operationalSlaDueAt) {
    evidenceJson.operational_sla_due_at = input.operationalSlaDueAt;
    evidenceJson.operational_sla_hours = 24;
  }

  const params = new URLSearchParams();
  params.set("tableId", String(input.tableId));
  params.set("create", "1");
  params.set("source_type", sourceType);
  params.set("source_ref_id", String(sourceRefId));
  params.set(
    "incident_context",
    JSON.stringify({
      title,
      description,
      source_type: sourceType,
      source_ref_id: sourceRefId,
      evidence_json: evidenceJson,
    } satisfies IncidentCreatePrefill),
  );
  return `/incidents/tickets?${params.toString()}`;
}

export function parseIncidentCreatePrefill(raw: string | null): IncidentCreatePrefill | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as IncidentCreatePrefill;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}
