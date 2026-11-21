const roundsPerGame = 7;
const roundSeconds = 25;
const maxScore = roundsPerGame * 100;
const bestKey = 'krillion.best.v1';
const rarity = new Map([
  [100, 'Exceptional'], [85, 'Very uncommon'], [60, 'Uncommon'],
  [30, 'Familiar'], [15, 'Common'], [10, 'Very common'],
]);
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
const reveal = byId('reveal');
const chart = byId('chart');
const help = byId('help');
const markers = Array.from({ length: roundsPerGame }, () => {
  const marker = document.createElement('span');
  marker.className = 'marker';
  byId('round-markers').append(marker);
  return marker;
});

let promptGroups;
let rounds = [];
let row = 0;
let log = [];
let score = 0;
let best = readBest();
let deadline = 0;
let ticker;
let active = false;

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
    home.hidden = true;
    resultsPanel.hidden = true;
    roundPanel.hidden = false;
    updateGauge();
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
  reveal.hidden = true;
  form.hidden = false;
  answerInput.value = '';
  active = true;
  deadline = performance.now() + roundSeconds * 1000;
  updateTimer();
  ticker = setInterval(updateTimer, 100);
  answerInput.focus();
}

function updateTimer() {
  const seconds = Math.max(0, (deadline - performance.now()) / 1000);
  byId('timer').textContent = `${Math.ceil(seconds)}s`;
  byId('time-bar').value = seconds;
  if (!seconds) finishRound('timeout');
}

function finishRound(reason, guess = '') {
  if (!active) return;
  active = false;
  clearInterval(ticker);
  const current = rounds[row];
  const matched = reason === 'guess' && current.match(guess);
  const points = matched ? matched[1] : 0;
  score += points;
  log.push({ prompt: current.prompt, guess, answer: matched ? matched[0] : '', points, reason });
  updateGauge();

  const feedback = byId('feedback');
  if (matched) feedback.textContent = `${matched[0]} · +${points} pts · ${rarity.get(points) ?? 'Accepted'}`;
  else if (reason === 'timeout') feedback.textContent = 'Time is up · 0 pts';
  else if (reason === 'skip') feedback.textContent = 'Round skipped · 0 pts';
  else feedback.textContent = `“${guess}” wasn’t in the answer bank · 0 pts`;

  const [example, exampleScore] = current.example;
  byId('example').textContent = points < exampleScore ? `High-scoring answer · ${example} (${exampleScore} pts)` : '';
  form.hidden = true;
  reveal.hidden = false;
  nextButton.textContent = row + 1 === roundsPerGame ? 'See dive log' : 'Next round';
  nextButton.focus();
}

function updateGauge() {
  byId('depth').value = (score * 10).toLocaleString();
  byId('score').textContent = `${score} / ${maxScore} pts`;
  chart.style.setProperty('--depth', `${score / maxScore * 100}%`);
  markers.forEach((marker, index) => {
    const entry = log[index];
    marker.classList.toggle('hit', Boolean(entry?.answer));
    marker.classList.toggle('miss', Boolean(entry && !entry.answer));
  });
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
    answer.textContent = entry.answer || (entry.guess ? `Your guess · ${entry.guess}` : 'No answer');
    name.append(answer);
    points.textContent = `${entry.points} pts`;
    item.append(name, points);
    return item;
  }));
  byId('results-heading').focus();
}

function drawContours() {
  const canvas = byId('contours');
  const { width, height } = chart.getBoundingClientRect();
  if (!width || !height) return;
  const scale = Math.min(devicePixelRatio, 2);
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const context = canvas.getContext('2d');
  if (!context) return;
  context.scale(scale, scale);
  context.lineWidth = 1;

  for (let step = 0; step <= 4; step++) {
    const y = 23 + (height - 45) * step / 4;
    context.beginPath();
    context.strokeStyle = '#9cdfcc35';
    context.setLineDash([3, 5]);
    context.moveTo(19, y);
    context.lineTo(width - 66, y);
    context.stroke();
  }
  context.setLineDash([]);
  for (let line = 0; line < 37; line++) {
    const radius = 14 + line * Math.max(width, height) / 37;
    context.strokeStyle = line % 5 ? '#63c5ad38' : '#8cdfbf6b';
    context.beginPath();
    for (let step = 0; step <= 192; step++) {
      const angle = step / 192 * Math.PI * 2;
      const offset = 1 + .14 * Math.sin(angle * 3 + line * .06) + .08 * Math.cos(angle * 5 - line * .065);
      const x = width * .31 + Math.cos(angle) * radius * offset * 1.1;
      const y = height * .69 + Math.sin(angle) * radius * offset * .61;
      if (step === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.stroke();
  }
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const guess = answerInput.value.trim();
  if (!guess) {
    answerInput.value = '';
    answerInput.reportValidity();
    return;
  }
  if (performance.now() >= deadline) finishRound('timeout');
  else finishRound('guess', guess);
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
new ResizeObserver(drawContours).observe(chart);
showBest();
initialize();
