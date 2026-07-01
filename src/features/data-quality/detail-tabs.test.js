const assert = require("node:assert/strict");
const { test } = require("node:test");

const {
  DETAIL_TABS,
  buildDataQualityDetailTabHref,
  detailTabLabel,
  normalizeDataQualityDetailTab,
} = require("./detail-tabs.js");

test("exposes the two data quality detail tabs", () => {
  assert.deepEqual(DETAIL_TABS, ["data-quality", "confiabilidade-acao"]);
  assert.equal(detailTabLabel("data-quality"), "Data Quality");
  assert.equal(detailTabLabel("confiabilidade-acao"), "Confiabilidade & Ação");
});

test("normalizes only supported data quality tabs", () => {
  assert.equal(normalizeDataQualityDetailTab("data-quality"), "data-quality");
  assert.equal(normalizeDataQualityDetailTab("confiabilidade-acao"), "confiabilidade-acao");
  assert.equal(normalizeDataQualityDetailTab("observability"), "confiabilidade-acao");
  assert.equal(normalizeDataQualityDetailTab("invalid"), null);
});

test("builds a persisted url for both tabs", () => {
  const base = new URLSearchParams("tableId=42");
  assert.equal(buildDataQualityDetailTabHref("/data-quality", base, "data-quality"), "/data-quality?tableId=42&tab=data-quality");
  assert.equal(
    buildDataQualityDetailTabHref("/data-quality", base, "confiabilidade-acao"),
    "/data-quality?tableId=42&tab=confiabilidade-acao",
  );
});
