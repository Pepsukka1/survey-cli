import {
  afterEach,
  beforeEach,
  describe,
  expect,
  setSystemTime,
  test,
} from "bun:test";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  clearInProgress,
  discoverSurveyFiles,
  listResponses,
  loadInProgress,
  loadSurveyById,
  saveInProgress,
  saveResponse,
} from "../src/storage.ts";

const originalHome = process.env.SURVEY_CLI_HOME;
let home: string;

beforeEach(() => {
  home = join(tmpdir(), `survey-cli-test-${crypto.randomUUID()}`);
  process.env.SURVEY_CLI_HOME = home;
  setSystemTime(new Date("2026-04-30T06:00:00.000Z"));
});

afterEach(() => {
  setSystemTime();
  if (originalHome === undefined) {
    delete process.env.SURVEY_CLI_HOME;
  } else {
    process.env.SURVEY_CLI_HOME = originalHome;
  }
  rmSync(home, { force: true, recursive: true });
});

describe("storage", () => {
  test("saveResponse writes JSON and returns path", () => {
    const path = saveResponse("onboarding", { role: "dev" });
    const saved = JSON.parse(readFileSync(path, "utf8"));

    expect(path).toContain("2026-04-30T06-00-00-000Z.json");
    expect(saved).toEqual({
      surveyId: "onboarding",
      timestamp: "2026-04-30T06-00-00-000Z",
      answers: { role: "dev" },
    });
  });

  test("saveInProgress and loadInProgress roundtrip", () => {
    saveInProgress("onboarding", { role: "dev" }, "stack");

    expect(loadInProgress("onboarding")).toMatchObject({
      surveyId: "onboarding",
      answers: { role: "dev" },
      inProgress: true,
      lastQuestionId: "stack",
    });
  });

  test("clearInProgress removes file", () => {
    const path = saveInProgress("onboarding", { role: "dev" }, "stack");

    clearInProgress("onboarding");

    expect(existsSync(path)).toBe(false);
    expect(loadInProgress("onboarding")).toBeNull();
  });

  test("listResponses skips in-progress.json", () => {
    saveResponse("onboarding", { role: "dev" });
    saveInProgress("onboarding", { role: "founder" }, "stack");

    expect(listResponses("onboarding")).toHaveLength(1);
    expect(listResponses("onboarding")[0]?.answers).toEqual({ role: "dev" });
  });

  test("discoverSurveyFiles finds TypeScript and ESM survey files", () => {
    const dir = join(home, "surveys");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "first.ts"), "export default {};");
    writeFileSync(join(dir, "second.mjs"), "export default {};");
    writeFileSync(join(dir, "ignore.txt"), "");

    expect(
      discoverSurveyFiles(dir)
        .map((file) => file.split("/").pop())
        .sort(),
    ).toEqual(["first.ts", "second.mjs"]);
  });

  test("loadSurveyById returns matching survey", async () => {
    const dir = join(home, "surveys");
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, "onboarding.ts"),
      'export default { id: "onboarding", title: "Onboarding", questions: [] };',
    );

    await expect(loadSurveyById("onboarding", dir)).resolves.toMatchObject({
      id: "onboarding",
      title: "Onboarding",
      questions: [],
    });
    await expect(loadSurveyById("missing", dir)).resolves.toBeNull();
  });
});
