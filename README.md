# Dissent

**Dissent** is a [Model Context Protocol](https://modelcontextprotocol.io/) (MCP) server written in TypeScript. It runs **multi-round, structured debates** between two LLM backends—**Anthropic (Claude)** as Analyst A and **OpenAI** as Analyst B—then asks a **judge** model to produce a neutral synthesis, disagreements, and consensus points. A second tool performs **one-shot critique** of a statement with a revised version.

Debates use **Analyst A / Analyst B** in prompts (not vendor names) so the judge is less likely to bias toward a particular provider.

---

## Features

- **`debate`** — Configurable rounds (1–4), adversarial or collaborative mode, optional context; returns a readable report plus full JSON.
- **`critique`** — Cross-vendor critique via OpenAI with structured JSON (`critique`, `revisedVersion`, `keyChanges`).
- **Judge flexibility** — Default Anthropic judge, hosted OpenAI judge via `DISSENT_JUDGE_API_KEY`, or any **OpenAI-compatible** API (e.g. Ollama, vLLM) via `DISSENT_JUDGE_BASE_URL`.
- **Stdio transport** — Works with Claude Desktop, Cursor, and other MCP hosts that launch a subprocess and pass environment variables.

---

## Requirements

- **Node.js** 20+
- **npm**
- **API keys** — `ANTHROPIC_API_KEY` and `OPENAI_API_KEY` (used for the two analysts; the judge may use additional or alternate config—see below).

---

## Install and build

```bash
cd dissent
npm install
npm run build
```

Development run (stdio MCP on the current terminal):

```bash
npm run dev
```

Production-style entrypoint after build:

```bash
node dist/index.js
```

After `npm run build`, the `bin` field maps the `dissent` command to `dist/index.js` (useful with `npm link` or a global install).

---

## Configuration

Configuration is read from **`process.env`** only (no bundled `dotenv`). MCP hosts normally inject variables for the child process.

### Required

| Variable | Purpose |
| -------- | ------- |
| `ANTHROPIC_API_KEY` | Analyst A (Claude) |
| `OPENAI_API_KEY` | Analyst B (GPT) |

### Optional

| Variable | Default | Purpose |
| -------- | ------- | ------- |
| `DISSENT_ANTHROPIC_MODEL` | `claude-sonnet-4-20250514` | Model id for Analyst A |
| `DISSENT_OPENAI_MODEL` | `gpt-4o` | Model id for Analyst B |
| `DISSENT_JUDGE_MODEL` | `claude-sonnet-4-20250514` | Model id for the judge (whichever backend you select below) |
| `DISSENT_MAX_ROUNDS` | `4` | Env-level cap (1–4); per-request `rounds` are also validated in the tool schema |
| `DISSENT_JUDGE_BASE_URL` | _(empty)_ | If set (e.g. `http://localhost:11434/v1` for Ollama), the judge uses this OpenAI-compatible base URL |
| `DISSENT_JUDGE_API_KEY` | _(empty)_ | If set (and no judge base URL), the judge uses the OpenAI API with this key; with only a local base URL, an internal placeholder key may be used |

**Judge selection (first match wins):**

1. **`DISSENT_JUDGE_BASE_URL` is set** → OpenAI-compatible client at that URL (good for local open-weights judges).
2. **`DISSENT_JUDGE_API_KEY` is set** → OpenAI’s hosted API as judge.
3. **Otherwise** → Anthropic (`ANTHROPIC_API_KEY`) as judge with `DISSENT_JUDGE_MODEL`.

---

## MCP tools

| Tool | Description |
| ---- | ----------- |
| `debate` | `question` (required), optional `context`, `rounds` (1–4), `mode` (`adversarial` \| `collaborative`). Returns formatted text and embedded JSON. |
| `critique` | `statement` (required), optional `context`. Returns critique + revised text + key changes. |

Input and output shapes are defined in code with **Zod** (`src/types/tools.ts`) and domain types (`src/types/debate.ts`). For a full design write-up, see [dissent.md](dissent.md).

---

## Claude Desktop

Add a server block so Claude launches Node against your built server and passes secrets in `env` (never commit real keys).

**macOS** — edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "dissent": {
      "command": "node",
      "args": ["/absolute/path/to/dissent/dist/index.js"],
      "env": {
        "ANTHROPIC_API_KEY": "your-key",
        "OPENAI_API_KEY": "your-key"
      }
    }
  }
}
```

Use the **absolute** path to `dist/index.js`. Restart Claude fully (quit the app, not only the window) after changes.

On **Windows**, the config path is typically `%AppData%\Claude\claude_desktop_config.json`.

---

## Project layout (overview)

| Path | Role |
| ---- | ---- |
| `src/index.ts` | Stdio transport + `loadEnvConfig` + `createServer` |
| `src/server.ts` | MCP `registerTool` for `debate` and `critique` |
| `src/tools/` | Tool handlers, validation, client wiring |
| `src/engine/` | Orchestrator, prompts, judge synthesis |
| `src/clients/` | Anthropic and OpenAI (`LlmClient`) implementations |
| `src/formatting/` | Human-readable tool output strings |
| `tests/` | Vitest unit tests |

---

## Development

| Command | Description |
| ------- | ----------- |
| `npm run build` | Bundle to `dist/` with `tsup` |
| `npm run dev` | Run `src/index.ts` with `tsx` |
| `npm run lint` | ESLint on `src/` |
| `npm test` | Run Vitest once |
| `npm run test:watch` | Vitest watch mode |

Logging: for **stdio** MCP, use **`console.error`** for diagnostics only—**do not** `console.log` to stdout, or you will corrupt the JSON-RPC stream.

---

## License

See [LICENSE](LICENSE).
