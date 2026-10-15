$commands = @(
  "node",
  "npm",
  "npx",
  "git",
  "codex",
  "docker",
  "uv",
  "serena"
)

Write-Host "Checking prerequisites..." -ForegroundColor Cyan

foreach ($command in $commands) {
  $found = Get-Command $command -ErrorAction SilentlyContinue
  if ($null -eq $found) {
    Write-Host "[MISSING] $command" -ForegroundColor Red
  } else {
    Write-Host "[OK] $command -> $($found.Source)" -ForegroundColor Green
  }
}

Write-Host "\nVersions:" -ForegroundColor Cyan

$checks = @(
  @{ Name = "Node"; Command = { node --version } },
  @{ Name = "npm"; Command = { npm --version } },
  @{ Name = "npx"; Command = { npx --version } },
  @{ Name = "Git"; Command = { git --version } },
  @{ Name = "Codex"; Command = { codex --version } },
  @{ Name = "Docker"; Command = { docker --version } },
  @{ Name = "Docker Compose"; Command = { docker compose version } },
  @{ Name = "uv"; Command = { uv --version } },
  @{ Name = "Serena"; Command = { serena --version } }
)

foreach ($check in $checks) {
  try {
    $value = & $check.Command 2>$null
    Write-Host "$($check.Name): $value"
  } catch {
    Write-Host "$($check.Name): unavailable" -ForegroundColor Yellow
  }
}

Write-Host "\nThis script only checks. It does not install or change anything." -ForegroundColor DarkGray
