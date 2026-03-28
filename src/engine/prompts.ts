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
 *
 * Multi-round debates are **sequential exchanges**, not the same “initial” copied: each round is
 * a new three-turn cycle (A opens → B critiques → A rebuts). Numbering turns across rounds avoids
 * ambiguous repeated headings like “Analyst A (initial)” on every block.
 */
export function formatDebateForJudge(question: string, rounds: Round[]): string {
  const total = rounds.length;
  const lines: string[] = [
    "## Question",
    question.trim(),
    "",
    "## How to read this transcript",
    total === 0
      ? "No rounds were completed."
      : `There ${total === 1 ? "is" : "are"} **${total}** round(s). Each round is one full exchange: Analyst A **opens that round**, Analyst B **critiques**, Analyst A **rebuts**. Round 2+ are new cycles on the same topic (they may build on earlier rounds), not repetitions of round 1.`,
    "",
    "## Transcript (chronological)",
    "",
  ];

  let turn = 1;
  for (const round of rounds) {
    const r = round.roundNumber;
    lines.push(`### Round ${r} of ${total}`);
    lines.push(
      `**Turn ${turn++} — Analyst A opens round ${r}:** ${round.initial.content.trim()}`
    );
    lines.push(`**Turn ${turn++} — Analyst B (critique):** ${round.critique.content.trim()}`);
    lines.push(`**Turn ${turn++} — Analyst A (rebuttal):** ${round.rebuttal.content.trim()}`);
    lines.push("");
  }

  return lines.join("\n").trimEnd();
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
