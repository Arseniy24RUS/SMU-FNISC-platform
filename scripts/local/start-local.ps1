param(
  [switch]$Quick,
  [switch]$FullSync,
  [switch]$NoBrowser,
  [switch]$SkipInstall
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $ProjectRoot

$LogDir = Join-Path $ProjectRoot "data\local\logs"
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
$LogFile = Join-Path $LogDir ("start-local-{0}.log" -f (Get-Date -Format "yyyyMMdd-HHmmss"))

function Write-Log {
  param([string]$Message)
  $line = "[{0}] {1}" -f (Get-Date -Format "HH:mm:ss"), $Message
  Write-Host $line
  Add-Content -LiteralPath $LogFile -Value $line -Encoding UTF8
}

function Test-Command {
  param([string]$Name)
  return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

function Invoke-Pnpm {
  param([string[]]$Arguments)
  if (Test-Command "pnpm") {
    & pnpm @Arguments
  } elseif (Test-Command "npm") {
    & npm exec --yes -- pnpm @Arguments
  } else {
    throw "npm/pnpm was not found. Install Node.js LTS with npm and try again."
  }
  if ($LASTEXITCODE -ne 0) {
    throw "pnpm $($Arguments -join ' ') failed with exit code $LASTEXITCODE"
  }
}

function Get-HarvestFresh {
  $report = Join-Path $ProjectRoot "data\public\harvest-report.json"
  if (!(Test-Path -LiteralPath $report)) { return $false }
  $age = (Get-Date) - (Get-Item -LiteralPath $report).LastWriteTime
  return $age.TotalHours -lt 24
}

function Get-ListeningProcessIds {
  param([int]$Port)
  $connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
  if (!$connections) { return @() }
  return @($connections | Select-Object -ExpandProperty OwningProcess -Unique)
}

function Wait-ForLocalPort {
  param(
    [int]$Port,
    [int]$TimeoutSeconds = 30
  )
  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  do {
    $pids = Get-ListeningProcessIds -Port $Port
    if ($pids.Count -gt 0) { return $pids }
    Start-Sleep -Seconds 1
  } while ((Get-Date) -lt $deadline)
  return @()
}

try {
  Write-Log "Project: $ProjectRoot"
  if (!(Test-Command "node")) { throw "Node.js was not found. Install Node.js LTS: https://nodejs.org/" }
  Write-Log ("Node.js: " + (& node --version))

  if (!$SkipInstall) {
    Write-Log "Installing dependencies with pnpm"
    Invoke-Pnpm @("install")
  } else {
    Write-Log "SkipInstall: dependency installation skipped"
  }

  Write-Log "Prisma generate"
  Invoke-Pnpm @("prisma:generate")

  Write-Log "Prisma migrate"
  Invoke-Pnpm @("prisma:migrate")

  Write-Log "Seed members"
  Invoke-Pnpm @("seed")

  $fresh = Get-HarvestFresh
  if ($FullSync) {
    Write-Log "FullSync: running full local harvest"
    Invoke-Pnpm @("harvest:all:local")
  } elseif ($Quick -or $fresh) {
    Write-Log "Quick mode or fresh harvest found: skipping full harvest"
    Write-Log "To force a full refresh, run: pnpm local:full"
  } else {
    Write-Log "First run or stale harvest: running full local harvest"
    Invoke-Pnpm @("harvest:all:local")
  }

  $DevLog = Join-Path $LogDir "next-dev.out.log"
  $DevErrLog = Join-Path $LogDir "next-dev.err.log"
  $serverPids = Get-ListeningProcessIds -Port 3000
  if ($serverPids.Count -gt 0) {
    Write-Log "Port 3000 is already in use. Reusing existing dev server PID(s): $($serverPids -join ', ')"
  } else {
    Write-Log "Starting Next.js dev server; log: $DevLog"
    if (Test-Command "pnpm") {
      $devCommand = "pnpm dev"
    } else {
      $devCommand = "npm exec --yes -- pnpm dev"
    }
    $launcher = Start-Process -FilePath "cmd.exe" -ArgumentList @("/d", "/c", $devCommand) -WorkingDirectory $ProjectRoot -RedirectStandardOutput $DevLog -RedirectStandardError $DevErrLog -WindowStyle Hidden -PassThru
    Write-Log "Dev server launcher PID: $($launcher.Id)"
    $serverPids = Wait-ForLocalPort -Port 3000 -TimeoutSeconds 30
    if ($serverPids.Count -eq 0) {
      throw "Dev server did not start on port 3000. Check logs: $DevLog and $DevErrLog"
    }
  }

  if (!$NoBrowser) {
    Write-Log "Opening http://localhost:3000"
    Start-Process "http://localhost:3000"
  }
  Write-Log "Dev server PID(s): $($serverPids -join ', ')"
  Write-Log "Close this window when finished. To stop the server: Stop-Process -Id $($serverPids -join ',')"
} catch {
  Write-Log ("ERROR: " + $_.Exception.Message)
  Write-Log "Detailed log: $LogFile"
  throw
}
