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

Escritorio: tablero y jugadores en un marco común a la izquierda; turno, identidad, resultado e historial en bloques a la derecha. Hasta 900 píxeles: estado compacto antes del tablero e historial después, sin ocultar resultado. El marco ocupa hasta 640 píxeles, ajustado al ancho disponible; a 320 píxeles, casillas de al menos 32 píxeles. Coordenadas siempre visibles. Diagnóstico de servicios en un detalle desplegable al pie, sin competir con el juego.

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

## Dirección visual vigente

Iteración autorizada de club moderno: marfil, tinta y latón; tablero protagonista, menú de modos e identidad editorial. No implica validación de satisfacción por estudiantes.

| Elemento | Regla |
|---|---|
| Tipografía | Newsreader local para títulos de 24–72 px; sistema sans-serif para cuerpo 16 px, información auxiliar 12–14 px y marcas editoriales breves de 10–12 px |
| Espaciado | Escala 4, 8, 12, 16, 24 y 32 px; bloques separados 24 px |
| Botones | Primario relleno, secundario con borde, peligro con texto explícito; altura mínima 44 px |
| Inputs | Label persistente, altura 44 px, ayuda/error debajo; ancho disponible |
| Cards | Acciones de juego grandes con pieza representativa; salas compactas con anfitrión, ocupación y unión; profundidad discreta y radios de 4–8 px |
| Diálogos | Ancho hasta 448 px; margen 16 px; título y dos acciones como máximo salvo promoción |
| Alertas | Icono + texto + acción recuperable; error no desaparece por temporizador |
| Fondo/texto | Claro: fondo marfil #F4F0E7 y superficie #FFFCF5. Oscuro: tinta #111C24 y superficie #1B2A33. Texto y secundario contrastados por tema |
| Acción/foco | Claro: acción petróleo, acento bronce #795A2D; oscuro: acción latón #DFC18B. Foco visible en ambas superficies |
| Funciones | Éxito, aviso y peligro cambian por tema; acompañar color con texto/icono |
| Tablero | Marfil/salvia en marco tinta. Selección doble, punto para destino, anillo de captura, esquinas para última jugada y signo de alerta en jaque; foco independiente |
| Disabled/loading | Etiqueta que explique espera, conservar legibilidad; sin spinner sin texto |

Ofrecer únicamente tema claro y oscuro, sin catálogo de temas. Preferencia local; seguir `prefers-color-scheme` antes de elegirla. No agregar catálogo de componentes, iconografía ornamental ni tokens avanzados. Los criterios accesibles de `02` prevalecen sobre las decisiones de color.

Piezas Cburnett SVG y Newsreader se distribuyen localmente; fuentes y licencias en [créditos](../frontend/public/assets/CREDITS.txt). Las casillas conservan su nombre accesible; las imágenes son decorativas para evitar anuncios duplicados. Los SVG sustituyen glifos dependientes de la fuente del sistema.
