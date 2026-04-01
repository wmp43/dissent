import type { EnvConfig } from "../config/env.js";
import { CritiqueInputSchema, type CritiqueInput } from "../types/tools.js";
import type { CritiqueResult } from "../types/debate.js";
import { ValidationError } from "../types/errors.js";
import { OpenAIClient } from "../clients/openai.js";
import { makeCritiqueSystemPrompt } from "../engine/prompts.js";
import { logLlmCallStart, logLlmResponse } from "../logging/llm-trace.js";

function stripJsonFences(text: string): string {
  return text.replace(/```json?\n?|```/g, "").trim();
}

function parseCritiqueResponse(raw: string, input: CritiqueInput): CritiqueResult {
  const fallback: CritiqueResult = {
    originalStatement: input.statement,
    critique: raw,
    revisedVersion: "",
    keyChanges: [],
  };

  const cleaned = stripJsonFences(raw);
  try {
    const parsed: unknown = JSON.parse(cleaned);
    if (!parsed || typeof parsed !== "object") {
      return fallback;
    }
    const o = parsed as Record<string, unknown>;
    const critique = typeof o.critique === "string" ? o.critique : raw;
    const revisedVersion = typeof o.revisedVersion === "string" ? o.revisedVersion : "";
    const keyChanges = Array.isArray(o.keyChanges)
      ? o.keyChanges.filter((x): x is string => typeof x === "string")
      : [];

    return {
      originalStatement: input.statement,
      critique,
      revisedVersion,
      keyChanges,
    };
  } catch {
    return fallback;
  }
}

function buildCritiqueUserMessage(input: CritiqueInput): string {
  let text = `## Statement to critique\n${input.statement.trim()}`;
  if (input.context?.trim()) {
    text += `\n\n## Additional context\n${input.context.trim()}`;
  }
  return text;
}

export async function handleCritique(rawArgs: unknown, config: EnvConfig): Promise<CritiqueResult> {
  const parsed = CritiqueInputSchema.safeParse(rawArgs);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues.map((i) => i.message).join(", "));
  }

  const input = parsed.data;
  const client = new OpenAIClient(config.openaiApiKey, config.defaultOpenaiModel);
  const systemPrompt = makeCritiqueSystemPrompt();
  const userMessage = buildCritiqueUserMessage(input);

  const v = config.verboseLlm;
  logLlmCallStart(v, `LLM 1/1 · Critique · ${client.provider}/${client.model}`);
  const raw = await client.complete(systemPrompt, userMessage);
  logLlmResponse(v, "Critique · raw response (excerpt)", raw, 720);
  const out = parseCritiqueResponse(raw, input);
  if (v) {
    logLlmResponse(v, "Critique · parsed critique", out.critique);
    logLlmResponse(v, "Critique · parsed revisedVersion", out.revisedVersion);
  }
  return out;
}
