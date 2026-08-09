import { expect, test } from "bun:test";
import { buildCsvExport } from "../src/export.ts";
import type { SavedResponse } from "../src/storage.ts";

function response(timestamp: string, answers: Record<string, unknown>): SavedResponse {
  return { surveyId: "demo", timestamp, answers };
}

test("CSV export does not flag responses with the same answer shape", () => {
  const result = buildCsvExport([
    response("one", { role: "dev", stack: "ts" }),
    response("two", { stack: "go", role: "founder" }),
  ]);

  expect(result.mixedShapes).toBe(false);
  expect(result.csv).toContain("timestamp,role,stack");
});

test("CSV export flags mixed answer shapes while preserving unioned columns", () => {
  const result = buildCsvExport([
    response("one", { role: "dev" }),
    response("two", { role: "founder", stack: "go" }),
  ]);

  expect(result.mixedShapes).toBe(true);
  expect(result.csv).toContain("timestamp,role,stack");
  expect(result.csv).toContain("one,dev,");
  expect(result.csv).toContain("two,founder,go");
});
