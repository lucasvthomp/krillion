import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { promptKey } from './answer-coverage-rules.mjs';
import { readReviewDefinitions } from './answer-sweep.mjs';
import { archiveText, fileTable, table } from './catalog-tables.mjs';
import { wordnetAnswers } from './wordnet-answers.mjs';

const directory = process.argv[2];
if (!directory) throw new Error('Pass the directory containing the downloaded catalogs.');
const promptsById = await readReviewDefinitions();
const pools = {};

function add(id, source, candidates) {
  const prompt = promptsById.get(id);
  if (!prompt) throw new Error(`Unknown prompt ID ${id}`);
  const key = promptKey(prompt.wording);
  const sources = pools[key] ??= {};
  sources[source] = candidates;
}

const scientific = /^[\p{Lu}][\p{L}-]+ [\p{Ll}][\p{Ll}-]+$/u;
const spiderRows = table(archiveText(directory, 'spiders.zip', 'NameUsage.tsv'), '\t');
const spiderSpecies = new Map();
for (const row of spiderRows) {
  const name = `${row['col:genericName']} ${row['col:specificEpithet']}`;
  if (row['col:rank'] === 'species' && row['col:status'] === 'accepted' && scientific.test(name)) {
    spiderSpecies.set(row['col:ID'], [name, 85, [], row['col:ID']]);
  }
}
for (const row of spiderRows) {
  const name = `${row['col:genericName']} ${row['col:specificEpithet']}`;
  if (row['col:rank'] === 'species' && row['col:status'] === 'synonym' && scientific.test(name)) {
    spiderSpecies.get(row['col:parentID'])?.[2].push(name);
  }
}
add('0093', 'wsc', [...spiderSpecies.values()]);

const trees = table(archiveText(directory, 'trees.zip', 'taxon.txt'), '\t');
add('0123', 'bgci', trees.filter((row) => row.taxonRank === 'species' && row.taxonomicStatus === 'accepted')
  .map((row) => [`${row.genus} ${row.specificEpithet}`, 85, [], row.taxonID])
  .filter(([name]) => scientific.test(name)));

const birdRecords = JSON.parse(await readFile(join(directory, 'birds.json'), 'utf8'));
const birds = birdRecords.filter((row) => row[1] === 'species').map((row) => ({
  id: row[19] || row[0], order: row[2], family: row[3], scientific: row[5], common: row[8],
  extinct: row[14], status: row[15],
}));
if (birds.length < 11000 || !birds.some((bird) => bird.common === 'Plumed Whistling Duck')) {
  throw new Error('Unexpected AviList version or column layout');
}
const liveBirds = birds.filter(({ extinct, status }) => status !== 'EX' &&
  (!/\bextinct\b/iu.test(extinct ?? '') || /^(?:Extinct in the Wild|previously Extinct in the Wild, but reintroduced)$/iu.test(extinct)));
const birdRow = ({ common, scientific: name, id }) => [common || name, common ? 60 : 85, common ? [name] : [], id];
const birdOrders = (orders) => liveBirds.filter((bird) => orders.includes(bird.order));
const birdFamilies = (families) => liveBirds.filter((bird) => families.includes(bird.family));
const waterOrders = ['Anseriformes', 'Gaviiformes', 'Podicipediformes', 'Procellariiformes', 'Sphenisciformes', 'Phaethontiformes'];
const waterFamilies = ['Alcidae', 'Laridae', 'Scolopacidae', 'Recurvirostridae', 'Pelecanidae', 'Anhingidae', 'Phalacrocoracidae', 'Haematopodidae', 'Ciconiidae', 'Phoenicopteridae'];
const flightlessOrders = ['Apterygiformes', 'Casuariiformes', 'Rheiformes', 'Sphenisciformes', 'Struthioniformes'];
const songbirdOrders = birdOrders(['Passeriformes']);
const oscinesBegin = songbirdOrders.findIndex((bird) => bird.family === 'Menuridae');
if (oscinesBegin < 100 || oscinesBegin >= 2000) throw new Error('Unexpected passerine sequence in AviList');
const birdScopes = {
  '0009': birdOrders(['Accipitriformes', 'Cathartiformes', 'Falconiformes', 'Strigiformes']),
  '0044': birdOrders(['Sphenisciformes']), '0113': birdOrders(['Strigiformes']),
  '0134': birdOrders(['Psittaciformes']), '0148': birdOrders(['Anseriformes']),
  '0183': liveBirds.filter(({ status }) => ['VU', 'EN', 'CR'].includes(status)),
  '0219': songbirdOrders.slice(oscinesBegin), '0302': birdOrders(flightlessOrders),
  '0721': [...birdOrders(waterOrders), ...birdFamilies(waterFamilies)], '0849': birdOrders(flightlessOrders),
};
for (const [id, records] of Object.entries(birdScopes)) add(id, 'avilist', records.map(birdRow));

const mammals = table(archiveText(directory, 'mammals.zip', 'MDD/MDD_v2.5_6904species.csv'));
const wildMammals = mammals.filter(({ domestic, extinct }) => domestic === '0' && extinct === '0');
const mammalNames = (mammal) => [mammal.mainCommonName, ...mammal.otherCommonNames.split('|')]
  .map((name) => name.trim()).filter((name) => name && name !== 'NA');
const mammalRow = (mammal) => {
  const names = mammalNames(mammal);
  const scientificName = mammal.sciName.replaceAll('_', ' ');
  return [names[0] || scientificName, names.length ? 60 : 85, [...names.slice(1), ...(names.length ? [scientificName] : [])], mammal.id];
};
const mammalOrders = (orders) => wildMammals.filter((mammal) => orders.includes(mammal.order));
const mammalFamilies = (families) => wildMammals.filter((mammal) => families.includes(mammal.family));
const native = (continent) => wildMammals.filter((mammal) => mammal.continentDistribution.split('|').includes(continent));
const whales = wildMammals.filter((record) => record.suborder === 'Cetacea' &&
  /\bwhale\b/iu.test(record.mainCommonName));
const marine = mammalFamilies([
  'Balaenidae', 'Balaenopteridae', 'Cetotheriidae', 'Eschrichtiidae', 'Physeteridae', 'Kogiidae', 'Ziphiidae',
  'Delphinidae', 'Phocoenidae', 'Monodontidae', 'Dugongidae', 'Odobenidae', 'Otariidae', 'Phocidae',
]).filter((mammal) => !['Pusa_sibirica', 'Pusa_saimensis', 'Pusa_caspica', 'Sotalia_fluviatilis'].includes(mammal.sciName));
const mammalScopes = {
  '0023': mammalFamilies(['Felidae']), '0051': whales, '0079': mammalOrders(['Primates']),
  '0100': mammalOrders(['Rodentia']), '0183': wildMammals.filter(({ iucnStatus }) => ['VU', 'EN', 'CR'].includes(iucnStatus)),
  '0211': mammalOrders(['Didelphimorphia', 'Paucituberculata', 'Microbiotheria', 'Dasyuromorphia', 'Peramelemorphia', 'Notoryctemorphia', 'Diprotodontia']),
  '0351': native('Africa'), '0388': [...marine, ...mammalFamilies(['Trichechidae', 'Iniidae', 'Platanistidae', 'Pontoporiidae']),
    ...wildMammals.filter(({ sciName }) => ['Pusa_sibirica', 'Pusa_saimensis', 'Pusa_caspica', 'Sotalia_fluviatilis'].includes(sciName))],
  '0389': [...mammalFamilies(['Felidae', 'Hyaenidae']), ...marine],
  '0759': native('South America'), '0778': marine,
  '0848': mammals.filter(({ extinct }) => extinct === '1'),
};
for (const [id, records] of Object.entries(mammalScopes)) add(id, 'mdd', records.map(mammalRow));

const colors = /\b(?:black|white|red|orange|yellow|green|blue|violet|purple|pink|brown|grey|gray|golden|silver|scarlet|crimson|chestnut|buff|rufous|ochre|indigo|azure|cobalt|cinnamon|bronze|copper|olive|amber|russet|vermilion)\b/iu;
const oneWord = /^[\p{L}]+$/u;
const nameScopes = {
  '0001': (name) => /^k/iu.test(name), '0120': (name) => /^h/iu.test(name),
  '0281': (name) => /g/iu.test(name), '0316': (name) => /x/iu.test(name), '0330': (name) => /^b/iu.test(name),
  '0494': (name) => !/a/iu.test(name.normalize('NFKD')), '0545': (name) => colors.test(name),
  '0608': (name) => /y$/iu.test(name), '0652': (name) => oneWord.test(name) && name.length === 4,
  '0738': (name) => oneWord.test(name) && /ck/iu.test(name), '0828': (name) => oneWord.test(name) && /^t/iu.test(name),
  '0870': (name) => oneWord.test(name) && name.length >= 7,
};
for (const [id, test] of Object.entries(nameScopes)) {
  add(id, 'avilist', liveBirds.filter(({ common }) => common && test(common)).map(({ id, common }) => [common, 60, [], id]));
  add(id, 'mdd', wildMammals.flatMap((mammal) => {
    const [name, ...aliases] = mammalNames(mammal).filter(test);
    return name ? [[name, 60, aliases, mammal.id]] : [];
  }));
}

const fossils = await fileTable(directory, 'fossils-verified.csv');
const vertebrateClasses = new Set(['Aves', 'Mammalia', 'Reptilia', 'Amphibia', 'Actinopteri', 'Actinopterygii',
  'Chondrichthyes', 'Placodermi', 'Acanthodii', 'Sarcopterygii', 'Osteichthyes', 'Myxini', 'Petromyzontida']);
const vertebrates = fossils.filter((row) => row.record_type === 'txn' && !row.flags && row.orig_no === row.taxon_no &&
  row.is_extant === 'extinct' && row.phylum === 'Chordata' && vertebrateClasses.has(row.class) &&
  Number(row.n_occs) > 0 && scientific.test(row.taxon_name));
const fossilRow = (row) => [row.taxon_name, 85, [], row.orig_no];
add('0848', 'pbdb', vertebrates.map(fossilRow));
add('0288', 'pbdb', vertebrates.filter((row) => row.class === 'Mammalia' && Number(row.lastapp_min_ma) >= .01).map(fossilRow));

const europe = new Set('AD AL AT BA BE BG BY CH CY CZ DE DK EE ES FI FR GB GR HR HU IE IS IT LI LT LU LV MC MD ME MK MT NL NO PL PT RO RS SE SI SK SM UA VA XK'.split(' '));
const cities = archiveText(directory, 'cities.zip', 'cities15000.txt').split(/\r?\n/u).filter(Boolean).map((line) => {
  const [id, name, ascii, , , longitude, classification, feature, country, , , , , , population] = line.split('\t');
  return { id, name, ascii, longitude: Number(longitude), classification, feature, country, population: Number(population) };
});
const populated = cities.filter(({ classification, feature }) => classification === 'P' && /^(?:PPL|PPLC|PPLA[1-5]?)$/u.test(feature));
const urban = populated.filter(({ feature, population, name }) =>
  (feature === 'PPLC' || feature === 'PPLA' || /^PPLA[2-5]$/u.test(feature) && population >= 50000) &&
  !/\b(?:Old Town|District|Prefecture|County)\b/iu.test(name));
const cityRow = (city, test = () => true) => [city.name, city.population >= 1000000 ? 30 : city.population >= 200000 ? 60 : 85,
  city.ascii && city.ascii !== city.name && test(city.ascii) ? [city.ascii] : [], city.id];
const cityScopes = {
  '0585': (city) => city.population > 100000 && (europe.has(city.country) || city.country === 'RU' && city.longitude < 58),
  '0605': (city) => /\bcity\b/iu.test(city.name),
  '0715': (city) => /ton$/iu.test(city.name),
  '0743': (city) => /^(?:los|las|la|le|el|the) /iu.test(city.name),
  '0872': (city) => /(?:ville|burg|burgh|bourg)$/iu.test(city.name),
  '0878': (city) => /^d/iu.test(city.name),
};
for (const [id, test] of Object.entries(cityScopes)) {
  add(id, 'geonames', urban.filter(test).map((city) => cityRow(city, (ascii) => test({ ...city, name: ascii }))));
}
add('0599', 'geonames', populated.filter(({ country, feature }) => country === 'GB' && feature !== 'PPL').map((city) => cityRow(city)));

const airports = await fileTable(directory, 'airports.csv');
const namedInternational = /\b(?:international|internacional|internationale|internazionale|internasjonale|internationaal|internationalen)\b/iu;
add('0501', 'ourairports', airports.filter((row) => ['large_airport', 'medium_airport'].includes(row.type) &&
  (row.icao_code || row.iata_code) && namedInternational.test(row.name))
  .map((row) => [row.name, row.type === 'large_airport' ? 60 : 85, [], row.id]));

wordnetAnswers(directory, add);

const snapshot = new URL('answer-catalogs.json.gz', import.meta.url);
await writeFile(snapshot, gzipSync(JSON.stringify(pools)));
const counts = {};
for (const sources of Object.values(pools)) for (const [source, rows] of Object.entries(sources)) {
  counts[source] = (counts[source] ?? 0) + rows.length;
}
console.log(JSON.stringify({ prompts: Object.keys(pools).length, candidateRows: counts }, null, 2));
