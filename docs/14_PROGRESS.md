# 14 — Progreso, auditoría y evidencia

## Estado actual — Fase 2 — 2026-10-15

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
