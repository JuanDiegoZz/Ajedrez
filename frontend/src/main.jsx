import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

function App() {
  const [health, setHealth] = useState(null);

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

  const backendAvailable = health?.backend === 'available';
  const databaseStatus = health?.database === 'available'
    ? 'Disponible'
    : health?.database === 'unavailable'
      ? 'No disponible'
      : health?.backend === 'unavailable'
        ? 'Sin respuesta del backend'
        : 'Comprobando…';

  return (
    <main>
      <h1>Ajedrez UX</h1>
      <p>Estado de los servicios de Fase 1</p>
      <dl>
        <div><dt>Frontend</dt><dd>Disponible</dd></div>
        <div><dt>Backend</dt><dd>{health ? (backendAvailable ? 'Disponible' : 'No disponible') : 'Comprobando…'}</dd></div>
        <div><dt>Base de datos</dt><dd>{databaseStatus}</dd></div>
      </dl>
      {health?.backend === 'unavailable' && (
        <p role="alert">No se puede contactar al backend. Comprueba que los servicios estén iniciados e inténtalo de nuevo.</p>
      )}
      {health?.database === 'unavailable' && (
        <p role="alert">El backend responde, pero PostgreSQL no está disponible.</p>
      )}
    </main>
  );
}

createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>);
