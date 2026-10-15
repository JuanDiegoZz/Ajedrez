import test from 'node:test';
import assert from 'node:assert/strict';
import { cancelRoom, createRoom, getRoomForSession, joinRoom, leaveRoom, listRooms, setRoomGame, validateRoomName } from '../src/rooms.js';

function session(name) {
  return { id: `session-${name}-${Math.random()}`, name };
}

function captureError(operation, code) {
  assert.throws(operation, (error) => error.code === code);
}

test('validates room names after trimming, with a 2–40 character limit', () => {
  assert.deepEqual(validateRoomName('  Sala  '), { name: 'Sala' });
  assert.equal(validateRoomName(' ').code, 'INVALID_ROOM_NAME');
  assert.equal(validateRoomName('x'.repeat(41)).code, 'INVALID_ROOM_NAME');
});

test('creates an opaque waiting room owned by its session and lists it', () => {
  const host = session('Ana');
  const room = createRoom(host, 'Sala de Ana');

  assert.match(room.id, /^[\da-f-]{36}$/);
  assert.equal(room.hostName, 'Ana');
  assert.equal(room.status, 'waiting');
  assert.deepEqual(listRooms().filter(({ id }) => id === room.id), [room]);
  assert.deepEqual(getRoomForSession(host), room);
});

test('lets one distinct session join and marks the room ready with fixed colors', () => {
  const host = session('Ana');
  const guest = session('Luis');
  const room = createRoom(host, 'Sala');
  const joined = joinRoom(guest, room.id);

  assert.equal(joined.status, 'ready');
  assert.equal(joined.guestName, 'Luis');
  assert.equal(joined.hostColor, 'Blancas');
  assert.equal(joined.guestColor, 'Negras');
  assert.equal(listRooms().some(({ id }) => id === room.id), false);
});

test('rejects a third player and preserves exact capacity', () => {
  const host = session('Ana');
  const guest = session('Luis');
  const third = session('Mia');
  const room = createRoom(host, 'Sala');
  joinRoom(guest, room.id);

  captureError(() => joinRoom(third, room.id), 'ROOM_FULL');
  assert.equal(getRoomForSession(host).guestName, 'Luis');
});

test('admits only one of two concurrent joins for the last place', async () => {
  const host = session('RaceHost');
  const first = session('RaceFirst');
  const second = session('RaceSecond');
  const room = createRoom(host, 'Carrera');
  const results = await Promise.allSettled([
    Promise.resolve().then(() => joinRoom(first, room.id)),
    Promise.resolve().then(() => joinRoom(second, room.id)),
  ]);

  assert.equal(results.filter(({ status }) => status === 'fulfilled').length, 1);
  assert.equal(results.filter(({ status, reason }) => status === 'rejected' && reason.code === 'ROOM_FULL').length, 1);
  assert.equal(getRoomForSession(host).players, 2);
});

test('rejects missing rooms and host joining as guest', () => {
  const host = session('Ana');
  const room = createRoom(host, 'Sala');

  captureError(() => joinRoom(session('Luis'), 'missing-room'), 'ROOM_NOT_FOUND');
  captureError(() => joinRoom(host, room.id), 'HOST_CANNOT_JOIN');
});

test('uses session identity, not a matching or submitted display name', () => {
  const host = session('Ana');
  const guest = session('Ana');
  const room = createRoom(host, 'Sala');

  assert.equal(joinRoom(guest, room.id).guestName, 'Ana');
  assert.notEqual(getRoomForSession(guest).id, undefined);
});

test('guest leaving returns room to waiting and frees that session', () => {
  const host = session('Ana');
  const guest = session('Luis');
  const room = createRoom(host, 'Sala');
  joinRoom(guest, room.id);

  const waiting = leaveRoom(guest);
  assert.equal(waiting.status, 'waiting');
  assert.equal(waiting.guestName, null);
  assert.equal(getRoomForSession(guest), null);
});

test('host leaving deletes the room and frees the guest session', () => {
  const host = session('Ana');
  const guest = session('Luis');
  const room = createRoom(host, 'Sala');
  joinRoom(guest, room.id);

  assert.equal(leaveRoom(host), null);
  assert.equal(getRoomForSession(guest), null);
  assert.equal(listRooms().some(({ id }) => id === room.id), false);
});

test('removing a finished room does not clear a participant newer room mapping', () => {
  const host = session('Host');
  const guest = session('Guest');
  const oldRoom = createRoom(host, 'Partida terminada');
  joinRoom(guest, oldRoom.id);
  setRoomGame(oldRoom.id, 'finished-game');

  leaveRoom(host, oldRoom.id, true);
  const newRoom = createRoom(host, 'Nueva sala');
  leaveRoom(guest, oldRoom.id, true);

  assert.deepEqual(getRoomForSession(host), newRoom);
  assert.equal(listRooms().some(({ id }) => id === oldRoom.id), false);
});

test('only host can cancel own waiting room; cancellation removes room', () => {
  const host = session('Ana');
  const other = session('Luis');
  const room = createRoom(host, 'Sala');

  captureError(() => cancelRoom(other, room.id), 'NOT_ROOM_HOST');
  assert.equal(cancelRoom(host, room.id), null);
  assert.equal(getRoomForSession(host), null);
  assert.equal(listRooms().some(({ id }) => id === room.id), false);
});

test('prevents one session from holding two rooms and deduplicates host create', () => {
  const host = session('Ana');
  const countBefore = listRooms().length;
  const original = createRoom(host, 'Sala');

  assert.deepEqual(createRoom(host, 'Otra sala'), original);
  captureError(() => joinRoom(host, 'other-room'), 'ROOM_NOT_FOUND');
  assert.equal(listRooms().length, countBefore + 1);
});


