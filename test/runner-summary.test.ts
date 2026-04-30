import { expect, test } from "bun:test";
import type { Survey } from "../src/define.ts";
import { formatSummaryLines, showSummary } from "../src/runner/summary.ts";

const survey: Survey = {
  id: "runner-summary",
  title: "Runner summary",
  questions: [
    { id: "name", type: "text", prompt: "Name?" },
    {
      id: "stack",
      type: "multiselect",
      prompt: "Stack?",
      choices: ["bun", "node"],
    },
    { id: "email", type: "text", prompt: "Email?" },
  ],
};

test("showSummary with skipConfirm true returns confirmed", async () => {
  await expect(
    showSummary(
      survey,
      { name: "Hunter", stack: ["bun"] },
      { skipConfirm: true },
    ),
  ).resolves.toEqual({ confirmed: true });
});

test("formatSummaryLines renders arrays and skipped answers", () => {
  expect(
    formatSummaryLines(survey, { name: "Hunter", stack: ["bun"] }),
  ).toEqual(["name: Hunter", "stack: bun", "email: [skipped]"]);
});
