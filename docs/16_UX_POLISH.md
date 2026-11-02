# Iteración 5 — pulido final de UX

## Hallazgos y cambios

La inspección inicial y capturas mostraron una base visual coherente. Se conservaron
tablero, colores y seis emblemas. Fricciones: presencia rival separada del jugador,
recuperación propia expresada como presupuesto estático, mensajes locales que podían
confundirse con vencimiento oficial, resultados genéricos y compresión de columnas
en 320 px durante pausa.

Se añadió presencia textual junto a cada jugador y una tarjeta contextual con prioridad:
control en otra pestaña, conexión inicial, pérdida local, ausencia rival, pausa pendiente,
regreso confirmado. No diagnostica Wi-Fi. Al terminar desaparece y manda el resultado
oficial. El regreso del rival dura cuatro segundos, sin mover foco ni bloquear.

Para el contador se agregó únicamente `serverNow` a snapshots. Se combina con el plazo
oficial y tiempo monotónico desde recepción. No hay segundos inventados ni un segundo
sistema de recuperación. Cero significa esperar confirmación, no declarar resultado.
Sin reloj, se reutiliza el mismo intervalo visual solo durante pausa; con reloj sigue
un intervalo por pantalla. El componente de aviso usa un timeout limpiado para el
mensaje temporal y ningún intervalo propio. El contador queda fuera del `role=status`.

Confirmaciones de perfil y sala reproducen el golpe existente tras HTTP exitoso y
validación de generación de identidad. No se añadió sonido de hover, selección de
pieza/avatar, apertura o unión que duplique efectos de juego. Volumen/silencio y
autoplay siguen en el motor existente. No se incorporan recursos ni licencias nuevas.

Resultado incorpora título de perspectiva con color oficial y borde discreto. Entradas
usan opacidad breve; urgencia del reloj usa señal fija para facilitar lectura. Preferencia
de movimiento reducido cancela las nuevas animaciones. Avatar seleccionado añade marca
explícita, y los medallones una sombra ligera; los SVG e IDs permanecen iguales.

En móvil se corrigen anchos mínimos de encabezado, tablero y columnas del estado; reloj
mínimo de 15.2 px en 320 px. El diálogo sigue desplazable con altura limitada para no
ocultar acciones en pantallas cortas. No se modifican reglas, orientación, bot ni archivo.

## Evidencia ejecutada

- Backend: 90/90. Frontend: 17/17 (14 audio y 3 presencia/resultado). Build: correcto,
  24 módulos. Pruebas de presencia cubren plazos incompletos, fin de cuenta, pestaña
  sustituida, estado local ausente y resultados con nombres duplicados.
- Dos contextos 5+0: e4, d5, exd5. WebSocket nativo cerrado con navegador offline:
  servidor confirmó `paused=true`, reloj `phase=paused`; aviso propio y rival correctos.
  Cuenta observada 60 a 59 segundos. Al recuperar red, aviso de regreso, `paused=false`,
  mismo historial y número de sonidos sin cambios. El primer intento de cierre vía
  WebSocketRoute no generó desconexión efectiva; no se contó como prueba aprobada.
- Segunda pestaña sustituyó socket sin pausar al rival. Cancelar logout conservó partida;
  confirmar produjo una sola finalización oficial por abandono y archivo visible.
- Bot: e4/a5, un sonido de confirmación al guardar perfil y dos sonidos de jugada.
  Refresh no reprodujo historial; blancas conservaron saldo descontado y negras el suyo.
  Abandono mostró Derrota y un único efecto de derrota; PGN preservó nombres/control.
- Ambos temas, 1440/1024/768/390/320 px: scrollWidth igual a clientWidth. Tablero 289 px
  en 320 px, con margen completo. Diálogo operable, Escape restaura foco. Movimiento
  reducido: animation-name none. Zoom CSS 200 % en 768 px mantuvo diálogo dentro del
  viewport; no equivale a prueba de zoom nativo en todos los navegadores.
- Al terminar partida, cero intervalos visuales de 100 ms. Contextos de prueba sin
  errores JavaScript. Cortes offline provocan fallos de red esperados; no implican error
  de reglas. Backend cubre expiración con gracia reducida; no se esperaron 60 segundos
  completos de vencimiento en navegador.

Capturas locales antes/después: `.playwright-mcp/iter5-before-entry.png`,
`iter5-before-profile.png`, `iter5-before-game.png`, `iter5-after-game.png`,
`iter5-after-paused-mobile.png`, `iter5-after-reconnected-mobile.png`,
`iter5-after-light-mobile.png`, `iter5-after-dark-mobile.png`,
`iter5-after-dark-game.png`, `iter5-after-result.png`, `iter5-after-defeat.png`.
Son artefactos locales de inspección; no se publican datos ni respaldos.

## Límites

No hubo evaluación con estudiantes, escucha física ni prueba en teléfonos físicos.
El lector de pantalla no se validó con tecnología asistiva real; se comprobaron roles,
regiones vivas, texto y teclado. La dedicación CC0 pendiente de los sonidos previos no
queda resuelta por esta iteración. La precisión de la cuenta visual depende de latencia;
Node sigue decidiendo recuperación y resultado.
