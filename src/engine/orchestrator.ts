import type { LlmClient } from "../clients/types.js";
import type { DebateInput } from "../types/tools.js";
import type { Argument, DebateResult, Round } from "../types/debate.js";
import { ValidationError } from "../types/errors.js";
import { makeAnalystSystemPrompt } from "./prompts.js";
import { synthesize } from "./synthesizer.js";

function nowIso(): string {
  return new Date().toISOString();
}

function buildInitialUserMessage(input: DebateInput, roundIndex: number, previousRound: Round | undefined): string {
  const q = input.question.trim();
  const ctx = input.context?.trim();

  let body = `## Topic / question\n${q}`;
  if (ctx) {
    body += `\n\n## Additional context\n${ctx}`;
  }

  if (roundIndex > 1 && previousRound) {
    body += `

## Previous round (round ${previousRound.roundNumber}) for continuity
**Analyst B's critique:** ${previousRound.critique.content.trim()}

**Analyst A's rebuttal:** ${previousRound.rebuttal.content.trim()}

Now provide your **initial argument** for this new round as Analyst A, incorporating the above where relevant.`;
  } else {
    body += `

Provide your **initial argument** as Analyst A.`;
  }

  return body;
}

function buildCritiqueUserMessage(input: DebateInput, initial: Argument): string {
  const q = input.question.trim();
  return `## Topic / question
${q}

## Analyst A's initial argument (this round)
${initial.content.trim()}

Provide your **critique** as Analyst B.`;
}

function buildRebuttalUserMessage(input: DebateInput, critique: Argument): string {
  const q = input.question.trim();
  return `## Topic / question
${q}

## Analyst B's critique (this round)
${critique.content.trim()}

Provide your **rebuttal** as Analyst A.`;
}

export class Orchestrator {
  constructor(
    private analystA: LlmClient, // Claude
    private analystB: LlmClient, // GPT
    private judge: LlmClient // Used for synthesis (can be either or )
  ) {}

  async runDebate(input: DebateInput): Promise<DebateResult> {
    const startTime = Date.now();

    const { rounds: nRounds } = input;
    if (!Number.isInteger(nRounds) || nRounds < 1 || nRounds > 4) {
      throw new ValidationError(`rounds must be an integer from 1 to 4, got ${String(nRounds)}`);
    }

    const rounds: Round[] = [];
    // This is for number rounds
    // TODO: Implement infinite rounds 
    //  Like the pro max version of debate. 
    // at every 3 cycles you should probably summarize the debate
    // every 2 cycles you should ask the judge if agreement has been reached
    for (let r = 1; r <= nRounds; r++) {
      const previousRound = r > 1 ? rounds[r - 2] : undefined;
      const initialUser = buildInitialUserMessage(input, r, previousRound);

      const initialText = await this.analystA.complete(
        makeAnalystSystemPrompt("A", input.mode),
        initialUser
      );
      const initial: Argument = {
        analystId: "A",
        role: "initial",
        content: initialText.trim(),
        timestamp: nowIso(),
      };

      const critiqueUser = buildCritiqueUserMessage(input, initial);
      const critiqueText = await this.analystB.complete(
        makeAnalystSystemPrompt("B", input.mode),
        critiqueUser
      );
      const critique: Argument = {
        analystId: "B",
        role: "critique",
        content: critiqueText.trim(),
        timestamp: nowIso(),
      };

      const rebuttalUser = buildRebuttalUserMessage(input, critique);
      const rebuttalText = await this.analystA.complete(
        makeAnalystSystemPrompt("A", input.mode),
        rebuttalUser
      );
      const rebuttal: Argument = {
        analystId: "A",
        role: "rebuttal",
        content: rebuttalText.trim(),
        timestamp: nowIso(),
      };

      rounds.push({
        roundNumber: r,
        initial,
        critique,
        rebuttal,
      });
    }

    const { synthesis, disagreements, consensusPoints } = await synthesize(
      this.judge,
      input.question,
      rounds
    );

    return {
      question: input.question,
      mode: input.mode,
      rounds,
      synthesis,
      disagreements,
      consensusPoints,
      metadata: {
        totalDurationMs: Date.now() - startTime,
        modelA: this.analystA.model,
        modelB: this.analystB.model,
        judgeModel: this.judge.model,
      },
    };
  }
}
