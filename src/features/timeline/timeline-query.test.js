import assert from "node:assert/strict";
import test from "node:test";

import { buildTimelineQuery } from "./timeline-query.js";

test("builds timeline query with episode filters", () => {
  const query = buildTimelineQuery(
    {
      q: "audit",
      episode_status: "silenced",
      episode_type: "quality",
      min_importance_score: "80",
    },
    2,
    12,
  );

  const params = new URLSearchParams(query);
  assert.equal(params.get("page"), "2");
  assert.equal(params.get("page_size"), "12");
  assert.equal(params.get("q"), "audit");
  assert.equal(params.get("episode_status"), "silenced");
  assert.equal(params.get("episode_type"), "quality");
  assert.equal(params.get("min_importance_score"), "80");
});
