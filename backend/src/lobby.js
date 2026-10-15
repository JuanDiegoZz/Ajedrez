import WebSocket, { WebSocketServer } from 'ws';
import { expireDisconnectedPlayer, getGame, getGameForSession, markGameDisconnected, reconnectGamePlayer } from './games.js';
import { expireDisconnectedHost, getRoomForSession, listRooms, markRoomDisconnected, reconnectRoomHost } from './rooms.js';
import { createRecoveryManager, reconnectGraceMs } from './recovery.js';
import { getSession } from './sessions.js';

export const heartbeatIntervalMs = 10_000;

function sessionIdFrom(request) {
  const cookies = request.headers.cookie?.split(';') ?? [];
  const value = cookies.map((cookie) => cookie.trim()).find((cookie) => cookie.startsWith('ajedrez_session='));
  return value?.slice('ajedrez_session='.length);
}

function send(socket, message) {
  if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
}

export function attachLobby(server, {
  graceMs = reconnectGraceMs,
  heartbeatIntervalMs: heartbeatMs = heartbeatIntervalMs,
  onGameFinished = () => {},
  onGameDisconnected = () => {},
  onBotTurn = () => {},
} = {}) {
  const webSocketServer = new WebSocketServer({ noServer: true, maxPayload: 2048 });
  const clients = new Map();
  const controlSockets = new Map();
  const expiredNotices = new Map();
  let closed = false;

  const recovery = createRecoveryManager({
    graceMs,
    onDisconnect(sessionId, deadline) {
      const session = { id: sessionId };
      const room = getRoomForSession(session);
      if (room?.gameId) {
        const game = markGameDisconnected(sessionId, room.gameId, deadline);
        if (game) broadcastGame(game);
      } else if (room?.status === 'waiting') {
        markRoomDisconnected(sessionId, deadline);
      } else {
        const botGame = getGameForSession(sessionId);
        const game = botGame && markGameDisconnected(sessionId, botGame.id, deadline);
        if (game) {
          onGameDisconnected(game);
          broadcastGame(game);
        }
      }
      broadcast();
    },
    onReconnect(sessionId) {
      const session = { id: sessionId };
      const room = getRoomForSession(session);
      if (room?.gameId) {
        const game = reconnectGamePlayer(sessionId, room.gameId);
        if (game) broadcastGame(game);
      } else {
        reconnectRoomHost(sessionId);
        const botGame = getGameForSession(sessionId);
        const game = botGame && reconnectGamePlayer(sessionId, botGame.id);
        if (game) {
          broadcastGame(game);
          onBotTurn(game);
        }
      }
      broadcast();
    },
    onExpire(sessionId, deadline) {
      const session = { id: sessionId };
      const room = getRoomForSession(session);
      if (room?.gameId) {
        const game = expireDisconnectedPlayer(sessionId, room.gameId, deadline);
        if (game) {
          broadcastGame(game);
          if (game.status === 'finished') void Promise.resolve(onGameFinished(game.id)).catch(() => {});
        }
      } else {
        const botGame = getGameForSession(sessionId);
        const game = botGame && expireDisconnectedPlayer(sessionId, botGame.id, deadline);
        if (game) {
          broadcastGame(game);
          if (game.status === 'finished') void Promise.resolve(onGameFinished(game.id)).catch(() => {});
        } else if (expireDisconnectedHost(sessionId, deadline)) {
          expiredNotices.set(sessionId, 'La sala se cerró porque no se recuperó la conexión a tiempo.');
        }
      }
      broadcast();
    },
  });

  const heartbeat = setInterval(() => {
    for (const webSocket of clients.keys()) {
      if (webSocket.isAlive === false) {
        webSocket.terminate();
      } else if (webSocket.readyState === WebSocket.OPEN) {
        webSocket.isAlive = false;
        webSocket.ping();
      }
    }
  }, heartbeatMs);
  heartbeat.unref?.();

  function cleanup() {
    if (closed) return;
    closed = true;
    clearInterval(heartbeat);
    recovery.stop();
    for (const webSocket of clients.keys()) webSocket.terminate();
    clients.clear();
    controlSockets.clear();
    expiredNotices.clear();
    webSocketServer.close();
  }

  server.once('close', cleanup);

  server.on('upgrade', (request, socket, head) => {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    const origin = request.headers.origin;
    let originUrl;
    try { originUrl = new URL(origin); } catch { originUrl = null; }
    const protocol = request.headers['x-forwarded-proto'] ?? (request.socket.encrypted ? 'https' : 'http');
    if (pathname !== '/ws' || originUrl?.host.toLowerCase() !== request.headers.host?.toLowerCase()
      || originUrl?.protocol !== `${protocol}:`) {
      socket.end('HTTP/1.1 403 Forbidden\r\n\r\n');
      return;
    }

    const sessionId = sessionIdFrom(request);
    const session = sessionId && getSession(sessionId);
    if (!session) {
      socket.end('HTTP/1.1 401 Unauthorized\r\n\r\n');
      return;
    }

    webSocketServer.handleUpgrade(request, socket, head, (webSocket) => {
      const previous = controlSockets.get(session.id);
      clients.set(webSocket, { session, subscribed: false, gameId: null });
      controlSockets.set(session.id, webSocket);
      webSocket.isAlive = true;
      webSocket.on('error', () => {});
      webSocket.on('pong', () => { webSocket.isAlive = true; });
      webSocket.on('close', () => {
        clients.delete(webSocket);
        if (controlSockets.get(session.id) !== webSocket) return;
        controlSockets.delete(session.id);
        if (getRoomForSession(session) || getGameForSession(session.id)) recovery.disconnect(session.id);
      });
      if (previous && previous !== webSocket) {
        send(previous, { type: 'session:replaced', message: 'Esta sesión se abrió en otra pestaña. Esta pestaña ya no controla la partida.' });
        previous.close(4001, 'Session replaced');
      }
      recovery.reconnect(session.id);
      webSocket.on('message', (data) => {
        if (controlSockets.get(session.id) !== webSocket) return;
        let message;
        try { message = JSON.parse(data.toString()); } catch { message = null; }
        if (message?.type === 'lobby:subscribe') {
          clients.get(webSocket).subscribed = true;
          send(webSocket, { type: 'lobby:state', rooms: listRooms() });
          send(webSocket, { type: 'room:state', room: getRoomForSession(session) });
          const expiredMessage = expiredNotices.get(session.id);
          if (expiredMessage) {
            expiredNotices.delete(session.id);
            send(webSocket, { type: 'recovery:expired', message: expiredMessage });
          }
          return;
        }
        if (message?.type === 'game:subscribe' && typeof message.gameId === 'string') {
          try {
            const game = getGame(session.id, message.gameId);
            clients.get(webSocket).gameId = game.id;
            send(webSocket, { type: 'game:state', game });
            if (game.mode === 'bot' && game.botThinking) onBotTurn(game);
          } catch (error) {
            send(webSocket, { type: 'error', code: error.code ?? 'GAME_NOT_FOUND', message: error.message });
          }
          return;
        }
        send(webSocket, { type: 'error', code: 'INVALID_MESSAGE', message: 'No se reconoció la solicitud. Vuelve a conectar.' });
      });
      webSocketServer.emit('connection', webSocket, request);
    });
  });

  function broadcast() {
    const rooms = listRooms();
    for (const [webSocket, client] of clients) {
      if (client.subscribed) send(webSocket, { type: 'lobby:state', rooms });
      send(webSocket, { type: 'room:state', room: getRoomForSession(client.session) });
    }
  }

  function broadcastGame(game) {
    const gameId = typeof game === 'string' ? game : game.id;
    for (const [webSocket, client] of clients) {
      if (client.gameId === gameId) {
        try { send(webSocket, { type: 'game:state', game: getGame(client.session.id, gameId) }); } catch { /* Session may expire before the next lobby refresh. */ }
      }
    }
  }

  return { webSocketServer, broadcast, broadcastGame, close: cleanup };
}
