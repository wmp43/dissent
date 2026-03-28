# Dissent

TypeScript [Model Context Protocol](https://modelcontextprotocol.io/) (MCP) server that runs **structured adversarial debates** between two LLM vendors (Anthropic Claude and OpenAI GPT) on subjective or ambiguous questions, then produces a **neutral synthesis**. A separate tool runs a **cross-vendor critique** of a statement with a revised version.

Models are referred to only as **Analyst A** and **Analyst B** in prompts so the judge is not biased by vendor names.

**Full specification:** [dissent.md](dissent.md) — directory layout, types, Zod schemas, stubs, config templates, tests, Claude Desktop wiring, and agent scaffolding rules.

### Scaffold status (strict-first)

The repo matches **dissent.md** as a **stub-first** codebase: types, Zod, errors, and config are real; function bodies throw `Not implemented` with TODO hints. **`npm run build`** and **`npm run lint`** succeed; **`npm run dev`** exits with “Not implemented” until you implement `src/index.ts` and dependencies. **`npm test`** fails on purpose until you replace test stubs (see dissent.md Section 19).

Repo hygiene beyond the spec: [`.gitignore`](.gitignore), [`vitest.config.ts`](vitest.config.ts), and [`eslint.config.mjs`](eslint.config.mjs) (ESLint 9 flat config) plus dev deps `@eslint/js` and `typescript-eslint` so `npm run lint` works.

---

## Requirements

- **Node.js** 20 or newer  
- **npm**  
- API keys: **Anthropic** and **OpenAI** (see environment variables below)

---

## Quick start

Implement bodies in the order given in **Section 20** of [dissent.md](dissent.md), then:

```bash
npm install
cp .env.example .env   # fill in real keys
npm run build
npm run dev              # runs src/index.ts via tsx (stdio MCP server)
```

For a production-style binary, run `npm run build` and point your MCP host at `dist/index.js` (see [Claude Desktop](#claude-desktop)).

---

## Environment variables

| Variable | Required | Description |
| -------- | -------- | ------------- |
| `ANTHROPIC_API_KEY` | Yes | Anthropic API key |
| `OPENAI_API_KEY` | Yes | OpenAI API key |
| `DISSENT_ANTHROPIC_MODEL` | No | Default: `claude-sonnet-4-20250514` |
| `DISSENT_OPENAI_MODEL` | No | Default: `gpt-4o` |
| `DISSENT_MAX_ROUNDS` | No | Upper bound for env-configured max rounds (clamped 1–4); default `4` |

The MCP host (e.g. Claude Desktop, Cursor) typically injects these via `env`; you do not need `dotenv` in the server for normal use.

---

## MCP tools

| Tool | Purpose |
| ---- | ------- |
| `debate` | Run a multi-round debate (adversarial or collaborative), then structured synthesis |
| `critique` | Critique a statement and return a revised version (JSON-shaped output) |

Exact arguments and result shapes are defined in [dissent.md](dissent.md) (Zod schemas and domain types).

---

## Scripts

| Command | Description |
| ------- | ----------- |
| `npm run build` | Bundle with `tsup` to `dist/` |
| `npm run dev` | Run `tsx src/index.ts` for local development |
| `npm run lint` | ESLint on `src/` |
| `npm run test` | Vitest once |
| `npm run test:watch` | Vitest watch mode |

---

## Claude Desktop

Add a server entry that runs Node against the built `dist/index.js` and passes `ANTHROPIC_API_KEY` and `OPENAI_API_KEY` in `env`. Copy the JSON snippet from **Section 18 (Claude Desktop config)** in [dissent.md](dissent.md) and replace the path with your absolute path to `dist/index.js`.

---

## License

See [LICENSE](LICENSE).
