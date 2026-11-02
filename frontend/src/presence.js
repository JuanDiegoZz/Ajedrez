export const isLiveConnection = connection => connection === 'connected' || connection === 'restored';

export function recoverySeconds(presence, serverNow, elapsed) {
  if (presence?.status !== 'disconnected' || !Number.isFinite(presence.reconnectUntil) || !Number.isFinite(serverNow)) return null;
  return Math.ceil(Math.max(0, presence.reconnectUntil - serverNow - Math.max(0, elapsed)) / 1000);
}

export function playerPresence(game, color, connection) {
  if (game.status !== 'playing') return 'Partida finalizada';
  if (game.mode === 'bot' && color === 'black') return game.botThinking ? 'Calculando jugada' : 'Bot disponible';
  if (!isLiveConnection(connection)) return color === game.you ? connection === 'replaced' ? 'Control en otra pestaña' : 'Sin conexión confirmada' : 'Estado sin actualizar';
  return game.presence?.[color]?.status === 'disconnected' ? 'Recuperando conexión' : 'Conectado';
}

export function outcome(game) {
  if (!game.result) return { key: 'neutral', title: 'Resultado pendiente' };
  if (game.result.reason === 'interrupted') return { key: 'neutral', title: 'Partida interrumpida' };
  if (!game.result.winner) return { key: 'draw', title: 'Tablas' };
  return game.result.winner === game.you ? { key: 'win', title: 'Victoria' } : { key: 'loss', title: 'Derrota' };
}
