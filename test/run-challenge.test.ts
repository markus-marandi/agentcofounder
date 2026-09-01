import { mkdtemp, mkdir, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { compileSingleStageContext } from "../src/icm-context.js";
import {
  PI_DOCUMENTATION_HEADING,
  stripPiDocumentationBlock,
} from "../solution/extensions/protected-paths.js";
import {
  buildPiArguments,
  canVerifyGeneratedCandidate,
  parseArguments,
  runPi,
  runRequiresFailureExit,
} from "../src/run-challenge.js";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true })));
});

describe("Pi launch", () => {
  it("uses the replaceable public prompt by default and permits organizer overrides", () => {
    expect(parseArguments([]).ideaFile).toBe(path.resolve("contract-public", "development-idea.txt"));
    expect(parseArguments(["--idea-file", "organizer/idea.txt"]).ideaFile).toBe(
      path.resolve("organizer/idea.txt"),
    );
  });

  it("fails an otherwise successful run when a required result destination is missing", () => {
    expect(runRequiresFailureExit(0, "success", ["/challenge/result.json"])).toBe(true);
    expect(runRequiresFailureExit(0, "success", [])).toBe(false);
  });

  it("uses deterministic non-interactive flags and defaults thinking off", () => {
    const previousThinking = process.env.CHALLENGE_THINKING;
    delete process.env.CHALLENGE_THINKING;
    try {
      const args = buildPiArguments(
        "Build a tool",
        "Stable system prompt",
        "Create, edit, delete, narrow, derive, and persist",
        "Stable app contract",
        "/tmp/run",
      );
      expect(args).toContain("--offline");
      expect(args).toContain("--no-context-files");
      expect(args[args.indexOf("--tools") + 1]).toBe("submit_candidate");
      expect(args).not.toContain("--skill");
      expect(args).not.toContain("--print");
      expect(args).not.toContain("--approve");
      expect(args[args.indexOf("--thinking") + 1]).toBe("off");
      expect(args).not.toContain("--system-prompt");
      expect(args[args.indexOf("--append-system-prompt") + 1]).toContain("Stable app contract");
      expect(args[args.indexOf("--append-system-prompt") + 1]).toContain(
        "Create, edit, delete, narrow, derive, and persist",
      );
      expect(args.at(-1)).toContain("Build a tool");
    } finally {
      if (previousThinking === undefined) delete process.env.CHALLENGE_THINKING;
      else process.env.CHALLENGE_THINKING = previousThinking;
    }
  });

  it("does not verify the seed app when candidate materialization failed", () => {
    expect(canVerifyGeneratedCandidate(0, 2, 1)).toBe(false);
    expect(canVerifyGeneratedCandidate(0, 2, 0)).toBe(true);
    expect(canVerifyGeneratedCandidate(1, 2, 0)).toBe(false);
    expect(canVerifyGeneratedCandidate(0, 0, 0)).toBe(false);
  });

  it("normalizes Windows line endings before sending model context", () => {
    const args = buildPiArguments(
      "Build\r\na tool",
      "Stable\r\nsystem prompt",
      "Public\rjourneys",
      "App\r\ncontract",
      "/tmp/run",
    );

    expect(args[args.indexOf("--append-system-prompt") + 1]).not.toContain("\r");
    expect(args.at(-1)).not.toContain("\r");
  });

  it("appends one compiled ICM stage and its minified structural seed", async () => {
    const [stage, seed] = await Promise.all([
      readFile(path.resolve("solution/icm-configure-stage.md"), "utf8"),
      readFile(path.resolve("app-template/parameters.json"), "utf8"),
    ]);
    const compiledContext = compileSingleStageContext(stage, seed);
    const args = buildPiArguments("Build a tool", compiledContext, "", "", "/tmp/run");
    const suppliedSystemPrompt = args[args.indexOf("--append-system-prompt") + 1] ?? "";

    expect(suppliedSystemPrompt).toBe(compiledContext.trim());
    expect(suppliedSystemPrompt).toContain("structured candidate with `submit_candidate`");
    expect(suppliedSystemPrompt).toContain("Do not drop an implied journey");
    expect(suppliedSystemPrompt).not.toContain('"route":"web-app"');
    expect(suppliedSystemPrompt).not.toContain('"adapter":"localStorage"');
    expect(suppliedSystemPrompt).not.toContain("\r");
  });

  it("removes only Pi's documentation block from the composed system prompt", () => {
    const composed = [
      "Available tools:",
      "- read: Read files",
      "",
      "Guidelines:",
      "- Use bash for file operations",
      "",
      `${PI_DOCUMENTATION_HEADING}the user asks about pi itself):`,
      "- Main documentation: /challenge/node_modules/pi/README.md",
      "- Additional docs: /challenge/node_modules/pi/docs",
      "- Always read pi .md files completely",
      "",
      "Build the smallest maintainable application.",
      "",
      "<available_skills>mvp-builder</available_skills>",
      "Current working directory: /challenge/output/app",
    ].join("\n");

    const stripped = stripPiDocumentationBlock(composed);
    expect(stripped).toContain("Available tools:");
    expect(stripped).toContain("Guidelines:");
    expect(stripped).toContain("Build the smallest maintainable application.");
    expect(stripped).toContain("<available_skills>mvp-builder</available_skills>");
    expect(stripped).toContain("Current working directory: /challenge/output/app");
    expect(stripped).not.toContain("Pi documentation");
    expect(stripped).not.toContain("node_modules/pi/docs");
    expect(stripPiDocumentationBlock("No Pi documentation block")).toBe("No Pi documentation block");
  });

  it("pins the Pi documentation heading used by the prompt filter", async () => {
    const piEntry = fileURLToPath(import.meta.resolve("@earendil-works/pi-coding-agent"));
    const piSystemPromptPath = path.join(
      path.dirname(piEntry),
      "core",
      "system-prompt.js",
    );
    const piSystemPromptSource = await readFile(piSystemPromptPath, "utf8");

    expect(piSystemPromptSource.split(PI_DOCUMENTATION_HEADING)).toHaveLength(2);
  });

  it("reaches Pi provider validation without waiting for stdin EOF", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "agent-cofounder-pi-launch-"));
    temporaryDirectories.push(directory);
    await mkdir(path.join(directory, "sessions"));
    const eventFile = path.join(directory, "events.jsonl");
    const stderrFile = path.join(directory, "stderr.log");

    const result = await runPi(
      [
        "--mode",
        "json",
        "--offline",
        "--no-extensions",
        "--no-skills",
        "--no-prompt-templates",
        "--no-themes",
        "--no-context-files",
        "--no-session",
        "--provider",
        "bogus-provider",
        "--model",
        "bogus-model",
        "Launch smoke test",
      ],
      directory,
      eventFile,
      stderrFile,
      5_000,
    );

    expect(result.timedOut).toBe(false);
    expect(result.exitCode).not.toBe(124);
    expect(await readFile(stderrFile, "utf8")).toContain("Unknown provider");
  }, 10_000);
});
