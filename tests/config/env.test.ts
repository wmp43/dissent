import { afterEach, describe, expect, it } from "vitest";
import { loadEnvConfig } from "../../src/config/env.js";
import { ApiKeyMissingError } from "../../src/types/errors.js";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("loadEnvConfig", () => {
  it("throws when required API keys are missing", () => {
    process.env = {};
    expect(() => loadEnvConfig()).toThrow(ApiKeyMissingError);
  });

  it("loads defaults and trims whitespace", () => {
    process.env = {
      ANTHROPIC_API_KEY: "  sk-ant  ",
      OPENAI_API_KEY: "  sk-openai  ",
      DISSENT_MAX_ROUNDS: "not-a-number",
    };

    const cfg = loadEnvConfig();
    expect(cfg.anthropicApiKey).toBe("sk-ant");
    expect(cfg.openaiApiKey).toBe("sk-openai");
    expect(cfg.defaultAnthropicModel).toBe("claude-sonnet-4-20250514");
    expect(cfg.defaultOpenaiModel).toBe("gpt-4o");
    expect(cfg.defaultJudgeModel).toBe("claude-sonnet-4-20250514");
    expect(cfg.maxRounds).toBe(4);
  });

  it("defaults judge model to gemini-2.5-flash when only DISSENT_JUDGE_GEMINI_API_KEY is set", () => {
    process.env = {
      ANTHROPIC_API_KEY: "sk-ant",
      OPENAI_API_KEY: "sk-openai",
      DISSENT_JUDGE_GEMINI_API_KEY: "gemini-key",
    };
    const cfg = loadEnvConfig();
    expect(cfg.judgeGeminiApiKey).toBe("gemini-key");
    expect(cfg.defaultJudgeModel).toBe("gemini-2.5-flash");
  });

  it("honors DISSENT_JUDGE_MODEL over gemini default when DISSENT_JUDGE_GEMINI_API_KEY is set", () => {
    process.env = {
      ANTHROPIC_API_KEY: "sk-ant",
      OPENAI_API_KEY: "sk-openai",
      DISSENT_JUDGE_GEMINI_API_KEY: "gemini-key",
      DISSENT_JUDGE_MODEL: "gemini-2.5-pro",
    };
    expect(loadEnvConfig().defaultJudgeModel).toBe("gemini-2.5-pro");
  });

  it("clamps max rounds to 1..4", () => {
    process.env = {
      ANTHROPIC_API_KEY: "sk-ant",
      OPENAI_API_KEY: "sk-openai",
      DISSENT_MAX_ROUNDS: "99",
    };
    expect(loadEnvConfig().maxRounds).toBe(4);

    process.env = {
      ANTHROPIC_API_KEY: "sk-ant",
      OPENAI_API_KEY: "sk-openai",
      DISSENT_MAX_ROUNDS: "0",
    };
    expect(loadEnvConfig().maxRounds).toBe(1);
  });
});
