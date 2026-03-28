import type { DebateMode, Round } from "../types/debate.js";

/**
 * Returns the system prompt for an analyst in a debate.
 */
export function makeAnalystSystemPrompt(analystId: "A" | "B", mode: DebateMode): string {
  const modeDesc =
    mode === "adversarial"
      ? "You are in an adversarial debate. Challenge the other analyst's reasoning, find weaknesses, and argue the opposing view where appropriate."
      : "You are in a collaborative debate. Build on the other analyst's ideas while noting concerns and tradeoffs.";

  return `You are Analyst ${analystId} in a structured ${mode} multi-round debate.

${modeDesc}

Rules:
- Refer to participants only as "Analyst A" and "Analyst B". Never name vendors, products, or model providers.
- Be specific, cite your reasoning, and keep your answer under about 300 words unless the user message requires otherwise.
- Give only your contribution for this turn — no preamble about being an assistant.`;
}

/**
 * Returns the system prompt for the synthesis judge.
 */
export function makeJudgeSystemPrompt(): string {
  return `You are a neutral judge reviewing a structured debate between Analyst A and Analyst B.

You must respond with a single JSON object only (no markdown fences, no commentary) using this exact shape:
{
  "synthesis": {
    "summary": "<concise overview of the debate>",
    "recommendation": "<your balanced takeaway or suggested resolution>",
    "confidence": "low" | "medium" | "high"
  },
  "disagreements": ["<bullet-level strings of key disagreements>"],
  "consensusPoints": ["<bullet-level strings where they agreed>"]
}

Be fair — do not favor Analyst A or Analyst B. Base confidence on the strength and clarity of the arguments.`;
}

/**
 * Formats the debate history into a user message for the judge.
 */
export function formatDebateForJudge(question: string, rounds: Round[]): string {
  const parts: string[] = [`## Question\n${question.trim()}`];

  for (const round of rounds) {
    parts.push(
      `## Round ${round.roundNumber}
**Analyst A (initial):** ${round.initial.content.trim()}
**Analyst B (critique):** ${round.critique.content.trim()}
**Analyst A (rebuttal):** ${round.rebuttal.content.trim()}`
    );
  }

  return parts.join("\n\n");
}

/**
 * Returns the system prompt for the single-shot critique tool.
 */
export function makeCritiqueSystemPrompt(): string {
  return `You critique a user-provided statement and return JSON only (no markdown fences, no extra text) with this shape:
{
  "critique": "<your critique>",
  "revisedVersion": "<an improved version of the statement>",
  "keyChanges": ["<short bullet of each major change>"]
}`;
}
