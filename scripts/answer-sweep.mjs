import { readFile } from 'node:fs/promises';

export async function readSweep(prompts, requireComplete = false) {
  const source = await readFile(new URL('answer-sweep.txt', import.meta.url), 'utf8');
  const byId = new Map();
  const byWording = new Map();
  for (const line of source.split(/\r?\n/u)) {
    if (!line || line.startsWith('#')) continue;
    const [id, wording, ...answers] = line.split('|');
    if (!/^\d{4,}$/u.test(id) || byId.has(id) || !wording || answers.length < 3) {
      throw new Error(`Invalid review entry for prompt ${id}`);
    }
    const checks = answers.map((answer) => {
      const [forms, score = '30'] = answer.split('@');
      const [name, ...aliases] = forms.split('=');
      const points = Number(score);
      if (!name || ![10, 30, 60, 85].includes(points) || aliases.includes('')) {
        throw new Error(`Invalid reviewed answer for ${id}: ${answer}`);
      }
      return { name, aliases, points };
    });
    byId.set(id, { wording, checks });
    if (!byWording.has(wording)) byWording.set(wording, checks);
  }
  const cases = new Map();
  for (const { id, prompt } of prompts) {
    const row = byId.get(id);
    const checks = row?.wording === prompt ? row.checks : byWording.get(prompt);
    if (checks) cases.set(id, checks);
    else if (requireComplete) throw new Error(`Missing review entry for prompt ${id}: ${prompt}`);
  }
  return cases;
}
