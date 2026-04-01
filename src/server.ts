import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { EnvConfig } from "./config/env.js";
import {
  formatCritiqueResultForTool,
  formatDebateResultForTool,
  formatDebateStepResultForTool,
} from "./formatting/tool-text.js";
import {
  DebateInputSchema,
  CritiqueInputSchema,
  DebateStartInputSchema,
  DebateNextInputSchema,
} from "./types/tools.js";
import { handleDebate, handleDebateNext, handleDebateStart } from "./tools/debate.js";
import { handleCritique } from "./tools/critique.js";

/**
 * MCP surface: tools are registered with `registerTool` and Zod `inputSchema`, matching the
 * official TypeScript quickstart — https://modelcontextprotocol.io/docs/develop/build-server#typescript
 */
export function createServer(config: EnvConfig): McpServer {
  const server = new McpServer({
    name: "dissent",
    version: "1.0.0",
  });

  server.registerTool(
    "debate",
    {
      description: "Run a structured adversarial debate between two LLMs on a question",
      inputSchema: DebateInputSchema,
    },
    async (args) => {
      const result = await handleDebate(args, config);
      return {
        content: [{ type: "text", text: formatDebateResultForTool(result) }],
      };
    }
  );

  server.registerTool(
    "debate_start",
    {
      description:
        "Start a stepwise debate session for timeout-constrained clients; call debate_next until complete",
      inputSchema: DebateStartInputSchema,
    },
    async (args) => {
      const result = handleDebateStart(args, config);
      return {
        content: [{ type: "text", text: formatDebateStepResultForTool(result) }],
      };
    }
  );

  server.registerTool(
    "debate_next",
    {
      description: "Advance one step in a debate_start session (one LLM call max per invocation)",
      inputSchema: DebateNextInputSchema,
    },
    async (args) => {
      const result = await handleDebateNext(args, config);
      return {
        content: [{ type: "text", text: formatDebateStepResultForTool(result) }],
      };
    }
  );

  server.registerTool(
    "critique",
    {
      description: "Get a cross-vendor critique of a statement with a revised version",
      inputSchema: CritiqueInputSchema,
    },
    async (args) => {
      const result = await handleCritique(args, config);
      return {
        content: [{ type: "text", text: formatCritiqueResultForTool(result) }],
      };
    }
  );

  return server;
}
