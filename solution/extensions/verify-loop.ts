import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { spawn } from "node:child_process";
import { readFile, rm } from "node:fs/promises";
import path from "node:path";
import { reclaimAppOwnedPort } from "../../src/port-owner.js";
import { terminateProcessTree, usesDetachedProcessGroup } from "../../src/process-tree.js";
import { portHasListener } from "../../src/verify-app.js";
import { SUBMIT_CANDIDATE_TOOL_NAME } from "./submit-candidate.js";

/**
 * Closes the loop on "the model said it was done".
 *
 * The outer runner already verifies the finished app, but by then the run is
 * over and a failure can only be recorded, not fixed. This extension verifies
 * `candidate.json` inside the structured submission tool result. A failure
 * reaches the still-valid compiled stage and
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
  timedOut: boolean;
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
      child = spawn(command, args, {
        cwd,
        detached: usesDetachedProcessGroup(),
        env: process.env,
        shell: false,
        stdio: ["ignore", "pipe", "pipe"],
      });
    } catch (error) {
      resolve({ ok: false, output: String(error), timedOut: false });
      return;
    }

    let output = "";
    let settled = false;
    let timedOut = false;
    const finish = (ok: boolean): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ ok, output, timedOut });
    };

    const timer = setTimeout(() => {
      timedOut = true;
      output += `\n[verify-loop] ${command} exceeded ${COMMAND_TIMEOUT_MS}ms and was stopped.`;
      void terminateProcessTree(child).finally(() => finish(false));
    }, COMMAND_TIMEOUT_MS);

    const collect = (chunk: Buffer): void => {
      output += chunk.toString("utf8");
    };
    child.stdout?.on("data", collect);
    child.stderr?.on("data", collect);
    child.once("error", (error) => {
      output += String(error);
      if (!timedOut) finish(false);
    });
    child.once("close", (code) => {
      if (!timedOut) finish(code === 0);
    });
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

  pi.on("tool_result", async (event, context) => {
    if (event.toolName !== SUBMIT_CANDIDATE_TOOL_NAME || event.isError) return undefined;
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
      context.abort();
      return {
        content: [
          ...event.content,
          {
            type: "text" as const,
            text: "Candidate verification budget is exhausted. The agent run was stopped; the outer runner will record this run as failed.",
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
        : { ok: false, output: "Skipped because deterministic generation failed.", timedOut: false };
      let build = test.ok
        ? await runCommand(
            commands.npm.command,
            [...commands.npm.argsPrefix, "run", "build"],
            appRoot,
          )
        : { ok: false, output: "Skipped because the test suite failed.", timedOut: false };
      // A transient process-launch stall should not buy a model repair turn.
      // Retry only timeouts, once; deterministic failures still go straight
      // back to the agent with the original diagnostics.
      if (build.timedOut) {
        build = await runCommand(
          commands.npm.command,
          [...commands.npm.argsPrefix, "run", "build"],
          appRoot,
        );
      }

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
        // The tool result is already deterministic proof of completion. Abort
        // the active operation so Pi does not reload the full context merely
        // to generate an acknowledgment such as `done`.
        context.abort();
        return {
          content: [
            ...event.content,
            {
              type: "text" as const,
              text: "Deterministic materialization, journeys, API contracts, tests, build, and report all passed. The agent run was stopped without another model call.",
            },
          ],
          isError: false,
        };
      }

      const remaining = MAX_ATTEMPTS - attempts;
      if (remaining === 0) context.abort();
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
                ? "Submit a corrected complete candidate with the cause fixed. Do not delete or skip a failing test."
                : "This was the final verification attempt. The agent run was stopped; the outer runner will record the failure.",
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
