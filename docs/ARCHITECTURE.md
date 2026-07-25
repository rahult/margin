# Architecture

## Runtime model

Margin is a local-first web app served by its own backend. One process is the whole product:

```
npm run build && npm start   →   http://localhost:8787
```

- **React 19 + Vite** frontend (`src/`), built to `dist/`.
- **Node local backend** (`server/proxy.mjs`): serves the built app, holds LLM credentials (`.env`), forwards chat to any OpenAI-compatible endpoint, runs the knowledge store, and serves neural TTS.
- **MCP server** (`server/mcp.mjs`): stdio JSON-RPC exposing the knowledge store to coding agents (Claude Code, Cursor, Codex…).

For development, `npm run dev` runs Vite on :1420 and proxies `/api` to the backend on :8787.

## Local services

- **LLM proxy** — `/api/chat` injects model + key server-side; `/api/config` writes `.env` from onboarding. The key never reaches the frontend bundle.
- **Knowledge store** — JSON files in `server/data/` (gitignored): documents, margin notes, review answers, argument maps. Shared by the app (via `/api/library` et al.) and the MCP server (via the filesystem).
- **TTS** — Kokoro-82M via kokoro-js/ONNX (`/api/tts`), model cached locally after first download; frontend plays sentence-chunked audio with one-chunk prefetch (`src/tts.ts`).

## Frontend structure

- `src/App.tsx` — reading workspace: reading map, document surface, companion rail, review mode, coins wiring.
- `src/data/markdown.ts` — Markdown → reading model (sections, anchors, kinds, priming questions) + sanitiser.
- `src/coins.ts` / `src/Wallet.tsx` — coin economy and its animations.
- `src/links.ts` / `src/argmap.ts` — tolerant parsers for companion output (cross-doc link suggestions, argument maps).
- `src/Onboarding.tsx` — first-run key/model setup against the proxy.

## Verification

`npm run eval` — 90 checks over fixture documents: parser structure, coin math, link/argument-map parsers, and a scripted MCP client (`eval/mcp-client.mjs`).

## Deliberate constraints (alpha)

- No accounts, cloud sync, or tracking; credentials stay in `.env`.
- Desktop packaging (Tauri 2 in `src-tauri/`) is deferred; sidecar bundling of the Node backend is the open question there.
- No hosted dependencies beyond the user's own LLM endpoint.
