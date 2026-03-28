import { describe, it, expect, vi, beforeEach } from "vitest";
import type { DebateResult } from "../../src/types/debate.js";
import { ValidationError } from "../../src/types/errors.js";
import { minimalEnv } from "../helpers/fixtures.js";

const runDebateMock = vi.fn();

vi.mock("../../src/engine/orchestrator.js", () => ({
  Orchestrator: vi.fn(function MockOrchestrator() {
    return { runDebate: runDebateMock };
  }),
}));

import { handleDebate } from "../../src/tools/debate.js";
import { Orchestrator } from "../../src/engine/orchestrator.js";

describe("handleDebate", () => {
  beforeEach(() => {
    runDebateMock.mockReset();
    vi.mocked(Orchestrator).mockClear();
  });

  it("throws ValidationError when args fail Zod validation", async () => {
    await expect(handleDebate({ question: "short" }, minimalEnv())).rejects.toThrow(ValidationError);
    expect(runDebateMock).not.toHaveBeenCalled();
  });

  it("parses valid args and delegates to Orchestrator.runDebate", async () => {
    const fake: DebateResult = {
      question: "Is this question long enough for the schema?",
      mode: "adversarial",
      rounds: [],
      synthesis: {
        summary: "s",
        recommendation: "r",
        confidence: "low",
      },
      disagreements: [],
      consensusPoints: [],
      metadata: {
        totalDurationMs: 1,
        modelA: "a",
        modelB: "b",
        judgeModel: "j",
      },
    };
    runDebateMock.mockResolvedValue(fake);

    const args = {
      question: "Is this question long enough for the schema?",
      rounds: 2,
      mode: "collaborative" as const,
    };

    const out = await handleDebate(args, minimalEnv());

    expect(out).toBe(fake);
    expect(runDebateMock).toHaveBeenCalledTimes(1);
    expect(runDebateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        question: args.question,
        rounds: 2,
        mode: "collaborative",
      })
    );
    expect(Orchestrator).toHaveBeenCalledTimes(1);
  });
});
