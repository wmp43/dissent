import { describe, it, expect, vi } from "vitest";
import { synthesize } from "../../src/engine/synthesizer.js";
import type { LlmClient } from "../../src/clients/types.js";
import { minimalRound } from "../helpers/fixtures.js";

function judgeReturning(text: string): LlmClient {
  return {
    provider: "judge",
    model: "judge-m",
    complete: vi.fn().mockResolvedValue(text),
  };
}

describe("synthesize", () => {
  it("parses valid JSON from the judge", async () => {
    const raw = JSON.stringify({
      synthesis: {
        summary: "S",
        recommendation: "R",
        confidence: "high",
      },
      disagreements: ["d"],
      consensusPoints: ["c"],
    });
    const out = await synthesize(judgeReturning(raw), "Question?", [minimalRound()]);
    expect(out.synthesis).toEqual({
      summary: "S",
      recommendation: "R",
      confidence: "high",
    });
    expect(out.disagreements).toEqual(["d"]);
    expect(out.consensusPoints).toEqual(["c"]);
  });

  it("strips ```json fences before parsing", async () => {
    const inner = JSON.stringify({
      synthesis: {
        summary: "S",
        recommendation: "R",
        confidence: "low",
      },
      disagreements: [],
      consensusPoints: [],
    });
    const raw = "```json\n" + inner + "\n```";
    const out = await synthesize(judgeReturning(raw), "Q", [minimalRound()]);
    expect(out.synthesis.summary).toBe("S");
  });

  it("falls back when JSON is invalid", async () => {
    const out = await synthesize(judgeReturning("not json {"), "Q", [minimalRound()]);
    expect(out.synthesis.recommendation).toBe("Could not parse structured output");
    expect(out.synthesis.confidence).toBe("low");
    expect(out.synthesis.summary).toBe("not json {");
    expect(out.disagreements).toEqual([]);
    expect(out.consensusPoints).toEqual([]);
  });
});
