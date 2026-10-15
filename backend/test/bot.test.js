import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { chooseBotMove } from '../src/bot.js';

test('bot returns a legal move from the initial position within bounded search', () => {
  const chess = new Chess();
  const result = chooseBotMove({ history: [] });

  assert.ok(chess.moves({ verbose: true }).some((move) => move.from === result.move.from
    && move.to === result.move.to && (move.promotion ?? null) === (result.move.promotion ?? null)));
  assert.ok(result.nodes <= 5000);
});

test('bot takes an undefended queen and finds mate in one', () => {
  const capture = chooseBotMove({ fen: 'k7/8/8/8/8/8/4q3/3Q3K b - - 0 1' });
  assert.deepEqual([capture.move.from, capture.move.to], ['e2', 'd1']);

  const mate = chooseBotMove({ fen: 'rnbqkbnr/pppp1ppp/8/4p3/6P1/5P2/PPPPP2P/RNBQKBNR b KQkq - 0 2' });
  const chess = new Chess('rnbqkbnr/pppp1ppp/8/4p3/6P1/5P2/PPPPP2P/RNBQKBNR b KQkq - 0 2');
  chess.move(mate.move);
  assert.equal(chess.isCheckmate(), true);
});

test('bot avoids an immediate mate when a safe move exists', () => {
  const fen = 'r1bqkbnr/p1ppp1pp/2n5/1p3p2/7P/P3P3/RPPP1PP1/1NBQKBNR b Kkq - 1 4';
  const result = chooseBotMove({ fen });
  const chess = new Chess(fen);
  chess.move(result.move);
  for (const reply of chess.moves({ verbose: true })) {
    chess.move({ from: reply.from, to: reply.to, ...(reply.promotion ? { promotion: reply.promotion } : {}) });
    assert.equal(chess.isCheckmate(), false);
    chess.undo();
  }
});

test('bot promotes a pawn using a legal promotion piece', () => {
  const fen = '7k/8/8/8/8/8/p7/7K b - - 0 1';
  const result = chooseBotMove({ fen });
  assert.deepEqual([result.move.from, result.move.to], ['a2', 'a1']);
  assert.ok(['q', 'r', 'b', 'n'].includes(result.move.promotion));
  const chess = new Chess(fen);
  assert.doesNotThrow(() => chess.move(result.move));
});

test('terminal position produces no move', () => {
  const result = chooseBotMove({ fen: '7k/6Q1/5K2/8/8/8/8/8 b - - 0 1' });
  assert.equal(result.move, null);
});

test('uses the first legal move if the search budget ends before a full evaluation', () => {
  const chess = new Chess();
  const expected = chess.moves({ verbose: true })[0];
  const result = chooseBotMove({ history: [] }, { nodeLimit: 0 });
  assert.deepEqual([result.move.from, result.move.to], [expected.from, expected.to]);
  assert.equal(result.limited, true);
});
