/**
 * Stdio transport entrypoint. Tool `inputSchema` values are Zod schemas registered in
 * `./server.ts` via `McpServer#registerTool` — same approach as:
 * https://modelcontextprotocol.io/docs/develop/build-server#typescript
 *
 * For stdio MCP, log only to stderr (`console.error`); never `console.log` on stdout.
 */
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { loadEnvConfig } from "./config/env.js";
import { createServer } from "./server.js";

async function main(): Promise<void> {
  let config;
  try {
    config = loadEnvConfig();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }

  const server: McpServer = createServer(config);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Dissent MCP server running on stdio");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
