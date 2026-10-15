# 13 — Registro de decisiones

## Autoridad y estados

Solo las decisiones **aceptadas** prevalecen sobre requisitos. “Propuesta” describe la recomendación de fase 0 y requiere revisión humana; no autoriza implementación. Aprobar especificación y autorizar fase 1 son pasos explícitos, registrados en `14`.

Las fechas históricas de ADR-001/002 no estaban documentadas y no se inventan. Nuevas propuestas fechadas 2026-10-15. Documentos especializados contienen detalle operativo; este registro mantiene motivo, alternativa y consecuencia.

## Decisiones aceptadas existentes

### ADR-001 — Alcance local y pequeño

- Estado: aceptada antes de esta auditoría; fecha original no registrada.
- Contexto: proyecto universitario para aproximadamente 2–5 personas en LAN, con prioridad UX.
- Decisión: arquitectura pequeña y comprensible, sin diseño de escala mundial.
- Razón: valor académico en interacción y evaluación.
- Descartado: microservicios, infraestructura de alta disponibilidad y escalado distribuido.
- Consecuencia: optimizar claridad y mantenimiento; las limitaciones locales se documentan.

### ADR-002 — Reglas mediante librería

- Estado: aceptada antes de esta auditoría; fecha original no registrada.
- Contexto: reglas especiales tienen complejidad ajena al foco UX.
- Decisión: usar librería madura, sin reimplementar reglas completas.
- Razón: reducir errores y liberar tiempo para interacción.
- Descartado: motor propio de reglas.
- Consecuencia: la dependencia concreta se propone en ADR-004.

### ADR-003 — Sesión temporal de entrada

- Estado: aceptada por autorización de implementación de Fase 2, 2026-10-15.
- Contexto: el usuario necesita un nombre visible sin crear una cuenta.
- Decisión: guardar sesiones en memoria con ID aleatorio opaco. `ajedrez_session` guarda solo ese ID en cookie `HttpOnly`, `SameSite=Lax`, `Path=/`, con `Max-Age=7200`; el nombre no es identificador ni credencial. No usa `Secure` porque el acceso aprobado es HTTP LAN.
- Razón: conservar la sesión tras recargar sin guardar secretos o agregar autenticación.
- Consecuencia: sesiones vencen tras dos horas sin actividad o al reiniciar backend. El navegador no guarda el nombre en `localStorage`.

### ADR-005 — WebSocket para lobby

- Estado: aceptada al autorizar Fase 3, 2026-10-15.
- Contexto: el roadmap exige que dos contextos vean cambios de sala sin recargar.
- Decisión: WebSocket nativo del navegador y `ws` en backend. `/ws` lleva solo suscripción y snapshots del lobby/sala; operaciones de sala siguen por HTTP.
- Razón: conservar el contrato pequeño y la autenticación de sesión del mismo origen.
- Descartado: Socket.IO y WebSocket para comandos de partida en esta fase.
- Consecuencia: Nginx proxya `/ws` same-origin con `Upgrade`; backend valida cookie y `Origin`. Se emite una lista completa para 2–5 personas.

### ADR-008 — Sala lista y colores fijos

- Estado: aceptada en el alcance de Fase 3, 2026-10-15.
- Contexto: la sala necesita indicar sin otro paso cuándo está completa.
- Decisión: la entrada del invitado cambia la sala a `ready`; anfitrión recibe blancas e invitado negras.
- Razón: feedback claro con menos decisiones y pasos.
- Descartado: botón “Listo” o selección de color.
- Consecuencia: esta fase anuncia que está lista y asigna colores; no inicia tablero ni reglas de ajedrez.

## Propuestas para revisión humana

Las propuestas restantes tienen fecha **2026-10-15**. ADR-003 se aceptó para Fase 2; ADR-005 y ADR-008 se aceptaron dentro del alcance de Fase 3.

| ID | Decisión propuesta | Razón y alternativa descartada | Consecuencia / detalle |
|---|---|---|---|
| ADR-004 | chess.js como reglas en servidor | Genera movimientos, valida, mantiene FEN/historial y detecta finales; no incluye IA. Descartar reglas propias | Versionar al implementar y probar integración. Destinos viajan al cliente. `04`, `07` |
| ADR-006 | Servidor autoritativo con snapshot completo, revisión y requestId | Evitar divergencia, doble envío y legalidad en cliente; descartar estado optimista como autoridad | Una mutación síncrona; historial completo para repetición. `08`, `09` |
| ADR-007 | Memoria activa; PostgreSQL solo archivo final, dos tablas | Sesiones/salas temporales no justifican tablas; descartar persistencia por jugada y recuperación durable | Games/moves en transacción; caída puede perder activos y archivo pendiente. `08` |
| ADR-009 | Bot minimax de dos medias jugadas, material y trabajador acotado | Considera respuesta rival; aleatorio no defiende, Stockfish excede alcance | Dificultad fija y defensa limitada al horizonte. `10` |
| ADR-010 | Cuatro pantallas y diseño accesible desde inicio | Crear sala/promoción/abandono caben en diálogos; descartar pantallas y librerías visuales adicionales | Teclado, foco y movimiento reducido obligatorios; CSS primero. `02`, `06` |
| ADR-011 | Un origen web en puerto LAN 8080, proxy API/WS y DB interna | Evita URLs localhost en clientes y CORS innecesario; descartar tres puertos públicos | Proxy con upgrade; pruebas reales de firewall/Wi-Fi. `07` |
| ADR-012 | Tablas automáticas según política simplificada | Evitar reclamaciones y arbitraje competitivo; descartar afirmar reglas FIDE completas | Repetición/50 movimientos automáticos, causa visible. `04` |
| ADR-013 | Gracia 60 s, pausa y snapshot; derrota por desconexión individual | Recuperación breve suficiente; descartar recuperación ilimitada o tras reinicio | Ambos ausentes: interrupción sin ganador. Bot se pausa. `09` |
| ADR-014 | Evaluación formativa con cinco estudiantes y comparación A/B iterativa | Evidencia de eficacia, eficiencia y satisfacción; descartar porcentajes ficticios y generalización estadística | Likert propio; SUS solo opcional. `11` |

## Pendientes de validación, responsables y momento

| Pendiente | Quién / cuándo | Cómo resolver sin ampliar alcance |
|---|---|---|
| Aprobar MVP y ADR-004, 006–007, 009–014 | Responsable del proyecto, antes de sus fases | Revisar propuestas y políticas de tablas/desconexión/pérdida de activos |
| Autorizar implementación | Responsable del proyecto, después de revisión | Registrar autorización explícita en `14` |
| Framework HTTP, cliente PostgreSQL y herramientas build/pruebas | Implementador, fase 1 | Context7, compatibilidad, costo mínimo; candidatos Express y SQL directo, sin ORM por defecto |
| Versiones y licencia de dependencias/piezas | Implementador, fases 1 y 5 | Verificar fuentes actuales, fijar lockfile y atribuciones; sin assets remotos obligatorios |
| Proxy estático concreto y puerto backend interno | Implementador, fase 1 | Elegir opción pequeña y documentar configuración verificada |
| Paleta y combinaciones reales | Implementador/diseñador, fase 5 | Medir contraste de piezas, casillas, marcadores y foco |
| Tiempos de bot y objetivos LAN | Implementador, fases 6–7 | Medir en hardware de demo; ajustar solo con evidencia |
| Disponibilidad de estudiantes y requisitos de rúbrica | Responsable académico, antes de fase 8 | Confirmar muestra, consentimiento y si requiere SUS o esquema específico |

Estos pendientes no autorizan dejar sin especificar reglas del juego durante implementación. Si la rúbrica exige recuperación durable o tablas normalizadas adicionales, volver a revisar alcance antes de añadirlas.

## Fuentes de las propuestas técnicas

Context7 consultado el 2026-10-15: `/jhlywa/chess.js`, `/websockets/ws`, `/docker/docs`. Selección por correspondencia con proyecto oficial y cobertura pertinente; sin fijar versiones no verificadas.

- [chess.js: documentación](https://github.com/jhlywa/chess.js): movimientos, FEN, historial y detección de tablas.
- [ws: documentación](https://github.com/websockets/ws): servidor, HTTP upgrade, autenticación y heartbeat.
- [Docker Compose: red](https://docs.docker.com/compose/how-tos/networking/): DNS entre servicios y puertos internos/publicados.

Una consulta documental no prueba rendimiento, compatibilidad instalada ni aceptación de producto.
