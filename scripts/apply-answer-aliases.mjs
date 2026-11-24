// Adds alternate names to answers in every bank. Run after enrich-bank.mjs.
// Usage: node scripts/apply-answer-aliases.mjs
// Sources: the hand-picked groups in answer-alias-table.mjs and the Wikidata snapshot saved by
// fetch-answer-aliases.mjs. An alternate name inherits its answer's score, and it is skipped when
// another answer in the same bank already uses that spelling. Running it again changes nothing.
import { readFile, writeFile } from 'node:fs/promises';
import { gunzipSync, gzipSync } from 'node:zlib';
import { exactKey, hasSpellingRule } from '../docs/answers.mjs';
import { aliasGroups } from './answer-alias-table.mjs';

const bank = new URL('../docs/bank/', import.meta.url);
const snapshotUrl = new URL('answer-aliases.json.gz', import.meta.url);
const { prompts } = JSON.parse(await readFile(new URL('index.json', bank), 'utf8'));

let wikidata = { names: {}, items: {}, types: {} };
try {
  wikidata = { types: {}, ...JSON.parse(gunzipSync(await readFile(snapshotUrl))) };
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
  console.log('No Wikidata snapshot found. Run scripts/fetch-answer-aliases.mjs to add Wikidata names.');
}

function nameKey(text) {
  return exactKey(text).normalize('NFKD').replace(/\p{M}/gu, '')
    .replace(/&/gu, 'and').replace(/[^\p{L}\p{N}+#]/gu, '');
}

const clean = (text) => text.trim().replace(/\s+/gu, ' ').replace(/^the /iu, '');

// Wikidata aliases are crowd-edited, so keep only readable Latin-script names. Two- and
// three-letter aliases must be capitalised abbreviations such as UK or UAE.
function usableWikidataAlias(text) {
  if (text.length > 80 || !/\p{L}/u.test(text) || /[[\]{}=<>|]/u.test(text)) return false;
  if ((text.match(/\p{N}/gu)?.length ?? 0) > (text.match(/\p{L}/gu)?.length ?? 0)) return false;
  if ([...text].some((char) => /\p{L}/u.test(char) && !/\p{Script=Latin}/u.test(char))) return false;
  const key = nameKey(text);
  if (key.length < 2) return false;
  if (key.length <= 3 && !/^[A-Z0-9](?:[ .]?[A-Z0-9])*\.?$/u.test(text)) return false;
  return true;
}

const groupsByKey = new Map();
for (const group of aliasGroups) {
  for (const name of group) {
    const key = nameKey(name);
    if (!groupsByKey.has(key)) groupsByKey.set(key, []);
    groupsByKey.get(key).push(group);
  }
}

const itemOf = (record) => wikidata.names[record[0].trim()] || null;

// The kinds of thing (Wikidata types) that several answers in this bank share. An answer whose
// Wikidata item is none of these kinds was probably matched to the wrong item, such as the river
// Don on a prompt about fictional characters, so its Wikidata names are not used.
function sharedTypes(records) {
  const counts = new Map();
  let matched = 0;
  for (const record of records) {
    const kinds = wikidata.types[itemOf(record)];
    if (!kinds?.length) continue;
    matched += 1;
    for (const kind of kinds) counts.set(kind, (counts.get(kind) ?? 0) + 1);
  }
  const threshold = Math.max(2, Math.ceil(matched * 0.05));
  return new Set([...counts].filter(([, count]) => count >= threshold).map(([kind]) => kind));
}

function proposals(record, shared) {
  const found = [];
  // Match groups on the answer's own name only, so that a name added earlier cannot pull in a
  // second group (and the script gives the same result however often it runs).
  for (const group of groupsByKey.get(nameKey(record[0])) ?? []) found.push(...group.map(clean));
  const id = itemOf(record);
  const item = wikidata.items[id];
  if (item && shared && wikidata.types[id]?.some((kind) => shared.has(kind))) {
    found.push(...item.filter(Boolean).map(clean).filter(usableWikidataAlias));
  }
  return found;
}

let changedBanks = 0;
let addedAliases = 0;
let answersWithNewNames = 0;
for (const prompt of prompts) {
  // A prompt that judges spelling ("starts with S") cannot take alternate names, which may not
  // follow the rule.
  if (hasSpellingRule(prompt.prompt)) continue;
  const records = JSON.parse(gunzipSync(await readFile(new URL(`${prompt.id}.bank`, bank))));
  const shared = sharedTypes(records);
  const owners = new Map();
  for (const record of records) {
    for (const spelling of [record[0], ...(record[3] ?? [])]) {
      const key = nameKey(spelling);
      if (!owners.has(key)) owners.set(key, new Set());
      owners.get(key).add(record);
    }
  }
  // Collect every proposal first so that a spelling two answers both claim is added to both.
  const claims = new Map();
  for (const record of records) {
    for (const alias of proposals(record, shared)) {
      const key = nameKey(alias);
      if (!key || owners.has(key)) continue;
      if (!claims.has(key)) claims.set(key, new Map());
      if (!claims.get(key).has(record)) claims.get(key).set(record, alias);
    }
  }
  const touched = new Set();
  for (const byRecord of claims.values()) {
    for (const [record, alias] of byRecord) {
      if (!record[3]) record[3] = [];
      record[3].push(alias);
      touched.add(record);
      addedAliases += 1;
    }
  }
  if (touched.size) {
    answersWithNewNames += touched.size;
    changedBanks += 1;
    await writeFile(new URL(`${prompt.id}.bank`, bank), gzipSync(JSON.stringify(records)));
  }
}
console.log(`Added ${addedAliases.toLocaleString()} alternate names to ${answersWithNewNames.toLocaleString()} answers in ${changedBanks} banks.`);
