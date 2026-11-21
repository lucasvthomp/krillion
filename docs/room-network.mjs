import { createRoomGame, maxPlayers, roomAlphabet } from './room-game.mjs';

const protocol = 'krillion-room-v1';
const connectionTimeout = 14000;
const peerId = (code) => `${protocol}-${code.toLowerCase()}`;
let library;

async function getPeer() {
  library ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = new URL('./vendor/peerjs-1.5.5.min.js', import.meta.url);
    script.onload = () => {
      const Peer = globalThis.peerjs?.Peer ?? globalThis.Peer;
      if (Peer) resolve(Peer);
      else reject(new Error('Multiplayer could not load. Try again.'));
    };
    script.onerror = () => {
      script.remove();
      reject(new Error('Multiplayer could not load. Try again.'));
    };
    document.head.append(script);
  });
  try {
    return await library;
  } catch (error) {
    library = null;
    throw error;
  }
}

function newCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return [...bytes].map((byte) => roomAlphabet[byte % roomAlphabet.length]).join('');
}

async function openPeer(id) {
  const Peer = await getPeer();
  if (!globalThis.RTCPeerConnection) throw new Error('This browser does not support multiplayer connections.');
  const peer = id ? new Peer(id) : new Peer();
  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('The room service did not respond. Try again.')), connectionTimeout);
      peer.on('open', () => {
        clearTimeout(timer);
        resolve();
      });
      peer.on('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });
    });
  } catch (error) {
    peer.destroy();
    throw error;
  }
  peer.on('disconnected', () => {
    if (!peer.destroyed && peer.disconnected) peer.reconnect();
  });
  return peer;
}

export async function hostRoom(name, loadRounds, onPacket, onClose) {
  let code, peer;
  for (let attempt = 0; !peer && attempt < 3; attempt += 1) {
    code = newCode();
    try {
      peer = await openPeer(peerId(code));
    } catch (error) {
      if (error.type !== 'unavailable-id') throw error;
    }
  }
  if (!peer) throw new Error('Could not reserve a room code. Try again.');

  const connections = new Map();
  let closed = false;
  let waiting = 0;
  const engine = createRoomGame({
    code, name, loadRounds,
    publicUpdate(packet) {
      for (const connection of connections.values()) if (connection.open) connection.send(packet);
      onPacket(packet);
    },
    privateUpdate(id, packet) {
      if (id === 'host') onPacket(packet);
      else if (connections.get(id)?.open) connections.get(id).send(packet);
    },
  });

  const close = () => {
    if (closed) return;
    closed = true;
    engine.close();
    peer.destroy();
    connections.clear();
  };
  peer.on('close', () => {
    if (closed) return;
    close();
    onClose('The room connection closed.');
  });
  peer.on('connection', (connection) => {
    if (connection.label !== protocol || waiting >= maxPlayers || connections.has(connection.peer)) {
      connection.close();
      return;
    }
    waiting += 1;
    let joined = false;
    let held = true;
    const release = () => {
      if (!held) return;
      held = false;
      waiting -= 1;
      clearTimeout(timer);
    };
    const timer = setTimeout(() => {
      release();
      connection.close();
    }, connectionTimeout);

    connection.on('data', (packet) => {
      if (closed || !packet || typeof packet !== 'object') return;
      if (joined) {
        engine.act(connection.peer, packet);
        return;
      }
      if (!held || packet.type !== 'hello') return;
      release();
      if (connections.has(connection.peer)) {
        connection.close();
        return;
      }
      connections.set(connection.peer, connection);
      const error = engine.join(connection.peer, packet.name);
      if (error) {
        connections.delete(connection.peer);
        connection.send({ type: 'reject', message: error });
        setTimeout(() => connection.close(), 300);
      } else joined = true;
    });
    const remove = () => {
      release();
      if (!joined || connections.get(connection.peer) !== connection) return;
      connections.delete(connection.peer);
      engine.leave(connection.peer);
    };
    connection.on('close', remove);
    connection.on('error', () => {
      remove();
      connection.close();
    });
  });

  return { id: 'host', state: engine.snapshot(), send: (packet) => engine.act('host', packet), close };
}

export async function joinRoom(code, name, onPacket, onClose) {
  const peer = await openPeer();
  let connected = false;
  let closed = false;
  let connection;
  const close = () => {
    if (closed) return;
    closed = true;
    peer.destroy();
  };

  let initial;
  try {
    initial = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Could not reach the host. Check the code and try again.')), connectionTimeout);
      const failure = (message) => {
        clearTimeout(timer);
        if (closed) return;
        if (connected) {
          close();
          onClose(message);
        } else reject(new Error(message));
      };
      connection = peer.connect(peerId(code), { label: protocol, serialization: 'json', reliable: true });
      if (!connection) {
        failure('The room connection could not start. Try again.');
        return;
      }
      connection.on('open', () => connection.send({ type: 'hello', name }));
      connection.on('data', (packet) => {
        if (closed || !packet || typeof packet !== 'object') return;
        if (!connected) {
          if (packet.type === 'reject') failure(packet.message);
          if (packet.type === 'state') {
            clearTimeout(timer);
            connected = true;
            resolve(packet);
          }
        } else onPacket(packet);
      });
      connection.on('close', () => failure('The room host disconnected.'));
      connection.on('error', () => failure('The connection to the room was interrupted.'));
      peer.on('error', (error) => failure(error.type === 'peer-unavailable' ?
        'No room found with that code. Check that the host is still online.' :
        'Could not connect to the room. Try again.'));
    });
  } catch (error) {
    close();
    throw error;
  }
  return {
    id: peer.id,
    state: initial,
    send(packet) {
      if (connection.open) connection.send(packet);
    },
    close,
  };
}
