import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const SURVEY_ID = /^[a-z0-9][a-z0-9_-]*$/i;

export function scaffoldSurvey(id: string, dir = "./surveys"): string {
  const surveyId = id.trim();
  if (!SURVEY_ID.test(surveyId)) {
    throw new Error(
      "Survey id must start with a letter or number and contain only letters, numbers, - or _",
    );
  }

  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const path = join(dir, `${surveyId}.ts`);
  if (existsSync(path)) throw new Error(`Survey already exists: ${path}`);

  // Keep generated surveys self-contained so compiled/global installs work from
  // unrelated project directories, while retaining the package's Survey shape
  // and defineSurvey validation semantics.
  const source = `type Answers = Record<string, unknown>;

type BaseQuestion = {
  id: string;
  prompt: string;
  schema?: unknown;
  next?: (answers: Answers) => string | null;
  skipIf?: (answers: Answers) => boolean;
};

type TextQuestion = BaseQuestion & { type: "text" };
type LongTextQuestion = BaseQuestion & { type: "longtext" };
type SelectQuestion = BaseQuestion & { type: "select"; choices: string[] };
type MultiSelectQuestion = BaseQuestion & {
  type: "multiselect";
  choices: string[];
};
type ConfirmQuestion = BaseQuestion & { type: "confirm" };
type NumberQuestion = BaseQuestion & { type: "number" };

type Question =
  | TextQuestion
  | LongTextQuestion
  | SelectQuestion
  | MultiSelectQuestion
  | ConfirmQuestion
  | NumberQuestion;

type Survey = {
  id: string;
  title: string;
  description?: string;
  anonymous?: boolean;
  questions: Question[];
};

function defineSurvey(input: Survey): Survey {
  const ids = new Set<string>();
  for (const question of input.questions) {
    if (ids.has(question.id)) {
      throw new Error(\`duplicate question id: \${question.id}\`);
    }
    ids.add(question.id);
  }
  if (input.questions.length === 0) {
    throw new Error("survey must have at least one question");
  }
  return input;
}

export default defineSurvey({
  id: ${JSON.stringify(surveyId)},
  title: ${JSON.stringify(surveyId)},
  questions: [
    {
      id: "first_question",
      type: "text",
      prompt: "Your first question?",
    },
  ],
});
`;

  writeFileSync(path, source);
  return path;
}
