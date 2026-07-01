export type AppRole = "admin" | "editor" | "viewer" | "stewardship" | "data_owner";

export type ResourceKey =
  | "home"
  | "search"
  | "explorer"
  | "governance"
  | "lineage"
  | "dataQuality"
  | "incidents"
  | "glossary"
  | "tags"
  | "profile"
  | "certification"
  | "privacyAccess"
  | "dataOwners"
  | "configuration"
  | "stewardship"
  | "assetOwner"
  | "datasources"
  | "dailyUse"
  | "integrations"
  | "dataLake"
  | "audit"
  | "ops"
  | "inbox"
  | "admin"
  | "other";

export type ActionKey = "read" | "write";
export type NormalizedRole = AppRole | "unknown";

function hasRole(roles: string[], role: AppRole): boolean {
  return roles.includes(role);
}

function hasPermission(perms: string[], perm: string): boolean {
  return perms.includes(perm);
}

export function normalizeRoleName(value: string | null | undefined): AppRole | null {
  const raw = (value ?? "").trim().toLowerCase();
  if (!raw) return null;
  if (raw === "admin") return "admin";
  if (raw === "editor") return "editor";
  if (raw === "viewer" || raw === "visualizador") return "viewer";
  if (raw === "stewardship" || raw === "steward") return "stewardship";
  if (raw === "data_owner" || raw === "data-owner" || raw === "data owner" || raw === "dataowner" || raw === "owner") return "data_owner";
  return null;
}

export function getPrimaryRole(roles: string[], perms: string[] = []): NormalizedRole {
  const normalizedRoles = roles.map((role) => normalizeRoleName(role)).filter(Boolean) as AppRole[];
  if (isAdminRole(normalizedRoles, perms)) return "admin";
  if (normalizedRoles.includes("stewardship")) return "stewardship";
  if (normalizedRoles.includes("data_owner")) return "data_owner";
  if (isEditorRole(normalizedRoles, perms)) return "editor";
  if (isViewerRole(normalizedRoles, perms)) return "viewer";
  return "unknown";
}

export function getRoleVisuals(role: NormalizedRole): {
  iconClassName: string;
  textClassName: string;
  badgeClassName: string;
  label: string;
} {
  if (role === "admin") {
    return {
      iconClassName: "text-muted",
      textClassName: "text-text-body",
      badgeClassName: "border-border bg-bg-subtle text-text-body",
      label: "Admin",
    };
  }
  if (role === "editor") {
    return {
      iconClassName: "text-muted",
      textClassName: "text-text-body",
      badgeClassName: "border-border bg-bg-subtle text-text-body",
      label: "Editor",
    };
  }
  if (role === "stewardship") {
    return {
      iconClassName: "text-muted",
      textClassName: "text-text-body",
      badgeClassName: "border-border bg-bg-subtle text-text-body",
      label: "Stewardship",
    };
  }
  if (role === "data_owner") {
    return {
      iconClassName: "text-muted",
      textClassName: "text-text-body",
      badgeClassName: "border-border bg-bg-subtle text-text-body",
      label: "Responsável de dados",
    };
  }
  if (role === "viewer") {
    return {
      iconClassName: "text-muted",
      textClassName: "text-text-body",
      badgeClassName: "border-border bg-bg-subtle text-text-body",
      label: "Visualizador",
    };
  }
  return {
    iconClassName: "text-muted",
    textClassName: "text-text-body",
    badgeClassName: "border-border bg-bg-subtle text-text-body",
    label: "Usuário",
  };
}

export function isAdminRole(roles: string[], perms: string[] = []): boolean {
  return (
    hasRole(roles, "admin") ||
    hasPermission(perms, "admin:access") ||
    hasPermission(perms, "user:manage") ||
    hasPermission(perms, "role:manage") ||
    hasPermission(perms, "permission:manage")
  );
}

export function isEditorRole(roles: string[], perms: string[] = []): boolean {
  if (isAdminRole(roles, perms)) return false;
  return hasRole(roles, "editor");
}

export function isViewerRole(roles: string[], perms: string[] = []): boolean {
  if (isAdminRole(roles, perms) || isEditorRole(roles, perms)) return false;
  return hasRole(roles, "viewer") || hasPermission(perms, "*:read");
}

export function resourceFromPath(pathname: string): ResourceKey {
  if (pathname === "/" || pathname.startsWith("/home")) return "home";
  if (pathname.startsWith("/dashboard")) return "home";
  if (pathname.startsWith("/search")) return "search";
  if (pathname.startsWith("/explorer")) return "explorer";
  if (pathname.startsWith("/governance")) return "governance";
  if (pathname.startsWith("/lineage")) return "lineage";
  if (pathname.startsWith("/data-quality")) return "dataQuality";
  if (pathname.startsWith("/incidents")) return "incidents";
  if (pathname.startsWith("/glossary")) return "glossary";
  if (pathname.startsWith("/tags")) return "tags";
  if (pathname.startsWith("/certification")) return "certification";
  if (pathname.startsWith("/privacy-access")) return "privacyAccess";
  if (pathname.startsWith("/admin/governance")) return "configuration";
  if (pathname.startsWith("/me") || pathname.startsWith("/profile")) return "profile";
  if (pathname.startsWith("/inbox")) return "inbox";
  if (pathname.startsWith("/data-owners")) return "dataOwners";
  if (pathname.startsWith("/datasources")) return "datasources";
  if (pathname.startsWith("/integrations")) return "integrations";
  if (pathname.startsWith("/datalakes")) return "dataLake";
  if (pathname.startsWith("/daily-use")) return "dataLake";
  if (pathname.startsWith("/audit")) return "audit";
  if (pathname.startsWith("/ops")) return "ops";
  if (pathname.startsWith("/admin")) return "admin";
  return "other";
}

export function canAccessPath(pathname: string, roles: string[], perms: string[] = []): boolean {
  if (!roles.length && !perms.length) return false;
  if (isAdminRole(roles, perms)) return true;

  // The data-lake CONNECTION console (under Integrations) is admin-only. The data-lake
  // CATALOG browser at /datalakes (resource "dataLake") stays viewable by other roles below.
  if (pathname.startsWith("/integrations/data-lake")) return false;

  const resource = resourceFromPath(pathname);
  // /admin/governance (governance settings) lives under the admin area: admin-only,
  // so the Admin menu never surfaces for non-admin roles.
  if (resource === "configuration") return false;
  if (resource === "profile" || resource === "inbox") return true;
  if (hasRole(roles, "stewardship") || hasRole(roles, "data_owner")) {
    // Read everything except the admin area and datasources (datasources are admin-only).
    if (resource === "admin" || resource === "datasources") return false;
    return true;
  }

  if (isEditorRole(roles, perms)) {
    // Editors reach everything except datasource connections and the admin area.
    return !["datasources", "admin"].includes(resource);
  }

  if (isViewerRole(roles, perms)) {
    // Aligned with the backend viewer read scope (catalog/lineage/certification/privacy/
    // search + the read-only data-lake catalog browser). The Integrations consoles
    // (airflow/metabase/api/data-lake connections) are not served to viewers.
    return (
      resource === "home" ||
      resource === "explorer" ||
      resource === "lineage" ||
      resource === "dataLake" ||
      resource === "privacyAccess" ||
      resource === "certification"
    );
  }

  return false;
}

export function defaultRouteForRoles(roles: string[], perms: string[] = []): string {
  if (canAccessPath("/explorer", roles, perms)) return "/explorer";
  if (canAccessPath("/lineage", roles, perms)) return "/lineage";
  if (canAccessPath("/integrations", roles, perms)) return "/integrations";
  if (canAccessPath("/", roles, perms)) return "/";
  return "/login";
}

export function canRoleAction(
  roles: string[],
  action: ActionKey,
  resource: ResourceKey,
  perms: string[] = [],
): boolean {
  if (!roles.length && !perms.length) return false;
  if (isAdminRole(roles, perms)) return true;
  if (resource === "profile") return true;
  if (resource === "inbox") return action === "read";
  if (resource === "configuration") {
    if (action === "read") return hasRole(roles, "admin") || hasRole(roles, "editor");
    return hasRole(roles, "admin");
  }
  if (resource === "stewardship") {
    // Review-queue decisions belong to admin/stewardship/data_owner.
    if (action === "read") return true;
    return hasRole(roles, "admin") || hasRole(roles, "stewardship") || hasRole(roles, "data_owner");
  }
  if (resource === "assetOwner") {
    // Owner/steward reassignment: admin, editor and data_owner. Mirrors asset.owner:write.
    return hasRole(roles, "admin") || hasRole(roles, "editor") || hasRole(roles, "data_owner");
  }
  if (resource === "datasources") {
    // Datasource access is admin-only (read and write).
    return hasRole(roles, "admin");
  }
  if (resource === "audit") {
    // Audit is read-only and now visible to editors as well as stewardship/data_owner.
    return action === "read"
      ? hasRole(roles, "admin") || hasRole(roles, "editor") || hasRole(roles, "stewardship") || hasRole(roles, "data_owner")
      : hasRole(roles, "admin");
  }
  if (resource === "admin") {
    return action === "read"
      ? hasRole(roles, "admin") || hasRole(roles, "stewardship") || hasRole(roles, "data_owner")
      : hasRole(roles, "admin");
  }
  if (resource === "integrations") {
    return action === "read"
      ? hasRole(roles, "admin") ||
          hasRole(roles, "editor") ||
          hasRole(roles, "stewardship") ||
          hasRole(roles, "data_owner")
      : hasRole(roles, "admin");
  }
  if (resource === "dataLake") {
    // /datalakes catalog browser: read-only for editor/viewer; writes (governance, scans,
    // SLA overrides) remain admin-only.
    return action === "read"
      ? hasRole(roles, "admin") ||
          hasRole(roles, "editor") ||
          hasRole(roles, "viewer") ||
          hasRole(roles, "stewardship") ||
          hasRole(roles, "data_owner")
      : hasRole(roles, "admin");
  }

  if (isEditorRole(roles, perms)) {
    if (action === "read") return true;
    return !["datasources", "audit", "admin", "stewardship"].includes(resource);
  }

  if (hasRole(roles, "stewardship") || hasRole(roles, "data_owner")) {
    return action === "read";
  }

  if (isViewerRole(roles, perms)) {
    const viewerReadable =
      resource === "home" ||
      resource === "explorer" ||
      resource === "lineage" ||
      resource === "privacyAccess" ||
      resource === "certification";
    if (action === "read") return viewerReadable;
    return false;
  }

  return false;
}
