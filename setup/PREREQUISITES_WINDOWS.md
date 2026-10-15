# Prerrequisitos y estrategia LAN — Windows

## Para revisar fase 0

Solo hace falta acceso a los documentos. No instalar Node, PostgreSQL o Docker para aprobar especificación.

## Para futura implementación y demo

- Docker Desktop y Compose disponibles para el arranque reproducible previsto.
- Navegador moderno y dos contextos independientes; otro equipo en misma LAN para prueba real.
- Node.js compatible con dependencias elegidas si se desarrolla fuera de contenedor. Versión concreta y comandos se fijan en fase 1 mediante documentación actual.
- Git para control de versiones si se utiliza; su presencia no se ha verificado en esta fase.
- Puerto 8080 libre, red privada y permiso de firewall acotado al puerto de demo.
- Credenciales locales de PostgreSQL fuera del repositorio; volumen persistente y DB interna.

## Ensayo LAN futuro

1. Levantar servicios con instrucciones verificadas de fase 1.
2. Abrir aplicación en anfitrión y comprobar backend y base de datos.
3. Identificar IPv4 LAN del anfitrión; en otro equipo abrir `http://<IPv4-LAN>:8080`.
4. Confirmar que HTTP y WebSocket usan esa misma dirección; no localhost del cliente ni nombres internos de Compose.
5. Si falla, revisar puerto publicado, escucha del servicio, perfil/firewall, misma red y aislamiento Wi-Fi.
6. Probar sala y movimiento entre equipos; reiniciar y comprobar archivo PostgreSQL, sabiendo que activos se pierden.

La estrategia completa vive en [arquitectura](../docs/07_ARCHITECTURE.md); no duplicar aquí configuración concreta todavía inexistente.

## Script heredado

`check-prerequisites.ps1` lista comandos y versiones; es auxiliar y no se ejecutó ni modificó durante fase 0. Mezcla herramientas de producto y del agente: que falten Codex, uv o Serena no impide usar la aplicación desde un navegador. No interpretar su salida como certificación del entorno o compatibilidad.
