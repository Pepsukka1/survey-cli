import { expect, test } from "bun:test";
import type { Survey } from "../src/define.ts";
import { nextId } from "../src/runner/interactive.ts";

const survey: Survey = {
  id: "runner-interactive",
  title: "Runner interactive",
  questions: [
    { id: "first", type: "text", prompt: "First?" },
    { id: "second", type: "text", prompt: "Second?" },
    { id: "third", type: "text", prompt: "Third?" },
  ],
};

test("nextId returns q.next() result when defined", () => {
  const question = {
    id: "first",
    type: "text",
    prompt: "First?",
    next: () => "third",
  } satisfies Survey["questions"][number];

  expect(nextId(survey, question, {})).toBe("third");
});

test("nextId returns next array element when no next() exists", () => {
  const [question] = survey.questions;
  if (!question) {
    throw new Error("missing question");
  }

  expect(nextId(survey, question, {})).toBe("second");
});

test("nextId returns null at the end of the array", () => {
  const question = survey.questions.at(-1);
  if (!question) {
    throw new Error("missing question");
  }

  expect(nextId(survey, question, {})).toBeNull();
});
