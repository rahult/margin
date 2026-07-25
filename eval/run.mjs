// Eval: parse every markdown fixture and assert the reading-model structure.
// Run: npm run eval
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseMarkdown} from '../src/data/markdown.ts';

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
process.exit(failures === 0 ? 0 : 1);
