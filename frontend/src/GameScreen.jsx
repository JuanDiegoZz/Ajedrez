import { useEffect, useRef, useState } from 'react';

const symbols = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
const names = { k: 'rey', q: 'dama', r: 'torre', b: 'alfil', n: 'caballo', p: 'peón' };
const promotions = [
  { code: 'q', name: 'Dama' }, { code: 'r', name: 'Torre' },
  { code: 'b', name: 'Alfil' }, { code: 'n', name: 'Caballo' },
];

function piecesFromFen(fen) {
  const board = new Map();
  const [placement] = fen.split(' ');
  placement.split('/').forEach((rank, row) => {
    let file = 0;
    for (const token of rank) {
      if (/\d/u.test(token)) file += Number(token);
      else {
        board.set(`${String.fromCharCode(97 + file)}${8 - row}`, token);
        file += 1;
      }
    }
  });
  return board;
}

function resultText(game) {
  const { result } = game;
  if (!result) return '';
  const reason = {
    checkmate: 'jaque mate', stalemate: 'ahogado', insufficient_material: 'material insuficiente',
    repetition: 'repetición', fifty_moves: 'regla de cincuenta movimientos', resignation: 'abandono',
  }[result.reason] ?? 'tablas';
  if (!result.winner) return `Partida en tablas por ${reason}.`;
  const color = result.winner === 'white' ? 'white' : 'black';
  const winner = color === 'white' ? game.white.name : game.black.name;
  return `Partida terminada por ${reason}. ${color === game.you ? 'Ganaste.' : 'Perdiste.'} Ganó ${winner} con las ${color === 'white' ? 'blancas' : 'negras'}.`;
}

function MoveHistory({ history }) {
  const turns = [];
  for (let index = 0; index < history.length; index += 2) {
    turns.push({ number: index / 2 + 1, white: history[index], black: history[index + 1] });
  }
  return <ol className="move-history" aria-label="Historial de movimientos">
    {turns.map((turn) => <li key={turn.number}><span>{turn.number}.</span> {turn.white} {turn.black ?? ''}</li>)}
  </ol>;
}

export default function GameScreen({ game, room, session, connection, onGameChange, onReturnToLobby }) {
  const [selected, setSelected] = useState(null);
  const [legalMoves, setLegalMoves] = useState([]);
  const [legalLoading, setLegalLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [promotion, setPromotion] = useState(null);
  const [resignOpen, setResignOpen] = useState(false);
  const [focusedSquare, setFocusedSquare] = useState(null);
  const [returning, setReturning] = useState(false);
  const boardRef = useRef(null);
  const promotionDialog = useRef(null);
  const resignDialog = useRef(null);
  const requestNumber = useRef(0);
  const legalRequest = useRef(0);
  const focusAfterArrow = useRef(false);
  const myColor = game.you;
  const myTurn = game.turn === myColor;
  const connected = connection === 'connected';
  const board = piecesFromFen(game.fen);
  const ranks = myColor === 'white' ? [8, 7, 6, 5, 4, 3, 2, 1] : [1, 2, 3, 4, 5, 6, 7, 8];
  const files = myColor === 'white' ? ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] : ['h', 'g', 'f', 'e', 'd', 'c', 'b', 'a'];
  const squares = ranks.flatMap((rank) => files.map((file) => `${file}${rank}`));
  const ownPiece = (square) => {
    const piece = board.get(square);
    return piece && (piece === piece.toUpperCase() ? 'white' : 'black') === myColor;
  };
  const checkedKing = game.check ? [...board].find(([, piece]) => piece.toLowerCase() === 'k'
    && (piece === piece.toUpperCase() ? 'white' : 'black') === game.turn)?.[0] : null;

  useEffect(() => {
    if (focusAfterArrow.current) {
      focusAfterArrow.current = false;
      boardRef.current?.querySelector(`[data-square="${focusedSquare}"]`)?.focus();
    }
  }, [focusedSquare]);

  useEffect(() => {
    if (promotion && !promotionDialog.current?.open) promotionDialog.current?.showModal();
    if (!promotion && promotionDialog.current?.open) promotionDialog.current.close();
  }, [promotion]);

  useEffect(() => {
    if (resignOpen && !resignDialog.current?.open) {
      resignDialog.current?.showModal();
      resignDialog.current?.querySelector('[data-cancel]')?.focus();
    }
    if (!resignOpen && resignDialog.current?.open) resignDialog.current.close();
  }, [resignOpen]);

  useEffect(() => {
    setSelected(null);
    setLegalMoves([]);
    setPromotion(null);
    setMessage('');
  }, [game.revision]);

  async function selectPiece(square) {
    if (!myTurn || busy || !connected || game.status !== 'playing') {
      if (!myTurn && game.status === 'playing') setMessage('Espera tu turno para mover.');
      return;
    }
    if (selected === square) {
      legalRequest.current += 1;
      setSelected(null);
      setLegalMoves([]);
      setMessage('Selección cancelada.');
      return;
    }
    if (!ownPiece(square)) return;
    const request = ++legalRequest.current;
    setSelected(square);
    setLegalMoves([]);
    setLegalLoading(true);
    setMessage(`Pieza seleccionada en ${square}. Buscando movimientos legales…`);
    try {
      const response = await fetch(`/api/games/${encodeURIComponent(game.id)}/legal-moves?from=${square}`, { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok) throw Object.assign(new Error(result.error?.message || 'No se pudieron cargar los movimientos.'), { code: result.error?.code });
      if (request !== legalRequest.current) return;
      setLegalMoves(result.moves);
      setMessage(result.moves.length ? `Pieza en ${square}. ${result.moves.length} destinos legales.` : 'Esta pieza no tiene movimientos legales.');
    } catch (error) {
      if (request !== legalRequest.current) return;
      setMessage(error.message || 'No se pudieron cargar los movimientos legales.');
    } finally {
      if (request === legalRequest.current) setLegalLoading(false);
    }
  }

  async function submitMove(to, promotionPiece) {
    if (!selected || busy) return;
    setBusy(true);
    setMessage('Enviando movimiento…');
    try {
      const response = await fetch(`/api/games/${encodeURIComponent(game.id)}/moves`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: selected, to, ...(promotionPiece ? { promotion: promotionPiece } : {}),
          requestId: `${Date.now().toString(36)}-${++requestNumber.current}`, expectedRevision: game.revision,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        const copy = {
          STALE_REVISION: 'La partida cambió. Se actualizó el tablero; intenta de nuevo.',
          NOT_YOUR_TURN: 'El turno cambió. Revisa el estado actualizado.',
          GAME_NOT_ACTIVE: 'La partida ya terminó.',
          ILLEGAL_MOVE: 'Ese movimiento ya no está permitido. Elige otro destino.',
          PROMOTION_REQUIRED: 'Elige una pieza para completar la promoción.',
        };
        if (['STALE_REVISION', 'NOT_YOUR_TURN', 'GAME_NOT_ACTIVE'].includes(result.error?.code)) {
          const latest = await fetch(`/api/games/${encodeURIComponent(game.id)}`, { cache: 'no-store' });
          if (latest.ok) onGameChange((await latest.json()).game);
        }
        throw new Error(copy[result.error?.code] || result.error?.message || 'No se pudo mover. Inténtalo otra vez.');
      }
      onGameChange(result.game);
      setSelected(null);
      setLegalMoves([]);
      setPromotion(null);
      setMessage(result.game.status === 'finished' ? resultText(result.game) : `Movimiento confirmado. Turno de ${result.game.turn === 'white' ? 'las blancas' : 'las negras'}.`);
    } catch (error) {
      setMessage(error.message === 'Failed to fetch' ? 'Se perdió la conexión. Comprueba el estado del servidor.' : error.message);
    } finally {
      setBusy(false);
    }
  }

  async function activateSquare(square) {
    if (!myTurn || busy || !connected || game.status !== 'playing') {
      if (!myTurn && game.status === 'playing') setMessage('Espera tu turno para mover.');
      return;
    }
    if (selected) {
      const options = legalMoves.filter((move) => move.to === square);
      if (options.length) {
        if (options.some((move) => move.promotion)) setPromotion({ to: square });
        else await submitMove(square);
        return;
      }
    }
    if (ownPiece(square)) await selectPiece(square);
    else if (selected) setMessage(`No hay movimiento legal de ${selected} a ${square}.`);
  }

  async function resign() {
    if (busy) return;
    setBusy(true);
    setMessage('Abandonando la partida…');
    try {
      const response = await fetch(`/api/games/${encodeURIComponent(game.id)}/resign`, { method: 'POST' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message || 'No se pudo abandonar. Inténtalo de nuevo.');
      onGameChange(result.game);
      setResignOpen(false);
      setMessage(resultText(result.game));
    } catch (error) {
      setMessage(error.message || 'No se pudo abandonar. Inténtalo de nuevo.');
    } finally {
      setBusy(false);
    }
  }

  async function returnToLobby() {
    if (returning) return;
    setReturning(true);
    setMessage('Volviendo al lobby…');
    try {
      await onReturnToLobby();
    } finally {
      setReturning(false);
    }
  }

  const otherColor = myColor === 'white' ? 'black' : 'white';
  const topPlayer = otherColor === 'white' ? game.white : game.black;
  const bottomPlayer = myColor === 'white' ? game.white : game.black;
  const turnLabel = game.status !== 'playing' ? resultText(game)
    : game.check ? `Jaque a ${game.turn === 'white' ? 'las blancas' : 'las negras'}`
      : myTurn ? 'Tu turno' : `Turno de ${game.turn === 'white' ? 'las blancas' : 'las negras'}`;
  const displayMove = (square) => {
    const fromIndex = squares.indexOf(game.lastMove?.from);
    const toIndex = squares.indexOf(square);
    if (fromIndex < 0 || toIndex < 0) return null;
    const columns = 8;
    const dx = (fromIndex % columns) - (toIndex % columns);
    const dy = Math.floor(fromIndex / columns) - Math.floor(toIndex / columns);
    return { x: `${dx * 100}%`, y: `${dy * 100}%` };
  };

  return <section className="game-screen" aria-labelledby="game-title">
    <header className="game-heading">
      <div><p className="eyebrow">Partida · {room.name}</p><h2 id="game-title">Ajedrez</h2></div>
      <p className={`connection-status ${connected ? 'connected' : 'disconnected'}`} role="status">{connected ? 'Conectado' : 'Reconectando al lobby…'}</p>
    </header>
    <p className={`turn-indicator${game.check && game.status === 'playing' ? ' in-check' : ''}`} role="status" aria-live="polite">{game.check && game.status === 'playing' ? '⚠ ' : ''}{turnLabel}</p>
    {game.status === 'finished' && <section className="game-result" aria-labelledby="result-title">
      <h3 id="result-title">Partida terminada</h3><p>{resultText(game)}</p>
        {game.archiveStatus === 'pending' && <p>El resultado está pendiente de guardado; el servidor volverá a intentarlo.</p>}
      {game.archiveStatus === 'saved' && <p>Resultado guardado.</p>}
      <button className="primary-button" type="button" disabled={returning} onClick={returnToLobby}>{returning ? 'Volviendo…' : 'Volver al lobby'}</button>
    </section>}
    {game.check && checkedKing && <p className="check-message" role="status">⚠ El rey de {game.turn === 'white' ? 'las blancas' : 'las negras'} está en jaque, en {checkedKing}.</p>}
    <p className="game-message" role={message && /cambió|no se pudo|no está permitido|perdió|error/iu.test(message) ? 'alert' : 'status'} aria-live="polite">{message}</p>
    <div className="game-layout">
      <div className="board-column">
        <PlayerCard player={topPlayer} color={otherColor} label={otherColor === 'white' ? 'Anfitrión · Blancas' : 'Invitado · Negras'} active={game.status === 'playing' && game.turn === otherColor} />
        <p className="sr-only" id="board-help">Usa las flechas para explorar casillas. Pulsa Enter o espacio para seleccionar. Escape cancela la selección.</p>
        <div className="chess-board" role="group" aria-label={`Tablero de ajedrez, orientado para ${myColor === 'white' ? 'blancas' : 'negras'}`} aria-describedby="board-help" ref={boardRef}>
          {squares.map((square, index) => {
            const piece = board.get(square);
            const pieceColor = piece && (piece === piece.toUpperCase() ? 'white' : 'black');
            const targetMoves = selected ? legalMoves.filter((move) => move.to === square) : [];
            const isLastMove = game.lastMove && (game.lastMove.from === square || game.lastMove.to === square);
            const animation = game.lastMove?.to === square ? displayMove(square) : null;
            const isCastleRook = game.lastMove && piece?.toLowerCase() === 'r'
              && game.lastMove.from[0] === 'e' && Math.abs(game.lastMove.to.charCodeAt(0) - 101) === 2
              && square === `${game.lastMove.to[0] === 'g' ? 'f' : 'd'}${game.lastMove.to[1]}`;
            const rookAnimation = isCastleRook ? {
              x: `${((files.indexOf(game.lastMove.to[0] === 'g' ? 'h' : 'a') - files.indexOf(square)) * 100)}%`,
              y: '0%',
            } : null;
            const fileIndex = index % 8;
            const rankIndex = Math.floor(index / 8);
            const isDark = (files.indexOf(square[0]) + Number(square[1])) % 2 === 1;
            const label = `${square}, ${piece ? `${pieceColor === 'white' ? 'pieza blanca' : 'pieza negra'}: ${names[piece.toLowerCase()]}` : 'casilla vacía'}`
              + `${selected === square ? ', seleccionada' : ''}${targetMoves.length ? targetMoves.some((move) => move.capture) ? ', captura legal' : ', destino legal' : ''}`
              + `${game.check && square === checkedKing ? ', rey en jaque' : ''}`;
            return <button key={square} type="button" data-square={square}
              className={`board-square ${isDark ? 'dark' : 'light'}${selected === square ? ' selected' : ''}${targetMoves.length ? targetMoves.some((move) => move.capture) ? ' capture-target' : ' legal-target' : ''}${isLastMove ? ' last-move' : ''}${checkedKing === square ? ' checked-king' : ''}`}
              aria-label={label} aria-pressed={selected === square} aria-disabled={!myTurn || busy || game.status !== 'playing' || !connected}
              tabIndex={focusedSquare === square || (!focusedSquare && index === 0) ? 0 : -1}
              onFocus={() => setFocusedSquare(square)}
              onKeyDown={(event) => {
                if (event.key === 'Escape' && selected) {
                  event.preventDefault(); setSelected(null); setLegalMoves([]); setMessage('Selección cancelada.'); return;
                }
                const delta = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[event.key];
                if (delta) {
                  event.preventDefault();
                  const row = rankIndex + delta[0]; const col = fileIndex + delta[1];
                  if (row >= 0 && row < 8 && col >= 0 && col < 8) {
                    focusAfterArrow.current = true; setFocusedSquare(squares[row * 8 + col]);
                  }
                }
              }}
              onClick={() => { setFocusedSquare(square); void activateSquare(square); }}>
              <span className="square-coordinate" aria-hidden="true">{fileIndex === 0 ? square[1] : ''}{rankIndex === 7 ? square[0] : ''}</span>
              {targetMoves.length > 0 && <span className="move-marker" aria-hidden="true" />}
              {piece && <span className={`piece-symbol ${pieceColor}`} aria-hidden="true" style={animation || rookAnimation ? {
                '--from-x': (animation || rookAnimation).x, '--from-y': (animation || rookAnimation).y,
              } : undefined}>{symbols[piece.toLowerCase()]}</span>}
            </button>;
          })}
        </div>
        <PlayerCard player={bottomPlayer} color={myColor} label={myColor === 'white' ? 'Anfitrión · Blancas' : 'Invitado · Negras'} active={game.status === 'playing' && game.turn === myColor} isYou />
      </div>
      <aside className="game-side-panel" aria-label="Información de la partida">
        <div className="your-color"><strong>Juegas con {myColor === 'white' ? 'blancas' : 'negras'}</strong><span>· {session.name}</span></div>
        <h3>Movimientos</h3>
        {game.history.length ? <MoveHistory history={game.history} /> : <p>Aún no hay movimientos.</p>}
        {game.lastMove && <p className="last-move-label">Último movimiento: {game.lastMove.san} ({game.lastMove.from} a {game.lastMove.to})</p>}
        {game.status === 'playing' && <button className="secondary-button resign-button" type="button" disabled={busy} onClick={() => setResignOpen(true)}>Abandonar partida</button>}
      </aside>
    </div>
    <dialog className="game-dialog" ref={promotionDialog} aria-labelledby="promotion-title"
      onCancel={(event) => { event.preventDefault(); setPromotion(null); }}>
      {promotion && <>
        <h3 id="promotion-title">Elige una pieza</h3>
        <p>El peón llegará a {promotion.to}.</p>
        <div className="promotion-options">
          {promotions.map((option) => <button className="secondary-button" key={option.code} type="button" aria-label={option.name} disabled={busy}
            onClick={() => void submitMove(promotion.to, option.code)}>{option.name}</button>)}
        </div>
        <button className="dialog-cancel" type="button" disabled={busy} onClick={() => setPromotion(null)}>Cancelar</button>
      </>}
    </dialog>
    <dialog className="game-dialog" ref={resignDialog} aria-labelledby="resign-title"
      onCancel={(event) => { event.preventDefault(); if (!busy) setResignOpen(false); }}>
      {resignOpen && <>
        <h3 id="resign-title">¿Quieres abandonar?</h3><p>Perderás esta partida.</p>
        <div className="actions">
          <button className="secondary-button" type="button" data-cancel disabled={busy} onClick={() => setResignOpen(false)}>Continuar jugando</button>
          <button className="danger-button" type="button" disabled={busy} onClick={() => void resign()}>{busy ? 'Abandonando…' : 'Abandonar'}</button>
        </div>
      </>}
    </dialog>
  </section>;
}

function PlayerCard({ player, color, label, active, isYou = false }) {
  return <div className={`game-player${active ? ' active-player' : ''}`}>
    <span className={`color-piece ${color}`} aria-hidden="true">{color === 'white' ? '♔' : '♚'}</span>
    <div><strong>{player.name}{isYou ? ' (tú)' : ''}</strong><span>{label}</span></div>
    {active && <strong className="player-turn">{isYou ? 'TU TURNO' : 'TURNO'}</strong>}
  </div>;
}
