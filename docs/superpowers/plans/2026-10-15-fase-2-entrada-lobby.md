# Fase 2 — Entrada y lobby

## Alcance

Implementar sesión temporal, validación del nombre, recuperación tras recarga y lobby vacío con estados de carga/error. Crear/unirse a salas pertenece a Fase 3; partida contra bot pertenece a Fase 7. Las acciones futuras se muestran deshabilitadas y explicadas.

## Tareas

- [x] Probar validación del nombre e identidad temporal opaca.
- [x] Añadir API HTTP de sesión y listado vacío, sin alterar `/api/health`.
- [x] Crear entrada y lobby responsive con carga, vacío, error, accesibilidad y estado de servicios.
- [x] Actualizar README, árbol, decisiones aprobadas y progreso.
- [x] Ejecutar pruebas, Compose y flujos Playwright; revisar diff, secretos y alcance.

## Evidencia

- `npm test`: 2 pruebas correctas.
- `docker compose config` y `docker compose up -d --build`: correctos.
- Playwright verificó nombre vacío prevenido, entrada con Enter, nombre recortado, lobby vacío, recarga de sesión, sesiones independientes, error comprensible, foco y ancho móvil sin desbordamiento.
- Crear/unirse y partida bot no se implementaron: pertenecen a Fase 3 y Fase 7 en `12_ROADMAP.md`.
