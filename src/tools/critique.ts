import type { EnvConfig } from "../config/env.js";
import { CritiqueInputSchema } from "../types/tools.js";
import type { CritiqueResult } from "../types/debate.js";
import { OpenAIClient } from "../clients/openai.js";
import { makeCritiqueSystemPrompt } from "../engine/prompts.js";

export async function handleCritique(_rawArgs: unknown, _config: EnvConfig): Promise<CritiqueResult> {
  // TODO: Validate rawArgs with CritiqueInputSchema.safeParse().
  //
  // TODO: Instantiate OpenAIClient (use GPT as the critic — different vendor = better critique).
  //
  // TODO: Build the user message: the statement + optional context.
  //
  // TODO: Call client.complete() with makeCritiqueSystemPrompt() and the user message.
  //
  // TODO: Parse the JSON response. Same fallback strategy as synthesizer.
  //   Fallback CritiqueResult:
  //     { originalStatement: input.statement, critique: rawResponse, revisedVersion: "", keyChanges: [] }
  //
  // TODO: Return the CritiqueResult.

  void CritiqueInputSchema;
  void OpenAIClient;
  void makeCritiqueSystemPrompt;
  throw new Error("Not implemented");
}
