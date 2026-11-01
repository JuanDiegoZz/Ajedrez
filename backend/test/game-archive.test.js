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
      if (sql.includes('to_regclass')) return { rows: [{ games: 'games' }] };
      if (sql.includes('FROM pg_constraint') && sql.includes('contype')) return { rows: [
        { name: 'games_end_reason_check', definition: "CHECK ((end_reason = ANY (ARRAY['checkmate'::text, 'stalemate'::text, 'insufficient_material'::text, 'repetition'::text, 'fifty_moves'::text, 'resignation'::text, 'disconnect'::text, 'interrupted'::text])))" },
        { name: 'games_check1', definition: "CHECK ((((end_reason = ANY (ARRAY['stalemate'::text, 'insufficient_material'::text, 'repetition'::text, 'fifty_moves'::text])) AND (result = '1/2-1/2'::text)) OR (end_reason <> ALL (ARRAY['stalemate'::text, 'insufficient_material'::text, 'repetition'::text, 'fifty_moves'::text]))))" },
      ] };
      return { rows: [] };
    },
    release() { calls.push({ sql: 'RELEASE' }); },
  };
  return { calls, connect: async () => client, query: async (sql) => { calls.push({ sql }); } };
}

const record = {
  id: '75e1db51-2c1c-4b17-8ae3-d9549829c32b',
  mode: 'human', whiteName: 'Alex', blackName: 'Sam', result: '1-0', endReason: 'checkmate',
  timeControl: null, whiteRemainingMs: null, blackRemainingMs: null,
  finalFen: 'fen', startedAt: '2026-10-15T00:00:00.000Z', finishedAt: '2026-10-15T00:01:00.000Z',
  moves: [{ from: 'f2', to: 'f3', promotion: null, san: 'f3' }],
};

test('creates only the approved games and moves archive tables', async () => {
  const pool = fakePool();
  await initializeGameArchive(pool);
  assert.match(pool.calls[0].sql, /CREATE TABLE IF NOT EXISTS games/u);
  assert.match(pool.calls[1].sql, /CREATE TABLE IF NOT EXISTS moves/u);
  assert.ok(pool.calls.some((call) => call.sql === 'COMMIT'));
});

test('archives game and ordered move history in one transaction', async () => {
  const pool = fakePool();
  await archiveFinishedGame(pool, record);
  assert.deepEqual(pool.calls.map((call) => call.sql.split(' ')[0]), ['BEGIN', 'INSERT', 'INSERT', 'COMMIT', 'RELEASE']);
  assert.deepEqual(pool.calls[2].values.slice(0, 5), [record.id, 1, 'f2', 'f3', null]);
  assert.deepEqual(pool.calls[1].values.slice(9), [null, null, null]);
});

test('stores bot identity and mode in the same game archive', async () => {
  const pool = fakePool();
  const botRecord = { ...record, mode: 'bot', blackName: 'Bot' };
  await archiveFinishedGame(pool, botRecord);
  assert.equal(pool.calls[1].values[1], 'bot');
  assert.equal(pool.calls[1].values[3], 'Bot');
  assert.equal(pool.calls[2].values[5], 'f3');
});

test('rolls back the complete archive when a move insert fails', async () => {
  const pool = fakePool(true);
  await assert.rejects(archiveFinishedGame(pool, record), /disk unavailable/u);
  assert.equal(pool.calls.at(-2).sql, 'ROLLBACK');
  assert.equal(pool.calls.at(-1).sql, 'RELEASE');
});

test('archive retry accepts identical content and rejects a reused ID with changed data', async () => {
  const calls = [];
  const client = {
    async query(sql) {
      calls.push(sql);
      if (sql.includes('INSERT INTO games')) return { rows: [] };
      if (sql.includes('SELECT * FROM games')) return { rows: [{
        mode: record.mode, white_name: record.whiteName, black_name: record.blackName,
        result: record.result, end_reason: record.endReason, final_fen: record.finalFen,
        time_control: record.timeControl, white_remaining_ms: record.whiteRemainingMs,
        black_remaining_ms: record.blackRemainingMs, started_at: new Date(record.startedAt), finished_at: new Date(record.finishedAt),
      }] };
      if (sql.includes('SELECT ply')) return { rows: [{ ply: 1, from_square: 'f2', to_square: 'f3', promotion: null, san: 'f3' }] };
      return { rows: [] };
    },
    release() { calls.push('RELEASE'); },
  };
  const pool = { connect: async () => client };
  await archiveFinishedGame(pool, record);
  await archiveFinishedGame(pool, record);
  assert.equal(calls.filter((sql) => sql === 'COMMIT').length, 2);
  assert.equal(calls.filter((sql) => sql.includes('INSERT INTO moves')).length, 0);
  await assert.rejects(archiveFinishedGame(pool, { ...record, result: '0-1' }), /otros datos/u);
  assert.equal(calls.at(-2), 'ROLLBACK');
});
