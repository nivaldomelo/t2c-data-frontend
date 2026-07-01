const assert = require("node:assert/strict");
const { test } = require("node:test");

const { buildProfilingStatus } = require("./profiling-status.js");

test("shows requesting status immediately after click", () => {
  const status = buildProfilingStatus({
    runLoading: true,
    currentRun: null,
    hasActiveRun: false,
  });

  assert.equal(status.state, "requesting");
  assert.equal(status.label, "Solicitando execução...");
  assert.equal(status.tone, "warning");
});

test("shows running status when the run is confirmed", () => {
  const status = buildProfilingStatus({
    runLoading: false,
    currentRun: {
      status: "running",
      execution_engine: "python",
      started_at: "2026-04-13T14:32:00.000Z",
    },
    hasActiveRun: true,
  });

  assert.equal(status.state, "running");
  assert.equal(status.label, "Executando perfilamento via Python...");
  assert.equal(status.tone, "accent");
  assert.match(status.detail, /14:32|11:32|17:32/);
});

test("shows success status for the latest completed run", () => {
  const status = buildProfilingStatus({
    runLoading: false,
    currentRun: {
      status: "success",
      execution_engine: "spark",
      finished_at: "2026-04-13T14:32:00.000Z",
    },
    hasActiveRun: false,
  });

  assert.equal(status.state, "success");
  assert.equal(status.label, "Última execução concluída com sucesso");
  assert.equal(status.tone, "success");
  assert.match(status.detail, /Concluído às/);
});

test("shows no-data status for a completed empty profiling run", () => {
  const status = buildProfilingStatus({
    runLoading: false,
    currentRun: {
      status: "no_data",
      execution_engine: "spark",
      result_json: {
        observation: "Tabela sem linhas no momento do perfilamento.",
      },
    },
    hasActiveRun: false,
  });

  assert.equal(status.state, "no_data");
  assert.equal(status.label, "Última execução concluída sem dados");
  assert.equal(status.tone, "neutral");
  assert.equal(status.detail, "Tabela sem linhas no momento do perfilamento.");
});

test("shows timeout status when Spark exceeds the execution limit", () => {
  const status = buildProfilingStatus({
    runLoading: false,
    currentRun: {
      status: "timeout",
      execution_engine: "spark",
      error_message: "Tempo limite excedido ao executar profiling Spark.",
    },
    hasActiveRun: false,
  });

  assert.equal(status.state, "timeout");
  assert.equal(status.label, "Última execução expirou");
  assert.equal(status.tone, "danger");
  assert.equal(status.detail, "Tempo limite excedido ao executar profiling Spark.");
});

test("shows failure status for the latest failed run", () => {
  const status = buildProfilingStatus({
    runLoading: false,
    currentRun: {
      status: "failed",
      execution_engine: "spark",
      finished_at: "2026-04-13T14:32:00.000Z",
      error_message: "Falha no spark-submit",
    },
    hasActiveRun: false,
  });

  assert.equal(status.state, "failed");
  assert.equal(status.label, "Última execução falhou");
  assert.equal(status.tone, "danger");
  assert.equal(status.detail, "Falha no spark-submit");
});

test("shows queued status while polling is waiting for execution start", () => {
  const status = buildProfilingStatus({
    runLoading: false,
    currentRun: {
      status: "queued",
      execution_engine: "spark",
      queued_at: "2026-04-13T14:32:00.000Z",
    },
    hasActiveRun: true,
  });

  assert.equal(status.state, "queued");
  assert.equal(status.label, "Aguardando retorno da execução");
  assert.equal(status.tone, "warning");
});

test("shows idle status when there is no run to report", () => {
  const status = buildProfilingStatus({
    runLoading: false,
    currentRun: null,
    hasActiveRun: false,
  });

  assert.equal(status.state, "idle");
  assert.equal(status.label, "Nenhuma execução recente");
  assert.equal(status.tone, "neutral");
});
