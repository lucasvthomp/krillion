// Removes answers from a bank, for instance an addition later found to duplicate an existing answer
// or vetoed from ARGUABLE-ANSWERS.md. Delete it from the additions file as well, or the apply
// script adds it back.
// Usage: node scripts/remove-answers.mjs <prompt id> "<answer name>" ["<answer name>" ...]
import { readFile, writeFile } from 'node:fs/promises';
import { gunzipSync, gzipSync } from 'node:zlib';
import { exactKey } from '../docs/answers.mjs';

const [id, ...names] = process.argv.slice(2);
if (!/^\d{4}$/u.test(id) || !names.length) throw new Error('Usage: remove-answers.mjs <prompt id> "<answer>" ...');
const bank = new URL('../docs/bank/', import.meta.url);
const indexUrl = new URL('index.json', bank);
const index = JSON.parse(await readFile(indexUrl, 'utf8'));
const doomed = new Set(names.map(exactKey));
for (const prompt of index.prompts.filter((prompt) => prompt.id === id)) {
  const file = new URL(`${prompt.id}.bank`, bank);
  const records = JSON.parse(gunzipSync(await readFile(file)));
  const kept = records.filter((record) => !doomed.has(exactKey(record[0])));
  console.log(`${prompt.id}: removed ${records.length - kept.length} of ${names.length}.`);
  prompt.count = kept.length;
  await writeFile(file, gzipSync(JSON.stringify(kept)));
}
index.answerCount = index.prompts.reduce((total, { count }) => total + count, 0);
await writeFile(indexUrl, JSON.stringify(index));
