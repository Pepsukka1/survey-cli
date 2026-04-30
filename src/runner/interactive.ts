import {
  cancel,
  confirm,
  intro,
  isCancel,
  multiselect,
  note,
  outro,
  select,
  text,
} from "@clack/prompts";
import { defaultSchemaFor, type Question, type Survey } from "../define.ts";

export type Answers = Record<string, unknown>;

export type InteractiveOptions = {
  resumeFrom?: Answers;
  resumeStartId?: string | null;
};

export type InteractiveResult =
  | {
      ok: true;
      answers: Answers;
    }
  | {
      ok: false;
      reason: "cancelled";
      partial: Answers;
      lastQuestionId: string | null;
    };

export async function runInteractive(
  survey: Survey,
  opts: InteractiveOptions = {},
): Promise<InteractiveResult> {
  intro(survey.title);

  const answers: Answers = { ...(opts.resumeFrom ?? {}) };
  const total = survey.questions.length;
  let currentIdx = 0;

  if (opts.resumeStartId) {
    const idx = survey.questions.findIndex(
      (question) => question.id === opts.resumeStartId,
    );
    if (idx >= 0) {
      currentIdx = idx;
    }
  }

  let currentId: string | null = survey.questions[currentIdx]?.id ?? null;

  while (currentId) {
    const question = survey.questions.find(
      (candidate) => candidate.id === currentId,
    );
    if (!question) {
      break;
    }

    const idxNow = survey.questions.findIndex(
      (candidate) => candidate.id === currentId,
    );
    const progress = `[${idxNow + 1}/~${total}]`;

    if (question.skipIf?.(answers)) {
      currentId = nextId(survey, question, answers);
      continue;
    }

    const value = await renderQuestion(question, progress);
    if (isCancel(value)) {
      cancel("Survey cancelled");
      return {
        ok: false,
        reason: "cancelled",
        partial: answers,
        lastQuestionId: currentId,
      };
    }

    const schema = defaultSchemaFor(question);
    const parsed = schema.safeParse(value);
    if (!parsed.success) {
      note(
        `Invalid: ${parsed.error.issues.map((issue) => issue.message).join(", ")}`,
        "error",
      );
      continue;
    }

    answers[question.id] = parsed.data;
    currentId = nextId(survey, question, answers);
  }

  outro("Done");
  return { ok: true, answers };
}

export function nextId(
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

export async function renderQuestion(
  question: Question,
  progress: string,
): Promise<unknown> {
  const message = `${progress} ${question.prompt}`;

  switch (question.type) {
    case "text":
      return await text({ message });
    case "longtext":
      return await text({
        message: `${message} (multi-line: end with empty line)`,
      });
    case "select":
      return await select({
        message,
        options: question.choices.map((choice) => ({
          value: choice,
          label: choice,
        })),
      });
    case "multiselect":
      return await multiselect({
        message,
        options: question.choices.map((choice) => ({
          value: choice,
          label: choice,
        })),
        required: false,
      });
    case "confirm":
      return await confirm({ message });
    case "number": {
      const value = await text({
        message,
        validate: (input) =>
          Number.isNaN(Number(input)) ? "must be a number" : undefined,
      });
      if (typeof value === "string") {
        return Number(value);
      }
      return value;
    }
  }
}
