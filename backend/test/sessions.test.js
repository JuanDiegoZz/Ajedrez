import test from 'node:test';
import assert from 'node:assert/strict';
import { createSession, getSession, validateName } from '../src/sessions.js';

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
