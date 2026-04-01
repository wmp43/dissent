import { describe, expect, it } from "vitest";
import { loadEnvConfig } from "../../src/config/env.js";
import { handleDebate } from "../../src/tools/debate.js";
import { handleCritique } from "../../src/tools/critique.js";

const RUN_LIVE = process.env.RUN_LIVE_INFERENCE === "1";

/** Wall-clock can exceed 2m with slow models, parallel suites, or rate limits; Vitest kills the test at this bound. */
const DEBATE_LIVE_TIMEOUT_MS = 360_000;
const CRITIQUE_LIVE_TIMEOUT_MS = 180_000;

/**
 * Optional live test. This makes real API calls and is intentionally skipped by default.
 * Tests run one-after-another so stderr and API usage are easier to follow than parallel runs.
 */
describe
  .runIf(RUN_LIVE)
  .sequential("live inference (opt-in)", () => {
    it(
      "runs a 1-round debate against real providers",
      async () => {
        const config = loadEnvConfig();
        const out = await handleDebate(
          {
            question:
              "Should early-stage teams optimize for shipping speed over process rigor, and why?",
            rounds: 1,
            mode: "adversarial",
          },
          config
        );

        expect(out.rounds.length).toBe(1);
        expect(out.rounds[0]?.initial.content.trim().length).toBeGreaterThan(0);
        expect(out.rounds[0]?.critique.content.trim().length).toBeGreaterThan(0);
        expect(out.rounds[0]?.rebuttal.content.trim().length).toBeGreaterThan(0);
        expect(out.synthesis.summary.trim().length).toBeGreaterThan(0);
        expect(out.metadata.modelA.trim().length).toBeGreaterThan(0);
        expect(out.metadata.modelB.trim().length).toBeGreaterThan(0);
        expect(out.metadata.judgeModel.trim().length).toBeGreaterThan(0);
      },
      DEBATE_LIVE_TIMEOUT_MS
    );

    it(
      "runs critique against a real provider",
      async () => {
        const config = loadEnvConfig();
        const out = await handleCritique(
          {
            statement:
              "We should launch immediately with no guardrails because user growth is all that matters.",
            context: "Product review memo draft.",
          },
          config
        );

        expect(out.originalStatement.trim().length).toBeGreaterThan(0);
        expect(out.critique.trim().length).toBeGreaterThan(0);
        // revisedVersion can be empty only on fallback, but we still verify the field exists.
        expect(typeof out.revisedVersion).toBe("string");
        expect(Array.isArray(out.keyChanges)).toBe(true);
      },
      CRITIQUE_LIVE_TIMEOUT_MS
    );
  });
