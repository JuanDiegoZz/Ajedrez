. (Join-Path $PSScriptRoot 'common.ps1')
Write-Host 'AJEDREZ - PARADA SEGURA'
$dockerCheck = Test-DockerEngine
if (-not $dockerCheck.Cli -or -not $dockerCheck.Compose) {
    Write-LauncherWarn 'Docker CLI/Compose no esta disponible; no se enviaron cambios al sistema.'
    Exit-Launcher 1
}
if (-not $dockerCheck.Engine) { Write-LauncherWarn 'Docker Engine no esta activo; Ajedrez ya esta detenido.'; Exit-Launcher 0 }
$ps = Invoke-Compose -Arguments @('ps','-q') -SuppressLog
if (-not $ps.Output.Trim()) { Write-LauncherOk 'Ajedrez ya esta detenido.'; Exit-Launcher 0 }
$stop = Invoke-Compose -Arguments @('stop') -ShowOutput
if ($stop.ExitCode -ne 0) { Write-LauncherError 'No se pudieron detener todos los servicios.'; Exit-Launcher 1 }
$after = Invoke-Compose -Arguments @('ps') -ShowOutput
Write-LauncherOk 'Servicios detenidos; volumen PostgreSQL conservado.'
Exit-Launcher 0
