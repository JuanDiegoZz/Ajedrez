import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

function ServiceStatus({ health }) {
  const backend = health?.backend === 'available' ? 'Disponible' : health ? 'No disponible' : 'Comprobando…';
  const database = health?.database === 'available'
    ? 'Disponible'
    : health?.database === 'unavailable'
      ? 'No disponible'
      : health?.backend === 'unavailable'
        ? 'Sin respuesta del backend'
        : 'Comprobando…';

  return (
    <dl className="service-status" aria-label="Estado de servicios">
      <div><dt>Frontend</dt><dd>Disponible</dd></div>
      <div><dt>Backend</dt><dd>{backend}</dd></div>
      <div><dt>PostgreSQL</dt><dd>{database}</dd></div>
    </dl>
  );
}

function App() {
  const [health, setHealth] = useState(null);
  const [session, setSession] = useState(null);
  const [sessionStatus, setSessionStatus] = useState('loading');
  const [sessionError, setSessionError] = useState('');
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [roomsStatus, setRoomsStatus] = useState('loading');
  const [roomsRetry, setRoomsRetry] = useState(0);

  useEffect(() => {
    let active = true;
    async function checkHealth() {
      try {
        const response = await fetch('/api/health', { cache: 'no-store', signal: AbortSignal.timeout(3000) });
        const result = await response.json();
        if (active) setHealth(result);
      } catch {
        if (active) setHealth({ backend: 'unavailable', database: 'unknown' });
      }
    }

    checkHealth();
    const interval = setInterval(checkHealth, 5000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    let active = true;
    fetch('/api/session', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        return response.json();
      })
      .then((result) => {
        if (!active) return;
        setSession(result);
        setSessionStatus('ready');
      })
      .catch(() => {
        if (!active) return;
        setSessionStatus('ready');
        setSessionError('No se pudo comprobar tu sesión. Escribe tu nombre para volver a entrar.');
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!session) return undefined;
    let active = true;
    setRoomsStatus('loading');
    setSessionError('');
    fetch('/api/rooms', { cache: 'no-store' })
      .then(async (response) => {
        if (response.status === 401) throw new Error('Tu sesión venció. Vuelve a entrar.');
        if (!response.ok) throw new Error('Inténtalo de nuevo en unos momentos.');
        return response.json();
      })
      .then((result) => {
        if (!active) return;
        setRooms(result.rooms);
        setRoomsStatus('ready');
      })
      .catch((error) => {
        if (!active) return;
        setRoomsStatus('error');
        setSessionError(error.message === 'Failed to fetch'
          ? 'No se pudo conectar con el lobby. Comprueba tu conexión e inténtalo de nuevo.'
          : error.message || 'No se pudieron cargar las salas. Inténtalo de nuevo.');
        if (error.message === 'Tu sesión venció. Vuelve a entrar.') {
          setName(session.name);
          setSession(null);
          setSessionStatus('ready');
        }
      });
    return () => { active = false; };
  }, [session, roomsRetry]);

  const cleanName = name.trim();
  const nameLength = Array.from(cleanName).length;
  const nameValid = nameLength >= 2 && nameLength <= 24 && !/[\u0000-\u001f\u007f-\u009f]/u.test(cleanName);

  async function enter(event) {
    event.preventDefault();
    if (!nameValid || submitting) return;

    setSubmitting(true);
    setSessionError('');
    try {
      const response = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: cleanName }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'No se pudo iniciar la sesión. Inténtalo de nuevo.');
      setSession(result);
    } catch (error) {
      setSessionError(error.message === 'Failed to fetch'
        ? 'No se pudo conectar. Comprueba que los servicios estén iniciados e inténtalo de nuevo.'
        : error.message || 'No se pudo iniciar la sesión. Inténtalo de nuevo.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Ajedrez para compartir</p>
          <h1>Ajedrez UX</h1>
        </div>
        <ServiceStatus health={health} />
      </header>

      {sessionStatus === 'loading' && <p className="notice" role="status">Comprobando tu sesión…</p>}

      {sessionStatus === 'ready' && !session && (
        <section className="entry-card" aria-labelledby="entry-title">
          <p className="eyebrow">Bienvenido</p>
          <h2 id="entry-title">¿Cómo quieres llamarte?</h2>
          <p className="description">Usaremos este nombre durante tu sesión de juego.</p>
          <form onSubmit={enter} noValidate>
            <label htmlFor="player-name">Tu nombre</label>
            <input
              id="player-name"
              name="name"
              type="text"
              value={name}
              maxLength={48}
              autoComplete="nickname"
              autoFocus
              aria-describedby={sessionError ? 'name-help session-error' : 'name-help'}
              onChange={(event) => setName(event.target.value)}
            />
            <p id="name-help" className="field-help">Escribe entre 2 y 24 caracteres. Quitaremos espacios al inicio y al final.</p>
            {sessionError && <p id="session-error" className="form-error" role="alert">{sessionError}</p>}
            <button className="primary-button" type="submit" disabled={!nameValid || submitting}>
              {submitting ? 'Entrando…' : 'Entrar'}
            </button>
          </form>
        </section>
      )}

      {sessionStatus === 'ready' && session && (
        <div className="lobby-layout">
          <section className="welcome-panel" aria-labelledby="welcome-title">
            <p className="eyebrow">Lobby</p>
            <h2 id="welcome-title">Hola, {session.name}</h2>
            <p className="description">Esta es tu sesión temporal. Puedes explorar el lobby y ver las salas disponibles.</p>
            <div className="actions">
              <button className="primary-button" type="button" disabled aria-describedby="future-actions">
                Crear sala
              </button>
              <button className="secondary-button" type="button" disabled aria-describedby="future-actions">
                Jugar contra bot
              </button>
            </div>
            <p id="future-actions" className="field-help">Crear salas llegará en la siguiente fase. Las partidas contra bot llegarán más adelante.</p>
          </section>

          <section className="rooms-panel" aria-labelledby="rooms-title">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Encuentra una partida</p>
                <h2 id="rooms-title">Salas disponibles</h2>
              </div>
            </div>
            {roomsStatus === 'loading' && <p className="notice" role="status">Cargando salas…</p>}
            {roomsStatus === 'error' && (
              <div className="empty-state" role="alert">
                <h3>No se pudieron cargar las salas</h3>
                <p>{sessionError}</p>
                <button className="secondary-button" type="button" onClick={() => setRoomsRetry((value) => value + 1)}>
                  Intentar de nuevo
                </button>
              </div>
            )}
            {roomsStatus === 'ready' && rooms.length === 0 && (
              <div className="empty-state">
                <span className="empty-mark" aria-hidden="true">♟</span>
                <h3>Aún no hay salas</h3>
                <p>Cuando haya salas disponibles, aparecerán aquí. Por ahora, puedes volver más tarde.</p>
              </div>
            )}
            {roomsStatus === 'ready' && rooms.length > 0 && (
              <ul className="room-list">
                {rooms.map((room) => <li key={room.id}>{room.name}</li>)}
              </ul>
            )}
          </section>
          {sessionError && roomsStatus !== 'error' && <p className="form-error" role="alert">{sessionError}</p>}
        </div>
      )}

      {health?.backend === 'unavailable' && (
        <p className="service-error" role="alert">No se puede contactar al backend. Comprueba que los servicios estén iniciados e inténtalo de nuevo.</p>
      )}
      {health?.database === 'unavailable' && (
        <p className="service-error" role="alert">El backend responde, pero PostgreSQL no está disponible.</p>
      )}
    </main>
  );
}

createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>);
