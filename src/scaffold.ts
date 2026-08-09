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

  const source = `import { defineSurvey, q } from "@crafter/survey-cli/define";\n\nexport default defineSurvey({\n  id: ${JSON.stringify(surveyId)},\n  title: ${JSON.stringify(surveyId)},\n  questions: [\n    q.text("first_question", "Your first question?"),\n  ],\n});\n`;

  writeFileSync(path, source);
  return path;
}
