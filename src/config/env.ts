import { ApiKeyMissingError } from "../types/errors.js";

/** Gemini (Google AI Studio) via the OpenAI-compatible REST surface. See https://ai.google.dev/gemini-api/docs/openai */
export const GEMINI_OPENAI_COMPAT_BASE =
  "https://generativelanguage.googleapis.com/v1beta/openai/";

export interface EnvConfig {
  anthropicApiKey: string;
  openaiApiKey: string;
  /** Optional; use empty for local OpenAI-compatible judges that accept a dummy key. */
  judgeApiKey: string;
  /**
   * Optional [Gemini API key](https://aistudio.google.com/apikey). When set (and no custom judge base URL),
   * the judge uses Gemini at `GEMINI_OPENAI_COMPAT_BASE` with `DISSENT_JUDGE_MODEL` (default `gemini-2.5-flash` if unset).
   */
  judgeGeminiApiKey: string;
  /**
   * When set (e.g. `http://localhost:11434/v1` for Ollama), the judge uses the OpenAI-compatible
   * chat completions API at this base URL instead of Anthropic or api.openai.com.
   */
  judgeBaseUrl: string;
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

function readDefaultJudgeModel(judgeGeminiKeyPresent: boolean): string {
  const v = process.env.DISSENT_JUDGE_MODEL;
  if (v !== undefined && v.trim() !== "") {
    return v.trim();
  }
  if (judgeGeminiKeyPresent) {
    return "gemini-2.5-flash";
  }
  return "claude-sonnet-4-20250514";
}

/**
 * Load config from `process.env` (no dotenv). MCP hosts inject env for stdio servers.
 */
export function loadEnvConfig(): EnvConfig {
  const judgeGeminiApiKey = readOptional("DISSENT_JUDGE_GEMINI_API_KEY", "");
  return {
    anthropicApiKey: readRequired("ANTHROPIC_API_KEY"),
    openaiApiKey: readRequired("OPENAI_API_KEY"),
    judgeApiKey: readOptional("DISSENT_JUDGE_API_KEY", ""),
    judgeGeminiApiKey,
    judgeBaseUrl: readOptional("DISSENT_JUDGE_BASE_URL", ""),
    defaultAnthropicModel: readOptional(
      "DISSENT_ANTHROPIC_MODEL",
      "claude-sonnet-4-20250514"
    ),
    defaultOpenaiModel: readOptional("DISSENT_OPENAI_MODEL", "gpt-4o"),
    defaultJudgeModel: readDefaultJudgeModel(judgeGeminiApiKey.trim() !== ""),
    maxRounds: parseMaxRounds(process.env.DISSENT_MAX_ROUNDS),
  };
}
