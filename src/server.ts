import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { EnvConfig } from "./config/env.js";
import { formatCritiqueResultForTool, formatDebateResultForTool } from "./formatting/tool-text.js";
import { DebateInputSchema, CritiqueInputSchema } from "./types/tools.js";
import { handleDebate } from "./tools/debate.js";
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
