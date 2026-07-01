// Cliente HTTP do SPA — URL absoluta (VITE_API_URL) + Bearer token.
// Substitui o proxy same-origin do Next; auth por Authorization header (sem cookies cross-site).

const TOKEN_KEY = "t2c.auth.token";

export class ApiError extends Error {
  status: number;
  payload: unknown;
  constructor(status: number, message: string, payload: unknown = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

function apiBase(): string {
  const base = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
  if (!base) throw new Error("VITE_API_URL não configurada. Defina no .env / build.");
  return base; // ex.: http://localhost:8000/api/v1
}

// Aceita caminhos no estilo do app ("/v1/...", "/api/v1/...", "/...") e resolve contra a base /api/v1.
function resolveUrl(path: string): string {
  let p = path.trim();
  if (p.startsWith("http://") || p.startsWith("https://")) return p;
  if (p.startsWith("/api/v1")) p = p.slice("/api/v1".length);
  else if (p.startsWith("/v1")) p = p.slice("/v1".length);
  if (!p.startsWith("/")) p = `/${p}`;
  return `${apiBase()}${p}`;
}

export const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

export async function apiResponse(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(resolveUrl(path), { ...init, headers });
  if (res.status === 401) {
    setToken(null);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("auth:unauthorized"));
    }
  }
  return res;
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await apiResponse(path, init);
  const text = await res.text();
  const data = text ? safeJson(text) : null;
  if (!res.ok) {
    let message = res.statusText || `HTTP ${res.status}`;
    if (data && typeof data === "object") {
      const rec = data as Record<string, unknown>;
      if (typeof rec.detail === "string") message = rec.detail;
      else if (typeof rec.message === "string") message = rec.message;
    }
    throw new ApiError(res.status, message, data);
  }
  return data as T;
}

export type ExportJobStatus = Record<string, unknown> & {
  status?: string | null;
  artifact_public_id?: string | null;
  artifact_filename?: string | null;
  export_download_href?: string | null;
};

export type DownloadApiFileResult =
  | { kind: "downloaded" }
  | { kind: "queued"; job: Record<string, unknown> };

export async function getExportJobStatus(publicId: string): Promise<ExportJobStatus> {
  return apiRequest<ExportJobStatus>(`/v1/exports/${encodeURIComponent(publicId)}`);
}

function triggerBrowserDownload(blob: Blob, filename: string): void {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}

export async function downloadApiFile(
  path: string,
  filename: string,
  init: RequestInit = {},
  options: { confirmMessage?: string } = {},
): Promise<DownloadApiFileResult> {
  if (options.confirmMessage && typeof window !== "undefined" && !window.confirm(options.confirmMessage)) {
    return { kind: "downloaded" };
  }
  const response = await apiResponse(path, init);
  const contentType = (response.headers.get("content-type") || "").toLowerCase();
  // Export assíncrono: 202 + JSON -> job para acompanhar; faz polling e baixa ao concluir.
  if (response.status === 202 && contentType.includes("application/json")) {
    const job = (await response.json()) as Record<string, unknown>;
    const publicId = typeof job.artifact_public_id === "string" ? job.artifact_public_id : null;
    const jobFilename =
      typeof job.artifact_filename === "string" && job.artifact_filename.trim()
        ? job.artifact_filename.trim()
        : filename;
    if (publicId) {
      void (async () => {
        const deadline = Date.now() + 15 * 60 * 1000;
        while (Date.now() < deadline) {
          try {
            const current = await getExportJobStatus(publicId);
            const href = typeof current.export_download_href === "string" ? current.export_download_href : null;
            const status = typeof current.status === "string" ? current.status.toLowerCase() : "";
            if (status === "success" && href) {
              await downloadApiFile(href, jobFilename);
              return;
            }
            if (status === "failed") return;
          } catch {
            /* best-effort polling */
          }
          await new Promise((resolve) => window.setTimeout(resolve, 3000));
        }
      })();
    }
    return { kind: "queued", job };
  }
  if (!response.ok) {
    throw new ApiError(response.status, response.statusText || `HTTP ${response.status}`);
  }
  triggerBrowserDownload(await response.blob(), filename);
  return { kind: "downloaded" };
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
