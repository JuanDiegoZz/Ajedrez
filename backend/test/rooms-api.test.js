import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { server } from '../src/server.js';

async function start(t) {
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const address = server.address();
  return `http://127.0.0.1:${address.port}`;
}

async function enter(base, name) {
  const response = await fetch(`${base}/api/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  const cookie = response.headers.get('set-cookie').split(';')[0];
  return { response, cookie, json: await response.json() };
}

test('room API authenticates sessions, enforces capacity, and cleans up on leave/cancel', async (t) => {
  const base = await start(t);
  const missing = await fetch(`${base}/api/rooms`);
  assert.equal(missing.status, 401);
  assert.equal((await missing.json()).error.code, 'SESSION_REQUIRED');
  const invalidSession = await fetch(`${base}/api/rooms`, { headers: { Cookie: 'ajedrez_session=invalid' } });
  assert.equal(invalidSession.status, 401);

  const a = await enter(base, 'Host API');
  const invalid = await fetch(`${base}/api/rooms`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: a.cookie }, body: JSON.stringify({ name: ' ' }),
  });
  assert.equal(invalid.status, 400);
  assert.equal((await invalid.json()).error.code, 'INVALID_ROOM_NAME');

  const created = await fetch(`${base}/api/rooms`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: a.cookie },
    body: JSON.stringify({ name: 'Partida API', hostSessionId: 'forged-session' }),
  });
  assert.equal(created.status, 201);
  const room = (await created.json()).room;
  assert.equal(room.hostName, 'Host API');
  assert.equal('hostSessionId' in room, false);
  assert.equal(JSON.stringify(room).includes(a.cookie), false);
  assert.equal((await (await fetch(`${base}/api/rooms`, { headers: { Cookie: a.cookie } })).json()).rooms[0].id, room.id);

  const b = await enter(base, 'Guest API');
  const joined = await fetch(`${base}/api/rooms/${room.id}/join`, { method: 'POST', headers: { Cookie: b.cookie } });
  assert.equal(joined.status, 200);
  assert.equal((await joined.json()).room.status, 'ready');

  const c = await enter(base, 'Third API');
  const full = await fetch(`${base}/api/rooms/${room.id}/join`, { method: 'POST', headers: { Cookie: c.cookie } });
  assert.equal(full.status, 409);
  assert.equal((await full.json()).error.code, 'ROOM_FULL');
  const nonexistent = await fetch(`${base}/api/rooms/no-such-room/join`, { method: 'POST', headers: { Cookie: c.cookie } });
  assert.equal(nonexistent.status, 404);
  assert.equal((await nonexistent.json()).error.code, 'ROOM_NOT_FOUND');
  const nonHostCancel = await fetch(`${base}/api/rooms/${room.id}`, { method: 'DELETE', headers: { Cookie: c.cookie } });
  assert.equal(nonHostCancel.status, 403);
  assert.equal((await nonHostCancel.json()).error.code, 'NOT_ROOM_HOST');
  assert.equal((await (await fetch(`${base}/api/session`, { headers: { Cookie: a.cookie } })).json()).room.guestName, 'Guest API');

  await fetch(`${base}/api/rooms/${room.id}/leave`, { method: 'POST', headers: { Cookie: b.cookie } });
  assert.equal((await (await fetch(`${base}/api/session`, { headers: { Cookie: a.cookie } })).json()).room.status, 'waiting');
  const cancelled = await fetch(`${base}/api/rooms/${room.id}`, { method: 'DELETE', headers: { Cookie: a.cookie } });
  assert.equal(cancelled.status, 200);
  assert.deepEqual((await (await fetch(`${base}/api/rooms`, { headers: { Cookie: a.cookie } })).json()).rooms, []);
});

