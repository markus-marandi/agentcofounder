import { describe, expect, it } from "vitest";
import { compareBenchmarkRuns, type BenchmarkRun } from "../src/compare-runs.js";
import type { RunResult } from "../src/types.js";

function result(totalTokens: number, success: boolean, model = "provider/model"): RunResult {
  const testResult = success ? "passed" : "failed";
  return {
    status: success ? "success" : "partial",
    app_url: "http://localhost:3000",
    start_command: "npm run dev",
    summary: "Fixture result",
    implemented_features: ["records"],
    assumptions: ["One ambiguity resolved"],
    tests_run: [{ command: "npm test", journey: "record journey", result: testResult }],
    harness_checks: [{ command: "npm test", journey: "app verification", result: testResult }],
    model_calls: 1,
    input_tokens: totalTokens - 10,
    output_tokens: 10,
    cache_read_tokens: 0,
    cache_write_tokens: 0,
    total_tokens: totalTokens,
    reasoning_tokens: 0,
    cost_total: 0,
    call_log: [{
      index: 1,
      model,
      input_tokens: totalTokens - 10,
      output_tokens: 10,
      cache_read_tokens: 0,
      cache_write_tokens: 0,
      total_tokens: totalTokens,
    }],
    pi_exit_code: 0,
    telemetry_source: "pi-json-event-stream",
    port_reclamation: {
      preexisting_listener: false,
      listener_after_pi: false,
      attempted: false,
      reclaimed: false,
      process_ids: [],
      diagnostic: "port clear",
    },
  };
}

function run(candidate: string, fixture: string, tokens: number, success = true): BenchmarkRun {
  return { candidate, fixture, result: result(tokens, success) };
}

describe("paired run comparison", () => {
  it("ranks verified success before token totals", () => {
    const comparison = compareBenchmarkRuns([
      run("markus-main", "idea-1", 500),
      run("markus-main", "idea-2", 500),
      run("compact", "idea-1", 100),
      run("compact", "idea-2", 100, false),
    ]);

    expect(comparison.winner).toBe("markus-main");
    expect(comparison.candidates[0]).toMatchObject({
      candidate: "markus-main",
      verified_successes: 2,
      tokens_per_verified_success: 500,
      quality_frontier: true,
    });
    expect(comparison.candidates[1]).toMatchObject({
      candidate: "compact",
      verified_successes: 1,
      tokens_per_verified_success: 200,
      quality_frontier: false,
    });
  });

  it("uses total tokens per verified success to break a quality tie", () => {
    const comparison = compareBenchmarkRuns([
      run("markus-main", "idea-1", 500),
      run("compact", "idea-1", 200),
    ]);

    expect(comparison.winner).toBe("compact");
    expect(comparison.candidates.map((candidate) => candidate.candidate)).toEqual(["compact", "markus-main"]);
  });

  it("rejects unmatched fixture populations and model identities", () => {
    expect(() => compareBenchmarkRuns([
      run("markus-main", "idea-1", 500),
      run("compact", "idea-2", 200),
    ])).toThrow(/same fixture population/u);

    expect(() => compareBenchmarkRuns([
      run("markus-main", "idea-1", 500),
      { candidate: "compact", fixture: "idea-1", result: result(200, true, "other/model") },
    ])).toThrow(/same model/u);
  });

  it("rejects duplicate runs instead of silently double-counting them", () => {
    expect(() => compareBenchmarkRuns([
      run("markus-main", "idea-1", 500),
      run("markus-main", "idea-1", 500),
      run("compact", "idea-1", 200),
    ])).toThrow(/duplicate/iu);
  });
});
