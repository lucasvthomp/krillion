import { readFile, writeFile } from 'node:fs/promises';
import { gunzipSync, gzipSync } from 'node:zlib';
import { exactKey } from '../docs/answers.mjs';
import { donorKeys, promptKey, sourceCandidates } from './answer-coverage-rules.mjs';

const bank = new URL('../docs/bank/', import.meta.url);
const indexUrl = new URL('index.json', bank);
const reportUrl = new URL('answer-coverage.json', import.meta.url);
const snapshotUrl = new URL('answer-sources.json.gz', import.meta.url);
const { collections } = JSON.parse(gunzipSync(await readFile(snapshotUrl)));
const index = JSON.parse(await readFile(indexUrl, 'utf8'));
const { prompts } = index;
const promptGroups = new Map();
const requestedDonors = new Set(prompts.flatMap(({ prompt }) => donorKeys(prompt)));
const referenceBanks = new Map();

async function readBank(prompt) {
  const records = JSON.parse(gunzipSync(await readFile(new URL(`${prompt.id}.bank`, bank))));
  if (records.length !== prompt.count) throw new Error(`Invalid bank count for ${prompt.id}`);
  return records;
}

for (const prompt of prompts) {
  const key = promptKey(prompt.prompt);
  if (!promptGroups.has(key)) promptGroups.set(key, []);
  promptGroups.get(key).push(prompt);
}
for (const [key, entries] of promptGroups) {
  if (entries.length < 2 && !requestedDonors.has(key)) continue;
  for (const prompt of entries) {
    referenceBanks.set(prompt.id, (await readBank(prompt)).filter((record) => !record[4]));
  }
}

function nameKey(text) {
  return exactKey(text).normalize('NFKD').replace(/\p{M}/gu, '')
    .replace(/&/gu, 'and').replace(/[^\p{L}\p{N}+#]/gu, '');
}

function validName(text, minimum = 1) {
  return typeof text === 'string' && text.length <= 300 &&
    /\p{L}/u.test(text) && nameKey(text).length >= minimum &&
    !/^(list of|category:|wikimedia|unidentified)\b/iu.test(text);
}

function indexName(names, key, record) {
  if (!key) return;
  if (!names.has(key)) names.set(key, record);
  else if (names.get(key) !== record) names.set(key, null);
}

function createMerge(records, candidates) {
  const exact = new Map();
  const names = new Map();
  const candidateOwners = new Map();
  for (const record of records) {
    const name = exactKey(record[0]);
    if (!exact.has(name) || exact.get(name)[1] < record[1]) exact.set(name, record);
  }
  for (const record of exact.values()) {
    indexName(names, nameKey(record[0]), record);
    for (const alias of record[3] ?? []) indexName(names, nameKey(alias), record);
  }
  for (const candidate of candidates) {
    for (const spelling of [candidate.name, ...(candidate.aliases ?? [])]) {
      indexName(candidateOwners, nameKey(spelling), candidate);
    }
  }

  return (candidate) => {
    const name = candidate.name.trim();
    if (!validName(name)) return false;
    const primary = nameKey(name);
    if (!primary) return false;
    const variants = [...new Set(candidate.aliases ?? [])].filter((alias) => validName(alias, 3) &&
      nameKey(alias) !== primary && candidateOwners.get(nameKey(alias)) === candidate);
    let record = exact.get(exactKey(name)) ?? names.get(primary);
    if (!record && names.has(primary)) return false;
    if (!record && variants.length) {
      const matches = new Set(variants.map((alias) => names.get(nameKey(alias))).filter(Boolean));
      if (matches.size === 1) [record] = matches;
      if (matches.size > 1) return false;
    }
    if (!record) {
      if (candidateOwners.get(primary) !== candidate) return false;
      const aliases = variants.filter((variant) => !names.has(nameKey(variant)));
      // A new, source-backed answer gets a neutral provisional tier until calibrated.
      record = [name, 60, 'rare', aliases, candidate.reference];
      records.push(record);
      exact.set(exactKey(name), record);
      indexName(names, primary, record);
      for (const alias of aliases) indexName(names, nameKey(alias), record);
      return true;
    }
    const claimed = [name, ...variants].filter((alias) => {
      const key = nameKey(alias);
      return key !== nameKey(record[0]) && !names.has(key) && candidateOwners.get(key) === candidate;
    });
    if (!claimed.length) return false;
    record[3] = [...(record[3] ?? []), ...claimed];
    for (const alias of claimed) indexName(names, nameKey(alias), record);
    return true;
  };
}

const audit = [];
let answerCount = 0;
for (const prompt of prompts) {
  const records = await readBank(prompt);
  const originalCount = records.filter((record) => !record[4]).length;
  const before = records.length;
  const beforeAliasCount = records.reduce((sum, record) => sum + (record[3]?.length ?? 0), 0);
  const { collection, items } = sourceCandidates(prompt.prompt, collections);
  const equivalent = (promptGroups.get(promptKey(prompt.prompt)) ?? []).filter(({ id }) => id !== prompt.id);
  const narrower = donorKeys(prompt.prompt).flatMap((key) => promptGroups.get(key) ?? []);
  const donors = [...equivalent, ...narrower];

  const candidateMap = new Map();
  // Matching the same name to a Wikidata entity lets us reuse its exact aliases.
  for (const item of items) {
    if (!validName(item.name)) continue;
    const key = nameKey(item.name);
    const previous = candidateMap.get(key);
    if (!previous) {
      candidateMap.set(key, { ...item, reference: `wikidata:${item.id}` });
    } else if (previous.reference !== `wikidata:${item.id}`) {
      // The display name is shared by several entities. Keep the name alone.
      previous.aliases = [];
    }
  }
  for (const donor of donors) {
    for (const [name] of referenceBanks.get(donor.id) ?? []) {
      const key = nameKey(name);
      if (key && !candidateMap.has(key)) candidateMap.set(key, { name, reference: `bank:${donor.id}` });
    }
  }
  const candidates = [...candidateMap.values()];
  let changed = false;
  if (candidates.length) {
    const merge = createMerge(records, candidates);
    for (const candidate of candidates) if (merge(candidate)) changed = true;
  }

  if (changed) {
    await writeFile(new URL(`${prompt.id}.bank`, bank), gzipSync(JSON.stringify(records)));
  }
  const aliases = records.reduce((sum, record) => sum + (record[3]?.length ?? 0), 0);
  const updated = records.length !== originalCount || aliases > 0;
  audit.push({
    id: prompt.id,
    prompt: prompt.prompt,
    category: prompt.category,
    originalAnswers: originalCount,
    answers: records.length,
    aliases,
    verifiedCandidates: candidates.length,
    evidence: [...(collection ? [`wikidata:${collection}`] : []), ...donors.map(({ id }) => `bank:${id}`)],
    status: updated ? 'expanded' : candidates.length ? 'checked-against-source' : 'needs-specific-source',
  });
  prompt.count = records.length;
  answerCount += records.length;
  if (before > records.length || beforeAliasCount > aliases) throw new Error(`Unexpected loss in ${prompt.id}`);
}

const summary = {
  audited: audit.length,
  expanded: audit.filter(({ status }) => status === 'expanded').length,
  checkedAgainstSource: audit.filter(({ status }) => status === 'checked-against-source').length,
  needsSpecificSource: audit.filter(({ status }) => status === 'needs-specific-source').length,
  addedAnswers: audit.reduce((total, entry) => total + entry.answers - entry.originalAnswers, 0),
  addedAliases: audit.reduce((total, entry) => total + entry.aliases, 0),
  answers: answerCount,
};
await writeFile(indexUrl, JSON.stringify({ answerCount, prompts }));
await writeFile(reportUrl, JSON.stringify({ summary, prompts: audit }, null, 2) + '\n');
console.log(JSON.stringify(summary, null, 2));
