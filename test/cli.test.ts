import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Command } from "commander";
import { buildProgram } from "../src/cli.ts";

const originalHome = process.env.SURVEY_CLI_HOME;
let home: string;

beforeEach(() => {
  home = join(tmpdir(), `survey-cli-command-test-${crypto.randomUUID()}`);
  process.env.SURVEY_CLI_HOME = home;
});

afterEach(() => {
  if (originalHome === undefined) {
    delete process.env.SURVEY_CLI_HOME;
  } else {
    process.env.SURVEY_CLI_HOME = originalHome;
  }
  rmSync(home, { recursive: true, force: true });
});

function writeResponse(
  filename: string,
  timestamp: string,
  answers: Record<string, unknown> = { role: "dev" },
): string {
  const dir = join(home, "onboarding");
  mkdirSync(dir, { recursive: true });
  const path = join(dir, filename);
  writeFileSync(
    path,
    JSON.stringify({ surveyId: "onboarding", timestamp, answers }, null, 2),
  );
  return path;
}

describe("buildProgram", () => {
  test("returns a commander command", () => {
    expect(buildProgram()).toBeInstanceOf(Command);
  });

  test("registers expected subcommands", () => {
    const names = buildProgram().commands.map((command) => command.name());

    expect(names).toContain("list");
    expect(names).toContain("schema");
    expect(names).toContain("take");
    expect(names).toContain("responses");
  });

  test("documented responses show syntax reaches the show action", async () => {
    writeResponse("2026-04-30T06-00-00-000Z.json", "2026-04-30T06-00-00-000Z");
    const log = spyOn(console, "log").mockImplementation(() => undefined);

    try {
      await buildProgram().parseAsync([
        "node",
        "survey",
        "responses",
        "onboarding",
        "show",
        "2026-04-30T06-00",
      ]);

      expect(log).toHaveBeenCalledTimes(1);
      expect(String(log.mock.calls[0]?.[0])).toContain('"role": "dev"');
    } finally {
      log.mockRestore();
    }
  });

  test("documented responses delete syntax deletes the response", async () => {
    const path = writeResponse(
      "2026-04-30T06-00-00-000Z.json",
      "2026-04-30T06-00-00-000Z",
    );
    const log = spyOn(console, "log").mockImplementation(() => undefined);

    try {
      await buildProgram().parseAsync([
        "node",
        "survey",
        "responses",
        "onboarding",
        "delete",
        "2026-04-30T06-00",
      ]);

      expect(existsSync(path)).toBe(false);
      expect(log).toHaveBeenCalledWith("Deleted 2026-04-30T06-00-00-000Z");
    } finally {
      log.mockRestore();
    }
  });
});
