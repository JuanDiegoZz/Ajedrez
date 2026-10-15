import test from 'node:test';
import assert from 'node:assert/strict';
import WebSocket from 'ws';
import { once } from 'node:events';
import { server } from '../src/server.js';

async function start(t) {
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  return `http://127.0.0.1:${server.address().port}`;
}

async function enter(base, name) {
  const response = await fetch(`${base}/api/session`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }),
  });
  return { cookie: response.headers.get('set-cookie').split(';')[0], session: await response.json() };
}

async function request(base, path, cookie, options = {}) {
  return fetch(`${base}${path}`, { ...options, headers: { Cookie: cookie, ...options.headers } });
}

function nextGameState(socket) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timed out waiting for game state')), 2000);
    socket.on('message', function onMessage(data) {
      const message = JSON.parse(data.toString());
      if (message.type === 'game:state') {
        clearTimeout(timer);
        socket.off('message', onMessage);
        resolve(message.game);
      }
    });
  });
}

test('broadcasts each confirmed game snapshot to both subscribed players', async (t) => {
  const sockets = [];
  t.after(async () => {
    sockets.forEach((socket) => socket.terminate());
    if (server.listening) await new Promise((resolve) => server.close(resolve));
  });
  const base = await start(t);
  const host = await enter(base, 'Alex');
  const guest = await enter(base, 'Sam');
  const created = await request(base, '/api/rooms', host.cookie, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Prueba WS' }),
  });
  const room = (await created.json()).room;
  const joined = await request(base, `/api/rooms/${room.id}/join`, guest.cookie, { method: 'POST' });
  const game = (await joined.json()).game;
  for (const player of [host, guest]) {
    const socket = new WebSocket(`ws://127.0.0.1:${server.address().port}/ws`, { headers: { Cookie: player.cookie, Origin: base } });
    sockets.push(socket);
    await once(socket, 'open');
    socket.send(JSON.stringify({ type: 'lobby:subscribe' }));
    socket.send(JSON.stringify({ type: 'game:subscribe', gameId: game.id }));
    const snapshot = await nextGameState(socket);
    assert.equal(snapshot.revision, 0);
    assert.equal(snapshot.you, player === host ? 'white' : 'black');
  }
  const updates = sockets.map(nextGameState);
  const moved = await request(base, `/api/games/${game.id}/moves`, host.cookie, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: 'e2', to: 'e4', requestId: 'ws-move-1', expectedRevision: 0 }),
  });
  assert.equal(moved.status, 200);
  const snapshots = await Promise.all(updates);
  assert.deepEqual(snapshots.map((snapshot) => snapshot.fen), [
    'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
    'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
  ]);
  assert.deepEqual(snapshots.map((snapshot) => snapshot.revision), [1, 1]);
});
