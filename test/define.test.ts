import { describe, expect, test } from "bun:test";
import { z } from "zod";
import { defaultSchemaFor, defineSurvey, q } from "../src/define.ts";

describe("defineSurvey", () => {
  test("throws on empty questions", () => {
    expect(() =>
      defineSurvey({
        id: "empty",
        title: "Empty",
        questions: [],
      }),
    ).toThrow("survey must have at least one question");
  });

  test("throws on duplicate ids", () => {
    expect(() =>
      defineSurvey({
        id: "duplicates",
        title: "Duplicates",
        questions: [q.text("name", "Name?"), q.confirm("name", "Continue?")],
      }),
    ).toThrow("duplicate question id: name");
  });
});

describe("q helpers", () => {
  test("q.text returns proper shape", () => {
    expect(q.text("name", "Name?")).toEqual({
      id: "name",
      type: "text",
      prompt: "Name?",
    });
  });

  test("q.select includes choices", () => {
    expect(q.select("role", "Role?", ["dev", "designer"])).toEqual({
      id: "role",
      type: "select",
      prompt: "Role?",
      choices: ["dev", "designer"],
    });
  });

  test("q.confirm with next() preserved", () => {
    const next = (answers: Record<string, unknown>) =>
      answers.continue ? "email" : null;
    const question = q.confirm("continue", "Continue?", { next });

    expect(question.next).toBe(next);
    expect(question.next?.({ continue: true })).toBe("email");
  });
});

describe("defaultSchemaFor", () => {
  test("returns correct zod for each type", () => {
    expect(
      defaultSchemaFor(q.text("name", "Name?")).safeParse("Hunter").success,
    ).toBe(true);
    expect(
      defaultSchemaFor(q.longtext("bio", "Bio?")).safeParse("Long answer")
        .success,
    ).toBe(true);
    expect(
      defaultSchemaFor(
        q.select("role", "Role?", ["dev", "designer"]),
      ).safeParse("dev").success,
    ).toBe(true);
    expect(
      defaultSchemaFor(
        q.multiselect("stack", "Stack?", ["next", "astro"]),
      ).safeParse(["next"]).success,
    ).toBe(true);
    expect(
      defaultSchemaFor(q.confirm("ok", "Ok?")).safeParse(true).success,
    ).toBe(true);
    expect(
      defaultSchemaFor(q.number("age", "Age?")).safeParse(33).success,
    ).toBe(true);
  });

  test("returns provided schema", () => {
    const schema = z.string().email();

    expect(defaultSchemaFor(q.text("email", "Email?", { schema }))).toBe(
      schema,
    );
  });
});
