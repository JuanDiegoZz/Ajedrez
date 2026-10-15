# Fase 3 — Salas e inicio

> **For agentic workers:** Use `superpowers:executing-plans` to execute this plan task-by-task. No commit: the user keeps the Fase 3 checkpoint.

**Goal:** Implementar salas humanas temporales, lobby en vivo y sala lista con dos jugadores, sin tablero ni reglas.

**Architecture:** Un módulo de memoria administra salas y pertenencia a sesiones. HTTP crea, lista, une y libera salas; WebSocket autenticado por la cookie actual distribuye el lobby y el estado de sala. React conserva el flujo existente y añade crear, esperar, unirse y salir.

**Tech Stack:** Node.js HTTP existente, `ws` como servidor WebSocket según ADR-005 propuesto, React nativo, PostgreSQL sin cambios.

**Spec:** `docs/12_ROADMAP.md`, `docs/03_USER_FLOWS.md`, `docs/06_UI_STATES.md`, `docs/07_ARCHITECTURE.md`, `docs/08_DATA_MODEL.md`, `docs/09_REALTIME_MULTIPLAYER.md`, `docs/13_DECISIONS.md`.

## Global Constraints

- Solo Fase 3; no tablero, reglas, bot ni WebSocket de partida.
- Salas activas en memoria; ninguna tabla de salas.
- Dos jugadores por sala; identidad tomada de sesión HttpOnly.
- Lobby por WebSocket de mismo origen; operaciones de salas por HTTP.
- Conservar salud, acceso LAN 8080, PostgreSQL y fases anteriores.
- Sin remoto, push ni commit.

---

### Task 1: Servicio de salas y pruebas de dominio

**Files:** crear `backend/src/rooms.js`, `backend/test/rooms.test.js`; modificar `backend/src/sessions.js` solo para pertenencia de sala si la prueba la requiere.

**Interfaces:** `createRoom(session, name)`, `listRooms()`, `getRoomForSession(session)`, `joinRoom(session, roomId)`, `leaveRoom(session)`, `cancelRoom(session, roomId)`. Respuestas contienen sala pública sin IDs de sesión; errores exponen códigos estables.

- [x] Escribir tests para validación, crear/listar/anfitrión, unirse, tercero, ID inexistente, identidad por sesión, invitado sale, anfitrión sale/cancela.
- [x] Ejecutar `npm test` y confirmar fallos esperados por exports ausentes.
- [x] Implementar mapa de salas y estado mínimo (`waiting`, `ready`), capacidad 2 y mutaciones síncronas.
- [x] Ejecutar `npm test` y conservar las pruebas existentes.

### Task 2: HTTP, WebSocket y proxy same-origin

**Files:** crear `backend/src/lobby.js`; modificar `backend/src/server.js`, `backend/package.json`, `backend/package-lock.json`, `frontend/nginx.conf`.

**Interfaces:** HTTP `GET/POST /api/rooms`, `POST /api/rooms/:id/join`, `POST /api/rooms/:id/leave`, `DELETE /api/rooms/:id`; WebSocket `/ws` usa `lobby:subscribe`, `lobby:state`, `room:state`.

- [x] Añadir test de integración HTTP para auth, responses y mutaciones con servidor de prueba.
- [x] Ejecutar test nuevo; confirmar error esperado antes de ruta nueva.
- [x] Añadir `ws` con Context7; autenticar upgrade por cookie y mismo Origin; validar JSON y publicar snapshots únicamente a miembros.
- [x] Mantener `/api/health` y notificar cambios a suscriptores.
- [x] Ejecutar suite backend y verificar rechazo de sesión/origen inválidos.

### Task 3: Flujo visual React

**Files:** modificar `frontend/src/main.jsx`, `frontend/src/styles.css`.

- [x] Hacer dialog nativo accesible para crear sala, validación 2–40, prefill y loading.
- [x] Presentar lista viva de salas, tarjetas y estado vacío.
- [x] Añadir pantalla de sala con anfitrión/blancas, invitado/negras, espera/lista y salida/cancelación.
- [x] Derivar la sala activa de respuesta de sesión al recargar; no mostrar IDs internos.
- [x] Mostrar reconexión/error WS y errores HTTP legibles; permitir reintentar.
- [x] Compilar frontend y correr Playwright A/B/C, salida, recarga, error, teclado y 320/390 px.

### Task 4: Compose, documentación y cierre

**Files:** actualizar `docs/13_DECISIONS.md`, `docs/14_PROGRESS.md`, `README.md` y `PROJECT_TREE.md` solo si cambian.

- [x] Ejecutar `npm test`, `docker compose config`, `docker compose up -d --build`, `docker compose ps`.
- [x] Comprobar health, PostgreSQL, web 8080, HTTP/WS same-origin y que backend/DB no publiquen puertos.
- [x] Registrar ADR-005 y cualquier política nueva aprobada por este encargo; explicar memoria, estados y pruebas observadas.
- [x] Inspeccionar diff completo, secretos, archivos, tablas/archivos fuera de alcance y estado Git; no hacer commit.

## Revisión propia

- Requisitos 1–20 cubiertos por Tasks 1–3; pruebas, responsive y criterios de Fase 1/2 cubiertos por Tasks 2–4.
- No se incluye inicio de juego interactivo, tablero, ajedrez, bot ni persistencia de salas.
- La asignación al último cupo ocurre en una operación síncrona del mismo proceso; una segunda solicitud recibe `ROOM_FULL`.

