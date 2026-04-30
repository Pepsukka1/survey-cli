import { describe, expect, test } from "bun:test";
import { z } from "zod";
import { defineSurvey, q } from "../src/define.ts";
import { serializeSurvey } from "../src/serialize.ts";

describe("serializeSurvey", () => {
  test("marks linear next when no next() fn", () => {
    const serialized = serializeSurvey(
      defineSurvey({
        id: "linear",
        title: "Linear",
        questions: [q.text("name", "Name?"), q.confirm("ok", "Ok?")],
      }),
    );

    expect(serialized.questions[0]?.branching).toEqual({
      kind: "linear",
      next: "ok",
    });
    expect(serialized.questions[1]?.branching).toEqual({
      kind: "linear",
      next: null,
    });
  });

  test("marks dynamic when next() defined", () => {
    const serialized = serializeSurvey(
      defineSurvey({
        id: "dynamic",
        title: "Dynamic",
        questions: [
          q.confirm("followup", "Follow up?", {
            next: (answers) => (answers.followup ? "email" : null),
          }),
          q.text("email", "Email?"),
        ],
      }),
    );

    expect(serialized.questions[0]?.branching).toEqual({ kind: "dynamic" });
  });

  test("records entry as first question", () => {
    const serialized = serializeSurvey(
      defineSurvey({
        id: "entry",
        title: "Entry",
        questions: [q.text("first", "First?"), q.text("second", "Second?")],
      }),
    );

    expect(serialized.entry).toBe("first");
  });

  test("includes choices for select/multiselect", () => {
    const serialized = serializeSurvey(
      defineSurvey({
        id: "choices",
        title: "Choices",
        questions: [
          q.select("role", "Role?", ["dev", "designer"]),
          q.multiselect("stack", "Stack?", ["next", "astro"]),
        ],
      }),
    );

    expect(serialized.questions[0]?.choices).toEqual(["dev", "designer"]);
    expect(serialized.questions[1]?.choices).toEqual(["next", "astro"]);
  });

  test("skipIfDynamic flag set correctly", () => {
    const serialized = serializeSurvey(
      defineSurvey({
        id: "skip",
        title: "Skip",
        questions: [
          q.confirm("followup", "Follow up?"),
          q.text("email", "Email?", {
            schema: z.string().email(),
            skipIf: (answers) => !answers.followup,
          }),
        ],
      }),
    );

    expect(serialized.questions[0]?.skipIfDynamic).toBe(false);
    expect(serialized.questions[1]?.skipIfDynamic).toBe(true);
    expect(serialized.questions[1]?.hasValidation).toBe(true);
  });
});
