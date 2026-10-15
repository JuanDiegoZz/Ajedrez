# 09 — Multijugador y protocolo conceptual

WebSocket transporta mensajes JSON con un campo de tipo; los nombres con dos puntos no implican Socket.IO. Fase 5 implementa suscripción y snapshots de partida. Heartbeat, presencia y recuperación descritos aquí pertenecen a Fase 6.

## Implementado en Fase 5

- Cada cliente autorizado envía `game:subscribe` por la conexión `/ws` existente. El servidor verifica pertenencia y devuelve `game:state` personalizado, incluido `you` (`white` o `black`), sin IDs de sesión.
- `POST /api/games/:id/moves` y `POST /api/games/:id/resign` siguen siendo comandos HTTP autoritativos. Tras aceptar una operación, backend envía snapshot actualizado a ambos jugadores suscritos. No se crea otro socket ni se envían movimientos por WebSocket.
- El frontend acepta solo una revisión mayor para posición. Snapshot con la misma revisión se acepta únicamente para actualizar estado de archivo.

## Inicio paso a paso

1. A crea sesión y sala por HTTP; servidor asigna anfitrión/blancas y publica lista actualizada.
2. B consulta lobby y solicita unirse con su sesión.
3. Servidor comprueba cupo y pertenencia; ocupa segundo lugar e inicia partida en una operación síncrona, sin espera intermedia a PostgreSQL.
4. Sala deja de estar disponible. Ambos reciben snapshot inicial, colores y turno de blancas.
5. A selecciona pieza y destino legal del snapshot. Envía intención con ID de solicitud y revisión esperada.
6. Backend verifica sesión, participante, conexiones listas, partida activa, turno, revisión y legalidad; aplica una sola vez.
7. Incrementa revisión y publica snapshot completo a A y B. Ambos actualizan turno, historial y último movimiento; animan la transición confirmada.
8. Si hay mate/tablas, snapshot incluye resultado; finalización inicia archivo de `08`.

## Contrato de mensajes

| Dirección | Tipo conceptual | Datos y efecto |
|---|---|---|
| Cliente → servidor | lobby:subscribe | Solicitar lista actual y actualizaciones de lobby |
| Servidor → cliente | lobby:state | Lista completa disponible y revisión monotónica del lobby |
| Cliente → servidor | game:subscribe | ID de partida; comprobar pertenencia y devolver snapshot completo |
| Cliente → servidor | HTTP `POST /api/games/:id/moves` | from, to, promotion opcional, requestId y expectedRevision |
| Cliente → servidor | HTTP `POST /api/games/:id/resign` | Abandono solo después de confirmar en UI |
| Servidor → cliente | game:state | Snapshot completo a ambos miembros después de suscripción y mutación aceptada |
| Servidor → cliente | HTTP error | Código estable, mensaje comprensible y estado sin cambios |

Mensajes propuestos para Fase 6, no implementados todavía: `command:rejected`, `game:presence`, `game:archive` independiente y `session:replaced`.

Crear/unir/cancelar salas e iniciar bot son HTTP; no duplicarlos como comandos WebSocket. Lobby recibe lista completa tras cada cambio; con 2–5 usuarios no necesita deltas. Snapshot real de game contiene ID, sala, jugadores/nombres, color `you`, FEN, historial SAN, revisión, turno, jaque, último movimiento y resultado/motivo. Nunca incluye IDs secretos de sesión ni motor mutable. Destinos legales se consultan mediante `GET /api/games/:id/legal-moves?from=...` para el jugador en turno.

## Revisión, duplicados y concurrencia

- Revisión empieza en 0; cada movimiento y finalización sin movimiento la incrementa. Si movimiento termina partida, constituye una sola revisión con resultado incluido.
- Presencia y archivo tienen sus propios mensajes; no alteran revisión de posición. Resincronizar presencia al reconectar aunque posición no cambió.
- Validar y mutar partida real en sección síncrona sin operaciones asíncronas entre comprobación y aplicación. PostgreSQL y bot ocurren fuera.
- Una intención pendiente por cliente. Conservar último requestId, contenido y respuesta de cada jugador durante la partida; duplicado exacto recibe respuesta previa y snapshot actual, sin reaplicar.
- Mismo ID con contenido distinto se rechaza. Solicitud anterior fuera de esa pequeña caché falla por revisión obsoleta; no se promete entrega exactamente una vez.
- Cliente acepta solo revisiones mayores; confirmaciones de la misma revisión pueden resolver pendiente. Nunca retrocede por respuesta tardía. Snapshot inicial/reconexión sustituye copia local tras comprobar ID de partida.
- HTTP crear/unir usa requestId y pertenencia para evitar crear dos salas o dos partidas por reintento. Sala llena y cancelación concurrente responden conflicto con estado actual.
- No reenviar una jugada incierta al reconectar. Pedir snapshot y contrastar historial/revisión; entonces permitir nueva intención.

## Reconexión proporcional

- Servidor usa ping/pong de WebSocket cada 10 s y declara caída si falta respuesta al siguiente control. El navegador responde al protocolo; no usar métodos de ws propios de Node en navegador.
- Cliente detecta close/error y reintenta a 1, 2 y luego cada 5 s mientras dure la recuperación. Al abrir, resuscribe y pide snapshot; socket abierto solo no habilita movimientos.
- Desde detección del servidor hay 60 s de gracia. Pausar ambos jugadores y bot, mostrar plazo; se mantiene jaque/posición. Validar vencimiento en servidor también al reconectar.
- Si vuelve antes del vencimiento, recuperar snapshot e historial y continuar el mismo turno. Descartar cálculo de bot obsoleto y recalcular cuando corresponda.
- Si solo un humano sigue desconectado al vencer, rival conectado gana por desconexión. Es política casual explícita, no arbitraje de torneo por capacidad de mate.
- Si ambos están desconectados, interrumpir sin ganador al vencer el primer plazo; no inventar victoria. Si en ese momento uno ya volvió, aplicar regla anterior al ausente.
- Contra bot, vencimiento del humano termina como abandono del humano por desconexión. No mantener cálculo activo durante ausencia.
- Sala esperando: reservar anfitrión durante los mismos 60 s, ocultarla del lobby mientras esté desconectado; al vencer eliminarla. Restablecerla si vuelve a tiempo.
- Reinicio servidor: sesión no existe; informar “El servidor se reinició o tu sesión terminó; la partida no puede recuperarse”. No aplicar plazos a un juego inexistente.

Estos límites necesitan ensayo de corte real de red. No se implementan relojes competitivos, recuperación durable, espectadores ni sockets distribuidos.

## Errores esperados

Sala no disponible, no participante, sesión expirada, turno incorrecto, revisión obsoleta, jugada ilegal, promoción incompleta, partida terminada, pausa de conexión y solicitud malformada. Ningún error modifica tablero; mensajes explican esperar, elegir otra jugada, resincronizar o volver al lobby según caso.
