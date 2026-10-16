. (Join-Path $PSScriptRoot 'common.ps1')
Write-Host 'AJEDREZ - DESINSTALACION DE RECURSOS DEL PROYECTO'
Write-Host '1 - Conservar datos: detener y quitar contenedores/red; conservar volumen PostgreSQL.'
Write-Host '2 - Completa: quitar contenedores, red, imagenes locales y volumen PostgreSQL.'
Write-Host 'Docker Desktop, WSL, Git y esta carpeta nunca se desinstalan/eliminan.'
if ([Console]::IsInputRedirected) { Write-LauncherWarn 'Entrada no interactiva: desinstalacion cancelada para proteger datos.'; Exit-Launcher 1 }
$choice = Read-Host 'Elige 1 o 2'
if ($choice -notin @('1','2')) { Write-LauncherStep 'Operacion cancelada.'; Exit-Launcher 0 }
if ($choice -eq '2') {
    Write-Host ''
    Write-Host 'Esta acción eliminará permanentemente las partidas almacenadas.' -ForegroundColor Red
    Write-Host 'Se borrara el volumen PostgreSQL asociado a este proyecto.' -ForegroundColor Red
    $confirm = Read-Host 'Escribe ELIMINAR para confirmar la perdida permanente de datos'
    if ($confirm -cne 'ELIMINAR') { Write-LauncherWarn 'Confirmacion no recibida; no se borraron datos.'; Exit-Launcher 0 }
}
$dockerCheck = Test-DockerEngine
if (-not $dockerCheck.Cli -or -not $dockerCheck.Compose) { Write-LauncherError 'Docker CLI/Compose no disponible; no se eliminaron recursos.'; Exit-Launcher 1 }
if (-not $dockerCheck.Engine) { Write-LauncherError 'Docker Engine no esta activo; inicia Docker Desktop y repite.'; Exit-Launcher 1 }
$composeArgs = @('down')
if ($choice -eq '2') { $composeArgs += @('--rmi','local','--volumes') }
$down = Invoke-Compose -Arguments $composeArgs -ShowOutput
if ($down.ExitCode -ne 0) { Write-LauncherError 'Compose no completo la desinstalacion; revisa su salida.'; Exit-Launcher 1 }
if ($choice -eq '1') { Write-LauncherOk 'Contenedores y red Compose eliminados; volumen PostgreSQL e imagenes conservados.' }
else { Write-LauncherOk 'Recursos Compose y volumen PostgreSQL eliminados.' }
if (@(Get-OwnedFirewallRule).Count -gt 0) { Request-FirewallChange 'Remove' }
Write-Host 'Los recursos de Ajedrez fueron eliminados.'
Write-Host 'Puedes borrar esta carpeta manualmente si ya no la necesitas.'
Exit-Launcher 0
