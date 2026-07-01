import assert from "node:assert/strict";
import test from "node:test";

import { shouldMirrorExplorerDetailTabFromUrl } from "./tab-sync.js";

test("does not mirror the tab back when the URL is still catching up after a local click", () => {
  assert.equal(
    shouldMirrorExplorerDetailTabFromUrl({
      activeTab: "columns",
      pendingTab: "columns",
      urlTab: "summary",
    }),
    false,
  );
});

test("does not mirror when the URL already matches the active tab", () => {
  assert.equal(
    shouldMirrorExplorerDetailTabFromUrl({
      activeTab: "columns",
      pendingTab: "columns",
      urlTab: "columns",
    }),
    false,
  );
});

test("mirrors an external URL change into the active tab", () => {
  assert.equal(
    shouldMirrorExplorerDetailTabFromUrl({
      activeTab: "summary",
      pendingTab: null,
      urlTab: "lineage",
    }),
    true,
  );
});
