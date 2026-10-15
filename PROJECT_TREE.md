# Árbol vigente — Fase 6

Estructura de producto verificada el 2026-10-15. Se omiten `node_modules`, `dist` y datos locales generados.

```text
ajedrez/
├── AGENTS.md
├── README.md
├── MODEL_STRATEGY.md
├── PROJECT_TREE.md
├── .env.example
├── compose.yaml
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── package-lock.json
│   ├── src/
│   │   ├── server.js
│   │   ├── sessions.js
│   │   ├── rooms.js
│   │   ├── lobby.js
│   │   ├── recovery.js
│   │   ├── games.js
│   │   └── game-archive.js
│   └── test/
│       ├── sessions.test.js
│       ├── rooms.test.js
│       ├── rooms-api.test.js
│       ├── games.test.js
│       ├── games-api.test.js
│       ├── games-ws.test.js
│       ├── recovery.test.js
│       ├── recovery-ws.test.js
│       └── game-archive.test.js
├── frontend/
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── index.html
│   ├── package.json
│   ├── package-lock.json
│   ├── vite.config.js
│   └── src/
│       ├── main.jsx
│       ├── GameScreen.jsx
│       └── styles.css
├── docs/
│   ├── 00_VISION.md … 14_PROGRESS.md
│   └── superpowers/plans/
│       ├── 2026-10-15-fase-1-arranque-lan.md
│       ├── 2026-10-15-fase-2-entrada-lobby.md
│       └── 2026-10-15-fase-3-salas-inicio.md
├── prompts/
├── setup/
└── .codex/
```

Fase 6 añade presencia y recuperación temporal al WebSocket existente, con timers backend y pruebas de timeout. `chess.js` sigue siendo autoritativo; bot queda fuera de alcance. Las carpetas de datos locales y cachés de herramientas no forman parte del árbol de producto.
