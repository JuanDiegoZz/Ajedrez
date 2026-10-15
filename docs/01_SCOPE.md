# 01 — Alcance del proyecto

Especificación propuesta para revisión. Las decisiones nuevas de `13_DECISIONS.md` no se consideran aprobadas por estar descritas aquí.

## Imprescindible

- Nombre temporal, sin contraseña; entrada y regreso al lobby.
- Lobby actualizado con salas esperando, nombre, anfitrión, ocupación y estado.
- Crear sala, cancelarla antes de comenzar y unirse con máximo dos jugadores.
- Anfitrión con blancas e invitado con negras; inicio automático al aceptar al invitado.
- Una sala o partida activa por sesión. Salas de bot privadas, fuera del lobby.
- Partida humana y partida contra bot de dificultad fija.
- Reglas mediante librería: legalidad, capturas, captura al paso, enroque, promoción elegida, jaque, mate y tablas según política de `04`.
- Tablero por clic/toque y teclado, orientación propia abajo, selección, destinos legales, capturas diferenciadas, turno y último movimiento.
- Historial SAN durante la partida; animación breve con movimiento reducido.
- Abandono confirmado, resultado persistente en pantalla, nueva partida y regreso al lobby.
- Servidor autoritativo, rechazo de duplicados y recuperación de estado tras desconexión breve.
- Persistencia PostgreSQL de partidas terminadas con sus movimientos, sin cuentas ni historial público.
- Docker Compose reproducible, acceso LAN, errores básicos y estados accesibles.
- Pruebas técnicas apropiadas y evaluación UX con iteración y evidencia.

## Opcional

Solo después de completar lo imprescindible y aprobar el cambio de alcance:

- Elegir color antes de jugar.
- Exportar PGN o consultar partidas terminadas desde la interfaz.
- Sonido desactivable si una prueba muestra valor.
- Ayuda breve de reglas si el estudio detecta esa necesidad.
- Revancha coordinada entre los mismos jugadores.

“Nueva partida” del MVP vuelve al lobby en modo humano; contra bot comienza otra con confirmación explícita. No implica negociación de revancha.

## Fuera de alcance

- Cuentas persistentes, contraseñas, correo, OAuth, SSO y 2FA.
- ELO, torneos, matchmaking, amigos, espectadores, chat y pagos.
- Relojes competitivos, deshacer movimientos, análisis de motor y enseñanza completa.
- Varios niveles de bot, IA competitiva y Stockfish en el MVP.
- Recuperación de partidas activas después de reiniciar servidor.
- Reglas de reclamación arbitral FIDE completas; la política simplificada de tablas debe ser visible.
- Microservicios, Redis, colas, Kubernetes, cloud complejo, alta disponibilidad y telemetría empresarial.

## Control de alcance

Una idea nueva requiere necesidad observada, beneficio UX medible, costo proporcionado y decisión registrada. No entra automáticamente por existir tiempo libre. PostgreSQL y Docker se mantienen por objetivo académico; su presencia no obliga a persistir sesiones y salas.
