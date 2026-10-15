# Instrucciones del proyecto para Codex

## 1. Lee antes de actuar

Antes de modificar código o arquitectura, lee `README.md` y todos los archivos relevantes de `docs/`.

Si existe una contradicción:

1. `docs/13_DECISIONS.md` tiene prioridad para decisiones ya aceptadas.
2. Luego `docs/01_SCOPE.md`.
3. Luego los requisitos y documentos especializados.
4. Este `AGENTS.md` define reglas de trabajo, no requisitos funcionales detallados.

## 2. Naturaleza del proyecto

Este es un proyecto universitario de UX, no un producto comercial.

Contexto esperado:

- aproximadamente 2–5 usuarios;
- ejecución principalmente en red local;
- demostraciones y pruebas de usabilidad;
- frontend y experiencia de interacción tienen prioridad académica;
- backend debe ser suficiente, simple y comprensible.

No diseñes para millones de usuarios salvo que un requisito nuevo y explícito lo pida.

## 3. Regla de alcance

Aplicar YAGNI estrictamente.

No introducir sin justificación:

- microservicios;
- Kubernetes;
- colas distribuidas;
- Redis;
- OAuth/SSO;
- 2FA;
- arquitectura event-driven compleja;
- sistemas de roles empresariales;
- observabilidad de producción compleja;
- infraestructura cloud innecesaria.

Si una solución simple satisface el requisito, preferirla.

## 4. Prioridad UX

Cada función visible debe responder al menos una de estas preguntas:

- ¿Ayuda al usuario a saber qué puede hacer?
- ¿Ayuda al usuario a saber qué acaba de ocurrir?
- ¿Previene un error?
- ¿Reduce pasos o confusión?
- ¿Hace más claro el estado del juego?
- ¿Mejora eficacia, eficiencia o satisfacción de forma evaluable?

Evitar animaciones decorativas que no aporten comprensión.

## 5. ISO 9241-210

No afirmar que la aplicación está “certificada” o que “cumple completamente” la norma.

Usar formulaciones como:

- “proceso de diseño centrado en el usuario basado en ISO 9241-210”;
- “decisiones de UX guiadas por principios de diseño centrado en las personas”.

Debe existir evidencia de iteración: necesidad → diseño → prueba → hallazgo → mejora.

## 6. Tecnología objetivo

La arquitectura inicial deseada es pequeña:

- Frontend: React.
- Backend: Node.js con una estructura sencilla.
- Tiempo real: WebSocket.
- Base de datos: PostgreSQL.
- Entorno: Docker / Docker Compose.
- Reglas de ajedrez: preferir una librería estable, no reimplementar todas las reglas desde cero.
- Bot: suficiente para demostrar una partida; no es el foco del proyecto.

Las librerías exactas se deciden en `docs/13_DECISIONS.md` después del análisis.

## 7. Reglas para dependencias

Antes de agregar una dependencia nueva:

1. justificar por qué es necesaria;
2. comprobar si la funcionalidad ya existe en el stack;
3. consultar documentación actual mediante Context7 cuando sea una librería externa;
4. evitar paquetes redundantes;
5. registrar una decisión importante en `docs/13_DECISIONS.md`.

## 8. Uso de herramientas/skills

### Superpowers — metodología base

Usarlo para brainstorming, especificación, planificación, TDD/debugging y revisión por fases cuando sea compatible con estas reglas.

Nunca debe ampliar el alcance por iniciativa propia.

### Context7 — documentación actual

Usarlo cuando se necesite sintaxis o comportamiento actual de React, librerías de ajedrez, WebSocket, PostgreSQL, testing u otras dependencias.

No adivinar APIs actuales cuando Context7 pueda verificarlas.

### Playwright — verificación de interfaz

Usarlo después de implementar flujos visibles para verificar comportamiento real en navegador.

Prioridades de prueba:

- entrar al lobby;
- crear sala;
- ver sala desde otro navegador/contexto;
- unirse a sala;
- comenzar partida;
- seleccionar pieza;
- mostrar movimientos válidos;
- realizar movimiento;
- sincronizar movimiento entre jugadores;
- mostrar turno y último movimiento;
- finalizar partida.

Preferir selectores accesibles y roles visibles para el usuario.

### Serena — navegación y edición semántica del código

Usarla cuando ya exista código y sea útil comprender símbolos, referencias y relaciones entre archivos antes de modificar.

Prioridades de uso:

- localizar componentes, funciones, clases, tipos y sus referencias;
- comprender impacto antes de un refactor;
- editar por símbolo cuando sea más seguro que buscar/reemplazar texto;
- navegar código existente sin cargar archivos completos innecesariamente;
- apoyar refactors entre frontend, backend y lógica compartida.

No usar Serena para inventar arquitectura ni ampliar alcance. Durante la fase inicial compuesta solo por documentación Markdown, su uso es opcional.

Si Serena está disponible, activarla sobre el directorio actual del proyecto al comenzar una sesión de implementación. La documentación viva del repositorio sigue teniendo prioridad sobre cualquier memoria auxiliar de Serena.

### Ponytail — minimalismo

Puede usarse para revisar si una solución tiene código, capas o dependencias innecesarias.

No permitir que elimine requisitos funcionales o evidencia UX aprobada.

### Caveman — concisión de comunicación

Es opcional. Puede usarse para reducir relleno en respuestas, revisiones o commits.

No usarlo para comprimir requisitos, decisiones UX, planes de pruebas o documentación de forma que se pierda contexto. La exactitud tiene prioridad sobre la brevedad.

## 9. Trabajo por fases

No implementar varias fases grandes a la vez.

Para cada fase:

1. leer requisitos relevantes;
2. proponer el cambio mínimo;
3. implementar;
4. ejecutar pruebas pertinentes;
5. probar en navegador si hay interfaz;
6. actualizar `docs/14_PROGRESS.md`;
7. registrar decisiones nuevas en `docs/13_DECISIONS.md`;
8. detenerse si la siguiente fase cambia arquitectura o alcance.

## 10. Documentación viva

Cuando el comportamiento real cambie, actualizar el `.md` correspondiente en el mismo cambio.

No dejar documentación deliberadamente desactualizada.

## 11. Seguridad proporcionada al contexto

Aunque el proyecto sea local, mantener mínimos razonables:

- validar movimientos también en servidor;
- no confiar en estado enviado por el cliente;
- no guardar contraseñas porque inicialmente no habrá cuentas con contraseña;
- validar entradas básicas;
- no exponer secretos en el repositorio.

No convertir estas reglas en un sistema de seguridad empresarial.

## 12. Definición de terminado

Una función no está terminada solo porque “compila”. Debe:

- funcionar;
- tener estados de error básicos;
- ser comprensible;
- tener feedback visible cuando corresponda;
- estar probada a nivel apropiado;
- mantener sincronizada la documentación.
