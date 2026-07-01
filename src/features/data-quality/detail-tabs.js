const DETAIL_TABS = ["data-quality", "confiabilidade-acao"];
const DETAIL_TAB_ALIASES = {
  observability: "confiabilidade-acao",
};

const DETAIL_TAB_LABELS = {
  "data-quality": "Data Quality",
  "confiabilidade-acao": "Confiabilidade & Ação",
};

function isDataQualityDetailTab(value) {
  return DETAIL_TABS.includes(String(value || "").trim());
}

function normalizeDataQualityDetailTab(value) {
  const normalized = String(value || "").trim();
  if (DETAIL_TAB_ALIASES[normalized]) {
    return DETAIL_TAB_ALIASES[normalized];
  }
  return isDataQualityDetailTab(normalized) ? normalized : null;
}

function detailTabLabel(tab) {
  return DETAIL_TAB_LABELS[tab] || DETAIL_TAB_LABELS["data-quality"];
}

function buildDataQualityDetailTabHref(pathname, currentSearchParams, tab) {
  const params = new URLSearchParams(currentSearchParams?.toString() || "");
  params.set("tab", tab);
  return `${pathname}${params.toString() ? `?${params.toString()}` : ""}`;
}

export {
  DETAIL_TABS,
  DETAIL_TAB_LABELS,
  DETAIL_TAB_ALIASES,
  buildDataQualityDetailTabHref,
  detailTabLabel,
  isDataQualityDetailTab,
  normalizeDataQualityDetailTab,
};
