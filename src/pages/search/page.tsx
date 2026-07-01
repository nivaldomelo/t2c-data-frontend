import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "@/lib/next-shims";
import { Link } from "@/lib/next-shims";

import { SearchResultsView } from "@/features/search/components/search-results-view";
import { trackPlatformEvent } from "@/features/platform/client";
import type { SearchAppliedFilters, SearchResultsResponse } from "@/features/search/types";
import { apiRequest } from "@/lib/client-api";
import { useApiQuery } from "@/lib/use-api-query";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

function filtersFromSearchParams(searchParams: URLSearchParams): SearchAppliedFilters {
  return {
    result_type: searchParams.get("type") || "",
    source: searchParams.get("source") || "",
    database: searchParams.get("database") || "",
    schema: searchParams.get("schema") || "",
    domain: searchParams.get("domain") || "",
    owner: searchParams.get("owner") || "",
    classification: searchParams.get("classification") || "",
    certification: searchParams.get("certification") || "",
    incidents: searchParams.get("incidents") || "",
    governance_maturity: searchParams.get("governance_maturity") || "",
  };
}

function buildSearchUrl(query: string, filters: SearchAppliedFilters): string {
  const params = new URLSearchParams();
  const trimmedQuery = query.trim();
  if (trimmedQuery) params.set("q", trimmedQuery);
  if (filters.result_type) params.set("type", filters.result_type);
  if (filters.source) params.set("source", filters.source);
  if (filters.database) params.set("database", filters.database);
  if (filters.schema) params.set("schema", filters.schema);
  if (filters.domain) params.set("domain", filters.domain);
  if (filters.owner) params.set("owner", filters.owner);
  if (filters.classification) params.set("classification", filters.classification);
  if (filters.certification) params.set("certification", filters.certification);
  if (filters.incidents) params.set("incidents", filters.incidents);
  if (filters.governance_maturity) params.set("governance_maturity", filters.governance_maturity);
  const queryString = params.toString();
  return queryString ? `/search?${queryString}` : "/search";
}

function buildApiUrl(query: string, filters: SearchAppliedFilters): string {
  const params = new URLSearchParams();
  const trimmedQuery = query.trim();
  if (trimmedQuery) params.set("q", trimmedQuery);
  if (filters.result_type) params.set("type", filters.result_type);
  if (filters.source) params.set("source", filters.source);
  if (filters.database) params.set("database", filters.database);
  if (filters.schema) params.set("schema", filters.schema);
  if (filters.domain) params.set("domain", filters.domain);
  if (filters.owner) params.set("owner", filters.owner);
  if (filters.classification) params.set("classification", filters.classification);
  if (filters.certification) params.set("certification", filters.certification);
  if (filters.incidents) params.set("incidents", filters.incidents);
  if (filters.governance_maturity) params.set("governance_maturity", filters.governance_maturity);
  return `/v1/search/results?${params.toString()}`;
}

export default function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const auth = useAuth();
  const [draftQuery, setDraftQuery] = useState("");
  const [filters, setFilters] = useState<SearchAppliedFilters>({});
  const canManageAliases = auth.canAction("write", "other");

  const activeQuery = searchParams.get("q") || "";
  const activeFilters = useMemo(() => filtersFromSearchParams(new URLSearchParams(searchParams.toString())), [searchParams]);
  const normalizedQuery = activeQuery.trim();
  const searchEnabled = normalizedQuery.length >= 2;

  useEffect(() => {
    void trackPlatformEvent({
      event_name: "page_view",
      module_name: "search",
      page_path: "/search",
      metadata: { has_query: Boolean(activeQuery.trim()) },
    });
  }, []);

  useEffect(() => {
    setDraftQuery(activeQuery);
    setFilters(activeFilters);
  }, [activeFilters, activeQuery]);

  const {
    data,
    isLoading,
    error: queryError,
  } = useApiQuery<SearchResultsResponse>(
    ["search", "results", normalizedQuery, activeFilters],
    buildApiUrl(normalizedQuery, activeFilters),
    undefined,
    { enabled: searchEnabled },
  );

  // Below the minimum length we surface an explicit empty payload instead of querying.
  const emptyPayload = useMemo<SearchResultsResponse>(
    () => ({
      query: normalizedQuery,
      total: 0,
      groups: [],
      items: [],
      available_filters: {
        types: [],
        sources: [],
        databases: [],
        schemas: [],
        domains: [],
        owners: [],
        classifications: [],
        certification: [],
        incidents: [],
        governance_maturity: [],
      },
      applied_filters: activeFilters,
      took_ms: 0,
      min_query_length: 2,
    }),
    [activeFilters, normalizedQuery],
  );

  const payload = searchEnabled ? data ?? null : emptyPayload;
  const loading = searchEnabled ? isLoading : false;
  const error = searchEnabled && queryError ? queryError.message : "";

  useEffect(() => {
    if (!searchEnabled || !data || queryError) return;
    void apiRequest("/v1/search/track-query", {
      method: "POST",
      body: JSON.stringify({ query: normalizedQuery }),
    }).catch(() => undefined);
  }, [data, normalizedQuery, queryError, searchEnabled]);

  function applySearch(nextQuery: string, nextFilters: SearchAppliedFilters = filters) {
    router.push(buildSearchUrl(nextQuery, nextFilters));
  }

  function updateFilter(key: keyof SearchAppliedFilters, value: string) {
    const nextFilters = { ...filters, [key]: value };
    setFilters(nextFilters);
    applySearch(draftQuery, nextFilters);
  }

  function clearFilters() {
    const cleared: SearchAppliedFilters = {
      result_type: "",
      source: "",
      database: "",
      schema: "",
      domain: "",
      owner: "",
      classification: "",
      certification: "",
      incidents: "",
      governance_maturity: "",
    };
    setFilters(cleared);
    applySearch(draftQuery, cleared);
  }

  return (
    <div className="space-y-4">
      {canManageAliases ? (
        <div className="flex justify-end">
          <Button asChild type="button" variant="outline">
            <Link href="/search/aliases">Gerenciar aliases</Link>
          </Button>
        </div>
      ) : null}
      <SearchResultsView
        draftQuery={draftQuery}
        error={error}
        filters={filters}
        loading={loading}
        onClearFilters={clearFilters}
        onDraftQueryChange={setDraftQuery}
        onFilterChange={updateFilter}
        onSearch={(value) => applySearch(value, filters)}
        payload={payload}
      />
    </div>
  );
}
