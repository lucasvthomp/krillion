// Applies review decisions on guess-sweep answers (see ARGUABLE-ANSWERS.md).
// Usage: node scripts/veto-answers.mjs decisions.json
// decisions.json is a list of { "prompt": "<prompt wording>", "name": "<answer>", "points": <n> },
// where points 0 removes the answer and any other value rescores it.
// A removal drops the answer from the guess additions and from every bank with that wording,
// but never deletes a record that the bank had before the guess sweep began.
import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { gunzipSync, gzipSync } from 'node:zlib';
import { exactKey } from '../docs/answers.mjs';

const baseline = 'ba959b7^';
const tiers = new Map([[10, 'plankton'], [15, 'tooclever'], [30, 'schooler'], [60, 'rare'], [85, 'deepcut'], [100, 'krillion']]);
const decisions = JSON.parse(await readFile(process.argv[2], 'utf8'));
const bank = new URL('../docs/bank/', import.meta.url);
const indexUrl = new URL('index.json', bank);
const index = JSON.parse(await readFile(indexUrl, 'utf8'));
const additionsUrl = new URL('answer-guess-additions.txt', import.meta.url);

const byWording = new Map();
for (const { prompt, name, points } of decisions) {
  if (points !== 0 && !tiers.has(points)) throw new Error(`Bad points for ${name}: ${points}`);
  const ids = index.prompts.filter((entry) => entry.prompt === prompt).map((entry) => entry.id);
  if (!ids.length) throw new Error(`No prompt worded: ${prompt}`);
  for (const id of ids) (byWording.get(id) ?? byWording.set(id, new Map()).get(id)).set(exactKey(name), points);
}

// The additions file: drop removed items, rewrite the points of rescored ones.
const itemName = (item) => item.split(/[=@!]/u)[0];
const lines = (await readFile(additionsUrl, 'utf8')).split('\n').map((line) => {
  const [id, ...items] = line.split('|');
  const wanted = byWording.get(id);
  if (!wanted || !items.length) return line;
  const kept = items.flatMap((item) => {
    const points = wanted.get(exactKey(itemName(item)));
    if (points === undefined) return [item];
    if (points === 0) return [];
    const [head, reason] = item.split('!');
    const parts = head.replace(/@\d+/u, '').split('=');
    return [`${parts[0]}@${points}${parts.length > 1 ? '=' + parts.slice(1).join('=') : ''}${reason !== undefined ? '!' + reason : ''}`];
  });
  return kept.length ? [id, ...kept].join('|') : '';
}).filter((line, i, all) => line !== '' || i === all.length - 1);
await writeFile(additionsUrl, lines.join('\n'));

// The banks.
let removed = 0, rescored = 0, protectedCount = 0;
for (const [id, wanted] of byWording) {
  const file = new URL(`${id}.bank`, bank);
  const records = JSON.parse(gunzipSync(await readFile(file)));
  let original = new Set();
  try {
    const old = execFileSync('git', ['show', `${baseline}:docs/bank/${id}.bank`], { maxBuffer: 1 << 30 });
    original = new Set(JSON.parse(gunzipSync(old)).map((record) => exactKey(record[0])));
  } catch { /* bank did not exist before the sweep */ }
  const kept = records.filter((record) => {
    const points = wanted.get(exactKey(record[0]));
    if (points === undefined) return true;
    if (points === 0) {
      if (original.has(exactKey(record[0]))) { protectedCount++; return true; }
      removed++;
      return false;
    }
    record[1] = points;
    record[2] = tiers.get(points);
    rescored++;
    return true;
  });
  index.prompts.find((entry) => entry.id === id).count = kept.length;
  await writeFile(file, gzipSync(JSON.stringify(kept)));
}
index.answerCount = index.prompts.reduce((total, { count }) => total + count, 0);
await writeFile(indexUrl, JSON.stringify(index));
console.log(`Removed ${removed}, rescored ${rescored}, kept ${protectedCount} that predate the sweep.`);
