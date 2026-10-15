import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { server } from '../src/server.js';
import { markGameDisconnected, reconnectGamePlayer } from '../src/games.js';

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

test('starts a private bot game and recovers it through the existing session', async (t) => {
  const base = await start(t);
  const human = await enter(base, 'Bot Player');
  const created = await fetch(`${base}/api/games/bot`, { method: 'POST', headers: { Cookie: human.cookie } });
  assert.equal(created.status, 201);
  const game = (await created.json()).game;
  assert.equal(game.mode, 'bot');
  assert.equal(game.you, 'white');
  assert.deepEqual(game.black, { name: 'Bot' });
  assert.equal(game.roomId, null);
  assert.equal(JSON.stringify(game).includes('session'), false);

  const recovered = await fetch(`${base}/api/session`, { headers: { Cookie: human.cookie } });
  assert.equal((await recovered.json()).game.id, game.id);
  const moved = await fetch(`${base}/api/games/${game.id}/moves`, {
    method: 'POST', headers: { Cookie: human.cookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: 'e2', to: 'e4', requestId: 'human-e4', expectedRevision: 0 }),
  });
  assert.equal((await moved.json()).game.botThinking, true);

  let latest;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 50));
    const response = await fetch(`${base}/api/games/${game.id}`, { headers: { Cookie: human.cookie } });
    latest = (await response.json()).game;
    if (latest.history.length === 2) break;
  }
  assert.equal(latest.history.length, 2);
  assert.equal(latest.turn, 'white');
  assert.equal(latest.black.name, 'Bot');
});

test('paused game rejects HTTP move and legal-move requests until the same session reconnects', async (t) => {
  const base = await start(t);
  const host = await enter(base, 'Pause Host');
  const created = await fetch(`${base}/api/rooms`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: host.cookie },
    body: JSON.stringify({ name: 'Pausa de conexión' }),
  });
  const room = (await created.json()).room;
  const guest = await enter(base, 'Pause Guest');
  const joined = await fetch(`${base}/api/rooms/${room.id}/join`, { method: 'POST', headers: { Cookie: guest.cookie } });
  const game = (await joined.json()).game;
  const hostSessionId = host.cookie.slice('ajedrez_session='.length);
  markGameDisconnected(hostSessionId, game.id, Date.now() + 60_000);

  const moves = await fetch(`${base}/api/games/${game.id}/legal-moves?from=e2`, { headers: { Cookie: guest.cookie } });
  assert.equal(moves.status, 409);
  assert.equal((await moves.json()).error.code, 'GAME_PAUSED');
  const move = await fetch(`${base}/api/games/${game.id}/moves`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: guest.cookie },
    body: JSON.stringify({ from: 'e2', to: 'e4' }),
  });
  assert.equal(move.status, 409);
  assert.equal((await move.json()).error.code, 'GAME_PAUSED');
  assert.equal(reconnectGamePlayer(hostSessionId, game.id).paused, false);
});
