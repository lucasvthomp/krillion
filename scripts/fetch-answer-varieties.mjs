// Looks up the varieties of answers on Wikidata (CC0): the subclasses, breeds, cultivars and child
// taxa of each answer's Wikidata item, such as Bengal tiger for Tiger or Granny Smith for Apple.
// Usage: node scripts/fetch-answer-varieties.mjs
// Run fetch-answer-aliases.mjs first: it matches answer names to Wikidata items. The snapshot is
// resumable, so items already looked up are not requested again.
import { readFile, writeFile } from 'node:fs/promises';
import { gunzipSync, gzipSync } from 'node:zlib';
import { setTimeout as delay } from 'node:timers/promises';

const aliasesUrl = new URL('answer-aliases.json.gz', import.meta.url);
const outputUrl = new URL('answer-varieties.json.gz', import.meta.url);
const userAgent = 'TriviaAnswerAliases/1.0 (offline build script)';
const parentsPerQuery = 250;
const itemsPerQuery = 1000;
const concurrency = 2;
// An item with more varieties than this is too broad a class (protein, a plant genus with thousands
// of species) for its varieties to be useful answers, so it is not expanded.
const maxChildren = 1000;

const { names } = JSON.parse(gunzipSync(await readFile(aliasesUrl)));
const parents = [...new Set(Object.values(names).filter(Boolean))].sort();

let snapshot = { children: {}, details: {}, taxa: {} };
try {
  snapshot = { taxa: {}, ...JSON.parse(gunzipSync(await readFile(outputUrl))) };
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
const { children, details, taxa } = snapshot;

async function sparql(query, attempt = 0) {
  try {
    const response = await fetch('https://query.wikidata.org/sparql', {
      method: 'POST',
      headers: { 'User-Agent': userAgent, Accept: 'application/sparql-results+json' },
      body: new URLSearchParams({ format: 'json', query }),
      signal: AbortSignal.timeout(90000),
    });
    const text = await response.text();
    if (!response.ok || !text.startsWith('{')) {
      const retryAfter = Number(response.headers.get('retry-after'));
      throw Object.assign(new Error(`Wikidata responded with HTTP ${response.status}`), { retryAfter });
    }
    return JSON.parse(text).results.bindings;
  } catch (error) {
    if (attempt >= 3) throw error;
    const wait = error.retryAfter > 0 ? error.retryAfter * 1000 : 3000 * 2 ** attempt;
    await delay(Math.min(wait, 120000));
    return sparql(query, attempt + 1);
  }
}

const entity = (uri) => uri.slice(uri.lastIndexOf('/') + 1);

// Direct subclasses ("subclass of") and child taxa ("parent taxon") of each item. A batch that
// times out is split in half and retried, so one very broad class cannot stop the rest.
async function loadChildren(batch) {
  let rows;
  try {
    rows = await sparql(`SELECT ?parent ?child WHERE {
      VALUES ?parent { ${batch.map((id) => `wd:${id}`).join(' ')} }
      ?child wdt:P279|wdt:P171 ?parent .
    }`);
  } catch (error) {
    if (batch.length === 1) throw error;
    const half = Math.ceil(batch.length / 2);
    await loadChildren(batch.slice(0, half));
    await loadChildren(batch.slice(half));
    return;
  }
  for (const id of batch) children[id] = [];
  for (const { parent, child } of rows) {
    const list = children[entity(parent.value)];
    const value = entity(child.value);
    if (list && !list.includes(value)) list.push(value);
  }
}

// Sitelink count, English label and English alternate names of each variety.
async function loadDetails(batch) {
  const rows = await sparql(`SELECT ?item ?links ?label (GROUP_CONCAT(?alias; separator="\\u001f") AS ?aliases) WHERE {
    VALUES ?item { ${batch.map((id) => `wd:${id}`).join(' ')} }
    ?item wikibase:sitelinks ?links .
    OPTIONAL { ?item rdfs:label ?label FILTER(LANG(?label) = "en") }
    OPTIONAL { ?item skos:altLabel ?alias FILTER(LANG(?alias) = "en") }
  } GROUP BY ?item ?links ?label`);
  for (const id of batch) details[id] = [0, ''];
  for (const { item, links, label, aliases } of rows) {
    const values = aliases?.value ? aliases.value.split('\u001f') : [];
    details[entity(item.value)] = [Number(links.value), label?.value ?? '', ...new Set(values)];
  }
}

// The scientific name of each variety that is a taxon, so that a variety known only by its
// scientific name ("Physalis angulata") can be told apart from one with a common name.
async function loadTaxa(batch) {
  const rows = await sparql(`SELECT ?item ?name WHERE {
    VALUES ?item { ${batch.map((id) => `wd:${id}`).join(' ')} }
    ?item wdt:P225 ?name .
  }`);
  for (const id of batch) taxa[id] = '';
  for (const { item, name } of rows) taxa[entity(item.value)] = name.value;
}

async function save() {
  // A class too broad to expand is saved with no varieties, which keeps the snapshot small.
  for (const [id, list] of Object.entries(children)) if (list.length > maxChildren) children[id] = [];
  await writeFile(outputUrl, gzipSync(JSON.stringify({ children, details, taxa })));
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

const pendingParents = parents.filter((id) => !(id in children));
console.log(`${parents.length.toLocaleString()} answer items, ${pendingParents.length.toLocaleString()} to look up.`);
await runBatches(pendingParents, parentsPerQuery, loadChildren, 'Varieties');

const pendingDetails = [...new Set(Object.values(children).filter((list) => list.length <= maxChildren).flat())].filter((id) => !(id in details)).sort();
console.log(`${pendingDetails.length.toLocaleString()} varieties need their names.`);
await runBatches(pendingDetails, itemsPerQuery, loadDetails, 'Names');

const pendingTaxa = Object.keys(details).filter((id) => details[id][0] >= 2 && !(id in taxa)).sort();
console.log(`${pendingTaxa.length.toLocaleString()} varieties need their scientific names.`);
await runBatches(pendingTaxa, itemsPerQuery, loadTaxa, 'Taxa');

const withChildren = Object.values(children).filter((list) => list.length).length;
console.log(`${withChildren.toLocaleString()} answer items have ${Object.keys(details).length.toLocaleString()} varieties.`);
