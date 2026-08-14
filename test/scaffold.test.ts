import { expect, test } from "bun:test";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import * as ts from "typescript";
import { scaffoldSurvey } from "../src/scaffold.ts";
import { loadSurveyById } from "../src/storage.ts";

const decoder = new TextDecoder();
const STARTER_QUESTION = `  questions: [
    {
      id: "first_question",
      type: "text",
      prompt: "Your first question?",
    },
  ],`;

function typeErrors(path: string): ts.Diagnostic[] {
  const program = ts.createProgram([path], {
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    noEmit: true,
    skipLibCheck: true,
    strict: true,
    target: ts.ScriptTarget.ES2022,
  });
  return ts
    .getPreEmitDiagnostics(program)
    .filter(
      (diagnostic) =>
        diagnostic.category === ts.DiagnosticCategory.Error &&
        diagnostic.file?.fileName === path,
    );
}

test("survey new scaffold is discoverable, typed, and parses", async () => {
  const temp = mkdtempSync(join(tmpdir(), "survey-new-source-"));
  const surveysDir = join(temp, "surveys");

  try {
    const path = scaffoldSurvey("demo", surveysDir);
    const source = readFileSync(path, "utf8");

    expect(path).toBe(join(surveysDir, "demo.ts"));
    expect(source).toContain('id: "demo"');
    expect(source).not.toContain("@crafter/survey-cli");
    expect(typeErrors(path)).toHaveLength(0);

    const survey = await loadSurveyById("demo", surveysDir);
    expect(survey?.id).toBe("demo");
    expect(survey?.questions).toHaveLength(1);
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});

test("standalone scaffold preserves Survey question shape", () => {
  const temp = mkdtempSync(join(tmpdir(), "survey-new-types-"));
  const surveysDir = join(temp, "surveys");

  try {
    const path = scaffoldSurvey("demo", surveysDir);
    const invalidSource = readFileSync(path, "utf8").replace(
      'type: "text",',
      'type: "select",',
    );
    writeFileSync(path, invalidSource);

    const messages = typeErrors(path).map((diagnostic) =>
      ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"),
    );
    expect(messages.some((message) => message.includes("choices"))).toBe(true);
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});

test("standalone scaffold requires safeParse-capable schemas", () => {
  const temp = mkdtempSync(join(tmpdir(), "survey-new-schema-"));
  const surveysDir = join(temp, "surveys");

  try {
    const path = scaffoldSurvey("demo", surveysDir);
    const source = readFileSync(path, "utf8");
    const prompt = '      prompt: "Your first question?",';

    const validSource = source.replace(
      prompt,
      `${prompt}\n      schema: {\n        safeParse(value: unknown) {\n          return { success: true as const, data: value };\n        },\n      },`,
    );
    writeFileSync(path, validSource);
    expect(typeErrors(path)).toHaveLength(0);

    const invalidSource = source.replace(
      prompt,
      `${prompt}\n      schema: "required",`,
    );
    writeFileSync(path, invalidSource);
    const messages = typeErrors(path).map((diagnostic) =>
      ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"),
    );
    expect(
      messages.some(
        (message) =>
          message.includes("SafeParseSchema") || message.includes("safeParse"),
      ),
    ).toBe(true);
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});

test("standalone defineSurvey keeps empty and duplicate-id runtime checks", async () => {
  const temp = mkdtempSync(join(tmpdir(), "survey-new-validation-"));
  const surveysDir = join(temp, "surveys");

  try {
    const starterPath = scaffoldSurvey("demo", surveysDir);
    const source = readFileSync(starterPath, "utf8");
    expect(source).toContain(STARTER_QUESTION);

    const emptyPath = join(surveysDir, "empty.ts");
    writeFileSync(
      emptyPath,
      source.replace(STARTER_QUESTION, "  questions: [],"),
    );
    await expect(import(pathToFileURL(emptyPath).href)).rejects.toThrow(
      "survey must have at least one question",
    );

    const duplicatePath = join(surveysDir, "duplicate.ts");
    const duplicateQuestions = `  questions: [
    {
      id: "same",
      type: "text",
      prompt: "First?",
    },
    {
      id: "same",
      type: "text",
      prompt: "Second?",
    },
  ],`;
    writeFileSync(
      duplicatePath,
      source.replace(STARTER_QUESTION, duplicateQuestions),
    );
    await expect(import(pathToFileURL(duplicatePath).href)).rejects.toThrow(
      "duplicate question id: same",
    );
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});

test("compiled CLI can create and list a scaffold from an external directory", () => {
  const temp = mkdtempSync(join(tmpdir(), "survey-new-built-"));
  const externalDir = join(temp, "external-project");
  const binary = join(
    temp,
    process.platform === "win32" ? "survey.exe" : "survey",
  );
  mkdirSync(externalDir, { recursive: true });

  try {
    const build = Bun.spawnSync(
      [
        process.execPath,
        "build",
        "--compile",
        resolve("bin/survey.ts"),
        "--outfile",
        binary,
      ],
      { stdout: "pipe", stderr: "pipe" },
    );
    expect(build.exitCode).toBe(0);

    const create = Bun.spawnSync([binary, "new", "demo"], {
      cwd: externalDir,
      stdout: "pipe",
      stderr: "pipe",
    });
    expect(create.exitCode).toBe(0);
    const generatedPath = join(externalDir, "surveys", "demo.ts");
    expect(readFileSync(generatedPath, "utf8")).not.toContain(
      "@crafter/survey-cli",
    );
    expect(typeErrors(generatedPath)).toHaveLength(0);

    const list = Bun.spawnSync([binary, "list"], {
      cwd: externalDir,
      stdout: "pipe",
      stderr: "pipe",
    });
    expect(list.exitCode).toBe(0);
    expect(decoder.decode(list.stdout)).toContain("demo");
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});
