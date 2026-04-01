import { describe, it, expect, vi } from "vitest";
import { Orchestrator } from "../../src/engine/orchestrator.js";
import type { LlmClient } from "../../src/clients/types.js";
import type { DebateInput } from "../../src/types/tools.js";
import { ValidationError } from "../../src/types/errors.js";

function makeMockClient(responses: string[], model = "mock-model"): LlmClient {
  let callIndex = 0;
  return {
    provider: "mock",
    model,
    complete: vi.fn(async () => {
      if (callIndex >= responses.length) {
        throw new Error(`Unexpected complete() call #${callIndex + 1}`);
      }
      return responses[callIndex++]!;
    }),
  };
}

const judgeJson = JSON.stringify({
  synthesis: {
    summary: "Both sides argued.",
    recommendation: "Consider both views.",
    confidence: "medium",
  },
  disagreements: ["On scope"],
  consensusPoints: ["On facts"],
});

describe("Orchestrator", () => {
  it("runs a 1-round debate and returns a DebateResult", async () => {
    const mockA = makeMockClient(["Initial from A.", "Rebuttal from A."]);
    const mockB = makeMockClient(["Critique from B."]);
    const mockJudge = makeMockClient([judgeJson], "judge-m");

    const orchestrator = new Orchestrator(mockA, mockB, mockJudge);

    const result = await orchestrator.runDebate({
      question: "Is this question long enough to pass validation?",
      rounds: 1,
      mode: "adversarial",
    });

    expect(result.rounds.length).toBe(1);
    expect(result.rounds[0]!.initial.analystId).toBe("A");
    expect(result.rounds[0]!.critique.analystId).toBe("B");
    expect(result.rounds[0]!.rebuttal.analystId).toBe("A");
    expect(result.synthesis.summary).toBe("Both sides argued.");
    expect(result.disagreements).toEqual(["On scope"]);
    expect(result.consensusPoints).toEqual(["On facts"]);
    expect(result.metadata.modelA).toBe("mock-model");
    expect(result.metadata.modelB).toBe("mock-model");
    expect(result.metadata.judgeModel).toBe("judge-m");

    expect(mockA.complete).toHaveBeenCalledTimes(2);
    expect(mockB.complete).toHaveBeenCalledTimes(1);
    expect(mockJudge.complete).toHaveBeenCalledTimes(1);
  });

  it("throws ValidationError when rounds > 4", async () => {
    const mockA = makeMockClient([]);
    const mockB = makeMockClient([]);
    const mockJudge = makeMockClient([]);
    const orchestrator = new Orchestrator(mockA, mockB, mockJudge);

    const bad = {
      question: "Is this question long enough to pass validation?",
      rounds: 5,
      mode: "adversarial" as const,
    };

    await expect(orchestrator.runDebate(bad as DebateInput)).rejects.toThrow(ValidationError);
    expect(mockA.complete).not.toHaveBeenCalled();
  });

  it("supports stepwise session progression one call at a time", async () => {
    const mockA = makeMockClient(["Initial from A.", "Rebuttal from A."]);
    const mockB = makeMockClient(["Critique from B."]);
    const mockJudge = makeMockClient([judgeJson], "judge-m");
    const orchestrator = new Orchestrator(mockA, mockB, mockJudge);

    let state = orchestrator.startDebateSession({
      question: "Is this question long enough to pass validation?",
      rounds: 1,
      mode: "adversarial",
    });

    expect(state.phase).toBe("initial");
    state = await orchestrator.advanceDebateSession(state);
    expect(state.phase).toBe("critique");
    state = await orchestrator.advanceDebateSession(state);
    expect(state.phase).toBe("rebuttal");
    state = await orchestrator.advanceDebateSession(state);
    expect(state.phase).toBe("judge");
    state = await orchestrator.advanceDebateSession(state);
    expect(state.phase).toBe("done");
    expect(state.result?.synthesis.summary).toBe("Both sides argued.");
  });
});
