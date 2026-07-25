// Margin MCP server: exposes the local knowledge store (documents, margin
// notes, review answers) to coding agents over stdio (JSON-RPC 2.0,
// newline-delimited). Agents get the reader's distilled knowledge as context
// for reviewing specs, plans, and long-form documents.
//
// Register with an agent, e.g. Claude Code:
//   claude mcp add margin -- node /path/to/margin/server/mcp.mjs
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import {fileURLToPath} from 'node:url';

const dataDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'data');
const read = (name, fallback) => {
  try { return JSON.parse(fs.readFileSync(path.join(dataDir, name), 'utf8')); } catch { return fallback; }
};
const readDocs = () => read('documents.json', []);
const readNotes = () => read('notes.json', {});
const readReview = () => read('review.json', {});
const readMaps = () => read('maps.json', {});

const PROTOCOL_VERSION = '2025-06-18';

const TOOLS = [
  {
    name: 'list_documents',
    description: 'List every document the reader has loaded into Margin, with word and note counts.',
    inputSchema: {type: 'object', properties: {}, additionalProperties: false},
  },
  {
    name: 'get_document',
    description: 'Get the full markdown of a document by title (spec, plan, ADR, or any long-form doc).',
    inputSchema: {
      type: 'object',
      properties: {title: {type: 'string', description: 'Exact document title from list_documents.'}},
      required: ['title'],
      additionalProperties: false,
    },
  },
  {
    name: 'search_notes',
    description: "Search the reader's margin notes and review answers across all documents — the distilled knowledge, decisions, and open questions.",
    inputSchema: {
      type: 'object',
      properties: {query: {type: 'string', description: 'Case-insensitive substring to search for.'}},
      required: ['query'],
      additionalProperties: false,
    },
  },
  {
    name: 'get_note',
    description: 'Get one margin note by document title and note id.',
    inputSchema: {
      type: 'object',
      properties: {
        title: {type: 'string'},
        noteId: {type: 'string'},
      },
      required: ['title', 'noteId'],
      additionalProperties: false,
    },
  },
];

const text = value => ({content: [{type: 'text', text: typeof value === 'string' ? value : JSON.stringify(value, null, 1)}]});

function callTool(name, args = {}) {
  if (name === 'list_documents') {
    const notes = readNotes();
    return text(readDocs().map(({title, addedAt, words}) => ({
      title, addedAt, words,
      notes: (notes[title] ?? []).length,
      uri: `margin://document/${encodeURIComponent(title)}`,
    })));
  }
  if (name === 'get_document') {
    const doc = readDocs().find(d => d.title === args.title);
    if (!doc) return {...text(`No document titled "${args.title}".`), isError: true};
    return text(doc.md);
  }
  if (name === 'search_notes') {
    const q = String(args.query ?? '').toLowerCase();
    if (!q) return {...text('Provide a query.'), isError: true};
    const hits = [];
    for (const [title, notes] of Object.entries(readNotes())) {
      for (const n of notes) if (n.text.toLowerCase().includes(q)) hits.push({title, kind: 'note', ...n});
    }
    for (const [title, answers] of Object.entries(readReview())) {
      answers.forEach((a, i) => { if (typeof a === 'string' && a.toLowerCase().includes(q)) hits.push({title, kind: 'review-answer', question: i + 1, text: a}); });
    }
    return text(hits.length ? hits : `No notes or review answers matching "${args.query}".`);
  }
  if (name === 'get_note') {
    const note = (readNotes()[args.title] ?? []).find(n => n.id === args.noteId);
    if (!note) return {...text(`No note "${args.noteId}" in "${args.title}".`), isError: true};
    return text(note);
  }
  return {...text(`Unknown tool "${name}".`), isError: true};
}

function listResources() {
  const resources = [{uri: 'margin://documents', name: 'All documents', mimeType: 'application/json', description: 'Library of documents loaded into Margin.'}];
  for (const {title} of readDocs()) {
    const t = encodeURIComponent(title);
    resources.push(
      {uri: `margin://document/${t}`, name: `Document: ${title}`, mimeType: 'text/markdown'},
      {uri: `margin://notes/${t}`, name: `Margin notes: ${title}`, mimeType: 'application/json'},
      {uri: `margin://review/${t}`, name: `Review answers: ${title}`, mimeType: 'application/json'},
      {uri: `margin://map/${t}`, name: `Argument map: ${title}`, mimeType: 'application/json'},
    );
  }
  return {resources};
}

function readResource(uri) {
  const notes = readNotes();
  if (uri === 'margin://documents') {
    return {contents: [{uri, mimeType: 'application/json', text: JSON.stringify(readDocs().map(({title, addedAt, words}) => ({title, addedAt, words, notes: (notes[title] ?? []).length})), null, 1)}]};
  }
  const m = uri.match(/^margin:\/\/(document|notes|review|map)\/(.+)$/);
  if (!m) throw Object.assign(new Error(`Unknown resource ${uri}`), {code: -32602});
  const title = decodeURIComponent(m[2]);
  if (m[1] === 'document') {
    const doc = readDocs().find(d => d.title === title);
    if (!doc) throw Object.assign(new Error(`No document titled "${title}".`), {code: -32602});
    return {contents: [{uri, mimeType: 'text/markdown', text: doc.md}]};
  }
  if (m[1] === 'notes') return {contents: [{uri, mimeType: 'application/json', text: JSON.stringify(notes[title] ?? [], null, 1)}]};
  if (m[1] === 'map') return {contents: [{uri, mimeType: 'application/json', text: JSON.stringify(readMaps()[title] ?? null, null, 1)}]};
  return {contents: [{uri, mimeType: 'application/json', text: JSON.stringify(readReview()[title] ?? [], null, 1)}]};
}

function handle(msg) {
  const {id, method, params} = msg;
  try {
    if (method === 'initialize') {
      return {id, result: {protocolVersion: params?.protocolVersion ?? PROTOCOL_VERSION, capabilities: {resources: {}, tools: {}}, serverInfo: {name: 'margin', version: '0.1.0'}}};
    }
    if (method === 'ping') return {id, result: {}};
    if (method === 'tools/list') return {id, result: {tools: TOOLS}};
    if (method === 'tools/call') return {id, result: callTool(params?.name, params?.arguments)};
    if (method === 'resources/list') return {id, result: listResources()};
    if (method === 'resources/read') return {id, result: readResource(params?.uri)};
    return {id, error: {code: -32601, message: `Method not found: ${method}`}};
  } catch (e) {
    return {id, error: {code: e.code ?? -32603, message: e.message}};
  }
}

const rl = readline.createInterface({input: process.stdin});
rl.on('line', line => {
  if (!line.trim()) return;
  let msg;
  try { msg = JSON.parse(line); } catch { return; }
  if (msg.id === undefined || msg.id === null) return; // notification — no response
  const res = handle(msg);
  process.stdout.write(JSON.stringify({jsonrpc: '2.0', ...res}) + '\n');
});
console.error('margin-mcp ready (stdio)');
