# 10 — Bot proporcional al proyecto

## Objetivo

Rival legal y predecible para demostrar interacción. No es una IA competitiva. Usa el mismo servicio autoritativo de partida, reglas, snapshots, finalización y archivo que el modo humano.

## Comparación

| Opción | Costo | Calidad para la demo | Resolución |
|---|---|---|---|
| Movimiento aleatorio | Mínimo | Legal, pero no defiende de forma razonable | Solo fallback de emergencia |
| Elegir mayor captura inmediata | Bajo | Captura, pero ignora respuestas evidentes | Insuficiente como estrategia principal |
| Minimax de dos medias jugadas | Moderado y acotable | Considera respuesta inmediata rival | Elegido |
| Stockfish integrado | Motor fuerte, integración y licencia a revisar | Excede necesidad de dificultad fija | Fuera de MVP; reconsiderar solo con requisito nuevo |

No se atribuyen APIs ni rendimiento a Stockfish sin consulta; se descarta por alcance, sin escoger paquete.

## Estrategia implementada

- Humano blancas, bot negras; una dificultad fija sin formulario.
- Generar movimientos legales mediante chess.js en una copia dentro de trabajador Node.
- Minimax de profundidad máxima 2 medias jugadas: movimiento del bot y mejor respuesta humana. No confundir con dos turnos completos.
- Evaluación material desde perspectiva del bot: peón 100, caballo 320, alfil 330, torre 500, dama 900; rey no recibe valor capturable. Mate y tablas se evalúan antes que material.
- Preferir mate favorable; evitar mate inmediato y pérdidas materiales visibles a esa profundidad. No prometer defensa estratégica superior al horizonte.
- Empates de evaluación se resuelven por orden estable de movimientos para reproducir pruebas. Sin libro de aperturas ni heurísticas adicionales.
- Copiar historial completo desde posición inicial antes de buscar, no solo FEN: una línea de búsqueda puede alcanzar repetición. Deshacer únicamente en copia de trabajo.
- Worker Node en `backend/src/bot.js`; la partida real solo aplica el candidato si conserva revisión, turno, estado activo y conexión. `chess.js` vuelve a validar el movimiento.

## Límites y concurrencia

Un trabajador por cálculo activo, hasta dos partidas concurrentes para la demo; terminarlo al concluir. Presupuesto cooperativo de búsqueda 300 ms y hasta 5000 nodos, lo que ocurra primero. Guardar mejor opción completamente evaluada. Si presupuesto no permite completar ninguna, usar primer movimiento legal y registrar limitación; nunca jugada parcial.

Meta de respuesta total ≤1 s en equipo de demo. Si trabajador no responde en 2 s, cancelarlo y mostrar error recuperable con “Reintentar” o “Abandonar”. No repetir automáticamente sin límite. No introducir demora artificial para mostrar “pensando”.

Resultado lleva gameId y revisión de origen. Antes de aplicarlo, servidor comprueba que sigue activa, conectada y en turno del bot con misma revisión; después valida otra vez la legalidad. Si se abandonó, pausó o terminó, descartar resultado. Al reanudar, calcular de nuevo si todavía corresponde.

`chess.js` 1.4.0 provee `moves({ verbose: true })`, `move()`, `undo()`, `history()`, `isCheckmate()` y detecciones de tablas. Context7 confirmó esas APIs; reglas y estados especiales permanecen delegados al motor.

## Aceptación y evidencia

- Todos los movimientos elegidos pertenecen al conjunto legal, incluida promoción.
- En posiciones pequeñas preparadas: toma material sin respuesta perjudicial inmediata, evita una captura material obvia en la réplica y encuentra mate en uno.
- Posición terminal devuelve resultado, nunca un movimiento inexistente.
- Solicitud de lobby continúa respondiendo mientras calcula; abandono cancela trabajo y ningún resultado tardío mueve piezas.
- Medir tiempo en al menos 20 posiciones con material y finales; informar fallback y límites alcanzados. Si es demasiado débil o lento, ajustar presupuesto mediante decisión registrada, antes de agregar otro motor.

### Medición de cierre de Fase 7

En 20 posiciones distintas reproducidas por trabajador (9 apertura, 5 medio juego, 6 final): tiempo total mínimo/mediana/máximo por grupo 52.7/83.9/153.5 ms, 43.8/58.7/77.1 ms y 40.8/51.1/72.9 ms. Ninguna alcanzó límites ni necesitó fallback. En tres posiciones de referencia, búsqueda local: apertura 47.5 ms, medio juego 98.9 ms y táctica 27.7 ms. Son mediciones de esta máquina, no garantía para otro hardware.

Referencia de reglas: [chess.js](https://github.com/jhlywa/chess.js), consultada mediante Context7 el 2026-10-15. La biblioteca no incluye IA.
