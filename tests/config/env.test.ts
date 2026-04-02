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
    expect(cfg.defaultOpenaiModel).toBe("gpt-5.4-mini");
    expect(cfg.defaultJudgeModel).toBe("claude-sonnet-4-20250514");
    expect(cfg.maxRounds).toBe(4);
    expect(cfg.verboseLlm).toBe(false);
  });

  it("enables verbose LLM tracing when DISSENT_VERBOSE_LLM is set", () => {
    process.env = {
      ANTHROPIC_API_KEY: "sk-ant",
      OPENAI_API_KEY: "sk-openai",
      DISSENT_VERBOSE_LLM: "1",
    };
    expect(loadEnvConfig().verboseLlm).toBe(true);

    process.env = {
      ANTHROPIC_API_KEY: "sk-ant",
      OPENAI_API_KEY: "sk-openai",
      DISSENT_VERBOSE_LLM: "true",
    };
    expect(loadEnvConfig().verboseLlm).toBe(true);
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

  it("loads judge Gemini key from GOOGLE_CLOUD_API_KEY or GEMINI_API_KEY when dedicated var is unset", () => {
    process.env = {
      ANTHROPIC_API_KEY: "sk-ant",
      OPENAI_API_KEY: "sk-openai",
      GOOGLE_CLOUD_API_KEY: "AIza-google-cloud",
    };
    expect(loadEnvConfig().judgeGeminiApiKey).toBe("AIza-google-cloud");

    process.env = {
      ANTHROPIC_API_KEY: "sk-ant",
      OPENAI_API_KEY: "sk-openai",
      GEMINI_API_KEY: "AIza-gemini-env",
    };
    expect(loadEnvConfig().judgeGeminiApiKey).toBe("AIza-gemini-env");
  });

  it("prefers DISSENT_JUDGE_GEMINI_API_KEY over GOOGLE_CLOUD_API_KEY", () => {
    process.env = {
      ANTHROPIC_API_KEY: "sk-ant",
      OPENAI_API_KEY: "sk-openai",
      DISSENT_JUDGE_GEMINI_API_KEY: "explicit",
      GOOGLE_CLOUD_API_KEY: "AIza-other",
    };
    expect(loadEnvConfig().judgeGeminiApiKey).toBe("explicit");
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

  it("uses DISSENT_GOOGLE_MODEL as judge id when GEMINI_API_KEY is set and DISSENT_JUDGE_MODEL is unset", () => {
    process.env = {
      ANTHROPIC_API_KEY: "sk-ant",
      OPENAI_API_KEY: "sk-openai",
      GEMINI_API_KEY: "AIza-x",
      DISSENT_GOOGLE_MODEL: "gemini-2.5-pro",
    };
    const cfg = loadEnvConfig();
    expect(cfg.judgeGeminiApiKey).toBe("AIza-x");
    expect(cfg.defaultJudgeModel).toBe("gemini-2.5-pro");
  });

  it("prefers DISSENT_JUDGE_MODEL over DISSENT_GOOGLE_MODEL when both are set", () => {
    process.env = {
      ANTHROPIC_API_KEY: "sk-ant",
      OPENAI_API_KEY: "sk-openai",
      GEMINI_API_KEY: "AIza-x",
      DISSENT_GOOGLE_MODEL: "gemini-2.5-flash",
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
