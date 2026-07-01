import { useEffect, useRef } from "react";

import {
  APP_VERSION,
  APP_VERSION_CHECK_INTERVAL_MS,
  APP_VERSION_ENDPOINT,
  APP_VERSION_RELOAD_KEY,
} from "@/lib/app-version";

type VersionResponse = {
  version?: string;
};

async function fetchCurrentVersion(): Promise<string | null> {
  try {
    const response = await fetch(APP_VERSION_ENDPOINT, {
      method: "GET",
      cache: "no-store",
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
      },
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as VersionResponse;
    const version = typeof payload.version === "string" ? payload.version.trim() : "";
    return version || null;
  } catch {
    return null;
  }
}

function triggerControlledReload(serverVersion: string) {
  if (typeof window === "undefined") return;
  const key = `${APP_VERSION_RELOAD_KEY}:${serverVersion}`;
  if (window.sessionStorage.getItem(key) === "1") return;
  window.sessionStorage.setItem(key, "1");
  window.location.reload();
}

export function AppVersionGuard() {
  const intervalRef = useRef<number | null>(null);
  const checkInFlightRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const checkForUpdate = async () => {
      if (checkInFlightRef.current) return;
      checkInFlightRef.current = true;
      try {
        const serverVersion = await fetchCurrentVersion();
        if (cancelled || !serverVersion) return;
        if (APP_VERSION !== serverVersion) {
          triggerControlledReload(serverVersion);
        }
      } finally {
        checkInFlightRef.current = false;
      }
    };

    void checkForUpdate();

    const handleFocus = () => void checkForUpdate();
    const handleVisibility = () => {
      if (!document.hidden) {
        void checkForUpdate();
      }
    };
    const handleOnline = () => void checkForUpdate();

    window.addEventListener("focus", handleFocus);
    window.addEventListener("online", handleOnline);
    document.addEventListener("visibilitychange", handleVisibility);

    intervalRef.current = window.setInterval(() => {
      void checkForUpdate();
    }, APP_VERSION_CHECK_INTERVAL_MS);

    return () => {
      cancelled = true;
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("online", handleOnline);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  return null;
}
