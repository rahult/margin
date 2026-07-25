// Scripted MCP client: spawns server/mcp.mjs over stdio and asserts the
// agent-facing surface (initialize, tools/list, tools/call, resources).
import {spawn} from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(root, 'server', 'data');

// Seed a document, note, and review answer for the client to find.
fs.mkdirSync(dataDir, {recursive: true});
fs.writeFileSync(path.join(dataDir, 'documents.json'), JSON.stringify([
  {title: 'mcp-eval-spec', md: '# MCP Eval Spec\n\n## Auth\n\nTokens rotate every 90 days.', addedAt: Date.now(), words: 9},
]));
fs.writeFileSync(path.join(dataDir, 'notes.json'), JSON.stringify({
  'mcp-eval-spec': [{id: 'n1', text: 'Token rotation cadence is a compliance requirement', sectionId: '01-auth', createdAt: Date.now()}],
}));
fs.writeFileSync(path.join(dataDir, 'review.json'), JSON.stringify({
  'mcp-eval-spec': ['Rotation exists so leaked tokens expire quickly'],
}));

let failures = 0;
const check = (name, ok, detail = '') => {
  if (!ok) failures++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

const server = spawn('node', [path.join(root, 'server', 'mcp.mjs')], {stdio: ['pipe', 'pipe', 'inherit']});
let buffer = '';
const pending = new Map();
let nextId = 1;
server.stdout.on('data', chunk => {
  buffer += chunk;
  let idx;
  while ((idx = buffer.indexOf('\n')) >= 0) {
    const line = buffer.slice(0, idx);
    buffer = buffer.slice(idx + 1);
    if (!line.trim()) continue;
    const msg = JSON.parse(line);
    const entry = pending.get(msg.id);
    if (entry) { pending.delete(msg.id); entry(msg); }
  }
});
const call = (method, params) => new Promise((resolve, reject) => {
  const id = nextId++;
  pending.set(id, msg => msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result));
  server.stdin.write(JSON.stringify({jsonrpc: '2.0', id, method, params}) + '\n');
});
const timeout = setTimeout(() => { console.error('  FAIL  MCP client timed out'); server.kill(); process.exit(1); }, 15_000);

console.log('\nmcp server');
try {
  const init = await call('initialize', {protocolVersion: '2025-06-18', capabilities: {}, clientInfo: {name: 'eval', version: '0'}});
  check('initialize returns serverInfo', init.serverInfo?.name === 'margin');
  check('capabilities include tools and resources', Boolean(init.capabilities?.tools && init.capabilities?.resources));

  const tools = await call('tools/list');
  const names = tools.tools.map(t => t.name);
  check('exposes the four tools', ['list_documents', 'get_document', 'search_notes', 'get_note'].every(n => names.includes(n)), names.join(', '));

  const docs = await call('tools/call', {name: 'list_documents', arguments: {}});
  check('list_documents finds the seeded doc', docs.content[0].text.includes('mcp-eval-spec'));

  const doc = await call('tools/call', {name: 'get_document', arguments: {title: 'mcp-eval-spec'}});
  check('get_document returns the markdown', doc.content[0].text.includes('Tokens rotate every 90 days'));

  const hits = await call('tools/call', {name: 'search_notes', arguments: {query: 'compliance'}});
  check('search_notes finds the note', hits.content[0].text.includes('compliance requirement'));
  const hits2 = await call('tools/call', {name: 'search_notes', arguments: {query: 'leaked tokens'}});
  check('search_notes also searches review answers', hits2.content[0].text.includes('review-answer'));

  const note = await call('tools/call', {name: 'get_note', arguments: {title: 'mcp-eval-spec', noteId: 'n1'}});
  check('get_note returns one note', note.content[0].text.includes('compliance'));

  const missing = await call('tools/call', {name: 'get_document', arguments: {title: 'nope'}});
  check('missing document returns isError', missing.isError === true);

  const resources = await call('resources/list');
  const uris = resources.resources.map(r => r.uri);
  check('resources include library + per-doc triples', uris.includes('margin://documents') && uris.includes('margin://document/mcp-eval-spec') && uris.includes('margin://notes/mcp-eval-spec') && uris.includes('margin://review/mcp-eval-spec'));

  const read = await call('resources/read', {uri: 'margin://notes/mcp-eval-spec'});
  check('resources/read returns notes JSON', read.contents[0].text.includes('compliance requirement'));
} catch (e) {
  check(`MCP exchange failed: ${e.message}`, false);
} finally {
  clearTimeout(timeout);
  server.kill();
}

for (const f of ['documents.json', 'notes.json', 'review.json']) fs.rmSync(path.join(dataDir, f), {force: true});
console.log(`\n${failures === 0 ? 'MCP CHECKS PASSED' : `${failures} MCP CHECK(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
