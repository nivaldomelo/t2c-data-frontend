import assert from "node:assert/strict";
import test from "node:test";

import { resolveExplorerDetailTabLayout, resolveExplorerSummaryConsumptionLayout } from "./detail-tab-layout.js";

test("keeps the detail shell at the tallest measured panel height", () => {
  const layout = resolveExplorerDetailTabLayout({
    activeTab: "summary",
    columnsHeight: 960,
    summaryHeight: 720,
  });

  assert.equal(layout.shellStyle.minHeight, "960px");
  assert.equal(layout.summaryPanelClassName, "relative z-10");
  assert.equal(layout.columnsPanelClassName, "absolute inset-0 invisible pointer-events-none");
});

test("marks the inactive panel as invisible instead of unmounting it", () => {
  const layout = resolveExplorerDetailTabLayout({
    activeTab: "columns",
    columnsHeight: 640,
    summaryHeight: 820,
  });

  assert.equal(layout.shellStyle.minHeight, "820px");
  assert.equal(layout.columnsPanelClassName, "relative z-10");
  assert.equal(layout.summaryPanelClassName, "absolute inset-0 invisible pointer-events-none");
});

test("keeps summary and consumption in a shared stable shell", () => {
  const layout = resolveExplorerSummaryConsumptionLayout({
    activeTab: "consumption",
    summaryHeight: 720,
    consumptionHeight: 980,
    shellHeight: 900,
  });

  assert.equal(layout.shellStyle.minHeight, "980px");
  assert.equal(layout.shellStyle.overflow, "hidden");
  assert.equal(layout.summaryPanelClassName, "absolute inset-0 invisible pointer-events-none");
  assert.equal(layout.consumptionPanelClassName, "relative z-10");
});

test("preserves the largest shell height once measured", () => {
  const layout = resolveExplorerSummaryConsumptionLayout({
    activeTab: "summary",
    summaryHeight: 640,
    consumptionHeight: 580,
    shellHeight: 980,
  });

  assert.equal(layout.shellStyle.minHeight, "980px");
});

test("tracks the active tab height instead of the inactive panel height", () => {
  const layout = resolveExplorerSummaryConsumptionLayout({
    activeTab: "summary",
    summaryHeight: 640,
    consumptionHeight: 980,
    shellHeight: 0,
  });

  assert.equal(layout.shellStyle.minHeight, "640px");
  assert.equal(layout.summaryPanelClassName, "relative z-10");
  assert.equal(layout.consumptionPanelClassName, "absolute inset-0 invisible pointer-events-none");
});
