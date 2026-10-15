import test from 'node:test';
import assert from 'node:assert/strict';
import { archiveFinishedGame, initializeGameArchive } from '../src/game-archive.js';

function fakePool(failMove = false) {
  const calls = [];
  const client = {
    async query(sql, values) {
      calls.push({ sql, values });
      if (failMove && sql.includes('INSERT INTO moves')) throw new Error('disk unavailable');
      if (sql.includes('INSERT INTO games')) return { rows: [{ id: values[0] }] };
      return { rows: [] };
    },
    release() { calls.push({ sql: 'RELEASE' }); },
  };
  return { calls, connect: async () => client, query: async (sql) => { calls.push({ sql }); } };
}

const record = {
  id: '75e1db51-2c1c-4b17-8ae3-d9549829c32b',
  mode: 'human', whiteName: 'Alex', blackName: 'Sam', result: '1-0', endReason: 'checkmate',
  finalFen: 'fen', startedAt: '2026-10-15T00:00:00.000Z', finishedAt: '2026-10-15T00:01:00.000Z',
  moves: [{ from: 'f2', to: 'f3', promotion: null, san: 'f3' }],
};

test('creates only the approved games and moves archive tables', async () => {
  const pool = fakePool();
  await initializeGameArchive(pool);
  assert.equal(pool.calls.length, 2);
  assert.match(pool.calls[0].sql, /CREATE TABLE IF NOT EXISTS games/u);
  assert.match(pool.calls[1].sql, /CREATE TABLE IF NOT EXISTS moves/u);
});

test('archives game and ordered move history in one transaction', async () => {
  const pool = fakePool();
  await archiveFinishedGame(pool, record);
  assert.deepEqual(pool.calls.map((call) => call.sql.split(' ')[0]), ['BEGIN', 'INSERT', 'INSERT', 'COMMIT', 'RELEASE']);
  assert.deepEqual(pool.calls[2].values.slice(0, 5), [record.id, 1, 'f2', 'f3', null]);
});

test('rolls back the complete archive when a move insert fails', async () => {
  const pool = fakePool(true);
  await assert.rejects(archiveFinishedGame(pool, record), /disk unavailable/u);
  assert.equal(pool.calls.at(-2).sql, 'ROLLBACK');
  assert.equal(pool.calls.at(-1).sql, 'RELEASE');
});
