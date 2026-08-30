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
 * over and a failure can only be recorded, not fixed. This extension runs the
 * same two checks the moment the agent settles and, when one fails, hands the
 * failure back so the agent can repair it inside the same run.
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

  pi.on("agent_settled", async (_event, context) => {
    if (checking || attempts >= MAX_ATTEMPTS) return;
    if (Date.now() - startedAt > TIME_BUDGET_MS) return;

    checking = true;
    try {
      const node = process.execPath;
      const commands = verificationInvocations(appRoot);

      // The journey suite is a function of `parameters.json`, so regenerate it
      // before judging the app: a configuration edited after the last
      // generation would otherwise be verified against a stale suite.
      const journeys = await runCommand(node, [path.join("tools", "generate-journeys.mjs")], appRoot);
      const api = await runCommand(node, [path.join("tools", "write-api.mjs")], appRoot);

      const reportPath = path.join(appRoot, ".verify-loop-tests.json");

      const test = await runCommand(
        commands.vitest.command,
        [
          ...commands.vitest.argsPrefix,
          "run",
          "--reporter=json",
          `--outputFile=${reportPath}`,
          "--passWithNoTests=false",
        ],
        appRoot,
      );
      await rm(reportPath, { force: true });

      const build = await runCommand(
        commands.npm.command,
        [...commands.npm.argsPrefix, "run", "build"],
        appRoot,
      );

      const problems: string[] = [];
      if (!journeys.ok) {
        problems.push(
          `\`npm run journeys\` failed, so the app has no journey suite:\n\n${condense(journeys.output)}`,
        );
      }
      if (!api.ok) problems.push(`API generation failed:\n\n${condense(api.output)}`);
      if (!test.ok) problems.push(`\`npm test\` failed:\n\n${condense(test.output)}`);
      if (!build.ok) problems.push(`\`npm run build\` failed:\n\n${condense(build.output)}`);

      if (await portHasListener(APP_PORT)) {
        const reclamation = await reclaimAppOwnedPort(APP_PORT, appRoot);
        problems.push(
          `A process was still listening on port ${APP_PORT} (${reclamation.diagnostic}). Do not leave \`npm run dev\` or any other server running when you finish — the runner owns that port.`,
        );
      }

      if (journeys.ok && api.ok && test.ok && build.ok) {
        // The report is derived, not authored, so write it here rather than
        // asking the agent for a file it would only be retyping.
        const report = await runCommand(node, [path.join("tools", "write-report.mjs")], appRoot);
        if (!(await reportedSuccess(appRoot))) {
          problems.push(
            `\`npm run report\` did not report success:\n\n${condense(report.output)}`,
          );
        }
      }

      try {
        if (problems.length === 0) {
          context.ui?.setStatus?.("verify-loop", "tests and build pass");
          attempts = MAX_ATTEMPTS;
          return;
        }

        attempts += 1;
        const remaining = MAX_ATTEMPTS - attempts;
        pi.sendMessage(
          {
            customType: "verify-loop",
            content: [
              `The run is not finished. Verification found ${problems.length === 1 ? "a problem" : `${problems.length} problems`}:`,
              "",
              problems.join("\n\n"),
              "",
              remaining > 0
                ? "Fix the cause rather than the symptom, then say you are done again. Do not delete or skip a failing test to make it pass."
                : "This is the final repair attempt. Fix what you can, then make sure `report.partial.json` reports the outcome honestly — record any journey that still fails as `failed`.",
            ].join("\n"),
            display: true,
          },
          { deliverAs: "followUp", triggerTurn: true },
        );
      } catch (error) {
        // The turn that just settled can itself trigger session replacement
        // (Pi discarding a malformed response and starting over) between our
        // check running and this call landing. The captured `context`/`pi`
        // are stale by then and every session-bound call throws; there is no
        // event-handler-safe way to await settlement first (`ctx.waitForIdle`
        // is command-only and would deadlock here). Losing this one repair
        // nudge is safe: the outer runner verifies the app again after Pi
        // exits regardless.
        console.warn(
          `[verify-loop] Could not deliver repair guidance: the session was replaced before this check finished (${String(error)}).`,
        );
      }
    } finally {
      checking = false;
    }
  });
}
