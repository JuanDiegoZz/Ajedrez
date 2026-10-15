import WebSocket, { WebSocketServer } from 'ws';
import { getRoomForSession, listRooms } from './rooms.js';
import { getSession } from './sessions.js';

function sessionIdFrom(request) {
  const cookies = request.headers.cookie?.split(';') ?? [];
  const value = cookies.map((cookie) => cookie.trim()).find((cookie) => cookie.startsWith('ajedrez_session='));
  return value?.slice('ajedrez_session='.length);
}

function send(socket, message) {
  if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
}

export function attachLobby(server) {
  const webSocketServer = new WebSocketServer({ noServer: true, maxPayload: 2048 });
  const clients = new Map();

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
      clients.set(webSocket, { session, subscribed: false });
      webSocket.on('error', () => {});
      webSocket.on('close', () => clients.delete(webSocket));
      webSocket.on('message', (data) => {
        let message;
        try { message = JSON.parse(data.toString()); } catch { message = null; }
        if (message?.type !== 'lobby:subscribe') {
          send(webSocket, { type: 'error', code: 'INVALID_MESSAGE', message: 'No se reconoció la solicitud. Vuelve a conectar.' });
          return;
        }
        clients.get(webSocket).subscribed = true;
        send(webSocket, { type: 'lobby:state', rooms: listRooms() });
        send(webSocket, { type: 'room:state', room: getRoomForSession(session) });
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

  return { webSocketServer, broadcast };
}
