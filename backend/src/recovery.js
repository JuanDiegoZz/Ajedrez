export const reconnectGraceMs = 60_000;

export function createRecoveryManager({
  graceMs = reconnectGraceMs,
  onDisconnect = () => {},
  onReconnect = () => {},
  onExpire = () => {},
} = {}) {
  const pending = new Map();

  function disconnect(sessionId) {
    const existing = pending.get(sessionId);
    if (existing) return existing.deadline;

    const deadline = Date.now() + graceMs;
    const timer = setTimeout(() => {
      if (pending.get(sessionId)?.timer !== timer) return;
      pending.delete(sessionId);
      onExpire(sessionId, deadline);
    }, graceMs);
    timer.unref?.();
    pending.set(sessionId, { deadline, timer });
    onDisconnect(sessionId, deadline);
    return deadline;
  }

  function reconnect(sessionId) {
    const entry = pending.get(sessionId);
    if (!entry) return false;
    clearTimeout(entry.timer);
    pending.delete(sessionId);
    onReconnect(sessionId, entry.deadline);
    return true;
  }

  function stop() {
    for (const { timer } of pending.values()) clearTimeout(timer);
    pending.clear();
  }

  return { disconnect, reconnect, stop };
}
