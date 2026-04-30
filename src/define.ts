import { z } from "zod";

export type QuestionType =
  | "text"
  | "longtext"
  | "select"
  | "multiselect"
  | "confirm"
  | "number";

export type BaseQuestion<TAnswers = Record<string, unknown>> = {
  id: string;
  type: QuestionType;
  prompt: string;
  schema?: z.ZodType;
  next?: (answers: TAnswers) => string | null;
  skipIf?: (answers: TAnswers) => boolean;
};

export type TextQuestion<T = Record<string, unknown>> = BaseQuestion<T> & {
  type: "text";
};
export type LongTextQuestion<T = Record<string, unknown>> = BaseQuestion<T> & {
  type: "longtext";
};
export type SelectQuestion<T = Record<string, unknown>> = BaseQuestion<T> & {
  type: "select";
  choices: string[];
};
export type MultiSelectQuestion<T = Record<string, unknown>> =
  BaseQuestion<T> & {
    type: "multiselect";
    choices: string[];
  };
export type ConfirmQuestion<T = Record<string, unknown>> = BaseQuestion<T> & {
  type: "confirm";
};
export type NumberQuestion<T = Record<string, unknown>> = BaseQuestion<T> & {
  type: "number";
};

export type Question<T = Record<string, unknown>> =
  | TextQuestion<T>
  | LongTextQuestion<T>
  | SelectQuestion<T>
  | MultiSelectQuestion<T>
  | ConfirmQuestion<T>
  | NumberQuestion<T>;

export type Survey = {
  id: string;
  title: string;
  description?: string;
  anonymous?: boolean;
  questions: Question[];
};

export function defineSurvey(input: Survey): Survey {
  const ids = new Set<string>();
  for (const question of input.questions) {
    if (ids.has(question.id)) {
      throw new Error(`duplicate question id: ${question.id}`);
    }
    ids.add(question.id);
  }
  if (input.questions.length === 0) {
    throw new Error("survey must have at least one question");
  }
  return input;
}

export const q = {
  text: <T extends Record<string, unknown>>(
    id: string,
    prompt: string,
    opts: Partial<TextQuestion<T>> = {},
  ): TextQuestion<T> => ({ id, type: "text", prompt, ...opts }),
  longtext: <T extends Record<string, unknown>>(
    id: string,
    prompt: string,
    opts: Partial<LongTextQuestion<T>> = {},
  ): LongTextQuestion<T> => ({ id, type: "longtext", prompt, ...opts }),
  select: <T extends Record<string, unknown>>(
    id: string,
    prompt: string,
    choices: string[],
    opts: Partial<SelectQuestion<T>> = {},
  ): SelectQuestion<T> => ({ id, type: "select", prompt, choices, ...opts }),
  multiselect: <T extends Record<string, unknown>>(
    id: string,
    prompt: string,
    choices: string[],
    opts: Partial<MultiSelectQuestion<T>> = {},
  ): MultiSelectQuestion<T> => ({
    id,
    type: "multiselect",
    prompt,
    choices,
    ...opts,
  }),
  confirm: <T extends Record<string, unknown>>(
    id: string,
    prompt: string,
    opts: Partial<ConfirmQuestion<T>> = {},
  ): ConfirmQuestion<T> => ({ id, type: "confirm", prompt, ...opts }),
  number: <T extends Record<string, unknown>>(
    id: string,
    prompt: string,
    opts: Partial<NumberQuestion<T>> = {},
  ): NumberQuestion<T> => ({ id, type: "number", prompt, ...opts }),
};

export function defaultSchemaFor(question: Question): z.ZodType {
  if (question.schema) {
    return question.schema;
  }
  switch (question.type) {
    case "text":
    case "longtext":
      return z.string();
    case "select":
      return z.enum(question.choices as [string, ...string[]]);
    case "multiselect":
      return z.array(z.enum(question.choices as [string, ...string[]]));
    case "confirm":
      return z.boolean();
    case "number":
      return z.number();
  }
}
