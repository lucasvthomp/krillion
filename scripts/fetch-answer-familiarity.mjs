import { readFile, writeFile } from 'node:fs/promises';
import { gunzipSync, gzipSync } from 'node:zlib';
import { setTimeout as delay } from 'node:timers/promises';
import { sourceCandidates } from './answer-coverage-rules.mjs';

const sourceUrl = new URL('answer-sources.json.gz', import.meta.url);
const outputUrl = new URL('answer-familiarity.json.gz', import.meta.url);
const indexUrl = new URL('../docs/bank/index.json', import.meta.url);
const { collections } = JSON.parse(gunzipSync(await readFile(sourceUrl)));
const { prompts } = JSON.parse(await readFile(indexUrl, 'utf8'));
const ids = [...new Set(prompts.flatMap(({ prompt }) =>
  sourceCandidates(prompt, collections).items.map(({ id }) => id)))].sort();
if (!ids.length || ids.some((id) => !/^Q[1-9]\d*$/u.test(id))) throw new Error('Invalid Wikidata entity list.');

const links = new Map();
try {
  const previous = JSON.parse(gunzipSync(await readFile(outputUrl)));
  for (const id of ids) if (Number.isInteger(previous[id])) links.set(id, previous[id]);
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}

const missing = ids.filter((id) => !links.has(id));
const batches = [];
for (let index = 0; index < missing.length; index += 1600) batches.push(missing.slice(index, index + 1600));

async function fetchLinks(batch, attempt = 0) {
  const values = batch.map((id) => `wd:${id}`).join(' ');
  const query = `SELECT ?item ?links WHERE {
    VALUES ?item { ${values} }
    ?item wikibase:sitelinks ?links.
  }`;
  try {
    const response = await fetch('https://query.wikidata.org/sparql', {
      method: 'POST',
      headers: {
        'User-Agent': 'KrillionAnswerCoverage/1.0 (https://github.com/lucasvthomp/krillion)',
        Accept: 'application/sparql-results+json',
      },
      body: new URLSearchParams({ format: 'json', query }),
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) {
      const retryAfter = Number(response.headers.get('retry-after'));
      if (response.status === 429 && Number.isFinite(retryAfter) && retryAfter > 0 && retryAfter <= 60) {
        await delay(retryAfter * 1000);
      }
      throw new Error(`Wikidata responded with HTTP ${response.status}`);
    }
    const { results } = await response.json();
    for (const { item, links: count } of results.bindings) {
      const id = item.value.split('/').at(-1);
      const value = Number(count.value);
      if (Number.isInteger(value) && value >= 0) links.set(id, value);
    }
  } catch (error) {
    if (attempt >= 2) throw error;
    await delay(1500 * (attempt + 1));
    await fetchLinks(batch, attempt + 1);
  }
}

for (let index = 0; index < batches.length; index += 3) {
  const results = await Promise.allSettled(batches.slice(index, index + 3).map((batch) => fetchLinks(batch)));
  for (const result of results) if (result.status === 'rejected') console.error(result.reason.message);
  console.log(`Retrieved familiarity data for ${links.size} of ${ids.length} entities.`);
}
if (!links.size) throw new Error('No familiarity data was retrieved.');
const output = Object.fromEntries(ids.filter((id) => links.has(id)).map((id) => [id, links.get(id)]));
await writeFile(outputUrl, gzipSync(JSON.stringify(output)));
console.log(`Saved ${links.size.toLocaleString()} sitelink counts. ${ids.length - links.size} entities had no measurement.`);
