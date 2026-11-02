# Efectos originales de Ajedrez

Procedencia: síntesis procedural generada con Codex para Ajedrez el 2026-11-01.
No se afirma autoría humana exclusiva ni que la generación automática cree derechos.
Estado de licencia: CC0 1.0 propuesta, pendiente de declaración expresa del titular
respecto de los derechos que efectivamente posea. No existe en el repositorio una
declaración identificada del titular; esta auditoría no la sustituye.
Generar un WAV y escribir CC0 no constituye por sí mismo una dedicación válida.
https://creativecommons.org/publicdomain/zero/1.0/

No contienen grabaciones, voces ni muestras de terceros. El generador reproducible
está en `frontend/scripts/generate-audio.mjs`. Sinusoides amortiguadas, armónicos
inharmónicos, ataque suave y cola a cero. PCM mono, 16 bits, 22050 Hz, pico máximo
aproximado de -6 dBFS; volumen inicial del reproductor 25 %.

| Archivo | Uso | Duración aproximada |
|---|---|---|
| move.wav | Golpe amortiguado de movimiento | 160 ms |
| capture.wav | Golpe doble de captura | 200 ms |
| castle.wav | Dos apoyos de enroque | 260 ms |
| check.wav | Aviso tonal de jaque | 280 ms |
| promotion.wav | Ascenso de promoción | 490 ms |
| win.wav | Cadencia ascendente | 620 ms |
| loss.wav | Cadencia descendente | 660 ms |
| draw.wav | Cadencia neutral | 480 ms |
| low.wav | Dos notas suaves | 330 ms |

Fuentes investigadas, **no incorporadas**:

- ChaosEntertainment, dragslide1.mp3, CC0, https://freesound.org/people/ChaosEntertainment/sounds/396705/
- mht23SD, Forcefully knocking over chess piece, with roll FINAL.wav, CC0, https://freesound.org/people/mht23SD/sounds/707342/
- Kenney, Interface Sounds, CC0, https://kenney.nl/assets/interface-sounds
- Kenney, Music Jingles, https://kenney.nl/assets/music-jingles (consulta web no disponible).

Las páginas de Freesound exigen cuenta para descargar. Se eligió síntesis original
para mantener coherencia, tamaño reducido y trazabilidad; no se reutilizó material
de esas colecciones ni se presupuso la licencia de una descarga no inspeccionada.
