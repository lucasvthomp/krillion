const categoryLabels = [
  'national park', 'mountain range', 'musical instrument', 'board game', 'card game',
  'ice cream', 'chili pepper', 'dog breed', 'cat breed', 'chemical element',
  'programming language', 'cake', 'cheese', 'bread', 'pie', 'cookie', 'sandwich',
  'salad', 'soup', 'pepper', 'flower', 'mushroom', 'tree', 'river', 'lake', 'mountain',
  'ocean', 'sea', 'desert', 'island', 'volcano', 'cloud', 'wine',
];
const genericHeads = new Set(['example', 'name', 'one', 'phrase', 'something', 'thing', 'type', 'word']);
const inflectedCategories = new Set([
  ...categoryLabels, 'amphibian', 'animal', 'berry', 'beetle', 'bird', 'cocktail', 'condiment',
  'curry', 'dessert', 'dish', 'drink', 'dumpling', 'fish', 'flavor', 'food', 'fruit', 'fungus', 'herb',
  'ingredient', 'insect', 'mammal', 'marsupial', 'mollusk', 'mushroom', 'nut', 'pasta shape', 'pastry',
  'plant', 'reptile', 'rodent', 'sauce', 'shellfish', 'snack', 'species', 'spice', 'tortoise', 'turtle',
  'vegetable', 'waterfowl',
]);
const irregularPlurals = new Map([['geese', 'goose'], ['mice', 'mouse'], ['lice', 'louse'],
  ['oxen', 'ox'], ['teeth', 'tooth'], ['feet', 'foot'], ['fungi', 'fungus']]);

export function exactKey(text) {
  return text.normalize('NFKC').trim().toLowerCase().replace(/\s+/gu, ' ');
}

function looseKey(text) {
  return exactKey(text).normalize('NFKD').replace(/\p{M}/gu, '')
    .replace(/&/gu, 'and').replace(/[^\p{L}\p{N}+#]/gu, '');
}

function labelsIn(prompt) {
  const wording = exactKey(prompt).match(/^(?:name|give|list|identify) (?:a |an |one |any |the )?(.+)$/u)?.[1];
  if (!wording) return [];
  const subject = wording.replace(/^(?:\p{L}+ )?(?:type|kind|variety|style|form|species|breed|shade|colou?r|flavou?r|brand|genre) of /u, '')
    .split(/\s+(?:that|which|whose|with|without|in|from|by|of|for|about|found|used|anywhere|before|after|during|where|when|containing|people|you|made|served|played|known|starring|featuring)\b|[()[\];:?!]/u, 1)[0]
    .trim().replace(/\.$/u, '');
  const labels = new Set();
  for (const part of subject.split(/,\s*| (?:or|and) /u)) {
    for (const label of categoryLabels) {
      if (part === label || part.endsWith(` ${label}`)) labels.add(label);
    }
    const category = part.replace(/^(?:(?:a|an|the|famous|well-known|recognized|official|common|fictional|historical|former|current|popular|real|living) )+/u, '');
    if (!/^\p{L}+(?:[- ]\p{L}+){0,4}$/u.test(category)) continue;
    const head = category.split(' ').at(-1);
    if (genericHeads.has(head) || head.length < 3) continue;
    labels.add(head);
    labels.add(category);
    // "a penguin species" is about penguins: "Emperor penguin" can be called "Emperor".
    const kind = category.match(/^(?:.+ )?(\p{L}{3,}) (?:species|breeds?|variety|varieties|types?|kinds?)$/u)?.[1];
    if (kind && !genericHeads.has(kind)) labels.add(kind);
  }
  if (labels.has('mountain')) labels.add('mount');
  return [...labels];
}

function shortenedForms(answer, labels) {
  const forms = [];
  const name = answer.replace(/[-–—]/gu, ' ').replace(/\s+/gu, ' ');
  for (const label of labels) {
    const prefix = `${label} `;
    const suffix = ` ${label}`;
    const parenthetical = ` (${label})`;
    if (name.startsWith(prefix)) forms.push(name.slice(prefix.length));
    if (name.endsWith(suffix)) forms.push(name.slice(0, -suffix.length));
    if (name.endsWith(parenthetical)) forms.push(name.slice(0, -parenthetical.length));
  }
  return forms
    .filter((form) => !/^(?:of|in|on|at|by|for|with|from|the)(?: |$)/u.test(form.replace(/^the /u, '')))
    .flatMap((form) => [looseKey(form), looseKey(form.replace(/^the /u, ''))])
    .filter((form) => form.length >= 3 && form !== 'the');
}

function singularForms(text) {
  const tail = exactKey(text).replace(/[’']/gu, '').match(/^([\s\S]*?)(\p{L}{4,})$/u);
  if (!tail) return [];
  const [, prefix, word] = tail;
  const irregular = irregularPlurals.get(word);
  if (irregular) return [prefix + irregular];
  if (!word.endsWith('s') || /(?:ss|us|is|ous|ics)$/u.test(word)) return [];
  const forms = [prefix + word.slice(0, -1)];
  if (/[^aeiou]ies$/u.test(word)) forms.push(prefix + word.slice(0, -3) + 'y');
  else if (/(?:ches|shes|sses|xes|zzes|oes)$/u.test(word)) forms.push(prefix + word.slice(0, -2));
  else if (word.endsWith('ves')) forms.push(prefix + word.slice(0, -3) + 'f', prefix + word.slice(0, -3) + 'fe');
  return forms;
}

// A spelling that several distinct answers share, such as "Congo" or "Williams".
class Shared {
  constructor(entries) { this.entries = entries; }
}

function addUnique(index, key, answer) {
  if (!key) return;
  const current = index.get(key);
  if (current === undefined) index.set(key, answer);
  else if (current instanceof Shared) {
    if (!current.entries.includes(answer)) current.entries.push(answer);
  } else if (current !== answer) index.set(key, new Shared([current, answer]));
}

// "St Lucia" for "Saint Lucia", "Mount Everest" for "Mt. Everest", and so on.
const abbreviations = [[/\bsaint\b/giu, 'St'], [/\bst\.?(?= )/giu, 'Saint'], [/\bmount\b/giu, 'Mt'],
  [/\bmt\.?(?= )/giu, 'Mount'], [/\bfort\b/giu, 'Ft'], [/\bft\.?(?= )/giu, 'Fort']];

function abbreviationForms(name) {
  const forms = new Set();
  for (const [pattern, replacement] of abbreviations) {
    const form = name.replace(pattern, replacement);
    if (form !== name) forms.add(form);
  }
  for (const form of distanceForms(name)) if (form !== name) forms.add(form);
  return [...forms];
}

// "200m" and "200 meters" for "200 metres"; "5k" and "5 kilometers" for "5000 metres".
function distanceForms(name) {
  const found = name.match(/^(.*?)(?<![\p{L}\p{N}])(\d{1,3}(?:,\d{3})*|\d+) ?(metres?|meters?|m|km|kilomet(?:re|er)s?)(?![\p{L}\p{N}])(.*)$/iu);
  if (!found) return [];
  const [, before, digits, unit, after] = found;
  const metres = Number(digits.replaceAll(',', '')) * (/^k/iu.test(unit) ? 1000 : 1);
  const lengths = [`${metres}m`, `${metres} m`, `${metres} meters`, `${metres} metres`];
  if (metres % 1000 === 0) {
    const kilometres = metres / 1000;
    lengths.push(`${kilometres}k`, `${kilometres}km`, `${kilometres} km`, `${kilometres} kilometers`,
      `${kilometres} kilometres`, `${kilometres} kilometer`, `${kilometres} kilometre`);
  }
  return lengths.map((length) => `${before}${length}${after}`.trim());
}

const entriesOf = (value) => value === undefined ? [] : value instanceof Shared ? value.entries : [value];

// Prompts whose answers are people (or characters) accept a surname on its own.
const personWords = new Set([
  'person', 'someone', 'somebody', 'anyone', 'human', 'man', 'woman', 'figure', 'personality', 'celebrity', 'icon',
  'legend', 'star', 'member', 'teammate', 'champion', 'medalist', 'medallist', 'laureate', 'character',
  'villain', 'hero', 'president', 'emperor', 'empress', 'king', 'queen', 'monarch', 'prince', 'princess', 'duke',
  'pope', 'saint', 'prophet', 'apostle', 'pharaoh', 'tsar', 'czar', 'general', 'admiral', 'dictator', 'leader',
  'ruler', 'minister', 'senator', 'governor', 'mayor', 'politician', 'lady', 'ceo', 'founder', 'entrepreneur',
  'billionaire', 'artist', 'painter', 'sculptor', 'architect', 'designer', 'photographer', 'composer', 'musician',
  'singer', 'songwriter', 'rapper', 'drummer', 'guitarist', 'pianist', 'violinist', 'conductor', 'dj', 'band member',
  'actor', 'actress', 'director', 'filmmaker', 'producer', 'comedian', 'host', 'presenter', 'journalist',
  'youtuber', 'streamer', 'influencer', 'model', 'dancer', 'author', 'writer', 'novelist', 'poet', 'playwright',
  'philosopher', 'scientist', 'mathematician', 'physicist', 'chemist', 'biologist', 'economist', 'astronomer',
  'inventor', 'explorer', 'astronaut', 'chef', 'athlete', 'player', 'footballer', 'golfer', 'boxer', 'wrestler',
  'fighter', 'driver', 'racer', 'skater', 'swimmer', 'cyclist', 'gymnast', 'sprinter', 'runner', 'coach',
  'manager', 'quarterback', 'pitcher', 'goalkeeper', 'striker', 'batter', 'cricketer', 'jockey', 'olympian',
]);
const nameParticles = new Set(['da', 'de', 'del', 'della', 'der', 'di', 'du', 'la', 'le', 'van', 'von', 'den', 'ter', 'st', 'st.', 'bin', 'al', 'el', 'ibn', 'mac']);

export function isPersonPrompt(prompt) {
  const text = exactKey(prompt).replace(/[‘’]/gu, "'");
  if (/^(?:name|give|list) (?:someone|somebody|anyone|a person|any person)\b/u.test(text)) return true;
  const wording = text.match(/^(?:name|give|list) (?:a |an |any |one |the )?(.+)$/u)?.[1];
  if (!wording) return false;
  // Read the noun both with and without its "of" phrase: "a member of the Beatles" is about a
  // member, while "a Lord of the Rings character" is about a character.
  const stops = 'who|that|which|whose|with|without|in|from|by|for|on|at|named|called|known|born|currently|ever|to|whom|than|where|played|voiced|like';
  return [`${stops}|of`, stops].some((words) => {
    const head = wording.split(new RegExp(`\\s+(?:${words})\\b|[()[\\];:,?!.]`, 'u'), 1)[0].trim();
    const parts = head.split(' ');
    const last = parts.at(-1).replace(/'s$/u, '');
    const singular = last.endsWith('s') && personWords.has(last.slice(0, -1)) ? last.slice(0, -1) : last;
    return personWords.has(singular) || personWords.has(parts.slice(-2).join(' '));
  });
}

// "Leonardo da Vinci" -> "Vinci", "da Vinci"; "Gabriel García Márquez" -> "Márquez", "García Márquez".
function surnameForms(name) {
  const plain = name.replace(/\s*\([^)]*\)/gu, '').replace(/,?\s+(?:jr|sr|ii|iii|iv)\.?$/iu, '').trim();
  if (/\d/u.test(plain)) return [];
  const words = plain.split(/\s+/u);
  if (words.length < 2 || words.length > 6) return [];
  if (!words.every((word) => /^\p{Lu}/u.test(word) || nameParticles.has(word.toLowerCase()))) return [];
  const last = words.at(-1);
  if (nameParticles.has(last.toLowerCase()) || /^\p{L}\.?$/u.test(last)) return [];
  const forms = [last];
  let start = words.length - 1;
  while (start > 1 && nameParticles.has(words[start - 1].toLowerCase())) start -= 1;
  if (start < words.length - 1) forms.push(words.slice(start).join(' '));
  else if (words.length >= 3 && !/^\p{L}\.?$/u.test(words.at(-2))) forms.push(words.slice(-2).join(' '));
  return forms;
}

// Fictional characters often go by their first name: "Lucas" for Lucas Sinclair, "Michael" for
// Michael Scott. Real people do not, so this is limited to character prompts.
const characterPrompt = /\b(?:characters?|villains?|protagonists?)\b/iu;
const titles = new Set(['captain', 'doctor', 'dr', 'mr', 'mrs', 'ms', 'miss', 'lord', 'lady', 'king', 'queen', 'prince',
  'princess', 'sir', 'dame', 'uncle', 'aunt', 'auntie', 'professor', 'general', 'agent', 'officer', 'saint', 'st',
  'father', 'mother', 'sister', 'brother', 'count', 'baron', 'chief', 'commander', 'admiral', 'major', 'colonel', 'little',
  'big', 'old', 'young', 'the', 'el', 'la', 'le', 'mister', 'madame', 'master', 'lieutenant', 'sergeant', 'detective']);

function firstNameForms(name) {
  const words = name.replace(/\s*\([^)]*\)/gu, '').trim().split(/[\s-]+/u);
  if (words.length < 2 || !words.every((word) => /^\p{Lu}/u.test(word) || nameParticles.has(word.toLowerCase()))) return [];
  const first = words[0].replace(/[.,]$/u, '');
  return first.length >= 3 && !titles.has(first.toLowerCase()) && !/\d/u.test(first) ? [first] : [];
}

// Bounded edit distance with support for an adjacent transposition.
function editDistance(guess, candidate, limit, rows) {
  let [earlier, previous, current] = rows;
  const length = candidate.length;
  for (let column = 0; column <= length; column++) previous[column] = column;

  for (let row = 1; row <= guess.length; row++) {
    const first = Math.max(1, row - limit);
    const last = Math.min(length, row + limit);
    current[first - 1] = first === 1 ? row : limit + 1;
    current[last + 1] = limit + 1;
    let best = limit + 1;
    for (let column = first; column <= last; column++) {
      const cost = guess[row - 1] === candidate[column - 1] ? 0 : 1;
      let distance = Math.min(previous[column] + 1, current[column - 1] + 1, previous[column - 1] + cost);
      if (row > 1 && column > 1 && guess[row - 1] === candidate[column - 2] && guess[row - 2] === candidate[column - 1]) {
        distance = Math.min(distance, earlier[column - 2] + 1);
      }
      current[column] = distance;
      best = Math.min(best, distance);
    }
    if (best > limit) return limit + 1;
    [earlier, previous, current] = [previous, current, earlier];
  }
  return previous[length];
}

const maxChoices = 6;
const maxWordChoices = 4;
const stopWords = new Set(['the', 'a', 'an', 'of', 'and']);
// Words that only say what kind of thing an answer is, as in "pistachio nut" or "Fox (animal)".
const kindWords = new Set([
  'nut', 'fruit', 'berry', 'dish', 'food', 'sauce', 'soup', 'cake', 'bread', 'cheese', 'drink', 'cocktail', 'wine',
  'beer', 'candy', 'snack', 'game', 'team', 'song', 'album', 'movie', 'film', 'show', 'series', 'book', 'novel',
  'breed', 'dog', 'cat', 'bird', 'fish', 'tree', 'flower', 'plant', 'animal', 'doll', 'toy', 'brand', 'company',
  'car', 'city', 'country', 'river', 'lake', 'mountain', 'island', 'sport', 'dance', 'language', 'instrument',
  'knot', 'beetle', 'turtle', 'tortoise', 'penguin', 'spider', 'snake', 'lizard', 'shark', 'whale', 'mushroom',
  'pepper', 'app', 'website', 'character', 'band', 'franchise', 'console', 'exercise', 'setting', 'product',
].map((word) => stemWord(word)));

// Words that only finish a club's name, so "Leeds" is Leeds United and "Tottenham" is Tottenham Hotspur.
const clubWords = new Set(['united', 'city', 'town', 'athletic', 'rovers', 'wanderers', 'hotspur', 'albion', 'county',
  'fc', 'afc', 'cf', 'sc', 'rangers', 'forest', 'villa', 'palace', 'argyle', 'orient', 'alexandra', 'hove', 'and',
  'north', 'end', 'wednesday', 'stanley', 'dons'].map((word) => stemWord(word)));

// A rough word stem so "whip" meets "whipped", "bake" meets "baked" and "empanadas" meets "empanada".
function stemWord(word) {
  let stem = word;
  if (stem.length > 4 && stem.endsWith('ies')) return `${stem.slice(0, -3)}y`;
  // "-es" is only an ending after a hissing sound ("boxes"), so "tortoises" meets "tortoise".
  if (stem.length > 4) stem = stem.replace(/(?:ing|ed|(?<=ch|sh|x|z|ss)es)$/u, '');
  if (stem.length > 3) stem = stem.replace(/s$/u, '');
  if (stem.length > 3) stem = stem.replace(/e$/u, '');
  return stem.length > 2 ? stem.replace(/([^aeiou])\1$/u, '$1') : stem;
}

// The words of a name, ignoring parentheses, "the", "of" and the like.
function wordsOf(text) {
  return [...new Set(exactKey(text).replace(/\([^)]*\)/gu, ' ').normalize('NFKD').replace(/\p{M}/gu, '')
    .replace(/['’]s\b/gu, '').replace(/['’]/gu, '').split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word && !stopWords.has(word)).map(stemWord))];
}

// Prompts that judge the spelling, such as "starts with S" or "exactly four letters".
export function hasSpellingRule(prompt) {
  return /\b(?:letters?|syllables?|spelled|spelling|one-word|rhymes?|prefix|suffix|anagram|starts? with|ends? (?:with|in)|in (?:its|the) name)\b/iu.test(prompt);
}

// Prompts about things with varieties, where a base answer such as Turkey can stand for the
// varieties the bank lists ("Broad-breasted White turkey").
const baseCategories = new Set(['Animals & Nature', 'Food & Drink', 'Objects, Tools & Materials']);
// A base answer scores one tier below its best-known variety, and at most Schooler, since the
// plain name is the obvious way to say it.
const tierBelow = new Map([[100, [30, 'schooler']], [85, [30, 'schooler']], [60, [30, 'schooler']],
  [30, [10, 'plankton']], [15, [10, 'plankton']], [10, [10, 'plankton']]]);

// A "word" with no letters or digits, such as the "///" in "Apple ///".
const symbolWord = /(?:^|\s)[^\p{L}\p{N}\s]+(?:\s|$)/u;

export function buildLookup(answers, prompt, { category } = {}) {
  const exact = new Map();
  const unique = new Map();
  const aliases = new Map();
  const contextual = new Map();
  const grammatical = new Map();
  const surnames = new Map();
  const firstNames = new Map();
  let spelling;

  for (const entry of answers) {
    const key = exactKey(entry[0]);
    const previous = exact.get(key);
    if (!previous || previous[1] < entry[1]) exact.set(key, entry);
  }
  const labels = labelsIn(prompt);
  const collective = /\bcollective noun/iu.test(prompt);
  const typedExactly = [];
  const allowInflection = labels.some((label) => inflectedCategories.has(label)) && !hasSpellingRule(prompt);
  const allowSurnames = isPersonPrompt(prompt);
  const allowFirstNames = allowSurnames && characterPrompt.test(prompt);
  for (const [name, entry] of exact) {
    const folded = looseKey(name);
    // Names that differ only in punctuation or accents are one answer; keep the better score.
    if (folded && !(unique.get(folded)?.[1] >= entry[1])) unique.set(folded, entry);
    for (const alternate of [...entry[3] ?? [], ...abbreviationForms(entry[0])]) {
      // "Apple ///" folds to "apple", so it only counts when typed as it is.
      if (symbolWord.test(alternate)) {
        typedExactly.push([exactKey(alternate), entry]);
        continue;
      }
      addUnique(aliases, looseKey(alternate), entry);
      if (/^the /iu.test(alternate) && looseKey(alternate.slice(4)).length >= 2) addUnique(aliases, looseKey(alternate.slice(4)), entry);
    }
    if (name.startsWith('the ')) {
      const shorter = looseKey(name.slice(4));
      if (shorter.length >= 3) addUnique(aliases, shorter, entry);
    }
    for (const form of shortenedForms(name, labels)) addUnique(contextual, form, entry);
    if (allowInflection) {
      for (const spelling of [name, ...(entry[3] ?? [])]) {
        for (const stem of singularForms(spelling)) addUnique(grammatical, looseKey(stem), entry);
      }
    }
    if (allowSurnames) {
      for (const form of surnameForms(entry[0])) {
        const key = looseKey(form);
        if (key.length >= 3) addUnique(surnames, key, entry);
      }
    }
    // Only well-known characters go by a first name alone; otherwise any common first name would
    // find some Deep Cut.
    if (allowFirstNames && entry[1] <= 30) {
      for (const form of firstNameForms(entry[0])) addUnique(firstNames, looseKey(form), entry);
    }
  }

  for (const [key, entry] of typedExactly) if (!exact.has(key)) exact.set(key, entry);

  // Every answer this spelling could mean, from the most to the least direct reading.
  function resolveVariant(key) {
    for (const index of [unique, aliases, contextual, grammatical, surnames, firstNames]) {
      if (index.has(key)) return entriesOf(index.get(key));
    }
    return [];
  }

  function candidates(text) {
    const key = exactKey(text);
    if (exact.has(key)) return [exact.get(key)];
    const folded = looseKey(key);
    const direct = resolveVariant(folded);
    if (direct.length) return direct;
    if (key.startsWith('the ')) {
      const withoutArticle = looseKey(key.slice(4));
      if (withoutArticle.length >= 2) {
        const result = resolveVariant(withoutArticle);
        if (result.length) return result;
      }
    }
    if (allowInflection) {
      const matches = new Set(singularForms(key.replace(/^the /u, ''))
        .flatMap((stem) => resolveVariant(looseKey(stem))));
      if (matches.size) return [...matches];
    }
    // A collective noun with its animal: "murder of crows" for Murder.
    if (collective && / of /u.test(key)) {
      const direct = resolveVariant(looseKey(key.replace(/ of .+$/u, '')));
      if (direct.length) return direct;
    }
    // The prompt's subject added to an answer: "Yellowstone National Park", "cobra pose".
    for (const label of labels) {
      for (const shorter of [stripLabel(key, label, true), stripLabel(key, label, false)]) {
        if (!shorter || looseKey(shorter).length < 3) continue;
        const direct = resolveVariant(looseKey(shorter));
        if (direct.length) return direct;
      }
    }
    return [];
  }

  function stripLabel(key, label, atEnd) {
    const plural = `${label}s`;
    for (const word of [label, plural]) {
      if (atEnd && key.endsWith(` ${word}`)) return key.slice(0, -word.length - 1);
      if (!atEnd && key.startsWith(`${word} `)) return key.slice(word.length + 1);
    }
    return '';
  }

  // When a shared spelling fits one well-known answer and otherwise only Deep Cuts, the player means
  // the well-known one: Federer is Roger Federer, not his wife Mirka.
  function standout(entries) {
    const known = entries.filter((entry) => entry[1] <= 30);
    return known.length === 1 && entries.every((entry) => entry === known[0] || entry[1] >= 85) ? known[0] : undefined;
  }

  // Word-level matching for guesses that are part of a name or a little longer than it:
  // "IWC" for IWC Schaffhausen, "Tony Stark" for Iron Man, "red fox" for Fox.
  // Prompts that judge spelling skip it, since a partial name may not follow the rule.
  const allowWords = !hasSpellingRule(prompt);
  // Branded items are named things, not varieties: "Mac" is not a menu item.
  const allowBases = allowWords && !allowSurnames && baseCategories.has(category) && !/\bbrand/iu.test(prompt);
  // Words that name the prompt's subject, such as "turtle" in "a type of turtle or tortoise".
  const subjectWords = new Set(labels.flatMap(wordsOf));
  let wordIndex;
  let spellingWords;
  let bases;
  function buildWordIndex() {
    wordIndex = new Map();
    spellingWords = new Map();
    bases = new Map();
    for (const entry of exact.values()) {
      if (allowBases) addBases(entry);
      for (const spelling of [entry[0], ...(entry[3] ?? [])]) {
        const words = wordsOf(spelling);
        // "Apple ///" would read as just "apple", which says nothing about Apple III.
        if (!words.length || symbolWord.test(spelling)) continue;
        const key = words.slice().sort().join(' ');
        if (!spellingWords.has(key)) spellingWords.set(key, new Set());
        spellingWords.get(key).add(entry);
        for (const word of words) {
          if (!wordIndex.has(word)) wordIndex.set(word, []);
          wordIndex.get(word).push([entry, words.length]);
        }
      }
    }
    for (const [key, base] of bases) {
      // A base needs two varieties, and the bank must not already have it under its own name.
      if (base.entries.size < 2 || candidates(base.name).length) {
        bases.delete(key);
        continue;
      }
      const best = Math.min(...[...base.entries].map((entry) => entry[1]));
      const [score, tier] = tierBelow.get(best) ?? [10, 'plankton'];
      base.entry = [base.name, score, tier];
    }
  }

  // The last one or two words of a longer name: "turkey" in "Broad-breasted White turkey".
  function addBases(entry) {
    const written = entry[0].replace(/\([^)]*\)/gu, ' ').trim().split(/[\s\-–—]+/u);
    const words = wordsOf(entry[0]);
    for (let size = 1; size <= 2 && size < words.length; size++) {
      const tail = words.slice(-size);
      if (tail.some((word) => word.length < 3 || /\d/u.test(word))) break;
      // "whale" alone only names the subject, but "killer whale" is a base answer.
      if (tail.every((word) => kindWords.has(word) || subjectWords.has(word))) continue;
      const key = tail.join(' ');
      if (!bases.has(key)) {
        const name = written.slice(-size).join(' ');
        bases.set(key, { name: name[0].toUpperCase() + name.slice(1), entries: new Set() });
      }
      bases.get(key).entries.add(entry);
    }
  }

  // A base answer, or a variety of one the bank does not list: "wild turkey" for Turkey.
  function baseCandidate(text) {
    if (!allowBases) return undefined;
    if (!wordIndex) buildWordIndex();
    const words = wordsOf(text);
    for (let size = Math.min(2, words.length); size >= 1; size--) {
      if (words.length - size > 3) continue;
      const base = bases.get(words.slice(-size).join(' '));
      if (base) return base.entry;
    }
    return undefined;
  }

  function wordCandidates(text) {
    if (!allowWords) return { entries: [], kind: 'none' };
    const words = wordsOf(text);
    if (!words.length || words.every((word) => word.length < 3)) return { entries: [], kind: 'none' };
    if (!wordIndex) buildWordIndex();
    // The same words in another order or form: "Wayne, Bruce" for "Bruce Wayne".
    const same = spellingWords.get(words.slice().sort().join(' '));
    if (same) return { entries: [...same], kind: 'same' };
    // The guess is part of a longer name. One word alone is too loose ("red" for Red Rose, or a
    // first name for any character), so it must be an abbreviation such as IWC, or a word of five
    // or more letters from a two-word name, and on prompts about people it must be the last name.
    const [rarest] = words.slice().sort((first, second) => (wordIndex.get(first)?.length ?? 0) - (wordIndex.get(second)?.length ?? 0));
    const longer = new Set();
    const [single] = words.length === 1 ? words : [];
    const typed = exactKey(text).replace(/[^\p{L}\p{N}]/gu, '');
    // A word that turns up in several answers ("Japan" in 62 video game titles) names none of them.
    const distinctive = single && new Set((wordIndex.get(single) ?? []).map(([entry]) => entry)).size === 1;
    for (const [entry] of wordIndex.get(rarest) ?? []) {
      if (longer.has(entry)) continue;
      const spellings = [entry[0], ...(entry[3] ?? [])];
      const fits = spellings.some((spelling) => {
        // A nickname such as "Congo Bill" does not make "bill" a last name.
        if (single && allowSurnames && spelling !== entry[0]) return false;
        const name = wordsOf(spelling);
        if (!words.every((word) => name.includes(word))) return false;
        if (!single) return true;
        const abbreviation = spelling.split(/[^\p{L}\p{N}]+/u).some((part) => /^\p{Lu}{2,5}$/u.test(part) && part.toLowerCase() === typed);
        if (abbreviation) return true;
        if (!distinctive || name.length < 2 || typed.length < 4 || kindWords.has(single)) return false;
        // The last word names the thing ("Rhapsody", "Spurs" for San Antonio Spurs); a first word
        // only describes it ("soccer" is not Soccer field) unless the other word just says what
        // kind of thing it is ("Galapagos" for Galapagos tortoise). On prompts about people the
        // word must be the last name.
        if (name.length <= 4 && name.at(-1) === single) return true;
        // A club by its town: the rest of the name only says it is a club.
        if (name[0] === single && name.length <= 4 && name.slice(1).every((word) => clubWords.has(word))) return true;
        if (name.length !== 2 || allowSurnames || typed.length < 5) return false;
        const other = name[0] === single ? name[1] : name[0];
        return kindWords.has(other) || subjectWords.has(other);
      });
      if (fits) longer.add(entry);
    }
    // A single word that fits several names gives no choice list, which would reveal answers.
    if (single && longer.size > 1) return { entries: [], kind: 'none' };
    if (longer.size) return { entries: [...longer], kind: 'longer' };
    // A name inside a longer guess. A variety of an answer always counts: up to three describing
    // words before it ("south american gray fox" for Fox) score as the answer itself, while a
    // variety that is its own answer (Arctic fox) is matched earlier with its own score.
    // Otherwise the name must cover more than half of the guess, so a list of several answers
    // in one guess does not count, or the other words must only say what kind of thing it is
    // ("pistachio nut").
    let best = 0;
    let inside = new Set();
    for (const word of words) {
      for (const [entry, size] of wordIndex.get(word) ?? []) {
        if (size < best) continue;
        const names = [entry[0], ...(entry[3] ?? [])].map(wordsOf);
        const atEnd = (name) => name.every((part, index) => part === words[words.length - size + index]);
        // A full name for a character the bank knows by one name: "Fred Jones" for Fred.
        const fullName = allowSurnames && size === 1 && words.length === 2;
        const fits = (name) => name.length === size && name.every((part) => words.includes(part)) &&
          ((atEnd(name) && words.length - size <= 3) || size * 2 > words.length || fullName ||
            words.every((part) => name.includes(part) || kindWords.has(part)));
        if (!names.some(fits)) continue;
        if (size > best) {
          best = size;
          inside = new Set();
        }
        inside.add(entry);
      }
    }
    return { entries: [...inside], kind: inside.size ? 'inside' : 'none' };
  }

  return {
    match(text) {
      const found = candidates(text);
      if (found.length) return found.length === 1 ? found[0] : standout(found);
      const { entries } = wordCandidates(text);
      return entries.length === 1 ? entries[0] : baseCandidate(text);
    },

    // Answers to offer when a guess is close or could mean several answers.
    // `crowded` means too many answers share the spelling to list them.
    suggest(text) {
      const shared = candidates(text);
      if (shared.length > 1) {
        const choices = [...shared].sort((first, second) => first[0].localeCompare(second[0]));
        return shared.length > maxChoices ? { choices: [], crowded: true } : { choices, crowded: false };
      }
      // A close spelling of a whole name is a stronger sign than shared words, so check it first.
      const typos = closeSpellings(text);
      if (typos.length) return { choices: typos, crowded: false };
      if (!shared.length) {
        const { entries, kind } = wordCandidates(text);
        if (entries.length > 1) {
          const limit = kind === 'same' ? maxChoices : maxWordChoices;
          const choices = entries.sort((first, second) => first[0].localeCompare(second[0]));
          return entries.length > limit ? { choices: [], crowded: true } : { choices, crowded: false };
        }
      }
      return { choices: [], crowded: false };
    },
  };

  function closeSpellings(text) {
    const guess = looseKey(text);
    if (guess.length < 4 || guess.length > 48) return [];
    if (!spelling) {
      spelling = Array.from({ length: 51 }, () => []);
      if (allowBases) {
        if (!wordIndex) buildWordIndex();
        for (const base of bases.values()) {
          const key = looseKey(base.name);
          if (key.length >= 3 && key.length <= 50) spelling[key.length].push([key, base.entry]);
        }
      }
      // First names are left out: short and common, a slip in one too often lands on another name.
      for (const index of [unique, aliases, contextual, surnames]) {
        for (const [key, value] of index) {
          if (index !== unique && unique.has(key)) continue;
          if (index !== aliases && index !== unique && aliases.has(key)) continue;
          if (index === surnames && contextual.has(key)) continue;
          if (key.length >= 3 && key.length <= 50) {
            for (const entry of entriesOf(value)) spelling[key.length].push([key, entry]);
          }
        }
      }
    }
    // Guesses of six letters or more may have two slips ("picoli" for piccolo). A two-slip match must
    // start with the same letter, which keeps unrelated words such as "flower" and Closer apart.
    const limit = guess.length >= 6 ? 2 : 1;
    const rows = Array.from({ length: 3 }, () => new Uint8Array(53));
    let best = limit + 1;
    let closest = new Set();
    for (let length = guess.length - limit; length <= guess.length + limit; length++) {
      for (const [key, entry] of spelling[length] ?? []) {
        if (limit > 1 && key[0] !== guess[0] && best > 1 && editDistance(guess, key, 1, rows) > 1) continue;
        const distance = editDistance(guess, key, Math.min(limit, best), rows);
        if (distance > limit || distance > best) continue;
        if (distance < best) {
          best = distance;
          closest = new Set();
        }
        closest.add(entry);
      }
    }
    // A typo that is equally close to several answers is too uncertain to offer.
    return closest.size >= 1 && closest.size <= 3 ? [...closest] : [];
  }
}
