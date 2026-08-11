import { expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { scaffoldSurvey } from "../src/scaffold.ts";
import { loadSurveyById } from "../src/storage.ts";

test("survey new scaffold is discoverable and parses", async () => {
  const temp = mkdtempSync(join(tmpdir(), "survey-new-source-"));
  const surveysDir = join(temp, "surveys");

  try {
    const path = scaffoldSurvey("demo", surveysDir);
    const source = readFileSync(path, "utf8");

    expect(path).toBe(join(surveysDir, "demo.ts"));
    expect(source).toContain('id: "demo"');
    expect(source).not.toContain("@crafter/survey-cli");

    const survey = await loadSurveyById("demo", surveysDir);
    expect(survey?.id).toBe("demo");
    expect(survey?.questions).toHaveLength(1);
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});

test("compiled CLI can create and list a scaffold from an external directory", () => {
  const temp = mkdtempSync(join(tmpdir(), "survey-new-built-"));
  const externalDir = join(temp, "external-project");
  const binary = join(temp, process.platform === "win32" ? "survey.exe" : "survey");
  mkdirSync(externalDir, { recursive: true });

  try {
    const build = Bun.spawnSync(
      [process.execPath, "build", "--compile", resolve("bin/survey.ts"), "--outfile", binary],
      { stdout: "pipe", stderr: "pipe" },
    );
    expect(build.exitCode).toBe(0);

    const create = Bun.spawnSync([binary, "new", "demo"], {
      cwd: externalDir,
      stdout: "pipe",
      stderr: "pipe",
    });
    expect(create.exitCode).toBe(0);
    expect(readFileSync(join(externalDir, "surveys", "demo.ts"), "utf8")).not.toContain(
      "@crafter/survey-cli",
    );

    const list = Bun.spawnSync([binary, "list"], {
      cwd: externalDir,
      stdout: "pipe",
      stderr: "pipe",
    });
    expect(list.exitCode).toBe(0);
    expect(list.stdout.toString()).toContain("demo");
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});
