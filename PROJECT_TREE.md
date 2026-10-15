# Árbol vigente — Fase 1

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
│   └── src/
│       └── server.js
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
│       └── 2026-10-15-fase-1-arranque-lan.md
├── prompts/
├── setup/
└── .codex/
```

Fase 1 contiene la página de salud, la API, el proxy y el arranque LAN. No incluye todavía salas, tablero, reglas, WebSocket de juego, bot ni historial. Las carpetas de datos locales y cachés de herramientas no forman parte del árbol de producto.
