---
name: margin
description: Push specs, plans, ADRs, or any long-form markdown into Margin (the local active-reading app) so the user can review it with guided reading, and read back the reader's distilled notes, review answers, and argument maps. Use when the user asks to review a document in Margin, or when you need the reader's distilled understanding of a document as context.
---

# Margin

Margin is a local-first active-reading app for documents people cannot afford to skim (RFCs, ADRs, specs, plans). It runs entirely on the user's machine: a local backend at `http://127.0.0.1:8787` plus a knowledge store the reader builds while reading.

## Prerequisites

Margin must be running. The user starts it with `npm start` (web at :8787) or by launching the desktop app. Check with:

```bash
curl -s http://127.0.0.1:8787/api/status
```

If it does not answer, tell the user to start Margin — do not try to install or start it yourself.

## Trigger a document review

Push any markdown file into Margin's library. It becomes the most recent document and opens automatically the next time the user launches Margin:

```bash
curl -X PUT http://127.0.0.1:8787/api/document \
  -H 'Content-Type: application/json' \
  -d "$(jq -n --arg title "My Spec" --rawfile md path/to/file.md '{title: $title, md: $md}')"
```

- `title`: human-readable title (use the document's own H1 or the filename without extension).
- `md`: the full markdown content.
- After pushing, tell the user the document is waiting in Margin — they get a reading map, per-section priming questions, a thinking companion, and a comprehension review.

Check the library at any time:

```bash
curl -s http://127.0.0.1:8787/api/library
```

## Read the reader's distilled knowledge

If the Margin MCP server is registered (`claude mcp add margin -- node <repo>/server/mcp.mjs`), prefer it for reading knowledge:

- `list_documents` — everything in the reader's library, with note counts.
- `get_document` — full markdown of one document by title.
- `search_notes` — search the reader's margin notes AND review answers across all documents (decisions, open questions, caveats in the reader's own words).
- `get_note` — one note by document title and note id.

Resources are also available per document: `margin://document/<title>`, `margin://notes/<title>`, `margin://review/<title>`, `margin://map/<title>` (the editable argument map: decision, reasons, rejected alternatives, trade-offs).

Typical flow: the user asks you to implement or review something touching a spec — call `get_document` for the spec and `search_notes` for the reader's take on it, so you work with their understanding, not just the raw text.

## Rules

- Only ever talk to Margin over `http://127.0.0.1:8787` or MCP stdio — never send the user's documents or notes to any other service.
- Do not modify or delete the reader's documents, notes, or maps; the knowledge store is append-through-the-app, read-through-the-agent.
