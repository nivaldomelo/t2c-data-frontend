type AuthSessionSnapshot = {
  roles: string[];
  permissions: string[];
};

let currentSession: AuthSessionSnapshot = {
  roles: [],
  permissions: [],
};

export function readAuthSession(): AuthSessionSnapshot {
  return currentSession;
}

export function setAuthSession(session: AuthSessionSnapshot): void {
  currentSession = {
    roles: [...session.roles],
    permissions: [...session.permissions],
  };
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("auth:session-changed", { detail: { authenticated: true } }));
  }
}

export function clearAuthSession(): void {
  currentSession = {
    roles: [],
    permissions: [],
  };
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("auth:session-changed", { detail: { authenticated: false } }));
  }
}

export type { AuthSessionSnapshot };
