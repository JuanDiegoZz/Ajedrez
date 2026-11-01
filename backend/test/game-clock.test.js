import test from 'node:test';
import assert from 'node:assert/strict';
import { createGameClock } from '../src/game-clock.js';

function harness() {
  let now = 0;
  const timers = new Map();
  let nextId = 0;
  const clock = createGameClock({
    now: () => now,
    schedule(callback, delay) {
      const id = ++nextId;
      timers.set(id, { callback, deadline: now + delay });
      return id;
    },
    cancel(id) { timers.delete(id); },
  });
  return {
    clock,
    advance(ms) { now += ms; },
    fire(id) { const timer = timers.get(id); timers.delete(id); timer?.callback(); },
    timers,
  };
}

test('charges active side and grants increment only after a legal move', () => {
  const h = harness();
  const expired = [];
  const state = h.clock.create({ whiteMs: 1000, blackMs: 1000, incrementMs: 500, turn: 'white', onTimeout: (color) => expired.push(color) });
  h.advance(300);
  const next = h.clock.completeMove(state, 'white');
  assert.deepEqual(h.clock.snapshot(next), { whiteMs: 1200, blackMs: 1000, runningColor: 'black', phase: 'running' });
  assert.deepEqual(expired, []);
});

test('deadline callback checks current generation and expires at zero', () => {
  const h = harness();
  const expired = [];
  const state = h.clock.create({ whiteMs: 100, blackMs: 100, incrementMs: 0, turn: 'white', onTimeout: (color) => expired.push(color) });
  const [timerId] = h.timers.keys();
  h.advance(150);
  h.fire(timerId);
  assert.deepEqual(expired, ['white']);
  assert.equal(h.clock.snapshot(state).whiteMs, 0);
});

test('a delayed prior-turn callback cannot expire the new player deadline', () => {
  const h = harness();
  const expired = [];
  const state = h.clock.create({ whiteMs: 100, blackMs: 100, onTimeout: (color) => expired.push(color) });
  const [oldTimer] = h.timers.keys();
  h.advance(20);
  h.clock.completeMove(state, 'white');
  h.advance(80);
  h.fire(oldTimer);
  assert.deepEqual(expired, []);
  assert.equal(h.clock.snapshot(state).blackMs, 20);
});

test('pause freezes both clocks, resume reanchors, and finish preserves balances', () => {
  const h = harness();
  const state = h.clock.create({ whiteMs: 100, blackMs: 200 });
  h.advance(25);
  h.clock.pause(state);
  h.advance(1000);
  assert.equal(h.clock.snapshot(state).whiteMs, 75);
  h.clock.resume(state);
  h.advance(10);
  h.clock.finish(state);
  assert.equal(h.clock.snapshot(state).whiteMs, 65);
  assert.equal(h.clock.snapshot(state).blackMs, 200);
});

test('expireIfDue treats exact deadline as timeout', () => {
  const h = harness();
  const expired = [];
  const state = h.clock.create({ whiteMs: 100, blackMs: 100, onTimeout: (color) => expired.push(color) });
  h.advance(100);
  assert.equal(h.clock.expireIfDue(state), true);
  assert.deepEqual(expired, ['white']);
});
