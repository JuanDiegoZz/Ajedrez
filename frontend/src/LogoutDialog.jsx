import { useEffect, useRef } from 'react';

export default function LogoutDialog({ busy, error, onConfirm, onCancel }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog?.open) dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return <dialog ref={ref} className="profile-dialog logout-dialog" aria-labelledby="logout-title"
    onCancel={(event) => { event.preventDefault(); if (!busy) onCancel(); }}>
    <p className="eyebrow">Salir de la partida</p>
    <h2 id="logout-title">¿Cerrar sesión y abandonar?</h2>
    <p>Abandonarás esta partida y, si continúa activa, perderás. Tu sesión también se cerrará en las otras pestañas.</p>
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="profile-actions">
      <button autoFocus type="button" className="secondary-button" disabled={busy} onClick={onCancel}>Seguir jugando</button>
      <button type="button" className="danger-button" disabled={busy} onClick={onConfirm}>{busy ? 'Cerrando sesión…' : 'Abandonar y cerrar sesión'}</button>
    </div>
  </dialog>;
}
