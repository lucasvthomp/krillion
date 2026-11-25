import { createOcean } from './ocean.mjs?v=8';
import { facts } from './landmarks.mjs?v=3';
import { createDiveOverlay } from './dive-overlay.mjs?v=2';
import { buildLookup, exactKey } from './answers.mjs?v=17';
import { renderDiveLog } from './dive-log.mjs?v=16';
import { setupMultiplayer } from './multiplayer.mjs?v=18';
import { reportMiss } from './miss-log.mjs?v=1';

const roundsPerGame = 7;
const readingSeconds = 3;
const roundSeconds = 25;
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
const diveLog = byId('log');
const loadStatus = byId('load-status');
const resultStatus = byId('result-status');
const startButton = byId('start');
const replayButton = byId('replay');
const mainMenuButton = byId('main-menu');
const nextButton = byId('next');
const form = byId('answer-form');
const answerInput = byId('answer');
const submitAnswer = form.querySelector('button[type=submit]');
const passButton = byId('skip');
const countIn = byId('count-in');
const timer = byId('timer');
const timeBar = byId('time-bar');
const retryStatus = byId('retry-status');
const suggestionBox = byId('spelling-suggestion');
const suggestionQuestion = byId('suggestion-question');
const suggestionActions = byId('suggestion-actions');
const editSuggestion = byId('edit-suggestion');
const reveal = byId('reveal');
const roomWaiting = byId('room-waiting');
const diveLayer = byId('dive-layer');
const overlay = createDiveOverlay(diveLayer, facts, rarity);
// The depth readout counts up as the ocean dives, and the overlay labels what is at each depth.
const ocean = createOcean(byId('ocean'), {
  onDepth(depth) {
    byId('depth').value = depth.toLocaleString();
    byId('zone').textContent = oceanZones.find(([start]) => depth >= start)[1];
  },
  onFrame: overlay.update,
});
let diveRun = 0;
const help = byId('help');
const quitDialog = byId('quit-dialog');

let promptGroups;
let rounds = [];
let row = 0;
let log = [];
let score = 0;
let best = readBest();
let deadline = 0;
let answerDeadline = 0;
let ticker;
let phase = 'idle';
let suggestionChoices = [];
let roomRoundKey;
let roomGuess;
let roomPending = false;

function bankUrl(file) {
  return new URL(`./bank/${file}?v=20`, import.meta.url);
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

async function loadBankAnswers({ id, count }) {
  if (typeof id !== 'string' || !/^\d{4,}$/u.test(id) || !Number.isSafeInteger(count) || count < 1) {
    throw new Error('Invalid answer bank details.');
  }
  const response = await fetch(bankUrl(`${id}.bank`));
  if (!response.ok || !response.body) throw new Error(`Answer bank returned ${response.status}`);
  const decompressed = response.body.pipeThrough(new DecompressionStream('gzip'));
  const answers = await new Response(decompressed).json();
  if (!Array.isArray(answers) || answers.length !== count) throw new Error('Incomplete answer bank.');
  return answers;
}

async function loadRound(prompt) {
  const answers = await loadBankAnswers(prompt);
  return {
    ...prompt,
    answers,
    lookup: buildLookup(answers, prompt.prompt),
  };
}

async function prepareRounds() {
  if (!promptGroups) await loadIndex();
  return Promise.all(drawPrompts().map(loadRound));
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
  mainMenuButton.disabled = true;
  loadStatus.textContent = resultStatus.textContent = 'Preparing seven rounds…';
  try {
    rounds = await prepareRounds();
    row = 0;
    score = 0;
    log = [];
    diveLog.replaceChildren();
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
    mainMenuButton.disabled = false;
  }
}

function showRound() {
  const readEnd = performance.now() + readingSeconds * 1000;
  showPrompt(rounds[row], row, roundsPerGame, readEnd, readEnd + roundSeconds * 1000);
}

function showPrompt(current, index, total, readEnd, endAt) {
  clearInterval(ticker);
  stopDive();
  byId('round-position').textContent = `Round ${index + 1} of ${total}`;
  byId('category').textContent = current.category;
  byId('prompt').textContent = current.prompt;
  roundPanel.classList.remove('revealed');
  reveal.hidden = true;
  roomWaiting.hidden = true;
  nextButton.hidden = false;
  form.hidden = true;
  countIn.hidden = false;
  timer.classList.remove('urgent');
  answerInput.value = '';
  retryStatus.textContent = '';
  hideSuggestion();
  setRoomPending(false);
  phase = 'reading';
  deadline = readEnd;
  answerDeadline = endAt;
  byId('prompt').focus();
  ticker = setInterval(updateTimer, 100);
  updateTimer();
}

function updateTimer() {
  if (phase === 'reading') {
    const seconds = Math.max(0, (deadline - performance.now()) / 1000);
    byId('read-count').textContent = Math.ceil(seconds);
    if (seconds) return;
    phase = 'answering';
    deadline = answerDeadline;
    countIn.hidden = true;
    form.hidden = false;
    if (!quitDialog.open && !help.open) answerInput.focus();
  }
  const seconds = Math.max(0, (deadline - performance.now()) / 1000);
  timer.textContent = `${Math.ceil(seconds)}s`;
  timer.classList.toggle('urgent', seconds <= 5);
  timeBar.value = seconds;
  if (!seconds) expireRound();
}

function expireRound() {
  if (!multiplayer.active) {
    finishRound('timeout');
    return;
  }
  multiplayer.sendTurn('expired');
  if (phase === 'answering') showRoomFeedback('Time is up', 0, 'none');
}

function finishRound(reason, matched) {
  if (phase !== 'answering') return;
  phase = 'idle';
  clearInterval(ticker);
  hideSuggestion();
  const current = rounds[row];
  const points = matched ? matched[1] : 0;
  const tier = matched ? matched[2] : 'none';
  const from = score * 10;
  score += points;
  log.push({ prompt: current.prompt, answer: matched?.[0], points, tier });
  dive(matched?.[0], points, tier, from, () => {
    showFeedback(matched?.[0] ?? (reason === 'timeout' ? 'Time is up' : 'Round passed'), points, tier);
    nextButton.textContent = row + 1 === roundsPerGame ? 'See dive log' : 'Next round';
    if (!quitDialog.open && !help.open) nextButton.focus();
  });
}

// An accepted answer sinks from the depth before it to the depth after it, past a line at the
// depth each rarity tier would reach, and the round's result shows once it arrives. A round with
// no points shows its result at once. The prompt and room screens are hidden while it sinks.
function dive(name, points, tier, from, then) {
  const run = ++diveRun;
  form.hidden = true;
  if (!points) {
    updateDepth();
    then();
    return;
  }
  document.body.classList.add('diving');
  overlay.startDive(name, tier, from);
  ocean.dive(from + points * 10).then(() => {
    if (run !== diveRun) return;
    document.body.classList.remove('diving');
    overlay.endDive();
    then();
  });
}

function stopDive() {
  diveRun += 1;
  document.body.classList.remove('diving');
  overlay.endDive();
  overlay.clearLines();
}

function showFeedback(name, points, tier) {
  byId('feedback').dataset.tier = tier;
  byId('answer-tier').textContent = rarity[tier]?.[0] ?? (tier === 'none' ? 'No score' : 'Accepted');
  byId('answer-name').textContent = name;
  byId('depth-gain').textContent = `+${points} pts · ${points * 10} m deeper`;
  form.hidden = true;
  roundPanel.classList.add('revealed');
  reveal.hidden = false;
}

function hideSuggestion() {
  suggestionChoices = [];
  suggestionBox.hidden = true;
  for (const button of suggestionActions.querySelectorAll('.choice')) button.remove();
}

// The readout and the depth labels show during a game (the home screen is hidden then). The ocean
// updates the number as it moves.
function updateDepth(visible = home.hidden) {
  byId('depth-readout').hidden = diveLayer.hidden = !visible;
  ocean.descend(score * 10, visible);
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
  overlay.clearLines();
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
  renderDiveLog(diveLog, log, rounds, rarity);
  byId('results-heading').focus();
}

function returnToMenu() {
  clearInterval(ticker);
  stopDive();
  hideSuggestion();
  phase = 'idle';
  roomRoundKey = null;
  rounds = [];
  log = [];
  score = 0;
  diveLog.replaceChildren();
  roundPanel.hidden = resultsPanel.hidden = true;
  home.hidden = false;
  updateDepth();
  startButton.focus();
}

function showRoomSurface(points) {
  clearInterval(ticker);
  hideSuggestion();
  setRoomPending(false);
  phase = 'idle';
  roomRoundKey = null;
  home.hidden = roundPanel.hidden = resultsPanel.hidden = true;
  // A dive still under way clears its own lines when it ends.
  if (!document.body.classList.contains('diving')) overlay.clearLines();
  score = points ?? 0;
  updateDepth(points !== undefined);
}

function showMultiplayerRound(packet, player) {
  score = player.score;
  updateDepth(true);
  if (roomRoundKey === packet.key) return;
  roomRoundKey = packet.key;
  home.hidden = resultsPanel.hidden = true;
  roundPanel.hidden = false;
  const offset = performance.now() - packet.serverNow;
  showPrompt(packet.prompt, packet.index, packet.total, packet.readUntil + offset, packet.endAt + offset);
}

function showRoomFeedback(name, points, tier) {
  clearInterval(ticker);
  hideSuggestion();
  setRoomPending(false);
  phase = 'idle';
  // The room's next update brings the same new score, so the dive is not repeated.
  const from = score * 10;
  score += points;
  dive(name, points, tier, from, () => {
    // If the round ended during the dive, the leaderboard shows instead of the round.
    if (roundPanel.hidden) overlay.clearLines();
    showFeedback(name, points, tier);
    nextButton.hidden = true;
    roomWaiting.textContent = 'Waiting for the round to finish.';
    roomWaiting.hidden = false;
  });
}

function setRoomPending(pending) {
  roomPending = pending;
  submitAnswer.disabled = passButton.disabled = pending;
}

// Offer one close spelling, or every answer an ambiguous guess could mean.
function offerSuggestion(choices) {
  hideSuggestion();
  suggestionChoices = choices;
  retryStatus.textContent = '';
  if (choices.length === 1) {
    const name = document.createElement('strong');
    name.textContent = choices[0][0];
    suggestionQuestion.replaceChildren('Did you mean ', name, '?');
  } else {
    suggestionQuestion.textContent = 'More than one answer matches. Which did you mean?';
  }
  const buttons = choices.map((choice) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'primary choice';
    button.textContent = choices.length === 1 ? 'Use answer' : choice[0];
    if (choices.length === 1) button.setAttribute('aria-describedby', 'suggestion-question');
    button.addEventListener('click', () => chooseSuggestion(choice));
    return button;
  });
  editSuggestion.before(...buttons);
  suggestionBox.hidden = false;
  buttons[0].focus();
}

function chooseSuggestion(choice) {
  if (phase !== 'answering' || !suggestionChoices.includes(choice)) return;
  if (performance.now() >= deadline) expireRound();
  else if (multiplayer.active) sendRoomAnswer('guess', choice[0]);
  else finishRound('guess', choice);
}

function miss(guess) {
  answerInput.value = '';
  retryStatus.textContent = `“${guess}” wasn’t in the answer bank. Try again.`;
  answerInput.focus();
}

function crowded(guess) {
  answerInput.focus();
  answerInput.select();
  retryStatus.textContent = `Lots of answers match “${guess}”. Add more of the name.`;
}

function sendRoomAnswer(type, guess) {
  if (roomPending) return;
  hideSuggestion();
  setRoomPending(true);
  roomGuess = guess;
  retryStatus.textContent = type === 'guess' ? 'Checking answer…' : '';
  multiplayer.sendTurn(type, guess);
}

const multiplayer = setupMultiplayer({
  loadRounds: prepareRounds,
  loadAnswers: loadBankAnswers,
  rarity,
  showSurface: showRoomSurface,
  showRound: showMultiplayerRound,
  goHome: returnToMenu,
  onAnswer(packet) {
    if (phase !== 'answering' || roomRoundKey !== packet.key) return;
    setRoomPending(false);
    if (packet.status === 'accepted') showRoomFeedback(packet.name, packet.points, packet.tier);
    else if (packet.status === 'passed') showRoomFeedback('Round passed', 0, 'none');
    else if (packet.status === 'suggestion') {
      const names = Array.isArray(packet.names) ? packet.names : [packet.name];
      const choices = names.filter((name) => typeof name === 'string').slice(0, 6).map((name) => [name]);
      if (choices.length) offerSuggestion(choices);
      else miss(roomGuess);
    } else if (packet.status === 'crowded') crowded(roomGuess);
    else if (packet.status === 'miss') miss(roomGuess);
    else if (packet.status === 'early') retryStatus.textContent = 'Wait for the round timer to start.';
  },
});

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
    expireRound();
    return;
  }
  if (multiplayer.active) {
    sendRoomAnswer('guess', guess);
    return;
  }
  hideSuggestion();
  const lookup = rounds[row].lookup;
  const matched = lookup.match(guess);
  if (matched) {
    finishRound('guess', matched);
    return;
  }
  const suggestion = lookup.suggest(guess);
  if (suggestion.choices.length) offerSuggestion(suggestion.choices);
  else if (suggestion.crowded) crowded(guess);
  else {
    reportMiss({ prompt: rounds[row].prompt, guess, player: 'Solo' });
    miss(guess);
  }
});
answerInput.addEventListener('input', hideSuggestion);
editSuggestion.addEventListener('click', () => {
  hideSuggestion();
  answerInput.focus();
  answerInput.select();
});
passButton.addEventListener('click', () => {
  if (multiplayer.active) sendRoomAnswer('pass');
  else finishRound('skip');
});
nextButton.addEventListener('click', () => {
  row += 1;
  if (row < roundsPerGame) showRound();
  else showResults();
});
startButton.addEventListener('click', startGame);
replayButton.addEventListener('click', startGame);
mainMenuButton.addEventListener('click', returnToMenu);
byId('help-button').addEventListener('click', () => help.showModal());
byId('quit').addEventListener('click', () => {
  byId('quit-heading').textContent = multiplayer.active ? (multiplayer.hosting ? 'Close the room?' : 'Leave the room?') : 'End this dive?';
  byId('quit-description').textContent = multiplayer.active && multiplayer.hosting ?
    'The room will close for everyone.' : 'You’ll lose the score for this game.';
  byId('quit-confirm').textContent = multiplayer.active ? 'Leave room' : 'End dive';
  quitDialog.returnValue = '';
  quitDialog.showModal();
});
quitDialog.addEventListener('close', () => {
  if (quitDialog.returnValue !== 'quit') return;
  if (multiplayer.active) multiplayer.leave();
  else returnToMenu();
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
