import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import WebSocket from 'ws';
import pg from 'pg';
import { attachLobby } from '../src/lobby.js';
import { createSession } from '../src/sessions.js';
import { createRoom, getRoomForSession, getRoomGameData, joinRoom, listRooms, setRoomGame } from '../src/rooms.js';
import { createGame, expireDisconnectedPlayer, getArchiveRecord, getGame, makeMove, reconnectGamePlayer } from '../src/games.js';
import { archiveFinishedGame } from '../src/game-archive.js';

function waitForMessage(socket, predicate, timeoutMs = 2000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timed out waiting for WebSocket message')), timeoutMs);
    socket.on('message', function onMessage(data) {
      const message = JSON.parse(data.toString());
      if (!predicate(message)) return;
      clearTimeout(timer);
      socket.off('message', onMessage);
      resolve(message);
    });
  });
}

async function waitUntil(predicate, timeoutMs = 1000) {
  const deadline = Date.now() + timeoutMs;
  while (!predicate()) {
    if (Date.now() >= deadline) throw new Error('Timed out waiting for recovery state');
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}

async function setup(t, { graceMs = 100, heartbeatIntervalMs = 10_000, onGameFinished = () => {} } = {}) {
  const host = createSession(`Host ${Math.random()}`);
  const guest = createSession(`Guest ${Math.random()}`);
  const room = createRoom(host, 'Sala de recuperación');
  joinRoom(guest, room.id);
  const initial = createGame(getRoomGameData(room.id));
  setRoomGame(room.id, initial.id);
  const game = getGame(host.id, initial.id);
  const server = createServer();
  const lobby = attachLobby(server, { graceMs, heartbeatIntervalMs, onGameFinished });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  const sockets = [];
  t.after(async () => {
    sockets.forEach((socket) => socket.terminate());
    lobby.close();
    if (server.listening) await new Promise((resolve) => server.close(resolve));
  });

  async function connect(session, gameId = game.id) {
    const socket = new WebSocket(`ws://127.0.0.1:${server.address().port}/ws`, {
      headers: { Cookie: `ajedrez_session=${session.id}`, Origin: base },
    });
    sockets.push(socket);
    await once(socket, 'open');
    const initialState = waitForMessage(socket, (message) => message.type === 'game:state');
    socket.send(JSON.stringify({ type: 'lobby:subscribe' }));
    socket.send(JSON.stringify({ type: 'game:subscribe', gameId }));
    return { socket, game: (await initialState).game };
  }

  return { host, guest, room, game, server, lobby, sockets, connect };
}

test('reconnects the same session, resumes its room and game, and supersedes an older tab', async (t) => {
  const state = await setup(t, { heartbeatIntervalMs: 15 });
  const host1 = await state.connect(state.host);
  const guest = await state.connect(state.guest);
  assert.equal(host1.game.you, 'white');
  assert.equal(guest.game.you, 'black');
  await new Promise((resolve) => setTimeout(resolve, 45));
  assert.equal(guest.socket.readyState, WebSocket.OPEN, 'automatic pong keeps healthy socket alive');

  const paused = waitForMessage(guest.socket, (message) => message.type === 'game:state' && message.game.paused);
  host1.socket.terminate();
  assert.equal((await paused).game.presence.white.status, 'disconnected');

  assert.throws(() => makeMove(state.host.id, state.game.id, { from: 'e2', to: 'e4' }), { code: 'GAME_PAUSED' });
  const resumedAtGuest = waitForMessage(guest.socket, (message) => message.type === 'game:state' && !message.game.paused);
  const host2 = await state.connect(state.host);
  assert.equal(host2.game.you, 'white');
  assert.equal((await resumedAtGuest).game.fen, state.game.fen);
  assert.equal(getRoomForSession(state.host).id, state.room.id);
  assert.equal(reconnectGamePlayer(state.host.id, state.game.id), null, 'WS reconnect already resumed presence');

  const replaced = waitForMessage(host2.socket, (message) => message.type === 'session:replaced');
  const oldTabClosed = new Promise((resolve) => host2.socket.once('close', (code) => resolve(code)));
  const host3Socket = new WebSocket(`ws://127.0.0.1:${state.server.address().port}/ws`, {
    headers: { Cookie: `ajedrez_session=${state.host.id}`, Origin: `http://127.0.0.1:${state.server.address().port}` },
  });
  state.sockets.push(host3Socket);
  await once(host3Socket, 'open');
  const host3State = waitForMessage(host3Socket, (message) => message.type === 'game:state');
  host3Socket.send(JSON.stringify({ type: 'game:subscribe', gameId: state.game.id }));
  assert.equal((await host3State).game.you, 'white');
  assert.match((await replaced).message, /otra pestaña/u);
  assert.equal(await oldTabClosed, 4001);
  assert.equal(getGame(state.host.id, state.game.id).paused, false);
});

test('disconnect timeout awards the connected player, archives, and cannot revive the game', async (t) => {
  const archives = [];
  const calls = [];
  const usePostgres = Boolean(process.env.PGHOST);
  let archivedId;
  const pool = usePostgres ? new pg.Pool() : {
    connect: async () => ({
      async query(sql, values = []) {
        calls.push(sql.trim().split(/\s+/u)[0]);
        if (sql.includes('INSERT INTO games')) return { rows: [{ id: values[0] }] };
        return { rows: [] };
      },
      release() {},
    }),
  };
  t.after(async () => {
    if (usePostgres) {
      if (archivedId) await pool.query('DELETE FROM games WHERE id = $1', [archivedId]);
      await pool.end();
    }
  });
  const state = await setup(t, {
    graceMs: 45,
    onGameFinished: async (gameId) => {
      const record = getArchiveRecord(gameId);
      await archiveFinishedGame(pool, record);
      const stored = usePostgres
        ? await pool.query('SELECT end_reason, result FROM games WHERE id = $1', [gameId])
        : { rows: [{ end_reason: record.endReason, result: record.result }] };
      archives.push({ record, stored: stored.rows[0] });
    },
  });
  archivedId = state.game.id;
  const host = await state.connect(state.host);
  const guest = await state.connect(state.guest);
  makeMove(state.host.id, state.game.id, { from: 'e2', to: 'e4' });
  makeMove(state.guest.id, state.game.id, { from: 'e7', to: 'e5' });
  const paused = waitForMessage(host.socket, (message) => message.type === 'game:state' && message.game.paused);
  guest.socket.terminate();
  await paused;
  const ended = await waitForMessage(host.socket, (message) => message.type === 'game:state' && message.game.status === 'finished');

  assert.deepEqual(ended.game.result, { winner: 'white', reason: 'disconnect' });
  assert.equal(getArchiveRecord(state.game.id).endReason, 'disconnect');
  await waitUntil(() => archives.length === 1);
  assert.deepEqual(archives.map(({ record }) => record.id), [state.game.id]);
  assert.deepEqual(archives[0].stored, { end_reason: 'disconnect', result: '1-0' });
  assert.equal(calls[0], 'BEGIN');
  assert.equal(calls.at(-1), 'COMMIT');
  assert.equal(expireDisconnectedPlayer(state.guest.id, state.game.id, Date.now() + 45), null);

  const returned = await state.connect(state.guest);
  assert.equal(returned.game.status, 'finished');
  assert.deepEqual(returned.game.result, { winner: 'white', reason: 'disconnect' });
  assert.equal(reconnectGamePlayer(state.guest.id, state.game.id), null);
});

test('waiting host reconnect restores hidden room; timeout removes it from the lobby', async (t) => {
  const host = createSession(`Waiting ${Math.random()}`);
  const room = createRoom(host, 'Sala en espera');
  const server = createServer();
  const lobby = attachLobby(server, { graceMs: 45, heartbeatIntervalMs: 10_000 });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  const sockets = [];
  t.after(async () => {
    sockets.forEach((socket) => socket.terminate());
    lobby.close();
    if (server.listening) await new Promise((resolve) => server.close(resolve));
  });
  const connectHost = async () => {
    const socket = new WebSocket(`ws://127.0.0.1:${server.address().port}/ws`, {
      headers: { Cookie: `ajedrez_session=${host.id}`, Origin: base },
    });
    sockets.push(socket);
    await once(socket, 'open');
    const state = waitForMessage(socket, (message) => message.type === 'lobby:state');
    socket.send(JSON.stringify({ type: 'lobby:subscribe' }));
    await state;
    return socket;
  };

  const first = await connectHost();
  first.terminate();
  await waitUntil(() => !listRooms().some(({ id }) => id === room.id));
  assert.equal(listRooms().some(({ id }) => id === room.id), false);
  const resumed = await connectHost();
  assert.equal(getRoomForSession(host).id, room.id);
  assert.equal(listRooms().some(({ id }) => id === room.id), true);
  resumed.terminate();
  await waitUntil(() => getRoomForSession(host) === null, 1000);
  assert.equal(getRoomForSession(host), null);
  assert.equal(listRooms().some(({ id }) => id === room.id), false);

  const late = new WebSocket(`ws://127.0.0.1:${server.address().port}/ws`, {
    headers: { Cookie: `ajedrez_session=${host.id}`, Origin: base },
  });
  sockets.push(late);
  await once(late, 'open');
  const emptyRoom = waitForMessage(late, (message) => message.type === 'room:state');
  const expired = waitForMessage(late, (message) => message.type === 'recovery:expired');
  late.send(JSON.stringify({ type: 'lobby:subscribe' }));
  assert.equal((await emptyRoom).room, null);
  assert.match((await expired).message, /La sala se cerró/u);
});
