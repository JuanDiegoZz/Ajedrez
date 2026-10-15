# 04 — Requisitos funcionales y aceptación

Cada requisito imprescindible necesita evidencia según `11`. Las políticas nuevas son propuestas sujetas a aprobación de `13`.

## Acceso y lobby

| ID | Comportamiento y aceptación |
|---|---|
| RF-001 | Nombre temporal de 2–24 caracteres visibles tras recorte; rechazar vacío, controles y exceso de longitud en servidor. Nombres repetidos permitidos; identidad por sesión, nunca por nombre. |
| RF-002 | Entrar al lobby; recarga conserva sesión mientras viva en servidor. Dos contextos independientes representan dos jugadores. |
| RF-003 | Listar solo salas humanas esperando; cambios aparecen sin recargar y existe estado vacío, carga y error recuperable. |
| RF-004 | Crear sala con nombre de 2–40 caracteres; prellenar nombre válido y permitir cancelación antes del envío. |
| RF-005 | Unirse solo si existe cupo; dos solicitudes simultáneas aceptan una. Una sesión no crea ni ocupa dos partidas activas. |
| RF-006 | Mostrar nombre, anfitrión, ocupación y estado. Sala completa desaparece del listado disponible. |
| RF-007 | Cancelar sala propia esperando la elimina y actualiza lobby. Otro jugador no puede cancelarla. |

## Partida multijugador

| ID | Comportamiento y aceptación |
|---|---|
| RF-010 | Inicio automático tras unión aceptada; anfitrión blancas, invitado negras. Dos jugadores máximo. |
| RF-011 | Ambos ven igual FEN, historial, turno y revisión lógica; orientación visual propia abajo. |
| RF-012 | Solo participante conectado, con color del turno y revisión vigente puede enviar movimiento aceptable. |
| RF-013 | Servidor valida sesión, pertenencia, turno, estado, legalidad y promoción. Nunca acepta FEN o resultado impuesto por cliente. |
| RF-014 | Movimiento confirmado incrementa revisión una vez y se distribuye a ambos; duplicado no mueve ni alterna turno de nuevo. |
| RF-015 | Color propio y turno textual siempre visibles, también durante jaque, espera y resultado. |
| RF-016 | Desconexión pausa acciones; reconexión dentro del plazo recupera snapshot e historial sin duplicar jugadas. Véase `09`. |

## Tablero

| ID | Comportamiento y aceptación |
|---|---|
| RF-020 | Clic/toque o teclado seleccionan pieza propia en turno; otra pieza cambia selección; misma pieza/Escape cancelan. |
| RF-021 | Selección persistente distinguible de foco, hover y último movimiento. |
| RF-022 | Destinos legales vienen del estado autoritativo; pieza sin movimientos explica esa condición. |
| RF-023 | Captura usa anillo y texto accesible, movimiento vacío usa punto; captura al paso se identifica como captura. |
| RF-024 | Solo movimiento confirmado anima 120–180 ms; movimiento reducido elimina desplazamiento. Snapshot nuevo nunca espera una animación. |
| RF-025 | Origen y destino del último movimiento permanecen marcados; no se confunden con selección actual. |
| RF-026 | Historial SAN numerado durante partida y resultado, con descripción accesible de última jugada. |
| RF-027 | Destino inválido conserva tablero y selección con mensaje breve. Rechazo del servidor descarta selección y recupera estado. |

## Reglas y política de tablas

| ID | Comportamiento y aceptación |
|---|---|
| RF-030 | Librería madura genera y valida jugadas; no permitir dejar rey propio en jaque. |
| RF-031 | Jaque marca rey y muestra texto; conserva la interacción legal. |
| RF-032 | Mate termina una sola vez, anuncia ganador y motivo; nunca “capturar al rey”. |
| RF-033 | Enroque legal mueve rey y torre en una confirmación; captura al paso retira peón correspondiente; promoción ofrece dama, torre, alfil y caballo antes de enviar. |
| RF-034 | Tablas automáticas por ahogado, material insuficiente detectado por librería, triple repetición y 50 movimientos por bando sin captura ni movimiento de peón. Mostrar causa específica. |

La triple repetición y los 50 movimientos se resuelven automáticamente para simplificar interacción. Es una política del proyecto; no reproduce reclamaciones y arbitraje de torneo completos. Mostrar en ayuda breve del panel de partida: “Tablas automáticas por repetición o 50 movimientos”. No implementar acuerdo de tablas, reglas arbitrales completas ni detector propio de todas las posiciones muertas. Mantener historial completo: FEN aislado no basta para detectar repetición.

## Bot

| ID | Comportamiento y aceptación |
|---|---|
| RF-040 | Acción directa crea partida privada; humano blancas, bot negras; no aparece en lobby. |
| RF-041 | Bot elige solo movimientos generados por reglas del servidor, incluida promoción. |
| RF-042 | Búsqueda acotada en trabajador; no bloquea lobby ni otras partidas. Presupuesto y prueba en `10`. |
| RF-043 | Mostrar “Bot pensando…” mientras calcula; error recuperable permite reintentar o abandonar sin inventar jugada. |

## Finalización

| ID | Comportamiento y aceptación |
|---|---|
| RF-050 | Abandono explícito requiere confirmación; produce victoria rival por abandono. Cerrar pestaña usa plazo de desconexión. |
| RF-051 | Resultado persistente en pantalla con ganador o tablas y causa; notificar una sola finalización. |
| RF-052 | Volver al lobby libera pertenencia activa; no restaura la sala terminada como disponible. |
| RF-053 | Nueva partida sigue política de `03`; no promete revancha automática. |
| RF-054 | Guardar registro terminado y movimientos en PostgreSQL, una vez; fallo de guardado se comunica sin cambiar resultado ni impedir salir. |
