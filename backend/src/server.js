import { createServer } from 'node:http';
import pg from 'pg';
import { createSession, getSession, sessionTtlMs, validateName } from './sessions.js';

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

createServer(async (request, response) => {
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
      sendJson(response, 200, { name: existingSession.name });
      return;
    }

    if (existingSession) {
      setSessionCookie(response, existingSession.id);
      sendJson(response, 200, { name: existingSession.name });
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
      sendJson(response, 201, { name: session.name });
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
      sendJson(response, 401, { error: 'Inicia una sesión para continuar.' });
      return;
    }
    setSessionCookie(response, session.id);
    sendJson(response, 200, { rooms: [] });
    return;
  }

  sendJson(response, 404, { error: 'No se encontró esa dirección.' });
}).listen(port, '0.0.0.0');

process.on('SIGTERM', async () => {
  await pool.end();
  process.exit(0);
});
