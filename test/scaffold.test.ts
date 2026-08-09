import { expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { scaffoldSurvey } from "../src/scaffold.ts";
import { loadSurveyById } from "../src/storage.ts";

test("survey new scaffold is discoverable and parses", async () => {
  const temp = mkdtempSync(join(process.cwd(), ".survey-new-"));
  const surveysDir = join(temp, "surveys");

  try {
    const path = scaffoldSurvey("demo", surveysDir);
    const source = readFileSync(path, "utf8");

    expect(path).toBe(join(surveysDir, "demo.ts"));
    expect(source).toContain('id: "demo"');

    const survey = await loadSurveyById("demo", surveysDir);
    expect(survey?.id).toBe("demo");
    expect(survey?.questions).toHaveLength(1);
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});
