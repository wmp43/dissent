import type { LlmClient } from "../clients/types.js";
import type { Round, Synthesis } from "../types/debate.js";
import { logLlmCallStart, logLlmResponse } from "../logging/llm-trace.js";
import { makeJudgeSystemPrompt, formatDebateForJudge } from "./prompts.js";

export type SynthesizeTraceOptions = {
  verboseLlm: boolean;
  judgeStep: number;
  totalLlmCalls: number;
};

interface SynthesisResult {
  synthesis: Synthesis;
  disagreements: string[];
  consensusPoints: string[];
}

function stripJsonFences(text: string): string {
  return text.replace(/```json?\n?|```/g, "").trim();
}

function isConfidence(v: unknown): v is Synthesis["confidence"] {
  return v === "low" || v === "medium" || v === "high";
}

function normalizeSynthesisResult(parsed: unknown, rawFallback: string): SynthesisResult {
  if (!parsed || typeof parsed !== "object") {
    return {
      synthesis: {
        summary: rawFallback,
        recommendation: "Could not parse structured output",
        confidence: "low",
      },
      disagreements: [],
      consensusPoints: [],
    };
  }

  const o = parsed as Record<string, unknown>;
  const syn = o.synthesis;
  let summary = rawFallback;
  let recommendation = "Could not parse structured output";
  let confidence: Synthesis["confidence"] = "low";

  if (syn && typeof syn === "object") {
    const s = syn as Record<string, unknown>;
    if (typeof s.summary === "string") {
      summary = s.summary;
    }
    if (typeof s.recommendation === "string") {
      recommendation = s.recommendation;
    }
    if (isConfidence(s.confidence)) {
      confidence = s.confidence;
    }
  }

  const disagreements = Array.isArray(o.disagreements)
    ? o.disagreements.filter((x): x is string => typeof x === "string")
    : [];
  const consensusPoints = Array.isArray(o.consensusPoints)
    ? o.consensusPoints.filter((x): x is string => typeof x === "string")
    : [];

  return {
    synthesis: { summary, recommendation, confidence },
    disagreements,
    consensusPoints,
  };
}

export async function synthesize(
  judge: LlmClient,
  question: string,
  rounds: Round[],
  trace?: SynthesizeTraceOptions
): Promise<SynthesisResult> {
  const systemPrompt = makeJudgeSystemPrompt();
  const userMessage = formatDebateForJudge(question, rounds);

  const v = trace?.verboseLlm === true;
  if (v && trace) {
    logLlmCallStart(
      v,
      `LLM ${trace.judgeStep}/${trace.totalLlmCalls} · Judge · synthesis · ${judge.provider}/${judge.model}`
    );
  }

  const raw = await judge.complete(systemPrompt, userMessage);
  logLlmResponse(v, "Judge · raw response (excerpt)", raw, 720);

  const cleaned = stripJsonFences(raw);

  try {
    const parsed: unknown = JSON.parse(cleaned);
    const out = normalizeSynthesisResult(parsed, raw);
    logLlmResponse(v, "Judge · parsed summary", out.synthesis.summary);
    if (out.synthesis.recommendation.trim().length > 0) {
      logLlmResponse(v, "Judge · parsed recommendation", out.synthesis.recommendation);
    }
    return out;
  } catch {
    const fallback = {
      synthesis: {
        summary: raw,
        recommendation: "Could not parse structured output",
        confidence: "low" as const,
      },
      disagreements: [],
      consensusPoints: [],
    };
    logLlmResponse(v, "Judge · fallback (unparsed)", raw);
    return fallback;
  }
}
