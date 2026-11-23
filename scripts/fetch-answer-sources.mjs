import { readFile, writeFile } from 'node:fs/promises';
import { gunzipSync, gzipSync } from 'node:zlib';

const classes = [
  ['cake', 'Q13276', 'P279'], ['cheese', 'Q10943', 'P279'], ['bread', 'Q7802', 'P279'],
  ['pasta-shape', 'Q2625877', 'P31'], ['pasta-shape', 'Q178', 'P279'],
  ['cocktail', 'Q134768', 'P31'], ['cocktail', 'Q134768', 'P279'], ['soup', 'Q41415', 'P279'],
  ['sandwich', 'Q28803', 'P279'], ['pie', 'Q13360264', 'P279'], ['cookie', 'Q13266', 'P279'],
  ['coffee', 'Q37756327', 'P279'], ['knot', 'Q527395', 'P279'],
  ['dog-breed', 'Q39367', 'P31'], ['instrument', 'Q34379', 'P31'],
  ['instrument', 'Q34379', 'P279'], ['brass', 'Q180744', 'P279'],
  ['programming-language', 'Q9143', 'P31'], ['board-game', 'Q131436', 'P31'],
  ['card-game', 'Q142714', 'P31'], ['console', 'Q8076', 'P31'],
  ['mountain-range', 'Q46831', 'P31'], ['desert', 'Q8514', 'P31'], ['strait', 'Q37901', 'P31'],
  ['sea', 'Q165', 'P31'], ['cave', 'Q35509', 'P31'], ['volcano', 'Q8072', 'P31'],
  ['national-park', 'Q46169', 'P31'], ['us-state', 'Q35657', 'P31'],
  ['art-movement', 'Q968159', 'P31'], ['constellation', 'Q8928', 'P31'],
  ['greek-letter', 'Q19793459', 'P31'], ['minerals', 'Q7946', 'P31'],
  ['minerals', 'Q8063', 'P31'], ['gemstone', 'Q83437', 'P31'],
];
const everydayClasses = [
  ['salad', 'Q9266', 'P279'], ['dumpling', 'Q1854639', 'P279'], ['pastry', 'Q477248', 'P279'],
  ['pastry', 'Q192783', 'P279'], ['condiment', 'Q2596997', 'P279'], ['sauce', 'Q178359', 'P279'],
  ['rice-dish', 'Q21976260', 'P279'], ['pasta-dish', 'Q18679685', 'P279'], ['pasta-dish', 'Q18679685', 'P31'],
  ['curry', 'Q164606', 'P279'], ['dip', 'Q2046560', 'P279'], ['root-vegetable', 'Q20136', 'P279'],
  ['apple', 'Q15731356', 'P31'], ['beef', 'Q2051651', 'P279'], ['spice', 'Q42527', 'P279'],
  ['spice', 'Q207123', 'P279'], ['typeface', 'Q17451', 'P31'], ['medical-specialty', 'Q930752', 'P31'],
  ['browser', 'Q6368', 'P31'], ['operating-system', 'Q9135', 'P31'], ['video-game-genre', 'Q659563', 'P31'],
  ['literary-genre', 'Q223393', 'P31'], ['fairy-tale', 'Q699', 'P31'], ['nursery-rhyme', 'Q1123037', 'P31'],
  ['unit-of-length', 'Q1978718', 'P31'], ['search-engine', 'Q4182287', 'P31'], ['bicycle', 'Q11442', 'P279'],
  ['minerals', 'Q12089225', 'P31'], ['hat', 'Q80151', 'P279'], ['poem', 'Q89522629', 'P31'],
  ['horse-breed', 'Q1160573', 'P31'], ['boy-band', 'Q216337', 'P31'], ['girl-group', 'Q641066', 'P31'],
  ['hairstyle', 'Q327496', 'P279'], ['shoe', 'Q22676', 'P279'], ['furniture', 'Q14745', 'P279'],
];

const output = process.argv[2];
if (!output) throw new Error('Pass an output path for the compressed source snapshot.');
const supplement = process.argv.includes('--supplement');
const regional = process.argv.includes('--regional');
const taxa = process.argv.includes('--taxa');
const everyday = process.argv.includes('--everyday');
const food = process.argv.includes('--food');
const groups = process.argv.includes('--groups');
const beetles = process.argv.includes('--beetles');
const source = supplement || regional || taxa || everyday || food || groups || beetles ? JSON.parse(gunzipSync(await readFile(output))) : { collections: {} };
const endpoint = new URL('https://query.wikidata.org/sparql');
const articlePattern = `?article schema:about ?item; schema:isPartOf <https://en.wikipedia.org/>.
  ?item rdfs:label ?label. FILTER(LANG(?label) = "en")`;
const aliases = `OPTIONAL { ?item skos:altLabel ?alias. FILTER(LANG(?alias) = "en") }`;
const agent = 'KrillionAnswerCoverage/1.0 (https://github.com/lucasvthomp/krillion)';

async function query(name, sparql) {
  const url = new URL(endpoint);
  url.searchParams.set('format', 'json');
  url.searchParams.set('query', sparql);
  const response = await fetch(url, {
    headers: { 'User-Agent': agent, Accept: 'application/sparql-results+json' },
    signal: AbortSignal.timeout(50000),
  });
  if (!response.ok) throw new Error(`${name}: Wikidata returned HTTP ${response.status}`);
  const { results } = await response.json();
  return results.bindings;
}

function store(collection, bindings) {
  const items = new Map();
  for (const { item, label, aka, number, symbol } of bindings) {
    const id = item.value.split('/').at(-1);
    const existing = items.get(id);
    const names = aka?.value.split('|').filter(Boolean) ?? [];
    if (existing) {
      existing.aliases.push(...names);
      continue;
    }
    const entry = { id, name: label.value, aliases: names };
    if (number) entry.atomicNumber = Number(number.value);
    if (symbol) entry.symbol = symbol.value;
    items.set(id, entry);
  }
  source.collections[collection] = [...items.values()]
    .map((item) => ({ ...item, aliases: [...new Set(item.aliases)].sort() }))
    .sort((a, b) => a.name.localeCompare(b.name, 'en') || a.id.localeCompare(b.id));
}

const activeClasses = food ? everydayClasses.slice(0, 5) : everyday ? everydayClasses : supplement || regional || taxa || groups || beetles ? [] : classes;
const batchSize = food ? 2 : 5;
for (let start = 0; start < activeClasses.length; start += batchSize) {
  const batch = activeClasses.slice(start, start + batchSize);
  const params = batch.map(([group, item, property]) => `("${group}" wd:${item} wdt:${property})`).join(' ');
  try {
    const result = await query(batch.map(([name]) => name).join(', '), `SELECT ?group ?item ?label
      (GROUP_CONCAT(DISTINCT ?alias; separator="|") AS ?aka) WHERE {
      VALUES (?group ?class ?predicate) { ${params} }
      ?item ?predicate ?class.
      ${articlePattern}
      ${aliases}
    } GROUP BY ?group ?item ?label`);
    for (const [group] of batch) {
      const previous = source.collections[group] ?? [];
      store(group, result.filter((row) => row.group.value === group));
      const merged = new Map([...previous, ...source.collections[group]].map((entry) => [entry.id, entry]));
      source.collections[group] = [...merged.values()];
    }
    console.log(`Added ${result.length} source rows for ${batch.map(([name]) => name).join(', ')}`);
  } catch (error) {
    console.error(error.message);
  }
}

const supplemental = [
  ['film-wes-anderson', '?director rdfs:label "Wes Anderson"@en; wdt:P31 wd:Q5. ?item wdt:P31 wd:Q11424; wdt:P57 ?director.'],
  ['film-matt-damon', '?item wdt:P31 wd:Q11424; wdt:P161 wd:Q194318.'],
  ['film-natalie-portman', '?item wdt:P31 wd:Q11424; wdt:P161 wd:Q37876.'],
  ['film-james-cameron', '?item wdt:P31 wd:Q11424; wdt:P57|wdt:P58|wdt:P162 wd:Q42574.'],
  ['pasta-shape', '?item wdt:P31 wd:Q2625877.'],
  ['airline', '?item wdt:P31 wd:Q46970.'],
  ['currency', '?item wdt:P31 wd:Q8142.'],
  ['botanical-garden', '?item wdt:P31 wd:Q167346.'],
  ['architecture', '?item wdt:P31 wd:Q32880.'],
];
const special = regional || taxa || everyday || food || groups || beetles ? [] : supplement ? supplemental : [
  ['country', '?item wdt:P463 wd:Q1065; wdt:P297 ?iso.'],
  ['element', '?item wdt:P31 wd:Q11344; wdt:P1086 ?number; wdt:P246 ?symbol. FILTER(?number >= 1 && ?number <= 118)', '?number ?symbol'],
];

for (const [collection, statement, extra = ''] of special) {
  try {
    const result = await query(collection, `SELECT ?item ?label ${extra}
      (GROUP_CONCAT(DISTINCT ?alias; separator="|") AS ?aka) WHERE {
      ${statement}
      ${articlePattern}
      ${aliases}
    } GROUP BY ?item ?label ${extra}`);
    if (result.length) store(collection, result);
    console.log(`${collection}: ${result.length} source records`);
  } catch (error) {
    console.error(error.message);
  }
}

if (regional) {
  try {
    const result = await query('country facts', `SELECT DISTINCT ?item ?field ?value ?label WHERE {
      ?item wdt:P463 wd:Q1065; wdt:P297 ?iso.
      VALUES (?field ?property) {
        ("continents" wdt:P30)
        ("languages" wdt:P37)
        ("orgs" wdt:P463)
        ("borders" wdt:P47)
        ("capitals" wdt:P36)
        ("population" wdt:P1082)
        ("monarchy" wdt:P122)
      }
      ?item ?property ?value.
      OPTIONAL { ?value rdfs:label ?label. FILTER(LANG(?label) = "en") }
    }`);
    const countries = source.collections.country;
    const lookup = new Map(countries.map((country) => [country.id, country]));
    for (const { item, field, value, label } of result) {
      const record = lookup.get(item.value.split('/').at(-1));
      if (!record) continue;
      const collection = record[field.value] ??= [];
      const id = value.value.split('/').at(-1);
      const fact = label ? [id, label.value] : [id];
      if (!collection.some(([stored]) => stored === id)) collection.push(fact);
    }
    for (const country of countries) {
      for (const value of Object.values(country)) {
        if (Array.isArray(value) && value.every(Array.isArray)) value.sort(([a], [b]) => a.localeCompare(b, 'en'));
      }
    }
    console.log(`country facts: ${result.length} records`);
  } catch (error) {
    console.error(error.message);
  }
  try {
    const result = await query('Wes Anderson film credits', `SELECT ?item ?label
      (GROUP_CONCAT(DISTINCT ?alias; separator="|") AS ?aka) WHERE {
      ?director rdfs:label "Wes Anderson"@en; wdt:P31 wd:Q5.
      ?item wdt:P31 wd:Q11424; wdt:P57 ?director.
      ${articlePattern}
      ${aliases}
    } GROUP BY ?item ?label`);
    store('film-wes-anderson', result);
    console.log(`film-wes-anderson: ${result.length} source records`);
  } catch (error) {
    console.error(error.message);
  }
  try {
    const result = await query('film cast', `SELECT ?group ?item ?label
      (GROUP_CONCAT(DISTINCT ?alias; separator="|") AS ?aka) WHERE {
      VALUES (?group ?actorName ?leading) {
        ("film-matt-damon" "Matt Damon"@en false)
        ("film-tom-hanks" "Tom Hanks"@en true)
        ("film-chalamet" "Timothée Chalamet"@en true)
        ("film-will-smith" "Will Smith"@en true)
        ("film-samuel-jackson" "Samuel L. Jackson"@en true)
        ("film-harrison-ford" "Harrison Ford"@en true)
      }
      ?actor rdfs:label ?actorName; wdt:P31 wd:Q5.
      ?item p:P161 ?cast; wdt:P31 wd:Q11424.
      ?cast ps:P161 ?actor.
      OPTIONAL { ?cast pq:P1545 ?rank. }
      FILTER(!?leading || (BOUND(?rank) && xsd:integer(?rank) <= 5))
      ${articlePattern}
      ${aliases}
    } GROUP BY ?group ?item ?label`);
    for (const group of new Set(result.map((row) => row.group.value))) {
      store(group, result.filter((row) => row.group.value === group));
    }
    console.log(`film cast: ${result.length} records`);
  } catch (error) {
    console.error(error.message);
  }
}

async function taxon([name, parent]) {
  try {
    const result = await query(name, `SELECT ?item (MIN(?common) AS ?label)
      (GROUP_CONCAT(DISTINCT ?common; separator="|") AS ?aka) WHERE {
      ?item wdt:P105 wd:Q7432; wdt:P171+ wd:${parent}; wdt:P1843 ?common.
      FILTER(LANG(?common) = "en")
      ?article schema:about ?item; schema:isPartOf <https://en.wikipedia.org/>.
    } GROUP BY ?item`);
    if (result.length) store(name, result);
    console.log(`${name}: ${result.length} source records`);
  } catch (error) {
    console.error(`${name}: ${error.message}`);
  }
}

if (supplement) {
  for (const pair of [['mammal', 'Q7377'], ['bird', 'Q5113']]) await taxon(pair);
}
if (taxa) {
  const groups = [
    ['rodent', 'Q10850'], ['wild-cat', 'Q25265'], ['shark', 'Q7372'], ['penguin', 'Q9147'],
    ['baleen-whale', 'Q168366'], ['primate', 'Q7380'], ['amphibian', 'Q10908'],
    ['spider', 'Q1357'], ['owl', 'Q25222'], ['waterfowl', 'Q7556'], ['turtle', 'Q223044'],
  ];
  for (let start = 0; start < groups.length; start += 3) {
    await Promise.all(groups.slice(start, start + 3).map(taxon));
  }
}

if (groups) {
  await taxon(['marsupial', 'Q25336']);
  const parents = [
    ['rodent-groups', 'Q10850'], ['amphibian-groups', 'Q10908'],
    ['turtle-groups', 'Q223044'], ['waterfowl-groups', 'Q7556'], ['marsupial-groups', 'Q25336'],
  ];
  for (const [name, parent] of parents) {
    try {
      const result = await query(name, `SELECT ?item (MIN(?common) AS ?label) WHERE {
        VALUES ?rank { wd:Q34740 wd:Q35409 }
        ?item wdt:P105 ?rank; wdt:P171+ wd:${parent}; wdt:P1843 ?common.
        FILTER(LANG(?common) = "en")
        ?article schema:about ?item; schema:isPartOf <https://en.wikipedia.org/>.
      } GROUP BY ?item`);
      if (result.length) store(name, result);
      console.log(`${name}: ${result.length} source records`);
    } catch (error) {
      console.error(`${name}: ${error.message}`);
    }
  }
}
if (beetles) {
  await Promise.all([
    taxon(['ground-beetle', 'Q27046']),
    taxon(['stag-beetle', 'Q208786']),
    taxon(['longhorn-beetle', 'Q205295']),
  ]);
}

if (!Object.values(source.collections).some((entries) => entries.length)) throw new Error('No source records fetched.');
await writeFile(output, gzipSync(JSON.stringify(source)));
for (const [collection, records] of Object.entries(source.collections)) {
  console.log(`${collection}: ${records.length}`);
}
