import { performance } from 'node:perf_hooks';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { Chess } from 'chess.js';

const searchDepth = 2;
const maxNodes = 5000;
const budgetMs = 300;
const workerTimeoutMs = 2000;
const values = { p: 100, n: 320, b: 330, r: 500, q: 900 };
const mateScore = 1_000_000;

function replay({ fen, history }) {
  if (!Array.isArray(history)) return new Chess(fen);
  const chess = new Chess();
  for (const san of history) chess.move(san);
  return chess;
}

function terminalScore(chess, ply) {
  if (chess.isCheckmate()) return chess.turn() === 'w' ? mateScore - ply : -mateScore + ply;
  if (chess.isStalemate() || chess.isInsufficientMaterial()
    || chess.isThreefoldRepetition() || chess.isDrawByFiftyMoves()) return 0;
  return null;
}

function evaluate(chess) {
  return chess.board().flat().reduce((score, piece) => {
    if (!piece || piece.type === 'k') return score;
    const value = values[piece.type];
    return score + (piece.color === 'b' ? value : -value);
  }, 0);
}

function orderedMoves(chess) {
  return chess.moves({ verbose: true }).sort((a, b) =>
    a.from.localeCompare(b.from) || a.to.localeCompare(b.to) || (a.promotion ?? '').localeCompare(b.promotion ?? ''));
}

export function chooseBotMove(input, { clock = () => performance.now(), nodeLimit = maxNodes, timeLimitMs = budgetMs } = {}) {
  const started = clock();
  const chess = replay(input);
  const legalMoves = orderedMoves(chess);
  const state = { nodes: 0 };
  let bestMove = null;
  let bestScore = -Infinity;
  let limited = false;

  function visit(depth, alpha, beta, ply) {
    state.nodes += 1;
    if (state.nodes > nodeLimit || clock() - started >= timeLimitMs) throw new Error('SEARCH_LIMIT');
    const terminal = terminalScore(chess, ply);
    if (terminal !== null) return terminal;
    if (depth === 0) return evaluate(chess);

    const maximizing = chess.turn() === 'b';
    let score = maximizing ? -Infinity : Infinity;
    for (const move of orderedMoves(chess)) {
      chess.move({ from: move.from, to: move.to, ...(move.promotion ? { promotion: move.promotion } : {}) });
      let child;
      try { child = visit(depth - 1, alpha, beta, ply + 1); }
      finally { chess.undo(); }
      if (maximizing) {
        score = Math.max(score, child);
        alpha = Math.max(alpha, score);
      } else {
        score = Math.min(score, child);
        beta = Math.min(beta, score);
      }
      if (beta <= alpha) break;
    }
    return score;
  }

  for (const move of legalMoves) {
    try {
      chess.move({ from: move.from, to: move.to, ...(move.promotion ? { promotion: move.promotion } : {}) });
      const score = searchDepth === 1 ? (terminalScore(chess, 1) ?? evaluate(chess))
        : visit(searchDepth - 1, bestScore, Infinity, 1);
      if (score > bestScore) {
        bestScore = score;
        bestMove = { from: move.from, to: move.to, ...(move.promotion ? { promotion: move.promotion } : {}) };
      }
    } catch (error) {
      if (error.message !== 'SEARCH_LIMIT') throw error;
      limited = true;
      break;
    } finally {
      chess.undo();
    }
  }

  return {
    move: bestMove ?? (legalMoves[0] ? {
      from: legalMoves[0].from,
      to: legalMoves[0].to,
      ...(legalMoves[0].promotion ? { promotion: legalMoves[0].promotion } : {}),
    } : null),
    nodes: state.nodes,
    elapsedMs: clock() - started,
    limited,
  };
}

export function startBotWorker(history) {
  const worker = new Worker(new URL(import.meta.url), { workerData: { history } });
  let settled = false;
  let timer;
  let rejectPromise;
  const promise = new Promise((resolve, reject) => {
    rejectPromise = reject;
    timer = setTimeout(() => {
      void worker.terminate();
      finish(reject, new Error('BOT_TIMEOUT'));
    }, workerTimeoutMs);
    worker.once('message', (result) => finish(resolve, result));
    worker.once('error', (error) => finish(reject, error));
    worker.once('exit', (code) => {
      if (!settled && code !== 0) finish(reject, new Error('BOT_WORKER_FAILED'));
    });
  });

  function finish(callback, value) {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    callback(value);
  }

  return {
    promise,
    cancel() {
      if (settled) return Promise.resolve();
      const termination = worker.terminate();
      finish(rejectPromise, new Error('BOT_CANCELLED'));
      return termination;
    },
  };
}

if (!isMainThread) {
  try { parentPort.postMessage(chooseBotMove(workerData)); }
  catch { parentPort.postMessage({ move: null, error: 'BOT_SEARCH_FAILED' }); }
  finally { parentPort.close(); }
}
