# Dissent

**Dissent** is a [Model Context Protocol](https://modelcontextprotocol.io/) (MCP) server written in TypeScript. It runs **multi-round, structured debates** between two LLM backends—**Anthropic (Claude)** as Analyst A and **OpenAI** as Analyst B—then asks a **judge** model to produce a neutral synthesis, disagreements, and consensus points. A second tool performs **one-shot critique** of a statement with a revised version.

Debates use **Analyst A / Analyst B** in prompts (not vendor names) so the judge is less likely to bias toward a particular provider.

---

## Features

- **`debate`** — Configurable rounds (1–4), adversarial or collaborative mode, optional context; returns a readable report plus full JSON.
- **`critique`** — Cross-vendor critique via OpenAI with structured JSON (`critique`, `revisedVersion`, `keyChanges`).
- **Judge flexibility** — Default Anthropic judge, **Google Gemini 2.5** (Pro or Flash) via `DISSENT_JUDGE_GEMINI_API_KEY`, hosted OpenAI via `DISSENT_JUDGE_API_KEY`, or any **OpenAI-compatible** API (e.g. Ollama, vLLM) via `DISSENT_JUDGE_BASE_URL`.
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
| `DISSENT_OPENAI_MODEL` | `gpt-5.4-mini` | Model id for Analyst B (and critique). Hosted OpenAI calls use the [Responses API](https://developers.openai.com/api/docs/quickstart); OpenAI-compatible `baseURL` judges still use chat completions. |
| `DISSENT_JUDGE_MODEL` | See below | Optional override: judge model id for **any** judge backend (wins over `DISSENT_GOOGLE_MODEL`) |
| `DISSENT_GOOGLE_MODEL` | _(see below)_ | When a Gemini key is set and `DISSENT_JUDGE_MODEL` is empty: judge’s Gemini model id (e.g. `gemini-2.5-flash`). If unset, defaults to `gemini-2.5-flash`. |
| `DISSENT_MAX_ROUNDS` | `4` | Env-level cap (1–4); per-request `rounds` are also validated in the tool schema |
| `DISSENT_JUDGE_BASE_URL` | _(empty)_ | If set (e.g. `http://localhost:11434/v1` for Ollama), the judge uses this OpenAI-compatible base URL |
| `DISSENT_JUDGE_GEMINI_API_KEY` | _(empty)_ | Primary name for a **Gemini / Google AI** key. Also accepts `GEMINI_API_KEY` or `GOOGLE_CLOUD_API_KEY` if this is empty (same `AIza…` keys as Google’s GenAI samples). Judge uses Google’s [OpenAI-compatible endpoint](https://ai.google.dev/gemini-api/docs/openai). |
| `DISSENT_JUDGE_API_KEY` | _(empty)_ | **OpenAI** secret (`sk-…`) for a hosted OpenAI judge. If the value starts with `AIza` (Google), it is **not** sent to OpenAI—it is routed to Gemini like the variables above. |
| `DISSENT_VERBOSE_LLM` | _(off)_ | Set to `1`, `true`, or `yes` to print **stderr** progress for each foundation-model call: `LLM i/n · stage · provider/model`, then a truncated preview of the response (debate + critique + judge). Does not change MCP tool output. |

**Default judge model resolution**

- **`DISSENT_JUDGE_MODEL`** set → always used as the judge model id.
- Else **Gemini key** set (`GEMINI_API_KEY`, etc.) → **`DISSENT_GOOGLE_MODEL`**, or `gemini-2.5-flash` if empty.
- Else **Anthropic judge** → `claude-sonnet-4-20250514` (unless `DISSENT_JUDGE_MODEL` was set in the first bullet).

A typical Gemini-judge setup is: `GEMINI_API_KEY` + `DISSENT_GOOGLE_MODEL` + `DISSENT_ANTHROPIC_MODEL` / `DISSENT_OPENAI_MODEL` for the two analysts.

Dissent calls Gemini through the **OpenAI-compatible** HTTP API (`generativelanguage.googleapis.com`), not the `@google/genai` SDK—you do **not** need Vertex setup in code for that path; an [AI Studio API key](https://aistudio.google.com/apikey) is enough.

**Judge selection (first match wins):**

1. **`DISSENT_JUDGE_BASE_URL` is set** → OpenAI-compatible client at that URL (Ollama, vLLM, or Gemini’s OpenAI path).
2. **Gemini key present** (`DISSENT_JUDGE_GEMINI_API_KEY`, or `GEMINI_API_KEY`, or `GOOGLE_CLOUD_API_KEY`) → Gemini judge.
3. **`DISSENT_JUDGE_API_KEY` is set** → if it starts with `AIza`, Gemini judge; otherwise OpenAI’s hosted API as judge.
4. **Otherwise** → Anthropic (`ANTHROPIC_API_KEY`) as judge.

---

## MCP tools

| Tool | Description |
| ---- | ----------- |
| `debate` | `question` (required), optional `context`, `rounds` (1–4), `mode` (`adversarial` \| `collaborative`). Returns formatted text and embedded JSON. |
| `debate_start` | Same input shape as `debate`; creates a resumable debate session and returns `sessionId` + progress metadata. |
| `debate_next` | `sessionId` (required); advances exactly one step in the session (one model call max) and returns progress or final result. |
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

### Timeout-constrained hosts (Claude Desktop)

Some MCP hosts enforce per-tool-call limits (for example, 60s). When that happens, use stepwise debate:

1. Call `debate_start` with your normal debate arguments (`question`, optional `context`, `rounds`, `mode`).
2. Repeatedly call `debate_next` with the returned `sessionId`.
3. Stop when `status` is `complete`; the final response includes the same full debate output (rounds + rebuttals + judge synthesis).

The original `debate` tool is still available for clients that can wait for a single long call.

---

## Project layout (overview)

| Path | Role |
| ---- | ---- |
| `src/index.ts` | Stdio transport + `loadEnvConfig` + `createServer` |
| `src/server.ts` | MCP `registerTool` for `debate`, `debate_start`, `debate_next`, and `critique` |
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
| `npm run test:ci` | Lint + unit tests + build (matches typical CI) |
| `npm run test:live` | Opt-in real API checks (`RUN_LIVE_INFERENCE=1`; reads `.env` if present) |
| `npm run test:live:log` | Same as `test:live`, but copies **stdout + stderr** to `live-run.log` via `tee` (ignored by git via `*.log`; delete when done) |

### Optional live inference test

By default, tests are mocked/offline and do not call Anthropic or OpenAI.

Vitest loads a repo-root **`.env`** file (via `dotenv`) when present, so you usually only need to enable the live suite:

```bash
npm run test:live
```

Equivalent manual invocation:

```bash
RUN_LIVE_INFERENCE=1 npm test -- tests/integration/live-inference.test.ts
```

**Requirements:** Valid **`ANTHROPIC_API_KEY`** and **`OPENAI_API_KEY`** with working quota (Analyst A/B and critique use Anthropic + OpenAI; the judge follows your judge env vars). Billing or rate limits (e.g. OpenAI `429`) will fail the live tests until the account can complete those calls.

**Timeouts:** The debate live test allows up to **6 minutes** per run (`360s`), critique **3 minutes** (`180s`). If Vitest prints `Test timed out in …ms`, the run exceeded that ceiling (slow models, cold starts, or parallel load)—not a mystery platform limit. The suite runs **sequentially** so logs stay ordered.

**Save full console output once:** `npm run test:live:log` writes everything to `live-run.log` in the repo root (plus prints to the terminal). Remove the file when you no longer need it.

To run an opt-in live verification path without a `.env` file, export keys in the shell:

```bash
ANTHROPIC_API_KEY=... OPENAI_API_KEY=... RUN_LIVE_INFERENCE=1 npm test -- tests/integration/live-inference.test.ts
```

PowerShell:

```powershell
$env:ANTHROPIC_API_KEY="..."
$env:OPENAI_API_KEY="..."
$env:RUN_LIVE_INFERENCE="1"
npm test -- tests/integration/live-inference.test.ts
```

You can also set `DISSENT_JUDGE_BASE_URL` + `DISSENT_JUDGE_MODEL` to verify a third-party OpenAI-compatible judge.

Logging: for **stdio** MCP, use **`console.error`** for diagnostics only—**do not** `console.log` to stdout, or you will corrupt the JSON-RPC stream. Enable **`DISSENT_VERBOSE_LLM`** to stream per-call debate/critique progress and excerpts to stderr (see table above).

---

## License

See [LICENSE](LICENSE).
