import { confirm, isCancel, note } from "@clack/prompts";
import type { Survey } from "../define.ts";
import type { Answers } from "./interactive.ts";

export type SummaryOptions = {
  skipConfirm?: boolean;
};

export type SummaryResult =
  | { confirmed: true }
  | { confirmed: false; reason: "rejected" | "cancelled" };

export async function showSummary(
  survey: Survey,
  answers: Answers,
  opts: SummaryOptions = {},
): Promise<SummaryResult> {
  note(formatSummaryLines(survey, answers).join("\n"), "Summary");

  if (opts.skipConfirm) {
    return { confirmed: true };
  }

  const result = await confirm({ message: "Submit these answers?" });
  if (result === true) {
    return { confirmed: true };
  }
  if (result === false) {
    return { confirmed: false, reason: "rejected" };
  }
  if (isCancel(result)) {
    return { confirmed: false, reason: "cancelled" };
  }
  return { confirmed: false, reason: "cancelled" };
}

export function formatSummaryLines(survey: Survey, answers: Answers): string[] {
  return survey.questions.map((question) => {
    const answer = answers[question.id];

    if (answer === undefined) {
      return `${question.id}: [skipped]`;
    }

    if (Array.isArray(answer)) {
      return `${question.id}: ${answer.join(", ")}`;
    }

    return `${question.id}: ${String(answer)}`;
  });
}
