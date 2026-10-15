import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createGame,
  createBotGame,
  expireDisconnectedPlayer,
  getArchiveRecord,
  getGame,
  getGameForSession,
  getLegalMoves,
  markGameDisconnected,
  makeMove,
  applyBotMove,
  retryBotTurn,
  setBotSearchError,
  reconnectGamePlayer,
  resignGame,
} from '../src/games.js';

function fixture(fen) {
  return createGame({
    id: `room-${Math.random()}`,
    hostSessionId: 'host-session',
    hostName: 'Alex',
    guestSessionId: 'guest-session',
    guestName: 'Sam',
  }, fen);
}

const play = (game, session, from, to, promotion) => makeMove(session, game.id, { from, to, promotion });

test('creates a public initial game with host as white and guest as black', () => {
  const game = fixture();
  assert.equal(game.status, 'playing');
  assert.equal(game.turn, 'white');
  assert.equal(game.fen, 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  assert.deepEqual(game.white, { name: 'Alex' });
  assert.deepEqual(game.black, { name: 'Sam' });
  assert.equal(JSON.stringify(game).includes('session'), false);
});

test('creates a private bot game and applies only a revision-matched bot move', () => {
  const game = createBotGame('human-session', 'Alex');
  assert.equal(game.mode, 'bot');
  assert.equal(game.turn, 'white');
  assert.equal(game.you, 'white');
  assert.deepEqual(game.white, { name: 'Alex' });
  assert.deepEqual(game.black, { name: 'Bot' });
  assert.equal(JSON.stringify(game).includes('human-session'), false);
  assert.equal(getGameForSession('human-session').id, game.id);
  assert.throws(() => getGame('intruder', game.id), { code: 'NOT_A_PLAYER' });

  const afterHuman = makeMove('human-session', game.id, { from: 'e2', to: 'e4' });
  assert.equal(afterHuman.botThinking, true);
  assert.deepEqual(afterHuman.history, ['e4']);
  assert.throws(() => makeMove('human-session', game.id, { from: 'e7', to: 'e5' }), { code: 'NOT_YOUR_TURN' });
  assert.equal(setBotSearchError(game.id, afterHuman.revision).botError, true);
  assert.equal(retryBotTurn('human-session', game.id).botThinking, true);
  assert.equal(applyBotMove(game.id, afterHuman.revision - 1, { from: 'e7', to: 'e5' }), null);

  const afterBot = applyBotMove(game.id, afterHuman.revision, { from: 'e7', to: 'e5' });
  assert.equal(afterBot.turn, 'white');
  assert.equal(afterBot.botThinking, false);
  assert.deepEqual(afterBot.history, ['e4', 'e5']);
  resignGame('human-session', game.id);
  assert.equal(getArchiveRecord(game.id).mode, 'bot');
  assert.equal(getArchiveRecord(game.id).blackName, 'Bot');
  assert.equal(getArchiveRecord(game.id).moves.length, 2);
});

test('bot calculation is invalidated during human recovery, then can be retried', () => {
  const game = createBotGame('recovering-human', 'Alex');
  const waiting = makeMove('recovering-human', game.id, { from: 'e2', to: 'e4' });
  const disconnected = markGameDisconnected('recovering-human', game.id, Date.now() + 60_000);
  assert.equal(disconnected.paused, true);
  assert.equal(disconnected.botThinking, false);
  assert.equal(applyBotMove(game.id, waiting.revision, { from: 'e7', to: 'e5' }), null);

  const restored = reconnectGamePlayer('recovering-human', game.id);
  assert.equal(restored.paused, false);
  assert.equal(restored.botThinking, true);
  assert.ok(restored.revision > waiting.revision);
  assert.equal(applyBotMove(game.id, waiting.revision, { from: 'e7', to: 'e5' }), null);
  assert.deepEqual(getGameForSession('recovering-human').history, ['e4']);
});

test('returns legal moves by square only to the player whose turn it is', () => {
  const game = fixture();
  assert.deepEqual(getLegalMoves('host-session', game.id, 'e2').map((move) => move.to), ['e3', 'e4']);
  assert.deepEqual(getLegalMoves('host-session', game.id, 'g1').map((move) => move.to).sort(), ['f3', 'h3']);
  assert.throws(() => getLegalMoves('guest-session', game.id, 'e7'), { code: 'NOT_YOUR_TURN' });
  assert.throws(() => getLegalMoves('third-session', game.id, 'e2'), { code: 'NOT_A_PLAYER' });
});

test('accepts legal moves, changes turn, and rejects illegal and out-of-turn moves', () => {
  const game = fixture();
  assert.throws(() => play(game, 'guest-session', 'e7', 'e5'), { code: 'NOT_YOUR_TURN' });
  assert.throws(() => play(game, 'host-session', 'e2', 'e5'), { code: 'ILLEGAL_MOVE' });
  const first = play(game, 'host-session', 'e2', 'e4');
  assert.equal(first.turn, 'black');
  assert.equal(first.lastMove.san, 'e4');
  assert.equal(play(game, 'guest-session', 'e7', 'e5').turn, 'white');
});

test('replays an exact duplicate command without applying the move twice', () => {
  const game = fixture();
  const command = { from: 'e2', to: 'e4', requestId: 'move-1', expectedRevision: 0 };
  const first = makeMove('host-session', game.id, command);
  const retry = makeMove('host-session', game.id, command);
  assert.equal(retry.revision, first.revision);
  assert.equal(retry.fen, first.fen);
  assert.equal(retry.history.length, 1);
  assert.throws(() => makeMove('host-session', game.id, { ...command, to: 'd4' }), { code: 'REQUEST_ID_REUSED' });
  assert.throws(() => makeMove('host-session', game.id, { ...command, expectedRevision: 1 }), { code: 'REQUEST_ID_REUSED' });
  assert.throws(() => makeMove('guest-session', game.id, {
    from: 'e7', to: 'e5', requestId: 'move-2', expectedRevision: 0,
  }), { code: 'STALE_REVISION' });
});

test('rejects nonparticipants and forged color or name fields', () => {
  const game = fixture();
  assert.throws(() => makeMove('third-session', game.id, {
    from: 'e2', to: 'e4', color: 'white', playerId: 'host-session', name: 'Alex',
  }), { code: 'NOT_A_PLAYER' });
});

test('accepts captures and records the last move without exposing engine state', () => {
  const game = fixture();
  play(game, 'host-session', 'e2', 'e4');
  play(game, 'guest-session', 'd7', 'd5');
  const capture = play(game, 'host-session', 'e4', 'd5');
  assert.equal(capture.lastMove.san, 'exd5');
  assert.equal(capture.lastMove.captured, 'p');
  capture.white.name = 'forged';
  assert.equal(getGame('host-session', game.id).white.name, 'Alex');
});

test('allows legal castling and rejects castling through occupied squares', () => {
  const game = fixture();
  assert.throws(() => play(game, 'host-session', 'e1', 'g1'), { code: 'ILLEGAL_MOVE' });
  for (const [session, from, to] of [
    ['host-session', 'e2', 'e4'], ['guest-session', 'e7', 'e5'],
    ['host-session', 'g1', 'f3'], ['guest-session', 'b8', 'c6'],
    ['host-session', 'f1', 'c4'], ['guest-session', 'g8', 'f6'],
  ]) play(game, session, from, to);
  const result = play(game, 'host-session', 'e1', 'g1');
  assert.equal(result.lastMove.san, 'O-O');
});

test('supports promotion and rejects invalid promotion symbols', () => {
  const game = fixture('7k/P7/8/8/8/8/8/7K w - - 0 1');
  assert.throws(() => play(game, 'host-session', 'a7', 'a8', 'king'), { code: 'INVALID_PROMOTION' });
  const promoted = play(game, 'host-session', 'a7', 'a8', 'q');
  assert.equal(promoted.lastMove.promotion, 'q');
  assert.equal(promoted.fen.split(' ')[0][0], 'Q');
});

test('supports en passant through the rules engine', () => {
  const game = fixture();
  for (const [session, from, to] of [
    ['host-session', 'e2', 'e4'], ['guest-session', 'a7', 'a6'],
    ['host-session', 'e4', 'e5'], ['guest-session', 'd7', 'd5'],
  ]) play(game, session, from, to);
  const capture = play(game, 'host-session', 'e5', 'd6');
  assert.equal(capture.lastMove.san, 'exd6');
  assert.equal(capture.lastMove.captured, 'p');
});

test('detects checkmate, reports the winner, and blocks later moves', () => {
  const game = fixture();
  for (const [session, from, to] of [
    ['host-session', 'f2', 'f3'], ['guest-session', 'e7', 'e5'],
    ['host-session', 'g2', 'g4'], ['guest-session', 'd8', 'h4'],
  ]) play(game, session, from, to);
  const finished = getGame('host-session', game.id);
  assert.equal(finished.status, 'finished');
  assert.equal(finished.check, true);
  assert.deepEqual(finished.result, { winner: 'black', reason: 'checkmate' });
  assert.throws(() => play(game, 'host-session', 'e2', 'e4'), { code: 'GAME_NOT_ACTIVE' });
});

test('detects insufficient material, stalemate and threefold repetition', () => {
  const material = fixture('8/8/8/8/8/8/8/K6k w - - 0 1');
  assert.deepEqual(getGame('host-session', material.id).result, { winner: null, reason: 'insufficient_material' });

  const stalemate = fixture('7k/5K2/6Q1/8/8/8/8/8 b - - 0 1');
  assert.deepEqual(getGame('host-session', stalemate.id).result, { winner: null, reason: 'stalemate' });

  const repetition = fixture('r3k3/8/8/8/8/8/8/R3K3 w - - 0 1');
  for (let n = 0; n < 2; n++) {
    play(repetition, 'host-session', 'e1', 'e2');
    play(repetition, 'guest-session', 'e8', 'e7');
    play(repetition, 'host-session', 'e2', 'e1');
    play(repetition, 'guest-session', 'e7', 'e8');
  }
  assert.deepEqual(getGame('host-session', repetition.id).result, { winner: null, reason: 'repetition' });
});

test('detects automatic fifty-move draw', () => {
  const game = fixture('7k/8/8/8/8/8/R7/K7 w - - 99 50');
  play(game, 'host-session', 'a2', 'a3');
  assert.deepEqual(getGame('host-session', game.id).result, { winner: null, reason: 'fifty_moves' });
});

test('resignation ends the game for the opponent once', () => {
  const game = fixture();
  const result = resignGame('guest-session', game.id);
  assert.deepEqual(result.result, { winner: 'white', reason: 'resignation' });
  assert.throws(() => resignGame('guest-session', game.id), { code: 'GAME_NOT_ACTIVE' });
});

test('pauses a game on disconnect and resumes the same snapshot on reconnect', () => {
  const game = fixture();
  const deadline = Date.now() + 60_000;

  const disconnected = markGameDisconnected('guest-session', game.id, deadline);
  assert.equal(disconnected.presence.black.status, 'disconnected');
  assert.equal(disconnected.paused, true);
  assert.throws(() => getLegalMoves('host-session', game.id, 'e2'), { code: 'GAME_PAUSED' });
  assert.throws(() => play(game, 'host-session', 'e2', 'e4'), { code: 'GAME_PAUSED' });

  const resumed = reconnectGamePlayer('guest-session', game.id);
  assert.equal(resumed.presence.black.status, 'connected');
  assert.equal(resumed.paused, false);
  assert.equal(resumed.fen, game.fen);
  assert.equal(play(game, 'host-session', 'e2', 'e4').turn, 'black');
});

test('disconnect timeout awards connected opponent and rejects later moves', () => {
  const game = fixture();
  const deadline = Date.now() + 60_000;
  markGameDisconnected('guest-session', game.id, deadline);

  const finished = expireDisconnectedPlayer('guest-session', game.id, deadline);
  assert.deepEqual(finished.result, { winner: 'white', reason: 'disconnect' });
  assert.equal(finished.revision, 1);
  assert.equal(reconnectGamePlayer('guest-session', game.id), null);
  assert.throws(() => play(game, 'host-session', 'e2', 'e4'), { code: 'GAME_NOT_ACTIVE' });
});

test('first timeout interrupts a game if both players are disconnected', () => {
  const game = fixture();
  const firstDeadline = Date.now() + 60_000;
  markGameDisconnected('host-session', game.id, firstDeadline);
  markGameDisconnected('guest-session', game.id, firstDeadline + 1);

  const finished = expireDisconnectedPlayer('host-session', game.id, firstDeadline);
  assert.deepEqual(finished.result, { winner: null, reason: 'interrupted' });
  assert.equal(getArchiveRecord(game.id).result, '*');
  assert.equal(getArchiveRecord(game.id).endReason, 'interrupted');
});
