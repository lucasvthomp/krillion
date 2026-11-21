import { createOcean } from './ocean.mjs?v=3';

const roundsPerGame = 7;
const readingSeconds = 3;
const roundSeconds = 25;
const missPenalty = 3;
const maxScore = roundsPerGame * 100;
const bestKey = 'krillion.best.v1';
const rarity = {
  plankton: ['Plankton', 10],
  tooclever: ['Too Clever', 15],
  schooler: ['Schooler', 30],
  rare: ['Rare', 60],
  deepcut: ['Deep Cut', 85],
  krillion: ['One in a Krillion', 100],
};
const oceanZones = [
  [6000, 'Hadal zone'], [4000, 'Abyssal zone'], [1000, 'Midnight zone'],
  [200, 'Twilight zone'], [1, 'Sunlight zone'], [0, 'Surface'],
];
const byId = (id) => document.getElementById(id);
const home = byId('home');
const roundPanel = byId('round');
const resultsPanel = byId('results');
const loadStatus = byId('load-status');
const resultStatus = byId('result-status');
const startButton = byId('start');
const replayButton = byId('replay');
const nextButton = byId('next');
const form = byId('answer-form');
const answerInput = byId('answer');
const countIn = byId('count-in');
const timer = byId('timer');
const timeBar = byId('time-bar');
const retryStatus = byId('retry-status');
const reveal = byId('reveal');
const ocean = createOcean(byId('ocean'));
const help = byId('help');
const quitDialog = byId('quit-dialog');

let promptGroups;
let rounds = [];
let row = 0;
let log = [];
let score = 0;
let best = readBest();
let deadline = 0;
let ticker;
let phase = 'idle';

function exactKey(text) {
  return text.normalize('NFKC').trim().toLowerCase().replace(/\s+/gu, ' ');
}

function looseKey(text) {
  return exactKey(text).normalize('NFKD').replace(/\p{M}/gu, '')
    .replace(/&/gu, 'and').replace(/[^\p{L}\p{N}+#]/gu, '');
}

function buildLookup(answers) {
  const exact = new Map();
  const loose = new Map();
  for (const entry of answers) {
    const key = exactKey(entry[0]);
    const previousExact = exact.get(key);
    if (!previousExact || previousExact[1] < entry[1]) exact.set(key, entry);
    const folded = looseKey(entry[0]);
    if (!folded) continue;
    const previousLoose = loose.get(folded);
    if (!loose.has(folded)) loose.set(folded, entry);
    else if (previousLoose && previousLoose[1] !== entry[1]) loose.set(folded, null);
  }
  return (text) => exact.get(exactKey(text)) ?? loose.get(looseKey(text));
}

function bankUrl(file) {
  return new URL(`./bank/${file}`, import.meta.url);
}

async function loadIndex() {
  const response = await fetch(bankUrl('index.json'));
  if (!response.ok) throw new Error(`Prompt index returned ${response.status}`);
  const { prompts } = await response.json();
  const groups = new Map();
  for (const prompt of prompts) {
    const key = exactKey(prompt.prompt).replace(/[‘’]/gu, "'");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(prompt);
  }
  if (groups.size < roundsPerGame) throw new Error('The prompt bank has too few distinct prompts.');
  promptGroups = [...groups.values()];
}

function drawPrompts() {
  const pool = [...promptGroups];
  for (let index = 0; index < roundsPerGame; index++) {
    const selected = index + Math.floor(Math.random() * (pool.length - index));
    [pool[index], pool[selected]] = [pool[selected], pool[index]];
  }
  return pool.slice(0, roundsPerGame).map((group) => group[Math.floor(Math.random() * group.length)]);
}

async function loadRound(prompt) {
  const response = await fetch(bankUrl(`${prompt.id}.bank`));
  if (!response.ok || !response.body) throw new Error(`Answer bank returned ${response.status}`);
  const decompressed = response.body.pipeThrough(new DecompressionStream('gzip'));
  const answers = await new Response(decompressed).json();
  if (answers.length !== prompt.count || !answers.length) throw new Error('Incomplete answer bank.');
  return {
    ...prompt,
    match: buildLookup(answers),
    example: answers.reduce((top, answer) => answer[1] > top[1] ? answer : top),
  };
}

async function initialize() {
  startButton.disabled = true;
  try {
    await loadIndex();
    loadStatus.textContent = '';
    startButton.textContent = 'Start dive';
  } catch (error) {
    console.error(error);
    loadStatus.textContent = 'The prompt bank could not load. Check your connection and try again.';
    startButton.textContent = 'Retry loading';
  } finally {
    startButton.disabled = false;
  }
}

async function startGame() {
  if (!promptGroups) {
    await initialize();
    return;
  }
  startButton.disabled = true;
  replayButton.disabled = true;
  loadStatus.textContent = resultStatus.textContent = 'Preparing seven rounds…';
  try {
    rounds = await Promise.all(drawPrompts().map(loadRound));
    row = 0;
    score = 0;
    log = [];
    loadStatus.textContent = '';
    home.hidden = true;
    resultsPanel.hidden = true;
    roundPanel.hidden = false;
    updateDepth();
    showRound();
  } catch (error) {
    console.error(error);
    loadStatus.textContent = resultStatus.textContent = 'The answer bank could not load. Try starting again.';
  } finally {
    startButton.disabled = false;
    replayButton.disabled = false;
  }
}

function showRound() {
  const current = rounds[row];
  byId('round-position').textContent = `Round ${row + 1} of ${roundsPerGame}`;
  byId('category').textContent = current.category;
  byId('prompt').textContent = current.prompt;
  roundPanel.classList.remove('revealed');
  reveal.hidden = true;
  form.hidden = true;
  countIn.hidden = false;
  timer.classList.remove('urgent');
  answerInput.value = '';
  retryStatus.textContent = '';
  phase = 'reading';
  deadline = performance.now() + readingSeconds * 1000;
  byId('prompt').focus();
  updateTimer();
  ticker = setInterval(updateTimer, 100);
}

function updateTimer() {
  const seconds = Math.max(0, (deadline - performance.now()) / 1000);
  if (phase === 'reading') {
    byId('read-count').textContent = Math.ceil(seconds);
    if (seconds) return;
    phase = 'answering';
    deadline = performance.now() + roundSeconds * 1000;
    timer.textContent = `${roundSeconds}s`;
    timeBar.value = roundSeconds;
    countIn.hidden = true;
    form.hidden = false;
    if (!quitDialog.open && !help.open) answerInput.focus();
    return;
  }
  timer.textContent = `${Math.ceil(seconds)}s`;
  timer.classList.toggle('urgent', seconds <= 5);
  timeBar.value = seconds;
  if (!seconds) finishRound('timeout');
}

function finishRound(reason, matched) {
  if (phase !== 'answering') return;
  phase = 'idle';
  clearInterval(ticker);
  const current = rounds[row];
  const points = matched ? matched[1] : 0;
  const tier = matched ? matched[2] : 'none';
  score += points;
  log.push({ prompt: current.prompt, answer: matched?.[0], points, tier, example: current.example });
  updateDepth();

  byId('feedback').dataset.tier = tier;
  byId('answer-tier').textContent = rarity[tier]?.[0] ?? (matched ? 'Accepted' : 'No score');
  byId('answer-name').textContent = matched?.[0] ?? (reason === 'timeout' ? 'Time is up' : 'Round passed');
  byId('depth-gain').textContent = `+${points} pts · ${points * 10} m deeper`;
  form.hidden = true;
  roundPanel.classList.add('revealed');
  reveal.hidden = false;
  nextButton.textContent = row + 1 === roundsPerGame ? 'See dive log' : 'Next round';
  if (!quitDialog.open && !help.open) nextButton.focus();
}

function updateDepth() {
  const depth = score * 10;
  byId('depth-readout').hidden = !home.hidden;
  byId('depth').value = depth.toLocaleString();
  byId('zone').textContent = oceanZones.find(([start]) => depth >= start)[1];
  ocean.descend(depth, home.hidden);
}

function readBest() {
  try {
    return Math.min(maxScore, Math.max(0, Number(localStorage.getItem(bestKey)) || 0));
  } catch {
    return 0;
  }
}

function showBest() {
  byId('best').textContent = best ? `Personal best · ${best} pts` : '';
}

function showResults() {
  roundPanel.hidden = true;
  resultsPanel.hidden = false;
  resultStatus.textContent = '';
  resultsPanel.querySelector('details').open = false;
  byId('share-text').hidden = true;
  const record = score > best;
  if (record) {
    best = score;
    try { localStorage.setItem(bestKey, String(best)); } catch { /* Browser storage is optional. */ }
    showBest();
  }
  const depth = (score * 10).toLocaleString();
  byId('summary').textContent = `${score} of ${maxScore} points · ${depth} m${record ? ' · New personal best' : ''}`;
  byId('log').replaceChildren(...log.map((entry) => {
    const item = document.createElement('li');
    const name = document.createElement('div');
    const answer = document.createElement('small');
    const points = document.createElement('strong');
    name.textContent = entry.prompt;
    answer.textContent = entry.answer ? `${entry.answer} · ${rarity[entry.tier]?.[0] ?? 'Accepted'}` : 'No answer';
    name.append(answer);
    const [example, exampleScore] = entry.example;
    if (entry.points < exampleScore) {
      const bestAnswer = document.createElement('small');
      bestAnswer.textContent = `High-scoring answer · ${example} (${exampleScore} pts)`;
      name.append(bestAnswer);
    }
    item.dataset.tier = entry.tier;
    points.textContent = `${entry.points} pts`;
    item.append(name, points);
    return item;
  }));
  byId('results-heading').focus();
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  if (phase !== 'answering') return;
  const guess = answerInput.value.trim();
  if (!guess) {
    answerInput.value = '';
    answerInput.reportValidity();
    return;
  }
  if (performance.now() >= deadline) {
    finishRound('timeout');
    return;
  }
  const matched = rounds[row].match(guess);
  if (matched) {
    finishRound('guess', matched);
    return;
  }
  deadline -= missPenalty * 1000;
  answerInput.value = '';
  retryStatus.textContent = `“${guess}” wasn’t in the bank · −${missPenalty}s. Try again.`;
  updateTimer();
  if (phase === 'answering') answerInput.focus();
});
byId('skip').addEventListener('click', () => finishRound('skip'));
nextButton.addEventListener('click', () => {
  row += 1;
  if (row < roundsPerGame) showRound();
  else showResults();
});
startButton.addEventListener('click', startGame);
replayButton.addEventListener('click', startGame);
byId('help-button').addEventListener('click', () => help.showModal());
byId('quit').addEventListener('click', () => {
  quitDialog.returnValue = '';
  quitDialog.showModal();
});
quitDialog.addEventListener('close', () => {
  if (quitDialog.returnValue !== 'quit') return;
  clearInterval(ticker);
  phase = 'idle';
  rounds = [];
  log = [];
  score = 0;
  roundPanel.hidden = true;
  home.hidden = false;
  updateDepth();
  startButton.focus();
});
byId('share').addEventListener('click', async () => {
  const details = log.map(({ points }) => points).join(' · ');
  const text = `Krillion · ${score}/${maxScore} points\n${details}\n${new URL('./', location.href)}`;
  try {
    await navigator.clipboard.writeText(text);
    byId('share-text').hidden = true;
    resultStatus.textContent = 'Result copied.';
  } catch {
    const shareText = byId('share-text');
    shareText.value = text;
    shareText.hidden = false;
    shareText.select();
    resultStatus.textContent = 'Select and copy this result.';
  }
});
for (const [tier, [label, points]] of Object.entries(rarity)) {
  const item = document.createElement('li');
  item.dataset.tier = tier;
  item.textContent = `${label} · ${points} pts`;
  byId('tier-legend').append(item);
}
showBest();
initialize();
