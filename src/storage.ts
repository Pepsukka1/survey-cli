import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { isAbsolute, join, resolve } from "node:path";
import type { Survey } from "./define.ts";
import type { Answers } from "./runner/interactive.ts";

export function storageHome(): string {
  return process.env.SURVEY_CLI_HOME ?? join(homedir(), ".survey-cli");
}

export function surveyDir(surveyId: string): string {
  const dir = join(storageHome(), surveyId);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

export type SavedResponse = {
  surveyId: string;
  timestamp: string;
  answers: Answers;
  inProgress?: boolean;
  lastQuestionId?: string | null;
};

export function saveResponse(surveyId: string, answers: Answers): string {
  const dir = surveyDir(surveyId);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const path = join(dir, `${timestamp}.json`);
  const payload: SavedResponse = { surveyId, timestamp, answers };
  writeFileSync(path, JSON.stringify(payload, null, 2));
  return path;
}

export function saveInProgress(
  surveyId: string,
  answers: Answers,
  lastQuestionId: string | null,
): string {
  const dir = surveyDir(surveyId);
  const path = join(dir, "in-progress.json");
  const payload: SavedResponse = {
    surveyId,
    timestamp: new Date().toISOString(),
    answers,
    inProgress: true,
    lastQuestionId,
  };
  writeFileSync(path, JSON.stringify(payload, null, 2));
  return path;
}

export function loadInProgress(surveyId: string): SavedResponse | null {
  const path = join(surveyDir(surveyId), "in-progress.json");
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8")) as SavedResponse;
}

export function clearInProgress(surveyId: string): void {
  const path = join(surveyDir(surveyId), "in-progress.json");
  if (existsSync(path)) unlinkSync(path);
}

export function listResponses(surveyId: string): SavedResponse[] {
  const dir = surveyDir(surveyId);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((file) => file.endsWith(".json") && file !== "in-progress.json")
    .map(
      (file) =>
        JSON.parse(readFileSync(join(dir, file), "utf8")) as SavedResponse,
    )
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

export function readResponse(
  surveyId: string,
  timestamp: string,
): SavedResponse | null {
  return (
    listResponses(surveyId).find((response) =>
      response.timestamp.startsWith(timestamp),
    ) ?? null
  );
}

export function discoverSurveyFiles(dir = "./surveys"): string[] {
  const searchDir =
    !existsSync(dir) && dir === "./surveys" && existsSync("./examples")
      ? "./examples"
      : dir;
  if (!existsSync(searchDir)) return [];
  return readdirSync(searchDir)
    .filter(
      (file) =>
        file.endsWith(".ts") || file.endsWith(".js") || file.endsWith(".mjs"),
    )
    .map((file) => join(searchDir, file));
}

export async function loadSurveyById(
  id: string,
  dir = "./surveys",
): Promise<Survey | null> {
  for (const file of discoverSurveyFiles(dir)) {
    const mod = await import(pathToImport(file));
    const survey = (mod.default ?? mod.survey) as Survey | undefined;
    if (survey?.id === id) return survey;
  }
  return null;
}

export async function loadAllSurveys(dir = "./surveys"): Promise<Survey[]> {
  const surveys: Survey[] = [];
  for (const file of discoverSurveyFiles(dir)) {
    const mod = await import(pathToImport(file));
    const survey = (mod.default ?? mod.survey) as Survey | undefined;
    if (survey) surveys.push(survey);
  }
  return surveys;
}

function pathToImport(file: string): string {
  return isAbsolute(file) ? file : resolve(process.cwd(), file);
}
