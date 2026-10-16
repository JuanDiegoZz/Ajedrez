. (Join-Path $PSScriptRoot 'common.ps1')
Write-Host ''
Write-Host 'AJEDREZ - ESTADO'
Write-Host ('Raiz: {0}' -f $script:ProjectRoot)
$docker = Get-DockerCommand
if (-not $docker) {
    Write-Host 'Docker CLI        ERROR / no instalado'
    Write-Host 'Docker Engine     NO DISPONIBLE'
    Write-Host 'Compose           NO DISPONIBLE'
    Write-Host ('Puerto 8080       {0}' -f (Get-Port8080State).State)
    Write-Host ('LAN               {0}' -f ((Get-LanIpv4Addresses) -join ', '))
    Write-Host ('Firewall          {0}' -f (Get-FirewallSummary))
    Exit-Launcher 1
}
$dockerCheck = Test-DockerEngine
Write-Host ('Docker CLI        {0}' -f $(if ($dockerCheck.Cli) { 'OK' } else { 'ERROR' }))
Write-Host ('Docker Engine     {0}' -f $(if ($dockerCheck.Engine) { 'OK' } else { 'DETENIDO / ERROR' }))
Write-Host ('Compose           {0}' -f $(if ($dockerCheck.Compose) { 'OK {0}' -f $dockerCheck.ComposeVersion.Trim() } else { 'ERROR' }))
$port = Get-Port8080State
Write-Host ('Puerto 8080       {0} - {1}' -f $port.State, $port.Details)
$health = $null
if ($dockerCheck.Engine -and $dockerCheck.Compose) {
    $health = Get-AppHealth
    Write-AppHealth $health
} else {
    Write-Host 'PostgreSQL        NO COMPROBADO'
    Write-Host 'Backend /api      NO DISPONIBLE'
    Write-Host 'Frontend          NO DISPONIBLE'
}
$addresses = @(Get-LanIpv4Addresses)
Write-Host ('LAN               {0}' -f $(if ($addresses.Count) { $addresses -join ', ' } else { 'Sin IPv4 privada activa' }))
Write-Host ('Firewall          {0}' -f (Get-FirewallSummary))
Write-Host ''
Write-Host 'Contenedores (docker compose ps):'
if ($dockerCheck.Engine -and $dockerCheck.Compose) {
    $ps = Invoke-Compose -Arguments @('ps') -ShowOutput
    if ($ps.ExitCode -ne 0) { Write-LauncherWarn 'No se pudo consultar docker compose ps.' }
} else { Write-Host 'No disponible sin Docker Engine.' }
if ($health -and $health.Frontend -and $health.Backend -and $health.Database -and $health.LanBinding) { Exit-Launcher 0 }
Write-LauncherWarn 'Diagnostico: docker compose ps; docker compose logs --tail=80 web backend database.'
Exit-Launcher 1
