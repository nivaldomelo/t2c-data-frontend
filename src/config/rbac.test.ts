import { describe, expect, it } from "vitest";

import {
  canAccessPath,
  canRoleAction,
  defaultRouteForRoles,
  getPrimaryRole,
  isAdminRole,
  isEditorRole,
  isViewerRole,
  normalizeRoleName,
  resourceFromPath,
} from "./rbac";

// These tests encode the RBAC decisions agreed during the role rework:
//  - admin: everything
//  - editor: view/edit everything EXCEPT datasource connections and the admin area
//  - stewardship + data_owner: read everything except admin/datasources, plus
//    review-queue (stewardship) decisions and asset-owner reassignment (data_owner)
//  - viewer: read-only catalog surface
//  - datasource access (read and write) is ADMIN-ONLY

describe("normalizeRoleName", () => {
  it("maps known aliases", () => {
    expect(normalizeRoleName("Admin")).toBe("admin");
    expect(normalizeRoleName("visualizador")).toBe("viewer");
    expect(normalizeRoleName("steward")).toBe("stewardship");
    expect(normalizeRoleName("data-owner")).toBe("data_owner");
    expect(normalizeRoleName("owner")).toBe("data_owner");
  });

  it("returns null for empty/unknown", () => {
    expect(normalizeRoleName("")).toBeNull();
    expect(normalizeRoleName(null)).toBeNull();
    expect(normalizeRoleName("nope")).toBeNull();
  });
});

describe("role predicates", () => {
  it("admin wins over editor/viewer", () => {
    expect(isAdminRole(["admin"])).toBe(true);
    expect(isAdminRole([], ["user:manage"])).toBe(true);
    expect(isEditorRole(["admin"])).toBe(false);
    expect(isViewerRole(["admin"])).toBe(false);
  });

  it("editor excludes admins, viewer excludes editor/admin", () => {
    expect(isEditorRole(["editor"])).toBe(true);
    expect(isViewerRole(["editor"])).toBe(false);
    expect(isViewerRole(["viewer"])).toBe(true);
    expect(isViewerRole([], ["*:read"])).toBe(true);
  });
});

describe("getPrimaryRole", () => {
  it("prioritizes admin > stewardship > data_owner > editor > viewer", () => {
    expect(getPrimaryRole(["admin", "viewer"])).toBe("admin");
    expect(getPrimaryRole(["stewardship", "viewer"])).toBe("stewardship");
    expect(getPrimaryRole(["data_owner", "viewer"])).toBe("data_owner");
    expect(getPrimaryRole(["editor"])).toBe("editor");
    expect(getPrimaryRole(["viewer"])).toBe("viewer");
    expect(getPrimaryRole([])).toBe("unknown");
  });
});

describe("resourceFromPath", () => {
  it("resolves the main routes", () => {
    expect(resourceFromPath("/")).toBe("home");
    expect(resourceFromPath("/datasources")).toBe("datasources");
    expect(resourceFromPath("/admin/governance")).toBe("configuration");
    expect(resourceFromPath("/admin/users")).toBe("admin");
    expect(resourceFromPath("/datalakes")).toBe("dataLake");
    expect(resourceFromPath("/integrations/airflow")).toBe("integrations");
  });
});

describe("canAccessPath", () => {
  it("denies anonymous", () => {
    expect(canAccessPath("/", [], [])).toBe(false);
  });

  it("admin reaches everything", () => {
    for (const p of ["/", "/datasources", "/admin/users", "/admin/governance", "/integrations/data-lake"]) {
      expect(canAccessPath(p, ["admin"])).toBe(true);
    }
  });

  it("data-lake CONNECTION console is admin-only", () => {
    expect(canAccessPath("/integrations/data-lake", ["editor"])).toBe(false);
    expect(canAccessPath("/integrations/data-lake", ["stewardship"])).toBe(false);
    // but the catalog browser stays open
    expect(canAccessPath("/datalakes", ["viewer"])).toBe(true);
  });

  it("governance settings page is admin-only", () => {
    expect(canAccessPath("/admin/governance", ["editor"])).toBe(false);
    expect(canAccessPath("/admin/governance", ["stewardship"])).toBe(false);
  });

  it("editor reaches everything except datasources and admin", () => {
    expect(canAccessPath("/lineage", ["editor"])).toBe(true);
    expect(canAccessPath("/audit", ["editor"])).toBe(true);
    expect(canAccessPath("/integrations", ["editor"])).toBe(true);
    expect(canAccessPath("/datasources", ["editor"])).toBe(false);
    expect(canAccessPath("/admin/users", ["editor"])).toBe(false);
  });

  it("stewardship/data_owner read everything except admin and datasources", () => {
    for (const role of ["stewardship", "data_owner"]) {
      expect(canAccessPath("/lineage", [role])).toBe(true);
      expect(canAccessPath("/governance", [role])).toBe(true);
      expect(canAccessPath("/datasources", [role])).toBe(false);
      expect(canAccessPath("/admin/users", [role])).toBe(false);
    }
  });

  it("viewer only sees the catalog read surface", () => {
    expect(canAccessPath("/explorer", ["viewer"])).toBe(true);
    expect(canAccessPath("/lineage", ["viewer"])).toBe(true);
    expect(canAccessPath("/certification", ["viewer"])).toBe(true);
    expect(canAccessPath("/governance", ["viewer"])).toBe(false);
    expect(canAccessPath("/datasources", ["viewer"])).toBe(false);
    expect(canAccessPath("/integrations", ["viewer"])).toBe(false);
  });

  it("profile and inbox are open to any authenticated role", () => {
    expect(canAccessPath("/me/profile", ["viewer"])).toBe(true);
    expect(canAccessPath("/inbox", ["viewer"])).toBe(true);
  });
});

describe("canRoleAction", () => {
  it("datasources are admin-only for read and write", () => {
    expect(canRoleAction(["admin"], "read", "datasources")).toBe(true);
    expect(canRoleAction(["admin"], "write", "datasources")).toBe(true);
    for (const role of ["editor", "stewardship", "data_owner", "viewer"]) {
      expect(canRoleAction([role], "read", "datasources")).toBe(false);
      expect(canRoleAction([role], "write", "datasources")).toBe(false);
    }
  });

  it("review-queue decisions belong to admin/stewardship/data_owner", () => {
    expect(canRoleAction(["stewardship"], "write", "stewardship")).toBe(true);
    expect(canRoleAction(["data_owner"], "write", "stewardship")).toBe(true);
    expect(canRoleAction(["editor"], "write", "stewardship")).toBe(false);
    expect(canRoleAction(["viewer"], "write", "stewardship")).toBe(false);
  });

  it("asset-owner reassignment: admin/editor/data_owner", () => {
    expect(canRoleAction(["editor"], "write", "assetOwner")).toBe(true);
    expect(canRoleAction(["data_owner"], "write", "assetOwner")).toBe(true);
    expect(canRoleAction(["stewardship"], "write", "assetOwner")).toBe(false);
    expect(canRoleAction(["viewer"], "write", "assetOwner")).toBe(false);
  });

  it("audit is read for admin/editor/stewardship/data_owner, write admin-only", () => {
    for (const role of ["editor", "stewardship", "data_owner"]) {
      expect(canRoleAction([role], "read", "audit")).toBe(true);
      expect(canRoleAction([role], "write", "audit")).toBe(false);
    }
    expect(canRoleAction(["viewer"], "read", "audit")).toBe(false);
  });

  it("governance config: read admin/editor, write admin-only", () => {
    expect(canRoleAction(["editor"], "read", "configuration")).toBe(true);
    expect(canRoleAction(["editor"], "write", "configuration")).toBe(false);
    expect(canRoleAction(["stewardship"], "read", "configuration")).toBe(false);
  });

  it("integrations: read for non-viewer collaborators, write admin-only", () => {
    for (const role of ["editor", "stewardship", "data_owner"]) {
      expect(canRoleAction([role], "read", "integrations")).toBe(true);
      expect(canRoleAction([role], "write", "integrations")).toBe(false);
    }
    expect(canRoleAction(["viewer"], "read", "integrations")).toBe(false);
  });

  it("editor can write across the board except datasources/audit/admin/stewardship", () => {
    expect(canRoleAction(["editor"], "write", "glossary")).toBe(true);
    expect(canRoleAction(["editor"], "write", "tags")).toBe(true);
    expect(canRoleAction(["editor"], "write", "datasources")).toBe(false);
    expect(canRoleAction(["editor"], "write", "admin")).toBe(false);
  });

  it("stewardship/data_owner are read-only on generic resources", () => {
    expect(canRoleAction(["stewardship"], "read", "glossary")).toBe(true);
    expect(canRoleAction(["stewardship"], "write", "glossary")).toBe(false);
    expect(canRoleAction(["data_owner"], "write", "tags")).toBe(false);
  });
});

describe("defaultRouteForRoles", () => {
  it("routes by accessible landing page", () => {
    expect(defaultRouteForRoles(["viewer"])).toBe("/explorer");
    expect(defaultRouteForRoles([])).toBe("/login");
  });
});
