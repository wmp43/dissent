import { GEMINI_OPENAI_COMPAT_BASE, type EnvConfig } from "../config/env.js";
import type { LlmClient } from "../clients/types.js";
import {
  DebateAutoInputSchema,
  DebateInputSchema,
  DebateNextInputSchema,
  DebateStartInputSchema,
} from "../types/tools.js";
import type { DebateResult } from "../types/debate.js";
import { ValidationError } from "../types/errors.js";
import { AnthropicClient } from "../clients/anthropic.js";
import { OpenAIClient } from "../clients/openai.js";
import { Orchestrator } from "../engine/orchestrator.js";
import {
  createDebateSession,
  deleteDebateSession,
  getDebateSession,
  setDebateSession,
} from "./debate-session-store.js";

export type DebateStepResult = {
  sessionId: string;
  status: "in_progress" | "complete";
  phase: "initial" | "critique" | "rebuttal" | "judge" | "done";
  round: number;
  llmProgress: {
    completed: number;
    total: number;
  };
  result?: DebateResult;
};

/**
 * Analyst A = Anthropic, Analyst B = OpenAI.
 *
 * Judge (first match wins):
 * 1. `DISSENT_JUDGE_BASE_URL` — OpenAI-compatible API (Ollama, vLLM, LM Studio, Gemini manual URL, etc.) + `DISSENT_JUDGE_MODEL`
 * 2. Gemini API key — `DISSENT_JUDGE_GEMINI_API_KEY`, or `GEMINI_API_KEY`, or `GOOGLE_CLOUD_API_KEY` (Google AI Studio / GenAI keys start with `AIza…`); judge model = `DISSENT_JUDGE_MODEL` || `DISSENT_GOOGLE_MODEL` || `gemini-2.5-flash`
 * 3. `DISSENT_JUDGE_API_KEY` — if value looks like a Google key (`AIza…`), treated as Gemini (same endpoint as step 2); otherwise hosted OpenAI (`api.openai.com`)
 * 4. Else — Anthropic (`ANTHROPIC_API_KEY` + `DISSENT_JUDGE_MODEL`)
 */
function isGoogleAiApiKey(key: string): boolean {
  return key.trimStart().startsWith("AIza");
}

function createJudgeClient(config: EnvConfig): LlmClient {
  if (config.judgeBaseUrl.trim() !== "") {
    return new OpenAIClient(config.judgeApiKey, config.defaultJudgeModel, {
      baseURL: config.judgeBaseUrl.trim(),
    });
  }
  if (config.judgeGeminiApiKey.trim() !== "") {
    return new OpenAIClient(config.judgeGeminiApiKey, config.defaultJudgeModel, {
      baseURL: GEMINI_OPENAI_COMPAT_BASE,
      providerLabel: "google-gemini",
    });
  }
  const judgeOpenAi = config.judgeApiKey.trim();
  if (judgeOpenAi !== "" && isGoogleAiApiKey(judgeOpenAi)) {
    return new OpenAIClient(judgeOpenAi, config.defaultJudgeModel, {
      baseURL: GEMINI_OPENAI_COMPAT_BASE,
      providerLabel: "google-gemini",
    });
  }
  if (judgeOpenAi !== "") {
    return new OpenAIClient(judgeOpenAi, config.defaultJudgeModel);
  }
  return new AnthropicClient(config.anthropicApiKey, config.defaultJudgeModel);
}

function createOrchestrator(config: EnvConfig): Orchestrator {
  const analystA = new AnthropicClient(config.anthropicApiKey, config.defaultAnthropicModel);
  const analystB = new OpenAIClient(config.openaiApiKey, config.defaultOpenaiModel);
  const judge = createJudgeClient(config);
  return new Orchestrator(analystA, analystB, judge, {
    verboseLlm: config.verboseLlm,
  });
}

export async function handleDebate(rawArgs: unknown, config: EnvConfig): Promise<DebateResult> {
  const parsed = DebateInputSchema.safeParse(rawArgs);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues.map((i) => i.message).join(", "));
  }

  const orchestrator = createOrchestrator(config);
  return orchestrator.runDebate(parsed.data);
}

export function handleDebateStart(rawArgs: unknown, config: EnvConfig): DebateStepResult {
  const parsed = DebateStartInputSchema.safeParse(rawArgs);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues.map((i) => i.message).join(", "));
  }
  const orchestrator = createOrchestrator(config);
  const state = orchestrator.startDebateSession(parsed.data);
  const sessionId = createDebateSession(state);
  return {
    sessionId,
    status: "in_progress",
    phase: state.phase,
    round: state.currentRoundNumber,
    llmProgress: {
      completed: state.llmStep,
      total: state.totalLlmCalls,
    },
  };
}

export function handleDebateAuto(rawArgs: unknown, config: EnvConfig): DebateStepResult {
  const parsed = DebateAutoInputSchema.safeParse(rawArgs);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues.map((i) => i.message).join(", "));
  }
  // Plain-language entrypoint: inject stepwise-friendly defaults.
  return handleDebateStart(
    {
      question: parsed.data.topic,
      context: parsed.data.context,
      rounds: 2,
      mode: "adversarial",
    },
    config
  );
}

export async function handleDebateNext(rawArgs: unknown, config: EnvConfig): Promise<DebateStepResult> {
  const parsed = DebateNextInputSchema.safeParse(rawArgs);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues.map((i) => i.message).join(", "));
  }
  const state = getDebateSession(parsed.data.sessionId);
  const orchestrator = createOrchestrator(config);
  const updated = await orchestrator.advanceDebateSession(state);
  if (updated.phase === "done" && updated.result) {
    deleteDebateSession(parsed.data.sessionId);
    return {
      sessionId: parsed.data.sessionId,
      status: "complete",
      phase: "done",
      round: updated.currentRoundNumber,
      llmProgress: {
        completed: updated.llmStep,
        total: updated.totalLlmCalls,
      },
      result: updated.result,
    };
  }
  setDebateSession(parsed.data.sessionId, updated);
  return {
    sessionId: parsed.data.sessionId,
    status: "in_progress",
    phase: updated.phase,
    round: updated.currentRoundNumber,
    llmProgress: {
      completed: updated.llmStep,
      total: updated.totalLlmCalls,
    },
  };
}
