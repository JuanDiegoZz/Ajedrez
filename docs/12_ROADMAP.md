# 12 — Roadmap y criterio de terminado

## Regla de ejecución

Fase 0 termina con revisión humana. No iniciar fase 1 hasta aprobación explícita de especificación, propuestas de `13` y autorización de implementación. Después implementar una fase por encargo; actualizar `14` y detenerse al cerrar cada fase. No generar ahora código, manifiestos ni migraciones.

La progresión integra reglas con tablero y accesibilidad desde su primera aparición. No pospone legalidad hasta después de un tablero engañosamente funcional, ni errores y reconexión hasta después de llamar terminado al multijugador.

## Fases pequeñas y verificables

| Fase | Objetivo y entregable | Aceptación y prueba | Documentos principales |
|---|---|---|---|
| 0 — Especificación | Documentos coherentes, alcance y propuestas revisables | Auditoría cerrada; revisión y aprobación humana pendientes antes de avanzar | Todos; estado en `14` |
| 1 — Arranque LAN | Estructura mínima, React vacío con estado de servicio, backend, PostgreSQL y Compose | Arranque limpio; conexión DB; otro equipo abre URL; solo web expuesto; fijar dependencias verificadas y lockfile | `07`, `13`, README y setup |
| 2 — Entrada y lobby | Sistema visual mínimo, sesión real y lobby vacío | Nombre válido/inválido, recarga de sesión, carga/vacío/error, teclado y responsive probados en navegador | `02`, `04`, `06` |
| 3 — Salas e inicio | Crear/unir/cancelar y lobby vivo por WebSocket; partida inicial sin interacción aún | Dos contextos ven misma sala; carrera no admite tercero; inicio automático con colores, error de conexión visible | `03`, `09` |
| 4 — Dominio de partida | Servicio autoritativo con chess.js, comandos, revisión, resultados y archivo PostgreSQL | Pruebas de legalidad, especiales, duplicados, terminales y transacción; sin exigir UI todavía | `04`, `08`, `09` |
| 5 — Tablero integrado | Primer flujo completo humano: selección, destinos, capturas, promoción, historial, animación y resultado | Dos navegadores juegan y abandonan; servidor valida; teclado, foco, orientación y movimiento reducido; E2E de flujo principal | `02`, `03`, `06`, `11` |
| 6 — Recuperación | Heartbeat, gracia, snapshot, pestaña reemplazada y fallos de guardado | Corte temporal y definitivo de red; sin jugadas duplicadas; caída/reinicio con mensajes honestos; ensayo LAN | `05`, `08`, `09` |
| 7 — Bot | Modo privado con estrategia acotada y misma UX | Legalidad, defensa inmediata, mate en uno, presupuesto, lobby sin bloqueo y cancelación tardía | `10`, `11` |
| 8 — Evaluación e iteración — **COMPLETADA** | Auditoría heurística, iteraciones visuales A/B y regresión técnica | Hallazgos vinculados a cambios y verificaciones documentados en `14`. La evaluación comparativa formal con aproximadamente cinco estudiantes no se realizó; queda aceptada como limitación metodológica, sin métricas humanas inventadas | `02`, `11`, `14` |
| 9 — Cierre y demo — **COMPLETADA** | Revisión final, instrucciones, guion, checklist y contingencia | Tests, build, Compose, salud DB/API, demo A/B/bot/refresh, temas, accesibilidad y responsive verificados; límites y evaluación humana ausente documentados | README, `15`, `14` |

Cada fase deja un entregable comprobable. Fases 3–4 no se presentan como aplicación completa. Si una fase resulta demasiado grande al planificar código, dividir dentro de su responsabilidad, sin abrir la siguiente ni añadir funciones.

## Puerta de cada fase

- Leer requisitos y decisiones aplicables; describir cambio mínimo y archivos afectados.
- Consultar Context7 si se usa API actual de dependencia.
- Implementar solo lo autorizado, con errores y accesibilidad correspondientes.
- Ejecutar pruebas apropiadas y navegador cuando haya interfaz; registrar comandos y resultados reales.
- Actualizar documentación y progreso; no marcar aprobado por ausencia de respuesta.

## Proyecto terminado: checklist verificable

- [ ] Todos los RF imprescindibles de `04` tienen evidencia y los RNF de `05` están medidos.
- [ ] Dos equipos LAN completan entrada, sala, movimientos sincronizados, abandono/resultado y vuelta al lobby.
- [ ] Bot legal y acotado completa flujo, sin bloquear otras sesiones.
- [ ] Enroque, captura al paso, promoción, jaque, mate y política de tablas tienen pruebas de integración.
- [ ] Duplicados, carreras, reconexión, pérdida de sesión y fallos de archivo tienen comportamiento comprobado.
- [ ] Partida finalizada y movimientos se conservan en PostgreSQL tras reinicio; partidas activas no se prometen recuperables.
- [ ] Teclado, foco, contraste real, etiquetas, movimiento reducido y ancho 320 px se revisan manualmente y con navegador.
- [x] Evaluación heurística, mejoras iteradas y verificación documentadas. La evaluación comparativa con aproximadamente cinco estudiantes no se realizó y se registra como limitación metodológica aceptada; el protocolo de `11` queda disponible para posible trabajo posterior.
- [ ] Metas UX alcanzadas o desviaciones expresamente aceptadas y justificadas; sin problemas bloqueantes o serios sin resolver.
- [ ] Arranque desde copia limpia e instrucciones LAN reproducibles; sin secretos versionados.
- [ ] Decisiones, árbol real, instrucciones y evidencia actualizados; sin dependencias o funciones fuera de alcance.
- [ ] Responsable del proyecto revisa entregable y acepta cierre académico.

No basta compilar. No se requiere implementar opciones de `01` para terminar.
