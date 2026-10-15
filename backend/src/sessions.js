import { randomBytes } from 'node:crypto';

export const sessionTtlMs = 2 * 60 * 60 * 1000;
const sessions = new Map();

export function validateName(value) {
  if (typeof value !== 'string') return { error: 'Escribe un nombre de 2 a 24 caracteres.' };

  const name = value.trim();
  const length = Array.from(name).length;
  if (/[\u0000-\u001f\u007f-\u009f]/u.test(name)) {
    return { error: 'El nombre no puede contener caracteres de control.' };
  }
  if (length < 2 || length > 24) {
    return { error: 'Escribe un nombre de 2 a 24 caracteres.' };
  }

  return { name };
}

export function createSession(name, now = Date.now()) {
  const session = { id: randomBytes(32).toString('base64url'), name, lastSeen: now };
  sessions.set(session.id, session);
  return session;
}

export function getSession(id, now = Date.now()) {
  const session = sessions.get(id);
  if (!session) return null;
  if (now - session.lastSeen >= sessionTtlMs) {
    sessions.delete(id);
    return null;
  }

  session.lastSeen = now;
  return session;
}
