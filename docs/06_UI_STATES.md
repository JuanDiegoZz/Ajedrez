# 06 — Pantallas, tablero y sistema visual mínimo

## Inventario: cuatro pantallas

Crear sala, promoción y abandono son diálogos. Resultado es panel persistente dentro de partida. No necesitan rutas o pantallas adicionales.

| Pantalla | Objetivo y contenido | Acción principal | Secundarias | Estados, feedback y errores |
|---|---|---|---|---|
| Entrada | Identificar sesión; título, explicación de una línea, nombre con label | Entrar | Ninguna obligatoria | Inicial, validación, enviando, fallo/reintento; conservar texto |
| Lobby | Elegir modo o rival; nombre propio, salas con creador/estado/ocupación | Crear sala; Unirse contextual | Jugar contra bot | Carga, vacío, listo, conexión perdida; sala llena/eliminada informa y actualiza |
| Sala de espera | Confirmar creación; nombre, anfitrión, plaza vacía y color asignado | Esperar unión automática | Cancelar sala | Esperando, iniciando, reconectando; texto al llegar invitado; cancelación concurrente recupera estado |
| Partida | Comprender y jugar; tablero, jugadores, colores, turno, conexión, último movimiento, historial | Seleccionar y mover | Abandonar; tras resultado, nueva partida/lobby | Turno propio/rival, enviando, jaque, promoción, bot pensando, pausa, resultado, fallo de guardado |

La sala cambia a partida sin paso “Listo” o botón “Comenzar”. El anuncio de inicio y color evita sorpresa.

## Diálogos y paneles

| Elemento | Contenido y acciones | Cierre y errores |
|---|---|---|
| Crear sala | Nombre prellenado, Crear, Cancelar | Escape cancela antes de envío. Durante envío impedir duplicado; error conserva nombre. |
| Promoción | “Elige una pieza”; cuatro opciones con icono y nombre; Cancelar | Cancelar/Escape regresa a selección, sin mover. Si llega snapshot nuevo se cierra y resincroniza. |
| Abandonar | “Perderás esta partida. ¿Quieres abandonar?”; Continuar jugando y Abandonar | Foco inicial en continuar; Escape cancela; fallo permite reintentar o recuperar estado. |
| Resultado | Ganador/tablas y motivo; nueva partida/lobby; estado de guardado | Permanece hasta decisión; no bloquea exploración del tablero ni historial. |
| Conexión | Mensaje con tiempo restante y reconexión automática | Sin ocultar tablero; al expirar, resultado o regreso a entrada si sesión desapareció. |

## Distribución

Escritorio: tablero dominante a la izquierda, turno/jugadores arriba y panel secundario de historial a la derecha. Pantallas menores de 768 píxeles: una columna, turno antes del tablero y último movimiento después; historial plegable, sin ocultar resultado. Tablero cuadrado de hasta 640 píxeles, ajustado al ancho disponible; a 320 píxeles, casillas de al menos 32 píxeles. Coordenadas siempre visibles.

Orientación: blancas abajo para blancas y negras abajo para negras, estable toda la partida. No rotar por turno. Nombres y coordenadas no se invierten como texto.

## Casillas y piezas

| Estado | Representación | Comportamiento |
|---|---|---|
| Normal | Casillas claras/oscuras y piezas de silueta reconocible | Sin decoración animada |
| Hover | Contorno ligero | No equivale a selección ni habilita movimiento |
| Foco | Contorno exterior visible | Independiente de estado ajedrecístico |
| Selección | Borde interior persistente y etiqueta accesible | Misma pieza cancela; otra propia reemplaza |
| Destino vacío legal | Punto central | Activar solicita movimiento |
| Captura legal | Anillo y etiqueta de captura | Incluye captura al paso sobre casilla vacía |
| Última jugada | Fondo tenue en origen y destino más marcas de esquina | Permanece al cambiar selección |
| Rey en jaque | Contorno de alerta e icono, más mensaje textual | Prevalece sobre fondo de última jugada |
| Pendiente de confirmación | Estado “Enviando movimiento…” | No mover visualmente antes de confirmar; bloquear segundo envío |
| Sin interacción de movimiento | Texto “Turno del rival”/“Reconectando” | Mantener contraste y exploración; no desvanecer tablero completo |
| Resultado | Tablero estable con última jugada | Sin nuevos movimientos; exploración disponible |

Prioridad de capas: pieza legible siempre; fondo de última jugada, marcadores de destino, selección, jaque y foco con geometrías que puedan coexistir. Si coinciden, conservar foco visible y explicar selección/jaque en texto. Una pieza sin destinos muestra “Esta pieza no tiene movimientos legales”.

## Animación

Desplazamiento confirmado de 120–180 ms sin rebote. Captura retira pieza al aplicar snapshot; enroque anima rey y torre juntos; promoción muestra pieza elegida. Estado, turno y resultado se actualizan con confirmación, sin esperar transición. Snapshot de reconexión se aplica sin animar el historial. Nuevo snapshot cancela transición previa; nunca encadena una cola de animaciones. Con movimiento reducido, cambio inmediato más marcas de última jugada. CSS/plataforma primero; sin librería adicional de animación.

## Sistema visual mínimo

Valores iniciales propuestos, pendientes de validación visual y contraste real.

| Elemento | Regla |
|---|---|
| Tipografía | Fuente del sistema sans-serif; cuerpo 16 px, secundario 14 px, títulos 24/32 px; interlineado 1.5 |
| Espaciado | Escala 4, 8, 12, 16, 24 y 32 px; bloques separados 24 px |
| Botones | Primario relleno, secundario con borde, peligro con texto explícito; altura mínima 44 px |
| Inputs | Label persistente, altura 44 px, ayuda/error debajo; ancho disponible |
| Cards | Una superficie, borde suave, radio 8 px; sin sombras decorativas múltiples |
| Diálogos | Ancho hasta 420 px; margen 16 px; título y dos acciones como máximo salvo promoción |
| Alertas | Icono + texto + acción recuperable; error no desaparece por temporizador |
| Fondo/texto | Fondo #F8FAFC, superficie #FFFFFF, texto #0F172A, secundario #475569 |
| Acción/foco | Azul #1D4ED8; hover #1E40AF; verificar foco sobre cada superficie |
| Funciones | Éxito #166534, aviso #92400E, peligro #B91C1C; acompañar texto/icono |
| Tablero | Casilla clara #F0D9B5 y oscura #B58863 como candidatas; piezas y marcadores deben probar contraste en ambas |
| Disabled/loading | Etiqueta que explique espera, conservar legibilidad; sin spinner sin texto |

No agregar temas, catálogo de componentes, iconografía ornamental ni tokens avanzados. Los criterios accesibles de `02` prevalecen sobre estos colores candidatos.
