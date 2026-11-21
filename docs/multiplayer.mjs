import { displayName, roomCode, validRoomCode } from './room-game.mjs';
import { hostRoom, joinRoom } from './room-network.mjs';

export function setupMultiplayer({ loadRounds, showSurface, showRound, onAnswer, goHome }) {
  const get = (id) => document.getElementById(id);
  const screen = get('room-screen');
  const entry = get('room-entry');
  const lobby = get('room-lobby');
  const board = get('room-board');
  const boardHeading = get('room-board-heading');
  const nameInput = get('display-name');
  const codeInput = get('join-code');
  const notice = get('room-notice');
  const startButton = get('room-start');
  const continueButton = get('room-continue');
  const playAgain = get('room-replay');
  let session;
  let state;
  let generation = 0;

  function busy(active) {
    get('create-room').disabled = get('join-room').disabled = active;
    nameInput.disabled = codeInput.disabled = active;
  }

  function showEntry(message = '') {
    showSurface();
    screen.hidden = entry.hidden = false;
    lobby.hidden = board.hidden = get('leave-room').hidden = true;
    notice.textContent = message;
    busy(false);
    if (message) get('room-entry-heading').focus();
    else nameInput.focus();
  }

  function labelPlayer(player) {
    const markers = [];
    if (player.id === 'host') markers.push('Host');
    if (player.id === session.id) markers.push('You');
    return markers.join(' · ');
  }

  function playerRow(player, extra, rank) {
    const item = document.createElement('li');
    const name = document.createElement('span');
    name.textContent = rank ? `${rank}. ${player.name}` : player.name;
    const marker = labelPlayer(player);
    if (marker) name.textContent += ` (${marker})`;
    item.append(name, extra);
    return item;
  }

  function renderLobby(packet, host) {
    get('room-code').value = packet.code;
    get('room-players').replaceChildren(...packet.players.map((player) => {
      const extra = document.createElement('span');
      extra.className = 'room-player-meta';
      if (packet.phase === 'finished') extra.textContent = player.ready ? 'Ready' : 'At results';
      return playerRow(player, extra);
    }));
    let message = 'Waiting for the host to start.';
    if (packet.phase === 'loading') message = 'Preparing the next dive…';
    else if (packet.players.length < 2) message = 'Share the code to invite another player.';
    else if (packet.phase === 'finished' && !packet.canStart) message = 'Waiting for everyone to return from the results.';
    else if (host) message = '';
    get('lobby-status').textContent = message;
    startButton.hidden = !host;
    startButton.disabled = !packet.canStart;
  }

  function renderBoard(packet, host) {
    const finished = packet.phase === 'finished';
    boardHeading.textContent = finished ? 'Final leaderboard' : `Round ${packet.index + 1} leaderboard`;
    const ranked = [...packet.players].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
    let rank = 0;
    get('room-ranks').replaceChildren(...ranked.map((player, index) => {
      if (!index || ranked[index - 1].score !== player.score) rank = index + 1;
      const extra = document.createElement('div');
      extra.className = 'room-rank-total';
      extra.textContent = `${player.score} pts`;
      const round = document.createElement('small');
      round.className = 'room-rank-round';
      round.textContent = `+${player.roundPoints} this round`;
      extra.append(round);
      return playerRow(player, extra, rank);
    }));
    continueButton.hidden = !host || finished;
    playAgain.hidden = !finished;
    get('board-status').textContent = !finished && !host ? 'Waiting for the host to continue.' : '';
  }

  function render(packet) {
    if (!session) return;
    const previous = state;
    state = packet;
    const player = packet.players.find(({ id }) => id === session.id);
    if (!player) return;
    if (packet.phase === 'round') {
      screen.hidden = true;
      showRound(packet, player);
      return;
    }
    const host = session.id === 'host';
    const inLobby = packet.phase === 'lobby' || packet.phase === 'loading' || (packet.phase === 'finished' && player.ready);
    const panel = inLobby ? lobby : board;
    const moved = screen.hidden || panel.hidden || !entry.hidden || packet.phase !== previous?.phase;
    showSurface(inLobby ? undefined : player.score);
    screen.hidden = false;
    entry.hidden = true;
    lobby.hidden = !inLobby;
    board.hidden = inLobby;
    get('leave-room').hidden = false;
    if (moved) notice.textContent = '';
    if (inLobby) renderLobby(packet, host);
    else renderBoard(packet, host);
    if (moved) (inLobby ? get('room-lobby-heading') : boardHeading).focus();
  }

  function reset() {
    generation += 1;
    session?.close();
    session = state = null;
    busy(false);
  }

  async function connect(isHost) {
    const name = displayName(nameInput.value);
    const code = roomCode(codeInput.value);
    if (!name) {
      notice.textContent = 'Enter a display name.';
      nameInput.focus();
      return;
    }
    if (!isHost && !validRoomCode(code)) {
      notice.textContent = 'Enter a six-character room code.';
      codeInput.focus();
      return;
    }
    const attempt = ++generation;
    busy(true);
    notice.textContent = isHost ? 'Creating room…' : 'Connecting to the host…';
    const receive = (packet) => {
      if (attempt !== generation) return;
      if (packet.type === 'state') render(packet);
      else if (packet.type === 'answer') onAnswer(packet);
      else if (packet.type === 'notice') notice.textContent = packet.message;
    };
    const disconnected = (message) => {
      if (attempt !== generation) return;
      reset();
      showEntry(message);
    };
    try {
      const connection = await (isHost ?
        hostRoom(name, loadRounds, receive, disconnected) :
        joinRoom(code, name, receive, disconnected));
      if (attempt !== generation) {
        connection.close();
        return;
      }
      session = connection;
      render(connection.state);
    } catch (error) {
      if (attempt !== generation) return;
      notice.textContent = error.message;
    } finally {
      if (attempt === generation) busy(false);
    }
  }

  function leave() {
    reset();
    screen.hidden = true;
    goHome();
  }

  get('multiplayer').addEventListener('click', () => showEntry());
  get('create-room').addEventListener('click', () => connect(true));
  get('room-form').addEventListener('submit', (event) => {
    event.preventDefault();
    connect(false);
  });
  get('room-back').addEventListener('click', leave);
  get('leave-room').addEventListener('click', leave);
  startButton.addEventListener('click', () => session?.send({ type: 'start' }));
  continueButton.addEventListener('click', () => session?.send({ type: 'continue' }));
  playAgain.addEventListener('click', () => session?.send({ type: 'ready' }));
  get('copy-code').addEventListener('click', async () => {
    const code = state?.code;
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      notice.textContent = 'Room code copied.';
    } catch {
      notice.textContent = `Room code ${code}`;
    }
  });

  return {
    get active() { return Boolean(session); },
    get hosting() { return session?.id === 'host'; },
    sendTurn(type, guess) {
      if (session && state?.phase === 'round') session.send({ type, key: state.key, guess });
    },
    leave,
  };
}
