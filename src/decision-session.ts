import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import {
  createAgentSession,
  DefaultResourceLoader,
  ModelRuntime,
  SessionManager,
  SettingsManager,
} from "@earendil-works/pi-coding-agent";
import {
  parseProductDecision,
  PRODUCT_DECISION_SYSTEM_PROMPT,
  type ProductDecision,
} from "./product-decision.js";

const THINKING_LEVELS = ["off", "minimal", "low", "medium", "high", "xhigh", "max"] as const;

export interface DecisionSessionResult {
  decision?: ProductDecision;
  exitCode: number;
  error?: string;
  sessionFile?: string | undefined;
}

function timeoutFromEnvironment(): number {
  const raw = process.env.CHALLENGE_TIMEOUT_MS ?? "900000";
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 1_000) {
    throw new Error("CHALLENGE_TIMEOUT_MS must be an integer of at least 1000");
  }
  return value;
}

function configuredThinkingLevel(): (typeof THINKING_LEVELS)[number] {
  const configured = process.env.CHALLENGE_THINKING ?? "off";
  if (!THINKING_LEVELS.includes(configured as (typeof THINKING_LEVELS)[number])) {
    throw new Error(`Unsupported CHALLENGE_THINKING value: ${configured}`);
  }
  return configured as (typeof THINKING_LEVELS)[number];
}

async function resolveModel(runtime: ModelRuntime) {
  const provider = process.env.CHALLENGE_PROVIDER;
  const modelId = process.env.CHALLENGE_MODEL;
  if ((provider && !modelId) || (!provider && modelId)) {
    throw new Error("CHALLENGE_PROVIDER and CHALLENGE_MODEL must be supplied together");
  }
  if (provider && modelId) {
    const model = runtime.getModel(provider, modelId);
    if (!model) throw new Error(`Configured model is not in Pi's catalogue: ${provider}/${modelId}`);
    return model;
  }
  const [available] = await runtime.getAvailable();
  if (!available) throw new Error("No authenticated Pi model is available");
  return available;
}

function endStream(stream: ReturnType<typeof createWriteStream>): Promise<void> {
  return new Promise((resolve) => stream.end(resolve));
}

async function promptWithTimeout(
  prompt: () => Promise<void>,
  abort: () => Promise<void>,
  timeoutMs: number,
): Promise<void> {
  let timer: NodeJS.Timeout | undefined;
  try {
    await Promise.race([
      prompt(),
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => {
          void abort();
          reject(new Error(`Product decision exceeded CHALLENGE_TIMEOUT_MS (${timeoutMs})`));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * One successful call is the normal path. A second call is allowed only when
 * the first response is syntactically or semantically invalid; it receives no
 * repository context or tools, only the validation error.
 */
export async function runDecisionSession(
  idea: string,
  outputDirectory: string,
  artifactDirectory: string,
): Promise<DecisionSessionResult> {
  process.env.PI_OFFLINE = "1";
  const sessionDirectory = path.join(artifactDirectory, "sessions");
  const agentDirectory = path.join(artifactDirectory, "pi-agent");
  await Promise.all([
    mkdir(sessionDirectory, { recursive: true }),
    mkdir(agentDirectory, { recursive: true }),
  ]);

  const eventPath = path.join(artifactDirectory, "events.jsonl");
  const events = createWriteStream(eventPath, { flags: "wx" });
  let session: Awaited<ReturnType<typeof createAgentSession>>["session"] | undefined;
  try {
    const settingsManager = SettingsManager.inMemory();
    const resourceLoader = new DefaultResourceLoader({
      cwd: outputDirectory,
      agentDir: agentDirectory,
      settingsManager,
      noExtensions: true,
      noSkills: true,
      noPromptTemplates: true,
      noThemes: true,
      noContextFiles: true,
      systemPrompt: PRODUCT_DECISION_SYSTEM_PROMPT,
    });
    await resourceLoader.reload();
    const modelRuntime = await ModelRuntime.create();
    const model = await resolveModel(modelRuntime);
    ({ session } = await createAgentSession({
      cwd: outputDirectory,
      agentDir: agentDirectory,
      model,
      modelRuntime,
      thinkingLevel: configuredThinkingLevel(),
      noTools: "all",
      resourceLoader,
      sessionManager: SessionManager.create(outputDirectory, sessionDirectory),
      settingsManager,
    }));
    session.subscribe((event) => {
      try {
        events.write(`${JSON.stringify(event)}\n`);
      } catch (error) {
        events.write(`${JSON.stringify({ type: "serialization_error", error: String(error) })}\n`);
      }
    });

    let validationError = "";
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const prompt = attempt === 0
        ? idea.trim()
        : `Return corrected JSON only. Validation error: ${validationError.slice(0, 1200)}`;
      await promptWithTimeout(
        () => session!.prompt(prompt, { expandPromptTemplates: false }),
        () => session!.abort(),
        timeoutFromEnvironment(),
      );
      const response = session.getLastAssistantText() ?? "";
      try {
        return { decision: parseProductDecision(response), exitCode: 0, sessionFile: session.sessionFile };
      } catch (error) {
        validationError = error instanceof Error ? error.message : String(error);
      }
    }
    return {
      exitCode: 1,
      error: `The model did not return a valid product decision: ${validationError}`,
      sessionFile: session.sessionFile,
    };
  } catch (error) {
    return { exitCode: 1, error: error instanceof Error ? error.message : String(error), sessionFile: session?.sessionFile };
  } finally {
    session?.dispose();
    await endStream(events);
  }
}
