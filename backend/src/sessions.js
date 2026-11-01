import { randomBytes } from 'node:crypto';

export const sessionTtlMs = 2 * 60 * 60 * 1000;
const sessions = new Map();
export const avatarIds = Object.freeze(['club', 'knight', 'rook', 'bishop', 'compass', 'shield']);

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

export function createSession(name, now = Date.now(), avatarId = 'club') {
  const session = { id: randomBytes(32).toString('base64url'), cookieName: `ajedrez_session_${randomBytes(12).toString('base64url')}`, createdAt: now, name, avatarId: avatarIds.includes(avatarId) ? avatarId : 'club', profileVersion: 0, lastSeen: now };
  sessions.set(session.id, session);
  return session;
}

export function publicSession(session) {
  return { name: session.name, avatarId: avatarIds.includes(session.avatarId) ? session.avatarId : 'club', profileVersion: session.profileVersion ?? 0, kind: 'guest' };
}

export function updateSessionProfile(id, input) {
  const session = sessions.get(id);
  if (!session) return { error: 'SESSION_REQUIRED' };
  if (!avatarIds.includes(input?.avatarId)) return { error: 'INVALID_AVATAR' };
  const validated = validateName(input?.name);
  if (validated.error) return { error: 'INVALID_NAME', message: validated.error };
  if (!Number.isSafeInteger(input.expectedProfileVersion) || input.expectedProfileVersion !== (session.profileVersion ?? 0)) return { error: 'STALE_PROFILE' };
  if (validated.name === session.name && input.avatarId === (session.avatarId ?? 'club')) return { session: publicSession(session), changed: false };
  session.name = validated.name;
  session.avatarId = input.avatarId;
  session.profileVersion = (session.profileVersion ?? 0) + 1;
  return { session: publicSession(session), changed: true };
}

export function revokeSession(id) {
  return sessions.delete(id);
}

export function hasSession(id) { return sessions.has(id); }

export function findSession(id) { return sessions.get(id) ?? null; }

export function sessionCookieName(session) { return session.cookieName ?? 'ajedrez_session'; }

export function sessionCookieNamesFromCookieHeader(header = '') {
  return [...new Set(header.split(';').flatMap((part) => {
    const separator = part.indexOf('=');
    if (separator < 0) return [];
    const name = part.slice(0, separator).trim();
    return /^ajedrez_session(?:_[A-Za-z0-9_-]+)?$/u.test(name) ? [name] : [];
  }))];
}

export function staleSessionCookieNamesFromCookieHeader(header = '', keepSessionId, keepCookieName) {
  return [...new Set(header.split(';').flatMap((part) => {
    const separator = part.indexOf('=');
    if (separator < 0) return [];
    const name = part.slice(0, separator).trim();
    if (!/^ajedrez_session(?:_[A-Za-z0-9_-]+)?$/u.test(name)) return [];
    const id = part.slice(separator + 1).trim();
    if (name === keepCookieName && id === keepSessionId) return [];
    const session = sessions.get(id);
    if (id === keepSessionId || !session || Date.now() - session.lastSeen >= sessionTtlMs) return [name];
    return [];
  }))];
}

export function sessionIdFromCookieHeader(header = '') {
  const entries = header.split(';').flatMap((part) => {
    const separator = part.indexOf('=');
    if (separator < 0) return [];
    const name = part.slice(0, separator).trim();
    if (!/^ajedrez_session(?:_[A-Za-z0-9_-]+)?$/u.test(name)) return [];
    const id = part.slice(separator + 1).trim();
    const session = sessions.get(id);
    return [{ id, session, active: session && Date.now() - session.lastSeen < sessionTtlMs }];
  });
  const candidates = entries.filter((entry) => entry.session);
  const active = candidates.filter((entry) => entry.active);
  const selected = (active.length ? active : candidates).sort((a, b) => b.session.createdAt - a.session.createdAt)[0];
  return selected?.id ?? entries.at(-1)?.id;
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
