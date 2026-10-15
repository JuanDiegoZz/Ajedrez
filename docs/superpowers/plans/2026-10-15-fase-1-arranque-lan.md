# Fase 1 — Arranque LAN

**Objetivo:** entregar una aplicación mínima React + Node.js + PostgreSQL, accesible por un único puerto LAN y arrancable con Docker Compose.

**Arquitectura:** Vite compila React a estáticos; Nginx los sirve y enruta `/api/` al backend. Node usa HTTP nativo y `pg` para consultar `SELECT 1`. Compose mantiene backend y base de datos en red interna.

**Tecnologías:** React 19, Vite 8, Node 24, PostgreSQL 18, Nginx, Docker Compose.

**Especificación:** `docs/12_ROADMAP.md`, Fase 1; criterios de este encargo.

## Límites

- Solo página de diagnóstico, endpoint de salud, conectividad PostgreSQL, Compose y documentación de arranque.
- No lobby, salas, tablero, reglas, WebSocket de juego, multijugador, bot ni historial.
- Publicar solo web en el puerto 8080; backend y PostgreSQL permanecen privados.

## Tareas

- [x] Crear frontend React con consulta periódica a `/api/health` y estados legibles.
- [x] Crear backend nativo HTTP con estado real de PostgreSQL y respuesta degradada.
- [x] Crear Compose, proxy Nginx, Dockerfiles, variables de desarrollo y lockfiles.
- [x] Actualizar README, árbol real y progreso; no hubo decisión técnica nueva para registrar.
- [x] Verificar configuración, builds, servicios, endpoint, PostgreSQL, navegador y caso backend caído; pruebas en `docs/14_PROGRESS.md`.
- [x] Revisar estado Git, secretos, alcance y prueba LAN; repositorio local recién inicializado, sin archivos staged ni remoto. El usuario confirmó el acceso desde un celular en `http://192.168.1.15:8080`.
