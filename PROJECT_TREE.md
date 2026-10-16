# Árbol vigente

Estructura de producto verificada el 2026-10-15. Se omiten `node_modules`, `dist` y datos locales generados.

```text
ajedrez/
├── AGENTS.md
├── README.md
├── START_AJEDREZ.bat
├── STOP_AJEDREZ.bat
├── STATUS_AJEDREZ.bat
├── RESET_AJEDREZ.bat
├── UNINSTALL_AJEDREZ.bat
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
│   │   ├── bot.js
│   │   └── game-archive.js
│   └── test/
│       ├── sessions.test.js
│       ├── rooms.test.js
│       ├── rooms-api.test.js
│       ├── games.test.js
│       ├── games-api.test.js
│       ├── games-ws.test.js
│       ├── bot.test.js
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
│   ├── public/assets/
│   │   ├── CREDITS.txt
│   │   ├── fonts/ (Newsreader.ttf, OFL.txt)
│   │   └── pieces/ (12 SVG Cburnett, GPL-2.0.txt)
│   └── src/
│       ├── main.jsx
│       ├── GameScreen.jsx
│       ├── Piece.jsx
│       └── styles.css
├── docs/
│   ├── 00_VISION.md … 15_FINAL_DEMO.md
│   ├── WINDOWS_LAUNCHER.md
│   └── superpowers/plans/
│       ├── 2026-10-15-fase-1-arranque-lan.md
│       ├── 2026-10-15-fase-2-entrada-lobby.md
│       └── 2026-10-15-fase-3-salas-inicio.md
├── prompts/
├── scripts/
│   └── windows/
│       ├── common.ps1
│       ├── firewall.ps1
│       ├── start.ps1
│       ├── stop.ps1
│       ├── status.ps1
│       ├── reset.ps1
│       └── uninstall.ps1
├── setup/
└── .codex/
```

Fase 7 añade búsqueda minimax acotada en un trabajador Node; `chess.js` sigue siendo la autoridad de reglas. Fases 6–7 reutilizan el WebSocket existente para recuperación y snapshots. Las carpetas de datos locales y cachés de herramientas no forman parte del árbol de producto.
