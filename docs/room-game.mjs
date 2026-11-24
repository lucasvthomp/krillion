export const roomAlphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const maxPlayers = 12;
export const readingMs = 3000;
export const answeringMs = 25000;
const hostId = 'host';
const missedTurn = { status: 'timeout', points: 0, tier: 'none' };

export function displayName(value) {
  if (typeof value !== 'string') return '';
  return value.replace(/[\p{Cc}\p{Cf}]/gu, '').trim().replace(/\s+/gu, ' ').slice(0, 24);
}

export function roomCode(value) {
  return value.toUpperCase().replace(/[\s-]/gu, '');
}

export function validRoomCode(code) {
  return code.length === 6 && [...code].every((letter) => roomAlphabet.includes(letter));
}

export function createRoomGame({ code, name, loadRounds, publicUpdate, privateUpdate, now = Date.now, schedule = setTimeout, cancel = clearTimeout }) {
  const players = new Map([[hostId, { name, score: 0, ready: true, turn: null, history: [] }]]);
  let phase = 'lobby';
  let rounds = [];
  let index = 0;
  let run = 0;
  let readUntil = 0;
  let endAt = 0;
  let alarm;
  let closed = false;
  const roundKey = () => `${run}:${index}`;
  const canStart = () => (phase === 'lobby' || phase === 'finished') &&
    players.size >= 2 && [...players.values()].every((player) => player.ready);

  function snapshot() {
    const current = rounds[index];
    const showScores = phase === 'leaderboard' || phase === 'finished';
    return {
      type: 'state', code, phase, index, total: rounds.length, key: roundKey(), canStart: canStart(),
      serverNow: now(), readUntil, endAt,
      prompt: phase === 'round' ? { prompt: current.prompt, category: current.category } : null,
      ...(phase === 'finished' ? { reviewRounds: rounds.map(({ id, prompt, count }) => ({ id, prompt, count })) } : {}),
      players: [...players].map(([id, player]) => ({
        id, name: player.name, score: player.score, ready: player.ready, done: Boolean(player.turn),
        ...(showScores ? { result: player.history[index] ?? missedTurn } : {}),
        ...(phase === 'finished' ? { history: player.history.slice() } : {}),
      })),
    };
  }

  function broadcast() {
    if (!closed) publicUpdate(snapshot());
  }

  function leaderboard() {
    if (phase !== 'round' || closed) return;
    cancel(alarm);
    for (const player of players.values()) player.history.push(player.turn ?? missedTurn);
    phase = index + 1 === rounds.length ? 'finished' : 'leaderboard';
    if (phase === 'finished') {
      for (const player of players.values()) player.ready = false;
    }
    broadcast();
  }

  function beginRound() {
    for (const player of players.values()) player.turn = null;
    phase = 'round';
    readUntil = now() + readingMs;
    endAt = readUntil + answeringMs;
    alarm = schedule(leaderboard, endAt - now());
    broadcast();
  }

  async function start() {
    if (!canStart()) return;
    const previousPhase = phase;
    phase = 'loading';
    broadcast();
    try {
      const nextRounds = await loadRounds();
      if (closed) return;
      if (players.size < 2) throw new Error('At least two players are needed to start.');
      if (!nextRounds.length) throw new Error('The prompt bank could not load.');
      rounds = nextRounds;
      for (const player of players.values()) {
        player.score = 0;
        player.history = [];
      }
      index = 0;
      run += 1;
      beginRound();
    } catch (error) {
      if (closed) return;
      phase = previousPhase;
      broadcast();
      privateUpdate(hostId, { type: 'notice', message: error.message });
    }
  }

  function answer(id, player, command) {
    if (phase !== 'round' || command.key !== roundKey() || player.turn) return;
    const answerPacket = (data) => privateUpdate(id, { type: 'answer', key: roundKey(), ...data });
    const time = now();
    if (time >= endAt) {
      leaderboard();
      return;
    }
    if (time < readUntil) {
      answerPacket({ status: 'early' });
      return;
    }
    if (command.type === 'expired') return;

    let matched;
    if (command.type === 'guess') {
      if (typeof command.guess !== 'string' || !command.guess.trim() || command.guess.length > 300) {
        answerPacket({ status: 'miss' });
        return;
      }
      const { lookup } = rounds[index];
      matched = lookup.match(command.guess);
      if (!matched) {
        const { choices, crowded } = lookup.suggest(command.guess);
        if (choices.length) answerPacket({ status: 'suggestion', name: choices[0][0], names: choices.map(([name]) => name) });
        else answerPacket({ status: crowded ? 'crowded' : 'miss' });
        return;
      }
    }
    const result = matched ?
      { status: 'accepted', answer: matched[0], points: matched[1], tier: matched[2] } :
      { status: 'passed', points: 0, tier: 'none' };
    player.turn = result;
    player.score += result.points;
    answerPacket({ status: result.status, name: result.answer, points: result.points, tier: result.tier });
    if ([...players.values()].every((member) => member.turn)) leaderboard();
    else broadcast();
  }

  return {
    snapshot,
    join(id, rawName) {
      const name = displayName(rawName);
      if (!name) return 'Enter a display name.';
      if (closed || (phase !== 'lobby' && phase !== 'finished')) return 'This room is in a dive. Try again when it finishes.';
      if (players.size >= maxPlayers) return 'This room is full.';
      if (players.has(id)) return 'You are already in this room.';
      players.set(id, { name, score: 0, ready: true, turn: null, history: [] });
      broadcast();
      return '';
    },
    leave(id) {
      if (!players.delete(id) || closed) return;
      if (phase === 'round' && [...players.values()].every((player) => player.turn)) leaderboard();
      else broadcast();
    },
    act(id, command) {
      const player = players.get(id);
      if (closed || !player || !command || typeof command !== 'object') return;
      if (command.type === 'start' && id === hostId) return start();
      if (command.type === 'continue' && id === hostId && phase === 'leaderboard') {
        index += 1;
        beginRound();
      } else if (command.type === 'ready' && phase === 'finished' && !player.ready) {
        player.ready = true;
        broadcast();
      } else if (['guess', 'pass', 'expired'].includes(command.type)) answer(id, player, command);
    },
    close() {
      closed = true;
      cancel(alarm);
    },
  };
}
