# Ajedrez UX

Aplicación universitaria de ajedrez para 2–5 personas en una red local de confianza. Ofrece partidas humanas y contra bot mediante React, Node.js, PostgreSQL, Nginx y Docker Compose.

## Inicio rápido en Windows

Requiere Windows 10 22H2 (build 19045) o Windows 11 23H2+ (build 22631+) y Docker Desktop con Docker Compose v2. Si Docker Desktop falta, el launcher puede ofrecer instalar el paquete oficial `Docker.DockerDesktop` mediante winget. La instalación puede pedir UAC y requerir WSL2, virtualización o reiniciar Windows; el launcher no activa esas funciones ni reinicia el equipo. Node.js, npm, PostgreSQL y Nginx no se instalan en el host.

1. Descarga y extrae el ZIP de GitHub, o clona el repositorio.
2. Haz doble clic en `AJEDREZ.bat`.
3. Selecciona `Jugar / Iniciar` y espera la comprobación de Docker y los servicios. El navegador se abrirá cuando Ajedrez esté listo.

La consola muestra `http://localhost:8080` y las IPv4 LAN privadas detectadas. Permitir TCP 8080 en Windows Firewall es opcional, requiere confirmación explícita y se limita al perfil privado/subred local.

| Archivo | Acción |
|---|---|
| `AJEDREZ.bat` | Abre el menú principal para iniciar, revisar, reparar, detener o desinstalar. Salir del menú no detiene servicios. |
| `START_AJEDREZ.bat` | Inicia Ajedrez directamente. |
| `STOP_AJEDREZ.bat` | Detiene servicios y conserva datos. |
| `STATUS_AJEDREZ.bat` | Diagnostica Docker, puerto, salud, contenedores, LAN y firewall. |
| `RESET_AJEDREZ.bat` | Reconstruye servicios tras confirmar `REINICIAR`; conserva PostgreSQL. |
| `UNINSTALL_AJEDREZ.bat` | Ofrece conservar datos o borrar recursos y volumen con confirmación `ELIMINAR`. |

El desinstalador no quita Docker Desktop ni borra esta carpeta. Detalles, seguridad y límites en [launcher Windows](docs/WINDOWS_LAUNCHER.md).

## Arranque manual (alternativa)

Requiere Docker Desktop iniciado, Docker Compose v2 y un navegador moderno. No hace falta instalar Node.js ni PostgreSQL en el equipo anfitrión para ejecutar la aplicación con Compose. Se requiere acceso a Internet la primera vez que se descargan imágenes y paquetes durante la compilación.

```powershell
docker compose up -d --build
docker compose ps
```

Abre `http://localhost:8080`. La app conserva una sesión temporal al recargar y muestra el estado de frontend, backend y PostgreSQL. Comprueba `Invoke-RestMethod http://localhost:8080/api/health`; se espera backend y base de datos `available`. El endpoint llama al backend, que ejecuta `SELECT 1` en PostgreSQL. Solo Nginx publica `0.0.0.0:8080`; backend y base de datos quedan en la red interna de Compose.

Para comprobar PostgreSQL directamente:

```powershell
docker compose exec -T database sh -lc 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 -c "SELECT 1;"'
```

Las pruebas locales opcionales son `cd backend; npm test` y `cd frontend; npm run build`. No hacen falta para ejecutar la aplicación con Docker.

El encabezado permite cambiar modo claro/oscuro. Los detalles técnicos están en “Servicios disponibles” / “Estado de servicios”, al pie. La interfaz usa piezas SVG y tipografía locales, sin CDN; [créditos y licencias](frontend/public/assets/CREDITS.txt) también están disponibles desde el pie de la aplicación.

El nombre se mantiene en memoria en el backend. La identidad del usuario usa `ajedrez_session`: un ID opaco en cookie `HttpOnly`, `SameSite=Lax`, `Path=/`, con duración renovable de 7200 segundos. No se guarda el nombre en `localStorage`; solo se guarda allí `ajedrez_theme` (`light`/`dark`) para recordar el tema visual. La cookie no usa `Secure` porque el acceso LAN es HTTP. La sesión vence tras dos horas sin actividad o al reiniciar el backend. No hay cuentas ni contraseñas.

En el lobby, `Crear sala` abre un formulario breve. Al entrar la segunda sesión, la sala queda lista y el backend crea la partida: anfitrión con blancas, invitado con negras y turno inicial de blancas. La pantalla muestra tablero orientado al color del jugador, destinos legales, capturas, último movimiento e historial. Click/tap selecciona pieza y destino; con teclado, usa Tab/flechas, Enter/espacio y Escape. El servidor valida las jugadas con `chess.js` 1.4.0; FEN representa la posición y el historial SAN en memoria permite reglas como repetición. El mismo WebSocket same-origin `/ws` actualiza lobby y snapshots de partida; consultas y comandos de sala, jugada y abandono usan HTTP. La promoción permite elegir dama, torre, alfil o caballo. Jaque, mate, tablas y abandono muestran resultado. Salas y partidas activas viven en memoria; solo partidas terminadas se archivan transaccionalmente en `games` y `moves`. PostgreSQL no guarda sesiones ni salas.

`Jugar contra bot` inicia directamente una partida privada: tú juegas blancas y el bot negras. El backend usa minimax fijo de dos medias jugadas en un trabajador Node, con evaluación material sencilla y búsqueda limitada. El mismo tablero muestra “El bot está pensando…”, recibe snapshots por `/ws` y recupera la partida al recargar.

Si el WebSocket cae, el navegador reintenta y el servidor conserva sala/partida por 60 segundos desde que detecta la desconexión. La partida se pausa. Si el usuario vuelve con la misma cookie antes del vencimiento, recibe snapshot oficial y continúa. Si no vuelve, el rival gana por desconexión; si ambos siguen ausentes, la partida se interrumpe sin ganador. Un anfitrión desconectado oculta su sala esperando durante esa ventana; luego se elimina. Una pestaña nueva con la misma sesión sustituye a la anterior.

Para detener servicios sin borrar los datos guardados:

```powershell
docker compose down
```

`docker compose down -v` también borra el volumen de PostgreSQL. No lo uses para una parada normal.

## Acceso desde LAN

Obtén la IPv4 del adaptador Ethernet o Wi-Fi conectado a la red de demo; en Windows, `ipconfig` muestra las direcciones. Ignora adaptadores virtuales, loopback y `169.254.x.x`. La dirección puede cambiar entre redes.

Desde otro dispositivo en la misma LAN, abre:

```text
http://<IPv4-LAN>:8080
```

La app debe estar levantada y el dispositivo debe poder alcanzar el equipo anfitrión. Si Windows solicita acceso de red, revisa manualmente la regla de firewall para TCP 8080; el proyecto no cambia el firewall. El 2026-10-15 se confirmó desde un celular en la misma LAN que la página carga y muestra frontend, backend y PostgreSQL disponibles en `http://192.168.1.15:8080`. Nginx entrega React y enruta `/api/` y `/ws` al backend en el mismo origen.

## Problemas frecuentes

- **El puerto 8080 ya está en uso:** identifica el proceso con `$listener = Get-NetTCPConnection -State Listen -LocalPort 8080; Get-Process -Id $listener.OwningProcess`. Para contenedores, usa `docker ps --filter publish=8080`. Revisa el servicio antes de detenerlo; no cierres automáticamente otros proyectos.
- **Backend o PostgreSQL no disponible:** consulta `docker compose ps` y `docker compose logs --tail=80 backend database web`. La página señala qué servicio no responde y actualiza el estado cada cinco segundos.
- **La primera descarga o compilación falla:** confirma que Docker Desktop esté iniciado y repite `docker compose up -d --build` cuando haya conexión a Internet.
- **Otro equipo no abre la URL LAN:** confirma que ambos equipos estén en la misma red, usa la IPv4 vigente del anfitrión y revisa manualmente firewall o aislamiento de clientes del Wi-Fi.
- **Diagnóstico general:** ejecuta `docker compose config --quiet`, `docker compose ps` y `docker compose logs --tail=80 web backend database`. No borres volúmenes ni detengas contenedores de otros proyectos como primer intento.

## Límites conocidos

- El bot tiene dificultad fija y horizonte corto; no es una IA competitiva. Se limita a dos cálculos simultáneos.
- Es un proyecto universitario de demostración para 2–5 personas en una LAN de confianza; no está diseñado para acceso público ni datos sensibles.
- Sesiones, salas, partidas activas y temporizadores de recuperación viven en memoria. Reiniciar backend los elimina; la partida activa no se recupera y la app solicita volver a entrar.
- La gracia de 60 segundos empieza cuando el servidor detecta la desconexión; heartbeat consulta cada 10 segundos y un corte silencioso puede tardar hasta unos 20 segundos en detectarse.
- El corte y la recuperación se probaron en Playwright con caída del WebSocket. No se hizo otro corte físico de red LAN en esta fase.
- El puerto predeterminado es 8080. Si otra aplicación lo ocupa, hay que liberarlo antes del arranque normal.
- La prueba LAN desde un celular en la misma red pasó el 2026-10-15.
- La conexión al puerto LAN se enlaza a todas las interfaces del anfitrión. Úsala solo en una red de confianza.
- PostgreSQL conserva su volumen entre paradas normales. Reiniciar backend pierde sesiones, salas, partidas activas y cualquier archivo pendiente de reintento.
- No se realizó una evaluación comparativa formal con aproximadamente cinco participantes. No existen métricas humanas cuantitativas posteriores al rediseño; el protocolo disponible no representa resultados.

## Documentación

- [Alcance](docs/01_SCOPE.md)
- [Arquitectura](docs/07_ARCHITECTURE.md)
- [Roadmap](docs/12_ROADMAP.md)
- [Decisiones](docs/13_DECISIONS.md)
- [Progreso y evidencia](docs/14_PROGRESS.md)
- [Guion de demo y checklist](docs/15_FINAL_DEMO.md)
- [Árbol vigente](PROJECT_TREE.md)
