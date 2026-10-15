import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import pg from 'pg';
import { createSession, getSession, sessionTtlMs, validateName } from './sessions.js';
import { cancelRoom, createRoom, getRoomForSession, joinRoom, leaveRoom, listRooms } from './rooms.js';
import { attachLobby } from './lobby.js';

const { Pool } = pg;
const pool = new Pool();
const port = Number(process.env.PORT || 3000);

function sendJson(response, status, body, headers = {}) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...headers,
  });
  response.end(JSON.stringify(body));
}

function sessionIdFrom(request) {
  const cookies = request.headers.cookie?.split(';') ?? [];
  const value = cookies.map((cookie) => cookie.trim()).find((cookie) => cookie.startsWith('ajedrez_session='));
  return value?.slice('ajedrez_session='.length);
}

function setSessionCookie(response, id) {
  response.setHeader('Set-Cookie', `ajedrez_session=${id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${sessionTtlMs / 1000}`);
}

function clearSessionCookie(response) {
  response.setHeader('Set-Cookie', 'ajedrez_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
}

async function readJson(request) {
  if (!request.headers['content-type']?.startsWith('application/json')) {
    const error = new Error('Formato no compatible.');
    error.status = 415;
    throw error;
  }

  let body = '';
  for await (const chunk of request) {
    body += chunk;
    if (Buffer.byteLength(body) > 1024) {
      const error = new Error('La solicitud es demasiado grande.');
      error.status = 413;
      throw error;
    }
  }

  try {
    return JSON.parse(body);
  } catch {
    const error = new Error('No se pudo leer el nombre. Inténtalo de nuevo.');
    error.status = 400;
    throw error;
  }
}

const server = createServer(async (request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname;

  if (request.method === 'GET' && pathname === '/api/health') {
    let database = 'available';
    try {
      await pool.query('SELECT 1');
    } catch {
      database = 'unavailable';
    }

    sendJson(response, database === 'available' ? 200 : 503, { backend: 'available', database });
    return;
  }

  if (pathname === '/api/session' && (request.method === 'GET' || request.method === 'POST')) {
    const sessionId = sessionIdFrom(request);
    const existingSession = sessionId && getSession(sessionId);

    if (request.method === 'GET') {
      if (!existingSession) {
        if (sessionId) clearSessionCookie(response);
        sendJson(response, 200, null);
        return;
      }
      setSessionCookie(response, existingSession.id);
      sendJson(response, 200, { name: existingSession.name, room: getRoomForSession(existingSession) });
      return;
    }

    if (existingSession) {
      setSessionCookie(response, existingSession.id);
      sendJson(response, 200, { name: existingSession.name, room: getRoomForSession(existingSession) });
      return;
    }

    try {
      const input = await readJson(request);
      const result = validateName(input?.name);
      if (result.error) {
        sendJson(response, 400, { error: result.error });
        return;
      }

      const session = createSession(result.name);
      setSessionCookie(response, session.id);
      sendJson(response, 201, { name: session.name, room: null });
    } catch (error) {
      sendJson(response, error.status ?? 400, { error: error.status === 415
        ? 'No se pudo enviar el nombre. Inténtalo de nuevo.'
        : error.status === 413
          ? 'El nombre enviado es demasiado largo.'
          : error.status === 400
            ? error.message
            : 'No se pudo crear la sesión. Inténtalo de nuevo.' });
    }
    return;
  }

  if (request.method === 'GET' && pathname === '/api/rooms') {
    const sessionId = sessionIdFrom(request);
    const session = sessionId && getSession(sessionId);
    if (!session) {
      if (sessionId) clearSessionCookie(response);
      sendJson(response, 401, { error: { code: 'SESSION_REQUIRED', message: 'Inicia una sesión para continuar.' } });
      return;
    }
    setSessionCookie(response, session.id);
    sendJson(response, 200, { rooms: listRooms() });
    return;
  }

  if (pathname === '/api/rooms' && request.method === 'POST') {
    const sessionId = sessionIdFrom(request);
    const session = sessionId && getSession(sessionId);
    if (!session) {
      sendJson(response, 401, { error: { code: 'SESSION_REQUIRED', message: 'Inicia una sesión para crear una sala.' } });
      return;
    }
    try {
      const input = await readJson(request);
      const existingRoom = getRoomForSession(session);
      const room = createRoom(session, input?.name);
      setSessionCookie(response, session.id);
      sendJson(response, existingRoom ? 200 : 201, { room });
      lobby.broadcast();
    } catch (error) {
      sendJson(response, error.status ?? 400, { error: {
        code: error.code ?? 'INVALID_REQUEST',
        message: error.code ? error.message : 'No se pudo crear la sala. Revisa el nombre e inténtalo de nuevo.',
      } });
    }
    return;
  }

  const roomAction = pathname.match(/^\/api\/rooms\/([^/]+)\/(join|leave)$/u);
  if (roomAction && request.method === 'POST') {
    const sessionId = sessionIdFrom(request);
    const session = sessionId && getSession(sessionId);
    if (!session) {
      sendJson(response, 401, { error: { code: 'SESSION_REQUIRED', message: 'Tu sesión terminó. Vuelve a entrar.' } });
      return;
    }
    try {
      const roomId = decodeURIComponent(roomAction[1]);
      let room;
      if (roomAction[2] === 'join') room = joinRoom(session, roomId);
      else {
        leaveRoom(session, roomId);
        room = getRoomForSession(session);
      }
      setSessionCookie(response, session.id);
      sendJson(response, 200, { room });
      lobby.broadcast();
    } catch (error) {
      sendJson(response, error.status ?? 400, { error: {
        code: error.code ?? 'INVALID_REQUEST',
        message: error.message ?? 'No se pudo actualizar la sala. Vuelve a intentarlo.',
      } });
    }
    return;
  }

  const roomToCancel = pathname.match(/^\/api\/rooms\/([^/]+)$/u);
  if (roomToCancel && request.method === 'DELETE') {
    const sessionId = sessionIdFrom(request);
    const session = sessionId && getSession(sessionId);
    if (!session) {
      sendJson(response, 401, { error: { code: 'SESSION_REQUIRED', message: 'Tu sesión terminó. Vuelve a entrar.' } });
      return;
    }
    try {
      cancelRoom(session, decodeURIComponent(roomToCancel[1]));
      setSessionCookie(response, session.id);
      sendJson(response, 200, { room: null });
      lobby.broadcast();
    } catch (error) {
      sendJson(response, error.status ?? 400, { error: { code: error.code ?? 'INVALID_REQUEST', message: error.message } });
    }
    return;
  }

  sendJson(response, 404, { error: 'No se encontró esa dirección.' });
});
const lobby = attachLobby(server);

export { server };

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  server.listen(port, '0.0.0.0');
}

process.on('SIGTERM', async () => {
  await pool.end();
  process.exit(0);
});
