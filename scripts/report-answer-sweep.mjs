import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { buildLookup } from '../docs/answers.mjs';
import { readSweep } from './answer-sweep.mjs';

const root = new URL('../', import.meta.url);
const baseline = execFileSync('git', ['rev-parse', '--verify', `${process.argv[2] ?? 'HEAD'}^{commit}`], {
  cwd: root, encoding: 'utf8',
}).trim();
const coverage = 'scripts/answer-coverage.json';
const prior = JSON.parse(execFileSync('git', ['show', `${baseline}:${coverage}`], { cwd: root }));
const current = JSON.parse(await readFile(new URL(coverage, root)));
const sweep = await readSweep(current.prompts, true);
const beforeById = new Map(prior.prompts.map((prompt) => [prompt.id, prompt]));
const bankPath = (id) => `docs/bank/${id}.bank`;
const changed = current.prompts.filter(({ id, answers, aliases }) => {
  const before = beforeById.get(id);
  return before.answers !== answers || before.aliases !== aliases;
});

const blobs = execFileSync('git', ['cat-file', '--batch'], {
  cwd: root, input: changed.map(({ id }) => `${baseline}:${bankPath(id)}\n`).join(''),
  maxBuffer: 64 * 1024 * 1024,
});
const beforeBanks = new Map();
let offset = 0;
for (const { id } of changed) {
  const boundary = blobs.indexOf(10, offset);
  const header = blobs.toString('ascii', offset, boundary).match(/^\w+ blob (\d+)$/u);
  if (!header) throw new Error(`Missing baseline bank for ${id}`);
  const end = boundary + 1 + Number(header[1]);
  beforeBanks.set(id, blobs.subarray(boundary + 1, end));
  offset = end + 1;
}

const sourceNotes = new Map([
  ['0004', '[Pixar filmography](https://www.pixar.com/feature-films/)'],
  ['0017', '[Academy Awards results](https://www.oscars.org/oscars/ceremonies/2026)'],
  ['0019', 'Checked the current 30-team roster. [NBA](https://www.nba.com/teams)'],
  ['0032', '[Walt Disney Animation Studios](https://disneyanimation.com/films/)'],
  ['0102', 'Checked every named SI prefix. [BIPM](https://www.bipm.org/en/measurement-units/si-prefixes)'],
  ['0112', 'Checked every current member state. [European Union](https://european-union.europa.eu/principles-countries-history/country-profiles_en)'],
  ['0117', '[UEFA final result](https://www.uefa.com/uefachampionsleague/news/0299-1de417608530-15b01ff7b150-1000/)'],
  ['0159', 'Checked every team in the league. [NFL](https://www.nfl.com/teams/)'],
  ['0171', '[Recording Academy winners](https://www.grammy.com/music-genre/general/)'],
  ['0174', 'The question uses the August 8 cutoff. Later grosses do not establish eligibility.'],
  ['0188', '[FIFA’s 48-team list and official names](https://www.fifa.com/en/articles/world-cup-2026-who-has-qualified)'],
  ['0194', '[Cao Dai follower estimate](https://religion.vn/committee-news/reviewing-25-year-administration-on-cadaism-post81nP5WkR34.html)'],
  ['0241', 'A channel needs a verifiable public count above 100 million subscribers.'],
  ['0250', '[Premier League membership](https://www.premierleague.com/en/news/4673099/the-202627-premier-league-season-officially-starts/)'],
  ['0272', 'Additional entries must be in the top 25 by MyAnimeList popularity at the time of the check.'],
  ['0478', 'Further additions require a dated Tranco snapshot and must name a site or service.'],
  ['0504', '[Apple’s built-in iPhone app list](https://support.apple.com/en-ie/guide/iphone/iph248b543ca/ios)'],
  ['0802', '[Spotify’s 2025 Wrapped charts](https://newsroom.spotify.com/2025-12-03/wrapped-top-artists-songs-albums-podcasts-audiobooks/)'],
  ['0812', 'Podcast popularity alone does not establish the required number of Spotify ratings.'],
  ['0903', '[Pixar filmography](https://www.pixar.com/feature-films/)'],
  ['0910', 'Checked the current 30-team roster. [NBA](https://www.nba.com/teams)'],
]);

const formatCell = (value) => value.replace(/[\\|*_]/gu, '\\$&');
const number = (value) => value.toLocaleString('en-US');
const groups = Map.groupBy(current.prompts, ({ category }) => category);
const totals = { answers: 0, aliases: 0, samples: 0, fixed: 0 };
const sections = [];
for (const [category, prompts] of groups) {
  sections.push(`## ${category}`, '', '| ID | Prompt | Change | Guesses checked | Review outcome |', '| --- | --- | --- | --- | --- |');
  for (const prompt of prompts) {
    const { id, answers, aliases } = prompt;
    const before = beforeById.get(id);
    const rows = JSON.parse(gunzipSync(await readFile(new URL(bankPath(id), root))));
    if (rows.length !== answers) throw new Error(`Bank count mismatch for ${id}`);
    const lookup = buildLookup(rows, prompt.prompt);
    const guesses = [...new Set(sweep.get(id).flatMap(({ name, aliases }) => [name, ...aliases]))];
    const delta = { answers: answers - before.answers, aliases: aliases - before.aliases };
    let missing = new Set();
    if (beforeBanks.has(id)) {
      const previousRows = JSON.parse(gunzipSync(beforeBanks.get(id)));
      const previousLookup = buildLookup(previousRows, prompt.prompt);
      missing = new Set(guesses.filter((guess) => !previousLookup.match(guess)));
      for (const [name, , , aliases = []] of previousRows) {
        for (const guess of [name, ...aliases]) {
          const previous = previousLookup.match(guess);
          if (previous && lookup.match(guess)?.[1] !== previous[1]) {
            throw new Error(`Retained answer changed score or stopped matching for ${id}: ${guess}`);
          }
        }
      }
    }
    const sample = guesses.map((guess) => {
      if (!lookup.match(guess)) throw new Error(`Missing reviewed answer for ${id}: ${guess}`);
      return missing.has(guess) ? `**${formatCell(guess)}**` : formatCell(guess);
    }).join(', ');
    const details = [];
    if (delta.answers) details.push(`+${number(delta.answers)} ${delta.answers === 1 ? 'answer' : 'answers'}`);
    if (delta.aliases) details.push(`+${number(delta.aliases)} alternate ${delta.aliases === 1 ? 'name' : 'names'}`);
    const reason = details.length ? (missing.size ? 'Filled the marked gaps.' : 'Expanded from a scoped answer list.') :
      `All ${guesses.length} checked forms already scored. No additional candidates were confirmed.`;
    const note = sourceNotes.get(id);
    sections.push(`| ${id} | ${formatCell(prompt.prompt)} | ${details.join(', ') || 'No additions'} | ${sample} | ${reason}${note ? ` ${note}` : ''} |`);
    totals.answers += delta.answers;
    totals.aliases += delta.aliases;
    totals.samples += guesses.length;
    totals.fixed += missing.size;
  }
  sections.push('');
}

const report = [
  '# Krillion answer bank review', '',
  `Reviewed **${number(current.prompts.length)} prompts** and tested **${number(totals.samples)} guesses** against the game’s matcher. ` +
  `This pass updated **${number(changed.length)} banks** with **${number(totals.answers)} answers** and **${number(totals.aliases)} alternate names**. ` +
  `All reviewed guesses now score. The **${number(totals.fixed)} bold guesses** were rejected in the [previous build](https://github.com/lucasvthomp/krillion/commit/${baseline}).`, '',
  'Each row records the guesses checked for that prompt and why the bank changed or stayed as it was. ' +
  'The checks cover selected answers for every prompt. Open categories can have additional valid answers, and time-sensitive membership can change after review. ' +
  'Any complete roster or catalog would need to match the prompt’s wording and date cutoff.', '',
  ...sections,
].join('\n');
await writeFile(new URL('ANSWER-REVIEW.md', root), report);
console.log({ prompts: current.prompts.length, updated: changed.length, ...totals });
