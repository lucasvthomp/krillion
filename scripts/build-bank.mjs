import { createReadStream } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createInterface } from 'node:readline';
import { createGunzip, gzipSync } from 'node:zlib';

const source = process.argv[2];
if (!source) {
  console.error('Usage: node scripts/build-bank.mjs <krillion-answers.jsonl.gz>');
  process.exit(1);
}

const bank = new URL('../docs/bank/', import.meta.url);
const input = createReadStream(resolve(source)).pipe(createGunzip());
const prompts = new Map();
let answerCount = 0;

for await (const line of createInterface({ input, crlfDelay: Infinity })) {
  if (!line.trim()) continue;
  const row = JSON.parse(line);
  const key = JSON.stringify([row.mode, row.game_id, row.round]);
  if (typeof row.prompt !== 'string' || !row.prompt.trim() ||
      typeof row.answer !== 'string' || !Number.isInteger(row.score) ||
      row.score < 0 || row.score > 100 || typeof row.tier !== 'string') {
    throw new Error(`Invalid answer at row ${answerCount + 1}`);
  }
  if (!prompts.has(key)) {
    prompts.set(key, {
      id: String(prompts.size + 1).padStart(4, '0'),
      prompt: row.prompt,
      category: row.category,
      answers: [],
    });
  }
  const entry = prompts.get(key);
  if (entry.prompt !== row.prompt) throw new Error(`Inconsistent prompt for ${key}`);
  entry.answers.push([row.answer, row.score, row.tier]);
  answerCount += 1;
}

if (!answerCount) throw new Error('The source contains no answers.');
await mkdir(bank, { recursive: true });
const index = [];
for (const { id, prompt, category, answers } of prompts.values()) {
  await writeFile(new URL(`${id}.bank`, bank), gzipSync(JSON.stringify(answers)));
  index.push({ id, prompt, category, count: answers.length });
}
await writeFile(new URL('index.json', bank), JSON.stringify({ answerCount, prompts: index }));
console.log(`Packaged ${answerCount.toLocaleString()} answers across ${index.length} prompt entries.`);
