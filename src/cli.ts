import { confirm, intro, isCancel, outro } from "@clack/prompts";
import { Command } from "commander";
import pc from "picocolors";
import { buildCsvExport } from "./export.ts";
import { runAgent } from "./runner/agent.ts";
import { runInteractive } from "./runner/interactive.ts";
import { showSummary } from "./runner/summary.ts";
import { scaffoldSurvey } from "./scaffold.ts";
import { serializeSurvey } from "./serialize.ts";
import {
  clearInProgress,
  listResponses,
  loadAllSurveys,
  loadInProgress,
  loadSurveyById,
  readResponse,
  saveInProgress,
  saveResponse,
} from "./storage.ts";

export function buildProgram(): Command {
  const program = new Command();
  program
    .name("survey")
    .description(
      "Run surveys from your terminal. Agent-friendly, type-safe, OSS.",
    )
    .version("0.0.1");

  program
    .command("new <id>")
    .description("Create a survey scaffold")
    .option("-d, --dir <path>", "directory for the new survey", "./surveys")
    .action((id, opts) => {
      try {
        console.log(pc.cyan(scaffoldSurvey(id, opts.dir)));
      } catch (error) {
        console.error(pc.red((error as Error).message));
        process.exit(1);
      }
    });

  program
    .command("list")
    .description("List surveys in ./surveys (or --dir)")
    .option(
      "-d, --dir <path>",
      "directory containing survey files",
      "./surveys",
    )
    .action(async (opts) => {
      const surveys = await loadAllSurveys(opts.dir);
      if (surveys.length === 0) {
        console.log(pc.dim(`No surveys found in ${opts.dir}`));
        return;
      }
      for (const survey of surveys) {
        console.log(
          `${pc.cyan(survey.id)}  ${pc.dim(survey.title)}  ${pc.gray(`(${survey.questions.length} questions)`)}`,
        );
      }
    });

  program
    .command("schema <id>")
    .description("Print survey schema as JSON")
    .option(
      "-d, --dir <path>",
      "directory containing survey files",
      "./surveys",
    )
    .action(async (id, opts) => {
      const survey = await loadSurveyById(id, opts.dir);
      if (!survey) {
        console.error(pc.red(`Survey not found: ${id}`));
        process.exit(1);
      }
      console.log(colorizeJson(serializeSurvey(survey)));
    });

  program
    .command("take <id>")
    .description(
      "Run survey interactively, in agent batch mode, or via stdin JSON",
    )
    .option(
      "-d, --dir <path>",
      "directory containing survey files",
      "./surveys",
    )
    .option(
      "-a, --answers <json>",
      "agent batch: provide answers as JSON string",
    )
    .option("--json", "agent batch: read answers from stdin as JSON")
    .option("-y, --yes", "skip summary confirm prompt")
    .action(async (id, opts) => {
      const survey = await loadSurveyById(id, opts.dir);
      if (!survey) {
        console.error(pc.red(`Survey not found: ${id}`));
        process.exit(1);
      }

      if (opts.answers || opts.json) {
        const raw = opts.json
          ? await Bun.stdin.text()
          : (opts.answers as string);
        let parsed: Record<string, unknown>;
        try {
          parsed = JSON.parse(raw);
        } catch (error) {
          console.error(pc.red(`Invalid JSON: ${(error as Error).message}`));
          process.exit(1);
        }

        const result = runAgent(survey, parsed);
        if (!result.ok) {
          for (const err of result.errors) {
            console.error(
              `${pc.red(pc.bold(err.reason))} ${pc.cyan(err.questionId)}${err.detail ? pc.dim(` — ${err.detail}`) : ""}`,
            );
          }
          console.error(pc.dim(`visited: ${result.visited.join(" → ")}`));
          process.exit(1);
        }

        const summary = await showSummary(survey, result.answers, {
          skipConfirm: Boolean(opts.yes),
        });
        if (!summary.confirmed) {
          console.error(pc.red(`Cancelled: ${summary.reason}`));
          process.exit(1);
        }

        console.log(
          pc.cyan(pc.underline(saveResponse(survey.id, result.answers))),
        );
        return;
      }

      const inProgress = loadInProgress(survey.id);
      let resumeFrom: Record<string, unknown> | undefined;
      let resumeStartId: string | null | undefined;
      if (inProgress) {
        intro("Resume previous session?");
        const choice = await confirm({
          message: `Found in-progress at ${inProgress.lastQuestionId ?? "start"}. Resume?`,
        });
        if (isCancel(choice)) {
          outro("Cancelled");
          process.exit(0);
        }
        if (choice) {
          resumeFrom = inProgress.answers;
          resumeStartId = inProgress.lastQuestionId;
        } else {
          clearInProgress(survey.id);
        }
      }

      const result = await runInteractive(survey, {
        resumeFrom,
        resumeStartId,
      });
      if (!result.ok) {
        saveInProgress(survey.id, result.partial, result.lastQuestionId);
        console.error(pc.dim("Saved in-progress. Run again to resume."));
        process.exit(1);
      }

      const summary = await showSummary(survey, result.answers, {
        skipConfirm: Boolean(opts.yes),
      });
      if (!summary.confirmed) {
        console.error(pc.red(`Cancelled: ${summary.reason}`));
        process.exit(1);
      }

      clearInProgress(survey.id);
      console.log(
        pc.cyan(pc.underline(saveResponse(survey.id, result.answers))),
      );
    });

  const responses = program
    .command("responses <id>")
    .description("List or show responses for a survey")
    .option("--export <format>", "export all responses (csv|json)")
    .action((id, opts) => {
      if (opts.export) {
        const all = listResponses(id);
        if (opts.export === "csv") {
          const exported = buildCsvExport(all);
          if (exported.mixedShapes) {
            console.error(
              pc.yellow(
                "Warning: responses contain different answer shapes; CSV columns are unioned and missing answers are blank.",
              ),
            );
          }
          process.stdout.write(exported.csv);
          return;
        }
        if (opts.export === "json") {
          console.log(JSON.stringify(all, null, 2));
          return;
        }
        console.error(`Unknown export format: ${opts.export}`);
        process.exit(1);
      }

      const all = listResponses(id);
      if (all.length === 0) {
        console.log(pc.dim("(no responses)"));
        return;
      }
      for (const response of all) console.log(pc.cyan(response.timestamp));
    });

  responses
    .command("show <timestamp>")
    .description("Show one response by timestamp prefix")
    .action((timestamp, _opts, cmd) => {
      const id = cmd.parent?.args[0];
      if (!id) {
        console.error("missing survey id");
        process.exit(1);
      }
      const response = readResponse(id, timestamp);
      if (!response) {
        console.error(pc.red("not found"));
        process.exit(1);
      }
      console.log(colorizeJson(response));
    });

  return program;
}

function colorizeJson(value: unknown): string {
  const json = JSON.stringify(value, null, 2);
  return json.replace(
    /"([^"]+)":/g,
    (_match, key) => `${pc.cyan(`"${key}"`)}:`,
  );
}

if (import.meta.main) {
  buildProgram()
    .parseAsync(process.argv)
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
