import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { EnvConfig } from "./config/env.js";
import {
  formatCritiqueResultForTool,
  formatDebateResultForTool,
  formatDebateStepResultForTool,
} from "./formatting/tool-text.js";
import {
  DebateAutoInputSchema,
  DebateInputSchema,
  CritiqueInputSchema,
  DebateStartInputSchema,
  DebateNextInputSchema,
} from "./types/tools.js";
import { handleDebate, handleDebateAuto, handleDebateNext, handleDebateStart } from "./tools/debate.js";
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
      description:
        "Run a full cross-model debate in one call. Prefer this only when long tool calls are safe; for timeout-constrained hosts, use debate_start then debate_next until complete.",
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
        "Primary entrypoint for debates on timeout-constrained hosts (for example Claude Desktop). Start a cross-model debate session and then call debate_next until status is complete.",
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
    "debate_auto",
    {
      description:
        "Simple/plain-language debate entrypoint. Converts a topic into a stepwise debate_start session with sensible defaults for timeout-constrained hosts.",
      inputSchema: DebateAutoInputSchema,
    },
    async (args) => {
      const result = handleDebateAuto(args, config);
      return {
        content: [{ type: "text", text: formatDebateStepResultForTool(result) }],
      };
    }
  );

  server.registerTool(
    "debate_next",
    {
      description:
        "Advance a debate_start session by one step (one model call max). Keep calling with the same sessionId until status is complete.",
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
