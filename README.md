# Margin

An active-reading environment for documents you can't afford to skim — RFCs, ADRs, specs, plans, and other long-form writing. Margin turns a dense document into a guided argument: a reading map with a question before each section, a thinking companion grounded in the text, local neural text-to-speech, and a comprehension check at the end. Everything you distill — notes, review answers, argument maps — stays on your machine and is readable by your coding agents.

**Alpha.** Expect rough edges. Feedback via GitHub issues is very welcome.

## What it does

- **Reading map** — any Markdown file becomes a sectioned map with per-section priming questions, reading-time estimates, and progress that survives restarts.
- **Thinking companion** — ask questions about the current section; answers are grounded in the document. Bring your own key: any OpenAI-compatible endpoint works (OpenAI, OpenRouter, a local server).
- **Argument maps** — for ADR/RFC-shaped documents, the companion extracts an editable map (decision, reasons, alternatives set aside, trade-offs) so you firm up the idea, not just finish the page.
- **Knowledge that connects** — margin notes are atomic cards anchored to their section. The companion suggests links to notes in your other documents; you confirm, and the graph grows.
- **Local neural TTS** — Listen narrates section by section with a human-quality voice (Kokoro-82M, runs fully on-device; first listen downloads a ~90 MB model).
- **Agent bridge (MCP)** — your documents, notes, review answers, and argument maps are exposed to coding agents over the Model Context Protocol. Claude Code, Cursor, Codex, and friends can review a spec *with your distilled knowledge attached*.
- **Coins** — reading actions earn coins; 100 in a month waives the (fictional, for now) $10 renewal. It's a game about finishing documents.

Everything is local-first: no accounts, no cloud, no tracking. Your API key lives in `.env` and is only ever used by the local proxy — it never ships to the frontend.

## Quickstart

Requires Node.js ≥ 20.11.

```bash
npm install
npm run build
npm start
```

Open **http://localhost:8787**. On first run, onboarding asks for your API key, base URL, and model — for OpenRouter use `https://openrouter.ai/api/v1` and a model like `openai/gpt-4o-mini`. The key is written to `.env` (gitignored, mode 600).

Then drop any `.md` file on **Open** in the top bar.

## Connect your coding agent

The MCP server gives agents read access to your distilled knowledge:

```bash
claude mcp add margin -- node /absolute/path/to/margin/server/mcp.mjs
```

Tools: `list_documents`, `get_document`, `search_notes`, `get_note` — plus per-document resources (markdown, notes, review answers, argument map). Keep `npm start` running while you read; the agent reads the same files the app writes.

Equivalent config for other agents: command `node`, args `["/absolute/path/to/margin/server/mcp.mjs"]`, transport stdio.

## Development

```bash
npm run dev        # vite dev server on :1420 (proxies /api to :8787)
npm run proxy      # the local backend on :8787 (LLM proxy + store + TTS + static app)
npm run mcp        # the MCP server on stdio
npm run eval       # 90 checks: parser, coins, links, argument maps, MCP client
```

Layout: `src/` React app, `server/` local services, `eval/` test fixtures + suites, `docs/` product brief, architecture, and strategy.

## Alpha caveats

- Desktop packaging (Tauri) is not part of this alpha — the app runs in the browser against the local backend.
- The coin economy's billing is simulated; no real charges exist.
- Knowledge lives in `server/data/` as plain JSON — back it up or delete it as you please.
- First TTS listen downloads the voice model; subsequent listens are instant and offline.
