import type { CritiqueResult, DebateResult } from "../types/debate.js";

function bulletList(items: string[], emptyLabel: string): string {
  if (items.length === 0) {
    return emptyLabel;
  }
  return items.map((line) => `  • ${line}`).join("\n");
}

function formatRoundBlock(result: DebateResult): string {
  if (result.rounds.length === 0) {
    return "  (no rounds recorded)";
  }
  const lines: string[] = [];
  for (const round of result.rounds) {
    const n = round.roundNumber;
    const total = result.rounds.length;
    lines.push(`ROUND ${n} OF ${total}`);
    lines.push("—".repeat(44));
    lines.push(`Initial argument (Analyst A)`);
    lines.push(round.initial.content.trim());
    lines.push("");
    lines.push(`Critique (Analyst B)`);
    lines.push(round.critique.content.trim());
    lines.push("");
    lines.push(`Rebuttal (Analyst A)`);
    lines.push(round.rebuttal.content.trim());
    lines.push("");
  }
  return lines.join("\n").trimEnd();
}

/**
 * Human-readable tool output for `debate`, plus JSON for clients that want the full object.
 */
export function formatDebateResultForTool(result: DebateResult): string {
  const { synthesis, metadata } = result;

  const debateBody = formatRoundBlock(result);

  const text = `
DEBATE RESULT
=============

QUESTION
--------
${result.question.trim()}

MODE
----
${result.mode}

DEBATE POINTS (BY ROUND)
------------------------
${debateBody}

JUDGE SYNTHESIS
---------------
Summary
${synthesis.summary.trim()}

Recommendation
${synthesis.recommendation.trim()}

Confidence: ${synthesis.confidence}

WHERE THEY DISAGREED
--------------------
${bulletList(result.disagreements, "  (none noted)")}

WHERE THEY ALIGNED
------------------
${bulletList(result.consensusPoints, "  (none noted)")}

MODEL IDS (traceability)
------------------------
Analyst A: ${metadata.modelA}
Analyst B: ${metadata.modelB}
Judge:     ${metadata.judgeModel}
Total time: ${metadata.totalDurationMs} ms

---
FULL RESULT (JSON)
------------------
${JSON.stringify(result, null, 2)}
`.trim();

  return text;
}

/**
 * Human-readable tool output for `critique`, plus JSON.
 */
export function formatCritiqueResultForTool(result: CritiqueResult): string {
  const changes = bulletList(result.keyChanges, "  (none listed)");

  return `
CRITIQUE RESULT
===============

ORIGINAL STATEMENT
------------------
${result.originalStatement.trim()}

CRITIQUE
--------
${result.critique.trim()}

REVISED VERSION
-----------------
${result.revisedVersion.trim()}

KEY CHANGES
-----------
${changes}

---
FULL RESULT (JSON)
------------------
${JSON.stringify(result, null, 2)}
`.trim();
}
