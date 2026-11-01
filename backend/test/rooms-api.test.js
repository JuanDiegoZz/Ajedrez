import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { server } from '../src/server.js';
import { createSession, getSession, sessionTtlMs } from '../src/sessions.js';
import { listRooms } from '../src/rooms.js';

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

test('room API authenticates sessions, enforces capacity, blocks orphaning a game, and cancels waiting rooms', async (t) => {
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

  const leaveActive = await fetch(`${base}/api/rooms/${room.id}/leave`, { method: 'POST', headers: { Cookie: b.cookie } });
  assert.equal(leaveActive.status, 409);
  assert.equal((await leaveActive.json()).error.code, 'GAME_ACTIVE');
  assert.equal((await (await fetch(`${base}/api/session`, { headers: { Cookie: a.cookie } })).json()).room.guestName, 'Guest API');

  const extraRoomResponse = await fetch(`${base}/api/rooms`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: c.cookie },
    body: JSON.stringify({ name: 'Sala para cancelar' }),
  });
  const extraRoom = (await extraRoomResponse.json()).room;
  const cancelled = await fetch(`${base}/api/rooms/${extraRoom.id}`, { method: 'DELETE', headers: { Cookie: c.cookie } });
  assert.equal(cancelled.status, 200);
  assert.equal((await (await fetch(`${base}/api/rooms`, { headers: { Cookie: c.cookie } })).json()).rooms.length, 0);
});

test('session endpoint reports an expired server-side session clearly', async (t) => {
  const base = await start(t);
  const expired = createSession('Expired API');
  getSession(expired.id, Date.now() + sessionTtlMs);

  const response = await fetch(`${base}/api/session`, { headers: { Cookie: `ajedrez_session=${expired.id}` } });
  assert.equal(response.status, 410);
  assert.match((await response.json()).error, /servidor se reinició o tu sesión terminó/u);
  assert.match(response.headers.get('set-cookie'), /Max-Age=0/u, 'expired identity cookie must be removed');
});

test('guest entry rejects avatar IDs outside the local catalog', async (t) => {
  const base = await start(t);
  const response = await fetch(`${base}/api/session`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Jugador', avatarId: 'https://evil.invalid/avatar.svg' }),
  });
  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /avatar disponible/u);
  assert.equal(response.headers.get('set-cookie'), null);
});

test('a stale revoked session cookie cannot replace a newer guest identity', async (t) => {
  const base = await start(t);
  const first = await enter(base, 'Identidad anterior');
  await fetch(`${base}/api/session`, { method: 'DELETE', headers: { Cookie: first.cookie } });
  const second = await enter(base, 'Identidad nueva');

  const restored = await fetch(`${base}/api/session`, { headers: { Cookie: `${first.cookie}; ${second.cookie}` } });
  assert.equal(restored.status, 200);
  assert.equal((await restored.json()).name, 'Identidad nueva');
  const oldCookieName = first.cookie.slice(0, first.cookie.indexOf('='));
  assert.match(restored.headers.get('set-cookie'), new RegExp(`${oldCookieName}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`, 'u'));
});

test('a delayed guest entry carrying a revoked cookie cannot create another session', async (t) => {
  const base = await start(t);
  const old = await enter(base, 'Jugador anterior');
  await fetch(`${base}/api/session`, { method: 'DELETE', headers: { Cookie: old.cookie } });
  const current = await enter(base, 'Jugador actual');

  const delayedEntry = await fetch(`${base}/api/session`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: old.cookie },
    body: JSON.stringify({ name: 'Entrada retrasada' }),
  });
  assert.equal(delayedEntry.status, 410);
  assert.equal((await delayedEntry.json()).error, 'La sesión anterior terminó. Inténtalo de nuevo.');
  assert.match(delayedEntry.headers.get('set-cookie'), /Max-Age=0/u);
  const restored = await fetch(`${base}/api/session`, { headers: { Cookie: `${old.cookie}; ${current.cookie}` } });
  assert.equal((await restored.json()).name, 'Jugador actual');
});

test('profile patch preserves session, checks version, and logout revokes it and cancels waiting room', async (t) => {
  const base = await start(t);
  const player = await enter(base, 'Jugador Uno');
  const created = await fetch(`${base}/api/rooms`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: player.cookie },
    body: JSON.stringify({ name: 'Sala visible' }),
  });
  const room = (await created.json()).room;

  const updated = await fetch(`${base}/api/session`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json', Cookie: player.cookie },
    body: JSON.stringify({ name: 'Jugador Dos', avatarId: 'knight', expectedProfileVersion: 0 }),
  });
  assert.equal(updated.status, 200);
  assert.equal(updated.headers.get('set-cookie').split(';')[0], player.cookie);
  assert.deepEqual((await updated.json()).profile, { name: 'Jugador Dos', avatarId: 'knight', profileVersion: 1, kind: 'guest' });
  assert.equal((await (await fetch(`${base}/api/rooms`, { headers: { Cookie: player.cookie } })).json()).rooms[0].hostName, 'Jugador Dos');

  const stale = await fetch(`${base}/api/session`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json', Cookie: player.cookie },
    body: JSON.stringify({ name: 'Nombre antiguo', avatarId: 'club', expectedProfileVersion: 0 }),
  });
  assert.equal(stale.status, 409);
  assert.equal((await stale.json()).error.code, 'STALE_PROFILE');

  const logout = await fetch(`${base}/api/session`, { method: 'DELETE', headers: { Cookie: player.cookie } });
  assert.equal(logout.status, 200);
  assert.match(logout.headers.get('set-cookie'), /Max-Age=0/u);
  assert.equal((await (await fetch(`${base}/api/rooms`, { headers: { Cookie: player.cookie } })).json()).error.code, 'SESSION_REQUIRED');
  assert.equal(listRooms().some((entry) => entry.id === room.id), false);
  const repeated = await fetch(`${base}/api/session`, { method: 'DELETE', headers: { Cookie: player.cookie } });
  assert.equal(repeated.status, 200);
  assert.equal(repeated.headers.get('set-cookie'), null);
});

test('profile edits reject cross-origin mutations and lock identity once game starts', async (t) => {
  const base = await start(t);
  const host = await enter(base, 'Anfitrión');
  const guest = await enter(base, 'Invitado');
  const roomResponse = await fetch(`${base}/api/rooms`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: host.cookie },
    body: JSON.stringify({ name: 'Sala activa' }),
  });
  const room = (await roomResponse.json()).room;
  await fetch(`${base}/api/rooms/${room.id}/join`, { method: 'POST', headers: { Cookie: guest.cookie } });

  const unsafeLogout = await fetch(`${base}/api/session`, { method: 'DELETE', headers: { Cookie: host.cookie } });
  assert.equal(unsafeLogout.status, 409);
  assert.equal((await unsafeLogout.json()).error.code, 'ACTIVE_GAME_CONFIRMATION_REQUIRED');
  assert.ok((await (await fetch(`${base}/api/session`, { headers: { Cookie: host.cookie } })).json()).game);

  const blocked = await fetch(`${base}/api/session`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json', Cookie: host.cookie, Origin: 'http://evil.invalid' },
    body: JSON.stringify({ name: 'Cambio', avatarId: 'shield', expectedProfileVersion: 0 }),
  });
  assert.equal(blocked.status, 403);
  assert.equal((await blocked.json()).error.code, 'ORIGIN_REJECTED');
  const locked = await fetch(`${base}/api/session`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json', Cookie: host.cookie },
    body: JSON.stringify({ name: 'Cambio', avatarId: 'shield', expectedProfileVersion: 0 }),
  });
  assert.equal(locked.status, 409);
  assert.equal((await locked.json()).error.code, 'PROFILE_LOCKED_DURING_GAME');
  assert.equal((await (await fetch(`${base}/api/session`, { headers: { Cookie: host.cookie } })).json()).name, 'Anfitrión');
});

