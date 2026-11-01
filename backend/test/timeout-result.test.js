import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { timeoutResult } from '../src/timeout-result.js';

test('timeout is a draw when opposing side has only its king', () => {
  const chess = new Chess('8/8/8/8/8/8/8/K6k w - - 0 1');
  assert.deepEqual(timeoutResult(chess, 'white'), { winner: null, reason: 'timeout_insufficient_material' });
});

test('timeout gives win when opponent has rook and loser has only king', () => {
  const chess = new Chess('7k/8/8/8/8/8/8/R6K w - - 0 1');
  assert.deepEqual(timeoutResult(chess, 'black'), { winner: 'white', reason: 'timeout' });
});

test('opposing material can make a lone minor piece sufficient for cooperative mate', () => {
  const chess = new Chess('7k/8/8/8/8/8/8/KN5r w - - 0 1');
  assert.deepEqual(timeoutResult(chess, 'black'), { winner: 'white', reason: 'timeout' });
});

test('lone bishop and lone knight cannot mate a bare king', () => {
  const bishop = new Chess('7k/8/8/8/8/8/8/1B5K w - - 0 1');
  const knight = new Chess('7k/8/8/8/8/8/8/1N5K w - - 0 1');
  assert.equal(timeoutResult(bishop, 'black').reason, 'timeout_insufficient_material');
  assert.equal(timeoutResult(knight, 'black').reason, 'timeout_insufficient_material');
});

test('two knights versus a bare king are insufficient; opposing pawn permits cooperative mate', () => {
  const twoKnights = new Chess('7k/8/8/8/8/8/8/1NN4K w - - 0 1');
  const pawnHelp = new Chess('7k/8/8/8/8/8/p7/1N5K w - - 0 1');
  assert.equal(timeoutResult(twoKnights, 'black').reason, 'timeout_insufficient_material');
  assert.equal(timeoutResult(pawnHelp, 'black').reason, 'timeout');
});

test('same-color bishops stay insufficient; opposite-color bishops allow a cooperative mate', () => {
  const same = new Chess('7k/8/8/3b4/8/8/8/1B5K w - - 0 1');
  const opposite = new Chess('7k/8/8/2b5/8/8/8/1B5K w - - 0 1');
  assert.equal(timeoutResult(same, 'black').reason, 'timeout_insufficient_material');
  assert.equal(timeoutResult(opposite, 'black').reason, 'timeout');
});
