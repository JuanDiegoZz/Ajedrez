# Ajedrez UX

Aplicación universitaria de ajedrez para 2–5 personas en red local. Fase 4 añade el dominio autoritativo de partidas al frontend React, backend Node.js, PostgreSQL, Nginx y Compose.

## Arranque

Requiere Docker Desktop con Docker Compose y acceso a Internet al descargar imágenes la primera vez.

```powershell
docker compose config
docker compose build
docker compose up -d
docker compose ps
docker compose logs --tail=80
```

Abre `http://localhost:8080`. La app conserva una sesión temporal al recargar y muestra el estado de frontend, backend y PostgreSQL. El endpoint `GET /api/health` consulta `SELECT 1` en PostgreSQL. Solo Nginx publica un puerto; backend y base de datos quedan en la red interna de Compose.

El nombre se mantiene en memoria en el backend. El navegador guarda solo `ajedrez_session`: un ID opaco en cookie `HttpOnly`, `SameSite=Lax`, `Path=/`, con duración renovable de 7200 segundos. No se guarda el nombre en `localStorage`. La cookie no usa `Secure` porque el acceso LAN es HTTP. La sesión vence tras dos horas sin actividad o al reiniciar el backend. No hay cuentas ni contraseñas.

En el lobby, `Crear sala` abre un formulario breve. Al entrar la segunda sesión, la sala queda lista y el backend crea la partida: anfitrión con blancas, invitado con negras y turno inicial de blancas. El backend valida movimientos con `chess.js` 1.4.0; su posición actual usa FEN y conserva historial SAN en memoria para reglas como repetición. El lobby usa WebSocket same-origin `/ws`; las operaciones de sala y las consultas/comandos de dominio usan HTTP. No hay tablero visual todavía. Salas y partidas activas viven en memoria; solo partidas terminadas se archivan transaccionalmente en las tablas `games` y `moves`. PostgreSQL no guarda sesiones ni salas.

Para detener servicios sin borrar los datos guardados:

```powershell
docker compose down
```

`docker compose down -v` también borra el volumen de PostgreSQL. No lo uses para una parada normal.

## Acceso desde LAN

Obtén la IPv4 del adaptador conectado a la misma red local, por ejemplo con `ipconfig`. En esta máquina se detectó `192.168.1.15` el 2026-10-15; la dirección puede cambiar.

Desde otro dispositivo en la misma LAN, abre:

```text
http://<IPv4-LAN>:8080
```

La app debe estar levantada y el dispositivo debe poder alcanzar el equipo anfitrión. Si Windows solicita acceso de red, revisa manualmente la regla de firewall para TCP 8080; el proyecto no cambia el firewall. El 2026-10-15 se confirmó desde un celular en la misma LAN que la página carga y muestra frontend, backend y PostgreSQL disponibles en `http://192.168.1.15:8080`.

## Problemas frecuentes

- **El puerto 8080 ya está en uso:** Compose no puede iniciar `web`. Detén el servicio que lo ocupa o libera el puerto y vuelve a ejecutar `docker compose up -d`.
- **Backend o PostgreSQL no disponible:** consulta `docker compose ps` y `docker compose logs --tail=80 backend database web`. La página señala qué servicio no responde y actualiza el estado cada cinco segundos.
- **La primera descarga o compilación falla:** confirma que Docker Desktop esté iniciado y repite `docker compose build` cuando haya conexión a Internet.
- **Otro equipo no abre la URL LAN:** confirma que ambos equipos estén en la misma red, usa la IPv4 vigente del anfitrión y revisa manualmente firewall o aislamiento de clientes del Wi-Fi.

## Límites conocidos

- El modo contra bot sigue deshabilitado hasta Fase 7. La sala lista anuncia inicio y colores. El servidor ya mantiene y valida el dominio de ajedrez; el tablero visual pertenece a la fase siguiente.
- Las sesiones, salas y partidas activas viven en memoria; reiniciar el backend las elimina.
- Cerrar pestaña no cancela la sala. Cancela una sala antes de que entre el segundo jugador; la salida de una partida activa quedará disponible desde la pantalla de partida.
- El puerto predeterminado es 8080. Si otra aplicación lo ocupa, hay que liberarlo antes del arranque normal.
- La prueba LAN desde un celular en la misma red pasó el 2026-10-15.
- La conexión al puerto LAN se enlaza a todas las interfaces del anfitrión. Úsala solo en una red de confianza.
- PostgreSQL conserva su volumen entre paradas normales. Reiniciar backend pierde sesiones, salas, partidas activas y cualquier archivo pendiente de reintento.

## Documentación

- [Alcance](docs/01_SCOPE.md)
- [Arquitectura](docs/07_ARCHITECTURE.md)
- [Roadmap](docs/12_ROADMAP.md)
- [Decisiones](docs/13_DECISIONS.md)
- [Progreso y evidencia](docs/14_PROGRESS.md)
- [Árbol vigente](PROJECT_TREE.md)
