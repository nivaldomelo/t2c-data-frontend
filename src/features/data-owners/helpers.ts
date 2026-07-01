import type {
  CatalogTable,
  OwnerTablePreview,
  OwnershipReassignAsset,
  OwnershipReassignImpact,
} from "./types";

export function isRestrictedAccess(scope: string | null | undefined) {
  return scope === "restricted" || scope === "confidential" || scope === "personal_data";
}

export function formatDate(value: string) {
  return new Date(value).toLocaleString("pt-BR");
}

export function tableDescription(table: CatalogTable | OwnerTablePreview) {
  if ("description_manual" in table) return table.description_manual || table.description_source || null;
  return table.description;
}

export function buildReassignImpact(assets: OwnershipReassignAsset[]): OwnershipReassignImpact {
  return {
    asset_count: assets.length,
    certified_assets: assets.filter((asset) => asset.certification_status === "certified").length,
    critical_assets: assets.filter((asset) => ["critical", "high"].includes((asset.criticality || "").toLowerCase())).length,
    personal_data_assets: assets.filter((asset) => asset.has_personal_data).length,
    sensitive_data_assets: assets.filter((asset) => asset.has_sensitive_personal_data).length,
    open_incidents: assets.reduce((sum, asset) => sum + asset.open_incidents, 0),
    certification_pending_assets: assets.filter((asset) => ["not_assessed", "not_eligible", "in_review", "rejected", "expired", "revalidation_pending"].includes(asset.certification_status)).length,
    privacy_pending_assets: assets.filter((asset) => asset.privacy_pending).length,
    dq_unmonitored_assets: assets.filter((asset) => !asset.dq_monitored).length,
  };
}
