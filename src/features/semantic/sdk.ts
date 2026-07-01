import { apiRequest } from "@/lib/client-api";

import type {
  SemanticDomain,
  SemanticDomainDetail,
  SemanticDomainInput,
  SemanticDomainPage,
  SemanticDomainSuggestion,
  SemanticDomainUpdate,
  SemanticLink,
  SemanticLinkInput,
  SemanticProduct,
  SemanticProductDetail,
  SemanticProductInput,
  SemanticProductPage,
  SemanticProductSummary,
  SemanticProductUpdate,
} from "./types";

export async function listSemanticDomains(query = "", page = 1, pageSize = 25): Promise<SemanticDomainPage> {
  const params = new URLSearchParams();
  if (query.trim()) params.set("q", query.trim());
  params.set("page", String(page));
  params.set("page_size", String(pageSize));
  return apiRequest<SemanticDomainPage>(`/v1/semantic/domains?${params.toString()}`);
}

export async function listSemanticDomainSuggestions(): Promise<SemanticDomainSuggestion[]> {
  return apiRequest<SemanticDomainSuggestion[]>("/v1/semantic/domains/suggestions");
}

export async function getSemanticDomain(slug: string): Promise<SemanticDomainDetail> {
  return apiRequest<SemanticDomainDetail>(`/v1/semantic/domains/${encodeURIComponent(slug)}`);
}

export async function createSemanticDomain(payload: SemanticDomainInput): Promise<SemanticDomain> {
  return apiRequest<SemanticDomain>("/v1/semantic/domains", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateSemanticDomain(slug: string, payload: SemanticDomainUpdate): Promise<SemanticDomain> {
  return apiRequest<SemanticDomain>(`/v1/semantic/domains/${encodeURIComponent(slug)}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteSemanticDomain(slug: string): Promise<void> {
  await apiRequest(`/v1/semantic/domains/${encodeURIComponent(slug)}`, {
    method: "DELETE",
  });
}

export async function listSemanticDomainLinks(slug: string): Promise<SemanticLink[]> {
  return apiRequest<SemanticLink[]>(`/v1/semantic/domains/${encodeURIComponent(slug)}/links`);
}

export async function addSemanticDomainLink(slug: string, payload: SemanticLinkInput): Promise<SemanticLink> {
  return apiRequest<SemanticLink>(`/v1/semantic/domains/${encodeURIComponent(slug)}/links`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function deleteSemanticDomainLink(slug: string, linkId: number): Promise<void> {
  await apiRequest(`/v1/semantic/domains/${encodeURIComponent(slug)}/links/${linkId}`, {
    method: "DELETE",
  });
}

export async function listSemanticProducts(query = "", domainSlug = "", page = 1, pageSize = 25): Promise<SemanticProductPage> {
  const params = new URLSearchParams();
  if (query.trim()) params.set("q", query.trim());
  if (domainSlug.trim()) params.set("domain_slug", domainSlug.trim());
  params.set("page", String(page));
  params.set("page_size", String(pageSize));
  return apiRequest<SemanticProductPage>(`/v1/semantic/data-products?${params.toString()}`);
}

export async function getSemanticProduct(slug: string): Promise<SemanticProductDetail> {
  return apiRequest<SemanticProductDetail>(`/v1/semantic/data-products/${encodeURIComponent(slug)}`);
}

export async function getSemanticProductForTable(tableId: number): Promise<SemanticProductDetail | null> {
  return apiRequest<SemanticProductDetail | null>(`/v1/semantic/data-products/for-table/${tableId}`);
}

export async function getSemanticProductSummary(slug: string): Promise<SemanticProductSummary> {
  return apiRequest<SemanticProductSummary>(`/v1/semantic/data-products/${encodeURIComponent(slug)}/summary`);
}

export async function createSemanticProduct(payload: SemanticProductInput): Promise<SemanticProduct> {
  return apiRequest<SemanticProduct>("/v1/semantic/data-products", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateSemanticProduct(slug: string, payload: SemanticProductUpdate): Promise<SemanticProduct> {
  return apiRequest<SemanticProduct>(`/v1/semantic/data-products/${encodeURIComponent(slug)}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteSemanticProduct(slug: string): Promise<void> {
  await apiRequest(`/v1/semantic/data-products/${encodeURIComponent(slug)}`, {
    method: "DELETE",
  });
}

export async function listSemanticProductLinks(slug: string): Promise<SemanticLink[]> {
  return apiRequest<SemanticLink[]>(`/v1/semantic/data-products/${encodeURIComponent(slug)}/links`);
}

export async function addSemanticProductLink(slug: string, payload: SemanticLinkInput): Promise<SemanticLink> {
  return apiRequest<SemanticLink>(`/v1/semantic/data-products/${encodeURIComponent(slug)}/links`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function deleteSemanticProductLink(slug: string, linkId: number): Promise<void> {
  await apiRequest(`/v1/semantic/data-products/${encodeURIComponent(slug)}/links/${linkId}`, {
    method: "DELETE",
  });
}
