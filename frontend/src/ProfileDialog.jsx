import { useEffect, useRef, useState } from 'react';
import { Avatar, AvatarPicker } from './Avatar.jsx';

export default function ProfileDialog({ sound, onSound, onTestSound, profile, busy, logoutError, activeGame, coordinates, onCoordinates, onSave, onLogout, onClose }) {
  const ref = useRef(null);
  const [name, setName] = useState(profile.name);
  const [avatarId, setAvatarId] = useState(profile.avatarId ?? 'club');
  const [error, setError] = useState('');
  const [nameError, setNameError] = useState('');
  const changed = name.trim() !== profile.name || avatarId !== profile.avatarId;
  useEffect(() => { if (!ref.current?.open) ref.current?.showModal(); return () => ref.current?.close(); }, []);
  async function save(event) {
    event.preventDefault(); setError(''); setNameError('');
    const trimmedName = name.trim();
    if (Array.from(trimmedName).length < 2 || Array.from(trimmedName).length > 24 || /[\u0000-\u001f\u007f-\u009f]/u.test(trimmedName)) {
      setNameError('Escribe un nombre válido de 2 a 24 caracteres.'); return;
    }
    try { await onSave({ name, avatarId }); }
    catch (reason) {
      if (/nombre/u.test(reason.message)) setNameError(reason.message);
      else setError(reason.message || 'No se pudo guardar. Inténtalo de nuevo.');
    }
  }
  return <dialog className="profile-dialog" ref={ref} aria-labelledby="profile-title" onCancel={(event) => { event.preventDefault(); onClose(); }} onClose={onClose}>
    <form onSubmit={save}>
      <div className="profile-heading"><Avatar id={profile.avatarId} label="Avatar actual" /><div><p className="eyebrow">Jugador invitado</p><h2 id="profile-title">Mi perfil</h2></div>
        <button className="dialog-close" type="button" aria-label="Cerrar perfil" onClick={onClose}>×</button></div>
      <p className="description">Tu perfil es temporal. No necesitas crear una cuenta.</p>
      <label htmlFor="profile-name">Nombre</label><input id="profile-name" autoFocus minLength="2" maxLength="24" value={name} disabled={activeGame} onChange={(event) => setName(event.target.value)} aria-invalid={Boolean(nameError)} aria-describedby={nameError ? 'profile-name-help profile-name-error' : 'profile-name-help'} />
      <small id="profile-name-help">De 2 a 24 caracteres.</small>
      {nameError && <p id="profile-name-error" className="form-error" role="alert">{nameError}</p>}
      <div inert={activeGame ? '' : undefined}><AvatarPicker value={avatarId} onChange={setAvatarId} /></div>
      {activeGame && <p className="notice">Podrás cambiar tu nombre y avatar cuando termine la partida.</p>}
      <label className="preference-toggle"><input type="checkbox" checked={coordinates} onChange={(event) => onCoordinates(event.target.checked)} /> Mostrar coordenadas del tablero</label>
      <fieldset className="sound-preferences"><legend>Sonido de la partida</legend>
        <label className="preference-toggle"><input type="checkbox" checked={sound.enabled} onChange={event => onSound({ ...sound, enabled: event.target.checked })} /> Activar sonidos</label>
        <label htmlFor="sound-volume">Volumen general · {Math.round(sound.volume * 100)} %</label>
        <input id="sound-volume" type="range" min="0" max="100" step="1" value={Math.round(sound.volume * 100)} onChange={event => onSound({ ...sound, volume: Number(event.target.value) / 100 })} />
        <button type="button" className="secondary-button" disabled={!sound.enabled || sound.volume === 0} onClick={onTestSound}>Probar sonido</button>
        <small>El audio se activa al interactuar. Complementa las señales visuales.</small>
      </fieldset>
      {error && <p role="alert" className="form-error">{error}</p>}
      {logoutError && <p role="alert" className="form-error">{logoutError}</p>}
      <div className="profile-actions"><button type="submit" className="primary-button" disabled={!changed || busy || activeGame}>{busy ? 'Guardando…' : 'Guardar cambios'}</button>
        <button type="button" className="danger-button" disabled={busy} onClick={onLogout}>Cerrar sesión</button></div>
    </form>
  </dialog>;
}
