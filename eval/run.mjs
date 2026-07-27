// Eval: parse every markdown fixture and assert the reading-model structure.
// Run: npm run eval
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseMarkdown} from '../src/data/markdown.ts';
import {daysLeft,FEE,monthKey,RULES,settlePreview,WAIVER} from '../src/coins.ts';
import {parseSuggestions} from '../src/links.ts';
import {parseArgumentMap} from '../src/argmap.ts';

const fixturesDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');
const fixtures = fs.readdirSync(fixturesDir).filter(f => f.endsWith('.md'));

let failures = 0;
const check = (name, ok, detail = '') => {
  if (!ok) failures++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

for (const file of fixtures) {
  const md = fs.readFileSync(path.join(fixturesDir, file), 'utf8');
  console.log(`\n${file}`);
  let doc;
  try {
    doc = parseMarkdown(md, file.replace(/\.md$/, ''));
  } catch (e) {
    check('parses without throwing', false, e.message);
    continue;
  }
  check('has a non-empty title', typeof doc.title === 'string' && doc.title.length > 0, JSON.stringify(doc.title));
  check('has at least one section', doc.sections.length >= 1, `${doc.sections.length} sections`);
  const ids = doc.sections.map(s => s.id);
  check('section ids are unique', new Set(ids).size === ids.length, ids.join(', '));
  check('numbers are zero-padded and sequential', doc.sections.every((s, i) => s.number === String(i + 1).padStart(2, '0')));
  check('every section has a kind and minutes >= 1', doc.sections.every(s => s.kind && s.minutes >= 1));
  check('every section has a priming question', doc.sections.every(s => s.question.length > 10));
  check('html is non-empty', doc.html.length > 50);
  const hasH2 = /^##\s/m.test(md);
  if (hasH2) check('every section id is anchored in the html', doc.sections.every(s => doc.html.includes(`id="${s.id}"`)));
  check('no script/style/iframe survives sanitisation', !/<(script|style|iframe)/i.test(doc.html));
  check('review has 1–3 questions drawn from sections', doc.review.length >= 1 && doc.review.length <= 3 && doc.review.every(q => doc.sections.some(s => s.question === q)));
  check('mission is defined', typeof doc.mission === 'string' && doc.mission.length > 0);
  const expectedTitle = md.match(/^#\s+(.+)$/m)?.[1].trim();
  if (expectedTitle) check('title comes from the h1', doc.title === expectedTitle, `"${doc.title}" vs "${expectedTitle}"`);
}

console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`} across ${fixtures.length} fixtures`);

// Coin economy (pure functions only — no localStorage in Node).
console.log('\ncoin economy');
check('waiver threshold is 100', WAIVER === 100);
check('fee is $10', FEE === 10);
check('monthKey is YYYY-MM', /^\d{4}-\d{2}$/.test(monthKey()));
check('99 coins → charged, not waived', (() => { const s = settlePreview(99); return !s.waived && s.charged === 10; })());
check('100 coins → waived, no charge', (() => { const s = settlePreview(100); return s.waived && s.charged === 0; })());
check('150 coins → waived, no charge', (() => { const s = settlePreview(150); return s.waived && s.charged === 0; })());
check('daysLeft is 0..30', (() => { const d = daysLeft(); return d >= 0 && d <= 30; })());
check('a full engaged read roughly covers the waiver', RULES.section * 5 + RULES.note * 2 + RULES.ask * 2 + RULES.review * 3 + RULES.listen >= 100);

// Link suggestions (pure parsing/matching — never link to invented notes).
console.log('\nlink suggestions');
const candidates = [
  {title: 'RFC-014', id: 'a1', text: 'NATS is the best organisational fit.'},
  {title: 'ADR-009', id: 'b2', text: 'Dual-write for one billing cycle, then cut over reads.'},
];
check('parses a valid suggestion array', (() => {
  const s = parseSuggestions('Here are links: [{"title":"ADR-009","noteId":"b2","reason":"both about staged rollouts"}]', candidates);
  return s.length === 1 && s[0].noteId === 'b2' && s[0].reason.includes('staged');
})());
check('rejects suggestions for notes that do not exist', parseSuggestions('[{"title":"ADR-009","noteId":"zzz","reason":"invented"}]', candidates).length === 0);
check('returns [] on non-JSON replies', parseSuggestions('no json here', candidates).length === 0);
check('caps at 2 suggestions', (() => {
  const raw = JSON.stringify([
    {title: 'RFC-014', noteId: 'a1', reason: 'x'},
    {title: 'ADR-009', noteId: 'b2', reason: 'y'},
    {title: 'RFC-014', noteId: 'a1', reason: 'z'},
  ]);
  return parseSuggestions(raw, candidates).length === 2;
})());

// Argument maps (tolerant JSON extraction from LLM replies).
console.log('\nargument maps');
check('parses a clean map', (() => {
  const m = parseArgumentMap('{"decision":"Adopt NATS","reasons":["operable by small team"],"alternatives":["Kafka"],"tradeoffs":["narrower ecosystem"]}');
  return m?.decision === 'Adopt NATS' && m.reasons.length === 1 && m.alternatives[0] === 'Kafka' && m.tradeoffs.length === 1;
})());
check('extracts JSON wrapped in prose', (() => {
  const m = parseArgumentMap('Sure! Here is the map:\n{"decision":"Move to Postgres","reasons":["ACID","team familiarity"],"alternatives":[],"tradeoffs":["migration window"]}\nHope that helps.');
  return m?.decision === 'Move to Postgres' && m?.reasons.length === 2;
})());
check('caps arrays at 4 items', (() => {
  const m = parseArgumentMap(JSON.stringify({decision: 'x', reasons: ['1', '2', '3', '4', '5'], alternatives: [], tradeoffs: []}));
  return m?.reasons.length === 4;
})());
check('returns null on garbage', parseArgumentMap('no json at all') === null);
check('returns null when decision and reasons are empty', parseArgumentMap('{"decision":"","reasons":[],"alternatives":[],"tradeoffs":[]}') === null);

// Agent skill (skills/margin/SKILL.md is installable via npx skills add).
console.log('\nagent skill');
{
  const skillPath = path.resolve(fixturesDir, '..', '..', 'skills', 'margin', 'SKILL.md');
  const skill = fs.readFileSync(skillPath, 'utf8');
  check('SKILL.md exists', fs.existsSync(skillPath));
  check('frontmatter names the skill', /^name:\s*margin\s*$/m.test(skill));
  check('frontmatter has a real description', (skill.match(/^description:\s*(.+)$/m)?.[1] ?? '').length > 80);
  check('documents the review trigger endpoint', skill.includes('PUT http://127.0.0.1:8787/api/document'));
  check('documents the MCP tools', ['list_documents', 'get_document', 'search_notes', 'get_note'].every(t => skill.includes(t)));
}

// Store round-trip through a live proxy (what agents use to push documents).
console.log('\nstore round-trip');
{
  const {spawn} = await import('node:child_process');
  const fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'margin-eval-home-'));
  fs.mkdirSync(path.join(fakeHome, '.agents', 'skills', 'margin'), {recursive: true});
  fs.writeFileSync(path.join(fakeHome, '.agents', 'skills', 'margin', 'SKILL.md'), '---\nname: margin\n---\n');
  const proxy = spawn('node', ['server/proxy.mjs'], {env: {...process.env, HOME: fakeHome, USERPROFILE: fakeHome, LLM_PROXY_PORT: '8797', MARGIN_DATA_DIR: fs.mkdtempSync(path.join(os.tmpdir(), 'margin-eval-'))}, stdio: 'ignore'});
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  try {
    await wait(1200);
    const base = 'http://127.0.0.1:8797';
    const putRes = await fetch(`${base}/api/document`, {method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({title: 'eval-store-doc', md: '# Eval Doc\n\n## A section\n\nBody.'})});
    check('PUT /api/document accepts a document', putRes.ok);
    const lib = await (await fetch(`${base}/api/library`)).json();
    check('library lists the pushed document', lib.documents.some(d => d.title === 'eval-store-doc'));
    const doc = await (await fetch(`${base}/api/document?title=eval-store-doc`)).json();
    check('GET /api/document returns the markdown', doc.md.includes('# Eval Doc'));
    const skill = await (await fetch(`${base}/api/skill-status`)).json();
    check('skill-status detects an installed skill', skill.installed === true && skill.locations.length === 1 && skill.locations[0].agent.includes('.agents'));
  } finally {
    proxy.kill();
    // Let the child fully exit before we do — exiting with handles mid-close
    // trips a libuv assertion (win/async.c) on Windows runners.
    await Promise.race([new Promise(r => proxy.once('exit', r)), wait(2000)]);
  }
}

console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`} (fixtures + coin economy)`);
process.exit(failures === 0 ? 0 : 1);
