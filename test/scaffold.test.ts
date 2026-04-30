import { expect, test } from "bun:test";

test("scaffold exports package entrypoint", async () => {
  const entrypoint = await import("../src/index.ts");

  expect(entrypoint).toBeDefined();
});
