import test from 'node:test';
import assert from 'node:assert/strict';
import { createRecoveryManager } from '../src/recovery.js';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

test('reconnection cancels its pending timeout and emits recovery once', async () => {
  const events = [];
  const recovery = createRecoveryManager({
    graceMs: 30,
    onDisconnect: (...values) => events.push(['disconnected', ...values]),
    onReconnect: (...values) => events.push(['reconnected', ...values]),
    onExpire: (...values) => events.push(['expired', ...values]),
  });
  const deadline = recovery.disconnect('session-a');

  assert.equal(recovery.reconnect('session-a'), true);
  await wait(45);
  assert.deepEqual(events.map(([type]) => type), ['disconnected', 'reconnected']);
  assert.equal(events[1][2], deadline);
  recovery.stop();
});

test('expired sessions fire one timeout and cannot reconnect an expired grace period', async () => {
  const events = [];
  const recovery = createRecoveryManager({ graceMs: 20, onExpire: (...values) => events.push(values) });
  const deadline = recovery.disconnect('session-b');

  await wait(45);
  assert.equal(recovery.reconnect('session-b'), false);
  assert.deepEqual(events, [['session-b', deadline]]);
  recovery.stop();
});

test('stop clears pending recovery timers', async () => {
  const events = [];
  const recovery = createRecoveryManager({ graceMs: 20, onExpire: (...values) => events.push(values) });
  recovery.disconnect('session-c');
  recovery.stop();

  await wait(35);
  assert.deepEqual(events, []);
});
