import { defaultSchemaFor, type Question, type Survey } from "../define.ts";
import type { Answers } from "./interactive.ts";

export type AgentError = {
  questionId: string;
  reason: "missing" | "invalid";
  detail?: string;
};

export type AgentResult =
  | {
      ok: true;
      answers: Answers;
      visited: string[];
    }
  | {
      ok: false;
      errors: AgentError[];
      visited: string[];
    };

export function runAgent(
  survey: Survey,
  providedAnswers: Answers,
): AgentResult {
  const errors: AgentError[] = [];
  const validated: Answers = {};
  const visited: string[] = [];
  let currentId: string | null = survey.questions[0]?.id ?? null;

  while (currentId) {
    const question = survey.questions.find(
      (candidate) => candidate.id === currentId,
    );
    if (!question) {
      break;
    }

    visited.push(currentId);

    if (question.skipIf?.(validated)) {
      currentId = nextIdAgent(survey, question, validated);
      continue;
    }

    if (!(question.id in providedAnswers)) {
      errors.push({ questionId: question.id, reason: "missing" });
      break;
    }

    const schema = defaultSchemaFor(question);
    const parsed = schema.safeParse(providedAnswers[question.id]);
    if (!parsed.success) {
      errors.push({
        questionId: question.id,
        reason: "invalid",
        detail: parsed.error.issues.map((issue) => issue.message).join("; "),
      });
      break;
    }

    validated[question.id] = parsed.data;
    currentId = nextIdAgent(survey, question, validated);
  }

  if (errors.length > 0) {
    return { ok: false, errors, visited };
  }

  return { ok: true, answers: validated, visited };
}

export function nextIdAgent(
  survey: Survey,
  question: Question,
  answers: Answers,
): string | null {
  if (question.next) {
    return question.next(answers);
  }

  const idx = survey.questions.findIndex(
    (candidate) => candidate.id === question.id,
  );
  return survey.questions[idx + 1]?.id ?? null;
}
