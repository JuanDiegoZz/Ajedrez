import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { Chess } from 'chess.js';
import { createGameClock, normalizeTimeControl } from './game-clock.js';
import { timeoutResult } from './timeout-result.js';

const games = new Map();
const gameByRoom = new Map();
const gameByBotSession = new Map();
const promotionPieces = new Set(['q', 'r', 'b', 'n']);
let onGameTimeout = () => {};

export function setGameTimeoutHandler(handler) {
  onGameTimeout = handler;
}

function finishTimedOutGame(game, color) {
  if (game.status !== 'playing' || game.result) return;
  game.clockSnapshot = game.clockApi.snapshot(game.clock);
  game.clockApi.finish(game.clock);
  game.result = timeoutResult(game.chess, color);
  game.status = 'finished';
  game.finishedAt = new Date().toISOString();
  game.revision += 1;
  game.stateVersion += 1;
  void onGameTimeout(game.id);
}

function startClock(game, timeControl, clockOptions) {
  const control = normalizeTimeControl(timeControl);
  game.timeControl = control;
  game.clockApi = createGameClock(clockOptions);
  return control.initialMs === null ? null : game.clockApi.create({
    whiteMs: control.initialMs,
    blackMs: control.initialMs,
    incrementMs: control.incrementMs,
    onTimeout: (color) => finishTimedOutGame(game, color),
  });
}

function finishClock(game) {
  if (!game.clock || game.clock.phase === 'finished') return;
  game.clockSnapshot = game.clockApi.snapshot(game.clock);
  game.clockApi.finish(game.clock);
}

function settleClock(game, at) {
  if (!game.clock || game.status !== 'playing') return false;
  return game.clockApi.expireIfDue(game.clock, at);
}

function freezeTerminal(game) {
  if (game.status === 'finished') finishClock(game);
}

function commitAppliedMove(game, sessionId, move, { requestId, command, bot = false, at = performance.now() } = {}) {
  if (settleClock(game, at)) {
    game.chess.undo();
    return null;
  }
  const color = sessionId === game.whiteSessionId ? 'white' : 'black';
  if (game.clock && !game.clockApi.completeMove(game.clock, color, at)) {
    game.chess.undo();
    return null;
  }
  game.lastMove = {
    from: move.from, to: move.to, san: move.san,
    piece: move.piece,
    color: move.color === 'w' ? 'white' : 'black',
    capture: Boolean(move.captured),
    check: game.chess.isCheck(),
    mate: game.chess.isCheckmate(),
    castling: move.piece === 'k' && move.from[0] === 'e' && Math.abs(move.to.charCodeAt(0) - 101) === 2,
    ...(move.captured ? { captured: move.captured } : {}),
    ...(move.promotion ? { promotion: move.promotion } : {}),
  };
  game.moveHistory.push({ ...game.lastMove });
  game.revision += 1;
  game.stateVersion += 1;
  if (requestId !== undefined) game.lastRequest.set(sessionId, { requestId, command });
  game.botThinking = !bot && game.mode === 'bot' && game.status === 'playing' && game.chess.turn() === 'b';
  game.botError = false;
  finishFromRules(game);
  freezeTerminal(game);
  return publicGame(game, sessionId);
}

export class GameError extends Error {
  constructor(code, message, status = 409) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

function gameFor(sessionId, gameId) {
  const game = games.get(gameId);
  if (!game) throw new GameError('GAME_NOT_FOUND', 'La partida ya no existe.', 404);
  if (sessionId !== game.whiteSessionId && sessionId !== game.blackSessionId) {
    throw new GameError('NOT_A_PLAYER', 'No participas en esta partida.', 403);
  }
  return game;
}

function finishFromRules(game) {
  const chess = game.chess;
  if (chess.isCheckmate()) {
    game.result = { winner: chess.turn() === 'w' ? 'black' : 'white', reason: 'checkmate' };
  } else if (chess.isStalemate()) {
    game.result = { winner: null, reason: 'stalemate' };
  } else if (chess.isInsufficientMaterial()) {
    game.result = { winner: null, reason: 'insufficient_material' };
  } else if (chess.isThreefoldRepetition()) {
    game.result = { winner: null, reason: 'repetition' };
  } else if (chess.isDrawByFiftyMoves()) {
    game.result = { winner: null, reason: 'fifty_moves' };
  }
  if (game.result) {
    game.status = 'finished';
    game.finishedAt = new Date().toISOString();
  }
}

function publicGame(game, sessionId) {
  const whiteReconnectUntil = game.disconnected.get(game.whiteSessionId) ?? null;
  const blackReconnectUntil = game.disconnected.get(game.blackSessionId) ?? null;
  return {
    id: game.id,
    roomId: game.roomId,
    status: game.status,
    startedAt: game.startedAt,
    finishedAt: game.finishedAt,
    fen: game.chess.fen(),
    turn: game.chess.turn() === 'w' ? 'white' : 'black',
    check: game.chess.isCheck(),
    white: { name: game.whiteName },
    black: { name: game.blackName },
    history: game.chess.history(),
    moves: game.moveHistory.map((move) => ({ ...move })),
    lastMove: game.lastMove ? { ...game.lastMove } : null,
    result: game.result ? { ...game.result } : null,
    revision: game.revision,
    stateVersion: game.stateVersion,
    paused: game.status === 'playing' && game.disconnected.size > 0,
    presence: {
      white: { status: whiteReconnectUntil ? 'disconnected' : 'connected', reconnectUntil: whiteReconnectUntil },
      black: { status: game.mode === 'bot' ? 'bot' : blackReconnectUntil ? 'disconnected' : 'connected', reconnectUntil: blackReconnectUntil },
    },
    mode: game.mode,
    botThinking: game.botThinking,
    botError: game.botError,
    timeControl: game.timeControl?.id ?? 'unlimited',
    clock: game.clock ? { ...game.clockApi.snapshot(game.clock), sampledAt: game.clockApi.now() } : null,
    recoveryRemainingMs: game.recoveryBudget?.[sessionId] ?? null,
    ...(sessionId ? { you: sessionId === game.whiteSessionId ? 'white' : 'black' } : {}),
    ...(game.result ? { archiveStatus: game.archiveSaved ? 'saved' : 'pending' } : {}),
  };
}

export function createGame(room, initialFen, options = {}) {
  const existingId = gameByRoom.get(room.id);
  if (existingId) return publicGame(games.get(existingId));
  const game = {
    id: randomUUID(),
    mode: 'human',
    roomId: room.id,
    whiteSessionId: room.hostSessionId,
    blackSessionId: room.guestSessionId,
    whiteName: room.hostName,
    blackName: room.guestName,
    chess: new Chess(initialFen),
    status: 'playing',
    startedAt: new Date().toISOString(),
    finishedAt: null,
    lastMove: null,
    moveHistory: [],
    result: null,
    archiveSaved: false,
    timeControl: null,
    clock: null,
    clockSnapshot: null,
    revision: 0,
    botThinking: false,
    botError: false,
    lastRequest: new Map(),
    disconnected: new Map(),
    recoveryBudget: { [room.hostSessionId]: 60_000, [room.guestSessionId]: 60_000 },
    stateVersion: 0,
  };
  game.clock = startClock(game, options.timeControl ?? room.timeControl, options.clock);
  finishFromRules(game);
  games.set(game.id, game);
  gameByRoom.set(room.id, game.id);
  return publicGame(game);
}

export function createBotGame(sessionId, playerName, options = {}) {
  const existing = games.get(gameByBotSession.get(sessionId));
  if (existing?.status === 'playing') return publicGame(existing, sessionId);
  const game = {
    id: randomUUID(),
    mode: 'bot',
    roomId: null,
    whiteSessionId: sessionId,
    blackSessionId: null,
    whiteName: playerName,
    blackName: 'Bot',
    chess: new Chess(),
    status: 'playing',
    startedAt: new Date().toISOString(),
    finishedAt: null,
    lastMove: null,
    moveHistory: [],
    result: null,
    archiveSaved: false,
    timeControl: null,
    clock: null,
    clockSnapshot: null,
    revision: 0,
    botThinking: false,
    botError: false,
    lastRequest: new Map(),
    disconnected: new Map(),
    recoveryBudget: { [sessionId]: 60_000 },
    stateVersion: 0,
  };
  game.clock = startClock(game, options.timeControl, options.clock);
  games.set(game.id, game);
  gameByBotSession.set(sessionId, game.id);
  return publicGame(game, sessionId);
}

export function getGameForSession(sessionId) {
  const game = games.get(gameByBotSession.get(sessionId));
  return game ? publicGame(game, sessionId) : null;
}

export function getBotSearchInput(gameId) {
  const game = games.get(gameId);
  if (game?.mode !== 'bot' || game.status !== 'playing' || game.chess.turn() !== 'b'
    || !game.botThinking || game.disconnected.size) return null;
  return { revision: game.revision, history: game.chess.history() };
}

export function retryBotTurn(sessionId, gameId) {
  const game = gameFor(sessionId, gameId);
  if (game.mode !== 'bot') throw new GameError('NOT_BOT_GAME', 'Esta partida no está jugando contra un bot.');
  if (game.status !== 'playing') throw new GameError('GAME_NOT_ACTIVE', 'La partida ya terminó.');
  if (game.disconnected.size) throw new GameError('GAME_PAUSED', 'La partida está en pausa mientras se recupera la conexión.');
  if (game.chess.turn() !== 'b') throw new GameError('NOT_BOT_TURN', 'Espera tu turno.');
  if (game.botThinking) return publicGame(game, sessionId);
  game.botThinking = true;
  game.botError = false;
  game.stateVersion += 1;
  return publicGame(game, sessionId);
}

export function setBotSearchError(gameId, expectedRevision) {
  const game = games.get(gameId);
  if (game?.mode !== 'bot' || game.status !== 'playing' || game.revision !== expectedRevision || !game.botThinking) return null;
  game.botThinking = false;
  game.botError = true;
  game.stateVersion += 1;
  return publicGame(game, game.whiteSessionId);
}

export function applyBotMove(gameId, expectedRevision, candidate) {
  const game = games.get(gameId);
  const at = game?.clock ? game.clockApi.now() : performance.now();
  if (game && settleClock(game, at)) return null;
  if (game?.mode !== 'bot' || game.status !== 'playing' || game.revision !== expectedRevision
    || game.chess.turn() !== 'b' || !game.botThinking || game.disconnected.size) return null;
  if (!candidate || typeof candidate.from !== 'string' || typeof candidate.to !== 'string'
    || (candidate.promotion !== undefined && !promotionPieces.has(candidate.promotion))) return null;
  let move;
  try {
    move = game.chess.move({ from: candidate.from, to: candidate.to, ...(candidate.promotion ? { promotion: candidate.promotion } : {}) });
  } catch { return null; }
  return commitAppliedMove(game, game.blackSessionId, move, { bot: true, at });
}

export function leaveBotGame(sessionId, gameId) {
  const game = gameFor(sessionId, gameId);
  if (game.mode !== 'bot') throw new GameError('NOT_BOT_GAME', 'Esta partida no está jugando contra un bot.');
  if (game.status !== 'finished') throw new GameError('GAME_NOT_ACTIVE', 'Termina la partida antes de volver al lobby.');
  if (gameByBotSession.get(sessionId) === gameId) gameByBotSession.delete(sessionId);
}

export function getGame(sessionId, gameId) {
  return publicGame(gameFor(sessionId, gameId), sessionId);
}

export function markGameDisconnected(sessionId, gameId, reconnectUntil, allowance = 60_000) {
  const game = gameFor(sessionId, gameId);
  if (game.status !== 'playing') return null;
  if (settleClock(game, game.clock ? game.clockApi.now() : performance.now())) return null;
  game.disconnected.set(sessionId, reconnectUntil);
  if (game.disconnected.size === 1 && game.clock) game.clockApi.pause(game.clock);
  game.recoveryStartedAt ??= new Map();
  game.recoveryStartedAt.set(sessionId, { at: game.clock ? game.clockApi.now() : performance.now(), allowance });
  game.botThinking = false;
  game.botError = false;
  if (game.mode === 'bot') game.revision += 1;
  game.stateVersion += 1;
  return publicGame(game, sessionId);
}

export function reconnectGamePlayer(sessionId, gameId) {
  const game = gameFor(sessionId, gameId);
  if (game.status !== 'playing' || !game.disconnected.delete(sessionId)) return null;
  const started = game.recoveryStartedAt?.get(sessionId);
  if (started !== undefined) {
    const at = game.clock ? game.clockApi.now() : performance.now();
    game.recoveryBudget[sessionId] = Math.max(0, game.recoveryBudget[sessionId] - Math.min(started.allowance, at - started.at));
    game.recoveryStartedAt.delete(sessionId);
  }
  if (!game.disconnected.size && game.clock) game.clockApi.resume(game.clock);
  if (game.mode === 'bot' && game.chess.turn() === 'b') {
    game.botThinking = true;
    game.botError = false;
    game.revision += 1;
  }
  game.stateVersion += 1;
  return publicGame(game, sessionId);
}

export function expireDisconnectedPlayer(sessionId, gameId, reconnectUntil) {
  const game = gameFor(sessionId, gameId);
  if (game.status !== 'playing' || game.disconnected.get(sessionId) !== reconnectUntil) return null;
  const bothDisconnected = game.disconnected.size > 1;
  if (game.recoveryStartedAt?.has(sessionId)) {
    game.recoveryBudget[sessionId] = 0;
    game.recoveryStartedAt.delete(sessionId);
  }
  game.status = 'finished';
  game.botThinking = false;
  game.finishedAt = new Date().toISOString();
  game.result = {
    winner: bothDisconnected ? null : sessionId === game.whiteSessionId ? 'black' : 'white',
    reason: bothDisconnected ? 'interrupted' : 'disconnect',
  };
  game.revision += 1;
  game.stateVersion += 1;
  finishClock(game);
  return publicGame(game, sessionId);
}

export function getLegalMoves(sessionId, gameId, from) {
  const game = gameFor(sessionId, gameId);
  if (game.status !== 'playing') throw new GameError('GAME_NOT_ACTIVE', 'La partida ya terminó.');
  if (game.disconnected.size) throw new GameError('GAME_PAUSED', 'La partida está en pausa mientras se recupera la conexión.');
  const color = sessionId === game.whiteSessionId ? 'w' : 'b';
  if (game.chess.turn() !== color) throw new GameError('NOT_YOUR_TURN', 'Espera tu turno.');
  if (typeof from !== 'string' || !/^[a-h][1-8]$/u.test(from)) {
    throw new GameError('INVALID_SQUARE', 'Selecciona una casilla válida.', 400);
  }
  return game.chess.moves({ square: from, verbose: true }).map((move) => ({
    from: move.from,
    to: move.to,
    ...(move.promotion ? { promotion: move.promotion } : {}),
    san: move.san,
    capture: Boolean(move.captured),
  }));
}

export function makeMove(sessionId, gameId, input) {
  const game = gameFor(sessionId, gameId);
  const moveAt = game.clock ? game.clockApi.now() : performance.now();
  if (settleClock(game, moveAt)) throw new GameError('GAME_NOT_ACTIVE', 'El tiempo terminó antes de aplicar el movimiento.');
  const { from, to, promotion, requestId, expectedRevision } = input ?? {};
  const command = { from, to, promotion: promotion ?? null, expectedRevision: expectedRevision ?? null };
  const previousRequest = game.lastRequest.get(sessionId);
  if (requestId !== undefined && (typeof requestId !== 'string' || requestId.length < 1 || requestId.length > 128)) {
    throw new GameError('INVALID_REQUEST_ID', 'La solicitud de movimiento no es válida.', 400);
  }
  if (requestId !== undefined && previousRequest?.requestId === requestId) {
    if (JSON.stringify(previousRequest.command) !== JSON.stringify(command)) {
      throw new GameError('REQUEST_ID_REUSED', 'La solicitud ya se usó para otro movimiento.');
    }
    return publicGame(game, sessionId);
  }
  if (expectedRevision !== undefined && expectedRevision !== game.revision) {
    throw new GameError('STALE_REVISION', 'La partida cambió. Actualiza su estado antes de mover.');
  }
  if (game.status !== 'playing') throw new GameError('GAME_NOT_ACTIVE', 'La partida ya terminó.');
  if (game.disconnected.size) throw new GameError('GAME_PAUSED', 'La partida está en pausa mientras se recupera la conexión.');
  const color = sessionId === game.whiteSessionId ? 'w' : 'b';
  if (game.chess.turn() !== color) throw new GameError('NOT_YOUR_TURN', 'Espera tu turno.');
  if (typeof from !== 'string' || typeof to !== 'string' || !/^[a-h][1-8]$/u.test(from) || !/^[a-h][1-8]$/u.test(to)) {
    throw new GameError('INVALID_MOVE', 'Selecciona un movimiento válido.', 400);
  }
  if (promotion !== undefined && !promotionPieces.has(promotion)) {
    throw new GameError('INVALID_PROMOTION', 'Elige dama, torre, alfil o caballo.', 400);
  }
  const promotes = game.chess.moves({ square: from, verbose: true })
    .some((move) => move.to === to && move.promotion);
  if (promotes && promotion === undefined) {
    throw new GameError('PROMOTION_REQUIRED', 'Elige una pieza para la promoción.', 400);
  }
  let move;
  try {
    move = game.chess.move({ from, to, ...(promotion ? { promotion } : {}) });
  } catch {
    throw new GameError('ILLEGAL_MOVE', 'Ese movimiento no está permitido.');
  }
  const moved = commitAppliedMove(game, sessionId, move, { requestId, command, at: moveAt });
  if (!moved) throw new GameError('GAME_NOT_ACTIVE', 'El tiempo terminó antes de aplicar el movimiento.');
  return moved;
}

export function resignGame(sessionId, gameId) {
  const game = gameFor(sessionId, gameId);
  if (settleClock(game, game.clock ? game.clockApi.now() : performance.now())) throw new GameError('GAME_NOT_ACTIVE', 'El tiempo terminó antes de abandonar la partida.');
  if (game.status !== 'playing') throw new GameError('GAME_NOT_ACTIVE', 'La partida ya terminó.');
  game.status = 'finished';
  game.finishedAt = new Date().toISOString();
  game.result = { winner: sessionId === game.whiteSessionId ? 'black' : 'white', reason: 'resignation' };
  finishClock(game);
  game.revision += 1;
  game.stateVersion += 1;
  return publicGame(game, sessionId);
}

export function getArchiveRecord(gameId) {
  const game = games.get(gameId);
  if (!game?.result) return null;
  return {
    id: game.id,
    mode: game.mode,
    whiteName: game.whiteName,
    blackName: game.blackName,
    result: game.result.reason === 'interrupted' ? '*' : game.result.winner === 'white' ? '1-0' : game.result.winner === 'black' ? '0-1' : '1/2-1/2',
    endReason: game.result.reason,
    timeControl: game.clock ? game.timeControl.id : (game.timeControl?.id === 'unlimited' ? 'unlimited' : null),
    whiteRemainingMs: game.clockSnapshot?.whiteMs ?? null,
    blackRemainingMs: game.clockSnapshot?.blackMs ?? null,
    finalFen: game.chess.fen(),
    startedAt: game.startedAt,
    finishedAt: game.finishedAt,
    moves: game.chess.history({ verbose: true }).map((move) => ({
      from: move.from,
      to: move.to,
      promotion: move.promotion ?? null,
      san: move.san,
      piece: move.piece,
      color: move.color === 'w' ? 'white' : 'black',
      captured: move.captured ?? null,
      flags: move.flags,
    })),
  };
}

export function getGamePgn(sessionId, gameId) {
  const game = gameFor(sessionId, gameId);
  if (!game.result) throw new GameError('GAME_NOT_FINISHED', 'La partida todavía está en curso.');
  const replay = new Chess();
  for (const move of game.chess.history({ verbose: true })) {
    replay.move({ from: move.from, to: move.to, ...(move.promotion ? { promotion: move.promotion } : {}) });
  }
  const date = game.finishedAt.slice(0, 10).replaceAll('-', '.');
  replay.setHeader('Event', 'Ajedrez LAN');
  replay.setHeader('Site', 'Local');
  replay.setHeader('Date', date);
  replay.setHeader('Round', '1');
  replay.setHeader('White', game.whiteName);
  replay.setHeader('Black', game.blackName);
  replay.setHeader('Result', game.result.reason === 'interrupted' ? '*' : game.result.winner === 'white' ? '1-0' : game.result.winner === 'black' ? '0-1' : '1/2-1/2');
  replay.setHeader('TimeControl', game.timeControl?.initialMs === null ? '-' : `${game.timeControl.initialMs / 1000}+${game.timeControl.incrementMs / 1000}`);
  replay.setHeader('Termination', game.result.reason);
  return replay.pgn();
}

export function markGameArchived(gameId) {
  const game = games.get(gameId);
  if (game?.result && !game.archiveSaved) { game.archiveSaved = true; game.stateVersion += 1; }
}

export function getGameRecoveryGrace(sessionId, maximumMs = 60_000) {
  const gameId = gameByBotSession.get(sessionId) ?? [...gameByRoom.values()].find((id) => {
    const game = games.get(id);
    return game?.whiteSessionId === sessionId || game?.blackSessionId === sessionId;
  });
  const game = games.get(gameId);
  if (!game?.clock || game.status !== 'playing') return maximumMs;
  return Math.min(maximumMs, Math.max(0, game.recoveryBudget[sessionId] ?? 0));
}
