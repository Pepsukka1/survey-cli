#!/usr/bin/env bun
import { buildProgram } from "../src/cli.ts";

buildProgram()
  .parseAsync(process.argv)
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
