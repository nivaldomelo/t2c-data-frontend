import { Link } from "@/lib/next-shims";
import { usePathname, useRouter } from "@/lib/next-shims";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { PageIntro } from "@/components/ui/page-intro";
import { ThemeSync } from "@/components/theme-sync";
import {
  Activity,
  Bell,
  ChartNoAxesCombined,
  ChevronDown,
  ChevronRight,
  Eye,
  Menu,
  LogOut,
  Radar,
  Share2,
  ShieldAlert,
  ShieldCheck,
  Table2,
  UserCircle2,
  Search,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { recordUserAuditHeartbeat, recordUserAuditPageView } from "@/features/user-audit/api";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/client-api";
import { cn } from "@/lib/cn";
import { getRoleVisuals } from "@/config/rbac";
import { GlobalSearchBox } from "@/features/search/components/global-search-box";

type NavItem = {
  href: string;
  labelKey: string;
  icon?: React.ComponentType<{ className?: string }>;
  children?: Array<{ href: string; labelKey: string }>;
};

type NavSection = {
  key: string;
  titleKey: string;
  itemHrefs: string[];
};

const nav: NavItem[] = [
  { href: "/dashboard", labelKey: "nav.dashboard", icon: ChartNoAxesCombined },
  { href: "/explorer", labelKey: "nav.explorer", icon: Eye },
  { href: "/explorer/data-journey", labelKey: "nav.dataJourney", icon: Activity },
  { href: "/lineage", labelKey: "nav.lineage", icon: Share2 },
  { href: "/datalakes", labelKey: "nav.datalakes", icon: Table2 },
  { href: "/inbox", labelKey: "nav.inbox", icon: Bell },
  {
    href: "/data-quality",
    labelKey: "nav.dataQuality",
    icon: ChartNoAxesCombined,
    children: [
      { href: "/data-quality", labelKey: "nav.dataQualityOverview" },
      { href: "/data-quality/observability", labelKey: "nav.dataQualityObservability" },
      { href: "/data-quality/rules", labelKey: "nav.dataQualityRules" },
      { href: "/data-quality/profiling-executions", labelKey: "nav.dataQualityProfiling" },
    ],
  },
  {
    href: "/governance",
    labelKey: "nav.governanceHub",
    icon: ShieldAlert,
    children: [
      { href: "/governance/pending-center", labelKey: "nav.pendingCenter" },
      { href: "/governance/domains", labelKey: "nav.semanticDomains" },
      { href: "/governance/data-products", labelKey: "nav.semanticProducts" },
      { href: "/governance/stewardship", labelKey: "nav.stewardship" },
      { href: "/governance/classification-review", labelKey: "nav.classificationReview" },
      { href: "/governance/intelligence", labelKey: "nav.intelligenceHub" },
      { href: "/governance/timeline", labelKey: "nav.governanceTimeline" },
      { href: "/governance/collaboration", labelKey: "nav.collaboration" },
      { href: "/governance/dictionary", labelKey: "nav.dictionary" },
      { href: "/tags", labelKey: "nav.tags" },
      { href: "/glossary", labelKey: "nav.glossary" },
      { href: "/certification", labelKey: "nav.certification" },
      { href: "/privacy-access", labelKey: "nav.privacyAccess" },
      { href: "/data-owners", labelKey: "nav.dataOwners" },
    ],
  },
  {
    href: "/ops/cockpit",
    labelKey: "nav.operationsHub",
    icon: Radar,
    children: [
      { href: "/ops/cockpit", labelKey: "nav.opsCockpit" },
      { href: "/ops/ingestion", labelKey: "nav.opsIngestion" },
      { href: "/incidents/tickets", labelKey: "nav.incidentsTickets" },
    ],
  },
  {
    href: "/integrations",
    labelKey: "nav.integrations",
    icon: Radar,
    children: [
      { href: "/datasources", labelKey: "nav.datasources" },
      { href: "/integrations/airflow", labelKey: "nav.integrationsAirflow" },
      { href: "/integrations/metabase", labelKey: "nav.integrationsMetabase" },
      { href: "/integrations/data-lake", labelKey: "nav.integrationsDataLake" },
      { href: "/integrations/api", labelKey: "nav.integrationsApi" },
    ],
  },
  {
    href: "/admin",
    labelKey: "nav.admin",
    icon: ShieldCheck,
    children: [
      { href: "/admin/users", labelKey: "nav.adminUsers" },
      { href: "/admin/roles", labelKey: "nav.adminRoles" },
      { href: "/admin/permissions", labelKey: "nav.adminPermissions" },
      { href: "/admin/access", labelKey: "nav.adminAccess" },
      { href: "/admin/audit", labelKey: "nav.adminUserAudit" },
      { href: "/admin/governance", labelKey: "nav.configuration" },
    ],
  },
];

const navSections: NavSection[] = [
  {
    key: "core",
    titleKey: "nav.sections.core",
    itemHrefs: ["/dashboard", "/explorer", "/explorer/data-journey", "/lineage", "/datalakes", "/inbox"],
  },
  {
    key: "quality",
    titleKey: "nav.sections.quality",
    itemHrefs: ["/data-quality"],
  },
  {
    key: "governance",
    titleKey: "nav.sections.governance",
    itemHrefs: ["/governance"],
  },
  {
    key: "operations",
    titleKey: "nav.sections.operations",
    itemHrefs: ["/ops/cockpit"],
  },
  {
    key: "integrations",
    titleKey: "nav.sections.integrations",
    itemHrefs: ["/integrations"],
  },
];
const ADMIN_MENU_EXPANDED_KEY = "t2c.sidebar.admin.expanded";
const DATA_QUALITY_MENU_EXPANDED_KEY = "t2c.sidebar.dataquality.expanded";
const GOVERNANCE_MENU_EXPANDED_KEY = "t2c.sidebar.governance.expanded";
const OPERATIONS_MENU_EXPANDED_KEY = "t2c.sidebar.operations.expanded";
const INTEGRATIONS_MENU_EXPANDED_KEY = "t2c.sidebar.integrations.expanded";
const SIDEBAR_IDLE_MS = 240;
const SIDEBAR_EXPANDED_WIDTH = 240;
const SIDEBAR_COLLAPSED_WIDTH = 72;

function pageTitle(pathname: string, t: (key: string) => string): string {
  if (pathname === "/") return t("pages.home.title");
  if (pathname.startsWith("/explorer/data-journey")) return t("pages.dataJourney.title");
  if (pathname.startsWith("/incidents")) return t("nav.incidentsTickets");
  if (pathname.startsWith("/ops/ingestion")) return t("nav.opsIngestion");
  if (pathname.startsWith("/ops/automations")) return t("pages.opsAutomations.title");
  if (pathname.startsWith("/ops/cockpit")) return t("nav.opsCockpit");
  if (pathname.startsWith("/integrations/api")) return t("pages.integrationsApi.title");
  if (pathname.startsWith("/integrations/data-sources")) return t("pages.datasources.title");
  if (pathname.startsWith("/integrations/data-lake")) return t("pages.integrationsDataLake.title");
  if (pathname.startsWith("/integrations/airflow")) return t("pages.integrationsAirflow.title");
  if (pathname.startsWith("/integrations/metabase")) return t("pages.integrationsMetabase.title");
  if (pathname.startsWith("/integrations")) return t("pages.integrations.title");
  if (pathname.startsWith("/dashboard/campaigns")) return t("pages.dashboardCampaigns.title");
  if (pathname.startsWith("/dashboard/strategy")) return t("pages.dashboardStrategy.title");
  if (pathname.startsWith("/governance/intelligence")) return t("pages.intelligenceHub.title");
  if (pathname.startsWith("/dashboard")) return t("pages.dashboard.title");
  if (pathname.startsWith("/inbox")) return t("pages.inbox.title");
  if (pathname.startsWith("/tags")) return t("pages.tags.title");
  if (pathname.startsWith("/glossary")) return t("pages.glossary.title");
  if (pathname.startsWith("/data-quality/observability")) return t("pages.dataQualityObservability.title");
  if (pathname.startsWith("/governance/classification-review")) return t("pages.classificationReview.title");
  if (pathname.startsWith("/governance/domains")) return t("pages.semanticDomains.title");
  if (pathname.startsWith("/governance/data-products")) return t("pages.semanticProducts.title");
  if (pathname.startsWith("/governance/timeline")) return t("pages.governanceTimeline.title");
  if (pathname.startsWith("/governance/pending-center")) return t("pages.governancePending.title");
  if (pathname.startsWith("/governance/stewardship")) return t("pages.governanceStewardship.title");
  if (pathname.startsWith("/governance/collaboration")) return t("pages.governanceCollaboration.title");
  if (pathname.startsWith("/governance/dictionary")) return t("pages.dictionary.title");
  if (pathname.startsWith("/governance")) return t("nav.governanceHub");
  if (pathname.startsWith("/privacy-access")) return t("nav.privacyAccess");
  if (pathname.startsWith("/admin/governance")) return t("nav.configuration");
  if (pathname.startsWith("/admin/users")) return t("nav.adminUsers");
  if (pathname.startsWith("/admin/roles")) return t("nav.adminRoles");
  if (pathname.startsWith("/admin/audit")) return t("nav.adminUserAudit");
  if (pathname.startsWith("/admin/permissions")) return t("nav.adminPermissions");
  if (pathname.startsWith("/admin/access")) return t("nav.adminAccess");
  if (pathname.startsWith("/admin")) return t("nav.admin");
  if (pathname.startsWith("/search/aliases")) return t("pages.searchAliases.title");
  if (pathname.startsWith("/me/profile")) return "Meu perfil";
  if (pathname.startsWith("/me")) return "Meu perfil";
  const item = nav.find((i) => i.href === pathname && !i.children);
  if (item) return t(item.labelKey);
  if (pathname.startsWith("/tables/")) return t("pages.explorer.title");
  if (pathname.startsWith("/scan-runs")) return t("pages.datasources.title");
  if (pathname.startsWith("/search")) return t("pages.search.title");
  if (pathname.startsWith("/datalakes")) return t("pages.datalakes.title");
  if (pathname.startsWith("/daily-use/datalakes")) return t("pages.datalakes.title");
  if (pathname.startsWith("/daily-use")) return t("pages.datalakes.title");
  if (pathname.startsWith("/data-owners")) return t("nav.dataOwners");
  if (pathname.startsWith("/certification")) return t("nav.certification");
  if (pathname.startsWith("/data-quality/rules")) return t("nav.dataQualityRules");
  if (pathname.startsWith("/data-quality")) return t("nav.dataQuality");
  if (pathname.startsWith("/lineage")) return t("nav.lineage");
  if (pathname.startsWith("/datasources")) return t("nav.datasources");
  return "T2C Data";
}

function sectionLabel(pathname: string, t: (key: string) => string): string {
  if (pathname.startsWith("/dashboard") || pathname === "/") return "Resumo";
  if (pathname.startsWith("/explorer") || pathname.startsWith("/tables") || pathname.startsWith("/datalakes") || pathname.startsWith("/daily-use")) {
    return t("nav.sections.core");
  }
  if (pathname.startsWith("/data-quality")) return t("nav.sections.quality");
  if (pathname.startsWith("/governance") || pathname.startsWith("/certification") || pathname.startsWith("/privacy-access") || pathname.startsWith("/data-owners") || pathname.startsWith("/glossary") || pathname.startsWith("/tags")) {
    return t("nav.sections.governance");
  }
  if (pathname.startsWith("/ops") || pathname.startsWith("/incidents")) return t("nav.sections.operations");
  if (pathname.startsWith("/integrations") || pathname.startsWith("/datasources")) return t("nav.sections.integrations");
  if (pathname.startsWith("/admin")) return t("nav.sections.admin");
  if (pathname.startsWith("/me")) return "Conta";
  if (pathname.startsWith("/search")) return "Busca";
  if (pathname.startsWith("/inbox")) return "Inbox";
  return "T2C Data";
}

type BreadcrumbItem = { label: string; href?: string };

function getBreadcrumbs(pathname: string, t: (key: string) => string): BreadcrumbItem[] {
  const current = pageTitle(pathname, t);
  const section = sectionLabel(pathname, t);
  if (!current || current === "T2C Data") return [];
  if (section === current) return [{ label: current }];
  if (section === "T2C Data") return [{ label: current }];
  return [
    { label: section },
    { label: current },
  ];
}

function getSearchPlaceholder(pathname: string, t: (key: string) => string): string {
  if (pathname.startsWith("/explorer/data-journey")) return "Buscar fonte, schema, tabela, owner ou domínio...";
  if (pathname.startsWith("/integrations")) return "Buscar integrações, conexões e chaves...";
  if (pathname.startsWith("/ops") || pathname.startsWith("/incidents")) return "Buscar incidentes, filas e alertas...";
  if (pathname.startsWith("/governance") || pathname.startsWith("/certification") || pathname.startsWith("/privacy-access") || pathname.startsWith("/data-owners") || pathname.startsWith("/glossary") || pathname.startsWith("/tags")) {
    return "Buscar domínios, owners e glossário...";
  }
  if (pathname.startsWith("/data-quality/observability")) return "Buscar tabelas monitoradas, incidentes e sinais...";
  if (pathname.startsWith("/data-quality")) return "Buscar regras, tabelas e sinais de qualidade...";
  if (pathname.startsWith("/me") || pathname.startsWith("/inbox")) return "Buscar notificações, preferências e ativos...";
  if (pathname.startsWith("/explorer") || pathname.startsWith("/tables") || pathname.startsWith("/datalakes")) return "Buscar tabelas, colunas e ativos...";
  return t("common.searchCatalog");
}

function inferPageKey(pathname: string): string | null {
  if (pathname.startsWith("/explorer/data-journey")) return "data_journey";
  if (pathname.startsWith("/explorer")) return "explorer";
  if (pathname.startsWith("/data-quality/observability") || pathname.startsWith("/data-quality/rules") || pathname.startsWith("/data-quality")) return "data_quality";
  if (pathname.startsWith("/privacy-access")) return "privacy";
  if (pathname.startsWith("/certification")) return "certification";
  if (pathname.startsWith("/incidents")) return "incidents";
  if (pathname.startsWith("/data-owners")) return "owners";
  if (pathname.startsWith("/datasources")) return "data_sources";
  if (pathname.startsWith("/datalakes")) return "data_lake";
  if (pathname.startsWith("/ops")) return "ops";
  if (pathname.startsWith("/lineage")) return "lineage";
  if (pathname.startsWith("/admin/audit")) return "admin_users";
  if (pathname.startsWith("/admin")) return "admin_users";
  if (pathname.startsWith("/me")) return "profile";
  if (pathname.startsWith("/search")) return "search";
  if (pathname.startsWith("/audit")) return "audit";
  return null;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const pathname = usePathname();
  // Map the current route to a PageIntro registry id (e.g. /governance/domains -> governance.domains).
  // PageIntro renders nothing when there is no matching entry (e.g. detail/[id] pages).
  const introId = (pathname ?? "").replace(/^\/+/, "").replace(/\/+$/, "").replace(/\//g, ".");
  const router = useRouter();
  const auth = useAuth();
  const [globalQuery, setGlobalQuery] = useState("");
  const [collapsed, setCollapsed] = useState(true);
  const [dataQualityExpanded, setDataQualityExpanded] = useState(false);
  const [adminExpanded, setAdminExpanded] = useState(false);
  const [governanceExpanded, setGovernanceExpanded] = useState(false);
  const [operationsExpanded, setOperationsExpanded] = useState(false);
  const [integrationsExpanded, setIntegrationsExpanded] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [inboxUnread, setInboxUnread] = useState(0);
  const [mfaWarning, setMfaWarning] = useState<string | null>(null);
  const [passwordWarning, setPasswordWarning] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setMfaWarning(window.sessionStorage.getItem("t2c.mfaWarning"));
    setPasswordWarning(window.sessionStorage.getItem("t2c.passwordWarning"));
  }, []);

  function dismissMfaWarning() {
    if (typeof window !== "undefined") window.sessionStorage.removeItem("t2c.mfaWarning");
    setMfaWarning(null);
  }

  function dismissPasswordWarning() {
    if (typeof window !== "undefined") window.sessionStorage.removeItem("t2c.passwordWarning");
    setPasswordWarning(null);
  }
  const sidebarRef = useRef<HTMLElement | null>(null);
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const collapseTimerRef = useRef<number | null>(null);

  const breadcrumbItems = useMemo(() => getBreadcrumbs(pathname, t), [pathname, t]);
  const searchPlaceholder = useMemo(() => getSearchPlaceholder(pathname, t), [pathname, t]);
  const headerAreaLabel = useMemo(() => sectionLabel(pathname, t), [pathname, t]);
  const roleVisuals = useMemo(() => getRoleVisuals(auth.primaryRole), [auth.primaryRole]);
  const canSeeAdmin = auth.canAccessPath("/admin/users");
  const isAdminPath = pathname.startsWith("/admin");
  const isGovernancePath =
    pathname.startsWith("/governance") ||
    pathname.startsWith("/certification") ||
    pathname.startsWith("/privacy-access") ||
    pathname.startsWith("/data-owners") ||
    pathname.startsWith("/glossary") ||
    pathname.startsWith("/tags");
  const isOperationsPath = pathname.startsWith("/ops") || pathname.startsWith("/incidents");
  const isIntegrationsPath = pathname.startsWith("/integrations");
  const isDataQualityPath = pathname.startsWith("/data-quality");
  const topLevelNav = nav.filter((item) => {
    if (!item.children) return auth.canAccessPath(item.href);
    return item.children.some((child) => auth.canAccessPath(child.href));
  });
  const navLookup = useMemo(() => new Map(topLevelNav.map((item) => [item.href, item])), [topLevelNav]);
  const visibleSections = useMemo(
    () =>
      navSections
        .map((section) => ({
          ...section,
          items: section.itemHrefs.map((href) => navLookup.get(href)).filter(Boolean) as NavItem[],
        }))
        .filter((section) => section.items.length > 0),
    [navLookup],
  );
  const adminItem = nav.find((item) => item.href === "/admin");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const persisted = window.localStorage.getItem(ADMIN_MENU_EXPANDED_KEY);
    if (persisted === "true" || persisted === "false") {
      setAdminExpanded(persisted === "true");
      return;
    }
    setAdminExpanded(isAdminPath);
  }, [isAdminPath]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const persisted = window.localStorage.getItem(DATA_QUALITY_MENU_EXPANDED_KEY);
    if (persisted === "true" || persisted === "false") {
      setDataQualityExpanded(persisted === "true");
      return;
    }
    setDataQualityExpanded(isDataQualityPath);
  }, [isDataQualityPath]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const persisted = window.localStorage.getItem(GOVERNANCE_MENU_EXPANDED_KEY);
    if (persisted === "true" || persisted === "false") {
      setGovernanceExpanded(persisted === "true");
      return;
    }
    setGovernanceExpanded(isGovernancePath);
  }, [isGovernancePath]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const persisted = window.localStorage.getItem(OPERATIONS_MENU_EXPANDED_KEY);
    if (persisted === "true" || persisted === "false") {
      setOperationsExpanded(persisted === "true");
      return;
    }
    setOperationsExpanded(isOperationsPath);
  }, [isOperationsPath]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const persisted = window.localStorage.getItem(INTEGRATIONS_MENU_EXPANDED_KEY);
    if (persisted === "true" || persisted === "false") {
      setIntegrationsExpanded(persisted === "true");
      return;
    }
    setIntegrationsExpanded(isIntegrationsPath);
  }, [isIntegrationsPath]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(ADMIN_MENU_EXPANDED_KEY, String(adminExpanded));
  }, [adminExpanded]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(DATA_QUALITY_MENU_EXPANDED_KEY, String(dataQualityExpanded));
  }, [dataQualityExpanded]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(GOVERNANCE_MENU_EXPANDED_KEY, String(governanceExpanded));
  }, [governanceExpanded]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(OPERATIONS_MENU_EXPANDED_KEY, String(operationsExpanded));
  }, [operationsExpanded]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(INTEGRATIONS_MENU_EXPANDED_KEY, String(integrationsExpanded));
  }, [integrationsExpanded]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node | null;
      if (userMenuRef.current && target && !userMenuRef.current.contains(target)) {
        setUserMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setUserMenuOpen(false);
      }
    }

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, []);

  useEffect(() => {
    scheduleSidebarCollapse();
    setUserMenuOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    if (!auth.isAuthenticated) return;
    void recordUserAuditPageView({
      routePath: pathname,
      pageKey: inferPageKey(pathname),
      metadata: {
        title: pageTitle(pathname, t),
        section: sectionLabel(pathname, t),
      },
    });
  }, [auth.isAuthenticated, pathname, t]);

  useEffect(() => {
    if (!auth.isAuthenticated) return undefined;
    void recordUserAuditHeartbeat();
    const timer = window.setInterval(() => {
      void recordUserAuditHeartbeat();
    }, 60_000);
    return () => window.clearInterval(timer);
  }, [auth.isAuthenticated]);

  useEffect(() => {
    if (!auth.isAuthenticated) {
      setInboxUnread(0);
      return;
    }
    setInboxUnread(auth.unreadNotifications);
  }, [auth.isAuthenticated, auth.unreadNotifications]);

  useEffect(() => {
    let cancelled = false;
    async function loadInboxUnread() {
      try {
        const summary = await apiRequest<{ unread: number }>("/v1/me/inbox/summary");
        if (!cancelled) setInboxUnread(Number(summary.unread || 0));
      } catch {
        if (!cancelled) setInboxUnread(auth.unreadNotifications);
      }
    }

    if (!auth.isAuthenticated) {
      return () => {
        cancelled = true;
      };
    }
    void loadInboxUnread();
    function handleInboxChanged() {
      void loadInboxUnread();
    }
    window.addEventListener("inbox:changed", handleInboxChanged as EventListener);
    return () => {
      cancelled = true;
      window.removeEventListener("inbox:changed", handleInboxChanged as EventListener);
    };
  }, [auth.isAuthenticated]);

  useEffect(() => {
    return () => {
      if (collapseTimerRef.current) {
        window.clearTimeout(collapseTimerRef.current);
      }
    };
  }, []);

  function onLogout(): void {
    void auth.logout();
  }

  function onGlobalSearch(query: string): void {
    const q = query.trim();
    if (!q) {
      router.push("/search");
      return;
    }
    router.push(`/search?q=${encodeURIComponent(q)}`);
  }

  function clearSidebarCollapseTimer(): void {
    if (collapseTimerRef.current) {
      window.clearTimeout(collapseTimerRef.current);
      collapseTimerRef.current = null;
    }
  }

  function expandSidebar(): void {
    clearSidebarCollapseTimer();
    setCollapsed(false);
  }

  function scheduleSidebarCollapse(): void {
    clearSidebarCollapseTimer();
    collapseTimerRef.current = window.setTimeout(() => {
      const activeElement = document.activeElement;
      const stillInside = activeElement instanceof HTMLElement && sidebarRef.current?.contains(activeElement);
      if (stillInside) return;
      setCollapsed(true);
    }, SIDEBAR_IDLE_MS);
  }

  function toggleSidebar(): void {
    if (collapsed) {
      expandSidebar();
      return;
    }
    clearSidebarCollapseTimer();
    setCollapsed(true);
  }

  function handleSidebarBlur(event: React.FocusEvent<HTMLElement>): void {
    const nextTarget = event.relatedTarget;
    if (nextTarget instanceof Node && sidebarRef.current?.contains(nextTarget)) return;
    scheduleSidebarCollapse();
  }

  function handleNavItemClick(): void {
    scheduleSidebarCollapse();
  }

  function renderNavLink(item: NavItem): React.ReactNode {
    const active =
      pathname === item.href ||
      (item.href === "/dashboard" && pathname.startsWith("/dashboard")) ||
      (item.href === "/explorer" && (pathname === "/explorer" || pathname.startsWith("/tables"))) ||
      (item.href === "/explorer/data-journey" && pathname.startsWith("/explorer/data-journey")) ||
      (item.href === "/datalakes" && pathname.startsWith("/datalakes")) ||
      (item.href === "/data-quality" && pathname === "/data-quality");
    const Icon = item.icon ?? ShieldCheck;

    return (
      <Link
        className={cn(
          "group flex items-center rounded-2xl py-2.5 text-sm transition-all duration-200 ease-out",
          collapsed ? "justify-center px-2" : "gap-2 px-3.5",
          active
            ? "border border-brand-200/80 bg-gradient-to-r from-brand-50 via-white to-accent-50 text-brand-700 shadow-sm"
            : "text-text-body hover:border hover:border-border/60 hover:bg-surface/80 hover:text-text",
        )}
        href={item.href}
        key={item.href}
        onClick={handleNavItemClick}
        title={collapsed ? t(item.labelKey) : undefined}
      >
        <span
          className={cn(
            "h-4 w-0.5 shrink-0 rounded-full transition-[margin,opacity] duration-200 ease-out motion-reduce:transition-none",
            active ? "bg-brand-500" : "bg-transparent",
            collapsed ? "mr-0 opacity-0" : "mr-0.5 opacity-100",
          )}
        />
        <Icon
          className={cn(
            "h-4 w-4 shrink-0 text-muted transition-[opacity,transform,color] duration-200 ease-out motion-reduce:transition-none",
            active ? "text-brand-700" : "opacity-90 group-hover:opacity-100 group-hover:text-text-body",
          )}
        />
        <span
          className={cn(
            "overflow-hidden whitespace-nowrap transition-[max-width,opacity,transform] duration-200 ease-out motion-reduce:transition-none",
            collapsed ? "max-w-0 translate-x-[-2px] opacity-0" : "max-w-[160px] translate-x-0 opacity-100",
          )}
        >
          {t(item.labelKey)}
        </span>
      </Link>
    );
  }

  function renderNavGroup(
    item: NavItem,
    {
      expanded,
      onToggle,
      active,
    }: {
      expanded: boolean;
      onToggle: () => void;
      active: boolean;
    },
  ): React.ReactNode {
    const Icon = item.icon ?? ShieldCheck;
    const children = (item.children ?? []).filter((child) => auth.canAccessPath(child.href));
    if (!children.length) return null;

    if (collapsed) {
      return (
        <Link
          className={cn(
            "group flex items-center justify-center rounded-2xl px-2 py-2.5 text-sm transition-all duration-200 ease-out",
            active
              ? "border border-brand-200/80 bg-gradient-to-r from-brand-50 via-white to-accent-50 text-brand-700 shadow-sm"
              : "text-text-body hover:border hover:border-border/60 hover:bg-surface/80 hover:text-text",
          )}
          href={children[0].href}
          onClick={handleNavItemClick}
          title={t(item.labelKey)}
        >
          <Icon
            className={cn(
              "h-4 w-4 text-muted transition-opacity",
              active ? "text-brand-700" : "opacity-90 group-hover:opacity-100 group-hover:text-text-body",
            )}
          />
        </Link>
      );
    }

    return (
      <>
        <button
          aria-expanded={expanded}
          className={cn(
            "group flex w-full items-center rounded-2xl px-3.5 py-2.5 text-sm transition-all duration-200 ease-out",
            active
              ? "border border-brand-200/80 bg-gradient-to-r from-brand-50 via-white to-accent-50 text-brand-700 shadow-sm"
              : "text-text-body hover:border hover:border-border/60 hover:bg-surface/80 hover:text-text",
          )}
          onClick={onToggle}
          type="button"
        >
          <span className="flex min-w-0 flex-1 items-center">
            <Icon
              className={cn(
                "h-4 w-4 text-muted transition-opacity",
                active ? "text-brand-700" : "opacity-90 group-hover:opacity-100 group-hover:text-text-body",
              )}
            />
            <span className={cn("mr-2 h-4 w-0.5 rounded-full", active ? "bg-brand-500" : "bg-transparent")} />
            <span className="truncate">{t(item.labelKey)}</span>
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted transition-transform group-hover:text-text-body",
              expanded ? "rotate-180" : "rotate-0",
            )}
          />
        </button>
        {expanded ? (
          <div className="mt-1 space-y-1 overflow-hidden pl-4 transition-all duration-200 ease-out motion-reduce:transition-none">
            {children.map((child) => {
              const childActive =
                child.href === "/data-quality"
                  ? pathname === "/data-quality"
                  : pathname === child.href || pathname.startsWith(`${child.href}/`);
              return (
                <Link
                  className={cn(
                    "block rounded-xl px-3 py-2 text-sm transition-all duration-200 ease-out",
                    childActive
                      ? "border border-brand-200/80 bg-brand-50 text-brand-700 shadow-sm"
                      : "text-text-body hover:border hover:border-border/60 hover:bg-surface/80 hover:text-text",
                  )}
                  href={child.href}
                  key={child.href}
                  onClick={handleNavItemClick}
                >
                  {t(child.labelKey)}
                </Link>
              );
            })}
          </div>
        ) : null}
      </>
    );
  }

  return (
    <div className="min-h-screen text-text">
      <ThemeSync />
      <div
        className={cn(
          "grid min-h-screen grid-cols-1 transition-[grid-template-columns] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
        )}
        style={{
          gridTemplateColumns:
            typeof window === "undefined"
              ? undefined
              : window.innerWidth >= 1024
                ? `${collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_EXPANDED_WIDTH}px minmax(0,1fr)`
                : undefined,
        }}
      >
        <aside
          className={cn(
            "hidden overflow-hidden border-r border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(248,250,252,0.92)_100%)] shadow-[12px_0_36px_rgba(15,23,42,0.04)] transition-[width,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none lg:block",
            collapsed ? "lg:w-[72px]" : "lg:w-[240px]",
          )}
          onBlurCapture={handleSidebarBlur}
          onFocusCapture={expandSidebar}
          onMouseEnter={expandSidebar}
          onMouseLeave={scheduleSidebarCollapse}
          ref={sidebarRef}
        >
          <div
            className={cn(
              "flex h-16 items-center border-b border-border/60 transition-[padding,gap] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
              collapsed ? "justify-center px-2" : "gap-2 px-5",
            )}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 via-brand-500 to-accent-500 text-white shadow-[0_14px_28px_rgba(30,64,175,0.18)]">
              <Activity className="h-[18px] w-[18px] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none" />
            </div>
            <strong
              className={cn(
                "overflow-hidden whitespace-nowrap text-sm font-semibold tracking-[-0.01em] text-brand-700 transition-[max-width,opacity,transform] duration-250 ease-out motion-reduce:transition-none",
                collapsed ? "max-w-0 -translate-x-1 opacity-0" : "max-w-[120px] translate-x-0 opacity-100",
              )}
            >
              T2C Data
            </strong>
            <Button
              aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
              className={cn("ml-auto", collapsed && "ml-0")}
              onClick={toggleSidebar}
              size="sm"
              title={collapsed ? "Expandir menu" : "Recolher menu"}
              variant="ghost"
            >
              <Menu className="h-4 w-4 text-muted transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none" />
            </Button>
          </div>
          <nav
            className={cn(
              "space-y-1.5 py-4 transition-[padding] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
              collapsed ? "px-2" : "px-3",
            )}
          >
            {visibleSections.map((section) => (
              <div className="space-y-1" key={section.key}>
                {!collapsed ? (
                  <div className="px-3.5 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
                    {t(section.titleKey)}
                  </div>
                ) : null}
                {section.items.map((item) => {
                  if (item.href === "/governance") {
                    return (
                      <div key={item.href}>
                        {renderNavGroup(item, {
                          expanded: governanceExpanded,
                          onToggle: () => setGovernanceExpanded((prev) => !prev),
                          active: isGovernancePath,
                        })}
                      </div>
                    );
                  }
                  if (item.href === "/data-quality") {
                    return (
                      <div key={item.href}>
                        {renderNavGroup(item, {
                          expanded: dataQualityExpanded,
                          onToggle: () => setDataQualityExpanded((prev) => !prev),
                          active: isDataQualityPath,
                        })}
                      </div>
                    );
                  }
                  if (item.href === "/ops/cockpit") {
                    return (
                      <div key={item.href}>
                        {renderNavGroup(item, {
                          expanded: operationsExpanded,
                          onToggle: () => setOperationsExpanded((prev) => !prev),
                          active: isOperationsPath,
                        })}
                      </div>
                    );
                  }
                  if (item.href === "/integrations") {
                    return (
                      <div key={item.href}>
                        {renderNavGroup(item, {
                          expanded: integrationsExpanded,
                          onToggle: () => setIntegrationsExpanded((prev) => !prev),
                          active: isIntegrationsPath,
                        })}
                      </div>
                    );
                  }
                  return <div key={item.href}>{renderNavLink(item)}</div>;
                })}
              </div>
            ))}

            {canSeeAdmin && adminItem ? (
              <div className="pt-3">
                {!collapsed ? (
                  <div className="px-3.5 pb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
                    {t("nav.sections.admin")}
                  </div>
                ) : null}
                {renderNavGroup(adminItem, {
                  expanded: adminExpanded,
                  onToggle: () => setAdminExpanded((prev) => !prev),
                  active: isAdminPath,
                })}
              </div>
            ) : null}
          </nav>
        </aside>

        <div className="min-w-0">
          <header className="sticky top-0 z-20 border-b border-border/70 bg-surface/88 backdrop-blur-xl">
            <div className="h-[3px] w-full bg-gradient-to-r from-brand-600 via-accent-500 to-brand-600" />
            <div className="mx-auto grid max-w-[1600px] grid-cols-1 gap-3 px-3 py-2.5 lg:grid-cols-[minmax(0,1fr)_minmax(260px,560px)_auto] lg:items-center lg:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 via-brand-500 to-accent-500 text-white shadow-[0_14px_28px_rgba(30,64,175,0.18)]">
                  <Activity className="h-[18px] w-[18px]" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <strong className="truncate text-sm font-semibold tracking-[-0.01em]">T2C Data</strong>
                    <span className="rounded-full border border-border bg-bg-subtle px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-text-body">
                      {headerAreaLabel}
                    </span>
                  </div>
                  {pathname === "/" || pathname.startsWith("/dashboard") ? (
                    <p className="mt-0.5 hidden text-xs text-muted sm:block">Dados, governança e operação em um único ambiente confiável.</p>
                  ) : null}
                </div>
              </div>

              <div className="min-w-0">
                <div className="hidden md:block">
                  <GlobalSearchBox
                    className="w-full"
                    compact
                    enableShortcuts
                    onSearch={onGlobalSearch}
                    onValueChange={setGlobalQuery}
                    placeholder={searchPlaceholder}
                    value={globalQuery}
                  />
                </div>
                <div className="flex md:hidden">
                  <Button asChild className="w-full justify-center" size="sm" variant="outline">
                    <Link aria-label="Abrir busca global" href="/search">
                      <Search className="mr-2 h-4 w-4" />
                      Buscar
                    </Link>
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2">
                <Button
                  aria-label={inboxUnread > 0 ? `${inboxUnread} notificações não lidas na Inbox` : "Abrir Inbox"}
                  className="relative justify-start gap-2 px-3"
                  onClick={() => router.push("/inbox")}
                  size="sm"
                  variant="ghost"
                >
                  <Bell className="h-4 w-4" />
                  <span className="hidden sm:inline">{t("nav.inbox")}</span>
                  {inboxUnread > 0 ? (
                    <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-warning-100 px-1.5 py-0.5 text-[10px] font-semibold text-warning-700">
                      {inboxUnread > 99 ? "99+" : inboxUnread}
                    </span>
                  ) : null}
                </Button>

                <div className="relative" ref={userMenuRef}>
                  <button
                    aria-expanded={userMenuOpen}
                    aria-label={`${auth.displayName}, ${roleVisuals.label}`}
                    className="inline-flex h-10 items-center gap-2 rounded-2xl border border-border/70 bg-surface/90 px-3 text-xs text-text-body shadow-[0_12px_28px_rgba(15,23,42,0.04)] transition hover:border-border-strong hover:bg-bg-subtle"
                    onClick={() => setUserMenuOpen((prev) => !prev)}
                    type="button"
                  >
                    <UserCircle2 className={cn("h-4 w-4", roleVisuals.iconClassName)} />
                    <span className="hidden max-w-[160px] truncate sm:inline">{auth.displayName}</span>
                    <span
                      className={cn(
                        "hidden rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] md:inline",
                        roleVisuals.badgeClassName,
                      )}
                    >
                      {roleVisuals.label}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 text-muted" />
                  </button>

                  {userMenuOpen ? (
                    <div className="absolute right-0 top-12 z-20 w-72 rounded-2xl border border-border/70 bg-surface p-2 shadow-card">
                      <div className="border-b border-border/60 px-3 py-2">
                        <p className="truncate text-sm font-semibold text-text">{auth.displayName}</p>
                        <p className={cn("text-xs", roleVisuals.textClassName)}>{roleVisuals.label}</p>
                      </div>
                      <div className="space-y-1 py-2">
                        <Link
                          className="flex items-center rounded-xl px-3 py-2 text-sm text-text-body transition hover:bg-bg-subtle hover:text-text"
                          href="/me/profile"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          Meu perfil
                        </Link>
                        <Link
                          className="flex items-center rounded-xl px-3 py-2 text-sm text-text-body transition hover:bg-bg-subtle hover:text-text"
                          href="/inbox"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          Inbox
                        </Link>
                        <Link
                          className="flex items-center rounded-xl px-3 py-2 text-sm text-text-body transition hover:bg-bg-subtle hover:text-text"
                          href="/audit"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          Auditoria
                        </Link>
                        {canSeeAdmin ? (
                          <Link
                            className="flex items-center rounded-xl px-3 py-2 text-sm text-text-body transition hover:bg-bg-subtle hover:text-text"
                            href="/admin/users"
                            onClick={() => setUserMenuOpen(false)}
                          >
                            Administração
                          </Link>
                        ) : null}
                        <button
                          className="flex w-full items-center rounded-xl px-3 py-2 text-sm text-text-body transition hover:bg-bg-subtle hover:text-text"
                          onClick={() => {
                            setUserMenuOpen(false);
                            onLogout();
                          }}
                          type="button"
                        >
                          <LogOut className="mr-2 h-4 w-4" />
                          Sair
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            {breadcrumbItems.length > 0 ? (
              <div className="mx-auto max-w-[1600px] px-3 pb-2 lg:px-6">
                <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted">
                  {breadcrumbItems.map((item, index) => {
                    const isLast = index === breadcrumbItems.length - 1;
                    return (
                      <div className="flex items-center gap-1.5" key={`${item.label}-${index}`}>
                        {index > 0 ? <ChevronRight className="h-3 w-3 text-muted" /> : null}
                        {item.href && !isLast ? (
                          <Link className="transition hover:text-text-body" href={item.href}>
                            {item.label}
                          </Link>
                        ) : (
                          <span className={cn(isLast ? "font-medium text-text-body" : undefined)}>{item.label}</span>
                        )}
                      </div>
                    );
                  })}
                </nav>
              </div>
            ) : null}
          </header>

          <main className="mx-auto w-full max-w-[1600px] p-3 pb-7 pt-4 lg:p-6 lg:pb-10 lg:pt-5">
            <div className="min-w-0 space-y-4">
              {mfaWarning ? (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-warning-200 bg-warning-50 px-4 py-3 text-sm text-warning-700">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 shrink-0" />
                    <span>{mfaWarning}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href="/me/profile"
                      className="rounded-lg border border-warning-500 bg-surface px-3 py-1 font-medium text-warning-700 hover:bg-warning-100"
                      onClick={dismissMfaWarning}
                    >
                      Configurar agora
                    </Link>
                    <button type="button" onClick={dismissMfaWarning} className="text-warning-700 hover:text-warning-700" aria-label="Dispensar aviso">
                      ✕
                    </button>
                  </div>
                </div>
              ) : null}
              {passwordWarning ? (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-warning-200 bg-warning-50 px-4 py-3 text-sm text-warning-700">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 shrink-0" />
                    <span>{passwordWarning}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href="/me/profile"
                      className="rounded-lg border border-warning-500 bg-surface px-3 py-1 font-medium text-warning-700 hover:bg-warning-100"
                      onClick={dismissPasswordWarning}
                    >
                      Trocar senha
                    </Link>
                    <button type="button" onClick={dismissPasswordWarning} className="text-warning-700 hover:text-warning-700" aria-label="Dispensar aviso">
                      ✕
                    </button>
                  </div>
                </div>
              ) : null}
              <PageIntro id={introId} />
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
