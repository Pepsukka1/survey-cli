import { stringify } from "csv-stringify/sync";
import type { SavedResponse } from "./storage.ts";

export type CsvExport = {
  csv: string;
  mixedShapes: boolean;
};

export function buildCsvExport(responses: SavedResponse[]): CsvExport {
  const answerIds = new Set<string>();
  const shapes = new Set<string>();

  for (const response of responses) {
    const keys = Object.keys(response.answers).sort();
    shapes.add(keys.join("\u0000"));
    for (const key of keys) answerIds.add(key);
  }

  const headers = ["timestamp", ...answerIds];
  const rows = responses.map((response) => [
    response.timestamp,
    ...Array.from(answerIds).map((key) => formatCell(response.answers[key])),
  ]);

  return {
    csv: stringify([headers, ...rows]),
    mixedShapes: shapes.size > 1,
  };
}

function formatCell(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (Array.isArray(value)) return value.join(",");
  return String(value);
}
