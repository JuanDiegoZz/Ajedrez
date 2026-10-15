# Prompt — Implementar una fase autorizada

Antes de actuar, lee AGENTS.md, README.md, decisiones aceptadas y propuestas de docs/13_DECISIONS.md, progreso de docs/14_PROGRESS.md, fase correspondiente de docs/12_ROADMAP.md y documentos especializados relevantes.

## Puerta de entrada

Implementa únicamente la fase expresamente encargada. No interpretes este prompt, una propuesta o la siguiente casilla incompleta como autorización. Si la especificación no está aprobada o no hay fase autorizada, prepara el resumen concreto para revisión y detente antes de escribir código.

## Procedimiento

1. Identifica requisitos, límites, archivos afectados y criterios de aceptación de esa fase.
2. Usa Context7 para APIs/configuración actuales necesarias; selecciona versiones compatibles y documenta dependencias nuevas.
3. Aplica metodología Superpowers proporcional y minimalismo Ponytail. Sin capas, paquetes o funciones fuera de alcance.
4. Activa Serena si está disponible y resulta útil para código existente; documentación versionada prevalece sobre memorias.
5. Implementa flujo completo de la fase con validación, feedback, errores y accesibilidad aplicables.
6. Ejecuta pruebas pertinentes y registra resultados reales. Si existe interfaz, usa Playwright; no reemplaza prueba de dos equipos LAN cuando corresponda.
7. Corrige fallos de la fase. No declara éxito por compilar solamente.
8. Actualiza progreso y documentos afectados. Cambios arquitectónicos o de alcance se proponen antes de implementarlos.
9. Resume comportamiento entregado, evidencia, archivos, límites y pendientes.
10. Detente al cerrar la fase. No iniciar la siguiente automáticamente.

No eliminar requisitos o evidencia UX para reducir código. No afirmar evaluaciones que no se realizaron ni presentar datos simulados como resultados.
