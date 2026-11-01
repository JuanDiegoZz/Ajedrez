import { StrictMode, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import GameScreen from './GameScreen.jsx';
import Piece from './Piece.jsx';
import ProfileDialog from './ProfileDialog.jsx';
import LogoutDialog from './LogoutDialog.jsx';
import { Avatar, AvatarPicker } from './Avatar.jsx';
import './styles.css';

function readCoordinatesPreference() {
  try {
    const saved = JSON.parse(localStorage.getItem('ajedrez_preferences_v1') || '{}');
    return typeof saved.coordinates === 'boolean' ? saved.coordinates : true;
  } catch { return true; }
}

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
  const [theme, setTheme] = useState(() => {
    let saved;
    try { saved = window.localStorage.getItem('ajedrez_theme'); } catch { saved = null; }
    return saved === 'light' || saved === 'dark'
      ? saved
      : window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  const [health, setHealth] = useState(null);
  const [session, setSession] = useState(null);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [currentGame, setCurrentGame] = useState(null);
  const [sessionStatus, setSessionStatus] = useState('loading');
  const [sessionError, setSessionError] = useState('');
  const [name, setName] = useState('');
  const [entryAvatar, setEntryAvatar] = useState('club');
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
  const [roomTimeControl, setRoomTimeControl] = useState('5+0');
  const [botTimeControl, setBotTimeControl] = useState('5+0');
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');
  const [logoutConfirm, setLogoutConfirm] = useState(false);
  const [logoutBusy, setLogoutBusy] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const [coordinates, setCoordinates] = useState(readCoordinatesPreference);
  const dialogRef = useRef(null);
  const profileOpenerRef = useRef(null);
  const createOpenerRef = useRef(null);
  const currentRoomRef = useRef(null);
  const currentGameRef = useRef(null);
  const socketRef = useRef(null);
  const gameSubscriptionRef = useRef({ socket: null, id: null });
  const sessionRef = useRef(session);
  const identityEpochRef = useRef(0);
  sessionRef.current = session;

  function invalidateIdentity(message, clearName = true) {
    identityEpochRef.current += 1;
    setName(clearName ? '' : sessionRef.current?.name ?? '');
    setEntryAvatar('club');
    setSessionError(message);
    currentRoomRef.current = null;
    currentGameRef.current = null;
    setSession(null);
    setCurrentRoom(null);
    setCurrentGame(null);
    setRoomAction('');
    setCreateOpen(false);
    setProfileBusy(false);
    setLogoutBusy(false);
    setProfileOpen(false);
    setLogoutConfirm(false);
    setLogoutError('');
    setSubmitting(false);
    setSessionStatus('ready');
  }

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' }));
    return () => cancelAnimationFrame(frame);
  }, [Boolean(session), currentRoom?.id, currentGame?.id]);

  function toggleTheme() {
    const next = theme === 'light' ? 'dark' : 'light';
    try { window.localStorage.setItem('ajedrez_theme', next); } catch { /* Theme remains available until reload. */ }
    setTheme(next);
  }

  function setCoordinatePreference(value) {
    setCoordinates(value);
    try { localStorage.setItem('ajedrez_preferences_v1', JSON.stringify({ coordinates: value })); } catch { /* Preferences remain usable without storage. */ }
  }

  useEffect(() => {
    function syncCoordinates(event) {
      if (event.key === 'ajedrez_preferences_v1') setCoordinates(readCoordinatesPreference());
      if (event.key === 'ajedrez_theme' && (event.newValue === 'light' || event.newValue === 'dark')) setTheme(event.newValue);
    }
    window.addEventListener('storage', syncCoordinates);
    return () => window.removeEventListener('storage', syncCoordinates);
  }, []);

  async function saveProfile(changes) {
    const epoch = identityEpochRef.current;
    setProfileBusy(true);
    try {
      const response = await fetch('/api/session', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...changes, expectedProfileVersion: session.profileVersion ?? 0 }) });
      const result = await response.json();
      if (epoch !== identityEpochRef.current) return;
      if (!response.ok) throw new Error(result.error?.message || 'No se pudo guardar el perfil.');
      setSession((current) => ({ ...current, ...result.profile }));
      try { const channel = new BroadcastChannel('ajedrez-session'); channel.postMessage({ type: 'profile', profile: result.profile }); channel.close(); } catch { /* Server remains authoritative. */ }
      if (result.room) changeCurrentRoom(result.room);
      setProfileMessage('Perfil actualizado.');
      setProfileOpen(false);
    } finally { if (epoch === identityEpochRef.current) setProfileBusy(false); }
  }

  async function logout(abandonActiveGame = false) {
    const epoch = identityEpochRef.current;
    const response = await fetch('/api/session', { method: 'DELETE', headers: abandonActiveGame ? { 'Content-Type': 'application/json' } : {}, ...(abandonActiveGame ? { body: JSON.stringify({ abandonActiveGame: true }) } : {}) });
    const result = await response.json();
    if (epoch !== identityEpochRef.current) return;
    if (!response.ok) { const error = new Error(result.error?.message || 'No se pudo cerrar la sesión.'); error.code = result.error?.code; throw error; }
    identityEpochRef.current += 1;
    try { const channel = new BroadcastChannel('ajedrez-session'); channel.postMessage({ type: 'logout' }); channel.close(); } catch { /* Server revocation remains authoritative. */ }
    setName(''); setEntryAvatar('club');
    currentRoomRef.current = null; currentGameRef.current = null;
    setCurrentRoom(null); setCurrentGame(null); setSession(null); setProfileOpen(false); setLogoutConfirm(false); setRoomAction(''); setProfileBusy(false); setLogoutBusy(false);
  }

  async function requestLogout() {
    const epoch = identityEpochRef.current;
    setLogoutError('');
    if (currentGame?.status === 'playing') { setLogoutConfirm(true); return; }
    setLogoutBusy(true);
    try { await logout(); }
    catch (error) {
      if (epoch !== identityEpochRef.current) return;
      if (error.code === 'ACTIVE_GAME_CONFIRMATION_REQUIRED') setLogoutConfirm(true);
      else setLogoutError(error.message || 'No se pudo cerrar la sesión.');
    } finally { if (epoch === identityEpochRef.current) setLogoutBusy(false); }
  }

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const channel = new BroadcastChannel('ajedrez-session');
    channel.onmessage = (event) => {
      if (event.data?.type === 'logout') invalidateIdentity('La sesión se cerró en otra pestaña.');
      if (event.data?.type === 'profile' && Number.isSafeInteger(event.data.profile?.profileVersion)) setSession((current) => current && event.data.profile.profileVersion > current.profileVersion ? { ...current, ...event.data.profile } : current);
    };
    return () => channel.close();
  }, []);

  function changeCurrentRoom(room) {
    currentRoomRef.current = room;
    setCurrentRoom(room);
  }

  function changeCurrentGame(game) {
    const known = currentGameRef.current;
    if (game && known?.id === game.id && (game.stateVersion ?? game.revision) < (known.stateVersion ?? known.revision)) return;
    if (game && known?.id === game.id && (game.stateVersion ?? game.revision) === (known.stateVersion ?? known.revision)
      && (game.clock?.sampledAt ?? 0) < (known.clock?.sampledAt ?? 0)) return;
    // HTTP can arrive after WebSocket has already confirmed the archive.
    if (game && known?.id === game.id && known.revision === game.revision
      && known.archiveStatus === 'saved' && game.archiveStatus === 'pending') return;
    currentGameRef.current = game;
    setCurrentGame(game);
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
    const epoch = identityEpochRef.current;
    fetch('/api/session', { cache: 'no-store' })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'No se pudo comprobar tu sesión. Escribe tu nombre para volver a entrar.');
        return result;
      })
      .then((result) => {
        if (!active || epoch !== identityEpochRef.current) return;
        identityEpochRef.current += 1;
        setSession(result);
        changeCurrentRoom(result?.room ?? null);
        changeCurrentGame(result?.game ?? null);
        setSessionStatus('ready');
      })
      .catch((error) => {
        if (!active || epoch !== identityEpochRef.current) return;
        setSessionStatus('ready');
        setSessionError(error.message || 'No se pudo comprobar tu sesión. Escribe tu nombre para volver a entrar.');
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!session) return undefined;
    let active = true;
    let socket;
    let retryTimer;
    let connectionNoticeTimer;
    let retryStartedAt = null;
    let retryAttempt = 0;
    const retryDelays = [1000, 2000, 5000];
    const clientRecoveryWindowMs = 80_000;
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
          setName(sessionRef.current?.name ?? '');
          setSessionError(error.message);
          setSession(null);
          changeCurrentRoom(null);
          changeCurrentGame(null);
        }
      });

    function subscribeToGame(gameId, force = false) {
      if (!gameId || socket?.readyState !== WebSocket.OPEN) return;
      if (!force && gameSubscriptionRef.current.socket === socket && gameSubscriptionRef.current.id === gameId) return;
      gameSubscriptionRef.current = { socket, id: gameId };
      socket.send(JSON.stringify({ type: 'game:subscribe', gameId }));
    }

    function endSession(message, clearIdentity = false) {
      if (!active) return;
      invalidateIdentity(message, clearIdentity);
      changeCurrentRoom(null);
      changeCurrentGame(null);
    }

    async function verifySession() {
      try {
        const response = await fetch('/api/session', { cache: 'no-store' });
        const result = await response.json();
        if (response.status === 410) endSession(result.error);
        else if (response.ok && !result) endSession('Tu sesión ya no está disponible. Vuelve a entrar; la partida no puede recuperarse.');
      } catch { /* The next retry will check the server again. */ }
    }

    function connect() {
      if (!active) return;
      setConnection('connecting');
      socket = new WebSocket(`${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/ws`);
      socketRef.current = socket;
      socket.addEventListener('open', () => {
        socket.send(JSON.stringify({ type: 'lobby:subscribe' }));
        subscribeToGame(currentRoomRef.current?.gameId ?? currentGameRef.current?.id);
      });
      socket.addEventListener('message', (event) => {
        if (!active) return;
        let message;
        try { message = JSON.parse(event.data); } catch { return; }
        if (message.type === 'lobby:state') {
          setRooms(message.rooms);
          setRoomsStatus('ready');
          if (retryStartedAt !== null) {
            retryStartedAt = null;
            retryAttempt = 0;
            setConnection('restored');
            clearTimeout(connectionNoticeTimer);
            connectionNoticeTimer = setTimeout(() => setConnection('connected'), 3000);
          } else {
            setConnection('connected');
          }
          setRoomError('');
        } else if (message.type === 'room:state') {
          if (!message.room && currentRoomRef.current) {
            setRoomMessage('La sala dejó de estar disponible. Volviste al lobby.');
          }
          changeCurrentRoom(message.room);
          subscribeToGame(message.room?.gameId);
        } else if (message.type === 'game:state') {
          const known = currentGameRef.current;
          if ((message.game.mode === 'bot' && currentGameRef.current?.id === message.game.id)
            || currentRoomRef.current?.gameId === message.game.id) {
            const nextVersion = message.game.stateVersion ?? message.game.revision;
            const currentVersion = known?.stateVersion ?? known?.revision;
            if (!known || known.id !== message.game.id || nextVersion > currentVersion
              || (nextVersion === currentVersion && (message.game.clock?.sampledAt > (known.clock?.sampledAt ?? 0)
                || message.game.archiveStatus !== known.archiveStatus
                || message.game.paused !== known.paused
                || message.game.botThinking !== known.botThinking || message.game.botError !== known.botError
                || message.game.presence?.white?.status !== known.presence?.white?.status
                || message.game.presence?.black?.status !== known.presence?.black?.status))) {
              changeCurrentGame(message.game);
            }
          }
        } else if (message.type === 'error') {
          setRoomError(message.message || 'Se perdió la conexión con el lobby.');
        } else if (message.type === 'session:replaced') {
          setConnection('replaced');
        } else if (message.type === 'session:state') {
          setSession((current) => current && message.profile?.profileVersion > current.profileVersion ? { ...current, ...message.profile } : current);
        } else if (message.type === 'session:revoked') {
          endSession('Tu sesión se cerró en otra pestaña. Vuelve a entrar.', true);
        } else if (message.type === 'recovery:expired') {
          setRoomMessage(message.message);
        }
      });
      socket.addEventListener('close', (event) => {
        if (!active) return;
        if (socketRef.current === socket) socketRef.current = null;
        if (gameSubscriptionRef.current.socket === socket) gameSubscriptionRef.current = { socket: null, id: null };
        if (event.code === 4001) {
          setConnection('replaced');
          return;
        }
        if (retryStartedAt === null) retryStartedAt = Date.now();
        setConnection('disconnected');
        void verifySession();
        const elapsed = Date.now() - retryStartedAt;
        if (elapsed >= clientRecoveryWindowMs) {
          setConnection('expired');
          return;
        }
        const delay = retryDelays[Math.min(retryAttempt, retryDelays.length - 1)];
        retryAttempt += 1;
        retryTimer = setTimeout(connect, Math.min(delay, clientRecoveryWindowMs - elapsed));
      });
      socket.addEventListener('error', () => socket.close());
    }

    connect();
    function onVisible() {
      if (document.visibilityState === 'visible') {
        subscribeToGame(currentRoomRef.current?.gameId ?? currentGameRef.current?.id, true);
      }
    }
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      active = false;
      document.removeEventListener('visibilitychange', onVisible);
      clearTimeout(retryTimer);
      clearTimeout(connectionNoticeTimer);
      if (socketRef.current === socket) socketRef.current = null;
      socket?.close();
    };
    }, [Boolean(session), roomsRetry]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      if (!createOpen && createOpenerRef.current?.isConnected) createOpenerRef.current.focus();
      if (!createOpen) createOpenerRef.current = null;
      return;
    }
    if (createOpen && !dialog.open) dialog.showModal();
    if (!createOpen && dialog.open) dialog.close();
  }, [createOpen]);

  useEffect(() => {
    if (!profileOpen && profileOpenerRef.current) {
      if (profileOpenerRef.current.isConnected) profileOpenerRef.current.focus();
      profileOpenerRef.current = null;
    }
  }, [profileOpen]);

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
    const epoch = identityEpochRef.current;
    try {
      const response = await fetch('/api/session', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: cleanName, avatarId: entryAvatar }),
      });
      const result = await response.json();
      if (epoch !== identityEpochRef.current) return;
      if (!response.ok) throw new Error(result.error || 'No se pudo iniciar la sesión. Inténtalo de nuevo.');
      identityEpochRef.current += 1;
      setSubmitting(false);
      setSession(result);
      window.scrollTo(0, 0);
      changeCurrentRoom(result.room ?? null);
      changeCurrentGame(result.game ?? null);
    } catch (error) {
      if (epoch !== identityEpochRef.current) return;
      setSessionError(error.message === 'Failed to fetch'
        ? 'No se pudo conectar. Comprueba que los servicios estén iniciados e inténtalo de nuevo.'
        : error.message || 'No se pudo iniciar la sesión. Inténtalo de nuevo.');
    } finally {
      if (epoch === identityEpochRef.current) setSubmitting(false);
    }
  }

  async function roomRequest(path, options, action, successMessage) {
    if (roomAction) return;
    const epoch = identityEpochRef.current;
    setRoomAction(action);
    setRoomError('');
    setRoomMessage('');
    try {
      const response = await fetch(path, options);
      const result = await response.json();
      if (epoch !== identityEpochRef.current) return false;
      if (response.status === 401) {
        invalidateIdentity('Tu sesión terminó. Vuelve a entrar.', false);
        changeCurrentRoom(null);
        changeCurrentGame(null);
        throw new Error('Tu sesión terminó. Vuelve a entrar.');
      }
      if (!response.ok) throw new Error(result.error?.message || 'No se pudo completar la acción. Inténtalo de nuevo.');
      changeCurrentRoom(result.room ?? null);
      if (result.game) changeCurrentGame(result.game);
      else if (!result.room) changeCurrentGame(null);
      setRoomMessage(successMessage);
      return true;
    } catch (error) {
      if (epoch !== identityEpochRef.current) return false;
      setRoomError(error.message === 'Failed to fetch'
        ? 'No se pudo conectar con el servidor. Comprueba tu conexión e inténtalo de nuevo.'
        : error.message || 'No se pudo completar la acción. Inténtalo de nuevo.');
      return false;
    } finally {
      if (epoch === identityEpochRef.current) setRoomAction('');
    }
  }

  async function createRoom(event) {
    event.preventDefault();
    if (!roomNameValid || roomAction) return;
    const created = await roomRequest('/api/rooms', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: cleanRoomName, timeControl: roomTimeControl }),
    }, 'create', 'Sala creada.');
    if (created) setCreateOpen(false);
  }

  async function startBotGame() {
    if (roomAction) return;
    const epoch = identityEpochRef.current;
    setRoomAction('bot');
    setRoomError('');
    setRoomMessage('');
    try {
      const response = await fetch('/api/games/bot', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ timeControl: botTimeControl }),
      });
      const result = await response.json();
      if (epoch !== identityEpochRef.current) return false;
      if (!response.ok) throw new Error(result.error?.message || 'No se pudo iniciar la partida contra bot.');
      changeCurrentRoom(null);
      changeCurrentGame(result.game);
      const socket = socketRef.current;
      if (socket?.readyState === WebSocket.OPEN && gameSubscriptionRef.current.id !== result.game.id) {
        gameSubscriptionRef.current = { socket, id: result.game.id };
        socket.send(JSON.stringify({ type: 'game:subscribe', gameId: result.game.id }));
      }
      return true;
    } catch (error) {
      if (epoch !== identityEpochRef.current) return false;
      setRoomError(error.message === 'Failed to fetch'
        ? 'No se pudo conectar con el servidor. Comprueba tu conexión e inténtalo de nuevo.'
        : error.message || 'No se pudo iniciar la partida. Inténtalo de nuevo.');
      return false;
    } finally {
      if (epoch === identityEpochRef.current) setRoomAction('');
    }
  }

  const connectionText = {
    connected: 'Lobby conectado', restored: 'Conexión restablecida.',
    disconnected: 'Conexión perdida. Intentando reconectar…', connecting: 'Conectando al lobby…',
    expired: 'Tiempo de recuperación agotado. Recarga para comprobar el estado.',
    replaced: 'Esta sesión se abrió en otra pestaña.',
  }[connection] ?? 'Conectando al lobby…';

  return (
    <main className={`app-shell${currentGame ? ' is-playing' : ''}`}>
      <header className="app-header">
        <div className="app-brand"><span className="brand-mark" aria-hidden="true"><Piece type="n" /></span><div><p className="eyebrow">El club · En red local</p><h1>Ajedrez</h1></div></div>
        <div className="header-tools">
          {session && <button className="profile-trigger" type="button" onClick={(event) => { profileOpenerRef.current = event.currentTarget; setProfileMessage(''); setProfileOpen(true); }}><Avatar id={session.avatarId} label="" />Mi perfil</button>}
          <button className="theme-toggle" type="button" aria-pressed={theme === 'dark'}
            aria-label={`Cambiar a modo ${theme === 'light' ? 'oscuro' : 'claro'}`}
            onClick={toggleTheme}>
            <span className="theme-icon" aria-hidden="true">{theme === 'light' ? '◐' : '☼'}</span>
            {theme === 'light' ? 'Modo oscuro' : 'Modo claro'}
          </button>
        </div>
      </header>

      {profileMessage && <p className="profile-saved" role="status">{profileMessage}</p>}
      {profileOpen && session && <ProfileDialog profile={session} busy={profileBusy || logoutBusy} logoutError={logoutError} activeGame={currentGame?.status === 'playing'} coordinates={coordinates} onCoordinates={setCoordinatePreference} onClose={() => setProfileOpen(false)} onSave={saveProfile} onLogout={requestLogout} />}
      {logoutConfirm && <LogoutDialog busy={logoutBusy} error={logoutError} onCancel={() => setLogoutConfirm(false)} onConfirm={async () => {
        const epoch = identityEpochRef.current;
        setLogoutBusy(true); setLogoutError('');
        try { await logout(true); } catch (error) { if (epoch === identityEpochRef.current) setLogoutError(error.message || 'No se pudo cerrar la sesión.'); }
        finally { if (epoch === identityEpochRef.current) setLogoutBusy(false); }
      }} />}

      {sessionStatus === 'loading' && <p className="notice" role="status">Comprobando tu sesión…</p>}

      {sessionStatus === 'ready' && !session && (
        <div className="entry-layout">
          <section className="entry-intro" aria-labelledby="club-title">
            <p className="eyebrow">64 casillas. Infinitas posibilidades.</p>
            <h2 id="club-title">Una buena partida<br /><em>empieza contigo.</em></h2>
            <p>Comparte el tablero con alguien de tu red o encuentra tu ritmo frente al bot.</p>
            <div className="club-art" aria-hidden="true">
              <div className="art-board" />
              <Piece type="k" color="black" className="art-king" />
              <Piece type="n" className="art-knight" />
              <span className="art-caption">El juego empieza con una decisión.</span>
            </div>
          </section>
        <section className="entry-card" aria-labelledby="entry-title">
          <p className="eyebrow">Toma asiento</p>
          <h2 id="entry-title">¿Cómo quieres llamarte?</h2>
          <p className="description">Usaremos este nombre durante tu sesión de juego.</p>
          <form onSubmit={enter} noValidate>
            <label htmlFor="player-name">Tu nombre</label>
            <input id="player-name" name="name" type="text" value={name} maxLength={48} autoComplete="nickname" autoFocus
              aria-describedby={sessionError ? 'name-help session-error' : 'name-help'} onChange={(event) => setName(event.target.value)} />
            <p id="name-help" className="field-help">Escribe entre 2 y 24 caracteres. Quitaremos espacios al inicio y al final.</p>
            <AvatarPicker value={entryAvatar} onChange={setEntryAvatar} />
            {sessionError && <p id="session-error" className="form-error" role="alert">{sessionError}</p>}
            <button className="primary-button" type="submit" disabled={!nameValid || submitting}>
              {submitting ? 'Entrando…' : 'Entrar'}
            </button>
          </form>
        </section>
        </div>
      )}

      {sessionStatus === 'ready' && session && !currentRoom && !currentGame && (
        <div className="lobby-layout">
          <section className="welcome-panel" aria-labelledby="welcome-title">
            <p className="eyebrow">Tu próxima jugada</p>
            <h2 id="welcome-title">Hola, {session.name}</h2>
            <p className="description">Crea una sala o únete a alguien que esté esperando.</p>
            <div className="time-control-field">
              <label htmlFor="bot-time-control">Control de tiempo contra bot</label>
              <select id="bot-time-control" value={botTimeControl} onChange={(event) => setBotTimeControl(event.target.value)}>
                <option value="3+0">3+0 · 3 minutos</option><option value="5+0">5+0 · 5 minutos</option>
                <option value="10+5">10+5 · 10 minutos + 5 segundos</option><option value="unlimited">Sin reloj</option>
              </select>
            </div>
            {roomMessage && <p className="success-message" role="status">{roomMessage}</p>}
            <div className="mode-actions">
              <button className="mode-card mode-human" type="button" aria-label="Crear sala" disabled={Boolean(roomAction)} onClick={(event) => {
                createOpenerRef.current = event.currentTarget;
                setRoomName(`Sala de ${session.name}`);
                setRoomError('');
                setCreateOpen(true);
              }}><span className="mode-copy"><span className="mode-kicker">Entre personas · LAN</span><strong>Crear sala</strong><span>Invita a alguien a tu mesa.</span></span><span className="mode-icon"><Piece type="k" /></span><span className="mode-arrow" aria-hidden="true">↗</span></button>
              <button className="mode-card mode-bot" type="button" aria-label={roomAction === 'bot' ? 'Iniciando…' : 'Jugar contra bot'} disabled={Boolean(roomAction)} onClick={startBotGame}>
                <span className="mode-copy"><span className="mode-kicker">Tú contra el sistema</span><strong>{roomAction === 'bot' ? 'Iniciando…' : 'Jugar contra bot'}</strong><span>Una partida a tu ritmo.</span></span><span className="mode-icon"><Piece type="n" color="black" /></span><span className="mode-arrow" aria-hidden="true">↗</span>
              </button>
            </div>
            {roomError && <p className="form-error" role="alert">{roomError}</p>}
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
              <span className="empty-mark" aria-hidden="true"><Piece type="p" /><Piece type="p" color="black" /></span><h3>Aún no hay salas</h3>
              <p>Cuando alguien cree una sala, aparecerá aquí. También puedes crear una para empezar.</p>
              <button className="secondary-button" type="button" disabled={Boolean(roomAction)} onClick={(event) => {
                createOpenerRef.current = event.currentTarget;
                setRoomName(`Sala de ${session.name}`);
                setRoomError('');
                setCreateOpen(true);
              }}>Crear sala</button>
            </div>}
            {roomsStatus === 'ready' && rooms.length > 0 && <ul className="room-list">
              {rooms.map((room) => <li className="room-card" key={room.id}>
                <Avatar id={room.hostAvatarId} label="" className="room-avatar" />
                <div className="room-card-copy"><h3>{room.name}</h3><p>Anfitrión: {room.hostName}</p><p className="room-availability"><span className="occupancy">{room.players} / 2</span> Esperando jugador · {room.timeControl === 'unlimited' ? 'Sin reloj' : room.timeControl}</p></div>
                <button className="primary-button" type="button" disabled={Boolean(roomAction)} onClick={() => roomRequest(
                  `/api/rooms/${encodeURIComponent(room.id)}/join`, { method: 'POST' }, 'join', 'Te uniste a la sala.',
                )}>{roomAction === 'join' ? 'Uniéndote…' : 'Unirse'}</button>
              </li>)}
            </ul>}
            {roomError && roomsStatus !== 'error' && <p className="form-error" role="alert">{roomError}</p>}
          </section>
        </div>
      )}

      {sessionStatus === 'ready' && session && currentGame
        && (currentGame.mode === 'bot' || currentRoom?.gameId === currentGame.id) && (
        <GameScreen game={currentGame} room={currentRoom} session={session} connection={connection} showCoordinates={coordinates}
          onGameChange={(game) => {
            if (game.id === currentGameRef.current?.id && (game.stateVersion ?? game.revision) >= (currentGameRef.current.stateVersion ?? currentGameRef.current.revision)) changeCurrentGame(game);
          }}
          onReturnToLobby={async () => {
            const epoch = identityEpochRef.current;
            const path = currentGame.mode === 'bot'
              ? `/api/games/${encodeURIComponent(currentGame.id)}/leave`
              : `/api/rooms/${encodeURIComponent(currentRoom.id)}/leave`;
            const response = await fetch(path, { method: 'POST' });
            const result = await response.json();
            if (epoch !== identityEpochRef.current) return;
            if (!response.ok) throw new Error(result.error?.message || 'No se pudo volver al lobby.');
            changeCurrentRoom(null);
            changeCurrentGame(null);
            setRoomsRetry((value) => value + 1);
          }} onNewBotGame={startBotGame} />
      )}

      {sessionStatus === 'ready' && session && currentRoom && !(currentRoom.gameId && currentGame?.id === currentRoom.gameId) && (
        <section className="room-view" aria-labelledby="room-title">
          <div className="waiting-emblem" aria-hidden="true"><Piece type="k" /></div>
          <p className="eyebrow">Tu mesa está preparada</p>
          <h2 id="room-title">{currentRoom.name}</h2>
          <p className="room-code">Código de sala <strong>{currentRoom.id.slice(0, 8).toUpperCase()}</strong></p>
          <p className="description">Control de tiempo: {currentRoom.timeControl === 'unlimited' ? 'Sin reloj' : currentRoom.timeControl}</p>
          <p className="connection-status" role="status">{currentRoom.connection?.status === 'disconnected'
            ? 'Conexión perdida. Intentando recuperar esta sala…'
            : connection === 'expired'
              ? 'No se pudo restablecer a tiempo. Recarga para comprobar el estado de la sala.'
              : connection === 'replaced'
                ? 'Esta sesión se abrió en otra pestaña. Esta pestaña ya no controla la sala.'
                : connection === 'disconnected'
                  ? 'Conexión perdida. Intentando reconectar…'
                  : currentRoom.status === 'waiting' ? 'Esperando jugador' : 'Sala lista'}</p>
          <h3>Jugadores</h3>
          <ol className="player-list">
            <li><Avatar id={currentRoom.hostAvatarId} label="" /><div><strong>{currentRoom.hostName}</strong><span>Anfitrión · Blancas</span></div></li>
            {currentRoom.guestName
              ? <li><Avatar id={currentRoom.guestAvatarId} label="" /><div><strong>{currentRoom.guestName}</strong><span>Invitado · Negras</span></div></li>
              : <li className="player-slot"><span className="slot-piece" aria-hidden="true">+</span><div><strong>Esperando otro jugador…</strong><span>Plaza 2 de 2</span></div></li>}
          </ol>
          {currentRoom.status === 'ready' && <p className="description">La partida está lista. Cargando el tablero…</p>}
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
          <label htmlFor="room-time-control">Control de tiempo</label>
          <select id="room-time-control" value={roomTimeControl} onChange={(event) => setRoomTimeControl(event.target.value)}>
            <option value="3+0">3+0 · 3 minutos</option><option value="5+0">5+0 · 5 minutos</option>
            <option value="10+5">10+5 · 10 minutos + 5 segundos</option><option value="unlimited">Sin reloj</option>
          </select>
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
      <footer className="app-footer">
        <span>Un tablero. Una buena compañía.</span>
        <div className="footer-tools">
          <details className="service-diagnostics"><summary>{health?.backend === 'available' && health?.database === 'available' ? 'Servicios disponibles' : 'Estado de servicios'}</summary><ServiceStatus health={health} /></details>
          <a href="/assets/CREDITS.txt" target="_blank" rel="noreferrer">Créditos visuales</a>
        </div>
      </footer>
      {health?.database === 'unavailable' && <p className="service-error" role="alert">El backend responde, pero PostgreSQL no está disponible.</p>}
    </main>
  );
}

createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>);
