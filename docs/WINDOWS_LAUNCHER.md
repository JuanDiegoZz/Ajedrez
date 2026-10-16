# Launcher local de Windows

Launcher local para Windows 10 22H2 (build 19045) o Windows 11 23H2+ (build 22631+). No cambia la aplicación ni sus servicios. Los archivos `.bat` localizan su propia carpeta y delegan en PowerShell 5.1 con `-NoProfile -ExecutionPolicy Bypass`; la política global de PowerShell no cambia. La lógica común vive en `scripts/windows/common.ps1`.

## Requisitos

- Docker Desktop / Docker Engine compatible y Compose v2. Docker Desktop es la dependencia principal del host.
- Conexión a Internet para descargar imágenes y compilar la primera vez.
- Git no se requiere: el proyecto funciona desde un ZIP extraído.
- Node.js, npm, PostgreSQL y Nginx permanecen dentro de Docker.

Si falta Docker CLI, `START_AJEDREZ.bat` detecta winget y pide confirmación antes de ejecutar `winget install --id Docker.DockerDesktop --exact --accept-source-agreements`. Usa el identificador oficial [Docker.DockerDesktop](https://github.com/microsoft/winget-pkgs/tree/master/manifests/d/Docker/DockerDesktop). No acepta en silencio acuerdos del paquete. winget/Docker pueden pedir UAC. El launcher verifica CLI, Compose y Engine después; salida cero de winget por sí sola no cuenta como instalación verificada.

Docker Desktop puede requerir WSL2, virtualización de hardware, habilitación de funciones de Windows, cierre de sesión o reinicio. El launcher detecta señales disponibles, explica el siguiente paso y se detiene. No habilita componentes, no modifica BIOS/UEFI ni reinicia el equipo. Consulta [requisitos e instalación oficiales de Docker Desktop](https://docs.docker.com/desktop/setup/install/windows-install/) y [WSL](https://learn.microsoft.com/windows/wsl/install).

## Operaciones

| Comando | Comportamiento |
|---|---|
| `START_AJEDREZ.bat` | Comprueba Windows, CLI, Compose, Engine, `docker compose config`, conflicto TCP 8080, binding `0.0.0.0:8080` y salud de PostgreSQL, `SELECT 1`, `/api/health` y frontend. Ejecuta `docker compose up -d --build` y espera hasta 150 s por salud. Si ya está sano, no reconstruye ni abre otra pestaña. |
| `STOP_AJEDREZ.bat` | Ejecuta `docker compose stop`; no borra contenedores ni volumen. Repetirlo es seguro. |
| `STATUS_AJEDREZ.bat` | Solo consulta el estado y genera log local. Código de salida `0` significa servicios sanos; valor distinto de cero indica Docker ausente o aplicación no sana/detenida. |
| `RESET_AJEDREZ.bat` | Requiere escribir `REINICIAR`; ejecuta `docker compose down` y luego `up -d --build`. Nunca usa `--volumes`. |
| `UNINSTALL_AJEDREZ.bat` | Opción 1 quita contenedores/red y conserva `postgres-data` e imágenes. Opción 2 también quita imágenes locales y volumen Compose; requiere escribir `ELIMINAR`. |

La opción completa borra permanentemente partidas archivadas. Ambas opciones operan mediante el proyecto Compose de esta carpeta. Docker Desktop, WSL, Git, recursos ajenos, la carpeta y los archivos del repositorio no se eliminan. El usuario puede borrar la carpeta manualmente después.

## LAN y firewall

El launcher muestra `http://localhost:8080` y todas las IPv4 privadas activas detectadas en adaptadores de hardware; ignora loopback, APIPA, adaptadores desconectados y adaptadores virtuales conocidos. Si hay varias, muestra todas. URL por interfaz: `http://<IPv4-LAN>:8080`.

No modifica el firewall por defecto. Al iniciar una aplicación nueva, puede ofrecer crear `Ajedrez LAN - TCP 8080`. Solo una respuesta interactiva explícita `S` abre UAC y crea una regla entrante TCP 8080 limitada a perfil `Private` y `LocalSubnet`; con stdin redirigido, no cambia reglas. Si un nombre igual ya existe, no lo reemplaza. El desinstalador solo ofrece quitar la regla si coincide el nombre, descripción de propiedad y marcador local creados por este launcher; una ejecución sin consola interactiva se cancela. Nunca deshabilita firewall ni toca reglas ajenas. La red Wi-Fi puede aislar clientes aunque exista la regla.

## Estado y diagnóstico

El launcher crea `.launcher/logs/`, excluido por Git, y conserva hasta diez logs suyos. Registra fechas, comandos/salidas relevantes y errores; redacta valores que parezcan contraseñas, cookies, autorizaciones o tokens. No registra variables de entorno ni credenciales deliberadamente.

Si el inicio falla, `START_AJEDREZ.bat` muestra `docker compose ps` y hasta 60 líneas por servicio; el log queda en `.launcher/logs/`. Diagnóstico manual:

```powershell
docker compose config --quiet
docker compose ps
docker compose logs --tail=80 web backend database
Invoke-RestMethod http://localhost:8080/api/health
```

Si 8080 está ocupado, muestra contenedor/servicio Compose o nombre de proceso/PID y se detiene sin matar al propietario. Libera el puerto solo después de identificarlo. El launcher no cambia el puerto de la aplicación.

## Decisiones y límites

- `.bat` es solo punto de entrada con manejo de rutas/código de salida; PowerShell concentra lógica para evitar duplicar operaciones.
- No se instala Node.js, npm, PostgreSQL ni Nginx en el host: Compose ya entrega esos servicios reproduciblemente.
- Docker Desktop es software compartido del host, por eso nunca se desinstala junto con Ajedrez.
- `STOP` y `RESET` conservan el volumen. Solo la opción completa del desinstalador, tras confirmación exacta, borra datos persistentes.
- Firewall requiere consentimiento explícito y privilegios elevados solo para crear/quitar la regla propia.
- Inicio de Docker Desktop, instalación winget, elevación UAC, WSL/virtualización y reinicios requieren cooperación del sistema o usuario; no pueden automatizarse de forma segura en todos los equipos.
- Launcher comprobado en Windows 11 Pro, Docker Engine 29.4.1 y Compose 5.1.3. No se ejecutó instalación de Docker ni la opción destructiva del desinstalador durante las pruebas.
