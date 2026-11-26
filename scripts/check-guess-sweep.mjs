// Reports the sweep guesses that the game rejects, prompt by prompt.
// Usage: node scripts/check-guess-sweep.mjs [first id] [last id]
import { readFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { buildLookup } from '../docs/answers.mjs';
import { readGuesses } from './guess-sweep.mjs';

const bank = new URL('../docs/bank/', import.meta.url);
const { prompts } = JSON.parse(await readFile(new URL('index.json', bank), 'utf8'));
const [first = '0000', last = '9999'] = process.argv.slice(2);
const guesses = await readGuesses();
let tested = 0;
let rejected = 0;
for (const prompt of prompts) {
  const list = guesses.get(prompt.id);
  if (!list || prompt.id < first || prompt.id > last) continue;
  const lookup = buildLookup(JSON.parse(gunzipSync(await readFile(new URL(`${prompt.id}.bank`, bank)))), prompt.prompt, prompt);
  const misses = [];
  for (const guess of list) {
    tested += 1;
    if (lookup.match(guess)) continue;
    const { choices, crowded } = lookup.suggest(guess);
    if (choices.length) continue;
    rejected += 1;
    misses.push(crowded ? `${guess} (too many)` : guess);
  }
  if (misses.length) console.log(`${prompt.id} ${prompt.prompt}\n  ✗ ${misses.join(' | ')}`);
}
console.log(`${tested} guesses tested, ${rejected} rejected.`);
