# Herramientas del agente: roles y límites

Estas herramientas ayudan al trabajo; no forman parte de la aplicación ni son dependencias del producto. La fase 0 no instala, actualiza ni verifica ejecutables. La disponibilidad depende de la sesión; una guía o ejemplo de configuración no demuestra que un MCP esté conectado.

## Uso por etapa

| Herramienta | Cuándo usar | Límite |
|---|---|---|
| Superpowers | Análisis, especificación, planificación, debugging y revisión | AGENTS y encargo del usuario prevalecen; no ampliar alcance ni implementar tras fase 0 |
| Context7 | Verificar APIs/configuración actuales de dependencias | Resolver ID y consultar concepto concreto; no enviar secretos |
| Playwright | Al existir interfaz, flujos reales y dos contextos | No sustituye prueba LAN ni evaluación con personas |
| Serena | Al existir código y necesitar símbolos/referencias | Opcional para Markdown; memorias auxiliares no son fuente de requisitos |
| Chrome DevTools | Al investigar navegador, red o rendimiento real | No necesario durante especificación documental |
| Ponytail | Revisar simplicidad y reutilización | No eliminar validación, accesibilidad o evidencia UX |
| Caveman | Respuestas y resúmenes breves | No comprimir documentación hasta perder contexto |

## Instalación y configuración

Instalar solo si la fase necesita una herramienta ausente. Primero inspeccionar conexiones existentes para evitar duplicados. Consultar fuente oficial actual y comprobar compatibilidad con entorno antes de copiar comandos. Los comandos originales del starter no se mantienen como recetas garantizadas: no fueron validados durante esta auditoría.

El archivo `.codex/config.toml.example` es un ejemplo heredado, no una configuración activa ni una receta validada en esta fase. Revisarlo contra documentación oficial antes de usarlo; nunca copiar claves al repositorio.

Fuentes para consulta posterior, no verificaciones de instalación realizadas:

- [Context7](https://context7.com/docs/resources/all-clients).
- [Playwright MCP](https://github.com/microsoft/playwright-mcp).
- [Superpowers](https://github.com/obra/superpowers).
- [Serena oficial](https://github.com/oraios/serena).
- [Ponytail](https://github.com/DietrichGebert/ponytail).
- [Caveman](https://github.com/JuliusBrussee/caveman).

No todos los auxiliares son necesarios. No reinstalar herramientas para completar una tarea documental.

## Comprobación

[VERIFY_TOOLS](VERIFY_TOOLS.md) define comprobaciones de capacidad cuando corresponda; [SERENA](SERENA.md) delimita navegación semántica. Prerrequisitos del producto en [PREREQUISITES_WINDOWS](PREREQUISITES_WINDOWS.md).
