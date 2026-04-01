import type { LlmClient } from "../clients/types.js";
import type { DebateInput } from "../types/tools.js";
import type { Argument, DebateResult, Round } from "../types/debate.js";
import { ValidationError } from "../types/errors.js";
import { logLlmCallStart, logLlmResponse } from "../logging/llm-trace.js";
import { makeAnalystSystemPrompt } from "./prompts.js";
import { synthesize } from "./synthesizer.js";

export type OrchestratorOptions = {
  verboseLlm?: boolean;
};

export type DebatePhase = "initial" | "critique" | "rebuttal" | "judge" | "done";

export type DebateSessionState = {
  input: DebateInput;
  startedAtMs: number;
  rounds: Round[];
  currentRoundNumber: number;
  currentInitial?: Argument;
  currentCritique?: Argument;
  phase: DebatePhase;
  llmStep: number;
  totalLlmCalls: number;
  result?: DebateResult;
};

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
    private analystA: LlmClient,
    private analystB: LlmClient,
    private judge: LlmClient,
    private readonly options: OrchestratorOptions = {}
  ) {}

  startDebateSession(input: DebateInput): DebateSessionState {
    const { rounds: nRounds } = input;
    if (!Number.isInteger(nRounds) || nRounds < 1 || nRounds > 4) {
      throw new ValidationError(`rounds must be an integer from 1 to 4, got ${String(nRounds)}`);
    }
    return {
      input,
      startedAtMs: Date.now(),
      rounds: [],
      currentRoundNumber: 1,
      phase: "initial",
      llmStep: 0,
      totalLlmCalls: nRounds * 3 + 1,
    };
  }

  async advanceDebateSession(state: DebateSessionState): Promise<DebateSessionState> {
    if (state.phase === "done") {
      return state;
    }

    const verbose = this.options.verboseLlm === true;
    const traceStart = (label: string, client: LlmClient) => {
      state.llmStep += 1;
      logLlmCallStart(
        verbose,
        `LLM ${state.llmStep}/${state.totalLlmCalls} · ${label} · ${client.provider}/${client.model}`
      );
    };

    if (state.phase === "initial") {
      const r = state.currentRoundNumber;
      const previousRound = r > 1 ? state.rounds[r - 2] : undefined;
      const initialUser = buildInitialUserMessage(state.input, r, previousRound);

      traceStart(`Round ${r}/${state.input.rounds} · Analyst A · initial`, this.analystA);
      const initialText = await this.analystA.complete(
        makeAnalystSystemPrompt("A", state.input.mode),
        initialUser
      );
      logLlmResponse(verbose, `Round ${r} · Analyst A · initial`, initialText);
      state.currentInitial = {
        analystId: "A",
        role: "initial",
        content: initialText.trim(),
        timestamp: nowIso(),
      };
      state.phase = "critique";
      return state;
    }

    if (state.phase === "critique") {
      if (!state.currentInitial) {
        throw new ValidationError("session state invalid: missing initial argument for critique step");
      }
      const r = state.currentRoundNumber;
      const critiqueUser = buildCritiqueUserMessage(state.input, state.currentInitial);
      traceStart(`Round ${r}/${state.input.rounds} · Analyst B · critique`, this.analystB);
      const critiqueText = await this.analystB.complete(
        makeAnalystSystemPrompt("B", state.input.mode),
        critiqueUser
      );
      logLlmResponse(verbose, `Round ${r} · Analyst B · critique`, critiqueText);
      state.currentCritique = {
        analystId: "B",
        role: "critique",
        content: critiqueText.trim(),
        timestamp: nowIso(),
      };
      state.phase = "rebuttal";
      return state;
    }

    if (state.phase === "rebuttal") {
      if (!state.currentInitial || !state.currentCritique) {
        throw new ValidationError("session state invalid: missing initial/critique for rebuttal step");
      }
      const r = state.currentRoundNumber;
      const rebuttalUser = buildRebuttalUserMessage(state.input, state.currentCritique);
      traceStart(`Round ${r}/${state.input.rounds} · Analyst A · rebuttal`, this.analystA);
      const rebuttalText = await this.analystA.complete(
        makeAnalystSystemPrompt("A", state.input.mode),
        rebuttalUser
      );
      logLlmResponse(verbose, `Round ${r} · Analyst A · rebuttal`, rebuttalText);
      const rebuttal: Argument = {
        analystId: "A",
        role: "rebuttal",
        content: rebuttalText.trim(),
        timestamp: nowIso(),
      };
      state.rounds.push({
        roundNumber: r,
        initial: state.currentInitial,
        critique: state.currentCritique,
        rebuttal,
      });
      state.currentInitial = undefined;
      state.currentCritique = undefined;

      if (r < state.input.rounds) {
        state.currentRoundNumber += 1;
        state.phase = "initial";
      } else {
        state.phase = "judge";
      }
      return state;
    }

    const { synthesis, disagreements, consensusPoints } = await synthesize(
      this.judge,
      state.input.question,
      state.rounds,
      verbose
        ? { verboseLlm: true, judgeStep: state.totalLlmCalls, totalLlmCalls: state.totalLlmCalls }
        : undefined
    );
    state.llmStep = state.totalLlmCalls;
    state.result = {
      question: state.input.question,
      mode: state.input.mode,
      rounds: state.rounds,
      synthesis,
      disagreements,
      consensusPoints,
      metadata: {
        totalDurationMs: Date.now() - state.startedAtMs,
        modelA: this.analystA.model,
        modelB: this.analystB.model,
        judgeModel: this.judge.model,
      },
    };
    state.phase = "done";
    return state;
  }

  async runDebate(input: DebateInput): Promise<DebateResult> {
    let state = this.startDebateSession(input);
    while (state.phase !== "done") {
      state = await this.advanceDebateSession(state);
    }
    if (!state.result) {
      throw new ValidationError("session completed without result");
    }
    return state.result;
  }
}
