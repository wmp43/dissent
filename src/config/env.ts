import { ApiKeyMissingError } from "../types/errors.js";

export interface EnvConfig {
  anthropicApiKey: string;
  openaiApiKey: string;
  /** Optional; use empty string for local judges (e.g. Ollama) that do not need a key. */
  judgeApiKey: string;
  defaultAnthropicModel: string;
  defaultOpenaiModel: string;
  defaultJudgeModel: string;
  /**
   * Upper bound (1–4) for env-driven defaults elsewhere; debate `rounds` are still validated per request.
   * Future: agreement-based stopping / unbounded rounds would need product + schema changes.
   */
  maxRounds: number;
}

function readRequired(key: "ANTHROPIC_API_KEY" | "OPENAI_API_KEY"): string {
  const v = process.env[key];
  if (v === undefined || v.trim() === "") {
    throw new ApiKeyMissingError(key === "ANTHROPIC_API_KEY" ? "anthropic" : "openai");
  }
  return v.trim();
}

function readOptional(key: string, defaultValue: string): string {
  const v = process.env[key];
  if (v === undefined || v.trim() === "") {
    return defaultValue;
  }
  return v.trim();
}

/**
 * Parse `DISSENT_MAX_ROUNDS`: integer, default 4, clamped to 1–4 (matches current debate limits).
 */
function parseMaxRounds(raw: string | undefined): number {
  const fallback = 4;
  if (raw === undefined || raw.trim() === "") {
    return fallback;
  }
  const n = Number.parseInt(raw, 10);
  if (Number.isNaN(n)) {
    return fallback;
  }
  return Math.min(4, Math.max(1, n));
}

/**
 * Load config from `process.env` (no dotenv). MCP hosts inject env for stdio servers.
 */
export function loadEnvConfig(): EnvConfig {
  return {
    anthropicApiKey: readRequired("ANTHROPIC_API_KEY"),
    openaiApiKey: readRequired("OPENAI_API_KEY"),
    judgeApiKey: readOptional("DISSENT_JUDGE_API_KEY", ""),
    defaultAnthropicModel: readOptional(
      "DISSENT_ANTHROPIC_MODEL",
      "claude-sonnet-4-20250514"
    ),
    defaultOpenaiModel: readOptional("DISSENT_OPENAI_MODEL", "gpt-4o"),
    defaultJudgeModel: readOptional(
      "DISSENT_JUDGE_MODEL",
      "claude-sonnet-4-20250514"
    ),
    maxRounds: parseMaxRounds(process.env.DISSENT_MAX_ROUNDS),
  };
}
