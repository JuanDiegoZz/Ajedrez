import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import pg from 'pg';
import { avatarIds, createSession, findSession, getSession, publicSession, revokeSession, sessionCookieName, sessionCookieNamesFromCookieHeader, sessionIdFromCookieHeader, sessionTtlMs, staleSessionCookieNamesFromCookieHeader, updateSessionProfile, validateName } from './sessions.js';
import { cancelRoom, createRoom, getRoomForSession, getRoomGameData, joinRoom, leaveRoom, listRooms, setRoomGame, updateWaitingRoomProfile } from './rooms.js';
import {
  applyBotMove, createBotGame, createGame, getArchiveRecord, getBotSearchInput, getGame,
  getGameForSession, getGamePgn, getLegalMoves, leaveBotGame, makeMove, markGameArchived,
  retryBotTurn, resignGame, setBotSearchError, setGameTimeoutHandler,
} from './games.js';
import { archiveFinishedGame, initializeGameArchive } from './game-archive.js';
import { attachLobby } from './lobby.js';
import { startBotWorker } from './bot.js';

const { Pool } = pg;
const pool = new Pool();
const port = Number(process.env.PORT || 3000);
const archiveRetries = new Set();
const botJobs = new Map();

function cancelBotTurn(gameId) {
  const job = botJobs.get(gameId);
  if (job && !job.cancelled) {
    job.cancelled = true;
    job.termination = job.worker.cancel();
  }
}

function queueBotTurn(gameId) {
  if (botJobs.has(gameId)) return;
  const input = getBotSearchInput(gameId);
  if (!input) return;
  if (botJobs.size >= 2) {
    const game = setBotSearchError(gameId, input.revision);
    if (game) lobby.broadcastGame(game);
    return;
  }

  const job = { revision: input.revision, worker: startBotWorker(input.history), cancelled: false, termination: null };
  botJobs.set(gameId, job);
  job.worker.promise.then(async (result) => {
    if (botJobs.get(gameId) !== job) return;
    if (job.cancelled) {
      await job.termination;
      botJobs.delete(gameId);
      if (getBotSearchInput(gameId)) queueBotTurn(gameId);
      return;
    }
    botJobs.delete(gameId);
    if (!result.move) {
      const failed = setBotSearchError(gameId, input.revision);
      if (failed) lobby.broadcastGame(failed);
      return;
    }
    const game = applyBotMove(gameId, input.revision, result.move);
    if (game) {
      lobby.broadcastGame(game);
      if (game.status === 'finished') void archiveGame(gameId);
    } else {
      const current = getBotSearchInput(gameId);
      if (current) queueBotTurn(gameId);
    }
  }).catch(async () => {
    if (botJobs.get(gameId) !== job) return;
    if (job.cancelled) await job.termination;
    if (botJobs.get(gameId) !== job) return;
    botJobs.delete(gameId);
    const game = setBotSearchError(gameId, input.revision);
    if (game) lobby.broadcastGame(game);
    else if (getBotSearchInput(gameId)) queueBotTurn(gameId);
  });
}

async function archiveGame(gameId) {
  if (archiveRetries.has(gameId)) return;
  archiveRetries.add(gameId);
  let retryScheduled = false;
  try {
    const record = getArchiveRecord(gameId);
    if (record) {
      await archiveFinishedGame(pool, record);
      markGameArchived(gameId);
      lobby.broadcastGame(gameId);
    }
  } catch (error) {
    retryScheduled = true;
    console.error('No se pudo archivar la partida; se reintentará.', error.message);
    const retry = setTimeout(() => {
      archiveRetries.delete(gameId);
      void archiveGame(gameId);
    }, 10_000);
    retry.unref();
  } finally {
    if (!retryScheduled) archiveRetries.delete(gameId);
  }
}

function sendJson(response, status, body, headers = {}) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...headers,
  });
  response.end(JSON.stringify(body));
}

function sessionIdFrom(request) {
  return sessionIdFromCookieHeader(request.headers.cookie);
}

function setSessionCookie(response, id, request) {
  const session = findSession(id);
  if (!session) return;
  const cookieName = sessionCookieName(session);
  response.setHeader('Set-Cookie', [
    `${cookieName}=${id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${sessionTtlMs / 1000}`,
    ...staleSessionCookieNamesFromCookieHeader(request?.headers.cookie, id, cookieName)
      .map((name) => `${name}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`),
  ]);
}

function sameOriginMutation(request) {
  const origin = request.headers.origin;
  if (!origin) return request.headers['sec-fetch-site'] !== 'cross-site';
  try { return new URL(origin).host.toLowerCase() === request.headers.host?.toLowerCase(); }
  catch { return false; }
}

function clearSessionCookie(response, name = 'ajedrez_session') {
  response.setHeader('Set-Cookie', `${name}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}

function clearSessionCookiesFromRequest(response, request) {
  const cookies = sessionCookieNamesFromCookieHeader(request.headers.cookie);
  if (cookies.length) response.setHeader('Set-Cookie', cookies.map((name) => `${name}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`));
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

  if (pathname === '/api/session' && request.method === 'PATCH') {
    if (!sameOriginMutation(request)) { sendJson(response, 403, { error: { code: 'ORIGIN_REJECTED', message: 'La solicitud debe venir de esta aplicación.' } }); return; }
    const sessionId = sessionIdFrom(request);
    const session = sessionId && getSession(sessionId);
    if (!session) { sendJson(response, 401, { error: { code: 'SESSION_REQUIRED', message: 'Tu sesión terminó.' } }); return; }
    try {
      const input = await readJson(request);
      const current = getSession(session.id);
      if (!current) { sendJson(response, 401, { error: { code: 'SESSION_REQUIRED', message: 'Tu sesión terminó.' } }); return; }
      const room = getRoomForSession(current);
      const game = room?.gameId ? getGame(current.id, room.gameId) : getGameForSession(current.id);
      if (game?.status === 'playing') { sendJson(response, 409, { error: { code: 'PROFILE_LOCKED_DURING_GAME', message: 'Podrás cambiar tu nombre y avatar cuando termine la partida.' } }); return; }
      const updated = updateSessionProfile(current.id, input);
      if (updated.error) { sendJson(response, updated.error === 'STALE_PROFILE' ? 409 : updated.error === 'SESSION_REQUIRED' ? 401 : 400, { error: { code: updated.error, message: updated.message ?? 'Revisa nombre y avatar.' } }); return; }
      const updatedRoom = updated.changed ? updateWaitingRoomProfile(current) : getRoomForSession(current);
      if (updated.changed) {
        lobby.broadcast();
        lobby.broadcastProfile(current);
      }
      setSessionCookie(response, current.id, request);
      sendJson(response, 200, { profile: updated.session, room: updatedRoom });
    } catch (error) { sendJson(response, error.status ?? 400, { error: { code: error.code ?? 'INVALID_REQUEST', message: error.message ?? 'No se pudo actualizar el perfil.' } }); }
    return;
  }

  if (pathname === '/api/session' && request.method === 'DELETE') {
    if (!sameOriginMutation(request)) { sendJson(response, 403, { error: { code: 'ORIGIN_REJECTED', message: 'La solicitud debe venir de esta aplicación.' } }); return; }
    const sessionId = sessionIdFrom(request);
    const session = sessionId && getSession(sessionId);
    if (!session) { sendJson(response, 200, { loggedOut: true }); return; }
    try {
      const input = request.headers['content-type']?.startsWith('application/json') ? await readJson(request) : {};
      const current = getSession(session.id);
      if (!current) { sendJson(response, 200, { loggedOut: true }); return; }
      const room = getRoomForSession(current);
      const game = room?.gameId ? getGame(current.id, room.gameId) : getGameForSession(current.id);
      if (game?.status === 'playing' && input?.abandonActiveGame !== true) { sendJson(response, 409, { error: { code: 'ACTIVE_GAME_CONFIRMATION_REQUIRED', message: 'Confirma que quieres abandonar la partida.' } }); return; }
      let endedNow = false;
      if (game?.status === 'playing') {
        let finished;
        try { finished = resignGame(current.id, game.id); }
        catch (error) {
          if (error.code !== 'GAME_NOT_ACTIVE') throw error;
          finished = getGame(current.id, game.id);
          if (finished.status !== 'finished') throw error;
        }
        endedNow = finished.status === 'finished';
        if (game.mode === 'bot') cancelBotTurn(game.id);
        lobby.broadcastGame(finished);
        void archiveGame(game.id);
      }
      if (room?.gameId) leaveRoom(current, room.id, true);
      else if (game?.mode === 'bot' && (game.status === 'finished' || endedNow)) leaveBotGame(current.id, game.id);
      else if (room?.status === 'waiting') cancelRoom(current, room.id);
      lobby.broadcast();
      lobby.cancelRecovery(current.id);
      revokeSession(current.id);
      lobby.revokeSession(current.id);
      clearSessionCookie(response, sessionCookieName(session));
      sendJson(response, 200, { loggedOut: true });
    } catch (error) { sendJson(response, error.status ?? 409, { error: { code: error.code ?? 'LOGOUT_FAILED', message: error.message ?? 'No se pudo cerrar la sesión.' } }); }
    return;
  }

  if (pathname === '/api/session' && (request.method === 'GET' || request.method === 'POST')) {
    const sessionId = sessionIdFrom(request);
    const existingSession = sessionId && getSession(sessionId);

    if (request.method === 'GET') {
      if (!existingSession) {
        if (sessionId) {
          clearSessionCookiesFromRequest(response, request);
          sendJson(response, 410, { error: 'El servidor se reinició o tu sesión terminó; la partida no puede recuperarse. Vuelve a entrar.' });
          return;
        }
        sendJson(response, 200, null);
        return;
      }
      const room = getRoomForSession(existingSession);
      setSessionCookie(response, existingSession.id, request);
      sendJson(response, 200, {
        ...publicSession(existingSession), room,
        game: room?.gameId ? getGame(existingSession.id, room.gameId) : getGameForSession(existingSession.id),
      });
      return;
    }

    if (existingSession) {
      setSessionCookie(response, existingSession.id, request);
      const room = getRoomForSession(existingSession);
      sendJson(response, 200, {
        ...publicSession(existingSession), room,
        game: room?.gameId ? getGame(existingSession.id, room.gameId) : getGameForSession(existingSession.id),
      });
      return;
    }

    if (sessionId) {
      clearSessionCookiesFromRequest(response, request);
      sendJson(response, 410, { error: 'La sesión anterior terminó. Inténtalo de nuevo.' });
      return;
    }

    try {
      const input = await readJson(request);
      if (input?.avatarId !== undefined && !avatarIds.includes(input.avatarId)) {
        sendJson(response, 400, { error: 'Elige un avatar disponible.' });
        return;
      }
      const result = validateName(input?.name);
      if (result.error) {
        sendJson(response, 400, { error: result.error });
        return;
      }

      const session = createSession(result.name, Date.now(), avatarIds.includes(input?.avatarId) ? input.avatarId : 'club');
      setSessionCookie(response, session.id, request);
      sendJson(response, 201, { ...publicSession(session), room: null });
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
      sendJson(response, 401, { error: { code: 'SESSION_REQUIRED', message: 'Inicia una sesión para continuar.' } });
      return;
    }
    setSessionCookie(response, session.id, request);
    sendJson(response, 200, { rooms: listRooms() });
    return;
  }

  if (pathname === '/api/games/bot' && request.method === 'POST') {
    const sessionId = sessionIdFrom(request);
    const session = sessionId && getSession(sessionId);
    if (!session) {
      sendJson(response, 401, { error: { code: 'SESSION_REQUIRED', message: 'Tu sesión terminó. Vuelve a entrar.' } });
      return;
    }
    if (getRoomForSession(session)) {
      sendJson(response, 409, { error: { code: 'SESSION_IN_ROOM', message: 'Sal de la sala actual antes de iniciar otra partida.' } });
      return;
    }
    const existing = getGameForSession(session.id);
    let input = {};
    try { if (request.headers['content-type']?.startsWith('application/json')) input = await readJson(request); }
    catch (error) { sendJson(response, error.status ?? 400, { error: { code: 'INVALID_REQUEST', message: error.message } }); return; }
    let game;
    const currentSession = getSession(session.id);
    if (!currentSession) { sendJson(response, 401, { error: { code: 'SESSION_REQUIRED', message: 'Tu sesión terminó.' } }); return; }
    try { game = createBotGame(currentSession.id, currentSession.name, { timeControl: input.timeControl, avatarId: currentSession.avatarId }); }
    catch (error) { sendJson(response, error.status ?? 400, { error: { code: error.code ?? 'INVALID_TIME_CONTROL', message: error.message } }); return; }
    setSessionCookie(response, session.id, request);
    sendJson(response, existing?.status === 'playing' ? 200 : 201, { game });
    return;
  }

  const gameAction = pathname.match(/^\/api\/games\/([^/]+)(?:\/(legal-moves|moves|resign|bot\/retry|leave))?$/u);
  if (gameAction) {
    const sessionId = sessionIdFrom(request);
    const session = sessionId && getSession(sessionId);
    if (!session) {
      sendJson(response, 401, { error: { code: 'SESSION_REQUIRED', message: 'Tu sesión terminó. Vuelve a entrar.' } });
      return;
    }
    try {
      const gameId = decodeURIComponent(gameAction[1]);
      const action = gameAction[2];
      if (request.method === 'GET' && action === undefined && new URL(request.url, 'http://localhost').searchParams.get('format') === 'pgn') {
        const pgn = getGamePgn(session.id, gameId);
        response.writeHead(200, { 'Content-Type': 'application/x-chess-pgn; charset=utf-8', 'Content-Disposition': `attachment; filename="ajedrez-${gameId}.pgn"`, 'Cache-Control': 'no-store' });
        response.end(pgn);
        return;
      }
      if (request.method === 'GET' && !action) {
        sendJson(response, 200, { game: getGame(session.id, gameId) });
        return;
      }
      if (request.method === 'GET' && action === 'legal-moves') {
        const from = new URL(request.url, 'http://localhost').searchParams.get('from');
        sendJson(response, 200, { moves: getLegalMoves(session.id, gameId, from) });
        return;
      }
      if (request.method === 'POST' && action === 'moves') {
        const input = await readJson(request);
        if (!getSession(session.id)) { sendJson(response, 401, { error: { code: 'SESSION_REQUIRED', message: 'Tu sesión terminó.' } }); return; }
        const game = makeMove(session.id, gameId, input);
        sendJson(response, 200, { game });
        lobby.broadcastGame(game);
        if (game.botThinking) queueBotTurn(gameId);
        if (game.status === 'finished') void archiveGame(gameId);
        return;
      }
      if (request.method === 'POST' && action === 'bot/retry') {
        const game = retryBotTurn(session.id, gameId);
        sendJson(response, 202, { game });
        lobby.broadcastGame(game);
        queueBotTurn(gameId);
        return;
      }
      if (request.method === 'POST' && action === 'resign') {
        const game = resignGame(session.id, gameId);
        cancelBotTurn(gameId);
        sendJson(response, 200, { game });
        lobby.broadcastGame(game);
        void archiveGame(gameId);
        return;
      }
      if (request.method === 'POST' && action === 'leave') {
        leaveBotGame(session.id, gameId);
        sendJson(response, 200, { room: null });
        return;
      }
      sendJson(response, 405, { error: { code: 'METHOD_NOT_ALLOWED', message: 'No se puede realizar esa operación.' } });
    } catch (error) {
      sendJson(response, error.status ?? 400, { error: {
        code: error.code ?? 'INVALID_REQUEST',
        message: error.code ? error.message : 'No se pudo procesar la solicitud. Revisa los datos e inténtalo de nuevo.',
      } });
    }
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
      if (!getSession(session.id)) { sendJson(response, 401, { error: { code: 'SESSION_REQUIRED', message: 'Tu sesión terminó.' } }); return; }
      const existingRoom = getRoomForSession(session);
      const room = createRoom(session, input?.name, input?.timeControl);
      setSessionCookie(response, session.id, request);
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
      let game = null;
      if (roomAction[2] === 'join') {
        room = joinRoom(session, roomId);
        if (room.status === 'ready') {
          const createdGame = createGame(getRoomGameData(roomId));
          setRoomGame(roomId, createdGame.id);
          game = getGame(session.id, createdGame.id);
          room = getRoomForSession(session);
        }
      }
      else {
        const currentRoom = getRoomForSession(session);
        const gameFinished = currentRoom?.gameId
          ? getGame(session.id, currentRoom.gameId).status === 'finished'
          : false;
        leaveRoom(session, roomId, gameFinished);
        room = getRoomForSession(session);
      }
      setSessionCookie(response, session.id, request);
      sendJson(response, 200, { room, ...(game ? { game } : {}) });
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
      setSessionCookie(response, session.id, request);
      sendJson(response, 200, { room: null });
      lobby.broadcast();
    } catch (error) {
      sendJson(response, error.status ?? 400, { error: { code: error.code ?? 'INVALID_REQUEST', message: error.message } });
    }
    return;
  }

  sendJson(response, 404, { error: 'No se encontró esa dirección.' });
});
const lobby = attachLobby(server, {
  onGameFinished: archiveGame,
  onGameDisconnected(game) { if (game.mode === 'bot') cancelBotTurn(game.id); },
  onBotTurn(game) { if (game.mode === 'bot' && game.botThinking) queueBotTurn(game.id); },
});

setGameTimeoutHandler((gameId) => {
  cancelBotTurn(gameId);
  lobby.broadcastGame(gameId);
  void archiveGame(gameId);
});

server.once('close', () => {
  for (const gameId of botJobs.keys()) cancelBotTurn(gameId);
});

export { server };

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  initializeGameArchive(pool)
    .then(() => server.listen(port, '0.0.0.0'))
    .catch((error) => {
      console.error('No se pudo preparar el archivo de partidas.', error.message);
      process.exitCode = 1;
    });
}

process.on('SIGTERM', async () => {
  await pool.end();
  process.exit(0);
});
