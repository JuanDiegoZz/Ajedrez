$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$windowsPowerShell = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'

if (-not (Test-Path -LiteralPath $windowsPowerShell -PathType Leaf)) {
    Write-Host 'No se encontro Windows PowerShell 5.1.' -ForegroundColor Red
    exit 1
}

function Invoke-LauncherAction {
    param(
        [Parameter(Mandatory = $true)][string]$ScriptName,
        [Parameter(Mandatory = $true)][string]$ActionLabel
    )

    $scriptPath = Join-Path (Join-Path $projectRoot 'scripts\windows') $ScriptName
    if (-not (Test-Path -LiteralPath $scriptPath -PathType Leaf)) {
        Write-Host ('No se encontro el script: {0}' -f $scriptPath) -ForegroundColor Red
        $scriptExitCode = 1
    } else {
        try {
            $child = Start-Process -FilePath $windowsPowerShell `
                -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', ('"{0}"' -f $scriptPath)) `
                -WorkingDirectory $projectRoot -NoNewWindow -Wait -PassThru -ErrorAction Stop
            $scriptExitCode = $child.ExitCode
        } catch {
            Write-Host ('No se pudo ejecutar {0}: {1}' -f $ActionLabel, $_.Exception.Message) -ForegroundColor Red
            $scriptExitCode = 1
        }
    }

    if ($scriptExitCode -eq 0) {
        Write-Host ('{0}: terminado correctamente.' -f $ActionLabel) -ForegroundColor Green
    } elseif ($ScriptName -eq 'status.ps1') {
        Write-Host ('El diagnostico requiere atencion o Ajedrez esta detenido (codigo {0}).' -f $scriptExitCode) -ForegroundColor Yellow
    } else {
        Write-Host ('{0}: termino con error (codigo {1}).' -f $ActionLabel, $scriptExitCode) -ForegroundColor Red
    }

    Write-Host ''
    Write-Host 'Pulsa Enter para volver al menu.'
    [void][Console]::ReadLine()
}

while ($true) {
    Write-Host ''
    Write-Host '==================================================' -ForegroundColor DarkCyan
    Write-Host '                    AJEDREZ' -ForegroundColor Cyan
    Write-Host '             Club de ajedrez local' -ForegroundColor Gray
    Write-Host '==================================================' -ForegroundColor DarkCyan
    Write-Host ''
    Write-Host '  [1] Jugar / Iniciar'
    Write-Host '  [2] Ver estado'
    Write-Host '  [3] Reiniciar / Reparar'
    Write-Host '  [4] Detener'
    Write-Host '  [5] Desinstalar'
    Write-Host ''
    Write-Host '  [0] Salir'
    Write-Host ''
    Write-Host '==================================================' -ForegroundColor DarkCyan
    Write-Host -NoNewline 'Selecciona una opcion: '
    $selection = [Console]::ReadLine()

    if ($null -eq $selection) {
        Write-Host ''
        exit 0
    }

    switch ($selection.Trim()) {
        '1' { Invoke-LauncherAction 'start.ps1' 'Inicio de Ajedrez' }
        '2' { Invoke-LauncherAction 'status.ps1' 'Diagnostico' }
        '3' { Invoke-LauncherAction 'reset.ps1' 'Reparacion' }
        '4' { Invoke-LauncherAction 'stop.ps1' 'Parada' }
        '5' { Invoke-LauncherAction 'uninstall.ps1' 'Desinstalacion' }
        '0' {
            Write-Host 'Hasta luego.'
            exit 0
        }
        default {
            Write-Host 'Opcion no valida.' -ForegroundColor Yellow
        }
    }
}
