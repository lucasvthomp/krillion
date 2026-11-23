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
  const subject = wording.replace(/^(?:\p{L}+ )?(?:type|kind|variety|style|form|species|breed) of /u, '')
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

// Keep a null entry for a spelling that points to several distinct answers.
function addUnique(index, key, answer) {
  if (!key) return;
  if (!index.has(key)) index.set(key, answer);
  else if (index.get(key) !== answer) index.set(key, null);
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

export function buildLookup(answers, prompt) {
  const exact = new Map();
  const loose = new Map();
  const unique = new Map();
  const aliases = new Map();
  const contextual = new Map();
  const grammatical = new Map();
  let spelling;

  for (const entry of answers) {
    const key = exactKey(entry[0]);
    const previous = exact.get(key);
    if (!previous || previous[1] < entry[1]) exact.set(key, entry);
  }
  const labels = labelsIn(prompt);
  const allowInflection = labels.some((label) => inflectedCategories.has(label)) &&
    !/\b(?:letters?|syllables?|spelled|spelling|one-word|rhymes?|prefix|suffix|anagram|starts? with|ends? (?:with|in)|in (?:its|the) name)\b/iu.test(prompt);
  for (const [name, entry] of exact) {
    const folded = looseKey(name);
    if (folded) {
      const previous = loose.get(folded);
      if (!loose.has(folded)) loose.set(folded, entry);
      else if (previous && previous[1] !== entry[1]) loose.set(folded, null);
      addUnique(unique, folded, entry);
    }
    for (const alternate of entry[3] ?? []) addUnique(aliases, looseKey(alternate), entry);
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
  }

  function resolveVariant(key) {
    if (unique.has(key)) return unique.get(key);
    if (aliases.has(key)) return aliases.get(key);
    if (contextual.has(key)) return contextual.get(key);
    return grammatical.get(key);
  }

  return {
    match(text) {
      const key = exactKey(text);
      const folded = looseKey(key);
      if (exact.has(key)) return exact.get(key);
      if (loose.has(folded)) return loose.get(folded);
      if (aliases.has(folded)) return aliases.get(folded);
      if (contextual.has(folded)) return contextual.get(folded);
      if (grammatical.has(folded)) return grammatical.get(folded);
      if (key.startsWith('the ')) {
        const withoutArticle = looseKey(key.slice(4));
        if (withoutArticle.length >= 3) {
          const result = resolveVariant(withoutArticle);
          if (result !== undefined) return result;
        }
      }
      if (allowInflection) {
        const matches = new Set(singularForms(key.replace(/^the /u, ''))
          .map((stem) => resolveVariant(looseKey(stem))).filter((match) => match !== undefined));
        if (matches.size === 1) return [...matches][0];
      }
      return undefined;
    },

    suggest(text) {
      const guess = looseKey(text);
      if (guess.length < 4 || guess.length > 48) return null;
      if (!spelling) {
        spelling = Array.from({ length: 51 }, () => []);
        for (const index of [unique, aliases, contextual]) {
          for (const [key, entry] of index) {
            if (index !== unique && unique.has(key)) continue;
            if (index === contextual && aliases.has(key)) continue;
            if (key.length >= 3 && key.length <= 50) spelling[key.length].push([key, entry]);
          }
        }
      }
      const limit = guess.length >= 7 ? 2 : 1;
      const rows = Array.from({ length: 3 }, () => new Uint8Array(53));
      let best = limit + 1;
      let result = null;
      for (let length = guess.length - limit; length <= guess.length + limit; length++) {
        for (const [key, entry] of spelling[length]) {
          const distance = editDistance(guess, key, Math.min(limit, best), rows);
          if (distance > limit || distance > best) continue;
          if (distance < best) {
            best = distance;
            result = entry;
          } else if (result !== entry) result = null;
        }
      }
      return result;
    },
  };
}
