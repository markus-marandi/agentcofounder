import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { spawn } from "node:child_process";
import { readFile, rm } from "node:fs/promises";
import path from "node:path";
import { reclaimAppOwnedPort } from "../../src/port-owner.js";
import { portHasListener } from "../../src/verify-app.js";

/**
 * Closes the loop on "the model said it was done".
 *
 * The outer runner already verifies the finished app, but by then the run is
 * over and a failure can only be recorded, not fixed. This extension verifies
 * `candidate.json` inside the write tool result, before the normal follow-up
 * model call. A failure therefore reaches the still-valid compiled stage and
 * can be repaired without a new challenge run or a second discovery stage.
 *
 * It deliberately does not start a development server: the runner owns port
 * 3000, and a listener left behind degrades the result. It does, however,
 * reclaim a listener the agent leaves running here, so a stray `npm run dev`
 * process is killed and reported to the agent instead of surviving to the
 * outer runner's own (audit-flagged) cleanup.
 */

const APP_PORT = 3000;
const MAX_ATTEMPTS = Number(process.env.LOOP_MAX_ATTEMPTS ?? "3");
const COMMAND_TIMEOUT_MS = Number(process.env.LOOP_COMMAND_TIMEOUT_MS ?? "120000");

/** Leaves room for the repair turns themselves inside the run's wall clock. */
const TIME_BUDGET_MS = Math.max(
  60_000,
  Math.floor(Number(process.env.CHALLENGE_TIMEOUT_MS ?? "900000") * 0.75),
);

interface CommandOutcome {
  ok: boolean;
  output: string;
}

interface CommandInvocation {
  command: string;
  argsPrefix: string[];
}

export function verificationInvocations(
  appRoot: string,
  platform: NodeJS.Platform = process.platform,
  execPath = process.execPath,
): { vitest: CommandInvocation; npm: CommandInvocation } {
  if (platform !== "win32") {
    return {
      vitest: { command: path.join(appRoot, "node_modules", ".bin", "vitest"), argsPrefix: [] },
      npm: { command: "npm", argsPrefix: [] },
    };
  }

  return {
    vitest: {
      command: execPath,
      argsPrefix: [path.join(appRoot, "node_modules", "vitest", "vitest.mjs")],
    },
    npm: {
      command: execPath,
      argsPrefix: [path.join(path.dirname(execPath), "node_modules", "npm", "bin", "npm-cli.js")],
    },
  };
}

function runCommand(command: string, args: string[], cwd: string): Promise<CommandOutcome> {
  return new Promise((resolve) => {
    let child: ReturnType<typeof spawn>;
    try {
      child = spawn(command, args, { cwd, env: process.env, shell: false, stdio: ["ignore", "pipe", "pipe"] });
    } catch (error) {
      resolve({ ok: false, output: String(error) });
      return;
    }

    let output = "";
    let settled = false;
    const finish = (ok: boolean): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ ok, output });
    };

    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      output += `\n[verify-loop] ${command} exceeded ${COMMAND_TIMEOUT_MS}ms and was stopped.`;
      finish(false);
    }, COMMAND_TIMEOUT_MS);

    const collect = (chunk: Buffer): void => {
      output += chunk.toString("utf8");
    };
    child.stdout?.on("data", collect);
    child.stderr?.on("data", collect);
    child.once("error", (error) => {
      output += String(error);
      finish(false);
    });
    child.once("close", (code) => finish(code === 0));
  });
}

/** The kernel's own message for a misconfigured `parameters.json`. */
const PARAMETERS_MARKER = "Invalid parameters.json";

/**
 * Test output is long and mostly scaffolding. Only the lines that name what
 * broke are worth spending context on.
 *
 * An invalid `parameters.json` is singled out because its message is the most
 * actionable one the kernel produces and the least like the rest: the problems
 * are bullet lines carrying no word the generic filter looks for, so without
 * this they would be dropped and the agent would be told only that the build
 * failed.
 */
export function condense(output: string, limit = 2_400): string {
  const lines = output.split(/\r?\n/u);

  const marker = lines.findIndex((line) => line.includes(PARAMETERS_MARKER));
  if (marker >= 0) {
    const problems: string[] = [];
    for (const line of lines.slice(marker + 1)) {
      if (!/^\s*-\s/u.test(line)) break;
      problems.push(line.trim());
    }
    const block = [`${PARAMETERS_MARKER}:`, ...problems].join("\n");
    return block.length > limit ? `${block.slice(0, limit)}\n…` : block;
  }

  const interesting = lines.filter((line) =>
    /error|fail|✕|×|expected|received|cannot find|is not assignable|TS\d{4}/iu.test(line),
  );
  const chosen = (interesting.length > 0 ? interesting : lines.filter((line) => line.trim() !== "")).slice(-40);
  const text = chosen.join("\n");
  return text.length > limit ? `…\n${text.slice(-limit)}` : text;
}

async function reportedSuccess(cwd: string): Promise<boolean> {
  try {
    const raw = await readFile(path.join(cwd, "report.partial.json"), "utf8");
    return (JSON.parse(raw) as { status?: unknown }).status === "success";
  } catch {
    return false;
  }
}

export default function verifyLoop(pi: ExtensionAPI) {
  const appRoot = process.cwd();
  const startedAt = Date.now();
  let attempts = 0;
  let checking = false;

  pi.on("tool_result", async (event) => {
    const written = String((event.input as Record<string, unknown>).path ?? "");
    const relative = path.relative(appRoot, path.resolve(appRoot, written));
    if (event.toolName !== "write" || relative !== "candidate.json" || event.isError) return undefined;
    if (checking) {
      return {
        content: [
          ...event.content,
          { type: "text" as const, text: "Candidate verification is already running; wait for its result." },
        ],
        isError: true,
      };
    }
    if (attempts >= MAX_ATTEMPTS || Date.now() - startedAt > TIME_BUDGET_MS) {
      return {
        content: [
          ...event.content,
          {
            type: "text" as const,
            text: "Candidate verification budget is exhausted. Reply only `done`; the outer runner will record this run as failed.",
          },
        ],
        isError: true,
      };
    }

    attempts += 1;
    checking = true;
    try {
      const node = process.execPath;
      const commands = verificationInvocations(appRoot);

      const materialize = await runCommand(node, [path.join("tools", "materialize-candidate.mjs")], appRoot);

      // The journey suite is a function of `parameters.json`, so regenerate it
      // before judging the app: a configuration edited after the last
      // generation would otherwise be verified against a stale suite.
      const journeys = await runCommand(node, [path.join("tools", "generate-journeys.mjs")], appRoot);
      const api = await runCommand(node, [path.join("tools", "write-api.mjs")], appRoot);

      // The integration contract is derived from the same parameters.json, so
      // it is regenerated here too rather than left to drift.
      const contract = await runCommand(node, [path.join("tools", "write-contract.mjs")], appRoot);
      const reportPath = path.join(appRoot, ".verify-loop-tests.json");

      const generated = materialize.ok && journeys.ok && api.ok && contract.ok;
      const test = generated
        ? await runCommand(
            commands.vitest.command,
            [
              ...commands.vitest.argsPrefix,
              "run",
              "--reporter=json",
              `--outputFile=${reportPath}`,
              "--passWithNoTests=false",
            ],
            appRoot,
          )
        : { ok: false, output: "Skipped because deterministic generation failed." };
      const build = test.ok
        ? await runCommand(
            commands.npm.command,
            [...commands.npm.argsPrefix, "run", "build"],
            appRoot,
          )
        : { ok: false, output: "Skipped because the test suite failed." };

      const problems: string[] = [];
      if (!materialize.ok) {
        problems.push(`Candidate materialization failed:\n\n${condense(materialize.output)}`);
      }
      if (!journeys.ok) {
        problems.push(
          `\`npm run journeys\` failed, so the app has no journey suite:\n\n${condense(journeys.output)}`,
        );
      }
      if (!api.ok) problems.push(`API generation failed:\n\n${condense(api.output)}`);
      if (!contract.ok) {
        problems.push(
          `\`npm run contract\` failed, so the app has no openapi.json:\n\n${condense(contract.output)}`,
        );
      }
      if (!test.ok) problems.push(`\`npm test\` failed:\n\n${condense(test.output)}`);
      if (!build.ok) problems.push(`\`npm run build\` failed:\n\n${condense(build.output)}`);

      if (await portHasListener(APP_PORT)) {
        const reclamation = await reclaimAppOwnedPort(APP_PORT, appRoot);
        problems.push(
          `A process was still listening on port ${APP_PORT} (${reclamation.diagnostic}). Do not leave \`npm run dev\` or any other server running when you finish — the runner owns that port.`,
        );
      }

      if (materialize.ok && journeys.ok && api.ok && contract.ok && test.ok && build.ok) {
        // The report is derived, not authored, so write it here rather than
        // asking the agent for a file it would only be retyping.
        const report = await runCommand(node, [path.join("tools", "write-report.mjs"), reportPath], appRoot);
        if (!(await reportedSuccess(appRoot))) {
          problems.push(
            `\`npm run report\` did not report success:\n\n${condense(report.output)}`,
          );
        }
      }
      await rm(reportPath, { force: true });

      if (problems.length === 0) {
        return {
          content: [
            ...event.content,
            {
              type: "text" as const,
              text: "Deterministic materialization, journeys, API contracts, tests, build, and report all passed. Reply only `done`.",
            },
          ],
          isError: false,
        };
      }

      const remaining = MAX_ATTEMPTS - attempts;
      return {
        content: [
          ...event.content,
          {
            type: "text" as const,
            text: [
              `The candidate is not finished. Verification found ${problems.length === 1 ? "a problem" : `${problems.length} problems`}:`,
              "",
              problems.join("\n\n"),
              "",
              remaining > 0
                ? "Rewrite candidate.json with the cause fixed. Do not delete or skip a failing test."
                : "This was the final verification attempt. Reply only `done`; the outer runner will record any remaining failure.",
            ].join("\n"),
          },
        ],
        isError: true,
      };
    } finally {
      checking = false;
    }
  });
}
