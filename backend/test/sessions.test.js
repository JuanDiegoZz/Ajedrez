import test from 'node:test';
import assert from 'node:assert/strict';
import { createSession, getSession, updateSessionProfile, revokeSession, validateName } from '../src/sessions.js';

test('trims valid names and rejects empty, short, long, or control-character names', () => {
  assert.deepEqual(validateName('  Ana  '), { name: 'Ana' });
  assert.equal(validateName(' ').error, 'Escribe un nombre de 2 a 24 caracteres.');
  assert.equal(validateName('A').error, 'Escribe un nombre de 2 a 24 caracteres.');
  assert.equal(validateName('A'.repeat(25)).error, 'Escribe un nombre de 2 a 24 caracteres.');
  assert.equal(validateName('An\na').error, 'El nombre no puede contener caracteres de control.');
});

test('session identity is opaque and expires after two hours without activity', () => {
  const createdAt = 1_000;
  const session = createSession('Ana', createdAt);

  assert.notEqual(session.id, 'Ana');
  assert.equal(session.id.length, 43);
  const lastActiveAt = createdAt + 7_199_999;
  assert.equal(getSession(session.id, lastActiveAt).name, 'Ana');
  assert.equal(getSession(session.id, lastActiveAt + 7_200_000), null);
});

test('profiles default to guest club avatar and update once with optimistic version', () => {
  const session = createSession('Ana', 1_000);
  assert.deepEqual(updateSessionProfile(session.id, { name: 'Ana', avatarId: 'club', expectedProfileVersion: 0 }), {
    session: { name: 'Ana', avatarId: 'club', profileVersion: 0, kind: 'guest' }, changed: false,
  });
  assert.deepEqual(updateSessionProfile(session.id, { name: 'Ada', avatarId: 'knight', expectedProfileVersion: 0 }), {
    session: { name: 'Ada', avatarId: 'knight', profileVersion: 1, kind: 'guest' }, changed: true,
  });
  assert.equal(updateSessionProfile(session.id, { name: 'Ava', avatarId: 'club', expectedProfileVersion: 0 }).error, 'STALE_PROFILE');
});

test('profile rejects unknown avatar and revocation invalidates existing references', () => {
  const session = createSession('Ana', 1_000);
  assert.equal(updateSessionProfile(session.id, { name: 'Ana', avatarId: 'https://evil', expectedProfileVersion: 0 }).error, 'INVALID_AVATAR');
  assert.equal(revokeSession(session.id), true);
  assert.equal(getSession(session.id, 2_000), null);
  assert.equal(revokeSession(session.id), false);
});
