import { useEffect } from "react";

import { apiRequest } from "@/lib/client-api";
import { applyTheme, getStoredTheme, isThemeId, storeTheme } from "@/lib/theme";

/**
 * Inside the authenticated app, make the account's saved theme authoritative:
 * fetch it from /me and apply it (so the choice follows the user across browsers).
 * The no-FOUC inline script already applied the localStorage theme before paint.
 */
export function ThemeSync() {
  useEffect(() => {
    // Reassert the locally stored theme immediately (covers client navigations).
    applyTheme(getStoredTheme());
    let cancelled = false;
    void (async () => {
      try {
        const me = await apiRequest<{ ui_theme?: string }>("/v1/me");
        if (cancelled) return;
        const theme = isThemeId(me.ui_theme) ? me.ui_theme : "atual";
        applyTheme(theme);
        storeTheme(theme);
      } catch {
        // keep the locally applied theme
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return null;
}
