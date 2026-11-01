import { performance } from 'node:perf_hooks';

export const timeControls = Object.freeze({
  '3+0': Object.freeze({ initialMs: 180_000, incrementMs: 0 }),
  '5+0': Object.freeze({ initialMs: 300_000, incrementMs: 0 }),
  '10+5': Object.freeze({ initialMs: 600_000, incrementMs: 5_000 }),
  unlimited: Object.freeze({ initialMs: null, incrementMs: 0 }),
});

export function normalizeTimeControl(id) {
  const controlId = id ?? 'unlimited';
  const control = timeControls[controlId];
  if (!control) throw new TypeError('Invalid time control');
  return { id: controlId, ...control };
}

export function createGameClock({
  now = () => performance.now(),
  schedule = (callback, delay) => setTimeout(callback, delay),
  cancel = (timer) => clearTimeout(timer),
} = {}) {
  function snapshot(state, at = now()) {
    const remaining = { ...state.remaining };
    if (state.phase === 'running' && state.runningColor) {
      remaining[state.runningColor] = Math.max(0, remaining[state.runningColor] - Math.max(0, at - state.anchor));
    }
    return {
      whiteMs: remaining.white === null ? null : Math.floor(remaining.white),
      blackMs: remaining.black === null ? null : Math.floor(remaining.black),
      runningColor: state.runningColor,
      phase: state.phase,
    };
  }

  function clearTimer(state) {
    if (state.timer !== null) cancel(state.timer);
    state.timer = null;
    state.generation += 1;
  }

  function finishTimeout(state, generation) {
    if (state.phase !== 'running' || generation !== state.generation) return false;
    const at = now();
    if (at < state.deadline) {
      scheduleTimeout(state);
      return false;
    }
    state.remaining[state.runningColor] = 0;
    state.phase = 'finished';
    state.runningColor = null;
    state.anchor = null;
    clearTimer(state);
    state.onTimeout(state.flaggedColor);
    return true;
  }

  function scheduleTimeout(state) {
    if (state.phase !== 'running' || state.remaining[state.runningColor] === null) return;
    const generation = ++state.generation;
    state.deadline = state.anchor + state.remaining[state.runningColor];
    state.timer = schedule(() => finishTimeout(state, generation), Math.max(0, state.deadline - now()));
    state.timer?.unref?.();
  }

  function create({ whiteMs, blackMs, incrementMs = 0, turn = 'white', onTimeout = () => {}, onSchedule = schedule, onCancel = cancel }) {
    const at = now();
    const state = {
      remaining: { white: whiteMs, black: blackMs }, incrementMs,
      runningColor: turn, flaggedColor: turn, anchor: at, deadline: null,
      phase: 'running', generation: 0, timer: null, onTimeout, onSchedule, onCancel,
    };
    scheduleTimeout(state);
    return state;
  }

  function completeMove(state, color, at = now()) {
    if (state.phase !== 'running' || state.runningColor !== color) return null;
    if (state.remaining[color] !== null) {
      const remaining = state.remaining[color] - Math.max(0, at - state.anchor);
      if (remaining <= 0) {
        finishTimeout(state, state.generation);
        return null;
      }
      state.remaining[color] = remaining + state.incrementMs;
    }
    clearTimer(state);
    state.runningColor = color === 'white' ? 'black' : 'white';
    state.flaggedColor = state.runningColor;
    state.anchor = at;
    scheduleTimeout(state);
    return state;
  }

  function pause(state) {
    if (state.phase !== 'running') return false;
    const values = snapshot(state);
    state.remaining = { white: values.whiteMs, black: values.blackMs };
    clearTimer(state);
    state.phase = 'paused';
    state.anchor = null;
    return true;
  }

  function resume(state) {
    if (state.phase !== 'paused') return false;
    state.phase = 'running';
    state.anchor = now();
    scheduleTimeout(state);
    return true;
  }

  function finish(state) {
    if (state.phase === 'finished') return false;
    const values = snapshot(state);
    state.remaining = { white: values.whiteMs, black: values.blackMs };
    clearTimer(state);
    state.phase = 'finished';
    state.runningColor = null;
    state.anchor = null;
    return true;
  }

  function expireIfDue(state, at = now()) {
    if (state?.phase !== 'running' || state.remaining[state.runningColor] === null
      || at < state.anchor + state.remaining[state.runningColor]) return false;
    return finishTimeout(state, state.generation);
  }

  return { create, snapshot, completeMove, expireIfDue, pause, resume, finish, now };
}
