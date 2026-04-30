import { expect, test } from "bun:test";
import { z } from "zod";
import type { Survey } from "../src/define.ts";
import { runAgent } from "../src/runner/agent.ts";

test("runAgent returns ok with full answers when all provided and valid", () => {
  const survey: Survey = {
    id: "agent-ok",
    title: "Agent ok",
    questions: [
      { id: "name", type: "text", prompt: "Name?" },
      { id: "age", type: "number", prompt: "Age?" },
      {
        id: "stack",
        type: "multiselect",
        prompt: "Stack?",
        choices: ["bun", "node"],
      },
    ],
  };

  expect(runAgent(survey, { name: "Hunter", age: 31, stack: ["bun"] })).toEqual(
    {
      ok: true,
      answers: { name: "Hunter", age: 31, stack: ["bun"] },
      visited: ["name", "age", "stack"],
    },
  );
});

test("runAgent returns missing error when answer is absent", () => {
  const survey: Survey = {
    id: "agent-missing",
    title: "Agent missing",
    questions: [
      { id: "name", type: "text", prompt: "Name?" },
      { id: "age", type: "number", prompt: "Age?" },
    ],
  };

  expect(runAgent(survey, { name: "Hunter" })).toEqual({
    ok: false,
    errors: [{ questionId: "age", reason: "missing" }],
    visited: ["name", "age"],
  });
});

test("runAgent returns invalid error when zod fails", () => {
  const survey: Survey = {
    id: "agent-invalid",
    title: "Agent invalid",
    questions: [
      {
        id: "email",
        type: "text",
        prompt: "Email?",
        schema: z.string().email(),
      },
    ],
  };

  const result = runAgent(survey, { email: "not-an-email" });

  expect(result.ok).toBe(false);
  if (!result.ok) {
    expect(result.errors[0]?.questionId).toBe("email");
    expect(result.errors[0]?.reason).toBe("invalid");
    expect(result.visited).toEqual(["email"]);
  }
});

test("runAgent walks branching and q.next() returning null short-circuits", () => {
  const survey: Survey = {
    id: "agent-branching",
    title: "Agent branching",
    questions: [
      {
        id: "done",
        type: "confirm",
        prompt: "Done?",
        next: () => null,
      },
      { id: "details", type: "text", prompt: "Details?" },
    ],
  };

  expect(runAgent(survey, { done: true, details: "ignored" })).toEqual({
    ok: true,
    answers: { done: true },
    visited: ["done"],
  });
});

test("runAgent skipIf skips questions correctly", () => {
  const survey: Survey = {
    id: "agent-skip",
    title: "Agent skip",
    questions: [
      { id: "wantsEmail", type: "confirm", prompt: "Email?" },
      {
        id: "email",
        type: "text",
        prompt: "Email address?",
        skipIf: (answers) => answers.wantsEmail === false,
      },
      { id: "name", type: "text", prompt: "Name?" },
    ],
  };

  expect(runAgent(survey, { wantsEmail: false, name: "Hunter" })).toEqual({
    ok: true,
    answers: { wantsEmail: false, name: "Hunter" },
    visited: ["wantsEmail", "email", "name"],
  });
});
