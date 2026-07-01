export function calculatePlatformHealth(summary: {
  governance_maturity?: { avg_score?: number | null } | null;
  dq?: { avg_score?: number | null } | null;
  certification?: { certified_pct?: number | null } | null;
  incidents?: { open_total?: number | null; critical_open_total?: number | null } | null;
}): {
  score: number;
  baseScore: number;
  dqScore: number;
  incidentPenalty: number;
  statusLabel: string;
  tone: "success" | "accent" | "warning" | "danger" | "neutral";
};

export function platformHealthStatusLabel(score: number): "Saudável" | "Atenção" | "Degradada" | "Crítica";
export function platformHealthTone(score: number): "success" | "accent" | "warning" | "danger";
