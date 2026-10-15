# 11 — Verificación técnica y evaluación UX

Este documento define metodología. No contiene resultados reales ni porcentajes de mejora ficticios.

## Pruebas técnicas proporcionales

| Nivel | Casos necesarios | Requisitos |
|---|---|---|
| Unitarias de lógica propia | Cupo, pertenencia, validación, revisión, idempotencia y finalización única | RF-004–016, RF-050–054 |
| Integración de reglas | Enroque permitido/prohibido, captura al paso, cuatro promociones, jaque, mate, ahogado, material, repetición y 50 movimientos | RF-030–034 |
| Integración servidor | Dos clientes, solicitud ilegal/manipulada, doble envío, carrera de unión, desconexión y snapshot | RF-010–016 |
| Persistencia | Transacción completa, orden de ply, guardado idempotente, error/reintento y lectura tras reiniciar | RF-054 |
| Bot | Casos de `10`, cancelación, límites y revalidación | RF-040–043 |
| Navegador | Flujos accesibles, selección, feedback, teclado, responsive y movimiento reducido | RF-020–027, `02` |

No duplicar toda la batería interna de chess.js: probar las integraciones y políticas del proyecto. Usar posiciones deterministas de prueba, nunca endpoints de depuración expuestos a usuarios. Herramientas exactas se validan en su fase.

## Playwright cuando exista interfaz

Dos contextos independientes A/B para sesiones distintas. Entrar → crear → ver sala en B → unirse → inicio automático → A selecciona → ve destinos → mueve → B observa mismo estado y turno → B responde → último movimiento e historial coherentes → abandonar → ambos ven mismo resultado → lobby.

Casos complementarios: sala llena/eliminada, promoción por teclado, captura al paso, enroque, mate/tablas preparados, rechazo de revisión, recarga, desconexión temporal, pérdida definitiva, bot, fallo de guardado y nueva partida. Preferir roles y nombres accesibles; no identificar una pieza solo por color o estructura CSS.

También probar dos equipos reales en LAN. Dos contextos en un solo equipo no verifican firewall, Wi-Fi o host publicado.

## Estudio de usabilidad: unos cinco estudiantes

Objetivo formativo; muestra pequeña, sin generalización estadística. Buscar mezcla de experiencia de ajedrez y familiaridad con aplicaciones. Registrar experiencia antes de tareas. Una sesión individual de 20–30 minutos; moderador puede actuar como rival siguiendo guion idéntico, sin orientar al participante. No requiere cinco jugadores simultáneos.

### Preparación

- Usar alias P01–P05; explicar propósito y consentimiento. Evaluamos interfaz, no habilidad personal.
- Registrar versión, fecha, dispositivo, navegador, modalidad de entrada y experiencia previa.
- Preparar mismo estado inicial por tarea. Posiciones especiales se cargan por fixtures del entorno de prueba, sin agregar pantallas de producto.
- Piloto con una persona distinta si es posible; corregir guion antes de medir.
- No grabar pantalla/voz sin consentimiento. Mantener notas anónimas y capturas sin nombres reales.

### Guion neutral de apertura

“Queremos comprobar si la aplicación resulta clara. No estamos evaluando tus conocimientos. Intenta realizar cada tarea como lo harías normalmente. Puedes decir qué esperas que ocurra. Durante la tarea evitaré indicarte dónde pulsar. Puedes detenerte cuando quieras.”

No explicar marcadores, ubicación de botones o secuencia correcta antes de medir. Si desconoce una regla de ajedrez, aclarar la regla y registrar ayuda; no contar ese intento como éxito sin ayuda.

### Tareas y metas propuestas

Tiempo desde terminar de leer instrucción hasta estado objetivo; “sin ayuda” excluye indicaciones de interfaz del moderador. Parar a los 120 s por tarea operativa o antes si participante lo pide. Registrar bloqueo y continuar desde estado preparado.

| Tarea | Instrucción al participante | Éxito observable | Meta inicial |
|---|---|---|---|
| T1 Entrada | “Entra con el nombre que prefieras” | Lobby y nombre visible | ≥4/5 sin ayuda; mediana ≤30 s |
| T2 Crear | “Prepara una partida para que otra persona pueda entrar” | Sala esperando visible para rival | ≥4/5; mediana ≤30 s desde lobby |
| T3 Unirse | “Encuentra la sala del compañero y entra” | Partida iniciada con color propio visible | ≥4/5; mediana ≤30 s desde lobby |
| T4 Turno | “¿A quién le toca y con qué color juegas?” | Respuesta correcta, sin mover | 5/5; respuesta ≤5 s como meta |
| T5 Mover | “Mueve una de tus piezas a un lugar permitido” | Una jugada confirmada e identifica destino legal | ≥4/5; mediana ≤20 s |
| T6 Captura/última jugada | “¿Qué movió el rival? Realiza esta captura cuando sea tu turno” | Identifica origen/destino y captura indicada legalmente | ≥4/5; mediana ≤30 s |
| T7 Bot | “Comienza una partida contra el sistema y juega una vez” | Mueve humano y reconoce respuesta/turno del bot | ≥4/5; mediana ≤45 s |
| T8 Salida | “Deja esta partida y vuelve a donde puedas elegir otra” | Confirma abandono, entiende resultado y vuelve al lobby | ≥4/5; mediana ≤30 s |
| T9 Desconexión | “¿Qué está pasando y qué harías ahora?” (mostrar rival desconectado) | Identifica la pérdida de conexión y entiende que la app espera su regreso | ≥4/5 sin ayuda; respuesta ≤10 s como meta |

Verificar promoción y jaque como observaciones complementarias con estados preparados. No obligar a producir mate desde partida completa para medir comprensión del resultado. Metas son hipótesis de aceptación, no valores extraídos de estudios.

### Registro por tarea

| Campo | Definición |
|---|---|
| Participante / versión / tarea | Identificadores anónimos comparables |
| Resultado | Sin ayuda / con ayuda / no completada |
| Tiempo | Segundos; distinguir tareas detenidas, no incluirlas como éxitos rápidos |
| Acciones | Activaciones, selecciones y envíos; definir mismo conteo en ambas versiones |
| Errores | Destino inválido, acción equivocada, retroceso, doble intento o interpretación incorrecta |
| Ayuda | Tipo y momento exactos |
| Observación | Qué ocurrió, sin atribuir intención no expresada |
| Valoración | Facilidad percibida 1–5 y comentario |

Eficacia = éxitos sin ayuda / intentos válidos por tarea; reportar también conteo, por ejemplo n/5, sin inventar n. Eficiencia = mediana y rango de tiempo entre éxitos sin ayuda, acciones, errores y retrocesos. No ocultar fallos excluidos de la mediana. Satisfacción = distribución y mediana Likert; no tratar cinco respuestas como validación estadística.

### Preguntas posteriores

Después de cada tarea: “¿Qué tan fácil te resultó?”, de 1 muy difícil a 5 muy fácil. Al terminar, valorar 1–5: comenzar partida fue fácil; entendí turno; entendí destinos; mensajes claros; experiencia agradable. Añadir: “¿Qué te confundió?”, “¿Qué esperabas que ocurriera?” y “¿Qué cambiarías primero?”.

SUS queda opcional solo si lo solicita la asignatura, con cuestionario y cálculo estandarizados verificados entonces. No llamar SUS a la encuesta breve propia.

## Comparación inicial y mejorada

1. Congelar versión A antes del pulido y guardar identificador de versión/capturas.
2. Ejecutar tareas, ordenar hallazgos: bloqueante, serio o menor, con evidencia y requisito relacionado.
3. Cambiar solo problemas observados; registrar necesidad → diseño → observación → mejora en `14`.
4. Ejecutar tareas equivalentes en versión B, conservando dispositivo, instrucciones y medición. Usar posiciones diferentes de dificultad equivalente.
5. Preferir participantes nuevos si se dispone de ellos; si se repiten los mismos cinco, declarar aprendizaje y familiaridad como sesgo. No atribuir toda mejora al diseño.
6. Comparar n/N, tiempos, acciones, errores y satisfacción por tarea; adjuntar observaciones que expliquen diferencias. Si no mejora, documentarlo y reconsiderar diseño.

Las metas UX orientan cierre; si no se alcanzan, se requiere otra iteración o aceptación explícita de la desviación. No se declara proyecto terminado ocultando tareas fallidas.
