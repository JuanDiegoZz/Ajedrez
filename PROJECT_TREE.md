# Árbol vigente — Fase 2

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
│   │   └── sessions.js
│   └── test/
│       └── sessions.test.js
├── frontend/
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── index.html
│   ├── package.json
│   ├── package-lock.json
│   ├── vite.config.js
│   └── src/
│       ├── main.jsx
│       └── styles.css
├── docs/
│   ├── 00_VISION.md … 14_PROGRESS.md
│   └── superpowers/plans/
│       ├── 2026-10-15-fase-1-arranque-lan.md
│       └── 2026-10-15-fase-2-entrada-lobby.md
├── prompts/
├── setup/
└── .codex/
```

Fase 2 añade entrada, sesión temporal, endpoint de lobby vacío y estados responsive. Crear/unirse a salas, WebSocket, tablero, reglas, bot e historial siguen fuera de esta fase. Las carpetas de datos locales y cachés de herramientas no forman parte del árbol de producto.
