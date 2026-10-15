# 05 — Requisitos de calidad y riesgos

## Criterios medibles

Son metas de aceptación, no resultados obtenidos. Medir en equipo y LAN de demostración, documentando navegador y hardware.

| ID | Requisito | Verificación |
|---|---|---|
| RNF-UX-001 | Flujos sin entrenamiento extenso | Protocolo y metas de `11` |
| RNF-UX-002 | Feedback de selección y envío en menos de 100 ms | Medición en navegador, diez acciones |
| RNF-UX-003 | Estados sin dependencia exclusiva del color | Revisión visual y lector de pantalla de `02` |
| RNF-UX-004 | Acciones inválidas prevenidas; rechazo recuperable | Casos negativos de `04` |
| RNF-PERF-001 | 95 % de 20 movimientos humanos visibles en ambos clientes en ≤500 ms desde envío en LAN | Registrar tiempos de envío y recepción, sin contar tiempo humano |
| RNF-PERF-002 | 2–5 sesiones, hasta dos partidas concurrentes | Abrir contextos y comprobar lobby durante cálculo de bot |
| RNF-PERF-003 | Bot responde en ≤1 s como meta; fallo controlado a los 2 s | `10`, sin espera artificial |
| RNF-STATE-001 | Estado de servidor único; revisión creciente | Comparar snapshots en dos clientes |
| RNF-STATE-002 | Petición manipulada no altera turno, color o legalidad | Pruebas de integración |
| RNF-ENV-001 | Arranque Compose desde copia limpia con instrucciones | Ensayo de `12`, acceso desde otro equipo |
| RNF-ENV-002 | PostgreSQL interno y volumen persistente | Guardar partida y consultar después de reiniciar |
| RNF-MAIN-001 | Una aplicación backend, módulos simples y sin capas vacías | Revisión del árbol propuesto |
| RNF-MAIN-002 | Dependencia nueva justificada y documentada | Registro `13` y lockfile durante implementación |
| RNF-MAIN-003 | Comportamiento y documentación coinciden | Revisar documentos afectados en cada fase |

## Seguridad proporcional

- LAN de confianza; no publicar en internet como parte del MVP.
- Sesión con identificador aleatorio no adivinable; nombre nunca es credencial. Cookie HttpOnly, SameSite y validación de Origin en mutaciones y upgrade.
- En HTTP LAN no activar Secure si impide sesión; documentar que no hay confidencialidad de transporte. HTTPS requeriría `wss` y revisión adicional antes de exposición pública.
- Validar tipos, longitudes, casillas, promoción, pertenencia y tamaño de mensajes. Límite conceptual de 16 KiB por mensaje de cliente, sin aceptar campos de estado arbitrario.
- No renderizar nombres como HTML, no almacenar contraseñas, no incluir secretos o identificadores de sesión en logs o URLs.
- Credenciales PostgreSQL por entorno local no versionado; ejemplo sin secretos. Nunca exponer puerto de base de datos a LAN por defecto.

## Registro de riesgos

| Riesgo | Mitigación simple | Prueba |
|---|---|---|
| Clientes divergen | Snapshot completo y revisión; no estado optimista | Comparar tras 20 jugadas y reconexión |
| Doble envío o comandos concurrentes | ID de solicitud, revisión esperada y sección crítica síncrona | Repetición y carrera |
| WebSocket silenciosamente roto | Heartbeat, estado de conexión y plazo de gracia | Cortar red |
| FEN pierde repetición | Conservar instancia e historial completo | Secuencia de triple repetición |
| Orientación cambia coordenadas | Coordenadas lógicas independientes del render | Mover desde negras con ratón y teclado |
| Bot bloquea servidor | Un trabajador por cálculo acotado y cancelable | Abrir lobby mientras piensa |
| Resultado tardío de bot | Validar ID y revisión antes de aplicar | Abandonar mientras calcula |
| Animación aplica estado viejo | Estado confirmado primero; cancelar transición obsoleta | Snapshots rápidos y movimiento reducido |
| Fallo PostgreSQL | Resultado en memoria; guardado idempotente y aviso | Simular caída al finalizar |
| Reinicio de servidor | No prometer recuperación; terminar registros solo al finalizar | Recargar cliente tras reinicio |
| Dos pestañas misma sesión | Una conexión controladora; reemplazo explícito | Abrir segunda pestaña |
| Alcance creciente | `01` y aprobación de cambios | Revisión al cerrar fase |
| Sesgo de prueba pequeña | Reportar conteos, experiencia y límites | Comparación descrita en `11` |

Tiempos, colores y usabilidad requieren pruebas futuras; estos documentos no acreditan rendimiento ni accesibilidad ya logrados.
