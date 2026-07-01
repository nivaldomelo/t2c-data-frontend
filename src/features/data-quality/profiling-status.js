const ENGINE_LABELS = {
  python: "histórico legado",
  spark: "Spark cluster",
};

function shortTime(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatEngine(engine) {
  return ENGINE_LABELS[String(engine || "").toLowerCase()] || String(engine || "").trim() || "motor";
}

function getLatestRun(run, hasActiveRun) {
  if (!run) return null;
  if (hasActiveRun) return run;
  if (run.status === "queued" || run.status === "running") return run;
  return run;
}

function buildProfilingStatus({ runLoading, currentRun, hasActiveRun }) {
  if (runLoading) {
    return {
      state: "requesting",
      tone: "warning",
      label: "Solicitando execução...",
      detail: "Enviando a solicitação para iniciar o perfilamento.",
    };
  }

  const run = getLatestRun(currentRun, hasActiveRun);

  if (!run) {
    return {
      state: "idle",
      tone: "neutral",
      label: "Nenhuma execução recente",
      detail: "Execute o perfilamento para acompanhar o status logo abaixo.",
    };
  }

  const status = String(run.status || "").toLowerCase();
  const engine = formatEngine(run.execution_engine);
  const queuedAt = shortTime(run.queued_at);
  const startedAt = shortTime(run.started_at);
  const finishedAt = shortTime(run.finished_at);
  const timeLabel = finishedAt || startedAt || queuedAt;
  const hasRecentResult =
    !hasActiveRun && (status === "success" || status === "failed" || status === "cancelled" || status === "no_data" || status === "timeout");

  switch (status) {
    case "queued":
      return {
        state: "queued",
        tone: "warning",
        label: "Aguardando retorno da execução",
        detail: timeLabel
          ? `Solicitada às ${timeLabel}. O processamento deve começar em instantes.`
          : "A execução foi solicitada e aguarda início do processamento.",
      };
    case "running":
      return {
        state: "running",
        tone: "accent",
        label: `Executando perfilamento via ${engine}...`,
        detail: timeLabel
          ? `Em andamento desde ${timeLabel}. O histórico será atualizado automaticamente.`
          : "A execução está em andamento. O histórico será atualizado automaticamente.",
      };
    case "success":
      return {
        state: "success",
        tone: "success",
        label: hasRecentResult ? "Última execução concluída com sucesso" : "Perfilamento concluído com sucesso",
        detail: timeLabel ? `Concluído às ${timeLabel}.` : "Concluído com sucesso.",
      };
    case "no_data": {
      const observation =
        run.result_json?.observation || run.result_json?.table_metric?.observation || "Tabela sem linhas no momento do perfilamento.";
      return {
        state: "no_data",
        tone: "neutral",
        label: hasRecentResult ? "Última execução concluída sem dados" : "Perfilamento concluído sem dados",
        detail: observation,
      };
    }
    case "timeout":
      return {
        state: "timeout",
        tone: "danger",
        label: hasRecentResult ? "Última execução expirou" : "Tempo limite excedido",
        detail: run.error_message || "Tempo limite excedido ao executar profiling Spark.",
      };
    case "failed":
      return {
        state: "failed",
        tone: "danger",
        label: hasRecentResult ? "Última execução falhou" : "Falha ao executar perfilamento",
        detail: run.error_message
          ? run.error_message
          : timeLabel
            ? `Falha às ${timeLabel}. Consulte o histórico abaixo.`
            : "Falha ao executar perfilamento. Consulte o histórico abaixo.",
      };
    case "cancelled":
      return {
        state: "cancelled",
        tone: "neutral",
        label: hasRecentResult ? "Última execução cancelada" : "Execução cancelada",
        detail: timeLabel ? `Cancelada às ${timeLabel}.` : "A execução foi interrompida.",
      };
    default:
      return {
        state: "syncing",
        tone: "neutral",
        label: "Status da execução sendo atualizado...",
        detail: "Não foi possível confirmar o status em tempo real. Consulte o histórico abaixo.",
      };
  }
}

export {
  buildProfilingStatus,
};

export default { buildProfilingStatus };
