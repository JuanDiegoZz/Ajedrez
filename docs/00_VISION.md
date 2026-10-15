# 00 — Visión y contexto de uso

## Propósito y problema

Aplicación universitaria de ajedrez para comenzar y comprender una partida sin instrucciones extensas. La dificultad que abordamos es reconocer cómo entrar, encontrar rival, seleccionar una pieza, mover legalmente e interpretar turno y resultado. No pretende enseñar toda la estrategia del ajedrez.

El objetivo académico es mostrar un proceso de diseño centrado en el usuario basado en ISO 9241-210: comprender contexto → identificar necesidades → diseñar → evaluar → mejorar. No se afirma certificación ni cumplimiento completo de la norma.

## Contexto y restricciones

- Aproximadamente 2–5 personas simultáneas en una LAN de confianza, principalmente estudiantes en una demostración.
- Sesiones breves en navegadores de escritorio; interacción táctil y distribución móvil razonables.
- Sin cuentas, internet obligatorio, instalación en cada cliente ni infraestructura cloud.
- Un único servidor; reiniciarlo interrumpe las partidas activas. Se informa esta limitación.
- React, Node.js, WebSocket, PostgreSQL y Docker Compose conservan su papel académico.
- El aprendizaje y la claridad de interacción tienen prioridad sobre fuerza del bot y cantidad de funciones.

## Tipos de usuario y necesidades

Son hipótesis que se contrastarán con estudiantes; no son personas investigadas todavía. Una persona puede pertenecer a varios tipos.

| Tipo | Necesidad | Respuesta de diseño |
|---|---|---|
| Principiante en la interfaz y con nociones de ajedrez | Reconocer acciones, piezas y turnos | Entrada breve, destinos legales, etiquetas y feedback |
| Persona que conoce ajedrez | Jugar sin pasos repetidos | Selección por clic, historial SAN y orientación estable |
| Persona que busca rival humano | Encontrar sala y saber si alguien llegó | Lobby vivo, creador visible y espera explícita |
| Persona que juega sola | Empezar sin esperar a otra persona | Acción directa contra bot, sin configurar dificultad |
| Persona que usa teclado o necesita mayor legibilidad | Actuar sin depender del ratón o del color | Teclado completo, foco, etiquetas y formas distintas |

No se presupone que quien nunca jugó ajedrez comprenda sus reglas sin ayuda. La evaluación distingue desconocimiento del juego de problemas de interfaz.

## Éxito verificable

1. Dos equipos pueden entrar por una misma URL LAN y terminar una partida coherente.
2. Una persona puede jugar contra bot mediante el mismo tablero.
3. Los estados de turno, selección, captura, jaque, desconexión y resultado tienen feedback observable.
4. Se ejecuta una evaluación con unos cinco estudiantes y una iteración documentada, sin inventar resultados.
5. Se satisfacen las metas de tareas de `11_TESTING_AND_UX_EVALUATION.md`, o se declaran las desviaciones y sus límites.
6. Se cumplen las puertas técnicas y documentales de `12_ROADMAP.md`.

## Responsabilidad documental

`01` delimita alcance; `02` define principios y accesibilidad; `03` navegación; `04` aceptación funcional; `05` calidad; `06` pantallas y diseño visual; `07–10` solución técnica; `11` evaluación; `12` fases y terminado; `13` decisiones; `14` auditoría y evidencia. Cada tema mantiene una única definición principal.
