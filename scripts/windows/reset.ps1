. (Join-Path $PSScriptRoot 'common.ps1')
Write-Host 'AJEDREZ - REPARAR SIN BORRAR DATOS'
Write-Host 'Se recrearan contenedores y red Compose. El volumen PostgreSQL se conserva; no se usara --volumes.'
$answer = Read-Host 'Escribe REINICIAR para continuar'
if ($answer -cne 'REINICIAR') { Write-LauncherStep 'Operacion cancelada; no hubo cambios.'; Exit-Launcher 0 }
$dockerCheck = Test-DockerEngine
if (-not $dockerCheck.Cli -or -not $dockerCheck.Compose -or -not $dockerCheck.Engine) { Write-LauncherError 'Se requiere Docker CLI, Compose y Engine activos.'; Exit-Launcher 1 }
$config = Invoke-Compose -Arguments @('config','--quiet')
if ($config.ExitCode -ne 0) { Write-LauncherError 'docker compose config fallo; servicios y datos no se tocaron.'; Exit-Launcher 1 }
$down = Invoke-Compose -Arguments @('down') -ShowOutput
if ($down.ExitCode -ne 0) { Write-LauncherError 'docker compose down fallo; volumenes no se borraron.'; Show-DiagnosticLogs; Exit-Launcher 1 }
$up = Invoke-Compose -Arguments @('up','-d','--build') -ShowOutput
if ($up.ExitCode -ne 0) { Write-LauncherError 'No se pudieron levantar los servicios tras la reparacion.'; Show-DiagnosticLogs; Exit-Launcher 1 }
$ready = Wait-AppHealth 150
Write-AppHealth $ready.Health
if (-not $ready.Ok) { Write-LauncherError 'La reparacion termino, pero la comprobacion de salud no paso.'; Show-DiagnosticLogs; Exit-Launcher 1 }
Show-Urls
Write-LauncherOk 'Reparacion completada; datos PostgreSQL conservados.'
Exit-Launcher 0
