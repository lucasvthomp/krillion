// Looks up alternate names for answers on Wikidata (CC0).
// Usage: node scripts/fetch-answer-aliases.mjs
// Each answer name is matched to the Wikidata item with that English label and the most
// Wikipedia sitelinks, then that item's English label and aliases are saved. The snapshot is
// resumable: names and items already looked up are not requested again.
import { readFile, writeFile } from 'node:fs/promises';
import { gunzipSync, gzipSync } from 'node:zlib';
import { setTimeout as delay } from 'node:timers/promises';

const bank = new URL('../docs/bank/', import.meta.url);
const outputUrl = new URL('answer-aliases.json.gz', import.meta.url);
const userAgent = 'TriviaAnswerAliases/1.0 (offline build script)';
const namesPerQuery = 700;
const itemsPerQuery = 1500;
const concurrency = 2;
// Small banks are mostly well-known things, so every answer is worth a lookup.
// In large catalog banks only the familiar tiers are looked up.
const smallBank = 3000;

const { prompts } = JSON.parse(await readFile(new URL('index.json', bank), 'utf8'));
const names = new Set();
for (const prompt of prompts) {
  const records = JSON.parse(gunzipSync(await readFile(new URL(`${prompt.id}.bank`, bank))));
  for (const [name, , tier] of records) {
    if (tier === 'deepcut' && prompt.count > smallBank) continue;
    const text = name.trim();
    if (text.length > 200 || !/\p{L}/u.test(text) || /[\p{Cc}\p{Cs}]/u.test(text)) continue;
    names.add(text);
  }
}

let snapshot = { names: {}, items: {}, types: {} };
try {
  snapshot = { types: {}, ...JSON.parse(gunzipSync(await readFile(outputUrl))) };
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
const { names: resolved, items, types } = snapshot;

async function sparql(query, attempt = 0) {
  try {
    const response = await fetch('https://query.wikidata.org/sparql', {
      method: 'POST',
      headers: { 'User-Agent': userAgent, Accept: 'application/sparql-results+json' },
      body: new URLSearchParams({ format: 'json', query }),
      signal: AbortSignal.timeout(90000),
    });
    if (!response.ok) {
      const retryAfter = Number(response.headers.get('retry-after'));
      throw Object.assign(new Error(`Wikidata responded with HTTP ${response.status}`), { retryAfter });
    }
    return (await response.json()).results.bindings;
  } catch (error) {
    if (attempt >= 5) throw error;
    const wait = error.retryAfter > 0 ? error.retryAfter * 1000 : 3000 * 2 ** attempt;
    await delay(Math.min(wait, 120000));
    return sparql(query, attempt + 1);
  }
}

const literal = (text) => `${JSON.stringify(text)}@en`;
const entity = (uri) => uri.slice(uri.lastIndexOf('/') + 1);

// Try the name as written, in lower case, and with a capital first letter.
async function resolveNames(batch) {
  const spellings = new Map();
  for (const name of batch) {
    for (const form of [name, name.toLowerCase(), name[0].toUpperCase() + name.slice(1)]) {
      if (!spellings.has(form)) spellings.set(form, []);
      if (!spellings.get(form).includes(name)) spellings.get(form).push(name);
    }
  }
  const rows = await sparql(`SELECT ?text ?item ?links WHERE {
    VALUES ?text { ${[...spellings.keys()].map(literal).join(' ')} }
    ?item rdfs:label ?text ; wikibase:sitelinks ?links .
    FILTER(?links >= 2)
    FILTER NOT EXISTS { ?item wdt:P31 wd:Q4167410 }
  }`);
  const best = new Map();
  for (const { text, item, links } of rows) {
    const count = Number(links.value);
    for (const name of spellings.get(text.value) ?? []) {
      if (!best.has(name) || best.get(name)[1] < count) best.set(name, [entity(item.value), count]);
    }
  }
  for (const name of batch) resolved[name] = best.get(name)?.[0] ?? 0;
}

async function loadItems(batch) {
  const rows = await sparql(`SELECT ?item ?label (GROUP_CONCAT(?alias; separator="\\u001f") AS ?aliases) WHERE {
    VALUES ?item { ${batch.map((id) => `wd:${id}`).join(' ')} }
    OPTIONAL { ?item rdfs:label ?label FILTER(LANG(?label) = "en") }
    OPTIONAL { ?item skos:altLabel ?alias FILTER(LANG(?alias) = "en") }
  } GROUP BY ?item ?label`);
  for (const id of batch) items[id] = [''];
  for (const { item, label, aliases } of rows) {
    const values = aliases?.value ? aliases.value.split('\u001f') : [];
    items[entity(item.value)] = [label?.value ?? '', ...new Set(values)];
  }
}

// What kind of thing each item is ("instance of" and "subclass of"), so that an answer matched to
// the wrong item, such as a river for a cartoon character, can be recognised and skipped.
async function loadTypes(batch) {
  const rows = await sparql(`SELECT ?item ?type WHERE {
    VALUES ?item { ${batch.map((id) => `wd:${id}`).join(' ')} }
    ?item wdt:P31|wdt:P279 ?type .
  }`);
  for (const id of batch) types[id] = [];
  for (const { item, type } of rows) {
    const list = types[entity(item.value)];
    const value = entity(type.value);
    if (list && !list.includes(value)) list.push(value);
  }
}

async function save() {
  await writeFile(outputUrl, gzipSync(JSON.stringify({ names: resolved, items, types })));
}

async function runBatches(list, size, worker, label) {
  const batches = [];
  for (let index = 0; index < list.length; index += size) batches.push(list.slice(index, index + size));
  let next = 0;
  let done = 0;
  let failed = 0;
  let saved = Date.now();
  async function lane() {
    while (next < batches.length) {
      const batch = batches[next++];
      try {
        await worker(batch);
      } catch (error) {
        failed += 1;
        console.error(`${label}: ${error.message}`);
      }
      done += 1;
      if (Date.now() - saved > 60000) {
        saved = Date.now();
        await save();
        console.log(`${label}: ${done} of ${batches.length} batches`);
      }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, lane));
  await save();
  console.log(`${label}: finished ${batches.length} batches, ${failed} failed`);
}

const pendingNames = [...names].filter((name) => !(name in resolved)).sort();
console.log(`${names.size.toLocaleString()} names, ${pendingNames.length.toLocaleString()} to look up.`);
await runBatches(pendingNames, namesPerQuery, resolveNames, 'Names');

const pendingItems = [...new Set(Object.values(resolved).filter(Boolean))].filter((id) => !(id in items)).sort();
console.log(`${pendingItems.length.toLocaleString()} Wikidata items to load.`);
await runBatches(pendingItems, itemsPerQuery, loadItems, 'Items');

const pendingTypes = Object.keys(items).filter((id) => !(id in types)).sort();
console.log(`${pendingTypes.length.toLocaleString()} items need their types.`);
await runBatches(pendingTypes, itemsPerQuery, loadTypes, 'Types');

const found = Object.values(resolved).filter(Boolean).length;
const withAliases = Object.values(items).filter((row) => row.length > 1).length;
console.log(`Matched ${found.toLocaleString()} names to ${Object.keys(items).length.toLocaleString()} items; ${withAliases.toLocaleString()} have alternate names.`);
