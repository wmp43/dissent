import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DebateSessionState } from "../../src/engine/orchestrator.js";
import type { DebateResult } from "../../src/types/debate.js";
import { ValidationError } from "../../src/types/errors.js";
import { minimalEnv } from "../helpers/fixtures.js";

const startDebateSessionMock = vi.fn();
const advanceDebateSessionMock = vi.fn();

vi.mock("../../src/engine/orchestrator.js", () => ({
  Orchestrator: vi.fn(function MockOrchestrator() {
    return {
      runDebate: vi.fn(),
      startDebateSession: startDebateSessionMock,
      advanceDebateSession: advanceDebateSessionMock,
    };
  }),
}));

import { handleDebateAuto, handleDebateNext, handleDebateStart } from "../../src/tools/debate.js";

describe("stepwise debate handlers", () => {
  beforeEach(() => {
    startDebateSessionMock.mockReset();
    advanceDebateSessionMock.mockReset();
  });

  it("starts a session and advances to completion", async () => {
    const fakeResult: DebateResult = {
      question: "Is this question long enough for the schema?",
      mode: "adversarial",
      rounds: [],
      synthesis: { summary: "s", recommendation: "r", confidence: "low" },
      disagreements: [],
      consensusPoints: [],
      metadata: { totalDurationMs: 1, modelA: "a", modelB: "b", judgeModel: "j" },
    };
    const startedState: DebateSessionState = {
      input: {
        question: "Is this question long enough for the schema?",
        rounds: 1,
        mode: "adversarial",
      },
      startedAtMs: Date.now(),
      rounds: [],
      currentRoundNumber: 1,
      phase: "initial",
      llmStep: 0,
      totalLlmCalls: 4,
    };
    startDebateSessionMock.mockReturnValue(startedState);
    advanceDebateSessionMock.mockResolvedValue({
      ...startedState,
      phase: "done",
      llmStep: 4,
      result: fakeResult,
    });

    const start = handleDebateStart(
      {
        question: "Is this question long enough for the schema?",
        rounds: 1,
        mode: "adversarial",
      },
      minimalEnv()
    );
    expect(start.status).toBe("in_progress");
    expect(start.sessionId.length).toBeGreaterThan(1);

    const done = await handleDebateNext({ sessionId: start.sessionId }, minimalEnv());
    expect(done.status).toBe("complete");
    expect(done.result?.question).toBe("Is this question long enough for the schema?");
  });

  it("throws for unknown session ids", async () => {
    await expect(handleDebateNext({ sessionId: "missing" }, minimalEnv())).rejects.toThrow(
      ValidationError
    );
  });

  it("maps plain-language debate_auto input to a stepwise session", () => {
    const startedState: DebateSessionState = {
      input: {
        question: "Should we do this in plain language?",
        rounds: 2,
        mode: "adversarial",
      },
      startedAtMs: Date.now(),
      rounds: [],
      currentRoundNumber: 1,
      phase: "initial",
      llmStep: 0,
      totalLlmCalls: 7,
    };
    startDebateSessionMock.mockReturnValue(startedState);

    const out = handleDebateAuto(
      {
        topic: "Should we do this in plain language?",
        context: "Team has tight deadlines.",
      },
      minimalEnv()
    );

    expect(out.status).toBe("in_progress");
    expect(startDebateSessionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        question: "Should we do this in plain language?",
        context: "Team has tight deadlines.",
        rounds: 2,
        mode: "adversarial",
      })
    );
  });

  it("throws when debate_next is called again after completion cleaned up the session", async () => {
    const fakeResult: DebateResult = {
      question: "Is this question long enough for the schema?",
      mode: "adversarial",
      rounds: [],
      synthesis: { summary: "s", recommendation: "r", confidence: "low" },
      disagreements: [],
      consensusPoints: [],
      metadata: { totalDurationMs: 1, modelA: "a", modelB: "b", judgeModel: "j" },
    };
    const startedState: DebateSessionState = {
      input: {
        question: "Is this question long enough for the schema?",
        rounds: 1,
        mode: "adversarial",
      },
      startedAtMs: Date.now(),
      rounds: [],
      currentRoundNumber: 1,
      phase: "initial",
      llmStep: 0,
      totalLlmCalls: 4,
    };
    startDebateSessionMock.mockReturnValue(startedState);
    advanceDebateSessionMock.mockResolvedValue({
      ...startedState,
      phase: "done",
      llmStep: 4,
      result: fakeResult,
    });

    const start = handleDebateStart(
      {
        question: "Is this question long enough for the schema?",
        rounds: 1,
        mode: "adversarial",
      },
      minimalEnv()
    );

    await handleDebateNext({ sessionId: start.sessionId }, minimalEnv());
    await expect(handleDebateNext({ sessionId: start.sessionId }, minimalEnv())).rejects.toThrow(
      ValidationError
    );
  });
});
