export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "Sem informação";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sem informação";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export function formatStatusLabel(status: string | null | undefined): string {
  switch ((status || "").toLowerCase()) {
    case "active":
      return "Ativa";
    case "inactive":
      return "Inativa";
    case "degraded":
      return "Com alerta";
    case "healthy":
      return "Saudável";
    case "misconfigured":
      return "Mal configurada";
    case "running":
      return "Em execução";
    case "paused":
      return "Pausada";
    case "error":
      return "Com erro";
    case "empty":
      return "Sem dados";
    case "unavailable":
      return "Indisponível";
    case "connected_empty":
      return "Conectado · sem DAGs";
    case "connected_no_runs":
      return "Conectado · sem execuções";
    case "connected_active":
      return "Conectado";
    case "not_configured":
      return "Não configurada";
    case "upstream_failed":
      return "Falha upstream";
    case "queued":
      return "Na fila";
    case "scheduled":
      return "Agendada";
    case "success":
      return "Sucesso";
    case "scanned":
      return "Descoberta";
    case "no_parquet":
      return "Sem parquet";
    case "stale":
      return "Desatualizada";
    case "failed":
      return "Falha";
    case "never_synced":
      return "Nunca sincronizada";
    case "access_denied":
      return "Sem acesso ao bucket";
    case "bucket_not_found":
      return "Bucket inexistente";
    case "invalid_credentials":
      return "Credencial inválida";
    case "wrong_region":
      return "Região incorreta";
    case "unexpected_error":
      return "Erro inesperado";
    default:
      return status ? status : "Sem informação";
  }
}

export function formatStatusTone(status: string | null | undefined): "neutral" | "accent" | "success" | "warning" | "danger" {
  switch ((status || "").toLowerCase()) {
    case "active":
    case "healthy":
    case "success":
    case "scanned":
    case "connected_empty":
    case "connected_active":
      return "success";
    case "connected_no_runs":
    case "running":
    case "empty":
    case "paused":
    case "no_parquet":
      return "accent";
    case "stale":
      return "warning";
    case "misconfigured":
      return "danger";
    case "unavailable":
      return "warning";
    case "degraded":
    case "failed":
    case "upstream_failed":
      return "warning";
    case "error":
      return "danger";
    case "access_denied":
    case "bucket_not_found":
    case "wrong_region":
      return "warning";
    case "invalid_credentials":
    case "unexpected_error":
      return "danger";
    case "inactive":
    case "not_configured":
    case "never_synced":
    default:
      return "neutral";
  }
}

export function formatArtifactTypeLabel(value: string | null | undefined): string {
  switch ((value || "").toLowerCase()) {
    case "dashboard":
      return "Dashboard";
    case "question":
      return "Question";
    case "collection":
      return "Collection";
    default:
      return value || "Artefato";
  }
}

export function formatDurationSeconds(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || Number.isNaN(Number(seconds))) {
    return "Sem duração";
  }
  const total = Math.max(Math.round(Number(seconds)), 0);
  if (total < 60) {
    return `${total}s`;
  }
  const minutes = Math.floor(total / 60);
  const remainingSeconds = total % 60;
  if (minutes < 60) {
    return `${minutes}m${remainingSeconds > 0 ? ` ${remainingSeconds}s` : ""}`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h${remainingMinutes > 0 ? ` ${remainingMinutes}m` : ""}${remainingSeconds > 0 ? ` ${remainingSeconds}s` : ""}`;
}
