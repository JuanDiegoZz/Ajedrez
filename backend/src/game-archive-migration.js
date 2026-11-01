const legacyReasons = new Set(['checkmate', 'stalemate', 'insufficient_material', 'repetition', 'fifty_moves', 'resignation', 'disconnect', 'interrupted']);
const currentReasons = new Set([...legacyReasons, 'timeout', 'timeout_insufficient_material']);
const legacyDraws = new Set(['stalemate', 'insufficient_material', 'repetition', 'fifty_moves']);
const currentDraws = new Set([...legacyDraws, 'timeout_insufficient_material']);

function quoted(identifier) {
  return `"${identifier.replaceAll('"', '""')}"`;
}

function valuesIn(definition) {
  return [...definition.matchAll(/'([^']+)'::text/gu)].map((match) => match[1]);
}

function sameSet(values, expected) {
  const unique = new Set(values);
  const reasons = new Set([...unique].filter((value) => expected.has(value)));
  return [...unique].every((value) => expected.has(value) || ['1/2-1/2', '1-0', '0-1', '*'].includes(value))
    && reasons.size === expected.size;
}

function findConstraint(constraints, predicate, acceptedSets) {
  const matches = constraints.filter((item) => predicate(item.definition));
  if (matches.length !== 1) throw new Error('Esquema inesperado: no se identificó una restricción única de resultado en games.');
  const constraint = matches[0];
  const values = valuesIn(constraint.definition);
  if (!acceptedSets.some((set) => sameSet(values, set))) {
    throw new Error(`Esquema inesperado: definición no reconocida para ${constraint.name}.`);
  }
  return { ...constraint, current: sameSet(values, acceptedSets.at(-1)) };
}

async function ensureColumn(client, name, type) {
  const found = await client.query(
    `SELECT data_type, is_nullable FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'games' AND column_name = $1`,
    [name],
  );
  if (!found.rows.length) {
    await client.query(`ALTER TABLE public.games ADD COLUMN ${quoted(name)} ${type}`);
    return;
  }
  if (found.rows[0].data_type !== type || found.rows[0].is_nullable !== 'YES') {
    throw new Error(`Esquema inesperado: games.${name} debe ser ${type} nullable.`);
  }
}

async function ensureCheck(client, name, expected, expression) {
  const found = await client.query(
    `SELECT pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE conrelid = 'public.games'::regclass AND conname = $1`,
    [name],
  );
  if (found.rows.length) {
    const actual = found.rows[0].definition.toLowerCase().replace(/[\s()]/gu, '');
    if (actual !== expected) {
      throw new Error(`Esquema inesperado: games.${name} tiene otra definición.`);
    }
  } else {
    await client.query(`ALTER TABLE public.games ADD CONSTRAINT ${quoted(name)} CHECK (${expression})`);
  }
}

export async function migrateGameArchiveSchema(pool) {
  const client = await pool.connect();
  let transaction = false;
  try {
    await client.query('BEGIN');
    transaction = true;
    const table = await client.query("SELECT to_regclass('public.games') AS games");
    if (!table.rows[0]?.games) throw new Error('Esquema inesperado: falta public.games.');

    const constraints = await client.query(
      `SELECT conname AS name, pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE conrelid = 'public.games'::regclass AND contype = 'c'`,
    );
    const endReason = findConstraint(constraints.rows, (definition) => definition.includes('end_reason = ANY') && !definition.includes('result ='), [legacyReasons, currentReasons]);
    const drawResult = findConstraint(constraints.rows, (definition) => definition.includes('end_reason = ANY') && definition.includes('result ='), [legacyDraws, currentDraws]);

    await ensureColumn(client, 'time_control', 'text');
    await ensureColumn(client, 'white_remaining_ms', 'bigint');
    await ensureColumn(client, 'black_remaining_ms', 'bigint');

    if (!endReason.current) {
      await client.query(`ALTER TABLE public.games DROP CONSTRAINT ${quoted(endReason.name)}`);
      await client.query("ALTER TABLE public.games ADD CONSTRAINT games_end_reason_check CHECK (end_reason IN ('checkmate', 'stalemate', 'insufficient_material', 'repetition', 'fifty_moves', 'resignation', 'disconnect', 'interrupted', 'timeout', 'timeout_insufficient_material'))");
    }
    if (!drawResult.current) {
      await client.query(`ALTER TABLE public.games DROP CONSTRAINT ${quoted(drawResult.name)}`);
      await client.query("ALTER TABLE public.games ADD CONSTRAINT games_timeout_draw_check CHECK ((end_reason IN ('stalemate', 'insufficient_material', 'repetition', 'fifty_moves', 'timeout_insufficient_material') AND result = '1/2-1/2') OR end_reason NOT IN ('stalemate', 'insufficient_material', 'repetition', 'fifty_moves', 'timeout_insufficient_material'))");
    }

    await ensureCheck(client, 'games_time_control_check', "checktime_controlisnullortime_control=anyarray['3+0'::text,'5+0'::text,'10+5'::text,'unlimited'::text]", "time_control IS NULL OR time_control IN ('3+0', '5+0', '10+5', 'unlimited')");
    await ensureCheck(client, 'games_white_remaining_ms_check', 'checkwhite_remaining_msisnullorwhite_remaining_ms>=0', 'white_remaining_ms IS NULL OR white_remaining_ms >= 0');
    await ensureCheck(client, 'games_black_remaining_ms_check', 'checkblack_remaining_msisnullorblack_remaining_ms>=0', 'black_remaining_ms IS NULL OR black_remaining_ms >= 0');
    await client.query('COMMIT');
  } catch (error) {
    if (transaction) await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
