const categoryLabels = [
  'national park', 'mountain range', 'musical instrument', 'board game', 'card game',
  'ice cream', 'chili pepper', 'dog breed', 'cat breed', 'chemical element',
  'programming language', 'cake', 'cheese', 'bread', 'pie', 'cookie', 'sandwich',
  'salad', 'soup', 'pepper', 'flower', 'mushroom', 'tree', 'river', 'lake', 'mountain',
  'ocean', 'sea', 'desert', 'island', 'volcano', 'cloud', 'wine',
];

export function exactKey(text) {
  return text.normalize('NFKC').trim().toLowerCase().replace(/\s+/gu, ' ');
}

function looseKey(text) {
  return exactKey(text).normalize('NFKD').replace(/\p{M}/gu, '')
    .replace(/&/gu, 'and').replace(/[^\p{L}\p{N}+#]/gu, '');
}

function labelsIn(prompt) {
  const subject = exactKey(prompt).replace(/^(?:name|give|list|identify) (?:a |an |one |any |the )?/u, '')
    .split(/\s+(?:that|which|whose|with|without|in|from|by|found|used|anywhere)\b|[()[\];:?!]/u, 1)[0]
    .trim().replace(/\.$/u, '');
  const typed = subject.match(/^(?:\p{L}+ )?(?:type|kind|variety|style|form|species|breed) of (.+)$/u);
  const labels = new Set();
  for (const part of (typed?.[1] ?? subject).split(/ (?:or|and) /u)) {
    for (const label of categoryLabels) {
      if (part === label || part.endsWith(` ${label}`)) labels.add(label);
    }
    if (typed && /^\p{L}+(?:[- ]\p{L}+){0,2}$/u.test(part)) labels.add(part);
  }
  if (labels.has('mountain')) labels.add('mount');
  return [...labels];
}

function shortenedForms(answer, labels) {
  const forms = [];
  const name = answer.replace(/[-–—]/gu, ' ').replace(/\s+/gu, ' ');
  for (const label of labels) {
    if (name.startsWith(`${label} `)) forms.push(looseKey(name.slice(label.length + 1)));
    if (name.endsWith(` ${label}`)) forms.push(looseKey(name.slice(0, -label.length - 1)));
  }
  return forms.filter((form) => form.length >= 3);
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
  let spelling;

  for (const entry of answers) {
    const key = exactKey(entry[0]);
    const previous = exact.get(key);
    if (!previous || previous[1] < entry[1]) exact.set(key, entry);
  }
  const labels = labelsIn(prompt);
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
    for (const form of shortenedForms(name, labels)) addUnique(aliases, form, entry);
  }

  return {
    match(text) {
      const key = exactKey(text);
      const folded = looseKey(key);
      if (exact.has(key)) return exact.get(key);
      if (loose.has(folded)) return loose.get(folded);
      if (aliases.has(folded)) return aliases.get(folded);
      if (key.startsWith('the ')) {
        const withoutArticle = looseKey(key.slice(4));
        if (withoutArticle.length >= 3) {
          return unique.has(withoutArticle) ? unique.get(withoutArticle) : aliases.get(withoutArticle);
        }
      }
      return undefined;
    },

    suggest(text) {
      const guess = looseKey(text);
      if (guess.length < 4 || guess.length > 48) return null;
      if (!spelling) {
        spelling = Array.from({ length: 51 }, () => []);
        for (const index of [unique, aliases]) {
          for (const [key, entry] of index) {
            if (index === aliases && unique.has(key)) continue;
            if (key.length >= 3 && key.length <= 50) spelling[key.length].push([key, entry]);
          }
        }
      }
      const limit = guess.length >= 8 ? 2 : 1;
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
