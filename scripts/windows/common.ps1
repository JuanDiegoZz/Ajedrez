$script:ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$script:LogDirectory = Join-Path $script:ProjectRoot '.launcher\logs'
$script:FirewallRuleName = 'Ajedrez LAN - TCP 8080'
$script:FirewallRuleMarker = 'Ajedrez Windows launcher managed rule 5c1d8f74-8080'
$script:LauncherLog = $null

function Initialize-LauncherLog {
    New-Item -ItemType Directory -Path $script:LogDirectory -Force | Out-Null
    $oldLogs = @(Get-ChildItem -LiteralPath $script:LogDirectory -Filter 'launcher-*.log' -File -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending)
    foreach ($old in $oldLogs | Select-Object -Skip 9) {
        Remove-Item -LiteralPath $old.FullName -Force -ErrorAction SilentlyContinue
    }
    $script:LauncherLog = Join-Path $script:LogDirectory ('launcher-{0}.log' -f (Get-Date -Format 'yyyyMMdd-HHmmss'))
    Add-Content -LiteralPath $script:LauncherLog -Value ('[{0}] Ajedrez Windows launcher; root={1}' -f (Get-Date -Format 's'), $script:ProjectRoot) -Encoding UTF8
}

function Protect-LogLine([string]$Line) {
    return ($Line -replace '(?i)(password|passwd|cookie|authorization|token)(\s*[:=]\s*)[^\s,;]+', '$1$2[REDACTED]')
}

function Write-LauncherLog([string]$Message, [ValidateSet('INFO','OK','WARN','ERROR')] [string]$Level = 'INFO') {
    $line = '[{0}] {1}: {2}' -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $Level, (Protect-LogLine $Message)
    if ($script:LauncherLog) { Add-Content -LiteralPath $script:LauncherLog -Value $line -Encoding UTF8 }
    switch ($Level) {
        'OK' { Write-Host $Message -ForegroundColor Green }
        'WARN' { Write-Host $Message -ForegroundColor Yellow }
        'ERROR' { Write-Host $Message -ForegroundColor Red }
        default { Write-Host $Message }
    }
}

function Write-LauncherStep([string]$Message) { Write-LauncherLog $Message 'INFO' }
function Write-LauncherOk([string]$Message) { Write-LauncherLog $Message 'OK' }
function Write-LauncherWarn([string]$Message) { Write-LauncherLog $Message 'WARN' }
function Write-LauncherError([string]$Message) { Write-LauncherLog $Message 'ERROR' }

function Exit-Launcher([int]$Code) {
    if ($Code -eq 0) { Write-LauncherLog 'Fin finalizado correctamente.' 'OK' }
    else { Write-LauncherLog ('Fin con codigo {0}.' -f $Code) 'ERROR' }
    exit $Code
}

function Invoke-ExternalCommand {
    param(
        [Parameter(Mandatory=$true)][string]$FilePath,
        [Parameter(Mandatory=$true)][string[]]$Arguments,
        [switch]$ShowOutput,
        [switch]$SuppressLog
    )
    $lines = @(& $FilePath @Arguments 2>&1 | ForEach-Object { [string]$_ })
    $code = $LASTEXITCODE
    $joined = $lines -join [Environment]::NewLine
    if (-not $SuppressLog) {
        foreach ($line in $lines) {
            if ($line.Trim()) { Add-Content -LiteralPath $script:LauncherLog -Value ('[{0}] CMD: {1}' -f (Get-Date -Format 's'), (Protect-LogLine $line)) -Encoding UTF8 }
        }
    }
    if ($ShowOutput) { foreach ($line in $lines) { Write-Host $line } }
    return [pscustomobject]@{ ExitCode = $code; Output = $joined; Lines = $lines }
}

function Invoke-Compose {
    param([Parameter(Mandatory=$true)][string[]]$Arguments, [switch]$ShowOutput, [switch]$SuppressLog)
    Push-Location -LiteralPath $script:ProjectRoot
    try { return Invoke-ExternalCommand -FilePath 'docker' -Arguments (@('compose') + $Arguments) -ShowOutput:$ShowOutput -SuppressLog:$SuppressLog }
    finally { Pop-Location }
}

function Get-DockerCommand {
    $found = Get-Command docker.exe -ErrorAction SilentlyContinue
    if (-not $found) { $found = Get-Command docker -ErrorAction SilentlyContinue }
    return $found
}

function Get-DockerDesktopPath {
    $candidates = @(
        (Join-Path $env:ProgramFiles 'Docker\Docker\Docker Desktop.exe'),
        (Join-Path $env:LOCALAPPDATA 'Programs\DockerDesktop\Docker Desktop.exe')
    )
    foreach ($candidate in $candidates) { if ($candidate -and (Test-Path -LiteralPath $candidate -PathType Leaf)) { return $candidate } }
    return $null
}

function Add-DockerCliToCurrentPath {
    $candidates = @(
        (Join-Path $env:ProgramFiles 'Docker\Docker\resources\bin'),
        (Join-Path $env:LOCALAPPDATA 'Programs\DockerDesktop\resources\bin')
    )
    foreach ($candidate in $candidates) {
        if ((Test-Path -LiteralPath (Join-Path $candidate 'docker.exe')) -and (($env:Path -split ';') -notcontains $candidate)) {
            $env:Path = $candidate + ';' + $env:Path
        }
    }
}

function Test-WindowsCompatibility {
    try { $os = Get-CimInstance Win32_OperatingSystem -ErrorAction Stop }
    catch { return [pscustomobject]@{ Supported=$false; Message='No se pudo detectar Windows.' } }
    $version = [version]$os.Version
    $build = [int]$os.BuildNumber
    $supportedBuild = ($build -ge 19045 -and $build -lt 22000) -or ($build -ge 22631)
    if ($os.ProductType -ne 1 -or $version.Major -ne 10 -or -not $supportedBuild) {
        return [pscustomobject]@{ Supported=$false; Message=('Docker Desktop requiere Windows 10 22H2 (build 19045) o Windows 11 23H2+ (build 22631+); sistema detectado: {0}, compilacion {1}.' -f $os.Caption, $build) }
    }
    return [pscustomobject]@{ Supported=$true; Message=('{0}, compilacion {1}' -f $os.Caption, $build) }
}

function Test-DockerEngine {
    $docker = Get-DockerCommand
    if (-not $docker) { return [pscustomobject]@{ Cli=$false; Compose=$false; Engine=$false; Message='No se encontro docker.exe en PATH.' } }
    $cli = Invoke-ExternalCommand -FilePath $docker.Source -Arguments @('--version') -SuppressLog
    $compose = Invoke-ExternalCommand -FilePath $docker.Source -Arguments @('compose','version','--short') -SuppressLog
    $engine = Invoke-ExternalCommand -FilePath $docker.Source -Arguments @('info','--format','{{.ServerVersion}}') -SuppressLog
    return [pscustomobject]@{ Cli=($cli.ExitCode -eq 0); Compose=($compose.ExitCode -eq 0); Engine=($engine.ExitCode -eq 0); DockerPath=$docker.Source; CliVersion=$cli.Output; ComposeVersion=$compose.Output; EngineVersion=$engine.Output }
}

function Wait-DockerEngine([int]$TimeoutSeconds = 180) {
    $started = Get-Date
    $reported = -1
    while (((Get-Date) - $started).TotalSeconds -lt $TimeoutSeconds) {
        Add-DockerCliToCurrentPath
        $check = Test-DockerEngine
        if ($check.Cli -and $check.Compose -and $check.Engine) { return $check }
        $elapsed = [int]((Get-Date) - $started).TotalSeconds
        if ([int]($elapsed / 15) -gt $reported) {
            $reported = [int]($elapsed / 15)
            Write-LauncherStep ('Esperando Docker Engine... {0}/{1} s' -f $elapsed, $TimeoutSeconds)
        }
        Start-Sleep -Seconds 3
    }
    return Test-DockerEngine
}

function Get-ComposeWebId {
    if (-not (Get-DockerCommand)) { return $null }
    $result = Invoke-Compose -Arguments @('ps','-q','web') -SuppressLog
    if ($result.ExitCode -eq 0 -and $result.Output.Trim()) { return ($result.Output.Trim() -split '\r?\n')[0].Trim() }
    return $null
}

function Get-Port8080State {
    if (-not (Get-DockerCommand)) {
        try {
            $listeners = @(Get-NetTCPConnection -State Listen -LocalPort 8080 -ErrorAction Stop)
            if ($listeners.Count -eq 0) { return [pscustomobject]@{ State='LIBRE'; Details='No se detecto un listener TCP en 8080.' } }
            return [pscustomobject]@{ State='OCUPADO'; Details=('Listener TCP PID {0}' -f $listeners[0].OwningProcess) }
        } catch { return [pscustomobject]@{ State='LIBRE'; Details='No se detecto un listener TCP en 8080.' } }
    }
    $webId = Get-ComposeWebId
    $publish = Invoke-ExternalCommand -FilePath 'docker' -Arguments @('ps','--no-trunc','--filter','publish=8080','--format','{{.ID}}') -SuppressLog
    if ($publish.ExitCode -ne 0) {
        try {
            $listeners = @(Get-NetTCPConnection -State Listen -LocalPort 8080 -ErrorAction Stop)
            if ($listeners.Count -gt 0) {
                $process = Get-Process -Id $listeners[0].OwningProcess -ErrorAction SilentlyContinue
                $owner = if ($process) { '{0} (PID {1})' -f $process.ProcessName,$process.Id } else { 'PID {0}' -f $listeners[0].OwningProcess }
                return [pscustomobject]@{ State='OCUPADO'; Details=$owner }
            }
        } catch { }
        return [pscustomobject]@{ State='LIBRE'; Details='No se detecto un listener TCP en 8080.' }
    }
    $ids = @($publish.Lines | Where-Object { $_.Trim() })
    if ($webId -and ($ids -contains $webId)) { return [pscustomobject]@{ State='AJEDREZ'; Details='El contenedor web de este proyecto publica el puerto 8080.' } }
    if ($ids.Count -gt 0) {
        $details = foreach ($id in $ids) {
            $inspect = Invoke-ExternalCommand -FilePath 'docker' -Arguments @('inspect','--format','{{.Name}}|{{json .Config.Labels}}',$id) -SuppressLog
            if ($inspect.ExitCode -eq 0) {
                $parts = $inspect.Output.Trim() -split '\|', 2
                $labels = $parts[1] | ConvertFrom-Json
                '{0} | servicio={1} proyecto={2}' -f $parts[0], $labels.'com.docker.compose.service', $labels.'com.docker.compose.project'
            } else { $inspect.Output.Trim() }
        }
        return [pscustomobject]@{ State='OCUPADO'; Details=($details -join '; ') }
    }
    try {
        $listeners = @(Get-NetTCPConnection -State Listen -LocalPort 8080 -ErrorAction Stop)
        if ($listeners.Count -gt 0) {
            $owners = foreach ($item in $listeners | Select-Object -Unique OwningProcess) {
                $process = Get-Process -Id $item.OwningProcess -ErrorAction SilentlyContinue
                if ($process) { '{0} (PID {1})' -f $process.ProcessName, $process.Id } else { 'PID {0}' -f $item.OwningProcess }
            }
            return [pscustomobject]@{ State='OCUPADO'; Details=($owners -join ', ') }
        }
    } catch { }
    return [pscustomobject]@{ State='LIBRE'; Details='No se detecto un listener TCP en 8080.' }
}

function Get-LanIpv4Addresses {
    $result = @()
    try {
        $addresses = Get-NetIPAddress -AddressFamily IPv4 -AddressState Preferred -ErrorAction Stop
        foreach ($item in $addresses) {
            $ip = [System.Net.IPAddress]::Parse($item.IPAddress)
            $text = $item.IPAddress
            if ([IPAddress]::IsLoopback($ip) -or $text.StartsWith('169.254.') -or $text -eq '0.0.0.0') { continue }
            if (-not ($text.StartsWith('10.') -or $text.StartsWith('192.168.') -or $text -match '^172\.(1[6-9]|2[0-9]|3[01])\.')) { continue }
            $adapter = Get-NetAdapter -InterfaceIndex $item.InterfaceIndex -ErrorAction SilentlyContinue
            if ($adapter -and ($adapter.Status -ne 'Up' -or -not $adapter.HardwareInterface -or $adapter.InterfaceDescription -match '(?i)docker|hyper-v|virtualbox|vmware|loopback|wsl')) { continue }
            $result += $text
        }
    } catch { }
    return @($result | Sort-Object -Unique)
}

function Test-HttpEndpoint([string]$Uri) {
    try {
        $response = Invoke-WebRequest -Uri $Uri -UseBasicParsing -TimeoutSec 4 -ErrorAction Stop
        return [pscustomobject]@{ Ok=($response.StatusCode -eq 200); Status=[int]$response.StatusCode; Content=[string]$response.Content; Error=$null }
    } catch {
        $status = 0
        if ($_.Exception.Response) { try { $status = [int]$_.Exception.Response.StatusCode } catch { } }
        return [pscustomobject]@{ Ok=$false; Status=$status; Content=''; Error=$_.Exception.Message }
    }
}

function Get-DatabaseContainerState {
    if (-not (Get-DockerCommand)) { return 'UNKNOWN' }
    $id = Invoke-Compose -Arguments @('ps','-q','database') -SuppressLog
    if ($id.ExitCode -ne 0 -or -not $id.Output.Trim()) { return 'STOPPED' }
    $health = Invoke-ExternalCommand -FilePath 'docker' -Arguments @('inspect','--format','{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}',$id.Output.Trim()) -SuppressLog
    if ($health.ExitCode -ne 0) { return 'UNKNOWN' }
    return $health.Output.Trim().ToUpperInvariant()
}

function Test-WebLanBinding {
    $id = Get-ComposeWebId
    if (-not $id) { return $false }
    $ports = Invoke-ExternalCommand -FilePath 'docker' -Arguments @('inspect','--format','{{json .NetworkSettings.Ports}}',$id) -SuppressLog
    if ($ports.ExitCode -ne 0) { return $false }
    try {
        $bindings = ($ports.Output | ConvertFrom-Json -ErrorAction Stop).'80/tcp'
        return [bool]@($bindings | Where-Object { $_.HostIp -eq '0.0.0.0' -and $_.HostPort -eq '8080' }).Count
    } catch { return $false }
}

function Test-DatabaseQuery {
    $result = Invoke-Compose -Arguments @('exec','-T','database','sh','-lc','psql -U $POSTGRES_USER -d $POSTGRES_DB -v ON_ERROR_STOP=1 -tA -c SELECT/**/1') -SuppressLog
    return ($result.ExitCode -eq 0 -and $result.Output.Trim() -eq '1')
}

function Get-AppHealth {
    $dbState = Get-DatabaseContainerState
    $frontend = Test-HttpEndpoint 'http://localhost:8080/'
    $health = Test-HttpEndpoint 'http://localhost:8080/api/health'
    $backendOk = $false
    if ($health.Ok) {
        try {
            $body = $health.Content | ConvertFrom-Json -ErrorAction Stop
            $backendOk = ($body.backend -eq 'available' -and $body.database -eq 'available')
        } catch { }
    }
    $sqlOk = $false
    if ($dbState -eq 'HEALTHY') { $sqlOk = Test-DatabaseQuery }
    return [pscustomobject]@{ Frontend=$frontend.Ok; FrontendStatus=$frontend.Status; Backend=$backendOk; HealthStatus=$health.Status; Database=($dbState -eq 'HEALTHY' -and $sqlOk); DatabaseState=$dbState; Sql=$sqlOk; LanBinding=(Test-WebLanBinding) }
}

function Wait-AppHealth([int]$TimeoutSeconds = 150) {
    $started = Get-Date
    $last = $null
    while (((Get-Date) - $started).TotalSeconds -lt $TimeoutSeconds) {
        $last = Get-AppHealth
        if ($last.Frontend -and $last.Backend -and $last.Database -and $last.LanBinding) { return [pscustomobject]@{ Ok=$true; Health=$last; Elapsed=[int]((Get-Date)-$started).TotalSeconds } }
        Start-Sleep -Seconds 3
    }
    return [pscustomobject]@{ Ok=$false; Health=$last; Elapsed=$TimeoutSeconds }
}

function Write-AppHealth($Health) {
    Write-Host ('Docker Engine         {0}' -f 'OK')
    Write-Host ('Docker Compose        {0}' -f 'OK')
    Write-Host ('PostgreSQL            {0} (contenedor {1}; SELECT 1 {2})' -f $(if ($Health.Database) { 'OK' } else { 'ERROR' }), $Health.DatabaseState, $(if ($Health.Sql) { 'OK' } else { 'ERROR' }))
    Write-Host ('Backend /api/health   {0}' -f $(if ($Health.Backend) { 'OK (HTTP 200)' } else { 'ERROR (HTTP {0})' -f $Health.HealthStatus }))
    Write-Host ('Frontend :8080        {0}' -f $(if ($Health.Frontend) { 'OK (HTTP 200)' } else { 'ERROR (HTTP {0})' -f $Health.FrontendStatus }))
    Write-Host ('LAN binding           {0}' -f $(if ($Health.LanBinding) { '0.0.0.0:8080 OK' } else { 'ERROR / no publicado en todas las interfaces' }))
}

function Show-DiagnosticLogs {
    Write-LauncherWarn 'Ultimas lineas de diagnostico (credenciales/cookies se redactan en el log local):'
    $ps = Invoke-Compose -Arguments @('ps') -SuppressLog
    foreach ($line in $ps.Lines) { Write-Host $line }
    $logs = Invoke-Compose -Arguments @('logs','--tail=60','web','backend','database') -SuppressLog
    foreach ($line in $logs.Lines) {
        $safe = Protect-LogLine $line
        Write-Host $safe
        if ($script:LauncherLog) { Add-Content -LiteralPath $script:LauncherLog -Value ('[{0}] DIAG: {1}' -f (Get-Date -Format 's'), $safe) -Encoding UTF8 }
    }
    Write-LauncherWarn ('Diagnostico guardado en {0}' -f $script:LauncherLog)
}

function Show-Urls {
    Write-Host ''
    Write-Host '========================================='
    Write-Host ' AJEDREZ - LISTO PARA JUGAR'
    Write-Host '========================================='
    Write-Host 'Local:'
    Write-Host 'http://localhost:8080'
    $addresses = @(Get-LanIpv4Addresses)
    if ($addresses.Count -eq 0) { Write-Host 'LAN: no se detectaron IPv4 privadas activas.' }
    else {
        Write-Host 'Red local:'
        foreach ($address in $addresses) { Write-Host ('http://{0}:8080' -f $address) }
    }
    Write-Host '========================================='
    Write-Host 'En algunas redes, Windows Firewall puede requerir permitir TCP 8080 en perfil privado.'
}

function Get-OwnedFirewallRule {
    $markerPath = Join-Path $script:ProjectRoot '.launcher\firewall-rule-created.txt'
    if (-not (Test-Path -LiteralPath $markerPath -PathType Leaf)) { return @() }
    $marker = Get-Content -LiteralPath $markerPath -Raw -ErrorAction SilentlyContinue
    if (-not $marker -or $marker.Trim() -ne $script:FirewallRuleMarker) { return @() }
    try {
        $rules = @(Get-NetFirewallRule -DisplayName $script:FirewallRuleName -ErrorAction Stop)
        return @($rules | Where-Object { $_.Description -eq $script:FirewallRuleMarker })
    } catch { return @() }
}

function Request-FirewallChange([ValidateSet('Add','Remove')][string]$Mode) {
    $owned = @(Get-OwnedFirewallRule)
    if ($Mode -eq 'Add' -and $owned.Count -gt 0) { Write-LauncherOk 'La regla privada de Ajedrez ya existe.'; return }
    if ($Mode -eq 'Remove' -and $owned.Count -eq 0) { Write-LauncherStep 'No existe una regla de firewall creada por este launcher.'; return }
    if ([Console]::IsInputRedirected) { Write-LauncherWarn 'Entrada no interactiva: firewall queda sin cambios.'; return }
    if ($Mode -eq 'Add') { $answer = Read-Host '¿Crear regla de entrada TCP 8080, solo perfil Private y subred local? Escribe S para confirmar' }
    else { $answer = Read-Host '¿Eliminar solo la regla Ajedrez LAN - TCP 8080 creada por este launcher? Escribe S para confirmar' }
    if ($answer -notmatch '^(S|SI)$') { Write-LauncherStep 'Firewall sin cambios.'; return }
    $helper = Join-Path $PSScriptRoot 'firewall.ps1'
    try {
        $powershell = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
        if (-not (Test-Path -LiteralPath $powershell -PathType Leaf)) { throw 'Windows PowerShell no esta disponible para solicitar elevacion.' }
        $process = Start-Process -FilePath $powershell -ArgumentList @('-NoProfile','-ExecutionPolicy','Bypass','-File',('"{0}"' -f $helper),'-Mode',$Mode) -Verb RunAs -Wait -PassThru -ErrorAction Stop
        if ($process.ExitCode -eq 0) { Write-LauncherOk 'Cambio de firewall completado.' }
        else { Write-LauncherWarn ('No se pudo completar el cambio de firewall (codigo {0}). No se cambio ninguna otra regla.' -f $process.ExitCode) }
    } catch { Write-LauncherWarn 'La solicitud de firewall se cancelo o fallo; no se modificaron reglas ajenas.' }
}

function Test-PendingWindowsRestart {
    $paths = @(
        'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Component Based Servicing\RebootPending',
        'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\WindowsUpdate\Auto Update\RebootRequired'
    )
    foreach ($path in $paths) { if (Test-Path $path) { return $true } }
    try {
        $value = Get-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager' -Name PendingFileRenameOperations -ErrorAction Stop
        if ($value.PendingFileRenameOperations) { return $true }
    } catch { }
    return $false
}

function Show-DockerPrerequisiteHelp {
    if (Test-PendingWindowsRestart) { Write-LauncherWarn 'Windows reporta un reinicio pendiente. Reinicia y vuelve a ejecutar START_AJEDREZ.bat.' }
    $wsl = Get-Command wsl.exe -ErrorAction SilentlyContinue
    if ($wsl) {
        $state = Invoke-ExternalCommand -FilePath $wsl.Source -Arguments @('--status') -SuppressLog
        if ($state.ExitCode -ne 0 -or $state.Output -notmatch '(?i)Default Version\s*:\s*2') { Write-LauncherWarn 'No se confirmo WSL2 predeterminado; instala/actualiza WSL2 y reinicia si Windows lo solicita. Consulta https://learn.microsoft.com/windows/wsl/install.' }
    } else {
        Write-LauncherWarn 'No se encontro WSL; Docker Desktop puede requerir WSL2. Consulta https://learn.microsoft.com/windows/wsl/install.'
    }
    try {
        $cpu = Get-CimInstance Win32_Processor -ErrorAction Stop | Select-Object -First 1
        if ($null -eq $cpu.VirtualizationFirmwareEnabled) { Write-LauncherWarn 'No se pudo comprobar virtualizacion de firmware; verifica BIOS/UEFI si Docker Desktop no inicia.' }
        elseif (-not $cpu.VirtualizationFirmwareEnabled) { Write-LauncherWarn 'La virtualizacion de hardware parece desactivada; habilitala en BIOS/UEFI. No se cambio Windows.' }
    } catch { }
    Write-LauncherWarn 'El launcher no activa WSL, componentes de Windows ni virtualizacion, y no reinicia el equipo.'
}

function Get-FirewallSummary {
    $owned = @(Get-OwnedFirewallRule)
    if ($owned.Count -gt 0) { return 'Regla Ajedrez privada creada por launcher' }
    try {
        if (Get-NetFirewallRule -DisplayName $script:FirewallRuleName -ErrorAction Stop) { return 'Existe nombre coincidente, pero no se reconoce como regla propia' }
    } catch { }
    return 'Sin regla propia; LAN puede requerir TCP 8080 privado'
}

Initialize-LauncherLog
