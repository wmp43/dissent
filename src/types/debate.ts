/** Which mode the debate runs in */
export type DebateMode = "adversarial" | "collaborative";

/** A single model's contribution in one round */
export interface Argument {
  analystId: "A" | "B";
  role: "initial" | "critique" | "rebuttal";
  content: string;
  timestamp: string; // ISO 8601
}

/** One full round of debate (initial → critique → rebuttal) */
export interface Round {
  roundNumber: number;
  initial: Argument;
  critique: Argument;
  rebuttal: Argument;
}

/** Final synthesis produced by the judge */
export interface Synthesis {
  summary: string;
  recommendation: string;
  confidence: "low" | "medium" | "high";
}

/** The complete output of a debate */
export interface DebateResult {
  question: string;
  mode: DebateMode;
  rounds: Round[];
  synthesis: Synthesis;
  disagreements: string[];
  consensusPoints: string[];
  metadata: {
    totalDurationMs: number;
    modelA: string; // e.g. "claude-sonnet-4-20250514"
    modelB: string; // e.g. "gpt-4o"
    judgeModel: string;
  };
}

/** The complete output of a single-shot critique */
export interface CritiqueResult {
  originalStatement: string;
  critique: string;
  revisedVersion: string;
  keyChanges: string[];
}
