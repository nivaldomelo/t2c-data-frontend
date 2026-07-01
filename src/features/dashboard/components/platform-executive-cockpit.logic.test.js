const assert = require("node:assert/strict");
const { test } = require("node:test");

const {
  calculatePlatformHealth,
  platformHealthStatusLabel,
  platformHealthTone,
} = require("./platform-executive-cockpit.logic.js");

test("classifies 9 as critical, 65 as attention and 85 as healthy", () => {
  const critical = calculatePlatformHealth({
    governance_maturity: { avg_score: 45 },
    dq: { avg_score: 45 },
    certification: { certified_pct: 42 },
    incidents: { open_total: 6, critical_open_total: 6 },
  });
  assert.equal(Math.round(critical.score), 9);
  assert.equal(critical.statusLabel, "Crítica");
  assert.equal(critical.tone, "danger");

  const attention = calculatePlatformHealth({
    governance_maturity: { avg_score: 81 },
    dq: { avg_score: 81 },
    certification: { certified_pct: 81 },
    incidents: { open_total: 2, critical_open_total: 2 },
  });
  assert.equal(Math.round(attention.score), 65);
  assert.equal(attention.statusLabel, "Atenção");
  assert.equal(attention.tone, "accent");

  const healthy = calculatePlatformHealth({
    governance_maturity: { avg_score: 85 },
    dq: { avg_score: 85 },
    certification: { certified_pct: 85 },
    incidents: { open_total: 0, critical_open_total: 0 },
  });
  assert.equal(Math.round(healthy.score), 85);
  assert.equal(healthy.statusLabel, "Saudável");
  assert.equal(healthy.tone, "success");
});

test("status labels and tones stay aligned with the ranges", () => {
  assert.equal(platformHealthStatusLabel(9), "Crítica");
  assert.equal(platformHealthStatusLabel(65), "Atenção");
  assert.equal(platformHealthStatusLabel(85), "Saudável");
  assert.equal(platformHealthTone(9), "danger");
  assert.equal(platformHealthTone(65), "accent");
  assert.equal(platformHealthTone(85), "success");
});
