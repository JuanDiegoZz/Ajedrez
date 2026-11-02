import { useEffect, useRef, useState } from 'react';
import { isLiveConnection, recoverySeconds } from './presence.js';

export default function ConnectionNotice({ game, connection, elapsed }) {
  const other = game.you === 'white' ? 'black' : 'white';
  const presence = game.presence?.[other];
  const live = isLiveConnection(connection);
  const previous = useRef(null);
  const [returned, setReturned] = useState(false);
  useEffect(() => {
    const old = previous.current;
    previous.current = { id: game.id, status: presence?.status, live };
    if (!live || game.status !== 'playing' || old?.id !== game.id) setReturned(false);
    else if (old.live && old.status === 'disconnected' && presence?.status === 'connected') setReturned(true);
    else if (presence?.status === 'disconnected') setReturned(false);
  }, [game.id, game.status, presence?.status, live]);
  useEffect(() => {
    if (!returned) return undefined;
    const timer = setTimeout(() => setReturned(false), 4000);
    return () => clearTimeout(timer);
  }, [returned]);
  if (game.status !== 'playing') return null;
  let title, description, seconds = null;
  if (connection === 'replaced') {
    title = 'El control está en otra pestaña'; description = 'Continúa allí para jugar. Esta pestaña conserva la vista de la partida.';
  } else if (connection === 'connecting') {
    title = 'Conectando a la partida'; description = 'Esperando el estado confirmado del servidor.';
  } else if (!live) {
    title = connection === 'expired' ? 'No se pudo recuperar tu conexión' : 'Se perdió tu conexión';
    description = connection === 'expired' ? 'Recarga para consultar el estado oficial de la partida.' : 'Intentando reconectar… Las jugadas esperan confirmación del servidor.';
  } else if (presence?.status === 'disconnected' && game.mode !== 'bot') {
    title = 'Tu rival perdió la conexión';
    description = 'La partida está pausada mientras esperamos su regreso.';
    seconds = recoverySeconds(presence, game.serverNow, elapsed);
  } else if (game.paused) {
    title = 'La partida sigue en pausa'; description = 'Esperando la confirmación del servidor para continuar.';
  } else if (returned) {
    title = 'Tu rival se ha reconectado'; description = 'La partida puede continuar con el estado confirmado.';
  } else if (connection === 'restored') {
    title = 'Conexión recuperada'; description = 'Recibiendo el estado confirmado de la partida.';
  } else return null;
  return <aside className={`connection-notice${returned ? ' connection-returned' : ''}`}>
    <div role="status" aria-atomic="true"><strong>{title}</strong><p>{description}</p></div>
    {seconds !== null && <p className="recovery-countdown" aria-live="off">{seconds > 0 ? <>Recuperación disponible: <strong>{seconds} s</strong></> : 'Esperando el resultado oficial…'}</p>}
  </aside>;
}
