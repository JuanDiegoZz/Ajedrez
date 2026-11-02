# Iteración 4 — experiencia sonora

El audio complementa los estados visuales. Sonidos activos por defecto al 25 %;
Mi perfil permite desactivar, ajustar volumen y probar un golpe. No hay música,
sonidos de hover, categorías adicionales ni preferencias enviadas al servidor.
`ajedrez_preferences_v1` conserva coordenadas y añade `soundEnabled`/`soundVolume`.
Se valida almacenamiento; si falla, las preferencias funcionan durante la visita.
Tema continúa en `ajedrez_theme`. Logout conserva preferencias locales.

`audio.js` mantiene un AudioContext, un gain maestro, nueve buffers y una única
fuente activa. Precarga al primer gesto de puntero/teclado, reanuda contexto
suspendido y captura errores. No espera audio al mover ni encola efectos perdidos.
Cada nueva señal sustituye la anterior; no mezcla tres sonidos de un mate.

`useGameAudio.js` recibe exclusivamente snapshots aceptados de GameScreen.
Referencia inicial silenciosa; ID, revisión y cantidad de movimientos protegen
duplicados y saltos de historial. Datos de movimiento son estructurados, sin
interpretar SAN. Prioridad: resultado, jaque, promoción, enroque, captura, movimiento.
El resultado compara `game.you` con ganador oficial; archivo pendiente no altera
resultado. Interrupción no genera victoria/derrota/tablas. Timeout usa resultado
oficial. Nunca se declara ganador desde el contador local.

Desconexión, sustitución de socket, cambio de partida, visibilidad y logout eliminan
referencia o detienen reproducción. Al volver, se establece otra referencia sin
reproducir eventos antiguos. No se acumula cola. Solo una pestaña conectada y visible
emite señales de partida. Al cruzar 10 segundos, el reloj local propio emite un aviso
por turno activo; entrar ya bajo el umbral no emite alerta retrospectiva.

Procedencia, propuesta CC0 pendiente de declaración del titular y generador: `frontend/public/assets/audio/CREDITS.md`.
PCM WAV mono 22050 Hz, 16 bits; 153870 bytes en total (nueve efectos).
La estética pretendida es táctil y amortiguada; no se realizó escucha física ni
evaluación con participantes. Esa revisión acústica sigue siendo humana.

## Verificación

Ejecutar `node --test frontend/test/audio.test.mjs`, `npm test --prefix backend`
y `npm run build --prefix frontend`. Pruebas deterministas cubren prioridad,
duplicados HTTP/WS, revisión vieja, perspectiva, timeout, pausa/reconexión,
historial, identidad, umbral, preferencias, silencio, carga fallida y autoplay.
Playwright instrumenta AudioBufferSourceNode.start; comprueba invocaciones y carga,
no acredita escucha física. No se agregan endpoints de depuración.

Al integrar audio se corrigieron hooks del reloj visual que estaban dentro de las
64 casillas: ahora hay un solo intervalo por pantalla. Motor temporal Node, reglas,
worker, protocolo y archivo PostgreSQL no cambian.

## Auditoría final (2026-11-01)

Resultado técnico favorable; entrega NO APROBADA para integración mientras falte declaración CC0 del titular. La mención anterior a CC0 no acredita titularidad ni una dedicación legal automática. Ver CREDITS.md y https://creativecommons.org/publicdomain/zero/1.0/legalcode.en.

Nueve WAV íntegros: 160–660 ms, pico -6.02 dBFS, RMS -19.28 a -17.29 dBFS, extremos cero. Cola inferior a -60 dBFS de 17–43 ms: decaimiento natural breve, sin motivo técnico para recortar. Sin clipping ni muestras ajenas en el generador. No se realizó escucha física; timbre, balance percibido y móviles reales siguen pendientes de revisión humana.

Corregidos resultado silenciado durante pausa y corte brusco de fuente: final oficial suena una vez al cliente conectado; interrupción de una fuente aplica fade de 5 ms, desconexión al terminar y suavizado de volumen maestro. Un gain por voz permite el fade y se libera con la fuente.

Regresión: 90 backend, 14 audio, build correcto. Playwright sobre Compose instrumentó intervalos/fuentes: un intervalo de 100 ms en partida, uno tras refresh, cero al terminar. Dos señales para humano/bot; refresh silencioso; cero fuentes activas tras mute. Diálogo/partida sin overflow en 1440/1024/768/390/320. Cero errores JavaScript en el contexto auditado. Se retiró solo la partida identificada de prueba y dos movimientos; inventario observado al cierre: 69 partidas/308 movimientos. No se presupuso el inventario de la iteración anterior.
