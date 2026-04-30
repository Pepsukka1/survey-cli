import { describe, expect, test } from "bun:test";
import { Command } from "commander";
import { buildProgram } from "../src/cli.ts";

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
});
