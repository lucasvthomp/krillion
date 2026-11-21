import { exactKey } from '../docs/answers.mjs';

const collections = [
  ['pasta-shape', /^name a pasta shape$/u],
  ['cheese', /^name a type of cheese$/u],
  ['dog-breed', /^name a dog breed$/u],
  ['bread', /^name a type of bread$/u],
  ['card-game', /^name a card game$/u],
  ['cocktail', /^name a cocktail$/u],
  ['board-game', /^name a board game$/u],
  ['desert', /^name a desert$/u],
  ['coffee', /^name a coffee drink$/u],
  ['console', /^name a video game console$/u],
  ['programming-language', /^name a programming language$/u],
  ['mountain-range', /^name a mountain range$/u],
  ['soup', /^name a soup$/u],
  ['sandwich', /^name a type of sandwich$/u],
  ['knot', /^name a type of knot$/u],
  ['strait', /^name a strait \(a narrow sea passage between two landmasses\)$/u],
  ['cake', /^name a type of cake$/u],
  ['pie', /^name a type of pie$/u],
  ['us-state', /^name a us state$/u],
  ['sea', /^name a sea$/u],
  ['minerals', /^name a rock or mineral$/u],
  ['brass', /^name a brass instrument$/u],
  ['cookie', /^name a type of cookie \(brands don't count\)$/u],
  ['instrument', /^name a musical instrument$/u],
  ['national-park', /^name a national park anywhere in the world$/u],
  ['airline', /^name an airline$/u],
  ['botanical-garden', /^name a botanical garden$/u],
  ['architecture', /^name an architectural style$/u],
  ['rodent', /^name a rodent$/u],
  ['wild-cat', /^name a species of wild cat$/u],
  ['shark', /^name a shark species$/u],
  ['penguin', /^name a penguin species$/u],
  ['baleen-whale', /^name a whale species$/u],
  ['primate', /^name a primate species$/u],
  ['amphibian', /^name an amphibian$/u],
  ['spider', /^name a species of spider$/u],
  ['owl', /^name an owl species$/u],
  ['waterfowl', /^name a type of waterfowl$/u],
  ['turtle', /^name a type of turtle or tortoise$/u],
  ['salad', /^name a type of salad$/u],
  ['dumpling', /^name a type of dumpling$/u],
  ['pastry', /^name a type of pastry or doughnut$/u],
  ['condiment', /^name a condiment$/u],
  ['sauce', /^name a sauce$/u],
  ['rice-dish', /^name a rice dish$/u],
  ['pasta-dish', /^name a pasta dish$/u],
  ['curry', /^name a curry$/u],
  ['dip', /^name a dip$/u],
  ['root-vegetable', /^name a root vegetable$/u],
  ['apple', /^name an apple variety$/u],
  ['beef', /^name a cut of beef$/u],
  ['spice', /^name an herb or spice$/u],
  ['typeface', /^name a font$/u],
  ['medical-specialty', /^name a medical specialty$/u],
  ['browser', /^name a web browser$/u],
  ['operating-system', /^name a computer operating system$/u],
  ['video-game-genre', /^name a video game genre$/u],
  ['literary-genre', /^name a literary genre$/u],
  ['fairy-tale', /^name a fairy tale$/u],
  ['nursery-rhyme', /^name a nursery rhyme$/u],
  ['unit-of-length', /^name a unit of distance$/u],
  ['search-engine', /^name a search engine$/u],
  ['bicycle', /^name a type of bicycle$/u],
  ['hat', /^name a style of hat$/u],
  ['poem', /^name a type of poem$/u],
  ['horse-breed', /^name a horse breed$/u],
  ['boy-band', /^name a boy band$/u],
  ['girl-group', /^name a girl group$/u],
  ['hairstyle', /^name a hairstyle$/u],
  ['shoe', /^name a type of shoe$/u],
  ['furniture', /^name a piece of furniture$/u],
  ['film-wes-anderson', /^name a film directed by wes anderson$/u],
  ['film-matt-damon', /^name a movie matt damon appears in$/u],
  ['film-natalie-portman', /^name a movie featuring natalie portman$/u],
  ['film-james-cameron', /^name a movie james cameron directed, wrote, or produced$/u],
  ['film-tom-hanks', /^name a movie starring tom hanks$/u],
  ['film-chalamet', /^name a movie starring timothée chalamet$/u],
  ['film-will-smith', /^name a movie starring will smith$/u],
  ['film-samuel-jackson', /^name a movie starring samuel l\. jackson$/u],
  ['film-harrison-ford', /^name a movie starring harrison ford$/u],
];

const excluded = {
  cake: new Set(['amish friendship bread', 'dried fruit bread', 'monkey bread']),
  brass: new Set(['didgeridoo', 'marching brass instrument', 'nagak', 'natural brass instrument']),
  cookie: new Set([
    'berger cookies', 'chips ahoy!', 'cracker', 'filipinos', 'girl scout cookies',
    'lorna doone', 'michel et augustin', 'milano', 'moonlight', 'nilla wafers',
    'nutter butter', 'smiley cookies', 'thin mints', 'tiel carnival cake',
  ]),
  'pasta-shape': new Set(['banana pasta']),
  'wild-cat': new Set(['cat', 'domestic cat', 'feral cat']),
};

const legacyCountries = new Set(['East Germany', 'Soviet Union', 'Taiwan', 'Yugoslavia']);
const countryNames = new Map([
  ["People's Republic of China", ['China', "People's Republic of China"]],
  ['Kingdom of the Netherlands', ['Netherlands', 'The Netherlands']],
  ['Czech Republic', ['Czechia', 'Czech Republic']],
  ['Cape Verde', ['Cabo Verde', 'Cape Verde']],
  ['Ivory Coast', ['Ivory Coast', "Côte d’Ivoire"]],
  ['Turkey', ['Turkey', 'Türkiye']],
  ['United States', ['United States', 'United States of America']],
  ['The Bahamas', ['Bahamas', 'The Bahamas']],
  ['The Gambia', ['Gambia', 'The Gambia']],
]);

// Each donor prompt is narrower than its recipient. Keep this list directional.
const related = new Map([
  ['name a dog breed', ['name a dog breed that on average weighs 25+ pounds (11 kg)']],
  ['name a national park anywhere in the world', ['name a us national park']],
  ['name a musical instrument', [
    'name a brass instrument',
    'name an instrument found in a symphony orchestra',
  ]],
  ['name a pixar character', ['name a pixar protagonist (co-leads count)']],
  ['name a fruit', [
    'name a citrus fruit',
    'name a tropical fruit',
    'name a fruit with a core',
    'name a fruit bigger than an apple',
    'name a fruit normally eaten with its skin on',
  ]],
  ['name a bird of prey', ['name an owl species']],
  ['name a bird that lives in or by water', ['name a penguin species', 'name a type of waterfowl']],
  ['name a language spoken in europe', ['name a language that is an official language of a european country']],
  ['name a language with more than 10 million total speakers', ['name a language with more than 50 million total speakers']],
  ['name a sport or discipline ever contested or demonstrated at the winter olympics', [
    'name a sport contested at the winter olympics',
  ]],
  ['name a movie from pixar, dreamworks animation, illumination, disney animation (including disneytoon and disney tv animation), sony pictures animation or blue sky studios', [
    'name a pixar feature film',
    'name a walt disney animation studios feature film',
    'name a dreamworks animation movie',
  ]],
]);

export function promptKey(text) {
  return exactKey(text).replace(/[’‘]/gu, "'").replace(/[“”"]/gu, '').replace(/\.$/u, '');
}

export function donorKeys(prompt) {
  return related.get(promptKey(prompt)) ?? [];
}

function letters(text) {
  return exactKey(text).normalize('NFKD').replace(/\p{M}/gu, '').replace(/^the /u, '').replace(/[^a-z]/gu, '');
}

function countryFilter(prompt) {
  if (!prompt.startsWith('name a country ')) return null;
  const starts = prompt.match(/(?:whose name |that )starts with (?:the letter )?([a-z])$/u);
  if (starts) return (name) => name.startsWith(starts[1]);
  const ends = prompt.match(/whose name ends in (?:the letter )?([a-z])$/u);
  if (ends) return (name) => name.endsWith(ends[1]);
  const has = prompt.match(/(?:with the letter |that has a )([a-z]) in its name(?: \(.*\))?$/u);
  if (has) return (name) => name.includes(has[1]);
  const lacks = prompt.match(/without the letter ([a-z]) in its name$/u);
  if (lacks) return (name) => !name.includes(lacks[1]);
  const both = prompt.match(/with both an? ([a-z]) and an? ([a-z]) in its name$/u);
  if (both) return (name) => name.includes(both[1]) && name.includes(both[2]);
  if (prompt.endsWith('whose english name contains j, k, or v')) return (name) => /[jkv]/u.test(name);
  if (prompt.endsWith('with a four-letter english name')) return (name) => name.length === 4;
  if (prompt.endsWith('with a five-letter english name')) return (name) => name.length === 5;
  if (prompt.endsWith('with 8 or more letters')) return (name) => name.length >= 8;
  if (prompt.endsWith('with in in its name')) return (name) => name.includes('in');
  if (prompt.endsWith('with and in its name')) return (_name, raw) => /\band\b/iu.test(raw);
  if (prompt.includes('name starts with two consonants')) return (name) => /^[b-df-hj-np-tv-z]{2}/u.test(name);
  if (prompt.endsWith('whose second letter is o')) return (name) => name[1] === 'o';
  if (prompt.includes('whose name uses only one vowel letter')) {
    return (name) => new Set(name.match(/[aeiou]/gu)).size === 1;
  }
  return null;
}

function elementFilter(prompt) {
  if (prompt === 'name a chemical element whose name ends in -ium') return (item) => letters(item.name).endsWith('ium');
  if (prompt === 'name a chemical element lighter than iron') return (item) => item.atomicNumber < 26;
  if (prompt === 'name a chemical element whose symbol is one letter') return (item) => item.symbol?.length === 1;
  if (prompt === 'name a chemical element whose name has 6 or fewer letters') return (item) => letters(item.name).length <= 6;
  return null;
}

const regions = new Map([
  ['africa', ['Q15']],
  ['asia', ['Q48']],
  ['europe', ['Q46']],
  ['oceania', ['Q55643']],
  ['americas', ['Q49', 'Q18', 'Q828']],
]);

function factIncludes(item, field, values) {
  return (item[field] ?? []).some(([value]) => values.includes(value));
}

function geographyScope(prompt) {
  const region = prompt.match(/^name a country in (africa|asia|oceania)$/u)?.[1] ??
    (/^name a country in the americas \(north, central, or south\)$/u.test(prompt) ? 'americas' : null) ??
    (prompt === 'name a european country' ? 'europe' : null);
  if (region) return { field: 'country', filter: (item) => factIncludes(item, 'continents', regions.get(region)) };
  if (prompt === 'name a country in the european union') {
    return { field: 'country', filter: (item) => factIncludes(item, 'orgs', ['Q458']) && item.id !== 'Q145' };
  }
  if (prompt === 'name a country with more than 100 million people') {
    return {
      field: 'country',
      filter: (item) => Boolean(item.population?.length) && item.population.every(([value]) => Number(value) > 100_000_000),
    };
  }
  if (prompt === 'name a country with a monarchy') {
    return { field: 'country', filter: (item) => factIncludes(item, 'monarchy', ['Q7269', 'Q41614', 'Q184558']) };
  }
  const capitals = new Map([
    ['name the capital city of a european country', 'europe'],
    ['name the capital city of an asian country', 'asia'],
    ['name an african capital city', 'africa'],
    ['name a capital city in the americas', 'americas'],
  ]);
  if (capitals.has(prompt)) {
    return { field: 'capital', filter: (item) => factIncludes(item, 'continents', regions.get(capitals.get(prompt))) };
  }
  return null;
}

function animalFilter(prompt) {
  if (!prompt.startsWith('name an animal ')) return null;
  const edge = prompt.match(/whose name (starts with|ends in) ([a-z])(?: \(breeds count too\))?$/u);
  if (edge) return (name) => edge[1] === 'starts with' ? name.startsWith(edge[2]) : name.endsWith(edge[2]);
  const contains = prompt.match(/that has an? ([a-z]) in its name$/u);
  if (contains) return (name) => name.includes(contains[1]);
  if (prompt === 'name an animal without the letter a in its name (breeds count too)') return (name) => !name.includes('a');
  if (prompt === 'name an animal whose name is exactly four letters long') return (name, raw) => name.length === 4 && !/\s/u.test(raw.trim());
  if (prompt === 'name an animal with a one-word name containing ck') {
    return (name, raw) => name.includes('ck') && /^\p{L}+$/u.test(raw);
  }
  return null;
}

function filterNames(item, predicate, spellings = [item.name, ...item.aliases]) {
  const names = spellings.filter((name) => predicate(letters(name), name));
  if (!names.length) return [];
  return [{ ...item, name: names[0], aliases: names.slice(1) }];
}

export function sourceCandidates(text, snapshot) {
  const key = promptKey(text);
  const country = countryFilter(key);
  const element = elementFilter(key);
  const animal = animalFilter(key);
  const geography = geographyScope(key);
  if (geography) {
    const countries = (snapshot.country ?? []).filter((item) => !legacyCountries.has(item.name) && geography.filter(item));
    const items = geography.field === 'capital' ?
      countries.flatMap((item) => (item.capitals ?? []).filter(([, name]) => name).map(([id, name]) => ({ id, name, aliases: [] }))) :
      countries.map((item) => {
        const [name, ...aliases] = countryNames.get(item.name) ?? [item.name];
        return { ...item, name, aliases };
      });
    return { collection: `country-${geography.field}`, items };
  }
  if (country) {
    return {
      collection: 'country',
      items: (snapshot.country ?? []).filter((item) => !legacyCountries.has(item.name))
        .flatMap((item) => filterNames(item, country, countryNames.get(item.name) ?? [item.name])),
    };
  }
  if (element) {
    return {
      collection: 'element',
      items: (snapshot.element ?? []).filter((item) => item.atomicNumber >= 1 && item.atomicNumber <= 118 && element(item))
        .map((item) => ({
          ...item,
          aliases: item.aliases.filter((name) => /^\p{L}{3,}$/u.test(name) && element({ ...item, name })),
        })),
    };
  }
  if (animal) {
    return {
      collection: 'mammal and bird common names',
      items: [...(snapshot.mammal ?? []), ...(snapshot.bird ?? [])]
        .flatMap((item) => filterNames(item, animal)),
    };
  }
  const collection = collections.find(([, pattern]) => pattern.test(key))?.[0];
  return {
    collection,
    items: (snapshot[collection] ?? []).filter((item) => !excluded[collection]?.has(exactKey(item.name)) &&
      (collection !== 'wild-cat' || item.id !== 'Q146'))
      .map((item) => collection === 'us-state' ? {
        ...item,
        aliases: item.aliases.filter((alias) => exactKey(alias) === `state of ${exactKey(item.name)}`),
      } : item),
  };
}
