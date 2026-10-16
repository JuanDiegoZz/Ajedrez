# 02 — Principios UX y accesibilidad

## Principios observables

| Principio | Comportamiento requerido | Cómo evaluarlo |
|---|---|---|
| Estado visible | Mostrar lugar, rival, color, turno, conexión y resultado | Preguntar estado durante tareas |
| Reconocimiento | Mostrar destinos al seleccionar y acciones con texto | Observar primer movimiento sin guía |
| Prevención | Bloquear envío repetido, fuera de turno y sobre estado desactualizado | Intentar doble clic y movimientos inválidos |
| Feedback | Selección inmediata; envío pendiente; aceptación o rechazo comprensible | Observar cada acción y su respuesta |
| Consistencia | Mismos marcadores y términos en humano y bot | Comparar ambos flujos |
| Control | Cancelar selección, creación y abandono; salir tras resultado | Completar cada salida con teclado |
| Carga baja | Tablero y turno dominan; historial secundario | Observar búsqueda visual y dudas |
| Animación funcional | Enseñar origen y destino sin retrasar estado lógico | Repetir con movimiento reducido |

## Accesibilidad mínima medible

Requisitos de proyecto inspirados en WCAG; no constituyen una afirmación de conformidad integral.

- Texto normal: contraste mínimo 4.5:1. Texto grande: 3:1. Foco, controles y marcadores relevantes: objetivo 3:1 respecto a superficies adyacentes. Comprobar cada combinación real, también en casillas claras y oscuras.
- Ningún significado depende solo del color: borde para selección, punto para destino vacío, anillo para captura, texto para turno y jaque.
- Controles generales de al menos 44 × 44 píxeles CSS. Casillas contiguas de al menos 32 × 32 en ancho de 320; no se afirma que alcancen 44. Nunca menos de 24 × 24.
- Tipografía base de 16 píxeles; zoom al 200 % sin ocultar acciones. A 320 píxeles de ancho no hay desplazamiento horizontal de página.
- Foco visible de al menos 2 píxeles, sin quedar oculto por paneles. Hover nunca es la única señal.
- Cada input tiene label persistente. Errores asociados al campo y descritos en texto; placeholder no reemplaza label.
- Tab recorre controles y entra al tablero por una sola casilla. Flechas recorren casillas según posición visual; Enter/Espacio selecciona o mueve; Escape cancela selección.
- El tablero conserva una única casilla en el orden Tab. No obliga a recorrer 64 casillas para salir. Las piezas rivales y casillas vacías siguen siendo explorables por teclado aunque no puedan moverse.
- Cada casilla anuncia coordenada, pieza/color o vacía y estado relevante. Ejemplo: “e4, peón blanco, seleccionado”. No usar disabled para impedir explorar todo el tablero fuera de turno.
- Anuncio moderado de turno, jugada aceptada, jaque y resultado mediante región de estado. Errores requieren anuncio inmediato sin repetir todo el historial.
- Diálogos con título, foco inicial apropiado, foco contenido y retorno al activador. Escape cancela abandono y promoción antes de enviar. Promoción nunca elige dama automáticamente por cerrar.
- Respetar preferencia de movimiento reducido: eliminar desplazamiento, mantener origen/destino y texto. Sin parpadeos ni sonido obligatorio.
- Probar flujo completo con teclado y una revisión manual con lector de pantalla. Automatización sola no prueba comprensión.

## Lenguaje

Usar “Tu turno · Blancas”, “Turno de Ana · Negras”, “Esperando jugador”, “Bot pensando…” y mensajes con siguiente acción. No mostrar códigos técnicos como único error. Mantener términos de ajedrez y explicar resultados: “Tablas por ahogado: no hay movimientos legales y el rey no está en jaque”.

## Evidencia del proceso

Por cada mejora relevante registrar: necesidad o hipótesis → diseño → tarea de prueba → observación → cambio → reevaluación. Usar identificadores de requisitos de `04`, participantes anónimos y versión evaluada. El registro se mantiene en `14`; el protocolo está en `11`.

## Tema visual

La interfaz ofrece modo claro y oscuro con contraste equivalente. Si no hay preferencia guardada, sigue `prefers-color-scheme`; el control visible permite cambiarlo. `localStorage` conserva solo `ajedrez_theme`, nunca identidad ni datos de partida.

## Referencias consultadas

- [W3C: contraste mínimo](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).
- [W3C: tamaño mínimo de objetivos](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html). El objetivo de 44 píxeles es una elección del proyecto; no se presenta como mínimo general del criterio 2.5.8.
- [WAI APG: patrón de cuadrícula](https://www.w3.org/WAI/ARIA/apg/patterns/grid/). Referencia para navegación; probar su adaptación al tablero.
