const gameTable = `
  CREATE TABLE IF NOT EXISTS games (
    id uuid PRIMARY KEY,
    mode text NOT NULL CHECK (mode IN ('human', 'bot')),
    white_name varchar(24) NOT NULL,
    black_name varchar(24) NOT NULL,
    result text NOT NULL CHECK (result IN ('1-0', '0-1', '1/2-1/2', '*')),
    end_reason text NOT NULL CHECK (end_reason IN ('checkmate', 'stalemate', 'insufficient_material', 'repetition', 'fifty_moves', 'resignation', 'disconnect', 'interrupted')),
    final_fen text NOT NULL,
    started_at timestamptz NOT NULL,
    finished_at timestamptz NOT NULL CHECK (finished_at >= started_at),
    CHECK ((end_reason IN ('stalemate', 'insufficient_material', 'repetition', 'fifty_moves') AND result = '1/2-1/2') OR end_reason NOT IN ('stalemate', 'insufficient_material', 'repetition', 'fifty_moves')),
    CHECK ((end_reason = 'interrupted' AND result = '*') OR end_reason <> 'interrupted')
  )`;

const movesTable = `
  CREATE TABLE IF NOT EXISTS moves (
    game_id uuid NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    ply integer NOT NULL CHECK (ply > 0),
    from_square char(2) NOT NULL CHECK (from_square ~ '^[a-h][1-8]$'),
    to_square char(2) NOT NULL CHECK (to_square ~ '^[a-h][1-8]$'),
    promotion char(1) CHECK (promotion IN ('q', 'r', 'b', 'n')),
    san text NOT NULL,
    PRIMARY KEY (game_id, ply)
  )`;

export async function initializeGameArchive(pool) {
  await pool.query(gameTable);
  await pool.query(movesTable);
}

function sameGame(row, game) {
  return row.mode === game.mode && row.white_name === game.whiteName && row.black_name === game.blackName
    && row.result === game.result && row.end_reason === game.endReason && row.final_fen === game.finalFen
    && new Date(row.started_at).getTime() === new Date(game.startedAt).getTime()
    && new Date(row.finished_at).getTime() === new Date(game.finishedAt).getTime();
}

export async function archiveFinishedGame(pool, game) {
  const client = await pool.connect();
  let transaction = false;
  try {
    await client.query('BEGIN');
    transaction = true;
    const inserted = await client.query(
      `INSERT INTO games (id, mode, white_name, black_name, result, end_reason, final_fen, started_at, finished_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (id) DO NOTHING RETURNING id`,
      [game.id, game.mode, game.whiteName, game.blackName, game.result, game.endReason, game.finalFen, game.startedAt, game.finishedAt],
    );
    if (inserted.rows.length === 0) {
      const existing = await client.query('SELECT * FROM games WHERE id = $1', [game.id]);
      const moves = await client.query('SELECT ply, from_square, to_square, promotion, san FROM moves WHERE game_id = $1 ORDER BY ply', [game.id]);
      const expectedMoves = game.moves.map((move, index) => ({
        ply: index + 1, from_square: move.from, to_square: move.to, promotion: move.promotion, san: move.san,
      }));
      if (!existing.rows[0] || !sameGame(existing.rows[0], game)
        || JSON.stringify(moves.rows) !== JSON.stringify(expectedMoves)) {
        throw new Error('El registro de esta partida ya existe con otros datos.');
      }
    } else {
      for (const [index, move] of game.moves.entries()) {
        await client.query(
          'INSERT INTO moves (game_id, ply, from_square, to_square, promotion, san) VALUES ($1, $2, $3, $4, $5, $6)',
          [game.id, index + 1, move.from, move.to, move.promotion, move.san],
        );
      }
    }
    await client.query('COMMIT');
  } catch (error) {
    if (transaction) await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
