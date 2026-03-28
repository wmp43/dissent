import { describe, it, expect, vi } from "vitest";
import { Orchestrator } from "../../src/engine/orchestrator.js";
import type { LlmClient } from "../../src/clients/types.js";

function makeMockClient(responses: string[]): LlmClient {
  let callIndex = 0;
  return {
    provider: "mock",
    model: "mock-model",
    complete: vi.fn(async () => {
      // TODO: Return responses[callIndex++].
      // TODO: If callIndex exceeds responses.length, throw an error (unexpected call).
      //
      // Hint: This is a simple counter pattern. vi.fn() wraps it so vitest can assert on calls.
      void responses;
      void callIndex;
      throw new Error("Not implemented");
    }),
  };
}

describe("Orchestrator", () => {
  it("should run a 1-round debate and return a DebateResult", async () => {
    // TODO: Create mockA with 2 responses (initial + rebuttal).
    // TODO: Create mockB with 1 response (critique).
    // TODO: Create mockJudge with 1 response (JSON synthesis).
    //
    // TODO: Instantiate Orchestrator with (mockA, mockB, mockJudge).
    // TODO: Call runDebate with a simple question, 1 round.
    //
    // TODO: Assert:
    //   - result.rounds.length === 1
    //   - result.rounds[0].initial.analystId === "A"
    //   - result.rounds[0].critique.analystId === "B"
    //   - result.synthesis exists
    //   - mockA.complete was called 2 times
    //   - mockB.complete was called 1 time
    //   - mockJudge.complete was called 1 time

    throw new Error("Not implemented");
  });

  it("should throw ValidationError if rounds > 4", async () => {
    // TODO: Create mocks (won't be called).
    // TODO: Expect orchestrator.runDebate({ ..., rounds: 5 }) to reject with ValidationError.
    //
    // Hint: await expect(promise).rejects.toThrow(ValidationError)

    throw new Error("Not implemented");
  });
});
