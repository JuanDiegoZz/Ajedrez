import test from 'node:test';
import assert from 'node:assert/strict';
import { migrateGameArchiveSchema } from '../src/game-archive-migration.js';

test('unexpected archive schema aborts migration transaction without changing stored rows', async () => {
  const calls = [];
  let rows = 65;
  const client = {
    async query(sql) {
      calls.push(sql);
      if (sql.startsWith('SELECT to_regclass')) return { rows: [{ games: 'games' }] };
      if (sql.includes('FROM pg_constraint')) return { rows: [{ name: 'unknown_check', definition: 'CHECK (true)' }] };
      if (sql === 'ROLLBACK') return { rows: [] };
      if (sql.startsWith('SELECT count(*)')) return { rows: [{ count: rows }] };
      return { rows: [] };
    },
    release() { calls.push('RELEASE'); },
  };
  const pool = { connect: async () => client };
  await assert.rejects(migrateGameArchiveSchema(pool), /no se identificó una restricción única/u);
  assert.ok(calls.includes('ROLLBACK'));
  const verification = await client.query('SELECT count(*) FROM games');
  assert.equal(verification.rows[0].count, 65);
});
