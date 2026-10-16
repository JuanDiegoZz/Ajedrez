param([Parameter(Mandatory=$true)][ValidateSet('Add','Remove')][string]$Mode)
$ErrorActionPreference = 'Stop'
$ruleName = 'Ajedrez LAN - TCP 8080'
$marker = 'Ajedrez Windows launcher managed rule 5c1d8f74-8080'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$markerPath = Join-Path $root '.launcher\firewall-rule-created.txt'
try {
    if ($Mode -eq 'Add') {
        $sameName = @(Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue)
        if ($sameName.Count -gt 0) { Write-Error 'Ya existe una regla con ese nombre; no se modifico.'; exit 2 }
        New-NetFirewallRule -DisplayName $ruleName -Description $marker -Direction Inbound -Action Allow -Protocol TCP -LocalPort 8080 -RemoteAddress LocalSubnet -Profile Private | Out-Null
        New-Item -ItemType Directory -Path (Split-Path -Parent $markerPath) -Force | Out-Null
        Set-Content -LiteralPath $markerPath -Value $marker -Encoding ASCII
        Write-Host 'Regla TCP 8080 creada solo para perfil privado y subred local.'
        exit 0
    }
    if (-not (Test-Path -LiteralPath $markerPath) -or (Get-Content -LiteralPath $markerPath -Raw).Trim() -ne $marker) {
        Write-Error 'Falta marcador de propiedad; no se borro ninguna regla.'
        exit 3
    }
    $owned = @(Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue | Where-Object { $_.Description -eq $marker })
    if ($owned.Count -ne 1) { Write-Error 'La regla no coincide con la regla creada por el launcher.'; exit 4 }
    $owned | Remove-NetFirewallRule
    Remove-Item -LiteralPath $markerPath -Force
    Write-Host 'Se elimino solo la regla de Ajedrez creada por el launcher.'
    exit 0
} catch {
    if ($Mode -eq 'Add') {
        Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue | Where-Object { $_.Description -eq $marker } | Remove-NetFirewallRule -ErrorAction SilentlyContinue
        Remove-Item -LiteralPath $markerPath -Force -ErrorAction SilentlyContinue
    }
    Write-Error ('No se pudo cambiar la regla de Ajedrez: {0}' -f $_.Exception.Message)
    exit 1
}
