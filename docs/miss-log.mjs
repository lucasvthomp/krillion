// Sends every rejected guess to a Google Form so missing answers can be reviewed and added later.
// Guesses wait in browser storage until they are sent, so a dropped connection loses nothing.
// The "Missed answers" form; responses go to the "Missed answers (Responses)" sheet.
const form = {
  action: 'https://docs.google.com/forms/d/e/1FAIpQLScVyihZf2CH4ctdompbTvRvGEX81zTS0UA7iQKKFqtKrNK1Pg/formResponse',
  prompt: 'entry.1518496953',
  guess: 'entry.1839461944',
  player: 'entry.400548149',
  time: 'entry.641757688',
};
const queueKey = 'krillion.misses.v1';
const maxQueued = 2000;
const sentThisSession = new Set();
let sending = false;

function readQueue() {
  try {
    const queue = JSON.parse(localStorage.getItem(queueKey) ?? '[]');
    return Array.isArray(queue) ? queue : [];
  } catch {
    return [];
  }
}

function writeQueue(queue) {
  try {
    localStorage.setItem(queueKey, JSON.stringify(queue.slice(-maxQueued)));
  } catch { /* Browser storage is optional. */ }
}

async function flush() {
  if (sending || !form.action || !navigator.onLine) return;
  sending = true;
  try {
    let queue = readQueue();
    while (queue.length) {
      const [miss] = queue;
      const body = new URLSearchParams({
        [form.prompt]: miss.prompt, [form.guess]: miss.guess, [form.player]: miss.player, [form.time]: miss.time,
      });
      // Google Forms does not allow reading the reply, so a request that reaches the server counts as sent.
      await fetch(form.action, { method: 'POST', mode: 'no-cors', body, keepalive: true });
      queue = readQueue().slice(1);
      writeQueue(queue);
    }
  } catch {
    // Offline or blocked: keep the queue and try again later.
  } finally {
    sending = false;
  }
}

export function reportMiss({ prompt, guess, player }) {
  if (!form.action || typeof guess !== 'string' || !guess.trim()) return;
  const entry = {
    prompt: String(prompt).slice(0, 300),
    guess: guess.trim().slice(0, 300),
    player: String(player || 'Solo').slice(0, 40),
    time: new Date().toISOString(),
  };
  const key = `${entry.prompt}\n${entry.guess.toLowerCase()}\n${entry.player}`;
  if (sentThisSession.has(key)) return;
  sentThisSession.add(key);
  writeQueue([...readQueue(), entry]);
  flush();
}

addEventListener('online', flush);
flush();
