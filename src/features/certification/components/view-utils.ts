export function formatCertificationDate(value: string | null): string {
  if (!value) return "-";
  return new Date(value).toLocaleString("pt-BR");
}

export function certificationScoreTone(score: number) {
  if (score >= 80) {
    return {
      text: "text-warning-700",
      ring: "border-warning-200 bg-gradient-to-r from-amber-50 via-yellow-50 to-white",
      bar: "from-amber-400 via-yellow-400 to-amber-500",
    };
  }
  if (score >= 50) {
    return {
      text: "text-info-700",
      ring: "border-info-200 bg-gradient-to-r from-accent-50 via-cyan-50 to-white",
      bar: "from-accent-500 via-cyan-500 to-blue-500",
    };
  }
  return {
    text: "text-danger-700",
    ring: "border-danger-200 bg-gradient-to-r from-rose-50 via-red-50 to-white",
    bar: "from-rose-500 to-red-500",
  };
}
