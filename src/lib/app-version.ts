export const APP_VERSION = (process.env.NEXT_PUBLIC_APP_VERSION ?? "dev").trim() || "dev";
export const APP_VERSION_ENDPOINT = "/api/version";
export const APP_VERSION_RELOAD_KEY = "t2c-data:app-version:last-reloaded";
export const APP_VERSION_CHECK_INTERVAL_MS = 60_000;
