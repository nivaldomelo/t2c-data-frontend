export declare const DETAIL_TABS: readonly ["data-quality", "confiabilidade-acao"];
export declare const DETAIL_TAB_ALIASES: {
  readonly observability: "confiabilidade-acao";
};
export declare const DETAIL_TAB_LABELS: {
  readonly "data-quality": "Data Quality";
  readonly "confiabilidade-acao": "Confiabilidade & Ação";
};
export declare function isDataQualityDetailTab(value: unknown): value is "data-quality" | "confiabilidade-acao";
export declare function normalizeDataQualityDetailTab(value: unknown): "data-quality" | "confiabilidade-acao" | null;
export declare function detailTabLabel(tab: "data-quality" | "confiabilidade-acao"): string;
export declare function buildDataQualityDetailTabHref(
  pathname: string,
  currentSearchParams: URLSearchParams | string | undefined | null,
  tab: "data-quality" | "confiabilidade-acao",
): string;
