// Fills open-ended prompts whose banks were far from complete, using Wikidata (CC0).
// Usage: node scripts/fetch-missed-catalogs.mjs [prompt text ...]
// With prompt texts, only those catalogs are fetched again. A catalog whose query fails keeps its
// previous answers.
// Writes answer-missed-catalogs.json, which apply-answer-aliases.mjs merges like the reviewed
// additions: an answer the bank already has keeps its score and only gains alternate names, and a
// new answer is Rare when it is well covered across Wikimedia sites and Deep Cut otherwise.
import { readFile, writeFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';

const outputUrl = new URL('answer-missed-catalogs.json', import.meta.url);
const userAgent = 'TriviaAnswerAliases/1.0 (offline build script)';

// Each catalog lists the Wikidata pattern that selects ?item, the fewest Wikimedia sites an answer
// needs to count, and the coverage that makes a new answer Rare rather than Deep Cut.
const island = '?item wdt:P31/wdt:P279* wd:Q23442 .';
const catalogs = [
  {
    prompt: 'Name a country that no longer exists',
    where: `{ ?item wdt:P31 wd:Q3024240 } UNION { ?item wdt:P31 wd:Q1250464 } UNION { ?item wdt:P31 wd:Q19953632 }
      UNION { ?item wdt:P31 wd:Q28171280 } UNION { ?item wdt:P31 wd:Q48349 }
      ?item wdt:P576 ?ended .`,
    minLinks: 12, rareLinks: 60, notCurrentCountries: true,
    skip: /\b(?:District|Prefecture|Province|Governorate|Oblast)\b/u,
  },
  { prompt: 'Name a famous painting', where: '?item wdt:P31 wd:Q3305213 .', minLinks: 12, rareLinks: 40 },
  {
    prompt: 'Name a famous scientist',
    where: `VALUES ?job { wd:Q901 wd:Q169470 wd:Q593644 wd:Q864503 wd:Q170790 wd:Q11063 wd:Q18805 wd:Q520549
      wd:Q2374149 wd:Q350979 wd:Q212980 wd:Q3055126 wd:Q1622272 wd:Q16742096 wd:Q14906342 wd:Q2919046 }
      ?item wdt:P106 ?job ; wdt:P31 wd:Q5 .`,
    minLinks: 45, rareLinks: 90,
  },
  { prompt: 'Name a famous poet', where: '?item wdt:P106 wd:Q49757 ; wdt:P31 wd:Q5 .', minLinks: 40, rareLinks: 80 },
  { prompt: 'Name a famous tennis player', where: '?item wdt:P106 wd:Q10833314 ; wdt:P31 wd:Q5 .', minLinks: 30, rareLinks: 60 },
  { prompt: 'Name a Hollywood director', where: '?item wdt:P106 wd:Q2526255 ; wdt:P27 wd:Q30 ; wdt:P31 wd:Q5 .', minLinks: 25, rareLinks: 50 },
  { prompt: 'Name a talk show host', where: '?item wdt:P106 wd:Q18668527 ; wdt:P31 wd:Q5 .', minLinks: 8, rareLinks: 30 },
  { prompt: 'Name an arcade game', where: '?item wdt:P31 wd:Q7889 ; wdt:P400 wd:Q192851 .', minLinks: 4, rareLinks: 25 },
  { prompt: 'Name a western movie', where: '?item wdt:P31 wd:Q11424 ; wdt:P136 wd:Q172980 .', minLinks: 4, rareLinks: 25 },
  { prompt: 'Name a gulf or bay', where: '{ ?item wdt:P31 wd:Q39594 } UNION { ?item wdt:P31 wd:Q1322134 }', minLinks: 10, rareLinks: 40 },
  {
    prompt: 'Name a Caribbean island',
    where: `${island} VALUES ?sea { wd:Q1247 wd:Q93259 wd:Q128011 } ?item wdt:P706|wdt:P361|wdt:P206 ?sea .`,
    minLinks: 4, rareLinks: 40,
  },
  { prompt: 'Name an island in the Mediterranean', where: `${island} ?item wdt:P706|wdt:P206|wdt:P361 wd:Q4918 .`, minLinks: 4, rareLinks: 40 },
  { prompt: 'Name a cryptid (a creature like Bigfoot whose existence is claimed but unproven)', // Film monsters such as Godzilla are fictional, not claimed to be real.
    where: '?item wdt:P31/wdt:P279* wd:Q772636 . FILTER NOT EXISTS { ?item wdt:P31/wdt:P279* wd:Q95074 }', minLinks: 2, rareLinks: 25 },
  {
    prompt: 'Name a Looney Tunes character',
    where: '{ ?item wdt:P1080 wd:Q109322855 } UNION { ?item wdt:P1441 wd:Q622435 } ?item wdt:P31/wdt:P279* wd:Q95074 .',
    minLinks: 2, rareLinks: 25,
  },
  { prompt: 'Name a Batman villain', where: '?item wdt:P7047 wd:Q2695156 .', minLinks: 2, rareLinks: 25 },
  { prompt: 'Name an extreme sport', where: '{ ?item wdt:P31 wd:Q309162 } UNION { ?item wdt:P279 wd:Q309162 }', minLinks: 3, rareLinks: 30 },
  { prompt: 'Name a style of dance', where: '{ ?item wdt:P31 wd:Q201022 } UNION { ?item wdt:P279/wdt:P279? wd:Q11639 }', minLinks: 8, rareLinks: 40 },
  {
    prompt: 'Name a geologic eon, era, period, or epoch',
    where: 'VALUES ?kind { wd:Q630830 wd:Q392928 wd:Q568683 } ?item wdt:P31 ?kind .', minLinks: 8, rareLinks: 40,
  },
  {
    prompt: 'Name a city with a metro system',
    where: `?system wdt:P31/wdt:P279* wd:Q5503 ; wdt:P131 ?item . ?item wdt:P31/wdt:P279* wd:Q515 .`,
    minLinks: 20, rareLinks: 80,
  },
];

async function sparql(query, attempt = 0) {
  try {
    const response = await fetch('https://query.wikidata.org/sparql', {
      method: 'POST',
      headers: { 'User-Agent': userAgent, Accept: 'application/sparql-results+json' },
      body: new URLSearchParams({ format: 'json', query }),
      signal: AbortSignal.timeout(120000),
    });
    const text = await response.text();
    if (!response.ok || !text.startsWith('{')) throw new Error(`Wikidata responded with HTTP ${response.status}`);
    return JSON.parse(text).results.bindings;
  } catch (error) {
    if (attempt >= 2) throw error;
    await delay(5000 * (attempt + 1));
    return sparql(query, attempt + 1);
  }
}

const clean = (text) => text.replace(/\s*\([^)]*\)\s*/gu, ' ').replace(/\s+/gu, ' ').trim();
const key = (text) => clean(text).toLowerCase().normalize('NFKD').replace(/\p{M}/gu, '').replace(/[^\p{L}\p{N}]/gu, '');
const readable = (text) => text.length <= 60 && /\p{L}/u.test(text) && !/^Q\d+$/u.test(text) &&
  [...text].every((char) => !/\p{L}/u.test(char) || /\p{Script=Latin}/u.test(char));

// Names of countries that exist today, so that a former country's alternate name such as Germany
// for the Weimar Republic is not added.
const current = new Set((await sparql(`SELECT ?name WHERE {
  ?country wdt:P31 wd:Q3624078 . FILTER NOT EXISTS { ?country wdt:P576 ?ended }
  { ?country rdfs:label ?name } UNION { ?country skos:altLabel ?name } FILTER(LANG(?name) = "en")
}`)).map(({ name }) => key(name.value)));

let output = {};
try {
  output = JSON.parse(await readFile(outputUrl, 'utf8'));
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
const only = process.argv.slice(2);
for (const catalog of catalogs.filter(({ prompt }) => !only.length || only.includes(prompt))) {
  let rows;
  try {
    rows = await sparql(`SELECT ?item ?label ?links (GROUP_CONCAT(DISTINCT ?alias; separator="\\u001f") AS ?aliases) WHERE {
      ${catalog.where}
      ?item wikibase:sitelinks ?links . FILTER(?links >= ${catalog.minLinks})
      ?item rdfs:label ?label FILTER(LANG(?label) = "en")
      OPTIONAL { ?item skos:altLabel ?alias FILTER(LANG(?alias) = "en") }
    } GROUP BY ?item ?label ?links`);
  } catch (error) {
    console.error(`${catalog.prompt}: ${error.message}`);
    continue;
  }
  const blocked = (text) => catalog.notCurrentCountries && current.has(key(text));
  const byName = new Map();
  for (const { label, links, aliases } of rows) {
    const name = clean(label.value);
    if (!readable(name) || blocked(name) || catalog.skip?.test(name)) continue;
    const count = Number(links.value);
    if (byName.has(key(name)) && byName.get(key(name))[0] >= count) continue;
    const alternates = (aliases?.value ? aliases.value.split('\u001f') : []).map(clean)
      .filter((alias) => readable(alias) && key(alias).length >= 4 && !blocked(alias) && key(alias) !== key(name));
    byName.set(key(name), [count, name, [...new Set(alternates)].slice(0, 8)]);
  }
  output[catalog.prompt] = [...byName.values()].sort((a, b) => b[0] - a[0])
    .map(([count, name, alternates]) => [name, count >= catalog.rareLinks ? 60 : 85, alternates]);
  console.log(`${String(output[catalog.prompt].length).padStart(5)}  ${catalog.prompt}`);
}

await writeFile(outputUrl, `${JSON.stringify(output)}\n`);
