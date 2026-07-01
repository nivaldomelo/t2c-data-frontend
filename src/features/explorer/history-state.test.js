import assert from "node:assert/strict";
import test from "node:test";

import { resolveExplorerHistoryState } from "./history-state.js";

test("prefers error over empty state", () => {
  assert.equal(
    resolveExplorerHistoryState({
      loading: false,
      error: "Não foi possível carregar a timeline deste ativo.",
      episodes: [],
      events: [],
    }),
    "error",
  );
});

test("returns episodes when available", () => {
  assert.equal(
    resolveExplorerHistoryState({
      loading: false,
      error: "",
      episodes: [{}],
      events: [],
    }),
    "episodes",
  );
});

test("returns empty only when there is no data and no error", () => {
  assert.equal(
    resolveExplorerHistoryState({
      loading: false,
      error: "",
      episodes: [],
      events: [],
    }),
    "empty",
  );
});
