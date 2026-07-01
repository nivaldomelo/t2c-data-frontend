import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  canAccessPath,
  canRoleAction,
  defaultRouteForRoles,
  getPrimaryRole,
  isAdminRole,
  type NormalizedRole,
  type ResourceKey,
} from "@/config/rbac";
import { apiRequest, apiResponse, getToken, setToken } from "@/lib/client-api";

type MeResponse = {
  name?: string | null;
  email?: string | null;
  roles?: string[];
  permissions?: string[];
  unread_notifications?: number;
};

type LoginResult = {
  access_token: string;
  roles?: string[];
  permissions?: string[];
  mfa_enabled?: boolean;
  mfa_grace_remaining?: number | null;
  mfa_warning?: string | null;
  password_warning?: string | null;
};

type AuthContextValue = {
  isLoading: boolean;
  isAuthenticated: boolean;
  roles: string[];
  permissions: string[];
  displayName: string;
  userEmail: string | null;
  unreadNotifications: number;
  canEdit: boolean;
  primaryRole: NormalizedRole;
  defaultRoute: string;
  canAccessPath: (pathname: string) => boolean;
  canAction: (action: "read" | "write", resource: ResourceKey) => boolean;
  hasPermission: (permission: string) => boolean;
  login: (email: string, password: string, mfaCode?: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({
  isLoading: true,
  isAuthenticated: false,
  roles: [],
  permissions: [],
  displayName: "",
  userEmail: null,
  unreadNotifications: 0,
  canEdit: false,
  primaryRole: "unknown",
  defaultRoute: "/login",
  canAccessPath: () => false,
  canAction: () => false,
  hasPermission: () => false,
  login: async () => ({ access_token: "" }),
  logout: async () => {},
});

function isTokenExpired(token: string): boolean {
  const parts = token.split(".");
  if (parts.length < 2) return true;
  try {
    const normalized = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    const payload = JSON.parse(atob(padded)) as { exp?: number };
    if (typeof payload.exp !== "number") return true;
    return payload.exp <= Math.floor(Date.now() / 1000);
  } catch {
    return true;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [roles, setRoles] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [displayName, setDisplayName] = useState("");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const applyMe = useCallback((me: MeResponse) => {
    setRoles(me.roles ?? []);
    setPermissions(me.permissions ?? []);
    setDisplayName(me.name ?? me.email ?? "");
    setUserEmail(me.email ?? null);
    setUnreadNotifications(Number(me.unread_notifications ?? 0));
    setIsAuthenticated(true);
  }, []);

  const clearSession = useCallback(() => {
    setToken(null);
    setIsAuthenticated(false);
    setRoles([]);
    setPermissions([]);
    setDisplayName("");
    setUserEmail(null);
  }, []);

  // Sessão inicial: token válido -> /me.
  useEffect(() => {
    let active = true;
    void (async () => {
      const token = getToken();
      if (!token || isTokenExpired(token)) {
        clearSession();
        setIsLoading(false);
        return;
      }
      try {
        const me = await apiRequest<MeResponse>("/me");
        if (active) applyMe(me);
      } catch {
        if (active) clearSession();
      } finally {
        if (active) setIsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [applyMe, clearSession]);

  // 401 em qualquer request -> encerra sessão e volta ao login.
  useEffect(() => {
    function onUnauthorized() {
      clearSession();
      navigate("/login", { replace: true });
    }
    window.addEventListener("auth:unauthorized", onUnauthorized as EventListener);
    return () => window.removeEventListener("auth:unauthorized", onUnauthorized as EventListener);
  }, [clearSession, navigate]);

  const login = useCallback(
    async (email: string, password: string, mfaCode?: string): Promise<LoginResult> => {
      const result = await apiRequest<LoginResult>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password, mfa_code: mfaCode || null }),
      });
      setToken(result.access_token);
      // roles/permissions já vêm no login; enriquece com /me (nome, unread).
      applyMe({ roles: result.roles, permissions: result.permissions });
      try {
        const me = await apiRequest<MeResponse>("/me");
        applyMe(me);
      } catch {
        /* mantém roles do login */
      }
      return result;
    },
    [applyMe],
  );

  const logout = useCallback(async (): Promise<void> => {
    try {
      await apiResponse("/auth/logout", { method: "POST" });
    } catch {
      /* ignore */
    }
    clearSession();
    navigate("/login", { replace: true });
  }, [clearSession, navigate]);

  const value = useMemo<AuthContextValue>(
    () => ({
      isLoading,
      isAuthenticated,
      roles,
      permissions,
      displayName,
      userEmail,
      unreadNotifications,
      canEdit: canRoleAction(roles, "write", "explorer", permissions),
      primaryRole: getPrimaryRole(roles, permissions),
      defaultRoute: defaultRouteForRoles(roles, permissions),
      canAccessPath: (targetPath: string) => canAccessPath(targetPath, roles, permissions),
      canAction: (action, resource) => canRoleAction(roles, action, resource, permissions),
      hasPermission: (permission: string) => {
        if (isAdminRole(roles, permissions)) return true;
        return permissions.includes(permission) || permissions.includes("*:read");
      },
      login,
      logout,
    }),
    [displayName, isAuthenticated, isLoading, login, logout, permissions, roles, unreadNotifications, userEmail],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
