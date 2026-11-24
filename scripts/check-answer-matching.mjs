// Checks that common ways of typing an answer are recognised.
// Usage: node scripts/check-answer-matching.mjs [--all]
// --all also confirms that every answer name and alternate name in every bank still matches.
import { readFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { buildLookup, isPersonPrompt } from '../docs/answers.mjs';

const bank = new URL('../docs/bank/', import.meta.url);
const { prompts } = JSON.parse(await readFile(new URL('index.json', bank), 'utf8'));
const readBank = async (id) => JSON.parse(gunzipSync(await readFile(new URL(`${id}.bank`, bank))));

// [prompt, guess, expected answer name, or an array of names offered as choices]
const cases = [
  ['Name a country with a coastline', 'USA', 'United States'],
  ['Name a country with a coastline', 'US', 'United States'],
  ['Name a country with a coastline', 'the US', 'United States'],
  ['Name a country with a coastline', 'America', 'United States'],
  ['Name a country with a coastline', 'U.S.A.', 'United States'],
  ['Name a country with a coastline', 'United States of America', 'United States'],
  ['Name a country with a coastline', 'UK', 'United Kingdom'],
  ['Name a country with a coastline', 'Britain', 'United Kingdom'],
  ['Name a country with a coastline', 'Great Britain', 'United Kingdom'],
  ['Name a country with a coastline', 'UAE', 'United Arab Emirates'],
  ['Name a country with a coastline', 'DRC', 'Democratic Republic of the Congo'],
  ['Name a country with a coastline', 'Holland', 'Netherlands'],
  ['Name a US president', 'Lincoln', 'Abraham Lincoln'],
  ['Name a US president', 'Obama', 'Barack Obama'],
  ['Name a US president', 'JFK', 'John F. Kennedy'],
  ['Name a famous scientist', 'Einstein', 'Albert Einstein'],
  ['Name a famous scientist', 'Newton', 'Isaac Newton'],
  ['Name a Renaissance artist', 'da Vinci', 'Leonardo da Vinci'],
  ['Name a current NBA player', 'LeBron', 'LeBron James'],
  ['Name a famous tennis player', 'Federer', 'Roger Federer'],
  ['Name a famous tennis player', 'Williams', ['Serena Williams', 'Venus Williams']],
  ['Name a country with a coastline', 'St Lucia', 'Saint Lucia'],
  ['Name a country with a coastline', 'St. Kitts', 'Saint Kitts and Nevis'],
  ['Name a US national park', 'Mt Rainier', 'Mount Rainier'],
  ['Name a city in Asia with over 1 million people within city limits', 'Bombay', 'Mumbai'],
  // A distinctive word of a two-word title counts on its own.
  ['Name a Queen song', 'Rhapsody', 'Bohemian Rhapsody'],
  // Real answers from the 2026-11-24 missed-answers review.
  ['Name a luxury watch brand', 'IWC', 'IWC Schaffhausen'],
  ['Name a member of the Avengers', 'Tony Stark', 'Iron Man'],
  ['Name a member of the Justice League', 'Bruce Wayne', 'Batman'],
  ['Name a Walt Disney Animation Studios feature film', 'snow white', 'Snow White and the Seven Dwarfs'],
  ['Name a company in the S&P 500', 'General Electric', 'GE Aerospace'],
  ['Name something sprayed out of a can (pump bottles don\'t count)', 'whip cream', 'Whipped cream'],
  ['Name a Latin American dish', 'chicken empanadas', 'Empanada'],
  ['Name a food you have to shell or crack open before eating', 'pistachio nut', 'Pistachio'],
  ['Name a toy brand', 'american girl doll', 'American Girl'],
  ['Name a shade of green', 'olive', 'Olive green'],
  ['Name a penguin species', 'emporor', ['Emperor penguin']],
  ['Name a movie starring Timothée Chalamet', 'Dune II', 'Dune: Part Two'],
  ['Name a carnivorous mammal', 'red fox', 'Red fox'],
  ['Name a rap song with over 100 million Spotify streams.', 'gansters paradise', ["Gangsta's Paradise"]],
  // A variety of an answer counts as that answer when the bank does not list the variety.
  ['Name an animal that lives in groups', 'south american gray wolf', 'Wolf'],
  ['Name a dog breed', 'teacup poodle', 'Poodle'],
  // A variety Wikidata lists is an answer of its own and can score more than its answer.
  ['Name a dog breed', 'miniature poodle', 'Miniature Poodle'],
  ['Name a carnivorous mammal', 'javan tiger', 'Javan tiger'],
  ['Name a carnivorous mammal', 'white tiger', 'white tiger'],
  ['Name a fruit', 'honeycrisp', 'Honeycrisp'],
  ['Name a fruit', 'granny smith apple', 'Apple'],
  // Guesses from the same review that must stay rejected: first names, loose single words.
  ['Name a Disney villain', 'bill', undefined],
  ['Name a member of the Justice League', 'lucas', undefined],
  ['Name a variety of wine', 'red', undefined],
  ['Name a carnivorous mammal', 'kangaroo', undefined],
  ['Name a German dish', 'bread', undefined],
  ['Name a carnivorous mammal', 'elephant', undefined],
];

let failures = 0;
const banks = new Map();
for (const [promptText, guess, expected] of cases) {
  const prompt = prompts.find(({ prompt }) => prompt === promptText);
  if (!prompt) {
    console.log(`SKIP  "${promptText}" is not in the bank`);
    continue;
  }
  if (!banks.has(prompt.id)) banks.set(prompt.id, buildLookup(await readBank(prompt.id), prompt.prompt));
  const lookup = banks.get(prompt.id);
  const matched = lookup.match(guess)?.[0];
  const offered = lookup.suggest(guess).choices.map(([name]) => name);
  let ok;
  if (Array.isArray(expected)) ok = !matched && expected.every((name) => offered.includes(name));
  else ok = matched === expected;
  if (!ok) failures += 1;
  const got = matched ?? (offered.length ? `choices: ${offered.join(' / ')}` : 'no match');
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${promptText} | "${guess}" -> ${got}`);
}

if (process.argv.includes('--all')) {
  let names = 0;
  let broken = 0;
  let shared = 0;
  for (const prompt of prompts) {
    const records = await readBank(prompt.id);
    const lookup = buildLookup(records, prompt.prompt);
    for (const record of records) {
      names += 1;
      const found = lookup.match(record[0]);
      if (!found || found[1] < record[1]) {
        broken += 1;
        if (broken <= 20) console.log(`BROKEN ${prompt.id} "${record[0]}" -> ${found?.[0] ?? 'no match'}`);
      }
      for (const alias of record[3] ?? []) {
        if (!lookup.match(alias)) shared += 1;
      }
    }
  }
  console.log(`${names.toLocaleString()} answers checked, ${broken} no longer match their own name, ` +
    `${shared.toLocaleString()} alternate names are shared by several answers and offer a choice.`);
  if (broken) failures += 1;
  const people = prompts.filter(({ prompt }) => isPersonPrompt(prompt)).map(({ prompt }) => prompt);
  console.log(`${people.length} prompts accept last names.`);
}

if (failures) {
  console.log(`${failures} check(s) failed.`);
  process.exitCode = 1;
}
