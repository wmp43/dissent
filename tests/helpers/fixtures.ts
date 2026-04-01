import type { EnvConfig } from "../../src/config/env.js";
import type { Round } from "../../src/types/debate.js";

export function minimalEnv(overrides: Partial<EnvConfig> = {}): EnvConfig {
  return {
    anthropicApiKey: "sk-ant-test",
    openaiApiKey: "sk-openai-test",
    judgeApiKey: "",
    judgeGeminiApiKey: "",
    judgeBaseUrl: "",
    defaultAnthropicModel: "claude-test",
    defaultOpenaiModel: "gpt-test",
    defaultJudgeModel: "judge-test",
    maxRounds: 4,
    verboseLlm: false,
    ...overrides,
  };
}

export function minimalRound(overrides: Partial<Round> = {}): Round {
  return {
    roundNumber: 1,
    initial: {
      analystId: "A",
      role: "initial",
      content: "Initial argument.",
      timestamp: "2026-01-01T00:00:00.000Z",
    },
    critique: {
      analystId: "B",
      role: "critique",
      content: "Critique.",
      timestamp: "2026-01-01T00:00:01.000Z",
    },
    rebuttal: {
      analystId: "A",
      role: "rebuttal",
      content: "Rebuttal.",
      timestamp: "2026-01-01T00:00:02.000Z",
    },
    ...overrides,
  };
}
