function clamp(value, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function average(values) {
  const valid = values.filter((value) => Number.isFinite(value));
  if (!valid.length) return 0;
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

function platformHealthStatusLabel(score) {
  if (score >= 80) return "Saudável";
  if (score >= 60) return "Atenção";
  if (score >= 30) return "Degradada";
  return "Crítica";
}

function platformHealthTone(score) {
  if (score >= 80) return "success";
  if (score >= 60) return "accent";
  if (score >= 30) return "warning";
  return "danger";
}

function calculatePlatformHealth(summary) {
  const incidents = summary?.incidents ?? {};
  const governanceScore = Number(summary?.governance_maturity?.avg_score ?? 0);
  const dqScore = Number(summary?.dq?.avg_score ?? 0) > 0 ? Number(summary?.dq?.avg_score ?? 0) : governanceScore;
  const certificationPct = Number(summary?.certification?.certified_pct ?? 0);
  const openTotal = Number(incidents.open_total ?? 0);
  const criticalOpenTotal = Number(incidents.critical_open_total ?? 0);
  const incidentPenalty = clamp((openTotal * 2) + (criticalOpenTotal * 6), 0, 35);
  const baseScore = average([governanceScore, dqScore, certificationPct]);
  const score = clamp(baseScore - incidentPenalty, 0, 100);

  return {
    score,
    baseScore,
    dqScore,
    incidentPenalty,
    statusLabel: platformHealthStatusLabel(score),
    tone: platformHealthTone(score),
  };
}

module.exports = {
  calculatePlatformHealth,
  platformHealthStatusLabel,
  platformHealthTone,
};
