import assert from "node:assert/strict";
import test from "node:test";

import { dedupeTimelineEpisodes, formatEpisodeWindow, sortTimelineEpisodes } from "./episode-utils.js";

test("sorts episodes by importance and recency", () => {
  const episodes = sortTimelineEpisodes([
    { importance_score: 40, occurred_at: "2025-01-01T10:00:00Z" },
    { importance_score: 85, occurred_at: "2025-01-01T08:00:00Z" },
    { importance_score: 40, occurred_at: "2025-01-01T12:00:00Z" },
  ]);

  assert.deepEqual(episodes.map((item) => item.importance_score), [85, 40, 40]);
  assert.equal(episodes[1].occurred_at, "2025-01-01T12:00:00Z");
});

test("dedupes episodes by id while preserving first occurrence", () => {
  const episodes = dedupeTimelineEpisodes([
    { id: "episode:one", importance_score: 40, occurred_at: "2025-01-01T10:00:00Z" },
    { id: "episode:one", importance_score: 85, occurred_at: "2025-01-01T12:00:00Z" },
    { id: "episode:two", importance_score: 10, occurred_at: "2025-01-01T08:00:00Z" },
  ]);

  assert.equal(episodes.length, 2);
  assert.deepEqual(
    episodes.map((item) => item.id),
    ["episode:one", "episode:two"],
  );
});

test("formats a compact same-day episode window", () => {
  assert.equal(
    formatEpisodeWindow("2025-01-01T10:00:00Z", "2025-01-01T12:30:00Z"),
    "01 de jan. · 07:00 - 09:30",
  );
});
