import { StrictMode, useEffect, useRef, useState } from 'react';
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
  const [currentRoom, setCurrentRoom] = useState(null);
  const [sessionStatus, setSessionStatus] = useState('loading');
  const [sessionError, setSessionError] = useState('');
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [roomsStatus, setRoomsStatus] = useState('loading');
  const [roomsRetry, setRoomsRetry] = useState(0);
  const [connection, setConnection] = useState('connecting');
  const [roomError, setRoomError] = useState('');
  const [roomMessage, setRoomMessage] = useState('');
  const [roomAction, setRoomAction] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [roomName, setRoomName] = useState('');
  const dialogRef = useRef(null);
  const currentRoomRef = useRef(null);

  function changeCurrentRoom(room) {
    currentRoomRef.current = room;
    setCurrentRoom(room);
  }

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
    return () => { active = false; clearInterval(interval); };
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
        changeCurrentRoom(result?.room ?? null);
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
    let socket;
    let retryTimer;
    setRoomsStatus('loading');
    setRoomError('');

    fetch('/api/rooms', { cache: 'no-store' })
      .then(async (response) => {
        const result = await response.json();
        if (response.status === 401) throw new Error('Tu sesión terminó. Vuelve a entrar.');
        if (!response.ok) throw new Error(result.error?.message || 'No se pudieron cargar las salas.');
        return result;
      })
      .then((result) => {
        if (active) {
          setRooms(result.rooms);
          setRoomsStatus('ready');
        }
      })
      .catch((error) => {
        if (!active) return;
        setRoomsStatus('error');
        setRoomError(error.message === 'Failed to fetch'
          ? 'No se pudo conectar con el lobby. Comprueba tu conexión e inténtalo de nuevo.'
          : error.message);
        if (error.message === 'Tu sesión terminó. Vuelve a entrar.') {
          setName(session.name);
          setSessionError(error.message);
          setSession(null);
          changeCurrentRoom(null);
        }
      });

    function connect() {
      if (!active) return;
      setConnection('connecting');
      socket = new WebSocket(`${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/ws`);
      socket.addEventListener('open', () => socket.send(JSON.stringify({ type: 'lobby:subscribe' })));
      socket.addEventListener('message', (event) => {
        if (!active) return;
        let message;
        try { message = JSON.parse(event.data); } catch { return; }
        if (message.type === 'lobby:state') {
          setRooms(message.rooms);
          setRoomsStatus('ready');
          setConnection('connected');
          setRoomError('');
        } else if (message.type === 'room:state') {
          if (!message.room && currentRoomRef.current) {
            setRoomMessage('La sala dejó de estar disponible. Volviste al lobby.');
          }
          changeCurrentRoom(message.room);
        } else if (message.type === 'error') {
          setRoomError(message.message || 'Se perdió la conexión con el lobby.');
        }
      });
      socket.addEventListener('close', () => {
        if (!active) return;
        setConnection('disconnected');
        retryTimer = setTimeout(connect, 1500);
      });
      socket.addEventListener('error', () => socket.close());
    }

    connect();
    return () => {
      active = false;
      clearTimeout(retryTimer);
      socket?.close();
    };
  }, [session, roomsRetry]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (createOpen && !dialog.open) dialog.showModal();
    if (!createOpen && dialog.open) dialog.close();
  }, [createOpen]);

  const cleanName = name.trim();
  const nameLength = Array.from(cleanName).length;
  const nameValid = nameLength >= 2 && nameLength <= 24 && !/[\u0000-\u001f\u007f-\u009f]/u.test(cleanName);
  const cleanRoomName = roomName.trim();
  const roomNameLength = Array.from(cleanRoomName).length;
  const roomNameValid = roomNameLength >= 2 && roomNameLength <= 40 && !/[\u0000-\u001f\u007f-\u009f]/u.test(cleanRoomName);

  async function enter(event) {
    event.preventDefault();
    if (!nameValid || submitting) return;
    setSubmitting(true);
    setSessionError('');
    try {
      const response = await fetch('/api/session', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: cleanName }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'No se pudo iniciar la sesión. Inténtalo de nuevo.');
      setSession(result);
      changeCurrentRoom(result.room ?? null);
    } catch (error) {
      setSessionError(error.message === 'Failed to fetch'
        ? 'No se pudo conectar. Comprueba que los servicios estén iniciados e inténtalo de nuevo.'
        : error.message || 'No se pudo iniciar la sesión. Inténtalo de nuevo.');
    } finally {
      setSubmitting(false);
    }
  }

  async function roomRequest(path, options, action, successMessage) {
    if (roomAction) return;
    setRoomAction(action);
    setRoomError('');
    setRoomMessage('');
    try {
      const response = await fetch(path, options);
      const result = await response.json();
      if (response.status === 401) {
        setName(session.name);
        setSessionError('Tu sesión terminó. Vuelve a entrar.');
        setSession(null);
        changeCurrentRoom(null);
        throw new Error('Tu sesión terminó. Vuelve a entrar.');
      }
      if (!response.ok) throw new Error(result.error?.message || 'No se pudo completar la acción. Inténtalo de nuevo.');
      changeCurrentRoom(result.room ?? null);
      setRoomMessage(successMessage);
      return true;
    } catch (error) {
      setRoomError(error.message === 'Failed to fetch'
        ? 'No se pudo conectar con el servidor. Comprueba tu conexión e inténtalo de nuevo.'
        : error.message || 'No se pudo completar la acción. Inténtalo de nuevo.');
      return false;
    } finally {
      setRoomAction('');
    }
  }

  async function createRoom(event) {
    event.preventDefault();
    if (!roomNameValid || roomAction) return;
    const created = await roomRequest('/api/rooms', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: cleanRoomName }),
    }, 'create', 'Sala creada.');
    if (created) setCreateOpen(false);
  }

  const connectionText = connection === 'connected'
    ? 'Lobby conectado'
    : connection === 'disconnected'
      ? 'Reconectando al lobby…'
      : 'Conectando al lobby…';

  return (
    <main className="app-shell">
      <header className="app-header">
        <div><p className="eyebrow">Ajedrez para compartir</p><h1>Ajedrez UX</h1></div>
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
            <input id="player-name" name="name" type="text" value={name} maxLength={48} autoComplete="nickname" autoFocus
              aria-describedby={sessionError ? 'name-help session-error' : 'name-help'} onChange={(event) => setName(event.target.value)} />
            <p id="name-help" className="field-help">Escribe entre 2 y 24 caracteres. Quitaremos espacios al inicio y al final.</p>
            {sessionError && <p id="session-error" className="form-error" role="alert">{sessionError}</p>}
            <button className="primary-button" type="submit" disabled={!nameValid || submitting}>
              {submitting ? 'Entrando…' : 'Entrar'}
            </button>
          </form>
        </section>
      )}

      {sessionStatus === 'ready' && session && !currentRoom && (
        <div className="lobby-layout">
          <section className="welcome-panel" aria-labelledby="welcome-title">
            <p className="eyebrow">Lobby</p>
            <h2 id="welcome-title">Hola, {session.name}</h2>
            <p className="description">Crea una sala o únete a alguien que esté esperando.</p>
            {roomMessage && <p className="success-message" role="status">{roomMessage}</p>}
            <div className="actions">
              <button className="primary-button" type="button" disabled={Boolean(roomAction)} onClick={() => {
                setRoomName(`Sala de ${session.name}`);
                setRoomError('');
                setCreateOpen(true);
              }}>Crear sala</button>
              <button className="secondary-button" type="button" disabled aria-describedby="bot-help">Jugar contra bot</button>
            </div>
            <p id="bot-help" className="field-help">Las partidas contra bot llegarán en una fase posterior.</p>
          </section>

          <section className="rooms-panel" aria-labelledby="rooms-title">
            <div className="section-heading">
              <div><p className="eyebrow">Encuentra una partida</p><h2 id="rooms-title">Salas disponibles</h2></div>
              <p className={`connection-status ${connection}`} role="status">{connectionText}</p>
            </div>
            {roomsStatus === 'loading' && <p className="notice" role="status">Cargando salas…</p>}
            {roomsStatus === 'error' && <div className="empty-state" role="alert">
              <h3>No se pudieron cargar las salas</h3><p>{roomError}</p>
              <button className="secondary-button" type="button" onClick={() => setRoomsRetry((value) => value + 1)}>Intentar de nuevo</button>
            </div>}
            {roomsStatus === 'ready' && rooms.length === 0 && <div className="empty-state">
              <span className="empty-mark" aria-hidden="true">♟</span><h3>Aún no hay salas</h3>
              <p>Cuando alguien cree una sala, aparecerá aquí. También puedes crear una para empezar.</p>
              <button className="secondary-button" type="button" disabled={Boolean(roomAction)} onClick={() => {
                setRoomName(`Sala de ${session.name}`);
                setRoomError('');
                setCreateOpen(true);
              }}>Crear sala</button>
            </div>}
            {roomsStatus === 'ready' && rooms.length > 0 && <ul className="room-list">
              {rooms.map((room) => <li className="room-card" key={room.id}>
                <div><h3>{room.name}</h3><p>Anfitrión: {room.hostName}</p><p>{room.players} / 2 jugadores · Esperando jugador</p></div>
                <button className="primary-button" type="button" disabled={Boolean(roomAction)} onClick={() => roomRequest(
                  `/api/rooms/${encodeURIComponent(room.id)}/join`, { method: 'POST' }, 'join', 'Te uniste a la sala.',
                )}>{roomAction === 'join' ? 'Uniéndote…' : 'Unirse'}</button>
              </li>)}
            </ul>}
            {roomError && roomsStatus !== 'error' && <p className="form-error" role="alert">{roomError}</p>}
          </section>
        </div>
      )}

      {sessionStatus === 'ready' && session && currentRoom && (
        <section className="room-view" aria-labelledby="room-title">
          <p className="eyebrow">Sala</p>
          <h2 id="room-title">{currentRoom.name}</h2>
          <p className="connection-status">{currentRoom.status === 'waiting' ? 'Esperando jugador' : 'Sala lista'}</p>
          <h3>Jugadores</h3>
          <ol className="player-list">
            <li><strong>{currentRoom.hostName}</strong><span>Anfitrión · Blancas</span></li>
            {currentRoom.guestName
              ? <li><strong>{currentRoom.guestName}</strong><span>Invitado · Negras</span></li>
              : <li className="player-slot"><strong>Esperando otro jugador…</strong><span>Plaza 2 de 2</span></li>}
          </ol>
          {currentRoom.status === 'ready' && <p className="description">La partida está lista. El tablero estará disponible en la siguiente fase.</p>}
          {roomMessage && <p className="success-message" role="status">{roomMessage}</p>}
          {roomError && <p className="form-error" role="alert">{roomError}</p>}
          <div className="actions">
            {currentRoom.status === 'waiting'
              ? <button className="secondary-button" type="button" disabled={Boolean(roomAction)} onClick={() => roomRequest(
                `/api/rooms/${encodeURIComponent(currentRoom.id)}`, { method: 'DELETE' }, 'leave', 'Sala cancelada.',
              )}>{roomAction === 'leave' ? 'Cancelando…' : 'Cancelar sala'}</button>
              : <button className="secondary-button" type="button" disabled={Boolean(roomAction)} onClick={() => roomRequest(
                `/api/rooms/${encodeURIComponent(currentRoom.id)}/leave`, { method: 'POST' }, 'leave', 'Saliste de la sala.',
              )}>{roomAction === 'leave' ? 'Saliendo…' : 'Salir de la sala'}</button>}
          </div>
        </section>
      )}

      {createOpen && <dialog className="create-dialog" ref={dialogRef} aria-labelledby="create-title"
        onCancel={(event) => { event.preventDefault(); if (!roomAction) setCreateOpen(false); }}>
        <form onSubmit={createRoom} noValidate>
          <p className="eyebrow">Nueva sala</p><h2 id="create-title">Crear sala</h2>
          <label htmlFor="room-name">Nombre de la sala</label>
          <input id="room-name" name="roomName" value={roomName} maxLength={48} autoFocus aria-describedby="room-name-help" onChange={(event) => setRoomName(event.target.value)} />
          <p id="room-name-help" className="field-help">Escribe entre 2 y 40 caracteres.</p>
          {roomError && <p className="form-error" role="alert">{roomError}</p>}
          <div className="actions">
            <button className="secondary-button" type="button" disabled={Boolean(roomAction)} onClick={() => setCreateOpen(false)}>Cancelar</button>
            <button className="primary-button" type="submit" disabled={!roomNameValid || Boolean(roomAction)}>
              {roomAction === 'create' ? 'Creando…' : 'Crear sala'}
            </button>
          </div>
        </form>
      </dialog>}

      {health?.backend === 'unavailable' && <p className="service-error" role="alert">No se puede contactar al backend. Comprueba que los servicios estén iniciados e inténtalo de nuevo.</p>}
      {health?.database === 'unavailable' && <p className="service-error" role="alert">El backend responde, pero PostgreSQL no está disponible.</p>}
    </main>
  );
}

createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>);
