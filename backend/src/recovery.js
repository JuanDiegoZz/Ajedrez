export const reconnectGraceMs = 60_000;

export function createRecoveryManager({
  graceMs = reconnectGraceMs,
  onDisconnect = () => {},
  onReconnect = () => {},
  onExpire = () => {},
  graceForSession = () => graceMs,
} = {}) {
  const pending = new Map();

  function disconnect(sessionId) {
    const existing = pending.get(sessionId);
    if (existing) return existing.deadline;

    const allowance = Math.max(0, Math.min(graceMs, graceForSession(sessionId)));
    const deadline = Date.now() + allowance;
    const timer = setTimeout(() => {
      if (pending.get(sessionId)?.timer !== timer) return;
      pending.delete(sessionId);
      onExpire(sessionId, deadline);
    }, allowance);
    timer.unref?.();
    pending.set(sessionId, { deadline, timer, allowance });
    onDisconnect(sessionId, deadline, allowance);
    return deadline;
  }

  function reconnect(sessionId) {
    const entry = pending.get(sessionId);
    if (!entry) return false;
    if (Date.now() >= entry.deadline) {
      clearTimeout(entry.timer);
      pending.delete(sessionId);
      onExpire(sessionId, entry.deadline);
      return false;
    }
    clearTimeout(entry.timer);
    pending.delete(sessionId);
    onReconnect(sessionId, entry.deadline, Math.max(0, entry.allowance - Math.max(0, entry.deadline - Date.now())));
    return true;
  }

  function cancel(sessionId) {
    const entry = pending.get(sessionId);
    if (!entry) return false;
    clearTimeout(entry.timer);
    pending.delete(sessionId);
    return true;
  }

  function stop() {
    for (const { timer } of pending.values()) clearTimeout(timer);
    pending.clear();
  }

  return { disconnect, reconnect, cancel, stop };
}
