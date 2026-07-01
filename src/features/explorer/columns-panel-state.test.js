import assert from "node:assert/strict";
import test from "node:test";

import { resolveExplorerColumnsPanelState } from "./columns-panel-state.js";

test("reports loading before columns are available", () => {
  assert.deepEqual(
    resolveExplorerColumnsPanelState({
      columns: [],
      columnsLoading: true,
      columnsError: "",
    }),
    { kind: "loading" },
  );
});

test("reports ready when columns exist", () => {
  assert.deepEqual(
    resolveExplorerColumnsPanelState({
      columns: [{ id: 1 }],
      columnsLoading: false,
      columnsError: "",
    }),
    { kind: "ready" },
  );
});

test("reports empty when no columns are available", () => {
  assert.deepEqual(
    resolveExplorerColumnsPanelState({
      columns: [],
      columnsLoading: false,
      columnsError: "",
    }),
    { kind: "empty" },
  );
});

test("reports error when loading fails", () => {
  assert.deepEqual(
    resolveExplorerColumnsPanelState({
      columns: [],
      columnsLoading: false,
      columnsError: "Falha ao carregar as colunas",
    }),
    { kind: "error", message: "Falha ao carregar as colunas" },
  );
});
