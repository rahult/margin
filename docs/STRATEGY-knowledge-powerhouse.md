# Margin — from active reader to knowledge powerhouse

_Strategy research, July 2026. Sources cited inline; full link list at the end._

## The gap Margin already sits in

The 2025–2026 landscape splits cleanly in two, and nobody owns the intersection:

- **Strong AI, cloud-only:** NotebookLM, Tana, Mem, Notion AI, Heptabase (sync). Your documents leave your machine.
- **Local-first, weak AI:** Obsidian (plugin assembly required), Logseq (stalled DB rewrite), Anytype (no AI at all).

Within that, four specific gaps matter for engineers:

1. **Nobody owns active reading of technical documents.** Readwise is passive capture + resurfacing; NotebookLM is ask-a-question; Zotero is academic papers. Guided engagement with RFC/ADR/spec-shaped material — priming, retrieval, verified comprehension — has no direct competitor. Margin's loop is genuinely novel.
2. **The distill → synthesize pipeline is split across 2–3 tools.** Readwise → Obsidian → Heptabase is the power-user stack; every handoff leaks context (highlights lose source anchors, chats aren't exportable).
3. **Zero integration with code and coding agents.** Knowledge tools don't know what a codebase is; coding agents ingest docs as ephemeral context. Developers are hand-rolling the bridge (Claude Code pointed at Obsidian vaults, MCP servers) — clear unmet demand.
4. **Comprehension is assumed, never verified.** Spaced repetition exists for highlights (Readwise), not for understanding of a specific document. Nobody closes "you read the spec — prove it."

**Positioning conclusion:** deepen the wedge (local-first + BYOK + active reading + agent-connected), do not broaden into generic PKM. Do not rebuild Obsidian or Heptabase.

## What the evidence says works

Learning science gives Margin a defensible spine — and it matches what Margin already does:

- **Practice testing and distributed practice are the only two "high-utility" techniques** (Dunlosky et al. 2013; Cepeda et al. 2006, 254-study meta-analysis). Highlighting and rereading are low-utility. → Margin's priming questions and review are the moat; summaries are not.
- **Retrieval beats elaboration for retention** (Karpicke & Blunt, Science 2011 — retrieval practice beat concept mapping). → Review must be retrieval-first: answer before reveal.
- **Argument mapping has the best critical-thinking effect size in the literature** (~0.8 SD, van Gelder et al. 2004), and ADR structure (decision → alternatives → trade-offs) is already machine-extractable. → The highest-leverage "firming ideas" feature for Margin's exact document types.
- **Elaborative interrogation** ("why is this true? what breaks if assumption Z fails?") is moderate-utility and something an LLM companion uniquely scales. → This is the thinking companion's real job.
- **Caveat for AI features generally:** AI summaries alone produce no retention benefit; auto-generated context files can *reduce* coding-agent success when bloated (ETH 2026). Curated, distilled, human-confirmed artifacts beat bulk dumps everywhere.

Practitioner methods (progressive summarization, Zettelkasten, synthesis workflows) have plausible mechanisms but no controlled evidence — ship them as workflow affordances, not promised learning gains.

## The five pillars

### 1. Comprehension engine (defend and deepen — the identity)

- **Retrieval-first review:** answer before reveal; score recall, not just completion.
- **Spaced, per-section review items** (FSRS scheduling), generated from the reader's own notes and highlights — not whole-document quizzes. The reading map becomes an incremental-reading queue: unfinished sections resurface over days.
- **Elaborative companion:** the ask box shifts from answering questions to asking "why/how" follow-ups grounded in the current section.

### 2. Distillation pipeline (progressive summarization, span-anchored)

- Layered compression per section: highlight → bold → one-line gist, each layer anchored to its source span so it can always expand back. **LLM proposes, human disposes** — the value is in the choosing.
- Answers from the companion cite passages (NotebookLM's one idea worth stealing): every companion response links to the section/spans it grounds in.
- Chats are work product: a Q&A thread with a spec feeds ADRs and design decisions — make threads exportable to Markdown, not disposable.

### 3. Argument mapping (the "firm ideas" differentiator)

- For ADR/RFC-shaped docs, the LLM extracts a draft map — decision, reasons, rejected alternatives, trade-offs, open risks — and the reader edits it. Editing the map *is* the firming.
- This generalizes Margin's existing "reasoning lens" (claim/evidence/risk) from static sample text into a per-document, reader-editable artifact.
- Pair with retrieval review (mapping alone doesn't maximize retention).

### 4. Knowledge layer (notes as linkable, reusable objects)

- Margin notes become **atomic cards**: one idea each, anchored to a source span, linkable across documents. Fleeting → permanent promotion pipeline; the LLM *suggests* links ("this RFC section contradicts that ADR"), the human confirms.
- Local RAG over the corpus: embeddings + sqlite-vec/LanceDB, all on-device; light entity extraction (decisions, protocols, people, code symbols) for multi-hop queries later — not a graph DB on day one.
- Semantic clustering to surface themes across documents (BERTopic-style) once the corpus justifies it.

### 5. Agent bridge (the open lane nobody ships)

The industry has standardized on **MCP as the read/write socket** between knowledge stores and coding agents, and on **tree-sitter + hybrid retrieval** for code ingestion. Both are weeks of work, not months, and both reinforce local-first.

- **Outbound (agents read Margin):** ship a local MCP server (stdio sidecar, or localhost Streamable HTTP from the Tauri core). Expose digests, notes, review answers as MCP *resources* + 2–3 tools (`search_notes`, `get_note`, `list_documents`). One surface covers Claude Code, Cursor, Codex, Zed, VS Code Copilot. Optionally emit a curated `AGENTS.md` section pointing at the server — curated only; bulk auto-context measurably hurts agents.
- **Inbound (Margin reads code):** tree-sitter → per-symbol chunks → SQLite FTS (BM25) + symbol graph; Merkle-hash files for incremental re-index; add local ONNX embeddings (bge-small/jina-code) as a second signal later. Skip SCIP/LSIF (too heavy) and A2A/AG-UI/Synadia (multi-agent orchestration, not "agent reads my notes").
- **Docs↔code links:** a note anchor can carry a structured code reference (`path#symbol@commit`), re-validated on re-index, with "stale note" flags — the Swimm pattern, local and note-centric. ADR ingestion (plain markdown with status/superseded fields) is nearly free with the existing pipeline.
- **Capstone — synthesis mode:** select linked notes across docs → LLM proposes an outline with span citations → the reader drafts a brief/ADR/design doc, and hands it to a coding agent via the bridge. Distill → firm → ship, in one place.

## Phasing

1. **Now → next:** retrieval-first review + FSRS spacing; companion answers with span citations; argument-map extraction for ADR/RFC docs (upgrade of the reasoning lens).
2. **Then:** notes as atomic cards + suggested cross-doc links; local embeddings + hybrid search over the corpus; distillation layers (highlight → gist).
3. **Then:** MCP server (outbound bridge); ADR/repo ingestion with tree-sitter chunking; docs↔code anchors with staleness flags.
4. **Later:** synthesis mode (outline → draft → agent handoff); semantic clustering; multi-agent protocols only if Margin ever orchestrates agents.

## Explicit non-goals

- No generic PKM/vault features (folders, backlinks browser, plugin API) — compose with Obsidian et al. via plain Markdown export instead.
- No cloud sync in the local reader; sync is a paid/team concern per the product brief's commercial direction.
- No bulk auto-generated agent context (AGENTS.md dumps) — it measurably reduces agent success.
- No full knowledge-graph database; incremental entity extraction only.

## Selected sources

- Landscape: [Readwise Reader](https://readwise.io/read), [NotebookLM limitations](https://www.atlasworkspace.ai/blog/notebooklm-limitations), [Smart Connections](https://smartconnections.app/smart-connections/), [Agent Client for Obsidian](https://forum.obsidian.md/t/new-plugin-agent-client-bring-claude-code-codex-gemini-cli-inside-obsidian/108448), [Heptabase](https://www.producthunt.com/products/heptabase/reviews), [Khoj](https://blog.iaieye.com/posts/obsidian-evolved/khoj-deep-dive/), [Logseq alternatives 2026](https://dessence.ai/blog/logseq-alternatives-after-stalled-development-2026)
- Agent bridge: [MCP architecture](https://customgpt.ai/the-model-context-protocol-mcp-architecture/), [agent-docs-mcp](https://github.com/jbouder/agent-docs-mcp), [Nexus-MCP](https://github.com/jaggernaut007/Nexus-MCP), [Claude Code extensions](https://pub.towardsai.net/claude-code-extensions-explained-skills-mcp-hooks-subagents-agent-teams-plugins-9294907e84ff), [AGENTS.md vs CLAUDE.md vs llms.txt](https://moxiedocs.com/learn/agents-md-vs-claude-md-vs-llms-txt), [context-file caveat (arXiv)](https://arxiv.org/html/2602.11988v1), [structural codebase index (arXiv)](https://arxiv.org/html/2606.22417v1), [cAST chunking (arXiv)](https://arxiv.org/html/2603.27277v1), [Synthesis-OS (Tauri + ort + LanceDB)](https://github.com/GastonGelhorn/synthesis-os), [ADR org](https://github.com/architecture-decision-record/architecture-decision-record), [Swimm alternatives](https://scribehow.com/library/swimm-alternatives)
- Learning science: [Karpicke & Blunt 2011](https://pubmed.ncbi.nlm.nih.gov/21252317/), [Dunlosky et al. slides](https://publish.illinois.edu/ae3-new/files/2017/04/Slides-John-Dunlosky.pdf), [incremental learning (SuperMemo)](https://help.supermemo.org/wiki/Incremental_learning), [argument mapping meta-review (SFU thesis)](https://summit.sfu.ca/_flysystem/fedora/sfu_migrate/20254/etd20742.pdf), [progressive summarization (Forte)](https://fortelabs.com/blog/progressive-summarization-a-practical-technique-for-designing-discoverable-notes/), [Zettelkasten.de](https://zettelkasten.de/introduction/), [question generation (arXiv)](https://arxiv.org/html/2502.12477v1), [LLM KG builder (Neo4j)](https://neo4j.com/blog/developer/llm-knowledge-graph-builder-release/)
