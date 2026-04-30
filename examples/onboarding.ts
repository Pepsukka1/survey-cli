import { z } from "zod";
import { defineSurvey, q } from "../src/define.ts";

export default defineSurvey({
  id: "onboarding",
  title: "Welcome - quick onboarding",
  questions: [
    q.select("role", "What best describes you?", [
      "dev",
      "designer",
      "founder",
      "student",
    ]),
    q.multiselect("stack", "What do you ship with?", [
      "next",
      "astro",
      "remix",
      "svelte",
      "react-native",
    ]),
    q.text("biggest_blocker", "What is your biggest blocker?", {
      schema: z.string().min(10),
    }),
    q.confirm("want_followup", "Want a followup email?", {
      next: (answers) => (answers.want_followup ? "email" : null),
    }),
    q.text("email", "Email?", {
      schema: z.string().email(),
      skipIf: (answers) => !answers.want_followup,
    }),
  ],
});
