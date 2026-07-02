// Sanitiza hrefs/URLs vindos da API antes de usá-los em <a href> ou window.location.
// Bloqueia javascript:/data:/vbscript: e formas de open-redirect; aceita apenas caminhos
// relativos mesma-origem ou URLs http(s) absolutas válidas.
export function safeHref(value: string | null | undefined, fallback = "#"): string {
  const raw = (value ?? "").trim();
  if (!raw) return fallback;
  // Caminho relativo mesma-origem: começa com "/" mas não "//" nem "/\".
  if (raw.startsWith("/") && !raw.startsWith("//") && !raw.startsWith("/\\")) return raw;
  try {
    const base = typeof window !== "undefined" ? window.location.origin : "http://localhost";
    const url = new URL(raw, base);
    if (url.protocol === "http:" || url.protocol === "https:") return url.href;
  } catch {
    /* URL inválida → fallback */
  }
  return fallback;
}

// Variante ESTRITA para navegação same-tab/interna (window.location.assign): aceita apenas
// caminho relativo mesma-origem; rejeita URLs absolutas http(s) (evita open-redirect/phishing).
export function safeInternalHref(value: string | null | undefined, fallback = "/"): string {
  const raw = (value ?? "").trim();
  if (raw.startsWith("/") && !raw.startsWith("//") && !raw.startsWith("/\\")) return raw;
  return fallback;
}
