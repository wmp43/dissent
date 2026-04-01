import { z } from "zod";

export const DebateInputSchema = z.object({
  question: z.string().min(10).describe("The question or topic to debate"),
  context: z.string().optional().describe("Additional context (e.g. a resume snippet, a code block)"),
  rounds: z.number().int().min(1).max(4).default(2).describe("Number of debate rounds (1-4)"),
  mode: z.enum(["adversarial", "collaborative"]).default("adversarial"),
});

export const CritiqueInputSchema = z.object({
  statement: z.string().min(10).describe("The statement to critique"),
  context: z.string().optional().describe("Additional context"),
});

export const DebateStartInputSchema = DebateInputSchema;

export const DebateNextInputSchema = z.object({
  sessionId: z.string().min(1).describe("Session id returned by debate_start"),
});

export type DebateInput = z.infer<typeof DebateInputSchema>;
export type CritiqueInput = z.infer<typeof CritiqueInputSchema>;
export type DebateStartInput = z.infer<typeof DebateStartInputSchema>;
export type DebateNextInput = z.infer<typeof DebateNextInputSchema>;
