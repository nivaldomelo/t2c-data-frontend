import { apiRequest } from "@/lib/client-api";

export type ThemeId = "atual" | "teal" | "corporate" | "minimal";

export const THEME_STORAGE_KEY = "t2c.theme";

export const THEMES: { id: ThemeId; label: string; description: string; swatches: string[] }[] = [
  {
    id: "atual",
    label: "Atual",
    description: "O tema padrão do sistema (azul com acento teal).",
    swatches: ["#1E40AF", "#14B8A6", "#F4F7FA"],
  },
  {
    id: "teal",
    label: "Teal turn2c",
    description: "Teal como marca principal e azul de apoio. Moderno e leve.",
    swatches: ["#14B8A6", "#2563EB", "#F7FAFA"],
  },
  {
    id: "corporate",
    label: "Azul corporativo",
    description: "Azul corporativo sóbrio com teal em micro-acentos.",
    swatches: ["#2563EB", "#14B8A6", "#FFFFFF"],
  },
  {
    id: "minimal",
    label: "Neutro (bem leve)",
    description: "Cinzas muito claros com um único acento teal. Minimalista.",
    swatches: ["#0D9488", "#E6E8EC", "#FAFAFB"],
  },
];

const VALID = new Set<ThemeId>(["atual", "teal", "corporate", "minimal"]);

export function isThemeId(value: string | null | undefined): value is ThemeId {
  return !!value && VALID.has(value as ThemeId);
}

export function applyTheme(theme: ThemeId): void {
  if (typeof document === "undefined") return;
  if (theme === "atual") {
    document.documentElement.removeAttribute("data-theme");
  } else {
    document.documentElement.setAttribute("data-theme", theme);
  }
}

export function getStoredTheme(): ThemeId {
  if (typeof window === "undefined") return "atual";
  const value = window.localStorage.getItem(THEME_STORAGE_KEY);
  return isThemeId(value) ? value : "atual";
}

export function storeTheme(theme: ThemeId): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(THEME_STORAGE_KEY, theme);
}

/** Apply + persist locally and (best-effort) to the user's profile on the server. */
export async function setTheme(theme: ThemeId): Promise<void> {
  applyTheme(theme);
  storeTheme(theme);
  try {
    await apiRequest("/v1/me/theme", { method: "PUT", body: JSON.stringify({ theme }) });
  } catch {
    // Persisted locally either way; server sync is best-effort.
  }
}
