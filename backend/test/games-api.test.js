import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { server } from '../src/server.js';

async function start(t) {
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve) => server.close(resolve)));
  return `http://127.0.0.1:${server.address().port}`;
}

async function enter(base, name) {
  const response = await fetch(`${base}/api/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  return { cookie: response.headers.get('set-cookie').split(';')[0], body: await response.json() };
}

test('starts one authoritative game when a second session joins a room', async (t) => {
  const base = await start(t);
  const host = await enter(base, 'Alex');
  const created = await fetch(`${base}/api/rooms`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: host.cookie },
    body: JSON.stringify({ name: 'Fase cuatro' }),
  });
  const room = (await created.json()).room;
  const guest = await enter(base, 'Sam');
  const joined = await fetch(`${base}/api/rooms/${room.id}/join`, { method: 'POST', headers: { Cookie: guest.cookie } });
  const joinedBody = await joined.json();
  assert.equal(joinedBody.room.status, 'ready');
  assert.equal(joinedBody.game.status, 'playing');
  assert.equal(joinedBody.game.turn, 'white');
  assert.equal(joinedBody.game.you, 'black');
  assert.deepEqual(joinedBody.game.white, { name: 'Alex' });
  assert.deepEqual(joinedBody.game.black, { name: 'Sam' });
  assert.equal(JSON.stringify(joinedBody).includes(host.cookie), false);
  assert.equal(JSON.stringify(joinedBody).includes(guest.cookie), false);

  const outsider = await enter(base, 'Taylor');
  const forbidden = await fetch(`${base}/api/games/${joinedBody.game.id}`, { headers: { Cookie: outsider.cookie } });
  assert.equal(forbidden.status, 403);
  assert.equal((await forbidden.json()).error.code, 'NOT_A_PLAYER');

  const moves = await fetch(`${base}/api/games/${joinedBody.game.id}/legal-moves?from=e2`, { headers: { Cookie: host.cookie } });
  assert.deepEqual((await moves.json()).moves.map((move) => move.to), ['e3', 'e4']);
  const moved = await fetch(`${base}/api/games/${joinedBody.game.id}/moves`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: host.cookie },
    body: JSON.stringify({ from: 'e2', to: 'e4', color: 'black', playerId: guest.cookie, name: 'Sam', requestId: 'move-1', expectedRevision: 0 }),
  });
  assert.equal(moved.status, 200);
  const movedGame = (await moved.json()).game;
  assert.equal(movedGame.turn, 'black');
  assert.equal(movedGame.you, 'white');

  const retry = await fetch(`${base}/api/games/${joinedBody.game.id}/moves`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: host.cookie },
    body: JSON.stringify({ from: 'e2', to: 'e4', requestId: 'move-1', expectedRevision: 0 }),
  });
  assert.equal((await retry.json()).game.history.length, 1);

  const wrongTurn = await fetch(`${base}/api/games/${joinedBody.game.id}/moves`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: host.cookie },
    body: JSON.stringify({ from: 'd2', to: 'd4' }),
  });
  assert.equal(wrongTurn.status, 409);
  assert.equal((await wrongTurn.json()).error.code, 'NOT_YOUR_TURN');

  const invalidSession = await fetch(`${base}/api/games/${joinedBody.game.id}`, { headers: { Cookie: 'ajedrez_session=invalid' } });
  assert.equal(invalidSession.status, 401);
});
