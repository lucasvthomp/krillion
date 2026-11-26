// Writes ARGUABLE-ANSWERS.md: the answers the guess sweep accepted leniently, with the reason each
// one is arguable, so they can be reviewed and vetoed.
// Usage: node scripts/report-arguable-answers.mjs
import { readFile, writeFile } from 'node:fs/promises';
import { readGuessAdditions } from './guess-sweep.mjs';

const { prompts } = JSON.parse(await readFile(new URL('../docs/bank/index.json', import.meta.url), 'utf8'));
const wording = new Map(prompts.map(({ id, prompt }) => [id, prompt]));
const rows = [];
for (const [id, additions] of await readGuessAdditions()) {
  for (const { name, points, reason } of additions) if (reason) rows.push([id, name, points, reason]);
}
const escape = (text) => text.replaceAll('|', '\\|');
const lines = [
  '# Arguable answers',
  '',
  'The guess sweep accepts answers a reasonable player could defend, even when they are technically shaky.',
  'These are the ones it accepted leniently. To veto one, delete it from',
  '[the guess additions](scripts/answer-guess-additions.txt), rebuild the banks, then rerun',
  '`node scripts/report-arguable-answers.mjs`. A veto removes it from the next full rebuild; to drop it from the',
  'current banks straight away, remove the answer from its bank file as well.',
  '',
  `${rows.length} answers.`,
  '',
  '| Prompt | Answer | Points | Why it is arguable |',
  '| --- | --- | ---: | --- |',
  ...rows.map(([id, name, points, reason]) => `| ${escape(wording.get(id))} | ${escape(name)} | ${points} | ${escape(reason)} |`),
  '',
];
await writeFile(new URL('../ARGUABLE-ANSWERS.md', import.meta.url), lines.join('\n'));
console.log(`Listed ${rows.length} arguable answers.`);
