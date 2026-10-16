# 14 — Progreso, auditoría y evidencia

## Estado actual — Fase 9 — 2026-10-15

**Fase 9: COMPLETADA — 2026-10-15.** Regresión final, arranque reproducible, documentación de demo, defensa UX y plan de contingencia preparados. No se agregaron funciones ni cambios de lógica.

- Estado inicial: `main`, working tree limpio, último commit `6654560 docs: close phase 8 UX evaluation`; sin remoto configurado.
- `backend`: `npm test`, 57/57 correctos. `frontend`: `npm run build`, correcto.
- `docker compose config --quiet` y `docker compose up -d --build`: correctos. PostgreSQL healthy y `SELECT 1` devuelve 1. `/api/health`: HTTP 200, backend y base disponibles.
- Red: web publicado en `0.0.0.0:8080`; `docker inspect` confirma backend `3000/tcp` y PostgreSQL `5432/tcp` sin bindings de host. Nginx enruta `/api/` y `/ws` en el mismo origen. `http://192.168.1.15:8080/api/health` responde desde el anfitrión por su IPv4 LAN actual.
- Playwright A/B: entrada por Enter, creación/unión, blancas/negras, orientación, WebSocket `ws://localhost:8080/ws`, e2–e4, d7–d5, exd5 sincronizado, refresh negro con mismo color/posición/turno, abandono archivado y regreso al lobby. Consola limpia.
- Playwright bot: indicador “El bot está pensando…”, respuesta a e2–e4, turno humano y refresh conserva posición. Teclado movió e2–e4 en otro contexto.
- Presentación/accesibilidad: foco del diálogo Crear sala, Escape y retorno al activador; foco/Escape en abandono; promoción de caballo por teclado en fixture con API interceptada; reduced motion; tema de sistema oscuro, toggle y preferencia tras refresh.
- Responsive: juego sin desbordamiento a 1440/1024/768/390/320 px. Contraste y responsive referenciados desde evidencia de Fase 8.
- Recursos: doce SVG Cburnett locales, atribución, GPL-2.0-or-later y texto de licencia; Newsreader y OFL-1.1. No se requiere CDN.
- PostgreSQL confirmó la partida humana de ensayo: resultado `resignation`, tres medias jugadas. `SELECT 1` respondió correctamente.
- No hay `.env` real; `.env.example` es el único archivo de entorno. La revisión automática bloqueó eliminar 43 archivos temporales Playwright y 19 archivos de `frontend/dist`; todos están ignorados por Git y permanecen locales, fuera del cambio. Se conservan `node_modules` y metadata Serena para desarrollo.
- Documentación de demo incluye checklist 10–15 min, guion 6–8 min, arquitectura, contingencia, límites y explicación de UX/ISO. El estudio comparativo con cinco personas sigue ausente según cierre aceptado de Fase 8.

## Fase 8 — Evaluación e iteración — 2026-10-15

**Fase 8: COMPLETADA — 2026-10-15.** Cierre aceptado con auditoría heurística, iteraciones visuales y regresión técnica documentadas. La evaluación comparativa con estudiantes no se realizó y queda como limitación metodológica, no como fallo del software.

- Versión A congelada por referencia al checkpoint limpio `cb61d64` (Fase 7). Playwright inspeccionó entrada, lobby, diálogo, espera, partida humana A/B, bot, abandono, reconexión y teclado antes de cambiar código.
- Prioridad: P1 marcadores de movimiento/captura (2.21:1/2.68:1 sobre casilla oscura) y foco del diálogo “Crear sala” (caía en `body`); P2 coordenadas visuales (3.29:1). No se observó P0.
- Candidata B eleva contraste y restaura foco al botón que abrió el diálogo. Medición tras el cambio: marcador/anillo 3.24:1 sobre casilla oscura y 4.91:1 sobre clara; coordenada/selección/foco 5.67:1 y 13:1; contorno de jaque 3.18:1 y 7.30:1. Hallazgos y cambios no implican éxito de usabilidad humana.
- Responsive observado en 1440, 1024, 768, 390 y 320 px. Tablero: 640, 640, 489, 343 y 273 px; casilla mínima observada: 34 px; no hubo desbordamiento horizontal.
- Playwright verificó foco de modal/restauración, selección/flechas/Enter, destinos y marcador de captura, e2–e4, e7–e5 y exd5 sincronizados A/B, modo bot con “El bot está pensando…”, refresh/abandono, y desconexión/reconexión por cierre WebSocket. Banner rival pasó a 390 px; mensaje propio a 320 px, sin overflow. Contextos limpios: cero errores de consola o JavaScript.
- Revalidación: `backend npm test` 57/57; `frontend npm run build`; `docker compose config --quiet`; `docker compose up -d --build`; web en `0.0.0.0:8080`, PostgreSQL healthy, `/api/health` 200 y `pg_isready` acepta conexiones.
- Viewports: entrada, lobby, modal, espera, tablero y resultado no desbordan en 1440/1024/768/390/320 px. En 320 px, botones 45 px y casilla de 34 px. Con `prefers-reduced-motion: reduce`, la pieza no anima (`animation-name: none`).
- El log agregado de Playwright conserva ocho errores HTTP/WebSocket de contextos anteriores cuando Compose reinició; las rutas felices post-reinicio en contextos nuevos no registraron errores. No hubo warnings.
- Preparación de estudiantes en `11`: se añadió T9 de interpretación de desconexión. No se han reclutado ni probado estudiantes; eficacia, eficiencia, satisfacción y comparación de versiones carecen de resultados reales. Tampoco se hizo revisión manual con lector de pantalla.
- No se realizó una evaluación comparativa formal con aproximadamente cinco participantes. Por tanto, no se presentan métricas humanas cuantitativas de eficacia, eficiencia o satisfacción posteriores al rediseño. No se inventan usuarios, resultados, tiempos ni puntuaciones.
- Evidencia técnica de cierre y relación hallazgo → cambio → comprobación: ver las iteraciones visual complementaria y premium abajo. La regresión cubrió entrada, lobby, salas, juego humano A/B, bot, recuperación, archivo, claro/oscuro, teclado, movimiento reducido y tamaños responsive.
- El protocolo de tareas, registro y preguntas sigue disponible en `11_TESTING_AND_UX_EVALUATION.md` para posible evaluación posterior. La falta del estudio formal se acepta como limitación metodológica de esta fase.

## Iteración visual premium — 2026-10-15

- Iteración completada técnicamente. Se preservó el trabajo visual previo y la lógica existente; no se atribuyen resultados a estudiantes.
- Auditoría previa en navegador: entrada con composición genérica; lobby con tarjetas equivalentes a un dashboard; cabecera con diagnósticos demasiado prominentes; tablero comenzando aproximadamente a 374 px; jugadores e historial con poca jerarquía; glifos dependientes de la plataforma. Se inspeccionaron también resultado, bot, recuperación y ambos temas.
- Cambios: identidad editorial de club con marfil/tinta/latón, fuente Newsreader local, bienvenida con composición ajedrecística, acciones de lobby como modos de juego y tarjetas de sala con ocupación. Diagnósticos conservados en un desplegable del pie. Tablero enmarcado y dominante, jugadores con medallones, estado e historial en panel complementario; en escritorio el tablero comienza aproximadamente a 259 px.
- Piezas: doce SVG Cburnett sin modificar, obtenidos del repositorio oficial de Lichess y distribuidos bajo GPL-2.0-or-later. Se incluyen fuente SVG, licencia completa y atribución. Newsreader conserva OFL-1.1. Recursos y créditos locales en `frontend/public/assets/`; no se requiere CDN. ADR-017 registra la decisión y sus licencias.
- Estados conservan texto y forma: selección, puntos de destino, anillos de captura, esquinas del último movimiento, rey en jaque con signo de exclamación y resultado. Microanimaciones limitadas a piezas (170 ms), diálogo (180 ms), interacción y puntos de espera del bot; `prefers-reduced-motion: reduce` las desactiva.
- Se reprodujo un fallo de feedback: una respuesta HTTP de abandono con archivo `pending` podía llegar después del snapshot WebSocket `saved` de la misma revisión y sobrescribirlo. Se añadió una protección en el estado compartido del frontend. Prueba determinista retrasando HTTP 350 ms: el resultado permanece guardado. No se modificó backend ni mecanismo de archivo.
- Playwright con contextos nuevos: entrada por Enter; foco inicial, Escape y restauración del diálogo; orientaciones A/B; movimiento e2–e4 por teclado, respuesta d7–d5 y captura exd5 sincronizada; turno contrario bloqueado; tercero rechazado con HTTP 409. Desconexión WebSocket, aviso al rival y recarga recuperan posición, identidad y color. Abandono confirma resultado guardado.
- Bot real: entrada directa, indicador pensando observado, respuesta automática, historial SAN, turno humano, refresh y abandono con archivo guardado. Partida humana real de mate del loco: ambos reciben jaque mate, indicador del rey y 64 casillas bloqueadas. Promoción se verificó como UI con FEN/API interceptados: diálogo a 320 px, caballo elegido por teclado, petición `promotion=n`, SVG correcto y resultado de tablas; las reglas reales siguen cubiertas por tests backend.
- Responsive: 60 combinaciones de seis pantallas (entrada, lobby, diálogo, espera, partida y resultado), dos temas y cinco anchos (1440/1024/768/390/320 px), sin desbordamiento horizontal. Tableros observados de aproximadamente 619/619/619/349/279 px; casilla mínima 34.6 px. Banner de desconexión y promoción utilizables a 320 px.
- Contraste calculado desde estilos del navegador: texto principal/superficie 13.35:1 claro y 12.71:1 oscuro; secundario 5.96:1 y 8.05:1; acento editorial/fondo 5.57:1 y 8.98:1; coordenadas sobre ambas casillas mínimo 5.48:1 y 5.04:1; marcadores mínimo 4.81:1 y 4.41:1. Se oscureció el latón claro tras detectar contraste insuficiente en texto pequeño.
- Revalidación: tests backend 57/57; build frontend; configuración Compose y reconstrucción solo de web correctos. Preferencia de tema persistida, fuente y piezas cargadas, créditos HTTP 200, foco y teclado, movimiento reducido y servicios desplegables verificados. Contextos de prueba limpios sin errores JavaScript/consola ni peticiones a recursos externos. Evidencias temporales permanecen ignoradas en `.playwright-mcp/`.
- Límites: pruebas visuales en Chromium; no se hizo evaluación con estudiantes ni revisión manual con lector de pantalla. Las capturas y métricas técnicas no sustituyen esos estudios.

## Iteración visual complementaria — 2026-10-15

- Entrada, lobby, sala de espera y partida A/B se inspeccionaron en navegador. A 1440/1024/768/390/320 px, el tablero cabía sin scroll horizontal; la dirección anterior seguía usando superficies blancas uniformes, fuente de sistema y azul genérico. El feedback recibido señaló que la aplicación parecía una web genérica, no un juego.
- Cambio: identidad de club con fondo cálido, títulos serif, verde profundo/cobre, acciones con jerarquía, cards de sala y jugadores destacadas, marco de tablero y estados de turno más notorios. Se conservaron glifos Unicode: en Chromium eran legibles y no se verificó una mejora objetiva de assets SVG; no se añadió atribución dudosa.
- Tema claro/oscuro con preferencia de sistema como valor inicial y elección guardada en `localStorage.ajedrez_theme`. No guarda identidad ni estado de partida. ADR-016 y `02`/`06` actualizados.
- Animaciones limitadas a hover/active, apertura de diálogo, llegada de piezas existente y pulso breve de conexión; movimiento reducido las desactiva.
- Playwright final: Enter abre lobby; crear/cancelar sala y foco; dos contextos crean, ven y juegan A/B, incluyendo indicador de captura y `exd5` sincronizado; modo bot responde tras `e4` y abandono muestra resultado; caída WS presenta espera y recarga recupera identidad/partida. Consola JS limpia en contextos estables.
- Responsive final: entrada, lobby, diálogo, espera, partida y resultado sin overflow a 1440/1024/768/390/320 px; banner de desconexión sin overflow a 320 px. Tablero: 624/624/480/349/279 px; en 320 px, casillas de 35 px. Preferencia oscura por sistema y elección persistida comprobadas; foco del diálogo regresa al activador.
- Contraste medido en navegador: texto principal 12.37:1 claro y 14.75:1 oscuro; control de tema 14.09:1; coordenada sobre casilla oscura 4.65:1 en ambos temas. Los marcadores de captura se distinguen por anillo y contorno.
- Revalidación: build Vite/Compose correcta; `backend npm test` 57/57; `/api/health` 200 con backend/PostgreSQL disponibles; DB healthy, `docker compose config --quiet` y `git diff --check` correctos.
- Esta es auditoría visual/heurística y verificación técnica; no es resultado del estudio con estudiantes. La limitación metodológica y el cierre aceptado se registran al inicio de este documento.

## Estado histórico — Fase 7 — 2026-10-15

**Fase 7: COMPLETADA — 2026-10-15.** El modo privado contra bot reutiliza el dominio autoritativo y archivo existente. No se avanzó a Fase 8.

- [x] El checkpoint llamado Fase 6 ya contenía `bot.js`, integración, UI y tests; la documentación aún los marcaba pendientes. Se conservaron, auditaron y verificaron; se corrigió suscripción WebSocket perdida y se añadió cobertura para defender una dama amenazada.
- [x] Lobby inicia partida privada directamente; humano blancas y bot negras. El bot se representa como `Bot`, sin sesión/cookie ficticia.
- [x] `backend/src/bot.js` usa `chess.js` 1.4.0 para legalidad, copia/reproducción del historial, movimientos, undo y estados terminales. Minimax busca dos medias jugadas con evaluación material, desempate determinista, alpha-beta, límite 300 ms/5000 nodos y trabajador con timeout de 2 s.
- [x] Servidor aplica candidato solo si gameId/revisión/turno/estado/conexión siguen vigentes y vuelve a validar con chess.js. Un request duplicado no inicia otro cálculo. Hasta dos workers corren en paralelo; abandono y desconexión invalidan el resultado tardío.
- [x] `/ws` emite snapshots de `botThinking`, posición y finalización. Se corrigió referencia al socket activo: antes, juego iniciado con socket abierto no enviaba `game:subscribe`; el navegador quedaba mostrando “El bot está pensando…” aunque el servidor ya había movido.
- [x] Archivo existente `games`/`moves` conserva modo `bot`, nombre `Bot`, resultado y todas las jugadas SAN; no se añadió esquema ni dependencia.
- [x] `backend npm test`: 57/57 correctos. Incluye jugada legal, captura, defensa de dama amenazada, mate en uno, evitar mate inmediato, promoción, terminales, revisión del bot, recuperación y archivo.
- [x] `frontend npm run build`: correcto. `docker compose config --quiet` y `docker compose up -d --build`: correctos; web publicado `0.0.0.0:8080`, backend/DB sin puertos host, PostgreSQL healthy. `/api/health`: 200, backend y DB disponibles.
- [x] Playwright en contexto independiente cubrió entrada, bot directo, orientación blanca, e2-e4, dos respuestas automáticas legales, siguiente movimiento humano, refresh con misma partida/FEN/historial/revisión y abandono; PostgreSQL guardó resultado `0-1`, motivo `resignation`, nombre `Bot` y 4 medias jugadas. Snapshot mostró estados `botThinking: true/false`; consola limpia.
- [x] Playwright a 390/320 px: `scrollWidth` 375/305 y tablero 343/273 px, sin desbordamiento. Tests existentes conservan flujos humanos A/B, recuperación, sesiones, salas y archivo.
- [x] Medición worker en 20 posiciones (9 apertura, 5 medio juego, 6 final): mínimo/mediana/máximo por grupo 52.7/83.9/153.5 ms, 43.8/58.7/77.1 ms y 40.8/51.1/72.9 ms; cero límites/fallback. Referencias apertura/medio juego/táctica: 47.5/98.9/27.7 ms en búsqueda local.
- [x] README, árbol, ADR-009 y estrategia/progreso de bot actualizados. No se implementaron Stockfish, Fase 8 ni funcionalidad fuera de alcance.

### Límites de Fase 7

- Minimax tiene horizonte de dos medias jugadas, dificultad fija y como máximo dos búsquedas simultáneas; no pretende juego competitivo.
- Medición hecha en el equipo actual; hardware distinto puede tardar más. Al reiniciar backend se pierden partidas activas según decisión vigente.
- La prueba Playwright de modo bot usó un navegador contra el worker del backend, no un segundo usuario humano. Los flujos humano vs humano pasan por regresión automatizada backend/WS.

## Estado histórico — Fase 6 — 2026-10-15

**Fase 6: COMPLETADA — 2026-10-15.** Recuperación temporal de salas y partidas, reconexión WebSocket y archivo de timeout verificados. No se avanzó a Fase 7.

- [x] Gracia backend única de 60 s desde detección del socket; ping/pong cada 10 s. Estado de recovery y timers aislados del dominio `chess.js`.
- [x] Partida pausa al desconectar a cualquiera. Snapshots incluyen presencia/deadline; API rechaza movimientos/destinos legales con `GAME_PAUSED`.
- [x] Misma cookie recupera sala y snapshot oficial. Refresh mantiene identidad, color, FEN, turno y último movimiento. La pestaña nueva sustituye socket anterior con aviso y cierre 4001.
- [x] Anfitrión de sala esperando queda oculto del lobby durante gracia; reconexión restaura la misma sala y timeout la elimina. Sesión distinta no puede reclamar asiento.
- [x] Al vencer partida: rival gana con motivo `disconnect`; ambos ausentes producen `interrupted` sin ganador. Se archiva por transacción existente; regreso tardío muestra estado final, no revive partida.
- [x] `backend npm test`: 46/46 correctos. Incluye heartbeat, pausa/reanudación, sockets reemplazados, timeout, archivo, reingreso rechazado y eliminación de sala esperando. Tests inyectan grace reducido; PostgreSQL real archivó timeout como resultado `1-0`, motivo `disconnect`.
- [x] `frontend npm run build`, `docker compose config --quiet`, `docker compose up -d --build web`, `docker compose ps`: correctos; web `0.0.0.0:8080`, backend/DB sin port bindings de host, DB healthy.
- [x] `/api/health`: HTTP 200 con backend y PostgreSQL disponibles; Nginx conserva mismo origen `/api` y `/ws`.
- [x] Playwright A/B: pérdida WebSocket corta y reintento; rival ve banner de desconexión; intento de jugada devuelve `409 GAME_PAUSED`; reconexión elimina banner y ambos ven el mismo snapshot. Sin `pageerror`.
- [x] Playwright: anfitrión esperando se desconecta, sala desaparece del lobby y vuelve tras reconectar. Invitado entra; tras e2-e4/e7-e5, refresh conserva negras, peón en e5 y misma posición A/B.
- [x] Playwright: sala esperando permanece oculta y expira tras 60 s; observador sigue sin verla y anfitrión vuelve al lobby. UI muestra aviso de expiración recibido después del snapshot vacío.
- [x] Playwright timeout de 60 s: rival vio victoria por desconexión; archivo indicó guardado; jugador tardío recibió partida finalizada sin reactivarla; movimientos permanecieron bloqueados. Sin `pageerror`.
- [x] Playwright con cookie inválida simulando reinicio mostró “El servidor se reinició o tu sesión terminó; la partida no puede recuperarse. Vuelve a entrar.” y pantalla de entrada. HTTP 410 esperado aparece en consola; sin error JavaScript.
- [x] No se añadieron dependencias, tablas ni almacenamiento durable. README, protocolo, ADR-013/015, árbol y progreso actualizados.

### Límites de Fase 6

- Playwright verificó caída corta, recuperación, sala esperando, refresh y timeout real de 60 s. Pruebas backend también inyectaron grace reducido; integración archivó un timeout en PostgreSQL real.
- No se hizo un corte físico de Wi-Fi/LAN. Playwright cerró el WebSocket del navegador y emuló offline; el heartbeat cubre cierres silenciosos.
- Reiniciar backend pierde sesiones, salas, partidas activas y timers. No se implementa recuperación durable.

## Histórico — Fase 5 — 2026-10-15

**Fase 5: COMPLETADA — 2026-10-15.** Tablero integrado y flujo humano A/B verificados según `12_ROADMAP.md`.

- [x] React renderiza tablero 8×8 desde FEN del servidor. `game.you`, derivado de la sesión autenticada, fija orientación y color; blanco abajo para blancas, negro abajo para negras.
- [x] Casillas con labels accesibles y navegación de foco por flechas; selección por click/tap/Enter, destinos legales por API, anillos de captura, último movimiento, turno, jaque y resultado textual.
- [x] Promoción muestra dama/torre/alfil/caballo. Playwright con FEN preparado y APIs interceptadas seleccionó caballo por teclado, envió `promotion=n`, mostró ♞ y restauró foco a a8. Reglas reales de promoción siguen cubiertas por tests backend de Fase 4.
- [x] Confirmación de abandono enfoca “Continuar jugando”; Escape cancela. Resultado ofrece volver al lobby; tras salida de ambos, el lobby permite crear otra sala.
- [x] Un WebSocket `/ws` por app recibe `game:subscribe`; backend verifica pertenencia y difunde snapshots personalizados a ambos después de movimientos/abandono. Comandos de dominio siguen HTTP; backend y `chess.js` conservan autoridad.
- [x] `backend npm test`: 33/33 correctos, incluyendo snapshots WebSocket A/B, identidad de color por sesión y salida de sala terminada sin borrar otra sala nueva del participante.
- [x] `frontend npm run build`: correcto. `docker compose config`, `docker compose up -d --build`, `docker compose ps` correctos; web/backend activos y PostgreSQL healthy.
- [x] `http://localhost:8080/api/health`: `200 {"backend":"available","database":"available"}`; `pg_isready` confirmó PostgreSQL. Puerto web `0.0.0.0:8080`; backend y DB sin puertos host.
- [x] Playwright con contextos independientes A/B cubrió entrada, crear/unir, orientación, 64 casillas, turno fuera de orden bloqueado, e2-e4, e7-e5, captura e5xd4, abandono confirmado, ambos resultados sincronizados y mate con mensaje de jaque/ganador. Sin errores de consola ni `pageerror`.
- [x] Playwright probó el caso de ciclo: host abandona, crea sala nueva mientras rival aún está en sala terminada, el rival sale y se une a la sala nueva; ambas sesiones siguen ligadas correctamente.
- [x] Playwright verificó enroque rey+torre, en passant con marcador de captura sobre d6 vacío y peón retirado de d5. Promoción probada con fixture preparado.
- [x] Viewports 1440, 1024, 390 y 320 px; 390: `scrollWidth=375`, tablero 343 px. 320: `scrollWidth=305`, casilla 33.625 px. Focus visible; `prefers-reduced-motion: reduce` elimina animación.
- [x] Sin librerías ni assets externos nuevos, tablero de reglas cliente, PostgreSQL por jugada, bot u otra función posterior. README, árbol, arquitectura, protocolo, decisión ADR-005 y este progreso actualizados.

### Límites y pruebas de Fase 5

- Interfaz de promoción usó snapshot y respuestas de prueba preparados por Playwright; legalidad y motor de promoción real se cubren en `games.test.js`/`games-api.test.js` de Fase 4.
- La recuperación de WebSocket tras cortes, presencia/heartbeat y gracia de desconexión siguen en Fase 6. Cerrar pestaña no abandona la partida automáticamente.
- Piezas usan glifos Unicode chess de fuentes del sistema; su forma puede variar ligeramente entre dispositivos.

## Histórico — Fase 4 — 2026-10-15

**Fase 4: COMPLETADA — 2026-10-15.** Dominio de partida autoritativo y archivo final verificados según el roadmap.

- [x] Dependencia fijada `chess.js` 1.4.0; `Chess` del servidor decide legalidad, FEN, SAN, promoción, enroque, captura al paso, jaque, mate y tablas.
- [x] Al unirse el segundo jugador, la sala `ready` asocia una partida en memoria: anfitrión/blancas, invitado/negras; blancas mueven primero.
- [x] API HTTP autenticada obtiene snapshot, destinos legales, aplica movimientos, revisa turno/revisión y repite `requestId` idéntico sin duplicar.
- [x] Snapshot incluye FEN, historial SAN, último movimiento, check, turno, resultado y revisión. No expone sesiones ni motor mutable.
- [x] Resultado terminal archiva nombres, motivo, FEN y movimientos SAN en `games`/`moves` con transacción; reintenta cada 10 segundos si falla.
- [x] `backend npm test`: 31 pruebas correctas en cierre de Fase 4, incluyendo API, duplicados, identidad, movimientos y archivo transaccional.
- [x] Compose, `/api/health`, PostgreSQL y verificación Fase 1 LAN seguían operativos.
- [x] No se añadieron tablas para salas/sesiones; el tablero visual y la sincronización WS se reservaron para Fase 5.

### Límites de Fase 4

- Partidas activas vivían en memoria. Reiniciar backend las elimina; un archivo aún pendiente de reintento también se pierde.
- La salida visual de sala no tenía confirmación ni resultado visible; el dominio ofrecía `POST /api/games/:id/resign`.

## Histórico — Fase 3 — 2026-10-15

**Fase 3: COMPLETADA — 2026-10-15.** Salas humanas, sala lista e interacción en vivo verificadas según `12_ROADMAP.md`.

- [x] Salas en memoria, ID UUID opaco, host/invitado ligados a cookie de sesión; el cliente no envía autoridad ni recibe IDs de sesión.
- [x] Crear con nombre 2–40 y prellenado; listado solo de salas esperando; unión valida capacidad al mutar; cupo máximo de dos.
- [x] Sala lista al entrar invitado; anfitrión blancas e invitado negras. No hay tablero ni reglas.
- [x] Invitado puede salir y libera cupo; anfitrión cancela sala esperando o sale para eliminarla. Un invitado recibe aviso si el anfitrión cierra sala lista.
- [x] API HTTP maneja autenticación, validación y errores tipados. WebSocket same-origin `/ws` autentica cookie y `Origin` y publica snapshots de lobby/sala.
- [x] `backend npm test`: 14 pruebas correctas, incluidas API, auth, capacidad, carrera por último lugar, identidad, abandono y cancelación.
- [x] `frontend npm run build`: correcto.
- [x] `docker compose config` y `docker compose up -d --build`: correctos. `docker compose ps`: web/backend activos y PostgreSQL healthy.
- [x] `/api/health`: `200 {"backend":"available","database":"available"}`; PostgreSQL ejecutó `SELECT 1`.
- [x] Web publicado en `0.0.0.0:8080`; backend `3000/tcp` y PostgreSQL `5432/tcp` sin puertos host.
- [x] Tabla PostgreSQL `rooms` no existe (`to_regclass('public.rooms') IS NULL`).
- [x] Playwright con tres contextos aislados cubrió crear, espera, lobby vivo, unirse, tercer usuario rechazado, salida, cancelación, estado vacío, recarga y ausencia de IDs en UI.
- [x] Playwright comprobó loading/desactivación, Escape y retorno de foco del diálogo, error legible HTTP 409, colores/nombres y viewports 390/320 px sin desborde horizontal.
- [x] Playwright simuló cierre WebSocket: aparece “Reconectando al lobby…”, mantiene lista legible y reintenta sin error JavaScript.
- [x] Sin errores JavaScript. Chromium informó un recurso HTTP 409 esperado al probar que el tercer usuario no entra.
- [x] `/api/health`, frontend servido por Nginx y proxy HTTP/WS same-origin verificados tras el cambio.
- [x] README, árbol, ADR-005/008 y este progreso actualizados. No se creó esquema ni funcionalidad de fase posterior.

### Evidencia y límites de Fase 3

- Escenario A/B/C: A creó “Prueba LAN”; B y C vieron la sala. B entró y ambos vieron la sala lista con anfitrión/blancas e invitado/negras. C intentó unirse con una lista deliberadamente obsoleta; backend respondió `409 ROOM_FULL`, UI explicó que estaba completa y la sala mantuvo dos jugadores.
- Salida: B salió, A volvió a espera; A canceló y la sala desapareció. Una segunda prueba recargó ambos contextos mientras estaban listos; ambos conservaron nombre y rol. Cookie HttpOnly no fue visible a JavaScript.
- Salida del anfitrión listo: Playwright confirmó eliminación, regreso del invitado al lobby con aviso y lista vacía.
- Responsive: viewport 390 px produjo `scrollWidth 375`; viewport 320 px produjo `scrollWidth 305`; ambos menores al ancho del viewport.
- Consola: camino normal y recarga sin errores; una respuesta 409 esperada genera aviso de recurso fallido de Chromium, capturada también como feedback comprensible.
- La prueba de tres usuarios usó contextos aislados en Playwright, no tres equipos físicos. No se repitió desde un segundo dispositivo LAN en esta fase.
- Una pestaña cerrada sin `Salir`/`Cancelar` no libera la sala; esta fase no implementa expiración automática de desconexión.

## Estado histórico — Fase 2 — 2026-10-15

**Fase 2: COMPLETADA — 2026-10-15**, según el alcance y la aceptación de `12_ROADMAP.md`.

- [x] Entrada temporal con nombre visible de 2–24 caracteres; servidor recorta espacios y rechaza vacío, longitudes inválidas y caracteres de control.
- [x] Identidad aleatoria de sesión separada del nombre; cookie `HttpOnly`, `SameSite=Lax`; sesión en memoria con expiración tras dos horas inactivas. Recargar conserva sesión mientras siga válida.
- [x] Lobby con identidad, carga, lista vacía, error recuperable y acciones futuras deshabilitadas con explicación.
- [x] Accesibilidad básica: label, botones semánticos, Enter, foco visible, headings, mensajes `status`/`alert`, estados disabled y diseño móvil.
- [x] `npm test`: 2 pruebas correctas. Build frontend correcto.
- [x] `docker compose config` y `docker compose up -d --build`: correctos; `docker compose ps` mostró web, backend y PostgreSQL activos, DB healthy.
- [x] `/api/health` respondió `200` con backend y PostgreSQL disponibles; `SELECT 1` pasó en PostgreSQL.
- [x] Web sigue publicado en `0.0.0.0:8080`; backend y PostgreSQL siguen sin puertos host.
- [x] Playwright probó entrada vacía bloqueada, nombre recortado y Enter, lobby vacío, recarga con sesión, cookies/identidades separadas en dos contextos, error comprensible, foco, mismo origen y ancho móvil sin desbordamiento. Consola limpia en camino feliz; sin errores JavaScript. La respuesta 503 inducida para probar error produjo solo el aviso de recurso HTTP esperado en Chromium.
- [x] No se implementó creación/unión de salas ni bot. El prompt los enumeraba entre criterios, pero el roadmap vigente asigna salas a Fase 3 y bot a Fase 7; esos límites se conservaron. Las acciones aparecen deshabilitadas y explicadas.
- [x] README, árbol, decisión ADR-003 y este progreso actualizados. No se añadieron dependencias.

### Evidencia y límites de Fase 2

- API: sesión anónima sin cookie devuelve `200 null`; nombre vacío devuelve `400` con texto comprensible; dos contextos independientes recibieron cookies distintas; cada uno listó cero salas.
- Navegador: Playwright cubrió escritorio y viewports móviles de 390 y 320 px; no hubo desbordamiento horizontal. Una respuesta 503 inducida confirmó mensaje recuperable sin exponer el cuerpo técnico del servidor.
- No se probó creación/unión concurrente ni una partida contra bot: pertenecen a fases posteriores. La prueba externa desde un dispositivo LAN aprobó Fase 1; no se repitió en esta fase porque el proxy y puerto no cambiaron.

## Estado histórico — Fase 1 — 2026-10-15

**Fase 1: COMPLETADA — 2026-10-15.** Compose, servicios, proxy, navegador, puerto 8080 y prueba LAN desde un celular quedaron verificados.

- [x] React servido por Nginx, API de salud y consulta PostgreSQL implementados.
- [x] `docker compose config` y `docker compose build` completados.
- [x] Backend respondió `200` con PostgreSQL disponible; `SELECT 1` pasó dentro del contenedor.
- [x] Nginx entregó frontend y proxy de mismo origen en `localhost:18080`; IPv4 LAN `192.168.1.15:18080` respondió desde el mismo equipo.
- [x] Backend y PostgreSQL sin puertos host publicados; solo web publicado y enlazado a `0.0.0.0` en prueba.
- [x] Playwright confirmó estados disponibles, estado degradado claro con backend detenido, recuperación al reiniciarlo y cero errores de consola.
- [x] Nginx usa resolución DNS dinámica para seguir sirviendo frontend si backend no está disponible al inicio.
- [x] README, árbol real y este registro actualizados. No hubo decisión de alcance nueva; ADR-011 ya propone origen único y base de datos interna.
- [x] `docker compose config` y `docker compose up -d --build` pasan; web publica `0.0.0.0:8080->80`.
- [x] `http://localhost:8080` y `/api/health` responden `200`; backend informa PostgreSQL disponible.
- [x] Playwright confirma frontend, backend, PostgreSQL y solicitud de salud en el mismo origen; cero errores de consola.
- [x] Backend y PostgreSQL no publican puertos host.
- [x] Git local inicializado sin remoto; `.gitignore` excluye secretos locales, dependencias, builds y artefactos de herramientas.
- [x] El usuario confirmó que `http://192.168.1.15:8080` carga desde un celular en la misma LAN y muestra frontend, backend y PostgreSQL disponibles.

### Evidencia de Fase 1

#### Cierre final — 2026-10-15

- El usuario confirmó desde su celular en la misma LAN que `http://192.168.1.15:8080` carga y muestra frontend, backend y PostgreSQL disponibles.
- Con esa prueba externa, se cumplen los criterios de aceptación de Fase 1. Fase 1 queda cerrada; Fase 2 no se inicia.

#### Primera ejecución — 2026-10-15 (histórico)

- Revalidación de cierre, 2026-10-15: `docker compose config`, `docker compose up -d --build` y `docker compose ps` pasaron. `web` publica `0.0.0.0:8080->80`; backend y DB siguen internos.
- `http://localhost:8080` y `http://localhost:8080/api/health` respondieron `200`; respuesta: `{"backend":"available","database":"available"}`. `SELECT 1` también pasó en PostgreSQL.
- Playwright abrió `http://localhost:8080`; mostró los tres servicios disponibles. `/api/health` cargó desde `http://localhost:8080`; cero errores de consola.
- IPv4 Ethernet actual: `192.168.1.15`. URL para otro equipo: `http://192.168.1.15:8080`. No se modificó firewall; falta prueba desde segundo dispositivo.
- Git local inicializado en `.git`, sin remoto ni push. `.gitignore` conserva `.env.example` y excluye `.env*` (salvo el ejemplo), `node_modules`, `dist`, `.playwright-mcp` y `.serena`. Estado revisado; no hay cambios staged.

- Serena 1.7.0 activó `ajedrez`; estado de servidor de lenguaje: `ready` (PowerShell).
- `docker compose config`: correcto; publicó solo `web:80` como `0.0.0.0:8080` según configuración.
- `docker compose build`: correcto; frontend Vite compiló y backend instaló dependencias sin vulnerabilidades reportadas.
- `docker compose up -d`: PostgreSQL y backend iniciaron, pero web falló porque `0.0.0.0:8080` ya pertenecía a `sesa_web`. No se detuvo el contenedor ajeno.
- Con override temporal fuera del repositorio, el stack arrancó en `18080`. Inspect confirmó `web` en `0.0.0.0:18080`, backend solo `3000/tcp` y database solo `5432/tcp`.
- `/api/health` devolvió `200 {"backend":"available","database":"available"}`; `psql` ejecutó `SELECT 1` correctamente.
- Playwright abrió la página en `http://localhost:18080`, vio backend y base de datos disponibles, y no registró errores de consola. La página también respondió por `http://192.168.1.15:18080` desde el propio anfitrión.
- Con backend detenido, Nginx siguió sirviendo la página; API devolvió `502`, frontend mostró backend no disponible, base de datos sin respuesta y una alerta comprensible. Reiniciar backend restauró ambos estados a disponible.
- El primer fallo reveló DNS upstream estático: Nginx no arrancaba con backend ausente. Se cambió a `resolver 127.0.0.11` y `proxy_pass` con variable; build y prueba degradada pasaron después.
- `git status` y `git diff` no se pudieron ejecutar porque no existe `.git`. El escaneo no encontró `.env`; las únicas credenciales son valores de demostración ya documentados en Compose y `.env.example`.
- El acceso LAN se probó solo desde el equipo anfitrión; el firewall no se modificó. No se verificó desde un segundo equipo.

## Cierre de fase 0 — 2026-10-15 (registro histórico)

**Fase 0: especificación redactada; pendiente de revisión humana.** No hay aplicación, componentes, backend, SQL real, WebSockets implementados ni bot. No se autoriza fase 1 por completar estos documentos.

- [x] Lectura completa de AGENTS, README, estrategia de modelos, árbol, docs, setup y prompts.
- [x] Inspección de estructura completa, incluido ejemplo de configuración oculto.
- [x] Auditoría crítica y reorganización dentro de documentos existentes.
- [x] Producto, alcance, pantallas, tablero, accesibilidad y evaluación definidos.
- [x] Arquitectura, contratos conceptuales, datos, bot, riesgos y fases descritos.
- [x] Propuestas registradas sin convertirlas en decisiones aceptadas.
- [ ] Responsable revisa y aprueba MVP y ADR-003–014.
- [ ] Se resuelven pendientes propios de fase 1 al planificarla.
- [ ] Responsable autoriza comenzar fase 1.

## Auditoría del material inicial

La base describía correctamente propósito y stack, pero era un starter con decisiones abiertas, no una especificación lista para implementar. No existían decisiones aceptadas incompatibles entre sí; sí ambigüedades que podían producir implementaciones diferentes.

| Hallazgo inicial | Riesgo | Corrección / ubicación |
|---|---|---|
| Inicio “manual o automático según diseño” | Flujos y pruebas distintos | Proponer inicio automático, colores fijos: `03`, ADR-008 |
| Opciones de sala y dificultad sin decidir | Formularios innecesarios | Solo nombre de sala; bot fijo: `01`, `06`, `10` |
| Modelo de cuatro entidades candidatas | Persistir cuentas/salas sin necesidad | Dos tablas de archivo; resto memoria: `08`, ADR-007 |
| Recuperar estado sin definir FEN/historial | Perder repetición y prometer recuperación inexistente | Historial completo y límite tras reinicio: `08`, `09` |
| Lista de eventos “candidatos” sin contrato | Duplicar HTTP/WS y confirmaciones ambiguas | Contratos, snapshot, revisión y requestId: `07`, `09` |
| Reconexión “si la librería permite” | Interfaz bloqueada o sesión duplicada | Cliente con reintento explícito, gracia y control de pestaña: `09` |
| Reglas especiales agrupadas sin criterios | Omitir al paso, promoción o tablas | RF-033/034 y política casual visible: `04` |
| “Tiempo razonable” y “contraste suficiente” | Imposible verificar aceptación | Metas y pruebas medibles: `02`, `05`, `10` |
| Cinco pantallas, crear sala como pantalla | Navegación extra | Cuatro pantallas y diálogos: `06` |
| Accesibilidad/pulido al final | Tablero difícil de corregir | Teclado/foco y feedback en primera versión: `02`, `12` |
| Bot solo comparación de alternativas | Implementador debe elegir alcance | Minimax acotado y criterios de defensa: `10`, ADR-009 |
| Prueba UX sin guion, metas o sesgos | Evidencia no comparable | Tareas, registro, consentimiento y comparación: `11` |
| Ejemplo de porcentajes de mejora | Confundir ejemplo con hallazgo real | Retirar resultados numéricos ficticios: `11` |
| Instrucción de implementar siguiente fase automáticamente | Comenzar antes de aprobar especificación | Puerta explícita y una fase por encargo: prompts y `12` |
| Árbol incompleto y raíz starter distinta | Confusión entre estructura actual y futura | Árbol actual y propuesta separados: PROJECT_TREE |
| Instalación Serena duplicada en dos guías | Deriva de instrucciones | Centralizar rol en CODEX_TOOLS; SERENA enlaza allí |
| Comandos de herramientas tratados como instalación actual | Confundir guía antigua con entorno verificado | Setup documental sin instalación ni versiones aseguradas |

No se crean documentos paralelos de personas, diseño o auditoría: quedan dentro de los responsables existentes. Ningún documento completo resulta prescindible tras delimitar funciones; se eliminan duplicaciones internas en lugar de borrar evidencia útil. AGENTS conserva reglas del agente.

## Registro de trabajo — 2026-10-15

- Cambios: reescritura especializada de los 15 documentos de docs; alineación de README, árbol, modelos, prompts y guías Markdown de setup.
- Investigación: Context7 para chess.js, ws y red Docker; fuentes W3C para contraste, objetivos y navegación de cuadrícula.
- Verificación: lectura y revisión documental; inventario y referencias locales comprobados al cierre. Sin pruebas de aplicación, navegador, arranque, instalaciones o mediciones de UX.
- Decisiones: ADR-001/002 aceptadas existentes conservadas; ADR-003–014 propuestas. Ninguna aprobación humana inferida.
- Pendiente: revisión del responsable, aceptación de políticas y autorización separada de fase 1.

## Plantilla futura de evidencia de iteración

Completar con datos observados, sin ejemplos que aparenten resultados:

| Hallazgo ID | Versión / tarea / participante anónimo | Necesidad y observación | Requisito | Cambio | Reevaluación y resultado |
|---|---|---|---|---|---|

Registrar también problemas no resueltos y razones. No usar esta tabla como sustituto de métricas por participante/tarea de `11`.

## Registro futuro de fases

Por fase: fecha, autorización que aplica, requisitos cubiertos, archivos, comandos y resultados de pruebas, evidencia de navegador/LAN, decisiones nuevas, límites y siguiente fase pendiente. Solo marcar completa después de evidencia correspondiente. Una fase no se considera autorizada por aparecer en el roadmap.

## Comprobación documental de cierre — 2026-10-15

- Inventario: 28 archivos existentes; 26 Markdown, un ejemplo TOML y un script PowerShell. No se crearon carpetas ni archivos de producto.
- Comprobación automática: 13 enlaces Markdown locales resueltos, cero destinos inexistentes; bloques delimitados de código/diagramas balanceados. No se comprobaron enlaces externos de todas las guías ni renderizado Mermaid en una aplicación.
- Revisión de estados: solo ADR-001/002 conservan aceptación; doce decisiones nuevas siguen propuestas. No hay resultados UX inventados ni marcadores TODO/TBD en docs.
- Revisión de cobertura de encargo: auditoría (`14`); producto y tipos (`00`); alcance (`01`); flujos (`03`); pantallas, tablero y diseño (`06`); accesibilidad (`02`); métricas y usabilidad (`11`); arquitectura (`07`); datos y autoridad (`08`); multijugador (`09`); bot (`10`); estructura (PROJECT_TREE); roadmap y terminado (`12`); riesgos (`05`).

## Archivos modificados en fase 0

Solo los siguientes 25 archivos Markdown:

- README.md
- MODEL_STRATEGY.md
- PROJECT_TREE.md
- docs/00_VISION.md
- docs/01_SCOPE.md
- docs/02_UX_PRINCIPLES.md
- docs/03_USER_FLOWS.md
- docs/04_FUNCTIONAL_REQUIREMENTS.md
- docs/05_NON_FUNCTIONAL_REQUIREMENTS.md
- docs/06_UI_STATES.md
- docs/07_ARCHITECTURE.md
- docs/08_DATA_MODEL.md
- docs/09_REALTIME_MULTIPLAYER.md
- docs/10_BOT.md
- docs/11_TESTING_AND_UX_EVALUATION.md
- docs/12_ROADMAP.md
- docs/13_DECISIONS.md
- docs/14_PROGRESS.md
- prompts/00_ASTRA_PROJECT_ANALYSIS.md
- prompts/01_IMPLEMENTATION_PHASE.md
- prompts/02_UX_REVIEW.md
- setup/CODEX_TOOLS.md
- setup/PREREQUISITES_WINDOWS.md
- setup/SERENA.md
- setup/VERIFY_TOOLS.md

AGENTS.md sigue siendo la fuente de reglas del agente. No se modificaron su contenido, el script auxiliar ni el ejemplo de configuración.
