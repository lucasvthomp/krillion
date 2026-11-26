// Reads the guess sweep: realistic guesses for every prompt, and the answers added after testing them.
//
// answer-guess-sweep.txt   id|guess|guess|...
//   Guesses a player is likely to type: common answers, other names, plurals, nicknames and
//   misspellings. check-guess-sweep.mjs reports the ones the game rejects.
// answer-guess-additions.txt   id|Name@points=alternate=alternate!reason|...
//   Answers and alternate names added after reviewing those rejections. Points (after the name or
//   the last alternate) default to 30 and
//   apply to new answers only. A name may not contain "!". A "!reason" marks an arguable answer, accepted leniently and listed
//   in ARGUABLE-ANSWERS.md for review. A prompt's additions also apply to other banks with the same
//   wording.
import { readFile } from 'node:fs/promises';

async function readLines(file) {
  const source = await readFile(new URL(file, import.meta.url), 'utf8');
  return source.split(/\r?\n/u).filter((line) => line.trim() && !line.startsWith('#'));
}

export async function readGuesses() {
  const guesses = new Map();
  for (const line of await readLines('answer-guess-sweep.txt')) {
    const [id, ...rest] = line.split('|').map((part) => part.trim());
    if (!/^\d{4}$/u.test(id) || !rest.length) throw new Error(`Invalid guess line: ${line}`);
    guesses.set(id, [...(guesses.get(id) ?? []), ...rest.filter(Boolean)]);
  }
  return guesses;
}

export async function readGuessAdditions() {
  const additions = new Map();
  for (const line of await readLines('answer-guess-additions.txt')) {
    const [id, ...items] = line.split('|').map((part) => part.trim());
    if (!/^\d{4}$/u.test(id) || !items.length) throw new Error(`Invalid addition line: ${line}`);
    const rows = items.filter(Boolean).map((item) => {
      const [body, reason, extra] = item.split('!');
      // A "!" inside a name would start a reason, so a reason that looks like names is an error.
      if (extra !== undefined || /[=@]/u.test(reason ?? '')) throw new Error(`Names may not contain "!": ${item}`);
      // The score may follow the name or the last alternate: Name@60=Other or Name=Other@60.
      let score = '30';
      const [name, ...alternates] = body.split('=').map((part) => part.trim().replace(/@(\d+)$/u, (_, points) => {
        score = points;
        return '';
      }).trim());
      const points = Number(score);
      if (!name || ![10, 15, 30, 60, 85].includes(points) || alternates.includes('')) {
        throw new Error(`Invalid addition for ${id}: ${item}`);
      }
      return { name, points, alternates, reason: reason?.trim() };
    });
    additions.set(id, [...(additions.get(id) ?? []), ...rows]);
  }
  return additions;
}
