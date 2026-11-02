import { useEffect, useRef } from 'react';
import { audio, createGameSignals } from './audio.js';

export default function useGameAudio(game, connection, localNow) {
  const signals = useRef(createGameSignals());
  const sample = useRef({ clock: null, at: 0 });
  const visible = useRef(!document.hidden);
  useEffect(() => {
    const visibility = () => { visible.current = !document.hidden; signals.current.reset(); audio.stop(); };
    document.addEventListener('visibilitychange', visibility);
    return () => { document.removeEventListener('visibilitychange', visibility); audio.stop(); };
  }, []);
  useEffect(() => { signals.current.reset(); audio.stop(); }, [game.id, connection]);
  useEffect(() => {
    if (sample.current.clock !== game.clock) sample.current = { clock: game.clock, at: performance.now() };
    const allowed = visible.current && (connection === 'connected' || connection === 'restored');
    const effect = signals.current.snapshot(game, allowed);
    if (effect) audio.play(effect);
  }, [game, connection]);
  useEffect(() => {
    const active = visible.current && (connection === 'connected' || connection === 'restored') && !game.paused && game.status === 'playing'
      && game.clock?.phase === 'running' && game.turn === game.you;
    const remaining = game.clock?.[game.you === 'white' ? 'whiteMs' : 'blackMs'] - Math.max(0, localNow - sample.current.at);
    const effect = signals.current.clock(remaining, active);
    if (effect) audio.play(effect);
  }, [game, connection, localNow]);
}
