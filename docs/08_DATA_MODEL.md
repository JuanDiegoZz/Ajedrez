# 08 — Datos, persistencia y fuente de verdad

## Política propuesta

Servidor autoritativo en memoria durante la partida. PostgreSQL archiva únicamente partidas terminadas, tanto humanas como contra bot. Es un uso académico real: conservar resultado e historial consultables y verificables después de reiniciar. No hace falta una interfaz pública de historial en MVP.

No persistir sesiones, jugadores ni salas. Sus identificadores temporales y credenciales no aportan valor al archivo. Guardar nombres como instantánea histórica, no como referencias a cuentas inexistentes.

## Estado activo en memoria

- Sesión: ID secreto, nombre, pertenencia activa, conexión controladora e inactividad.
- Sala: ID público, nombre, anfitrión/invitado, estado y partida asociada.
- Partida: ID, modo, miembros/colores, instancia chess.js, secuencia completa de movimientos, revisión, resultado y fechas.
- Conexión: presencia por miembro, plazos de gracia y cálculo de bot pendiente.
- Finalización: registro pendiente de guardar y último resultado de comando por jugador para deduplicar.

Estados de sala: esperando → jugando → terminada. Cancelación elimina sala esperando. Una sala terminada no vuelve al lobby; al salir todos se libera. Partida activa pasa a terminada o interrumpida, sin reapertura. Archivo pendiente de guardado no se elimina al salir jugadores.

## Fuente de verdad y reconstrucción

- Mientras proceso vive: instancia de reglas del servidor más historial ordenado; cliente conserva una copia confirmada y estado visual.
- FEN representa posición actual, color del turno, enroque, captura al paso y contadores. No contiene toda la historia necesaria para triple repetición.
- Reconexión usa snapshot con FEN, historial completo, revisión, turno, último movimiento, resultado y destinos legales actuales. No reconstruir servidor desde FEN del cliente.
- Para comprobar archivo: iniciar desde posición estándar y reproducir movimientos por orden; contrastar FEN final. No ofrecer importar posiciones arbitrarias en MVP.
- Tras reinicio no se recuperan sesiones ni juegos activos. Registros terminados permanecen; el cliente informa pérdida de sesión y vuelve a entrada.

## Esquema PostgreSQL conceptual: dos tablas

No es SQL ejecutable ni crea tablas.

### games — un registro por partida finalizada

| Campo | Tipo conceptual | Motivo |
|---|---|---|
| id | UUID, clave primaria | Identidad estable e idempotencia de guardado |
| mode | texto restringido: human / bot | Distinguir origen |
| white_name, black_name | texto, hasta 24 caracteres | Participantes históricos; bot se llama “Bot” |
| result | texto restringido: 1-0 / 0-1 / 1/2-1/2 / * | Resultado, con * para interrupción sin ganador |
| end_reason | texto restringido | checkmate, stalemate, insufficient_material, repetition, fifty_moves, resignation, disconnect o interrupted |
| final_fen | texto | Verificar posición final |
| started_at, finished_at | timestamp con zona | Contexto temporal y comprobación |

Restricciones: fecha final ≥ inicial; resultado compatible con motivo; `*` solo para interrupted; motivos de tablas requieren `1/2-1/2`. Nombres no únicos. Sin winner_id ni status activo: se deducen de resultado y no existen cuentas.

### moves — historial de medias jugadas

| Campo | Tipo conceptual | Motivo |
|---|---|---|
| game_id | UUID, referencia a games | Pertenencia |
| ply | entero positivo | Orden de media jugada, no número de turno completo |
| from_square, to_square | texto de dos caracteres | Reproducción; restringir a a1–h8 |
| promotion | texto nullable: q/r/b/n | Reproducir promoción exacta |
| san | texto | Notación legible generada por librería |

Clave primaria compuesta `(game_id, ply)` impide duplicados. Sin ID adicional, actor, FEN por movimiento o índice redundante. Actor/color se deduce de orden desde posición inicial; no almacenar tokens de sesión. Mantener ambas tablas es más claro para consultas académicas que un blob y permite comprobar orden/unicidad.

## Guardado y fallos

1. Finalizar lógicamente una sola vez y comunicar resultado antes de depender de la base de datos.
2. Insertar games y todos sus moves en una sola transacción. Nunca un registro parcial.
3. ID de partida estable; reintentar mismo contenido es idempotente. Conflicto con contenido distinto es error, no sobrescritura silenciosa.
4. Si falla, mostrar “La partida terminó, pero no se pudo guardar el registro”. Mantener paquete en memoria; reintentar cada 10 segundos mientras viva el servidor. Sin cola externa.
5. Al confirmar guardado, emitir estado actualizado de archivo. Salir al lobby sigue permitido durante fallo.
6. Reiniciar servidor pierde registros pendientes; advertir esta limitación en instrucciones de demo. No fingir durabilidad.

No añadir pantallas de administración, borrado, estadísticas ni recuperación de partidas. Antes de probar con estudiantes, obtener consentimiento y usar alias: el archivo contiene nombres visibles. Resultados UX se guardan separados y anonimizados en documentación, no en tablas de producto.
