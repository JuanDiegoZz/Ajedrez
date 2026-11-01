function canMateByMaterial(chess, color) {
  const board = chess.board();
  const pieces = board.flat().filter(Boolean);
  const own = pieces.filter((piece) => piece.color === color && piece.type !== 'k');
  const enemy = pieces.filter((piece) => piece.color !== color && piece.type !== 'k');
  if (own.some((piece) => ['p', 'r', 'q'].includes(piece.type))) return true;
  if (own.length === 0) return false;
  if (own.some((piece) => piece.type === 'n')) {
    const knights = own.filter((piece) => piece.type === 'n').length;
    return own.some((piece) => piece.type === 'b') || knights > 2 || enemy.length > 0;
  }
  const bishops = own.filter((piece) => piece.type === 'b');
  if (bishops.length === own.length) {
    const allBishops = board.flatMap((row, rank) => row.map((piece, file) => ({ piece, rank, file })))
      .filter(({ piece }) => piece?.type === 'b');
    const squares = allBishops.filter(({ piece }) => piece.color === color)
      .map(({ rank, file }) => (rank + file) % 2);
    const enemyBishopSquares = allBishops.filter(({ piece }) => piece.color !== color)
      .map(({ rank, file }) => (rank + file) % 2);
    return new Set(squares).size > 1 || pieces.some((piece) => ['p', 'n'].includes(piece.type))
      || enemy.some((piece) => piece.type === 'r' || piece.type === 'q')
      || enemyBishopSquares.some((square) => !squares.includes(square));
  }
  return true;
}

export function timeoutResult(chess, flaggedColor) {
  const opponent = flaggedColor === 'white' ? 'b' : 'w';
  const winner = opponent === 'w' ? 'white' : 'black';
  if (!canMateByMaterial(chess, opponent)) return { winner: null, reason: 'timeout_insufficient_material' };
  return { winner, reason: 'timeout' };
}
