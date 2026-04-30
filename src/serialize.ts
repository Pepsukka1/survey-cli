import type { Question, Survey } from "./define.ts";

export type SerializedSurvey = {
  id: string;
  title: string;
  description?: string;
  anonymous?: boolean;
  entry: string;
  questions: SerializedQuestion[];
};

export type SerializedQuestion = {
  id: string;
  type: Question["type"];
  prompt: string;
  choices?: string[];
  hasValidation: boolean;
  branching: { kind: "linear"; next: string | null } | { kind: "dynamic" };
  skipIfDynamic: boolean;
};

export function serializeSurvey(survey: Survey): SerializedSurvey {
  const entry = survey.questions[0];
  if (!entry) {
    throw new Error("survey must have at least one question");
  }

  const questions: SerializedQuestion[] = survey.questions.map(
    (question, index) => {
      const next = survey.questions[index + 1]?.id ?? null;
      return {
        id: question.id,
        type: question.type,
        prompt: question.prompt,
        ...(question.type === "select" || question.type === "multiselect"
          ? { choices: question.choices }
          : {}),
        hasValidation: !!question.schema,
        branching: question.next
          ? { kind: "dynamic" }
          : { kind: "linear", next },
        skipIfDynamic: !!question.skipIf,
      };
    },
  );

  return {
    id: survey.id,
    title: survey.title,
    description: survey.description,
    anonymous: survey.anonymous,
    entry: entry.id,
    questions,
  };
}
