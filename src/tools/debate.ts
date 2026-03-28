import type { EnvConfig } from "../config/env.js";
import type { LlmClient } from "../clients/types.js";
import { DebateInputSchema } from "../types/tools.js";
import type { DebateResult } from "../types/debate.js";
import { ValidationError } from "../types/errors.js";
import { AnthropicClient } from "../clients/anthropic.js";
import { OpenAIClient } from "../clients/openai.js";
import { Orchestrator } from "../engine/orchestrator.js";

/**
 * Analyst A = Anthropic, Analyst B = OpenAI.
 *
 * Judge (first match wins):
 * 1. `DISSENT_JUDGE_BASE_URL` — OpenAI-compatible API (Ollama, vLLM, LM Studio, etc.) + `DISSENT_JUDGE_MODEL`
 * 2. `DISSENT_JUDGE_API_KEY` — hosted OpenAI API (`api.openai.com`) + `DISSENT_JUDGE_MODEL`
 * 3. Else — Anthropic (`ANTHROPIC_API_KEY` + `DISSENT_JUDGE_MODEL`)
 */
function createJudgeClient(config: EnvConfig): LlmClient {
  if (config.judgeBaseUrl.trim() !== "") {
    return new OpenAIClient(config.judgeApiKey, config.defaultJudgeModel, {
      baseURL: config.judgeBaseUrl.trim(),
    });
  }
  if (config.judgeApiKey.trim() !== "") {
    return new OpenAIClient(config.judgeApiKey, config.defaultJudgeModel);
  }
  return new AnthropicClient(config.anthropicApiKey, config.defaultJudgeModel);
}

export async function handleDebate(rawArgs: unknown, config: EnvConfig): Promise<DebateResult> {
  const parsed = DebateInputSchema.safeParse(rawArgs);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues.map((i) => i.message).join(", "));
  }

  const analystA = new AnthropicClient(config.anthropicApiKey, config.defaultAnthropicModel);
  const analystB = new OpenAIClient(config.openaiApiKey, config.defaultOpenaiModel);
  const judge = createJudgeClient(config);

  const orchestrator = new Orchestrator(analystA, analystB, judge);
  return orchestrator.runDebate(parsed.data);
}
