# Dissent — Cross-Vendor Adversarial Debate MCP Server

Single source of truth for the **Dissent** MCP server: product intent, file layout, types, stubs, config, tests, and agent rules.

---

## Agent contract (read first)

> **Important:** This project is a TypeScript learning exercise. Scaffold all files, types,
> and function signatures, but **leave `// TODO` comments inside function bodies** so the
> developer can implement them like a college coding assignment. Each TODO should include
> a brief hint about what to do and, where helpful, a link to the relevant docs.
>
> **DO NOT** implement the logic. Only provide types, signatures, imports, and stubs.

**Scaffolding checklist**

1. Create every file listed in [Directory structure](#directory-structure).
2. Write types, interfaces, and Zod schemas fully — they are the learning foundation.
3. Write function signatures, imports, and class shells fully.
4. Inside every function body, leave `// TODO:` comments with: what to do (1–3 sentences), which APIs to call, what to return, hints and doc links.
5. **No implementation logic:** no API calls, loops, or real conditionals in bodies — only `throw new Error("Not implemented");` after the TODOs (except where this doc says a file is “complete”).
6. Config files (`tsconfig.json`, `package.json`, `tsup.config.ts`, `.env.example`) and **error classes** are written out completely.
7. Test files: `describe` / `it` blocks with TODO stubs inside each test.

---

## Table of contents

| Section | What |
| ------- | ---- |
| [1. Project overview](#1-project-overview) | Goals, cross-vendor rationale, Analyst A/B labeling |
| [2. Tech stack](#2-tech-stack) | Language, MCP, clients, tooling |
| [3. Directory structure](#3-directory-structure) | Repo tree |
| [4. Types — `src/types/debate.ts`](#4-types--srctypesdebatets) | Domain types (complete) |
| [5. Zod — `src/types/tools.ts`](#5-zod--srctypestoolsts) | Tool input schemas (complete) |
| [6. Errors — `src/types/errors.ts`](#6-errors--srctypeerrorsts) | Custom errors (complete) |
| [7. Env — `src/config/env.ts`](#7-env--srcconfigenvts) | `loadEnvConfig` (stubs) |
| [8. LLM interface — `src/clients/types.ts`](#8-llm-interface--srcclientstypets) | `LlmClient` (complete) |
| [9. Anthropic — `src/clients/anthropic.ts`](#9-anthropic--srcclientsanthropicts) | Client (stubs) |
| [10. OpenAI — `src/clients/openai.ts`](#10-openai--srcclientsopenaits) | Client (stubs) |
| [11. Prompts — `src/engine/prompts.ts`](#11-prompts--srcenginepromptsts) | Templates (stubs) |
| [12. Orchestrator — `src/engine/orchestrator.ts`](#12-orchestrator--srcengineorchestratorts) | Debate loop (stubs) |
| [13. Synthesizer — `src/engine/synthesizer.ts`](#13-synthesizer--srcenginesynthesizerts) | Judge step (stubs) |
| [14. Tool handlers](#14-tool-handlers) | `debate.ts`, `critique.ts` |
| [15. MCP server — `src/server.ts`](#15-mcp-server--srcserverts) | Tool registration (stubs) |
| [16. Entry — `src/index.ts`](#16-entry--srcindexts) | stdio transport (stubs) |
| [17. Config files](#17-config-files) | `tsconfig`, `tsup`, `package.json`, `.env.example` |
| [18. Claude Desktop](#18-claude-desktop-config) | Host config snippet |
| [19. Test stubs](#19-test-stubs) | Example `orchestrator.test.ts` |
| [20. Implementation order](#20-implementation-order-suggested) | Suggested build sequence |
| [21. Agent instructions summary](#21-agent-instructions-summary) | Short duplicate of contract + checklist |

---

## 1. Project overview

Dissent is a TypeScript MCP server (stdio transport) that runs structured adversarial debates between Claude (Anthropic) and GPT (OpenAI) on subjective or ambiguous questions.

**Why cross-vendor?** LLMs from different vendors have different training data and RLHF targets. Forcing them to argue can produce stronger reasoning than single-model role-play. (See: Du et al. 2023, “Improving Factuality and Reasoning in Language Models through Multiagent Debate.”)

**Key design principle:** Models are labeled **“Analyst A”** and **“Analyst B”** (never by vendor name) so the synthesis judge is not biased.

---

## 2. Tech stack

| Layer            | Choice                               |
| ---------------- | ------------------------------------ |
| Language         | TypeScript 5.x, strict mode          |
| Runtime          | Node.js >= 20                        |
| MCP SDK          | `@modelcontextprotocol/sdk` (latest) |
| Anthropic client | `@anthropic-ai/sdk`                  |
| OpenAI client    | `openai`                             |
| Validation       | `zod` for input schemas              |
| Build            | `tsup` (esbuild-based bundler)      |
| Test             | `vitest`                             |
| Linting          | `eslint` + `@typescript-eslint`      |
| Package manager  | `npm`                                |

---

## 3. Directory structure

```
dissent/
├── src/
│   ├── index.ts                  # Entry point — creates & starts the MCP server
│   ├── server.ts                 # MCP server setup, tool registration
│   ├── tools/
│   │   ├── debate.ts             # debate() tool handler
│   │   └── critique.ts           # critique() tool handler
│   ├── engine/
│   │   ├── orchestrator.ts       # Core debate loop logic
│   │   ├── synthesizer.ts        # Judge / synthesis step
│   │   └── prompts.ts            # All system prompts & prompt templates
│   ├── clients/
│   │   ├── anthropic.ts          # Anthropic API wrapper
│   │   ├── openai.ts             # OpenAI API wrapper
│   │   └── types.ts              # Shared LLM client interface
│   ├── config/
│   │   └── env.ts                # Env var loading + validation
│   └── types/
│       ├── debate.ts             # Core domain types (Round, Synthesis, etc.)
│       ├── tools.ts              # MCP tool input/output schemas (Zod)
│       └── errors.ts             # Custom error classes
├── tests/
│   ├── engine/
│   │   ├── orchestrator.test.ts
│   │   └── synthesizer.test.ts
│   ├── clients/
│   │   ├── anthropic.test.ts
│   │   └── openai.test.ts
│   └── tools/
│       ├── debate.test.ts
│       └── critique.test.ts
├── tsconfig.json
├── tsup.config.ts
├── package.json
├── .env.example
└── README.md
```

---

## 4. Types — `src/types/debate.ts`

**Complete — no TODOs.** The agent writes these in full; understanding the types is part of the learning.

```ts
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
```

---

## 5. Zod — `src/types/tools.ts`

**Complete** — input validation for the two MCP tools.

```ts
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

export type DebateInput = z.infer<typeof DebateInputSchema>;
export type CritiqueInput = z.infer<typeof CritiqueInputSchema>;
```

---

## 6. Errors — `src/types/errors.ts`

**Complete** — short classes that teach `extends Error`.

```ts
// Provide these fully — they're short and teach class extension

export class DissentError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = "DissentError";
  }
}

export class ApiKeyMissingError extends DissentError {
  constructor(provider: "anthropic" | "openai") {
    super(
      `Missing API key: ${provider === "anthropic" ? "ANTHROPIC_API_KEY" : "OPENAI_API_KEY"}`,
      "API_KEY_MISSING"
    );
  }
}

export class ProviderError extends DissentError {
  constructor(provider: string, cause: unknown) {
    const msg = cause instanceof Error ? cause.message : String(cause);
    super(`${provider} API error: ${msg}`, "PROVIDER_ERROR");
  }
}

export class ValidationError extends DissentError {
  constructor(detail: string) {
    super(`Invalid input: ${detail}`, "VALIDATION_ERROR");
  }
}
```

---

## 7. Env — `src/config/env.ts`

**Stubs** — teach dotenv-free env loading.

```ts
// TODO stubs here — teach dotenv-free env loading

export interface EnvConfig {
  anthropicApiKey: string;
  openaiApiKey: string;
  defaultAnthropicModel: string;
  defaultOpenaiModel: string;
  maxRounds: number;
}

export function loadEnvConfig(): EnvConfig {
  // TODO: Read ANTHROPIC_API_KEY from process.env. If missing, throw ApiKeyMissingError("anthropic").
  // TODO: Read OPENAI_API_KEY from process.env. Same treatment.
  // TODO: Read DISSENT_ANTHROPIC_MODEL from process.env, default to "claude-sonnet-4-20250514".
  // TODO: Read DISSENT_OPENAI_MODEL from process.env, default to "gpt-4o".
  // TODO: Read DISSENT_MAX_ROUNDS from process.env, parse as int, default to 4, clamp to 1-4.
  // TODO: Return an EnvConfig object.
  //
  // Hint: No need for dotenv — MCP servers inherit env from the host (Claude Desktop / Cursor).
  // Hint: Use Number.parseInt() for the max rounds. Validate with Number.isNaN().
  throw new Error("Not implemented");
}
```

---

## 8. LLM interface — `src/clients/types.ts`

**Complete.**

```ts
/** Vendor-agnostic interface both clients must implement */
export interface LlmClient {
  /** Human-readable provider name (for metadata, not for prompts) */
  readonly provider: string;
  /** Model identifier string */
  readonly model: string;

  /**
   * Send a single completion request and return the text response.
   * @param systemPrompt - The system prompt setting the analyst's role
   * @param userMessage - The user-facing message / debate context
   * @returns The model's text response
   * @throws ProviderError on API failure
   */
  complete(systemPrompt: string, userMessage: string): Promise<string>;
}
```

---

## 9. Anthropic — `src/clients/anthropic.ts`

**Stubs.**

```ts
import Anthropic from "@anthropic-ai/sdk";
import type { LlmClient } from "./types.js";

export class AnthropicClient implements LlmClient {
  readonly provider = "anthropic";
  readonly model: string;
  private client: Anthropic;

  constructor(apiKey: string, model: string) {
    // TODO: Store the model string on this.model.
    // TODO: Instantiate `new Anthropic({ apiKey })` and store on this.client.
    // Hint: Import Anthropic from "@anthropic-ai/sdk". The constructor takes { apiKey }.
    throw new Error("Not implemented");
  }

  async complete(systemPrompt: string, userMessage: string): Promise<string> {
    // TODO: Call this.client.messages.create() with:
    //   - model: this.model
    //   - max_tokens: 1024
    //   - system: systemPrompt
    //   - messages: [{ role: "user", content: userMessage }]
    //
    // TODO: Extract the text from the response. The response shape is:
    //   response.content[0].type === "text" → response.content[0].text
    //
    // TODO: Wrap the call in try/catch. On failure, throw new ProviderError("anthropic", error).
    //
    // Hint: The Anthropic SDK docs are at https://docs.anthropic.com/en/api/messages
    // Hint: response.content is an array of ContentBlock. Filter for type === "text".
    throw new Error("Not implemented");
  }
}
```

---

## 10. OpenAI — `src/clients/openai.ts`

**Stubs.**

```ts
import OpenAI from "openai";
import type { LlmClient } from "./types.js";

export class OpenAIClient implements LlmClient {
  readonly provider = "openai";
  readonly model: string;
  private client: OpenAI;

  constructor(apiKey: string, model: string) {
    // TODO: Store model. Instantiate `new OpenAI({ apiKey })`.
    throw new Error("Not implemented");
  }

  async complete(systemPrompt: string, userMessage: string): Promise<string> {
    // TODO: Call this.client.chat.completions.create() with:
    //   - model: this.model
    //   - max_tokens: 1024
    //   - messages: [
    //       { role: "system", content: systemPrompt },
    //       { role: "user", content: userMessage }
    //     ]
    //
    // TODO: Extract response.choices[0].message.content. It can be null — default to "".
    //
    // TODO: Wrap in try/catch → throw new ProviderError("openai", error).
    //
    // Hint: OpenAI SDK docs: https://platform.openai.com/docs/api-reference/chat/create
    throw new Error("Not implemented");
  }
}
```

---

## 11. Prompts — `src/engine/prompts.ts`

**Stubs.**

```ts
import type { DebateMode } from "../types/debate.js";

/**
 * Returns the system prompt for an analyst in a debate.
 */
export function makeAnalystSystemPrompt(
  analystId: "A" | "B",
  mode: DebateMode
): string {
  // TODO: Return a system prompt string. It should:
  //   1. Address the model as "Analyst {analystId}"
  //   2. Explain they are in a structured {mode} debate
  //   3. If adversarial: instruct them to find weaknesses and argue the opposing view
  //   4. If collaborative: instruct them to build on the other's ideas while noting concerns
  //   5. Tell them to be specific, cite reasoning, and keep responses under 300 words
  //   6. IMPORTANT: Never mention vendor names — only "Analyst A" / "Analyst B"
  //
  // Hint: Use template literals. This is just string concatenation — no API calls.
  throw new Error("Not implemented");
}

/**
 * Returns the system prompt for the synthesis judge.
 */
export function makeJudgeSystemPrompt(): string {
  // TODO: Return a system prompt that instructs the model to:
  //   1. Act as a neutral judge reviewing a debate between Analyst A and Analyst B
  //   2. Produce a JSON object matching the Synthesis type + disagreements[] + consensusPoints[]
  //   3. Be fair — don't favor either analyst
  //   4. Assess confidence based on the strength of arguments
  //
  // Hint: Include the expected JSON shape in the prompt so the model knows the schema.
  throw new Error("Not implemented");
}

/**
 * Formats the debate history into a user message for the judge.
 */
export function formatDebateForJudge(
  question: string,
  rounds: import("../types/debate.js").Round[]
): string {
  // TODO: Build a string that presents the question and each round's arguments.
  //   Format each round like:
  //     ## Round {n}
  //     **Analyst A (initial):** {content}
  //     **Analyst B (critique):** {content}
  //     **Analyst A (rebuttal):** {content}
  //
  // Hint: Use Array.map() and template literals. Join with "\n\n".
  throw new Error("Not implemented");
}

/**
 * Returns the system prompt for the single-shot critique tool.
 */
export function makeCritiqueSystemPrompt(): string {
  // TODO: Instruct the model to critique a statement, then provide a revised version.
  //   Expected JSON output: { critique, revisedVersion, keyChanges[] }
  throw new Error("Not implemented");
}
```

---

## 12. Orchestrator — `src/engine/orchestrator.ts`

Core debate loop — **stubs** (most complex file).

```ts
import type { LlmClient } from "../clients/types.js";
import type { DebateInput } from "../types/tools.js";
import type { Round, Argument, DebateResult } from "../types/debate.js";
import { makeAnalystSystemPrompt, formatDebateForJudge } from "./prompts.js";
import { synthesize } from "./synthesizer.js";

export class Orchestrator {
  constructor(
    private analystA: LlmClient,  // Claude
    private analystB: LlmClient,  // GPT
    private judge: LlmClient      // Used for synthesis (can be either)
  ) {}

  async runDebate(input: DebateInput): Promise<DebateResult> {
    const startTime = Date.now();

    // TODO: Validate input.rounds is within 1..4. Throw ValidationError if not.

    // TODO: Create an empty Round[] array.

    // TODO: Loop from 1 to input.rounds. For each round:
    //
    //   1. Build the user message for Analyst A's initial argument:
    //      - Round 1: just the question (+ context if provided)
    //      - Round 2+: the question + previous round's critique and rebuttal
    //
    //   2. Call this.analystA.complete() with:
    //      - system: makeAnalystSystemPrompt("A", input.mode)
    //      - user: the message you built
    //      Store result as an Argument with role "initial"
    //
    //   3. Build the user message for Analyst B's critique:
    //      - Include the question + Analyst A's initial argument
    //
    //   4. Call this.analystB.complete() with:
    //      - system: makeAnalystSystemPrompt("B", input.mode)
    //      - user: the critique message
    //      Store result as an Argument with role "critique"
    //
    //   5. Build the user message for Analyst A's rebuttal:
    //      - Include the question + the critique
    //
    //   6. Call this.analystA.complete() with the rebuttal prompt.
    //      Store result as an Argument with role "rebuttal"
    //
    //   7. Push a Round { roundNumber, initial, critique, rebuttal } to the array.
    //
    // Hint: Each Argument needs a timestamp. Use `new Date().toISOString()`.
    // Hint: For the user messages, write helper functions or inline template literals.
    //       Keep it simple — you're concatenating strings, not building a framework.

    // TODO: Call synthesize() with the judge, question, and rounds array.
    //       This returns { synthesis, disagreements, consensusPoints }.

    // TODO: Build and return a DebateResult with:
    //   - question, mode, rounds, synthesis, disagreements, consensusPoints
    //   - metadata: { totalDurationMs: Date.now() - startTime, modelA, modelB, judgeModel }
    //
    // Hint: Get model names from this.analystA.model, etc.

    throw new Error("Not implemented");
  }
}
```

---

## 13. Synthesizer — `src/engine/synthesizer.ts`

**Stubs.**

```ts
import type { LlmClient } from "../clients/types.js";
import type { Round, Synthesis } from "../types/debate.js";
import { makeJudgeSystemPrompt, formatDebateForJudge } from "./prompts.js";

interface SynthesisResult {
  synthesis: Synthesis;
  disagreements: string[];
  consensusPoints: string[];
}

export async function synthesize(
  judge: LlmClient,
  question: string,
  rounds: Round[]
): Promise<SynthesisResult> {
  // TODO: Call judge.complete() with:
  //   - system: makeJudgeSystemPrompt()
  //   - user: formatDebateForJudge(question, rounds)
  //
  // TODO: Parse the response as JSON. The judge was instructed to return JSON.
  //   Use JSON.parse() inside a try/catch.
  //   If parsing fails, return a fallback SynthesisResult where:
  //     - synthesis.summary = the raw text response
  //     - synthesis.recommendation = "Could not parse structured output"
  //     - synthesis.confidence = "low"
  //     - disagreements = []
  //     - consensusPoints = []
  //
  // Hint: JSON.parse can throw SyntaxError. The model might wrap JSON in ```json blocks.
  //       Strip those with a regex before parsing: response.replace(/```json?\n?|```/g, "").trim()
  //
  // TODO: Validate the parsed object has the expected shape. If missing fields, fill defaults.
  //
  // TODO: Return the SynthesisResult.

  throw new Error("Not implemented");
}
```

---

## 14. Tool handlers

### `src/tools/debate.ts`

```ts
import type { EnvConfig } from "../config/env.js";
import { DebateInputSchema } from "../types/tools.js";
import type { DebateResult } from "../types/debate.js";
import { AnthropicClient } from "../clients/anthropic.js";
import { OpenAIClient } from "../clients/openai.js";
import { Orchestrator } from "../engine/orchestrator.js";

export async function handleDebate(
  rawArgs: unknown,
  config: EnvConfig
): Promise<DebateResult> {
  // TODO: Validate rawArgs with DebateInputSchema.safeParse(rawArgs).
  //   If not success, throw new ValidationError with the Zod error message.
  //   Hint: result.error.issues.map(i => i.message).join(", ")
  //
  // TODO: Instantiate AnthropicClient and OpenAIClient from config.
  //
  // TODO: Decide who is the judge. Use Anthropic (Claude) as the judge.
  //       Why? The synthesis is the most important step and Claude tends to follow
  //       structured output instructions more reliably.
  //
  // TODO: Create an Orchestrator with (analystA=claude, analystB=gpt, judge=claude).
  //
  // TODO: Call orchestrator.runDebate(parsedInput) and return the result.

  throw new Error("Not implemented");
}
```

### `src/tools/critique.ts`

```ts
import type { EnvConfig } from "../config/env.js";
import { CritiqueInputSchema } from "../types/tools.js";
import type { CritiqueResult } from "../types/debate.js";
import { OpenAIClient } from "../clients/openai.js";
import { makeCritiqueSystemPrompt } from "../engine/prompts.js";

export async function handleCritique(
  rawArgs: unknown,
  config: EnvConfig
): Promise<CritiqueResult> {
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

  throw new Error("Not implemented");
}
```

---

## 15. MCP server — `src/server.ts`

**Stubs.**

```ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { EnvConfig } from "./config/env.js";
import { DebateInputSchema, CritiqueInputSchema } from "./types/tools.js";
import { handleDebate } from "./tools/debate.js";
import { handleCritique } from "./tools/critique.js";

export function createServer(config: EnvConfig): McpServer {
  // TODO: Instantiate `new McpServer({ name: "dissent", version: "1.0.0" })`.
  //
  // TODO: Register the "debate" tool using server.tool().
  //   Arguments:
  //     - name: "debate"
  //     - description: "Run a structured adversarial debate between two LLMs on a question"
  //     - schema shape: { question: z.string(), context: z.string().optional(), ... }
  //       (Use the .shape from DebateInputSchema, or redefine inline — check MCP SDK docs)
  //     - handler: async (args) => {
  //         const result = await handleDebate(args, config);
  //         return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  //       }
  //
  // TODO: Register the "critique" tool similarly.
  //   - name: "critique"
  //   - description: "Get a cross-vendor critique of a statement with a revised version"
  //
  // TODO: Return the server instance.
  //
  // Hint: MCP SDK docs → https://modelcontextprotocol.io/docs/typescript-sdk
  // Hint: server.tool() signature: server.tool(name, schema, handler)
  //       The schema is a plain Zod object (the SDK handles serialization).

  throw new Error("Not implemented");
}
```

---

## 16. Entry — `src/index.ts`

**Stubs.**

```ts
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadEnvConfig } from "./config/env.js";
import { createServer } from "./server.js";

async function main(): Promise<void> {
  // TODO: Call loadEnvConfig(). If it throws, log the error to stderr and exit(1).
  //   Hint: Use console.error(), not console.log() — MCP uses stdout for protocol messages.
  //
  // TODO: Call createServer(config) to get the McpServer.
  //
  // TODO: Create a StdioServerTransport.
  //
  // TODO: Connect the server to the transport: await server.connect(transport).
  //
  // TODO: Log to stderr that the server is running (for debugging).
  //   e.g. console.error("Dissent MCP server running on stdio");

  throw new Error("Not implemented");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
```

---

## 17. Config files

### `tsconfig.json`

**Complete** — no TODOs.

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": "src",
    "declaration": true,
    "sourceMap": true,
    "resolveJsonModule": true,
    "forceConsistentCasingInFileNames": true,
    "noUncheckedIndexedAccess": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

### `tsup.config.ts`

```ts
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "node20",
  sourcemap: true,
  clean: true,
  dts: true,
});
```

### `package.json`

```json
{
  "name": "dissent",
  "version": "1.0.0",
  "description": "Cross-vendor adversarial debate MCP server",
  "type": "module",
  "main": "dist/index.js",
  "bin": {
    "dissent": "dist/index.js"
  },
  "scripts": {
    "build": "tsup",
    "dev": "tsx src/index.ts",
    "lint": "eslint src/",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.30.0",
    "@modelcontextprotocol/sdk": "^1.12.0",
    "openai": "^4.70.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@typescript-eslint/eslint-plugin": "^8.0.0",
    "@typescript-eslint/parser": "^8.0.0",
    "eslint": "^9.0.0",
    "tsup": "^8.0.0",
    "tsx": "^4.0.0",
    "typescript": "^5.6.0",
    "vitest": "^2.0.0"
  }
}
```

### `.env.example`

```
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
DISSENT_ANTHROPIC_MODEL=claude-sonnet-4-20250514
DISSENT_OPENAI_MODEL=gpt-4o
DISSENT_MAX_ROUNDS=4
```

---

## 18. Claude Desktop config

Add this to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "dissent": {
      "command": "node",
      "args": ["/absolute/path/to/dissent/dist/index.js"],
      "env": {
        "ANTHROPIC_API_KEY": "sk-ant-...",
        "OPENAI_API_KEY": "sk-..."
      }
    }
  }
}
```

---

## 19. Test stubs

Example: `tests/engine/orchestrator.test.ts`

```ts
import { describe, it, expect, vi } from "vitest";
import { Orchestrator } from "../../src/engine/orchestrator.js";
import type { LlmClient } from "../../src/clients/types.js";

function makeMockClient(responses: string[]): LlmClient {
  let callIndex = 0;
  return {
    provider: "mock",
    model: "mock-model",
    complete: vi.fn(async () => {
      // TODO: Return responses[callIndex++].
      // TODO: If callIndex exceeds responses.length, throw an error (unexpected call).
      //
      // Hint: This is a simple counter pattern. vi.fn() wraps it so vitest can assert on calls.
      throw new Error("Not implemented");
    }),
  };
}

describe("Orchestrator", () => {
  it("should run a 1-round debate and return a DebateResult", async () => {
    // TODO: Create mockA with 2 responses (initial + rebuttal).
    // TODO: Create mockB with 1 response (critique).
    // TODO: Create mockJudge with 1 response (JSON synthesis).
    //
    // TODO: Instantiate Orchestrator with (mockA, mockB, mockJudge).
    // TODO: Call runDebate with a simple question, 1 round.
    //
    // TODO: Assert:
    //   - result.rounds.length === 1
    //   - result.rounds[0].initial.analystId === "A"
    //   - result.rounds[0].critique.analystId === "B"
    //   - result.synthesis exists
    //   - mockA.complete was called 2 times
    //   - mockB.complete was called 1 time
    //   - mockJudge.complete was called 1 time

    throw new Error("Not implemented");
  });

  it("should throw ValidationError if rounds > 4", async () => {
    // TODO: Create mocks (won't be called).
    // TODO: Expect orchestrator.runDebate({ ..., rounds: 5 }) to reject with ValidationError.
    //
    // Hint: await expect(promise).rejects.toThrow(ValidationError)

    throw new Error("Not implemented");
  });
});
```

---

## 20. Implementation order (suggested)

Work through these in order. Each step builds on the last.

| Step | File(s)                                | What you'll learn                          |
| ---- | -------------------------------------- | ------------------------------------------ |
| 1    | `types/debate.ts`, `types/tools.ts`    | TypeScript interfaces, Zod schemas         |
| 2    | `types/errors.ts`                      | Class inheritance, `extends Error`         |
| 3    | `config/env.ts`                        | `process.env`, type narrowing, defaults    |
| 4    | `clients/types.ts`                     | Interfaces, `readonly`, `Promise<T>`       |
| 5    | `clients/anthropic.ts`                 | Async/await, SDK usage, try/catch          |
| 6    | `clients/openai.ts`                    | Same patterns, different SDK               |
| 7    | `engine/prompts.ts`                    | Template literals, string building         |
| 8    | `engine/synthesizer.ts`                | JSON.parse, error recovery, regex          |
| 9    | `engine/orchestrator.ts`               | Loops, state, composition                  |
| 10   | `tools/debate.ts`, `tools/critique.ts` | Wiring                                    |
| 11   | `server.ts`                            | MCP SDK registration                       |
| 12   | `index.ts`                             | Entry point, transport, error handling     |
| 13   | Tests                                  | Mocking, assertions, vitest                  |

---

## 21. Agent instructions summary

When scaffolding this project, follow the [Agent contract](#agent-contract-read-first) at the top of this document: full types and stubs only, TODOs in bodies, complete config and error classes, test skeletons with TODOs inside tests.

**Reference:** Du et al. 2023 — multi-agent debate improves factuality and reasoning; Dissent applies that idea across **two vendors** with neutral Analyst A/B labels.
