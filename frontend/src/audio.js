export const effects = ['move', 'capture', 'check', 'castle', 'promotion', 'win', 'loss', 'draw', 'low'];
export function readAudio(storage) {
  try {
    storage ??= globalThis.localStorage;
    const p = JSON.parse(storage.getItem('ajedrez_preferences_v1') || '{}');
    return { enabled: typeof p.soundEnabled === 'boolean' ? p.soundEnabled : true,
      volume: typeof p.soundVolume === 'number' && Number.isFinite(p.soundVolume) ? Math.max(0, Math.min(1, p.soundVolume)) : .25 };
  } catch { return { enabled: true, volume: .25 }; }
}
export function savePreference(changes, storage) {
  try {
    storage ??= globalThis.localStorage;
    let previous;
    try { previous = JSON.parse(storage.getItem('ajedrez_preferences_v1') || '{}'); } catch { previous = {}; }
    storage.setItem('ajedrez_preferences_v1', JSON.stringify({ ...(previous && typeof previous === 'object' ? previous : {}), ...changes }));
  } catch { /* Local preferences still work for this page. */ }
}

export function createAudio(createContext = () => new (window.AudioContext || window.webkitAudioContext)(), load = globalThis.fetch) {
  let context, gain, loading, source, settings = { enabled: true, volume: .25 };
  const buffers = new Map();
  function stop() {
    if (!source) return;
    const voice = source; source = null;
    try {
      const at = context.currentTime;
      voice.envelope.gain.cancelScheduledValues(at);
      voice.envelope.gain.setValueAtTime(voice.envelope.gain.value, at);
      voice.envelope.gain.linearRampToValueAtTime(0, at + .005);
      voice.node.stop(at + .005);
    } catch { voice.node.disconnect(); voice.envelope.disconnect(); }
  }
  return {
    configure(next) {
      settings = next;
      if (gain) gain.gain.setTargetAtTime(next.volume, context.currentTime, .005);
      if (!next.enabled || !next.volume) stop();
    },
    stop,
    async unlock() {
      try {
        if (!context) { context = createContext(); gain = context.createGain(); gain.gain.value = settings.volume; gain.connect(context.destination); }
        if (context.state === 'suspended') await context.resume();
        if (!loading) loading = Promise.all(effects.map(async name => {
          try { const response = await load(`/assets/audio/${name}.wav`); if (!response.ok) return;
            buffers.set(name, await context.decodeAudioData(await response.arrayBuffer()));
          } catch { /* A missing effect never blocks the game. */ }
        }));
        await loading;
      } catch { /* Autoplay or unavailable Web Audio: no queued playback. */ }
    },
    play(name) {
      if (!settings.enabled || !settings.volume || context?.state !== 'running' || !buffers.has(name)) return false;
      try {
        stop(); const node = context.createBufferSource(); const envelope = context.createGain();
        node.buffer = buffers.get(name); node.connect(envelope); envelope.connect(gain);
        const voice = { node, envelope }; source = voice;
        node.onended = () => { node.disconnect(); envelope.disconnect(); if (source === voice) source = null; };
        node.start(); return true;
      } catch { stop(); return false; }
    },
  };
}
export const audio = createAudio();

// Advance the reference even when inaudible. Never replay missed history.
export function createGameSignals() {
  let previous = null, lastRemaining = null, warned = false;
  return {
    reset() { previous = null; lastRemaining = null; warned = false; },
    snapshot(game, audible) {
      const old = previous;
      if (old?.id === game.id && game.revision < old.revision) return null;
      previous = game;
      if (!audible || !old || old.id !== game.id) return null;
      if (game.revision <= old.revision) return null;
      if (game.status === 'finished' && old.status !== 'finished') {
        if (!game.result || game.result.reason === 'interrupted') return null;
        return game.result.winner ? (game.result.winner === game.you ? 'win' : 'loss') : 'draw';
      }
      if (old.paused || game.paused) return null;
      if (game.moves?.length !== (old.moves?.length ?? 0) + 1) return null;
      const m = game.lastMove;
      return m ? m.check ? 'check' : m.promotion ? 'promotion' : m.castling ? 'castle' : m.capture ? 'capture' : 'move' : null;
    },
    clock(remaining, active) {
      if (!active) { lastRemaining = null; warned = false; return null; }
      const crossed = !warned && lastRemaining > 10000 && remaining <= 10000 && remaining > 0;
      lastRemaining = remaining;
      if (crossed) { warned = true; return 'low'; }
      return null;
    },
  };
}
