. (Join-Path $PSScriptRoot 'common.ps1')

Write-Host ''
Write-Host '========================================='
Write-Host ' AJEDREZ - INICIO PARA WINDOWS'
Write-Host '========================================='
Write-LauncherStep ('Proyecto: {0}' -f $script:ProjectRoot)

$windows = Test-WindowsCompatibility
if (-not $windows.Supported) { Write-LauncherError $windows.Message; Exit-Launcher 1 }
Write-LauncherOk ('Sistema compatible: {0}' -f $windows.Message)

$docker = Get-DockerCommand
$desktop = Get-DockerDesktopPath
if (-not $docker -and $desktop) {
    Add-DockerCliToCurrentPath
    $docker = Get-DockerCommand
    if (-not $docker) {
        Write-LauncherError 'Docker Desktop existe, pero su docker.exe no esta en PATH ni en su instalacion estandar.'
        Write-Host 'Repara Docker Desktop y vuelve a ejecutar START_AJEDREZ.bat.'
        Exit-Launcher 1
    }
}
if (-not $docker) {
    $winget = Get-Command winget.exe -ErrorAction SilentlyContinue
    if (-not $winget) { $winget = Get-Command winget -ErrorAction SilentlyContinue }
    if (-not $winget) {
        Write-LauncherError 'Docker CLI / Docker Desktop no esta instalado y winget no esta disponible.'
        Write-Host 'Instala Docker Desktop desde https://docs.docker.com/desktop/setup/install/windows-install/ y vuelve a ejecutar este archivo.'
        Exit-Launcher 1
    }
    Write-Host ''
    Write-Host 'No se encontro Docker CLI. Se puede instalar Docker Desktop oficial con winget.'
    Write-Host 'La instalacion puede mostrar UAC y requerir WSL2, virtualizacion o reinicio.'
    $answer = Read-Host '¿Instalar Docker Desktop (Docker.DockerDesktop)? Escribe S para confirmar'
    if ($answer -notmatch '^(S|SI)$') { Write-LauncherWarn 'Instalacion cancelada; no se cambio el equipo.'; Exit-Launcher 1 }
    Write-LauncherStep 'Ejecutando winget install Docker.DockerDesktop...'
    $install = Invoke-ExternalCommand -FilePath $winget.Source -Arguments @('install','--id','Docker.DockerDesktop','--exact','--accept-source-agreements') -ShowOutput
    if ($install.ExitCode -ne 0) {
        Write-LauncherError ('winget termino con codigo {0}; instalacion no confirmada.' -f $install.ExitCode)
        Show-DockerPrerequisiteHelp
        Exit-Launcher 1
    }
    Add-DockerCliToCurrentPath
    $docker = Get-DockerCommand
    if (-not $docker) {
        Write-LauncherError 'winget termino, pero docker.exe aun no esta disponible. No se afirma que la instalacion este lista.'
        Show-DockerPrerequisiteHelp
        Exit-Launcher 1
    }
    $desktop = Get-DockerDesktopPath
}

$dockerCheck = Test-DockerEngine
if (-not $dockerCheck.Cli) { Write-LauncherError 'Docker CLI no responde.'; Exit-Launcher 1 }
Write-LauncherOk ('Docker CLI: {0}' -f $dockerCheck.CliVersion.Trim())
if (-not $dockerCheck.Compose) { Write-LauncherError 'Docker Compose v2 no esta disponible. Actualiza Docker Desktop.'; Exit-Launcher 1 }
Write-LauncherOk ('Docker Compose: {0}' -f $dockerCheck.ComposeVersion.Trim())

if (-not $dockerCheck.Engine) {
    $desktop = Get-DockerDesktopPath
    if ($desktop) {
        Write-LauncherStep 'Docker Desktop esta instalado y detenido; iniciandolo.'
        try { Start-Process -FilePath $desktop -ErrorAction Stop | Out-Null }
        catch { Write-LauncherError ('No se pudo iniciar Docker Desktop: {0}' -f $_.Exception.Message); Exit-Launcher 1 }
        $dockerCheck = Wait-DockerEngine 180
    }
}
if (-not $dockerCheck.Engine) {
    Write-LauncherError 'Docker Engine no responde; no se iniciaron contenedores.'
    Show-DockerPrerequisiteHelp
    Write-Host 'Abre Docker Desktop, espera a que indique que esta listo y vuelve a ejecutar START_AJEDREZ.bat.'
    Exit-Launcher 1
}
Write-LauncherOk ('Docker Engine: OK (servidor {0})' -f $dockerCheck.EngineVersion.Trim())

if (-not (Test-Path -LiteralPath (Join-Path $script:ProjectRoot 'compose.yaml') -PathType Leaf)) {
    Write-LauncherError 'No se encontro compose.yaml en la raiz del proyecto.'
    Exit-Launcher 1
}
$config = Invoke-Compose -Arguments @('config','--quiet')
if ($config.ExitCode -ne 0) {
    Write-LauncherError 'docker compose config fallo. Revisa compose.yaml y .env; detalles en el log local.'
    Exit-Launcher 1
}
Write-LauncherOk 'Docker Compose: configuracion valida.'

$port = Get-Port8080State
if ($port.State -eq 'OCUPADO') {
    Write-LauncherError ('El puerto 8080 pertenece a otro proceso: {0}' -f $port.Details)
    Write-Host 'No se detuvo el propietario. Libera el puerto o revisa docker ps --filter publish=8080.'
    Exit-Launcher 1
}

$current = Get-AppHealth
if ($port.State -eq 'AJEDREZ' -and $current.Frontend -and $current.Backend -and $current.Database -and $current.LanBinding) {
    Write-Host ''
    Write-LauncherOk 'Ajedrez ya esta ejecutandose; no se reconstruyo ni se abrio otra pestana.'
    Write-AppHealth $current
    Show-Urls
    Exit-Launcher 0
}

Write-LauncherStep 'Levantando Ajedrez con docker compose up -d --build...'
$up = Invoke-Compose -Arguments @('up','-d','--build') -ShowOutput
if ($up.ExitCode -ne 0) {
    Write-LauncherError 'docker compose up fallo. Revisa los logs de diagnostico.'
    Show-DiagnosticLogs
    Exit-Launcher 1
}

Write-LauncherStep 'Esperando PostgreSQL, API y frontend (maximo 150 s)...'
$ready = Wait-AppHealth 150
Write-AppHealth $ready.Health
if (-not $ready.Ok) {
    Write-LauncherError ('Ajedrez no completo la comprobacion de salud en {0} s.' -f $ready.Elapsed)
    Show-DiagnosticLogs
    Write-Host 'Diagnostico manual: docker compose ps; docker compose logs --tail=80 web backend database'
    Exit-Launcher 1
}
Write-LauncherOk ('Ajedrez saludable en {0} s.' -f $ready.Elapsed)
Show-Urls

Request-FirewallChange 'Add'

try { Start-Process 'http://localhost:8080' -ErrorAction Stop | Out-Null; Write-LauncherOk 'Navegador abierto en http://localhost:8080.' }
catch { Write-LauncherWarn ('No se pudo abrir el navegador automaticamente: {0}' -f $_.Exception.Message); Write-Host 'Abre http://localhost:8080 manualmente.' }
Exit-Launcher 0
