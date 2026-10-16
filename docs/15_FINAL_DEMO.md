# 15 — Guion de demo y cierre

Guion práctico de 6–8 minutos. Usar nombres ficticios. Dejar Docker listo antes de comenzar y evitar mostrar contraseñas o datos personales.

## Guion de presentación

| Tiempo | Demostración | Qué explicar |
|---|---|---|
| 0:00–0:40 | Presentar Ajedrez UX | Proyecto universitario para 2–5 personas en LAN. Ayuda a entrar, encontrar rival, entender turno y jugar; el bot es deliberadamente sencillo. |
| 0:40–1:15 | Entrar como “Demo Blanca” | Sesión temporal sin cuenta. El nombre identifica la sesión visualmente; la identidad interna es opaca. Enter también permite entrar. |
| 1:15–2:00 | Crear “Partida de demo” | El lobby separa mesa humana y bot. Mostrar estado de espera y anfitrión con blancas. |
| 2:00–2:40 | Entrar desde segundo dispositivo como “Demo Negra” | Encontrar la sala y unirse. Mostrar invitado con negras, orientación opuesta y turno inicial de blancas. |
| 2:40–3:50 | Jugar e2–e4, d7–d5, e4xd5 | Seleccionar una pieza, señalar destinos legales, mover y mostrar captura, último movimiento y sincronización automática. El servidor valida cada jugada. |
| 3:50–4:20 | Recargar el navegador negro | La misma cookie recupera sesión, color y posición oficial. Explicar la ventana de recuperación de aproximadamente 60 segundos ante una caída temporal. |
| 4:20–5:05 | Volver al lobby e iniciar bot | Mover e2–e4. Mostrar “El bot está pensando…” y su respuesta. No volver a pulsar mientras calcula. |
| 5:05–5:35 | Alternar tema | Mostrar tema claro/oscuro y que la preferencia persiste al recargar. Mencionar controles de teclado y movimiento reducido. |
| 5:35–6:30 | Explicar arquitectura y datos | Nginx sirve React y enruta `/api` y `/ws`; Node valida reglas con `chess.js`; PostgreSQL archiva partidas terminadas; Compose levanta servicios reproducibles. |
| 6:30–7:30 | Defender UX y límites | Describir proceso basado en ISO 9241-210, cambios motivados por evaluación heurística y feedback visual. Aclarar que no hubo estudio formal con cinco estudiantes ni métricas humanas. |

Si queda menos tiempo, priorizar entrada, crear/unirse, una jugada sincronizada y respuesta del bot.

## UX e ISO 9241-210

Frase recomendada: **“Aplicamos un proceso de diseño centrado en el usuario basado en ISO 9241-210.”** No afirmar certificación ni cumplimiento completo. La ficha oficial consultada en octubre de 2026 identifica ISO 9241-210:2019 como edición vigente y describe sus principios y actividades de diseño centrado en las personas durante el ciclo de vida de sistemas interactivos ([ficha oficial](https://www.iso.org/standard/77520.html)).

Relacionar el proceso con ejemplos verificables:

1. **Comprender contexto:** proyecto para estudiantes, sesiones breves, 2–5 personas y LAN; principiantes en la interfaz pueden necesitar reconocer acciones y turnos.
2. **Identificar necesidades:** entrada sin cuentas, salas visibles, color propio, movimientos legales, conexión y resultado comprensibles.
3. **Diseñar:** lobby separado por modo, tablero orientado al jugador, destinos legales, prevención de jugadas inválidas, recuperación y tema seleccionable.
4. **Evaluar e iterar:** auditoría heurística, accesibilidad, contraste, teclado, responsive, reduced motion y Playwright. Feedback recibido dijo que la apariencia se sentía genérica; se iteraron identidad, tablero, piezas y jerarquía.

La muestra de unos cinco estudiantes no se evaluó. Playwright y métricas de contraste son verificaciones técnicas, no sustituyen resultados de personas.

## Eficacia, eficiencia y satisfacción

- **Eficacia:** tareas comprobadas técnicamente: entrar, crear/unirse, identificar turno, mover, capturar, jugar contra bot y recuperar tras refresh. No hay tasa de éxito de participantes.
- **Eficiencia:** el diseño ofrece entrada breve, creación directa, destinos visibles y acciones inválidas bloqueadas. Son objetivos de diseño; no se midieron tiempos humanos comparativos.
- **Satisfacción:** identidad visual, piezas consistentes, temas y feedback fueron refinados. El feedback disponible motivó iteraciones, pero no equivale a puntuaciones Likert o SUS.

No presentar porcentajes, tiempos de participantes, puntuaciones SUS ni resultados de cinco usuarios.

## Arquitectura en 30 segundos

```text
Navegador
   ↓ HTTP y WebSocket same-origin
Nginx (host 8080 → contenedor 80)
   ├── archivos estáticos React
   ├── /api/ ──→ Node.js
   └── /ws ────→ Node.js
                    ├── chess.js: reglas autoritativas
                    └── PostgreSQL: partidas terminadas y movimientos
```

HTTP transporta comandos y consultas. WebSocket distribuye estado vivo. Node.js deriva identidad de sesión, valida comandos y controla partidas. `chess.js` calcula legalidad y resultados. Salas y partidas activas viven en memoria; PostgreSQL archiva las finalizadas. Docker Compose arranca Nginx, backend y base de datos; solo Nginx publica `8080`.

## Checklist, 10–15 minutos antes

- [ ] Docker Desktop iniciado.
- [ ] Revisar que TCP 8080 esté libre: `Get-NetTCPConnection -State Listen -LocalPort 8080` y `docker ps --filter publish=8080`.
- [ ] En la carpeta del proyecto: `docker compose up -d --build`.
- [ ] Confirmar `docker compose ps`; PostgreSQL debe estar `healthy`.
- [ ] Confirmar `Invoke-RestMethod http://localhost:8080/api/health` devuelve backend y base de datos `available`.
- [ ] Abrir `http://localhost:8080`; probar entrada y tema claro/oscuro.
- [ ] Crear sala y abrir la IPv4 LAN actual en el segundo dispositivo.
- [ ] Jugar una jugada sincronizada; iniciar bot y confirmar respuesta.
- [ ] Conectar cargador; confirmar batería y acceso a la red local.
- [ ] Cerrar aplicaciones y pestañas ajenas a la presentación.

Obtener la dirección correcta del adaptador Wi-Fi/Ethernet con `ipconfig`; usar `http://<IPv4-LAN>:8080` desde el segundo dispositivo. Si la IPv4, firewall o aislamiento Wi-Fi impiden LAN, no cambiar el firewall durante la presentación: usar `http://localhost:8080` y dos contextos de navegador separados.

## Plan B y diagnóstico

- **No hay segundo dispositivo:** usar dos navegadores, perfiles o ventanas privadas distintas en el mismo equipo. No compartir el mismo perfil/cookie.
- **LAN no conecta:** demostrar desde localhost con dos contextos; explicar que el acceso externo depende de la IPv4 actual, firewall y configuración Wi-Fi.
- **El bot tarda:** esperar el estado “El bot está pensando…”. No repetir el movimiento. Si aparece el control de reintento, usarlo una vez.
- **8080 ocupado:** identificar antes de actuar; no detener otros proyectos automáticamente.

  ```powershell
  docker ps --filter publish=8080
  $listener = Get-NetTCPConnection -State Listen -LocalPort 8080
  $listener | Select-Object LocalAddress, LocalPort, OwningProcess
  $listener | ForEach-Object { Get-Process -Id $_.OwningProcess }
  ```

- **Docker o health falla:** revisar configuración, servicios y logs; no borrar volumen ni reiniciar otros contenedores.

  ```powershell
  docker compose config --quiet
  docker compose ps
  docker compose logs --tail=80 web backend database
  docker compose up -d --build
  Invoke-RestMethod http://localhost:8080/api/health
  ```

  Para confirmar DB: `docker compose exec -T database sh -lc 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 -c "SELECT 1;"'`.

## Limitaciones que declarar

- Proyecto universitario para 2–5 personas en LAN de confianza; la conexión LAN usa HTTP y no está pensada para redes públicas o datos sensibles.
- Sesiones, salas y partidas activas viven en memoria. Reiniciar backend pierde actividad en curso; solo las partidas terminadas están archivadas en PostgreSQL.
- Bot con estrategia y dificultad fijas, deliberadamente sencillo.
- No se realizó una evaluación comparativa formal con aproximadamente cinco participantes. Por tanto, no se presentan métricas humanas cuantitativas de eficacia, eficiencia o satisfacción posteriores al rediseño.
- El protocolo para una posible evaluación posterior está en `11_TESTING_AND_UX_EVALUATION.md`.
